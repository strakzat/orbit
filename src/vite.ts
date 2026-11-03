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
import { createCommentsHandler } from "./server";

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

      // The same handler a project deploys, so dev and production take the same fields.
      server.middlewares.use("/api/comments", createCommentsHandler());
    },
  };
}
