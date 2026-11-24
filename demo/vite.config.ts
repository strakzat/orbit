import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { readChangelog } from "../dist/vite.mjs";
import { mockCommentsApi } from "./mock-api";

export default defineConfig({
  plugins: [react(), mockCommentsApi()],
  define: { __CHANGELOG__: JSON.stringify(readChangelog(path.resolve(__dirname, "CHANGELOG.md"))) },
  // Node resolves "localhost" to ::1 alone on macOS, and a preview that opens 127.0.0.1
  // (Conductor's) then waits forever. IPv4 explicitly; "localhost" in a browser still works.
  server: { host: "127.0.0.1" },
  resolve: {
    alias: {
      "@strakzat/orbit": path.resolve(__dirname, "../dist/index.mjs"),
    },
  },
});
