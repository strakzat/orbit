import type { CommentStatus, FeedbackItem } from "./types";
import { requireEnv, sleep } from "./util";

const NOTION_VERSION = "2022-06-28";
const API = "https://api.notion.com/v1";

/** Notion select options Orbit relies on, in lifecycle order. */
export const STATUSES: CommentStatus[] = [
  "Open",
  "In behandeling",
  "In review",
  "Opgelost",
  "Afgewezen",
];

/** Property names in the Notion database (Dutch, must match the schema exactly). */
export const PROPS = {
  naam: "Naam",
  project: "Project",
  annotationId: "Annotatie ID",
  comment: "Comment",
  auteur: "Auteur",
  status: "Status",
  pagina: "Pagina",
  label: "Label",
  component: "Component",
  bron: "Bron",
  antwoord: "Antwoord",
  pr: "PR",
  varianten: "Varianten",
} as const;

function auth() {
  return {
    key: requireEnv("NOTION_API_KEY"),
    databaseId: requireEnv("NOTION_DATABASE_ID"),
  };
}

async function notionFetch(path: string, init: RequestInit, key: string): Promise<any> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${key}`,
      "Notion-Version": NOTION_VERSION,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Notion ${init.method ?? "GET"} ${path} → HTTP ${res.status}: ${text}`);
  }
  return res.json();
}

/** Every run of a rich-text property: a long value is split over several. */
function richText(prop: any): string {
  return (prop?.rich_text ?? []).map((t: any) => t.plain_text).join("");
}

function pageToItem(page: any, project: string): FeedbackItem {
  const p = page.properties ?? {};
  return {
    id: page.id,
    // Project is a relation, so the row holds the related page's id: the one that was queried.
    project,
    annotationId: richText(p[PROPS.annotationId]),
    label: richText(p[PROPS.label]),
    pagina: richText(p[PROPS.pagina]),
    auteur: richText(p[PROPS.auteur]),
    comment: richText(p[PROPS.comment]),
    component: richText(p[PROPS.component]),
    bron: richText(p[PROPS.bron]),
    status: (p[PROPS.status]?.select?.name as CommentStatus) ?? "Open",
    antwoord: richText(p[PROPS.antwoord]) || null,
    pr: p[PROPS.pr]?.url ?? "",
    varianten: richText(p[PROPS.varianten]),
    aangemaakt: page.created_time ?? "",
  };
}

/** Fetches every page for `project` whose status is in `statuses` (default: Open). */
export async function queryOpen(
  project: string,
  statuses: CommentStatus[] = ["Open"]
): Promise<FeedbackItem[]> {
  const { key, databaseId } = auth();
  const items: FeedbackItem[] = [];
  let cursor: string | undefined;

  do {
    const body = {
      filter: {
        and: [
          // Project is a Notion relation; `project` is the related page id.
          { property: PROPS.project, relation: { contains: project } },
          {
            or: statuses.map((s) => ({
              property: PROPS.status,
              select: { equals: s },
            })),
          },
        ],
      },
      sorts: [{ timestamp: "created_time", direction: "ascending" }],
      page_size: 100,
      ...(cursor ? { start_cursor: cursor } : {}),
    };

    const data = await notionFetch(
      `/databases/${databaseId}/query`,
      { method: "POST", body: JSON.stringify(body) },
      key
    );

    for (const page of data.results) items.push(pageToItem(page, project));
    cursor = data.has_more ? data.next_cursor : undefined;
  } while (cursor);

  return items;
}

export interface StatusUpdate {
  pr?: string;
  antwoord?: string;
}

/** Sets `status` (and optionally PR/Antwoord) on each page id, spaced for Notion rate limits. */
export async function updateStatus(
  ids: string[],
  status: CommentStatus,
  extra: StatusUpdate = {}
): Promise<void> {
  const { key } = auth();

  for (let i = 0; i < ids.length; i++) {
    const properties: Record<string, unknown> = {
      [PROPS.status]: { select: { name: status } },
    };
    if (extra.pr) properties[PROPS.pr] = { url: extra.pr };
    if (extra.antwoord !== undefined) {
      properties[PROPS.antwoord] = {
        rich_text: [{ text: { content: extra.antwoord.slice(0, 2000) } }],
      };
    }

    await notionFetch(
      `/pages/${ids[i]}`,
      { method: "PATCH", body: JSON.stringify({ properties }) },
      key
    );

    if (i < ids.length - 1) await sleep(350); // ~3 requests/second
  }
}

/** Returns the raw database object (for schema validation). */
export async function getDatabase(): Promise<any> {
  const { key, databaseId } = auth();
  return notionFetch(`/databases/${databaseId}`, { method: "GET" }, key);
}
