import type { CommentStatus } from "../types";
import { queryOpen, updateStatus, STATUSES } from "../notion";
import {
  DEFAULT_MANIFEST,
  DEFAULT_RESULTS,
  readManifest,
  readResults,
} from "../manifest";
import { type Args, flagStr, flagBool, fail } from "../util";

export async function statusCommand(args: Args): Promise<void> {
  const set = flagStr(args, "set") as CommentStatus;
  if (!set) fail("--set <Status> is verplicht.");
  if (!STATUSES.includes(set)) {
    fail(`Onbekende status "${set}". Geldig: ${STATUSES.join(", ")}.`);
  }

  const pr = flagStr(args, "pr");
  const antwoord = flagStr(args, "antwoord");

  // Release stale claims: In behandeling items older than N hours → set.
  const stale = flagStr(args, "stale");
  if (stale) {
    const hours = parseFloat(stale.replace(/h$/i, ""));
    if (!Number.isFinite(hours)) fail(`Ongeldige --stale waarde: ${stale}`);
    const project = flagStr(args, "project") || process.env.ORBIT_PROJECT || process.env.NOTION_PROJECT_ID || "";
    if (!project) fail("--project of ORBIT_PROJECT is verplicht bij --stale.");
    const cutoff = Date.now() - hours * 3600_000;
    const items = await queryOpen(project, ["In behandeling"]);
    const staleIds = items
      // Since the last edit, which is the claim: not since the feedback was written.
      .filter((i) => i.bewerkt && new Date(i.bewerkt).getTime() < cutoff)
      .map((i) => i.id);
    if (staleIds.length === 0) {
      process.stdout.write("Geen verlopen claims gevonden.\n");
      return;
    }
    await updateStatus(staleIds, set);
    process.stdout.write(`${staleIds.length} verlopen claim(s) → ${set}.\n`);
    return;
  }

  // Per-item reasons from results.json.
  if (flagBool(args, "from-results")) {
    const results = readResults(flagStr(args, "results", DEFAULT_RESULTS));
    const skipped = Object.entries(results).filter(([, r]) => r.skipped);
    for (const [id, r] of skipped) {
      await updateStatus([id], set, {
        antwoord: `Niet automatisch verwerkt: ${r.reason ?? "onbekende reden"}`,
      });
    }
    process.stdout.write(`${skipped.length} niet-verwerkt punt(en) → ${set}.\n`);
    return;
  }

  let ids: string[];
  if (flagBool(args, "from-manifest")) {
    const manifest = readManifest(flagStr(args, "manifest", DEFAULT_MANIFEST));
    ids = manifest.items.map((i) => i.id);
  } else {
    ids = args.positionals;
  }

  if (ids.length === 0) {
    process.stdout.write("Geen ids opgegeven; niets bijgewerkt.\n");
    return;
  }

  await updateStatus(ids, set, {
    ...(pr ? { pr } : {}),
    ...(antwoord ? { antwoord } : {}),
  });
  process.stdout.write(`${ids.length} punt(en) → ${set}.\n`);
}
