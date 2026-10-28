/**
 * Vite dev server plugin for local /api/comments handling.
 * Import from "@strakzat/orbit/vite"
 *
 * Usage in vite.config.ts:
 *   import { annotationsDevApi } from '@strakzat/orbit/vite'
 *   export default defineConfig({ plugins: [annotationsDevApi(), react()] })
 */

import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { parse as parseQueryString } from "querystring";
import {
  buildNotionCommentChildren,
  buildNotionCommentProperties,
  parseNotionComment,
} from "./server";

const NOTION_BASE = "https://api.notion.com/v1";

const REQUIRED_ENV_VARS = [
  "NOTION_API_KEY",
  "NOTION_DATABASE_ID",
  "NOTION_PROJECT_ID",
] as const;

function loadDotEnv(root: string) {
  const envPath = resolve(root, ".env");
  if (!existsSync(envPath)) return;

  const content = readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();
    // Strip surrounding quotes
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function parseJsonBody(req: import("http").IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk: Buffer) => {
      body += chunk.toString();
    });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error("Invalid JSON body"));
      }
    });
    req.on("error", reject);
  });
}

function notionHeaders() {
  return {
    Authorization: `Bearer ${process.env.NOTION_API_KEY}`,
    "Notion-Version": "2022-06-28",
    "Content-Type": "application/json",
  };
}

export function annotationsDevApi(): {
  name: string;
  configureServer: (server: any) => void;
} {
  return {
    name: "annotations-dev-api",

    configureServer(server: any) {
      const root: string = server.config?.root || process.cwd();
      loadDotEnv(root);

      const missing = REQUIRED_ENV_VARS.filter((v) => !process.env[v]);
      if (missing.length > 0) {
        console.warn(
          `\n  ⚠ [annotations-dev-api] Missing env vars: ${missing.join(", ")}` +
            `\n    Add them to .env in your project root.\n`
        );
      }

      server.middlewares.use(
        "/api/comments",
        async (
          req: import("http").IncomingMessage,
          res: import("http").ServerResponse,
          next: () => void
        ) => {
          try {
            if (req.method === "GET") {
              const urlQuery = (req.url || "").split("?")[1] || "";
              const query = parseQueryString(urlQuery);
              const annotationId = query.annotationId as string | undefined;

              const filter: any = {
                and: [
                  {
                    property: "Project",
                    relation: {
                      contains: process.env.NOTION_PROJECT_ID,
                    },
                  },
                ],
              };
              if (annotationId) {
                // The column buildNotionCommentProperties writes and parseNotionComment reads.
                filter.and.push({
                  property: "Annotatie ID",
                  rich_text: { equals: annotationId },
                });
              }

              const response = await fetch(
                `${NOTION_BASE}/databases/${process.env.NOTION_DATABASE_ID}/query`,
                {
                  method: "POST",
                  headers: notionHeaders(),
                  body: JSON.stringify({ filter }),
                }
              );
              const data = await response.json();
              if (!response.ok) {
                res.writeHead(502, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ error: (data as any).message }));
                return;
              }
              const comments = (data as any).results.map(parseNotionComment);

              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify(comments));
              return;
            }

            if (req.method === "POST") {
              const body = await parseJsonBody(req);
              const { annotationId, auteur, comment, pagina, label, varianten, screenshot } = body;
              const properties = buildNotionCommentProperties(
                { annotationId, auteur, comment, pagina, label, varianten },
                process.env.NOTION_PROJECT_ID!
              );
              // The screenshot of the spot, as the page's body.
              const children = await buildNotionCommentChildren(
                { annotationId, comment, screenshot },
                process.env.NOTION_API_KEY!
              );

              const createPage = (props: Record<string, unknown>) =>
                fetch(`${NOTION_BASE}/pages`, {
                  method: "POST",
                  headers: notionHeaders(),
                  body: JSON.stringify({
                    parent: {
                      database_id: process.env.NOTION_DATABASE_ID,
                    },
                    properties: props,
                    ...(children.length ? { children } : {}),
                  }),
                });

              let response = await createPage(properties);
              // A database from before variants has no Varianten column: the comment is sent
              // without them rather than lost.
              if (!response.ok && "Varianten" in properties) {
                const text = await response.clone().text();
                if (text.includes("Varianten")) {
                  console.warn(
                    '[annotations-dev-api] De Notion-database heeft geen kolom "Varianten" (tekst). ' +
                      "De feedback is opgeslagen zonder de varianten."
                  );
                  const { Varianten: _dropped, ...rest } = properties;
                  response = await createPage(rest);
                }
              }
              const page = await response.json();
              if (!response.ok) {
                res.writeHead(502, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ error: (page as any).message }));
                return;
              }

              res.writeHead(201, { "Content-Type": "application/json" });
              res.end(JSON.stringify(parseNotionComment(page)));
              return;
            }

            res.writeHead(405, {
              Allow: "GET, POST",
              "Content-Type": "application/json",
            });
            res.end(JSON.stringify({ error: "Method not allowed" }));
          } catch (err: any) {
            console.error("[annotations-dev-api]", err);
            res.writeHead(500, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: err.message }));
          }
        }
      );
    },
  };
}
