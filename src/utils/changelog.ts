import type { OrbitRelease } from "../types";

/** Keep a Changelog's sections. Only these show: what isn't recognised isn't known to be for the page. */
export const CHANGE_SECTIONS = ["Added", "Changed", "Deprecated", "Removed", "Fixed", "Security"] as const;

// "## [1.1.0] - 2026-12-01", "## 1.1.0", "## [1.1.0](https://…) (2026-12-01)", and "[YANKED]" after it.
// Nothing else may follow: "- Unreleased", "(planned)" and a title all mean it may not be released.
const VERSION =
  /^ {0,3}##\s+\[?v?(\d+\.\d+(?:\.\d+)?(?:[-+][0-9A-Za-z.+-]+)?)\]?(?:\([^)\s]*\)|\[[^\]]*\])?(?:\s*[-–—]?\s*\(?(\d{4}-\d{2}-\d{2})\)?)?(?:\s*\[YANKED\])?\s*#*\s*$/i;
const HEADING = /^ {0,3}(#{1,6})\s+(.*?)\s*#*\s*$/;
// A line between versions: ---, ***, _ _ _.
const RULE = /^\s*([-*_])(\s*\1){2,}\s*$/;
const UNDERLINE = /^ {0,3}(=+|-+)\s*$/;
const ITEM = /^(\s*)(?:[-*+]|\d+[.)])\s+(.+)$/;
const FENCE = /^\s*(?:(?:[-*+]|\d+[.)])\s+)?(?:(`{3,})[^`]*$|(~{3,}))/;
const INTERNAL = "internal";

/** A nested item or a next paragraph, folded into its item. */
function fold(text: string, more: string): string {
  return `${text}${/[.:;,!?]$/.test(text) ? " " : "; "}${more}`;
}

/** Called with the line, counted from 1, and its text. */
export type SkippedLine = (line: number, text: string) => void;

/**
 * A CHANGELOG.md in the Keep a Changelog format as data, in the file's order. Strict, because what
 * isn't approved yet must not reach the page: only `## [version] - date` headings start a version,
 * only Keep a Changelog's sections and lists right under a version show, and anything else stays
 * hidden, up to the next heading. `onSkip` hears of what was hidden and not meant to be:
 * [Unreleased] and `### Internal` are, and go without a word.
 */
export function parseChangelog(markdown: string, onSkip: SkippedLine = () => {}): OrbitRelease[] {
  const releases: OrbitRelease[] = [];
  let release: OrbitRelease | null = null;
  let title = "";
  let hidden = false;
  let fence: string | null = null;
  let fenceLine = 0;
  let inComment = false;
  let commentLine = 0;
  let itemIndent: number | null = null;
  // Text that isn't in a list, on the line before: underlined it is a heading.
  let loose = false;

  const entries = () => {
    let section = release!.sections.find((s) => s.title === title);
    if (!section) release!.sections.push((section = { title, entries: [] }));
    return section.entries;
  };
  const amend = (change: (text: string) => string) => {
    const list = entries();
    list[list.length - 1] = change(list[list.length - 1]);
  };

  const lines = markdown.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].replace(/\t/g, "    ");
    const skip = () => onSkip(i + 1, lines[i].trim());

    if (fence) {
      // Only a bare run of the same kind, at least as long, ends it.
      const close = /^\s*(`{3,}|~{3,})\s*$/.exec(line)?.[1];
      if (close && close[0] === fence[0] && close.length >= fence.length) fence = null;
      continue;
    }
    if (inComment) {
      const end = line.indexOf("-->");
      if (end < 0) continue;
      inComment = false;
      line = line.slice(end + 3);
      if (!line.trim()) continue;
    }
    const opens = FENCE.exec(line);
    if (opens) {
      fence = opens[1] ?? opens[2];
      fenceLine = i;
      if (release && !hidden) skip();
      continue;
    }
    // Comments go, also over several lines; `<!--` in inline code is text.
    const commented = line.replace(/(`+)(?!`).*?[^`]\1(?!`)|<!--(?:.*?-->|.*$)/g, (found) => {
      if (!found.startsWith("<!--")) return found;
      if (!found.endsWith("-->")) {
        inComment = true;
        commentLine = i;
      }
      return "";
    });
    if (commented !== line && !commented.trim()) continue;
    line = commented;

    if (!line.trim()) {
      loose = false;
      continue;
    }
    const heading = HEADING.exec(line);
    if (heading) {
      loose = false;
      itemIndent = null;
      const level = heading[1].length;
      const name = heading[2];
      if (level <= 2) {
        const match = VERSION.exec(line);
        const isRelease = match && !/unreleased/i.test(match[1]);
        release = isRelease ? { version: match[1], ...(match[2] ? { date: match[2] } : {}), sections: [] } : null;
        if (release) releases.push(release);
        else if (!/unreleased/i.test(name) && (level === 2 || /\d+\.\d+/.test(name))) skip();
        title = "";
        hidden = false;
      } else if (release) {
        const known = level === 3 && CHANGE_SECTIONS.find((s) => s.toLowerCase() === name.toLowerCase());
        title = known || "";
        hidden = !known;
        if (!known && name.toLowerCase() !== INTERNAL) skip();
      }
      continue;
    }
    if (loose && UNDERLINE.test(line)) {
      // A heading after all, of something else than a version.
      release = null;
      loose = false;
      continue;
    }
    if (!release || /^ {0,3}\[[^\]]+\]:\s/.test(line)) continue;
    if (RULE.test(line)) {
      if (/^\S/.test(line)) itemIndent = null;
      continue;
    }

    const indent = line.length - line.trimStart().length;
    const inItem = itemIndent !== null && indent >= itemIndent + 2;
    const item = ITEM.exec(line);
    if (!item && !inItem) {
      // Not in a list: a pseudo-heading, or a summary. What follows may be about it.
      loose = true;
      itemIndent = null;
      if (!hidden) skip();
      hidden = true;
      continue;
    }
    loose = false;
    if (item && !inItem) itemIndent = indent;
    if (hidden) continue;
    if (item && !inItem) entries().push(item[2].trim());
    else if (item) amend((text) => fold(text, item[2].trim()));
    else if (!lines[i - 1]?.trim()) amend((text) => fold(text, line.trim()));
    else amend((text) => `${text} ${line.trim()}`);
  }
  if (fence) onSkip(fenceLine + 1, "a code block that never ends: all after it is left out");
  if (inComment) onSkip(commentLine + 1, "a comment that never ends: all after it is left out");
  return releases;
}

/** Below zero when `a` is the older version. A pre-release comes before its release. */
export function compareVersions(a: string, b: string): number {
  const split = (v: string) => {
    const [core, ...pre] = v.split("+")[0].split("-");
    return { core: core.split(".").map(Number), pre: pre.join("-") };
  };
  const x = split(a);
  const y = split(b);
  for (let i = 0; i < 3; i++) {
    const diff = (x.core[i] ?? 0) - (y.core[i] ?? 0);
    if (diff) return diff;
  }
  if (!x.pre || !y.pre) return (x.pre ? 0 : 1) - (y.pre ? 0 : 1);
  return x.pre.localeCompare(y.pre, "en", { numeric: true });
}

export function changeCount(release: OrbitRelease): number {
  return release.sections.reduce((sum, section) => sum + section.entries.length, 0);
}

/** What a viewer has read: everything up to `since`, and the later versions they opened. */
export interface ReadChanges {
  since: string;
  read: string[];
}

/** The versions that are new to the viewer; without anything to compare with, none are. */
export function unreadReleases(releases: OrbitRelease[], state: ReadChanges | null): OrbitRelease[] {
  if (!state) return [];
  return releases.filter(
    (r) => changeCount(r) > 0 && compareVersions(r.version, state.since) > 0 && !state.read.includes(r.version)
  );
}

export type InlinePart =
  | { type: "text" | "code"; text: string }
  | { type: "bold"; parts: InlinePart[] }
  | { type: "link"; href: string; parts: InlinePart[] };

// The three things a change is written with: `code`, **bold** and [a link](https://…).
const INLINE = /`([^`]+)`|\*\*(.+?)\*\*|\[([^\]]+)\]\(([^)\s]+)\)/g;

/** A change's inline markdown. Anything else stays text; a link that isn't http(s) keeps only its text. */
export function inlineParts(text: string): InlinePart[] {
  const parts: InlinePart[] = [];
  let at = 0;
  for (const match of Array.from(text.matchAll(INLINE))) {
    const index = match.index ?? 0;
    if (index > at) parts.push({ type: "text", text: text.slice(at, index) });
    if (match[1] !== undefined) parts.push({ type: "code", text: match[1] });
    else if (match[2] !== undefined) parts.push({ type: "bold", parts: inlineParts(match[2]) });
    else if (/^https?:\/\//i.test(match[4])) parts.push({ type: "link", href: match[4], parts: inlineParts(match[3]) });
    else parts.push(...inlineParts(match[3]));
    at = index + match[0].length;
  }
  if (at < text.length) parts.push({ type: "text", text: text.slice(at) });
  return parts;
}

/** The same without the markup, for a card's preview. */
export function plainText(text: string): string {
  const flat = (parts: InlinePart[]): string =>
    parts.map((p) => ("parts" in p ? flat(p.parts) : p.text)).join("");
  return flat(inlineParts(text));
}
