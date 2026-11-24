import type { OrbitRelease } from "../types";

// "## [1.1.0] - 2026-12-01", "## 1.1.0", "## [1.1.0](https://…) (2026-12-01)".
const VERSION = /^ {0,3}##\s+\[?v?(\d+\.\d+(?:\.\d+)?(?:[-+][0-9A-Za-z.+-]+)?)(?=[\s\]]|$)(.*)$/;
const SECTION = /^ {0,3}###\s+(.+?)\s*#*$/;
// The status in a version's place for a date: "## [2.0.0] - Unreleased". Not a title that has the word.
const UNRELEASED = /^\]?(?:\([^)]*\))?\s*[-–—:]?\s*[[(]?unreleased[\])]?\s*#*\s*$/i;
// A line between versions: ---, ***, _ _ _.
const RULE = /^ {0,3}([-*_])(\s*\1){2,}\s*$/;
/** For what means nothing to who reads it on the page: docs, tooling. */
const INTERNAL = "internal";

/** A nested item or a next paragraph, folded into its item. */
function fold(text: string, more: string): string {
  return `${text}${/[.:;,!?]$/.test(text) ? " " : "; "}${more}`;
}

/**
 * A CHANGELOG.md in the Keep a Changelog format as data, in the file's order. Only released
 * versions: [Unreleased] is left out, so what isn't approved yet can't reach the page. A `###`
 * section called Internal is left out too. Items without a section, as in a plainer changelog, get
 * one without a title.
 */
export function parseChangelog(markdown: string): OrbitRelease[] {
  const releases: OrbitRelease[] = [];
  let release: OrbitRelease | null = null;
  let title = "";
  let entries: string[] | null = null;
  let fence: string | null = null;
  let blank = false;
  let inItem = false;
  let itemIndent = 0;

  const add = (text: string) => {
    if (!release) return;
    if (!entries) {
      let section = release.sections.find((s) => s.title === title);
      if (!section) release.sections.push((section = { title, entries: [] }));
      entries = section.entries;
    }
    entries.push(text.trim());
  };
  const amend = (change: (text: string) => string) => {
    if (entries?.length) entries[entries.length - 1] = change(entries[entries.length - 1]);
  };

  for (const raw of markdown.replace(/<!--[\s\S]*?-->/g, "").split(/\r?\n/)) {
    const line = raw.replace(/\t/g, "    ");
    const marker = /^\s*(?:(```)[^`]*$|(~~~))/.exec(line)?.[0].trim().slice(0, 3);
    if (fence || marker) {
      if (!fence) fence = marker!;
      else if (marker === fence) fence = null;
      continue;
    }
    if (!line.trim()) {
      blank = true;
      continue;
    }
    if (RULE.test(line)) {
      blank = true;
      if (/^\S/.test(line)) inItem = false;
      continue;
    }
    const afterBlank = blank;
    blank = false;

    if (/^ {0,3}#{1,2}\s/.test(line)) {
      // "## [2.0.0] - Unreleased" has its number already, and is not released for it.
      const found = VERSION.exec(line);
      const match = found && !UNRELEASED.test(found[2]) ? found : null;
      const date = match && /\d{4}-\d{2}-\d{2}/.exec(match[2])?.[0];
      release = match ? { version: match[1], ...(date ? { date } : {}), sections: [] } : null;
      if (release) releases.push(release);
      title = "";
      entries = null;
      inItem = false;
      continue;
    }
    if (/^ {0,3}#{3,}\s/.test(line)) {
      const section = SECTION.exec(line);
      if (section) {
        title = section[1];
        entries = null;
      }
      inItem = false;
      continue;
    }
    if (!release || title.toLowerCase() === INTERNAL || /^\[[^\]]+\]:\s/.test(line)) continue;

    const item = /^(\s*)[-*+]\s+(.+)$/.exec(line);
    // Nested is indented past its item's marker; a list may itself start indented.
    if (item && !(inItem && item[1].length >= itemIndent + 2)) {
      add(item[2]);
      itemIndent = item[1].length;
      inItem = true;
    } else if (item) {
      amend((text) => fold(text, item[2].trim()));
    } else if (inItem && /^\s/.test(line) && afterBlank) {
      amend((text) => fold(text, line.trim()));
    } else if (entries && !afterBlank) {
      amend((text) => `${text} ${line.trim()}`);
    } else {
      add(line);
      inItem = false;
    }
  }
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
