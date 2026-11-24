import type { OrbitRelease } from "../types";

/** Keep a Changelog's sections. Only these show: what isn't recognised isn't known to be for the page. */
export const CHANGE_SECTIONS = ["Added", "Changed", "Deprecated", "Removed", "Fixed", "Security"] as const;

const NUMBER = String.raw`v?(\d+\.\d+(?:\.\d+)?(?:[-+][0-9A-Za-z.+-]+)?)`;
// A heading's text: "[1.1.0] - 2026-12-01", "1.1.0", "[1.1.0](https://…) (2026-12-01)", and "[YANKED]"
// after it. Nothing else may follow: "- Unreleased", "(planned)" and a title all mean it may not be
// released. Matched on the heading's text with its whitespace collapsed.
const VERSION = new RegExp(
  String.raw`^(?:\[${NUMBER}\](?:\((?:https?:/|\.{0,2})/[^)\s]*\))?|${NUMBER})(?: ?[-–—]? ?\(?(\d{4}-\d{2}-\d{2})\)?)?(?: \[YANKED\])?$`,
  "i"
);
// "[Unreleased]", on its own or as a link.
const UNRELEASED = /^\[?unreleased\]?(?:\([^)]*\))?$/i;
// At any indent: in a list it would be an item's, which nothing here shows either.
const HEADING = /^\s*(#{1,6})(?:\s|$)/;
// A line between versions: ---, ***, _ _ _.
const RULE = /^([-*_])(?: ?\1){2,}$/;
const UNDERLINE = /^ {0,3}(=+|-+)\s*$/;
const ITEM = /^\s*((?:[-*+]|\d+[.)])\s)\s*(\S.*)$/;
const FENCE = /^\s*(?:(?:[-*+]|\d+[.)])\s+)?(?:(`{3,})[^`]*$|(~{3,}))/;
const INTERNAL = "internal";

/** A heading's level and text, its closing #s off and its whitespace collapsed. */
function readHeading(line: string): { level: number; name: string } | null {
  const marks = HEADING.exec(line)?.[1];
  if (!marks) return null;
  const words = line.trim().split(/\s+/).slice(1);
  if (words.length && /^#+$/.test(words[words.length - 1])) words.pop();
  return { level: marks.length, name: words.join(" ") };
}

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
 * hidden, up to the next heading. `onSkip` hears of every line hidden that wasn't meant to be (of a code
 * block, the first): [Unreleased] and `### Internal` are, and go without a word.
 */
export function parseChangelog(markdown: string, onSkip: SkippedLine = () => {}): OrbitRelease[] {
  const releases: OrbitRelease[] = [];
  let release: OrbitRelease | null = null;
  let title = "";
  let hidden = false;
  // What is hidden now is meant to be: the intro, [Unreleased], Internal.
  let quiet = true;
  let fence: string | null = null;
  let fenceIndent = 0;
  let fenceLine = 0;
  let inComment = false;
  let commentLine = 0;
  // Where the item's text starts: what is indented that far belongs to it.
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

  const lines = markdown.replace(/^\uFEFF/, "").split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].replace(/\t/g, "    ").trimEnd();
    const indent = line.length - line.trimStart().length;
    const skip = () => {
      if (!quiet) onSkip(i + 1, lines[i].trim());
    };

    // A heading in a block or a comment: perhaps that was never closed, and it is one. Nothing under
    // what was before it shows, then.
    const closedOver = () => {
      const level = readHeading(line)?.level;
      if (!level) return;
      hidden = true;
      if (level <= 2) release = null;
      quiet = releases.length === 0;
      itemIndent = null;
      skip();
    };

    if (fence) {
      // Only a bare run of the same kind, at least as long, ends it.
      const close = indent <= fenceIndent + 3 && /^\s*(`{3,}|~{3,})$/.exec(line)?.[1];
      closedOver();
      if (close && close[0] === fence[0] && close.length >= fence.length) fence = null;
      continue;
    }
    if (inComment) {
      closedOver();
      const end = line.indexOf("-->");
      if (end < 0) continue;
      inComment = false;
      line = line.slice(end + 3);
      if (!line.trim()) continue;
    }
    const opens = FENCE.exec(line);
    if (opens) {
      fence = opens[1] ?? opens[2];
      fenceIndent = indent;
      fenceLine = i;
      quiet = quiet && (!release || hidden);
      skip();
      continue;
    }
    // Comments go, also over several lines; `<!--` in inline code is text.
    const commented = line.replace(/\\.|(`+)(?!`).*?[^`]\1(?!`)|<!--(?:.*?-->|.*$)/g, (found) => {
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
    const heading = readHeading(line);
    if (heading) {
      const { level, name } = heading;
      loose = false;
      itemIndent = null;
      if (level <= 2) {
        const match = level === 2 && indent <= 3 ? VERSION.exec(name) : null;
        const version = match && (match[1] ?? match[2]);
        release =
          version && !/unreleased/i.test(version)
            ? { version, ...(match[3] ? { date: match[3] } : {}), sections: [] }
            : null;
        if (release) releases.push(release);
        title = "";
        hidden = false;
        // The file's own title, before any version, isn't a version gone wrong.
        const isTitle = level === 1 && releases.length === 0 && !/\d+\.\d+/.test(name);
        quiet = !release && (isTitle || UNRELEASED.test(name));
        if (!release) skip();
      } else if (release) {
        const known = level === 3 && CHANGE_SECTIONS.find((s) => s.toLowerCase() === name.toLowerCase());
        title = known || "";
        hidden = !known;
        quiet = hidden && name.toLowerCase() === INTERNAL;
        if (hidden) skip();
      } else skip();
      continue;
    }
    if (loose && UNDERLINE.test(line)) {
      // A heading after all, of something else than a version.
      release = null;
      loose = false;
      // Also under what was meant to be hidden: a version written this way is not.
      quiet = releases.length === 0;
      skip();
      continue;
    }
    const inItem = itemIndent !== null && indent >= itemIndent;
    if (!inItem && /^ {0,3}\[[^\]]+\]:\s/.test(line)) continue;
    if (RULE.test(line.trim().replace(/\s+/g, " "))) {
      if (indent === 0) itemIndent = null;
      continue;
    }

    const item = ITEM.exec(line);
    if (!item && !inItem) {
      // Not in a list: a pseudo-heading, or a summary. What follows may be about it.
      loose = true;
      itemIndent = null;
      if (release && !hidden) {
        hidden = true;
        quiet = false;
      }
      skip();
      continue;
    }
    loose = false;
    if (item && !inItem) itemIndent = indent + item[1].length;
    if (!release || hidden) skip();
    else if (item && !inItem) entries().push(item[2]);
    else if (item) amend((text) => fold(text, item[2]));
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
