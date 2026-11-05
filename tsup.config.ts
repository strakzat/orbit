import { readFileSync } from "node:fs";
import { defineConfig } from "tsup";

const { version } = JSON.parse(readFileSync("package.json", "utf8"));

export default defineConfig([
  {
    entry: ["src/index.ts"],
    format: ["esm", "cjs"],
    dts: true,
    banner: {
      js: '"use client";',
    },
    // The profile says which version is running (src/version.ts).
    define: { __ORBIT_VERSION__: JSON.stringify(version) },
    // Geist Mono, inlined: Orbit makes no font request of its own.
    loader: { ".woff2": "dataurl" },
  },
  {
    entry: ["src/server.ts"],
    format: ["esm", "cjs"],
    dts: true,
  },
  {
    entry: ["src/vite.ts"],
    format: ["esm", "cjs"],
    dts: true,
  },
  // Feedback CLI (Node, single ESM file with a shebang).
  {
    entry: { cli: "src/cli/index.ts" },
    format: ["esm"],
    platform: "node",
    target: "node18",
    banner: { js: "#!/usr/bin/env node" },
  },
]);
