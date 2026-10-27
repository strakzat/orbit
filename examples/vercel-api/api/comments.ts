import type { VercelRequest, VercelResponse } from "@vercel/node";
import { Client } from "@notionhq/client";

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const DATABASE_ID = process.env.NOTION_DATABASE_ID!;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method === "GET") {
    const { project, annotationId } = req.query;

    if (!project || !annotationId) {
      return res.status(400).json({ error: "project and annotationId are required" });
    }

    try {
      const response = await notion.databases.query({
        database_id: DATABASE_ID,
        filter: {
          and: [
            {
              property: "Project",
              rich_text: { equals: project as string },
            },
            {
              property: "Annotatie ID",
              rich_text: { equals: annotationId as string },
            },
          ],
        },
        sorts: [{ property: "Aangemaakt", direction: "ascending" }],
      });

      const comments = response.results.map((page: any) => ({
        id: page.id,
        auteur: page.properties["Auteur"]?.rich_text?.[0]?.plain_text ?? "",
        comment: page.properties["Comment"]?.rich_text?.[0]?.plain_text ?? "",
        status: page.properties["Status"]?.status?.name ?? "Open",
        antwoord: page.properties["Antwoord"]?.rich_text?.[0]?.plain_text ?? null,
        aangemaakt: page.properties["Aangemaakt"]?.created_time ?? "",
      }));

      return res.status(200).json(comments);
    } catch (err) {
      console.error("Notion query failed:", err);
      return res.status(500).json({ error: "Failed to fetch comments" });
    }
  }

  if (req.method === "POST") {
    const { project, annotationId, auteur, comment, pagina, label, varianten } = req.body ?? {};

    if (!project || !annotationId || !auteur || !comment) {
      return res.status(400).json({ error: "project, annotationId, auteur, and comment are required" });
    }

    try {
      await notion.pages.create({
        parent: { database_id: DATABASE_ID },
        properties: {
          "Naam": {
            title: [{ text: { content: `${auteur} — ${annotationId}` } }],
          },
          "Project": {
            rich_text: [{ text: { content: project } }],
          },
          "Annotatie ID": {
            rich_text: [{ text: { content: annotationId } }],
          },
          "Comment": {
            rich_text: [{ text: { content: comment } }],
          },
          "Auteur": {
            rich_text: [{ text: { content: auteur } }],
          },
          "Status": {
            status: { name: "Open" },
          },
          ...(pagina
            ? {
                "Pagina": {
                  rich_text: [{ text: { content: pagina } }],
                },
              }
            : {}),
          ...(label
            ? {
                "Label": {
                  rich_text: [{ text: { content: label } }],
                },
              }
            : {}),
          ...(varianten
            ? {
                "Varianten": {
                  rich_text: [{ text: { content: String(varianten).slice(0, 2000) } }],
                },
              }
            : {}),
        },
      });

      return res.status(201).json({ ok: true });
    } catch (err) {
      console.error("Notion create failed:", err);
      return res.status(500).json({ error: "Failed to create comment" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
