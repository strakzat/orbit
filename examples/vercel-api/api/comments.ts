import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createCommentsHandler } from "@strakzat/orbit/server";

// Orbit's own handler: GET and POST against Notion, with every field Orbit sends. It reads
// NOTION_API_KEY, NOTION_DATABASE_ID and NOTION_PROJECT_ID.
const comments = createCommentsHandler();

// CORS, for an overlay on another origin than the API (apiBase set).
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  return comments(req, res);
}
