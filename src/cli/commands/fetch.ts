import type { CommentStatus } from "../types";
import { queryOpen, updateStatus } from "../notion";
import { DEFAULT_MANIFEST, writeJson, type Manifest } from "../manifest";
import { type Args, flagStr, flagBool, fail } from "../util";

export async function fetchCommand(args: Args): Promise<void> {
  const project = flagStr(args, "project") || process.env.ORBIT_PROJECT || process.env.NOTION_PROJECT_ID || "";
  if (!project) fail("--project of ORBIT_PROJECT is verplicht.");

  const base = flagStr(args, "base", "main");
  const out = flagStr(args, "out", DEFAULT_MANIFEST);
  const statuses = (flagStr(args, "status", "Open")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean) as CommentStatus[]);

  const items = await queryOpen(project, statuses);

  const manifest: Manifest = {
    project,
    base,
    generatedAt: new Date().toISOString(),
    items,
  };
  writeJson(out, manifest);

  if (flagBool(args, "claim") && items.length > 0) {
    await updateStatus(
      items.map((i) => i.id),
      "In behandeling"
    );
  }

  // Markdown summary to stdout.
  const out_lines: string[] = [];
  out_lines.push(`# ${items.length} open feedbackpunt(en) — ${project}`);
  out_lines.push("");
  for (const item of items) {
    const where = [item.bron, item.component, item.pagina, item.label]
      .filter(Boolean)
      .join(" · ");
    out_lines.push(`- \`${item.id}\` **${item.auteur}**: "${item.comment}"`);
    if (where) out_lines.push(`  - ${where}`);
    if (item.annotationId) out_lines.push(`  - selector: \`${item.annotationId}\``);
    if (item.varianten) out_lines.push(`  - varianten: ${item.varianten.split("\n").join(" · ")}`);
  }
  process.stdout.write(out_lines.join("\n") + "\n");
}
