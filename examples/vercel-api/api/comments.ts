import type { VercelRequest, VercelResponse } from "@vercel/node";
import { buildNotionCommentProperties, parseNotionComment } from "@strakzat/orbit/server";

const { NOTION_API_KEY, NOTION_DATABASE_ID, NOTION_PROJECT_ID } = process.env;

const NOTION_BASE = "https://api.notion.com/v1";
const headers = {
  Authorization: `Bearer ${NOTION_API_KEY}`,
  "Notion-Version": "2022-06-28",
  "Content-Type": "application/json",
};

// The column names live in @strakzat/orbit/server; only the filter below names two of them.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method === "GET") {
    // The overlay asks without annotationId for the panel and the rail's counter, and with
    // it when a comment's thread opens.
    const annotationId = typeof req.query.annotationId === "string" ? req.query.annotationId : "";

    const filter = {
      and: [
        { property: "Project", relation: { contains: NOTION_PROJECT_ID } },
        ...(annotationId ? [{ property: "Annotatie ID", rich_text: { equals: annotationId } }] : []),
      ],
    };
    const response = await fetch(`${NOTION_BASE}/databases/${NOTION_DATABASE_ID}/query`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        filter,
        sorts: [{ timestamp: "created_time", direction: "ascending" }],
      }),
    });
    const data = await response.json();
    if (!response.ok) return res.status(502).json({ error: data.message });
    return res.status(200).json(data.results.map(parseNotionComment));
  }

  if (req.method === "POST") {
    const { annotationId, auteur, comment, pagina, label, varianten } = req.body ?? {};

    if (!annotationId || !comment) {
      return res.status(400).json({ error: "annotationId and comment are required" });
    }

    const properties = buildNotionCommentProperties(
      { annotationId, auteur, comment, pagina, label, varianten },
      NOTION_PROJECT_ID!
    );
    const response = await fetch(`${NOTION_BASE}/pages`, {
      method: "POST",
      headers,
      body: JSON.stringify({ parent: { database_id: NOTION_DATABASE_ID }, properties }),
    });
    const page = await response.json();
    if (!response.ok) return res.status(502).json({ error: page.message });
    return res.status(201).json(parseNotionComment(page));
  }

  res.setHeader("Allow", "GET, POST, OPTIONS");
  return res.status(405).json({ error: "Method not allowed" });
}
