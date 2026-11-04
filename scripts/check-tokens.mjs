#!/usr/bin/env node
/**
 * Guards the token layer.
 *
 * @strakzat/eslint-config-ui only reads `className` literals and clsx/cn arguments,
 * so on a package that ships plain CSS it would run green while seeing nothing.
 * This does the equivalent job for how this package is actually written: no colour
 * outside the token file, and no styling decision smuggled back into an inline
 * style object.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const SRC = join(ROOT, "src");

// The only places a literal colour is allowed to exist.
const COLOUR_ALLOWLIST = new Set([
  "src/styles/tokens.ts", // the token definitions themselves
  "src/styles/brand.ts", // the on-brand contrast fallbacks
  "src/constants.ts", // DEFAULT_SETTINGS.accentColor
]);

// DEFAULT_SETTINGS holds public knobs (accentColor, zIndex, panelWidth), not styling.
const STYLE_ALLOWLIST = new Set(["src/constants.ts"]);

// Properties that belong in the stylesheet. Anything left inline should be a
// runtime measurement — a rect, a drag position, a computed offset.
const STYLE_PROPERTIES = [
  "background",
  "backgroundColor",
  "color",
  "border",
  "borderColor",
  "borderRadius",
  "boxShadow",
  "padding",
  "margin",
  "fontSize",
  "fontWeight",
  "fontFamily",
  "lineHeight",
  "letterSpacing",
  "textTransform",
  "transition",
  "zIndex",
  "opacity",
  "cursor",
];

const COLOUR = /#[0-9A-Fa-f]{3,8}\b|\brgba?\(/;
const STYLE_PROPERTY = new RegExp(`^\\s*(${STYLE_PROPERTIES.join("|")})\\s*:`);

function walk(dir) {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    // Tests don't ship, and a colour can be what they're about.
    if (entry === "__tests__") return [];
    if (statSync(full).isDirectory()) return walk(full);
    return /\.tsx?$/.test(entry) ? [full] : [];
  });
}

const findings = [];

for (const file of walk(SRC)) {
  const rel = relative(ROOT, file);
  const lines = readFileSync(file, "utf8").split("\n");

  lines.forEach((line, index) => {
    const at = `${rel}:${index + 1}`;

    // Comments and doc blocks may mention a colour.
    const code = line.replace(/\/\/.*$/, "").replace(/^\s*\*.*$/, "");

    if (!COLOUR_ALLOWLIST.has(rel) && COLOUR.test(code)) {
      findings.push(`${at}  raw colour — use a --orbit-* token\n    ${line.trim()}`);
    }

    // Inside src/styles these property names are the stylesheet itself.
    if (
      !rel.startsWith("src/styles/") &&
      !STYLE_ALLOWLIST.has(rel) &&
      STYLE_PROPERTY.test(code)
    ) {
      findings.push(`${at}  styling in an inline style — move it to src/styles/rules.ts\n    ${line.trim()}`);
    }
  });
}

if (findings.length > 0) {
  console.error(`check:tokens — ${findings.length} finding(s)\n`);
  console.error(findings.join("\n"));
  process.exit(1);
}

console.log("check:tokens — clean");
