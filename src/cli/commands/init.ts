import {
  existsSync,
  readFileSync,
  writeFileSync,
  copyFileSync,
  mkdirSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { getDatabase, PROPS, STATUSES } from "../notion";
import { type Args, flagBool, tryRun } from "../util";

const HERE = dirname(fileURLToPath(import.meta.url));
// dist/cli.js → ../templates
const TEMPLATES = join(HERE, "..", "templates");

const COPIES: Array<{ from: string; to: string }> = [
  { from: "skill/SKILL.md", to: ".claude/skills/orbit-feedback/SKILL.md" },
  { from: "workflows/orbit-feedback.yml", to: ".github/workflows/orbit-feedback.yml" },
  {
    from: "workflows/orbit-feedback-sync.yml",
    to: ".github/workflows/orbit-feedback-sync.yml",
  },
];

export async function initCommand(args: Args): Promise<void> {
  if (flagBool(args, "check")) {
    const schemaOk = await checkSchema();
    const ghOk = checkGithubPermissions();
    if (!schemaOk || !ghOk) process.exit(1);
    return;
  }

  for (const { from, to } of COPIES) {
    const src = join(TEMPLATES, from);
    const existed = existsSync(to);
    mkdirSync(dirname(to), { recursive: true });
    copyFileSync(src, to);
    process.stdout.write(`${existed ? "Bijgewerkt" : "Aangemaakt"}: ${to}\n`);
  }

  addGitignore(".orbit/");

  process.stdout.write(
    "\nKlaar. Volgende stappen:\n" +
      "  1. Zet de secrets NOTION_API_KEY, NOTION_DATABASE_ID, NOTION_PROJECT_ID\n" +
      "     en CLAUDE_CODE_OAUTH_TOKEN in GitHub.\n" +
      "  2. Geef deze repo leestoegang tot het @strakzat/orbit-pakket (pakket op\n" +
      "     Internal, of via 'Manage Actions access'). Anders: zet ORBIT_NPM_TOKEN\n" +
      "     op een PAT met read:packages.\n" +
      "  3. Zet 'Allow GitHub Actions to create and approve pull requests' aan\n" +
      "     (Settings → Actions → General → Workflow permissions), of zet\n" +
      "     ORBIT_GH_TOKEN op een PAT.\n" +
      "  4. Controleer schema en permissies: npx orbit-feedback init --check\n"
  );
}

function addGitignore(entry: string): void {
  const path = ".gitignore";
  let content = "";
  if (existsSync(path)) content = readFileSync(path, "utf8");
  if (content.split("\n").some((l) => l.trim() === entry.trim())) return;
  const prefix = content && !content.endsWith("\n") ? "\n" : "";
  writeFileSync(path, content + prefix + entry + "\n", "utf8");
  process.stdout.write(`Toegevoegd aan .gitignore: ${entry}\n`);
}

async function checkSchema(): Promise<boolean> {
  const db = await getDatabase();
  const props = db.properties ?? {};
  const problems: string[] = [];

  const required: Array<{ name: string; type: string }> = [
    // Every database has one title column; Notion names it "Name" until it is renamed.
    { name: PROPS.naam, type: "title" },
    { name: PROPS.project, type: "relation" },
    { name: PROPS.annotationId, type: "rich_text" },
    { name: PROPS.comment, type: "rich_text" },
    { name: PROPS.auteur, type: "rich_text" },
    { name: PROPS.status, type: "select" },
    { name: PROPS.pagina, type: "rich_text" },
    { name: PROPS.label, type: "rich_text" },
    { name: PROPS.component, type: "rich_text" },
    { name: PROPS.bron, type: "rich_text" },
    { name: PROPS.antwoord, type: "rich_text" },
    { name: PROPS.pr, type: "url" },
  ];

  for (const { name, type } of required) {
    const prop = props[name];
    if (!prop) {
      problems.push(`Ontbrekende property: "${name}" (type ${type}).`);
    } else if (prop.type !== type) {
      problems.push(`Property "${name}" heeft type ${prop.type}, verwacht ${type}.`);
    }
  }

  // Optional: only a project with variants sends it, and then Notion refuses a page without it.
  const variantenProp = props[PROPS.varianten];
  if (!variantenProp) {
    process.stdout.write(
      `Let op: geen property "${PROPS.varianten}" (rich_text). Nodig zodra het project varianten heeft.\n`
    );
  } else if (variantenProp.type !== "rich_text") {
    problems.push(`Property "${PROPS.varianten}" heeft type ${variantenProp.type}, verwacht rich_text.`);
  }

  const statusProp = props[PROPS.status];
  if (statusProp?.type === "select") {
    const options = new Set(
      (statusProp.select?.options ?? []).map((o: { name: string }) => o.name)
    );
    for (const s of STATUSES) {
      if (!options.has(s)) problems.push(`Ontbrekende Status-optie: "${s}".`);
    }
  }

  if (problems.length === 0) {
    process.stdout.write("Notion-schema is in orde.\n");
    return true;
  }

  process.stdout.write("Notion-schema is niet compleet:\n");
  for (const p of problems) process.stdout.write(`  - ${p}\n`);
  return false;
}

/**
 * Verifies that GitHub Actions may open pull requests in this repo, via
 * `repos/{owner}/{repo}/actions/permissions/workflow`. Returns false only when
 * the setting is definitively off; a missing/failed `gh` call is treated as
 * "unknown" (reported, not failed), since the tooling may be absent in CI.
 */
function checkGithubPermissions(): boolean {
  const res = tryRun("gh", [
    "api",
    "repos/{owner}/{repo}/actions/permissions/workflow",
  ]);
  if (!res.ok) {
    process.stdout.write(
      "GitHub Actions-permissie niet gecontroleerd (gh niet beschikbaar, geen\n" +
        "auth, of geen repo). Controleer handmatig dat PR-creatie aanstaat.\n"
    );
    return true;
  }

  let data: { can_approve_pull_request_reviews?: boolean };
  try {
    data = JSON.parse(res.stdout);
  } catch {
    process.stdout.write("GitHub Actions-permissie: kon het antwoord niet lezen.\n");
    return true;
  }

  if (data.can_approve_pull_request_reviews) {
    process.stdout.write("GitHub Actions mag PR's aanmaken.\n");
    return true;
  }

  process.stdout.write(
    "GitHub Actions mag GEEN PR's aanmaken. Zet 'Allow GitHub Actions to create\n" +
      "and approve pull requests' aan (Settings → Actions → General → Workflow\n" +
      "permissions), of zet ORBIT_GH_TOKEN op een PAT.\n"
  );
  return false;
}
