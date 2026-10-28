#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

// ── Config ──────────────────────────────────────────────────────────────────

const COLORS = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  red: "\x1b[31m",
};

const ANNOTATION_IMPORT = `import { AnnotationProvider, OrbitShell } from '@strakzat/orbit'`;
const DATA_IMPORT = `import { annotations } from './annotations/data'`;

const DATA_FILE_CONTENT = `export const annotations = []\n`;

const CLAUDE_MD_SENTINEL = "<!-- @strakzat/orbit -->";

const CLAUDE_MD_CONTENT = `${CLAUDE_MD_SENTINEL}
## Annotations

This project uses \`@strakzat/orbit\` for annotations and feedback.

**Adding annotations:** edit \`src/annotations/data.js\` — append an object to the array. NEVER put annotation content directly in component files.

**Annotation object:**
- \`id\` — unique string (increment from highest existing)
- \`target\` — route pattern: \`"/"\`, \`"/settings"\`, \`"/users/:id"\`, or \`"global"\` for all pages
- \`elementId\` — (optional) matches \`data-annotation-id="..."\` or \`id="..."\` on a DOM element
- \`title\` — short heading
- \`body\` — explanation text
- \`author\` — name of the person
- \`date\` — ISO date (YYYY-MM-DD)
- \`type\` — (optional) \`documentation\` | \`pro\` | \`question\` | \`con\` | \`suggestion\` | \`critical\` | \`user-insight\`

**Linking to an element:** set \`elementId\` to match a \`data-annotation-id\` attribute on the target element. Run \`npx orbit-scan\` to auto-add \`data-annotation-id\` attributes to UI components.

**Feedback/comments:** managed via the UI (Inspector mode) and the \`/api/comments\` endpoint, not via code.
`;

const API_COMMENTS_CONTENT = `import { buildNotionCommentProperties, parseNotionComment } from '@strakzat/orbit/server'

const { NOTION_API_KEY, NOTION_DATABASE_ID, NOTION_PROJECT_ID } = process.env

const NOTION_BASE = 'https://api.notion.com/v1'
const headers = {
  Authorization: \`Bearer \${NOTION_API_KEY}\`,
  'Notion-Version': '2022-06-28',
  'Content-Type': 'application/json',
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const { project, annotationId } = req.query

    const filter = {
      and: [
        { property: 'Project', relation: { contains: NOTION_PROJECT_ID } },
      ],
    }
    if (annotationId) {
      // The column buildNotionCommentProperties writes and parseNotionComment reads.
      filter.and.push({ property: 'Annotatie ID', rich_text: { equals: annotationId } })
    }

    const response = await fetch(\`\${NOTION_BASE}/databases/\${NOTION_DATABASE_ID}/query\`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ filter }),
    })
    const data = await response.json()
    if (!response.ok) return res.status(502).json({ error: data.message })
    const comments = data.results.map(parseNotionComment)
    return res.json(comments)
  }

  if (req.method === 'POST') {
    const { annotationId, auteur, comment, pagina, label, varianten } = req.body
    const properties = buildNotionCommentProperties(
      { annotationId, auteur, comment, pagina, label, varianten },
      NOTION_PROJECT_ID
    )
    const response = await fetch(\`\${NOTION_BASE}/pages\`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ parent: { database_id: NOTION_DATABASE_ID }, properties }),
    })
    const page = await response.json()
    if (!response.ok) return res.status(502).json({ error: page.message })
    return res.status(201).json(parseNotionComment(page))
  }

  res.setHeader('Allow', 'GET, POST')
  return res.status(405).json({ error: 'Method not allowed' })
}
`;

// Entry points to search for, in priority order
const ENTRY_CANDIDATES = [
  "src/App.tsx",
  "src/App.jsx",
  "src/app/layout.tsx",
  "src/app/layout.jsx",
  "src/layouts/RootLayout.tsx",
  "src/layouts/RootLayout.jsx",
  "src/Layout.tsx",
  "src/Layout.jsx",
  "src/main.tsx",
  "src/main.jsx",
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function c(color, text) {
  return `${COLORS[color]}${text}${COLORS.reset}`;
}

function findFiles(dir, extensions) {
  const results = [];
  if (!fs.existsSync(dir)) return results;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (["node_modules", ".next", ".git", "dist", "build", ".turbo"].includes(entry.name)) continue;
      results.push(...findFiles(fullPath, extensions));
    } else if (extensions.some((ext) => entry.name.endsWith(ext))) {
      results.push(fullPath);
    }
  }
  return results;
}

// ── Data file creation ──────────────────────────────────────────────────────

function ensureDataFile(rootDir) {
  const dataDir = path.join(rootDir, "src", "annotations");
  const dataFile = path.join(dataDir, "data.js");

  if (fs.existsSync(dataFile)) {
    console.log(`  ${c("green", "✓")} ${c("dim", "src/annotations/data.js bestaat al")}`);
    return false;
  }

  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  fs.writeFileSync(dataFile, DATA_FILE_CONTENT, "utf-8");
  console.log(`  ${c("green", "✓")} ${c("bold", "src/annotations/data.js")} aangemaakt`);
  return true;
}

// ── API route creation ───────────────────────────────────────────────────────

function ensureApiRoute(rootDir) {
  const apiDir = path.join(rootDir, "api");
  const apiFile = path.join(apiDir, "comments.js");

  if (fs.existsSync(apiFile)) {
    console.log(`  ${c("green", "✓")} ${c("dim", "api/comments.js bestaat al")}`);
    return false;
  }

  if (!fs.existsSync(apiDir)) {
    fs.mkdirSync(apiDir, { recursive: true });
  }

  fs.writeFileSync(apiFile, API_COMMENTS_CONTENT, "utf-8");
  console.log(`  ${c("green", "✓")} ${c("bold", "api/comments.js")} aangemaakt`);
  return true;
}

// ── vercel.json ──────────────────────────────────────────────────────────────

function ensureVercelConfig(rootDir) {
  const vercelFile = path.join(rootDir, "vercel.json");
  const apiRewrite = { source: "/api/(.*)", destination: "/api/$1" };

  if (fs.existsSync(vercelFile)) {
    const config = JSON.parse(fs.readFileSync(vercelFile, "utf-8"));
    if (!config.rewrites) config.rewrites = [];

    // Check if API rewrite already exists
    const hasApiRewrite = config.rewrites.some(
      (r) => r.source === apiRewrite.source
    );
    if (hasApiRewrite) {
      console.log(`  ${c("green", "✓")} ${c("dim", "vercel.json heeft al API rewrite")}`);
      return false;
    }

    // Insert API rewrite before any catch-all
    const catchAllIndex = config.rewrites.findIndex(
      (r) => r.source === "/(.*)"
    );
    if (catchAllIndex !== -1) {
      config.rewrites.splice(catchAllIndex, 0, apiRewrite);
    } else {
      config.rewrites.push(apiRewrite);
    }

    fs.writeFileSync(vercelFile, JSON.stringify(config, null, 2) + "\n", "utf-8");
    console.log(`  ${c("green", "✓")} ${c("bold", "vercel.json")} API rewrite toegevoegd`);
    return true;
  }

  // Create new vercel.json
  const config = {
    rewrites: [
      apiRewrite,
      { source: "/(.*)", destination: "/index.html" },
    ],
  };
  fs.writeFileSync(vercelFile, JSON.stringify(config, null, 2) + "\n", "utf-8");
  console.log(`  ${c("green", "✓")} ${c("bold", "vercel.json")} aangemaakt`);
  return true;
}

// ── CLAUDE.md for AI agents ─────────────────────────────────────────────────

function ensureClaudeMd(rootDir) {
  const claudeFile = path.join(rootDir, "CLAUDE.md");

  if (fs.existsSync(claudeFile)) {
    const content = fs.readFileSync(claudeFile, "utf-8");
    if (content.includes(CLAUDE_MD_SENTINEL)) {
      console.log(`  ${c("green", "✓")} ${c("dim", "CLAUDE.md heeft al annotations sectie")}`);
      return false;
    }

    fs.writeFileSync(claudeFile, content.trimEnd() + "\n\n" + CLAUDE_MD_CONTENT, "utf-8");
    console.log(`  ${c("green", "✓")} ${c("bold", "CLAUDE.md")} annotations sectie toegevoegd`);
    return true;
  }

  fs.writeFileSync(claudeFile, CLAUDE_MD_CONTENT, "utf-8");
  console.log(`  ${c("green", "✓")} ${c("bold", "CLAUDE.md")} aangemaakt`);
  return true;
}

// ── Vite plugin injection ────────────────────────────────────────────────────

const VITE_CONFIG_CANDIDATES = [
  "vite.config.ts",
  "vite.config.js",
  "vite.config.mts",
  "vite.config.mjs",
];

function findViteConfig(rootDir) {
  for (const candidate of VITE_CONFIG_CANDIDATES) {
    const fullPath = path.join(rootDir, candidate);
    if (fs.existsSync(fullPath)) return fullPath;
  }
  return null;
}

function ensureVitePlugin(rootDir) {
  const viteConfigPath = findViteConfig(rootDir);
  if (!viteConfigPath) {
    console.log(`  ${c("dim", "─")} ${c("dim", "Geen Vite project — overgeslagen")}`);
    return false;
  }

  const configRelPath = path.relative(rootDir, viteConfigPath);
  let content = fs.readFileSync(viteConfigPath, "utf-8");

  if (content.includes("annotationsDevApi")) {
    console.log(`  ${c("green", "✓")} ${c("dim", `${configRelPath} heeft al annotationsDevApi`)}`);
    return false;
  }

  // Add import after last import statement
  const lines = content.split("\n");
  let lastImportIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    if (/^\s*import\s/.test(lines[i])) {
      let j = i;
      while (j < lines.length && !lines[j].includes(";") && !lines[j].match(/['"]$/)) {
        j++;
      }
      lastImportIndex = j;
    }
  }

  const pluginImport = `import { annotationsDevApi } from '@strakzat/orbit/vite'`;

  if (lastImportIndex === -1) {
    lines.unshift(pluginImport);
  } else {
    lines.splice(lastImportIndex + 1, 0, pluginImport);
  }
  content = lines.join("\n");

  // Add annotationsDevApi() to the plugins array
  const pluginsMatch = content.match(/plugins\s*:\s*\[/);
  if (pluginsMatch) {
    const insertAt = content.indexOf(pluginsMatch[0]) + pluginsMatch[0].length;
    // Check what follows to determine formatting
    const after = content.slice(insertAt).trimStart();
    const needsComma = after.length > 0 && after[0] !== "]";
    const insertion = needsComma ? `annotationsDevApi(), ` : `annotationsDevApi()`;
    content = content.slice(0, insertAt) + insertion + content.slice(insertAt);
  } else {
    console.log(`  ${c("yellow", "!")} ${c("dim", `Kon plugins array niet vinden in ${configRelPath} — voeg handmatig annotationsDevApi() toe`)}`)
    // Still write the import
    fs.writeFileSync(viteConfigPath, content, "utf-8");
    console.log(`  ${c("green", "✓")} ${c("bold", configRelPath)} import toegevoegd`);
    return true;
  }

  fs.writeFileSync(viteConfigPath, content, "utf-8");
  console.log(`  ${c("green", "✓")} ${c("bold", configRelPath)} annotationsDevApi() toegevoegd`);
  return true;
}

// ── Layout file detection ───────────────────────────────────────────────────

function findLayoutFile(rootDir) {
  // First check known candidates
  for (const candidate of ENTRY_CANDIDATES) {
    const fullPath = path.join(rootDir, candidate);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, "utf-8");
      if (content.includes("useLocation")) {
        return fullPath;
      }
    }
  }

  // Fallback: scan src/ for any file that uses useLocation
  const srcDir = path.join(rootDir, "src");
  const files = findFiles(srcDir, [".tsx", ".jsx"]);
  for (const filePath of files) {
    const content = fs.readFileSync(filePath, "utf-8");
    if (content.includes("useLocation") && content.includes("react-router")) {
      return filePath;
    }
  }

  return null;
}

// ── Layout file injection ───────────────────────────────────────────────────

function hasAnnotationSetup(content) {
  return content.includes("AnnotationProvider") || content.includes("@strakzat/orbit");
}

function injectImports(content, layoutRelPath) {
  const lines = content.split("\n");

  // Find the last import line
  let lastImportIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    if (/^\s*import\s/.test(lines[i])) {
      // Walk past multi-line imports
      let j = i;
      while (j < lines.length && !lines[j].includes(";") && !lines[j].match(/['"]$/)) {
        j++;
      }
      lastImportIndex = j;
    }
  }

  if (lastImportIndex === -1) {
    // No imports found, add at top
    lastImportIndex = 0;
  }

  // Compute relative path from layout file to data file
  const layoutDir = path.dirname(layoutRelPath);
  let dataRelative = path.relative(layoutDir, "src/annotations/data").replace(/\\/g, "/");
  if (!dataRelative.startsWith(".")) {
    dataRelative = "./" + dataRelative;
  }

  const dataImport = `import { annotations } from '${dataRelative}'`;

  const newLines = [...lines];
  newLines.splice(lastImportIndex + 1, 0, ANNOTATION_IMPORT, dataImport);

  return newLines.join("\n");
}

function wrapWithProvider(content) {
  // Strategy: find the component that calls useLocation(), then wrap its return JSX.
  //
  // We look for the pattern:
  //   const location = useLocation()
  // Then find the return statement's JSX and wrap it with AnnotationProvider.

  // Find the location variable name
  const locationMatch = content.match(/const\s+(\w+)\s*=\s*useLocation\(\)/);
  if (!locationMatch) {
    return null;
  }
  const locationVar = locationMatch[1];

  // Find the return ( ... ) block
  // We need to find "return (" and then match the balanced parens
  const returnIndex = findReturnStatement(content);
  if (returnIndex === -1) {
    return null;
  }

  // Find the opening paren after return
  const afterReturn = content.indexOf("(", returnIndex);
  if (afterReturn === -1) {
    return null;
  }

  // Find matching closing paren
  const closeIndex = findMatchingParen(content, afterReturn);
  if (closeIndex === -1) {
    return null;
  }

  // Get the inner JSX content
  const innerJsx = content.slice(afterReturn + 1, closeIndex);

  // Find the last closing tag before the end, for where the app's own JSX ends
  const trimmedJsx = innerJsx.trimEnd();
  const lastCloseTagMatch = trimmedJsx.match(/(<\/\w+>)\s*$/);

  // Detect base indentation from the original JSX
  const jsxLines = innerJsx.split("\n").filter((l) => l.trim().length > 0);
  const baseIndent = jsxLines.length > 0
    ? jsxLines[0].match(/^(\s*)/)[1]
    : "    ";
  const indent = baseIndent || "    ";

  let wrappedJsx;
  if (lastCloseTagMatch) {
    const insertPos = trimmedJsx.lastIndexOf(lastCloseTagMatch[1]);
    const before = trimmedJsx.slice(0, insertPos);
    const closingTag = lastCloseTagMatch[1];

    wrappedJsx =
      `\n${indent}<AnnotationProvider annotations={annotations} currentRoute={${locationVar}.pathname} comments={{ enabled: true, apiBase: '', project: 'my-project' }}>\n` +
      `${indent}<OrbitShell>\n` +
      `${before.trimEnd()}\n` +
      `${indent}${closingTag}\n` +
      `${indent}</OrbitShell>\n` +
      `${indent}</AnnotationProvider>\n  `;
  } else {
    wrappedJsx =
      `\n${indent}<AnnotationProvider annotations={annotations} currentRoute={${locationVar}.pathname} comments={{ enabled: true, apiBase: '', project: 'my-project' }}>\n` +
      `${indent}<OrbitShell>\n` +
      `${innerJsx.trimEnd()}\n` +
      `${indent}</OrbitShell>\n` +
      `${indent}</AnnotationProvider>\n  `;
  }

  return content.slice(0, afterReturn + 1) + wrappedJsx + content.slice(closeIndex);
}

function findReturnStatement(content) {
  // Find "return (" that contains JSX, skipping hook cleanups like "return () =>"
  const locationIndex = content.indexOf("useLocation()");
  if (locationIndex === -1) return -1;

  // Search for return statements after useLocation
  const regex = /\breturn\s*\(/g;
  regex.lastIndex = locationIndex;

  let lastJsxReturn = -1;
  let match;
  while ((match = regex.exec(content)) !== null) {
    const afterParen = content.slice(match.index + match[0].length).trimStart();
    // Skip cleanup returns: "return () =>" or "return (function"
    if (afterParen.startsWith(")") && /^\)\s*=>/.test(afterParen)) continue;
    if (afterParen.startsWith("function")) continue;

    // Check if this return contains JSX (has a < tag)
    const parenStart = content.indexOf("(", match.index);
    const parenEnd = findMatchingParen(content, parenStart);
    if (parenEnd === -1) continue;

    const inner = content.slice(parenStart + 1, parenEnd);
    if (/<\w/.test(inner)) {
      lastJsxReturn = match.index;
    }
  }

  return lastJsxReturn;
}

function findMatchingParen(content, openIndex) {
  let depth = 0;
  for (let i = openIndex; i < content.length; i++) {
    const ch = content[i];
    if (ch === "(") depth++;
    else if (ch === ")") {
      depth--;
      if (depth === 0) return i;
    }
    // Skip string literals
    if (ch === '"' || ch === "'" || ch === "`") {
      const quote = ch;
      i++;
      while (i < content.length && content[i] !== quote) {
        if (content[i] === "\\") i++;
        i++;
      }
    }
  }
  return -1;
}

// ── Main ────────────────────────────────────────────────────────────────────

function main() {
  const args = process.argv.slice(2);
  const rootDir = args[0] ? path.resolve(args[0]) : process.cwd();
  const srcDir = path.join(rootDir, "src");

  console.log("");
  console.log(c("bold", "  orbit-init"));
  console.log(c("dim", `  Setting up annotations in ${path.relative(process.cwd(), rootDir) || "."}...\n`));

  if (!fs.existsSync(srcDir)) {
    console.log(c("red", "  ✗ src/ map niet gevonden. Draai dit vanuit de root van je project.\n"));
    process.exit(1);
  }

  // Step 1: Create data file
  console.log(c("dim", "  ─ Data file ─────────────────────────────"));
  const dataCreated = ensureDataFile(rootDir);
  console.log("");

  // Step 2: Create API route
  console.log(c("dim", "  ─ API route ─────────────────────────────"));
  ensureApiRoute(rootDir);
  console.log("");

  // Step 3: Ensure vercel.json
  console.log(c("dim", "  ─ Vercel config ─────────────────────────"));
  ensureVercelConfig(rootDir);
  console.log("");

  // Step 4: Vite plugin (only if Vite project)
  console.log(c("dim", "  ─ Vite plugin ───────────────────────────"));
  ensureVitePlugin(rootDir);
  console.log("");

  // Step 5: Find and modify layout file
  console.log(c("dim", "  ─ Layout file ───────────────────────────"));
  const layoutFile = findLayoutFile(rootDir);

  if (!layoutFile) {
    console.log(`  ${c("yellow", "!")} Geen layout-bestand gevonden met useLocation().`);
    console.log(c("dim", "  Voeg handmatig de AnnotationProvider toe aan je root layout.\n"));
    console.log(c("dim", "  Voorbeeld:"));
    console.log(c("dim", `  ${ANNOTATION_IMPORT}`));
    console.log(c("dim", `  ${DATA_IMPORT}\n`));
    console.log(c("dim", "  <AnnotationProvider annotations={annotations} currentRoute={location.pathname} comments={{ enabled: true, apiBase: '', project: 'my-project' }}>"));
    console.log(c("dim", "    <OrbitShell>{/* je app */}</OrbitShell>"));
    console.log(c("dim", "  </AnnotationProvider>\n"));

    // Still generate CLAUDE.md even without layout file
    console.log("");
    console.log(c("dim", "  ─ AI agent instructions ─────────────────"));
    ensureClaudeMd(rootDir);

    if (dataCreated) {
      console.log(c("green", "\n  Klaar!") + " Data-bestand aangemaakt, layout moet handmatig worden aangepast.\n");
    }
    process.exit(0);
  }

  const layoutRelPath = path.relative(rootDir, layoutFile);
  const content = fs.readFileSync(layoutFile, "utf-8");

  if (hasAnnotationSetup(content)) {
    console.log(`  ${c("green", "✓")} ${c("dim", `${layoutRelPath} heeft al AnnotationProvider`)}`);
    console.log(`\n  ${c("green", "Alles is al geconfigureerd!")}\n`);
    process.exit(0);
  }

  console.log(`  ${c("cyan", "○")} Gevonden: ${c("bold", layoutRelPath)}`);

  // Inject imports
  let modified = injectImports(content, layoutRelPath);

  // Wrap JSX with provider
  const wrapped = wrapWithProvider(modified);
  if (!wrapped) {
    console.log(`  ${c("yellow", "!")} Kon return JSX niet automatisch wrappen.`);
    console.log(c("dim", "  Imports zijn toegevoegd — wrap handmatig met AnnotationProvider.\n"));
    fs.writeFileSync(layoutFile, modified, "utf-8");
    console.log(`  ${c("green", "✓")} ${c("bold", layoutRelPath)} aangepast (imports toegevoegd)\n`);
    process.exit(0);
  }

  fs.writeFileSync(layoutFile, wrapped, "utf-8");
  console.log(`  ${c("green", "✓")} ${c("bold", layoutRelPath)} aangepast`);
  console.log(c("dim", "    + imports toegevoegd"));
  console.log(c("dim", "    + AnnotationProvider wrapper + comments config toegevoegd"));
  console.log(c("dim", "    + OrbitShell toegevoegd: de rail, het paneel en de inspector"));

  // Step 6: CLAUDE.md for AI agents
  console.log("");
  console.log(c("dim", "  ─ AI agent instructions ─────────────────"));
  ensureClaudeMd(rootDir);

  // Summary
  console.log("");
  console.log(c("dim", "  ─────────────────────────────────────────"));
  console.log(`  ${c("green", "Klaar!")} Annotaties zijn geconfigureerd.\n`);
  console.log(c("dim", "  Volgende stappen:"));
  console.log(c("dim", "  1. Stel NOTION_API_KEY, NOTION_DATABASE_ID en NOTION_PROJECT_ID in als env vars"));
  console.log(c("dim", "  2. Voeg annotaties toe in src/annotations/data.js"));
  console.log(c("dim", "  3. Draai orbit-scan om data-annotation-id's te plaatsen"));
  console.log(c("dim", "  4. Start je app en druk op Cmd+. om het paneel te openen\n"));
}

main();
