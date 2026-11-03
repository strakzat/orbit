/**
 * Server-side helpers for Notion comments API.
 * Import from "@strakzat/orbit/server"
 */

import type { Comment } from "./types";

interface CommentInput {
  annotationId: string;
  auteur?: string;
  comment: string;
  pagina?: string;
  label?: string;
  /** The variants the feedback was given in, a line each. Sent by Orbit when the project has any. */
  varianten?: string;
  /** Feedback on a component: its name (`data-orbit-component`). Sent by Orbit only then. */
  component?: string;
  /** The screenshot of the spot, a JPEG data URL. Sent by Orbit unless `comments.screenshot` is off. */
  screenshot?: string;
}

const NOTION_BASE = "https://api.notion.com/v1";
const NOTION_VERSION = "2022-06-28";

/**
 * Builds Notion page properties for creating a comment.
 * Use this in your POST /api/comments handler to ensure all fields are included.
 *
 * `Varianten` is only written when the comment carries variants, so a database without that
 * column keeps working for a project without variants. A project with variants needs the column
 * (rich text), or Notion refuses the page. `Component` likewise, for feedback on a component: the
 * column `orbit-feedback init` makes.
 */
export function buildNotionCommentProperties(
  input: CommentInput,
  projectId: string
): Record<string, unknown> {
  const properties: Record<string, unknown> = {
    Naam: {
      title: [{ text: { content: input.comment } }],
    },
    Auteur: {
      rich_text: [{ text: { content: input.auteur || "Anoniem" } }],
    },
    Comment: {
      rich_text: [{ text: { content: input.comment } }],
    },
    Status: {
      select: { name: "Open" },
    },
    Project: {
      relation: [{ id: projectId }],
    },
    "Annotatie ID": {
      rich_text: [{ text: { content: input.annotationId } }],
    },
    Label: {
      rich_text: [{ text: { content: input.label || "" } }],
    },
    Pagina: {
      rich_text: [{ text: { content: input.pagina || "" } }],
    },
  };
  if (input.varianten) {
    // Notion takes at most 2000 characters in one text object.
    properties.Varianten = { rich_text: [{ text: { content: input.varianten.slice(0, 2000) } }] };
  }
  if (input.component) {
    properties.Component = { rich_text: [{ text: { content: input.component.slice(0, 2000) } }] };
  }
  return properties;
}

/**
 * Uploads an image (a base64 data URL) to Notion through its File Upload API and returns the
 * upload's id, to be used in a block within the hour. Throws when Notion refuses it.
 */
export async function uploadNotionImage(dataUrl: string, apiKey: string): Promise<string> {
  const match = /^data:(image\/(?:jpeg|png|webp|gif));base64,(.+)$/.exec(dataUrl);
  if (!match) throw new Error("Not a base64 image data URL");
  const [, contentType, base64] = match;
  const extension = contentType === "image/jpeg" ? "jpg" : contentType.slice("image/".length);
  const filename = `feedback.${extension}`;
  const headers = { Authorization: `Bearer ${apiKey}`, "Notion-Version": NOTION_VERSION };

  const created = await fetch(`${NOTION_BASE}/file_uploads`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ mode: "single_part", filename, content_type: contentType }),
  });
  const upload: any = await created.json();
  if (!created.ok) throw new Error(`Notion file upload: ${upload.message ?? created.status}`);

  // No Content-Type of our own: fetch sets the multipart boundary.
  const form = new FormData();
  // atob rather than Buffer, so an edge runtime can run this too.
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  form.append("file", new Blob([bytes], { type: contentType }), filename);
  const sent = await fetch(`${NOTION_BASE}/file_uploads/${upload.id}/send`, {
    method: "POST",
    headers,
    body: form,
  });
  if (!sent.ok) {
    const error: any = await sent.json().catch(() => ({}));
    throw new Error(`Notion file upload: ${error.message ?? sent.status}`);
  }
  return upload.id;
}

/**
 * Builds the body of the Notion page for a comment: the screenshot of the spot, when there is one.
 * Pass it as `children` next to the properties when creating the page.
 *
 * Uploading takes the API key. A screenshot that does not make it is left out with a warning:
 * the comment itself still lands.
 */
export async function buildNotionCommentChildren(
  input: CommentInput,
  apiKey: string
): Promise<Record<string, unknown>[]> {
  if (!input.screenshot) return [];
  try {
    const id = await uploadNotionImage(input.screenshot, apiKey);
    return [{ object: "block", type: "image", image: { type: "file_upload", file_upload: { id } } }];
  } catch (err) {
    console.warn("[@strakzat/orbit] Screenshot niet geupload, de feedback gaat zonder:", err);
    return [];
  }
}

export interface CommentsApiOptions {
  /** Defaults to `process.env.NOTION_API_KEY`, read on each request. */
  apiKey?: string;
  /** Defaults to `process.env.NOTION_DATABASE_ID`. */
  databaseId?: string;
  /** Defaults to `process.env.NOTION_PROJECT_ID`. */
  projectId?: string;
}

export interface CommentsApiRequest {
  method?: string;
  query?: Record<string, unknown>;
  body?: any;
}

export interface CommentsApiResponse {
  status: number;
  body: unknown;
  headers?: Record<string, string>;
}

/** The fields Orbit POSTs. Taken here, in one place, so a new one reaches every project's API. */
const COMMENT_FIELDS = [
  "annotationId",
  "auteur",
  "comment",
  "pagina",
  "label",
  "varianten",
  "component",
  "screenshot",
] as const;

/** Columns a database from before their feature lacks: a comment is sent without them rather than lost. */
const OPTIONAL_COLUMNS = ["Varianten", "Component"];

/**
 * The comments API, framework-free: GET lists the project's comments (one element's with
 * `?annotationId=`), POST creates one with every field Orbit sends. `createCommentsHandler`
 * wraps it for Node; call this directly from a runtime with its own request shape.
 */
export async function handleCommentsRequest(
  request: CommentsApiRequest,
  options: CommentsApiOptions = {}
): Promise<CommentsApiResponse> {
  const apiKey = options.apiKey ?? process.env.NOTION_API_KEY;
  const databaseId = options.databaseId ?? process.env.NOTION_DATABASE_ID;
  const projectId = options.projectId ?? process.env.NOTION_PROJECT_ID;
  if (!apiKey || !databaseId || !projectId) {
    return { status: 500, body: { error: "NOTION_API_KEY, NOTION_DATABASE_ID and NOTION_PROJECT_ID are required" } };
  }
  const headers = {
    Authorization: `Bearer ${apiKey}`,
    "Notion-Version": NOTION_VERSION,
    "Content-Type": "application/json",
  };

  if (request.method === "GET") {
    const annotationId = typeof request.query?.annotationId === "string" ? request.query.annotationId : "";
    const filter = {
      and: [
        { property: "Project", relation: { contains: projectId } },
        // The column buildNotionCommentProperties writes and parseNotionComment reads.
        ...(annotationId ? [{ property: "Annotatie ID", rich_text: { equals: annotationId } }] : []),
      ],
    };
    const response = await fetch(`${NOTION_BASE}/databases/${databaseId}/query`, {
      method: "POST",
      headers,
      body: JSON.stringify({ filter, sorts: [{ timestamp: "created_time", direction: "ascending" }] }),
    });
    const data: any = await response.json();
    if (!response.ok) return { status: 502, body: { error: data.message } };
    return { status: 200, body: data.results.map(parseNotionComment) };
  }

  if (request.method === "POST") {
    const input = {} as CommentInput;
    for (const field of COMMENT_FIELDS) {
      const value = request.body?.[field];
      if (typeof value === "string" && value) (input as any)[field] = value;
    }
    if (!input.annotationId || !input.comment) {
      return { status: 400, body: { error: "annotationId and comment are required" } };
    }

    const properties = buildNotionCommentProperties(input, projectId);
    // The screenshot of the spot, as the page's body.
    const children = await buildNotionCommentChildren(input, apiKey);
    const createPage = () =>
      fetch(`${NOTION_BASE}/pages`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          parent: { database_id: databaseId },
          properties,
          ...(children.length ? { children } : {}),
        }),
      });

    let response = await createPage();
    for (const column of OPTIONAL_COLUMNS) {
      if (response.ok || !(column in properties)) continue;
      const text = await response.clone().text();
      if (!text.includes(column)) continue;
      console.warn(
        `[@strakzat/orbit] De Notion-database heeft geen kolom "${column}" (tekst). De feedback is opgeslagen zonder.`
      );
      delete properties[column];
      response = await createPage();
    }
    const page: any = await response.json();
    if (!response.ok) return { status: 502, body: { error: page.message } };
    return { status: 201, body: parseNotionComment(page) };
  }

  return { status: 405, body: { error: "Method not allowed" }, headers: { Allow: "GET, POST" } };
}

type NodeRequest = import("http").IncomingMessage & { body?: unknown; query?: Record<string, unknown> };

/**
 * The comments API as a Node handler, for Vercel, Express or a Vite dev server alike. An
 * `api/comments.js` is then one line: `export default createCommentsHandler()`. It takes a body
 * a framework already parsed, and reads the stream when there is none.
 */
export function createCommentsHandler(options: CommentsApiOptions = {}) {
  return async (req: NodeRequest, res: import("http").ServerResponse): Promise<void> => {
    let result: CommentsApiResponse;
    try {
      const query = req.query ?? Object.fromEntries(new URL(req.url ?? "/", "http://localhost").searchParams);
      const body = req.method === "POST" ? await readBody(req) : undefined;
      result = await handleCommentsRequest({ method: req.method, query, body }, options);
    } catch (err: any) {
      console.error("[@strakzat/orbit]", err);
      result = { status: 500, body: { error: err?.message ?? "Internal error" } };
    }
    res.writeHead(result.status, { "Content-Type": "application/json", ...result.headers });
    res.end(JSON.stringify(result.body));
  };
}

async function readBody(req: NodeRequest): Promise<unknown> {
  // Vercel parses the body lazily, through a getter that throws on invalid JSON.
  const parsed = req.body;
  if (parsed !== undefined) return typeof parsed === "string" ? JSON.parse(parsed || "{}") : parsed;
  let raw = "";
  for await (const chunk of req) raw += chunk;
  return raw ? JSON.parse(raw) : {};
}

/**
 * Parses a Notion page result into a Comment object.
 * Use this in your GET /api/comments handler.
 */
export function parseNotionComment(page: any): Comment {
  return {
    id: page.id,
    annotationId: getPlainText(page.properties["Annotatie ID"]),
    auteur: getPlainText(page.properties["Auteur"]),
    comment: getPlainText(page.properties["Comment"]),
    label: getPlainText(page.properties["Label"]),
    status: page.properties["Status"]?.select?.name ?? "Open",
    aangemaakt: page.properties["Aangemaakt"]?.created_time ?? page.created_time,
    antwoord: getPlainText(page.properties["Antwoord"]),
    pagina: getPlainText(page.properties["Pagina"]),
    varianten: getPlainText(page.properties["Varianten"]) || undefined,
    component: getPlainText(page.properties["Component"]) || undefined,
  };
}

function getPlainText(property: any): string {
  if (!property) return "";
  if (property.rich_text) {
    return property.rich_text.map((t: any) => t.plain_text).join("");
  }
  if (property.title) {
    return property.title.map((t: any) => t.plain_text).join("");
  }
  return "";
}
