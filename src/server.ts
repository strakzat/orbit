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
 * (rich text), or Notion refuses the page.
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
