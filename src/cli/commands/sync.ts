import { readFileSync } from "node:fs";
import { updateStatus } from "../notion";
import { listFeedbackCommits, liveFeedback, revert } from "../git";
import { parsePrBody, parsePrMeta } from "../pr-body";
import { type Args, flagStr, flagBool, fail, run } from "../util";

export async function syncCommand(args: Args): Promise<void> {
  const pr = flagStr(args, "pr");
  const bodyFile = flagStr(args, "body-file");

  let body: string;
  if (bodyFile) {
    body = readFileSync(bodyFile, "utf8");
  } else if (pr) {
    body = run("gh", ["pr", "view", pr, "--json", "body", "-q", ".body"]);
  } else {
    fail("--pr <nummer> of --body-file is verplicht.");
  }

  let merged = flagBool(args, "merged");
  if (!merged && !bodyFile && pr) {
    const state = run("gh", ["pr", "view", pr, "--json", "mergedAt", "-q", ".mergedAt"]);
    merged = state !== "" && state !== "null";
  }

  const entries = parsePrBody(body);
  if (entries.length === 0) {
    process.stdout.write("Geen feedback-checklist gevonden in de PR-body.\n");
    return;
  }

  const meta = parsePrMeta(body);
  const base = flagStr(args, "base", meta.base || "main");

  const commits = listFeedbackCommits(base);
  const live = liveFeedback(commits);

  const checked = new Set(entries.filter((e) => e.checked).map((e) => e.id));
  const unchecked = entries.filter((e) => !e.checked).map((e) => e.id);
  const uncheckedSet = new Set(unchecked);

  // Revert unchecked items that still have a live commit, newest first.
  const toRevert = commits.filter(
    (c) => c.feedbackId && uncheckedSet.has(c.feedbackId) && live.has(c.feedbackId)
  );

  const rejected: string[] = [];
  for (const commit of toRevert) {
    const result = revert(commit.sha, commit.feedbackId!);
    if (!result.ok) {
      fail(
        `Kon feedbackpunt ${commit.feedbackId} niet terugdraaien (${result.reason}). ` +
          `Los het handmatig op en push opnieuw.`
      );
    }
    rejected.push(commit.feedbackId!);
  }

  if (rejected.length > 0) {
    await updateStatus(rejected, "Afgewezen");
    process.stdout.write(`${rejected.length} punt(en) teruggedraaid → Afgewezen.\n`);
  }

  if (merged) {
    // Checked again after a revert: the change isn't in the code, so it isn't solved.
    const reverted = new Set(commits.map((c) => c.revertId));
    const resolved = [...checked].filter((id) => !reverted.has(id));
    for (const id of checked) {
      if (reverted.has(id)) {
        process.stdout.write(`Let op: ${id} is aangevinkt maar teruggedraaid; de status blijft staan.\n`);
      }
    }
    // Unchecked items without a live commit still need a final status.
    const alsoRejected = unchecked.filter((id) => !rejected.includes(id));
    if (resolved.length > 0) {
      await updateStatus(resolved, "Opgelost");
      process.stdout.write(`${resolved.length} punt(en) → Opgelost.\n`);
    }
    if (alsoRejected.length > 0) {
      await updateStatus(alsoRejected, "Afgewezen");
      process.stdout.write(`${alsoRejected.length} punt(en) → Afgewezen.\n`);
    }
  }

  if (rejected.length === 0 && !merged) {
    process.stdout.write("Niets te synchroniseren.\n");
  }
}
