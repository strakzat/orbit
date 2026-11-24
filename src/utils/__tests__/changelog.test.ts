import { describe, expect, it } from "vitest";
import { changeCount, compareVersions, inlineParts, parseChangelog, plainText, unreadReleases } from "../changelog";

const FILE = `# Changelog

Intro with [Unreleased].

- **major**: not a change

## [Unreleased]

### In staging

- Hidden (\`switch\`).

## [1.1.0] - 2026-12-01

### Added

- One that wraps
  over two lines.
- Two
  - nested

### Internal

- Docs.

### Fixed

\`\`\`
## [9.9.9] - not a version
\`\`\`
* Three

## v1.0.0

- Without a section
  over a line

## [0.9.0](https://example.com) (2026-01-02)

### Internal

- Only this.

[Unreleased]: https://example.com
[1.1.0]: https://example.com
`;

describe("parseChangelog", () => {
  it("takes the released versions apart", () => {
    expect(parseChangelog(FILE)).toEqual([
      {
        version: "1.1.0",
        date: "2026-12-01",
        sections: [
          { title: "Added", entries: ["One that wraps over two lines.", "Two; nested"] },
          { title: "Fixed", entries: ["Three"] },
        ],
      },
      { version: "1.0.0", sections: [{ title: "", entries: ["Without a section over a line"] }] },
      { version: "0.9.0", date: "2026-01-02", sections: [] },
    ]);
  });

  it("reads Windows line endings, and nothing from nothing", () => {
    expect(parseChangelog(FILE.replace(/\n/g, "\r\n"))).toEqual(parseChangelog(FILE));
    expect(parseChangelog("")).toEqual([]);
  });
});

describe("what is not released", () => {
  it("is left out with a number, and behind an indented heading", () => {
    expect(parseChangelog("## [2.0.0] - Unreleased\n\n- a\n\n## 1.0.0\n\n- b")).toEqual([
      { version: "1.0.0", sections: [{ title: "", entries: ["b"] }] },
    ]);
    expect(parseChangelog("## 1.0.0\n\n- b\n\n ## [Unreleased]\n\n ### Added\n\n- a")).toEqual([
      { version: "1.0.0", sections: [{ title: "", entries: ["b"] }] },
    ]);
  });

  it.each([
    "## [2.0.0] - 2026-12-01 (Unreleased)",
    "## [2.0.0] - Unreleased (planned 2026-12-01)",
    "## [2.0.0][cmp] - Unreleased",
    "## 2.0.0 - **Unreleased**",
    "## 2.0.0 - _Unreleased_",
    "## [2.0.0] - Unreleased: beta",
    "## [2.0.0-unreleased]",
  ])("whatever the heading: %s", (heading) => {
    expect(parseChangelog(`${heading}\n\n- a`)).toEqual([]);
  });

  it("but a release whose link has the word is", () => {
    const [release] = parseChangelog("## [1.1.0](https://x/compare/a...unreleased) - 2026-01-01\n\n- a");
    expect(release).toMatchObject({ version: "1.1.0", date: "2026-01-01" });
  });

  it("nor is a line between versions a change", () => {
    expect(parseChangelog("## 1.1.0\n\n- a\n\n---\n\n## 1.0.0\n\n- b\n* * *").map(changeCount)).toEqual([1, 1]);
  });
});

describe("lists", () => {
  const entries = (body: string) => parseChangelog(`## 1.0.0\n\n${body}`)[0].sections[0].entries;

  it("may be indented, with nested items in their item", () => {
    expect(entries("  - a\n  - b\n    - c")).toEqual(["a", "b; c"]);
    expect(entries("- a\n\n  ---\n\n  - n")).toEqual(["a; n"]);
    expect(entries("- a\n\t- n")).toEqual(["a; n"]);
  });

  it("skip a longer fence, with a shorter one in it", () => {
    expect(entries("- a\n\n````md\n## 9.9.9\n```\n- leak\n````\n- b")).toEqual(["a", "b"]);
  });

  it("don't end at inline code in three backticks", () => {
    expect(entries("- a\n  ```x``` text\n- b")).toEqual(["a ```x``` text", "b"]);
  });
});

describe("anything else", () => {
  const read = (body: string) => {
    const skipped: number[] = [];
    const releases = parseChangelog(body, (line) => skipped.push(line));
    const shown = releases.flatMap((r) => r.sections.flatMap((s) => s.entries));
    return { shown, skipped };
  };
  const V = "## 1.0.0\n- a\n";

  it.each([
    ["### Unreleased\n- x", [3]],
    ["### Internal tooling\n- x", [3]],
    ["### **Internal**\n- x", [3]],
    ["### Constructor\n- x", [3]],
    ["### Internal\n- x\n#### More\n- x", [5]],
    ["### Internal\n- x\n  - x\n\n  x", []],
    ["\nUnreleased\n----------\n### Added\n- x", [4]],
    ["Unreleased\n===\n- x", [3]],
    ["\n**Unreleased**\n\n- x", [4]],
    [" Unreleased\n- x", [3]],
    ["## 2.0.0 - planned\n- x", [3]],
    ["## 2.0.0 - 2026-12-01 (planned)\n- x", [3]],
    ["## Version 2.0.0\n- x", [3]],
    ["# 2.0.0\n- x", [3]],
    ["<!--\n- x\n### Added\n-->", []],
    ["<!-- \n- x\n## 0.9.0\n- x", [3]],
    ["<!-- x --> <!-- x\n- x -->", []],
    ["```\n```js\n## 9.9.9\n- x\n```", [3]],
    ["- ```\n  x\n  ```", [3]],
    ["```\n- x", [3, 3]],
  ])("stays hidden: %j", (rest, lines) => {
    expect(read(V + rest)).toEqual({ shown: ["a"], skipped: lines });
  });

  it("is over at the next heading", () => {
    expect(read(`${V}Summary\n\n### Fixed\n- b\n## 0.9.0\n- c`).shown).toEqual(["a", "b", "c"]);
  });

  it("keeps a comment's marks in inline code, and the text around a comment", () => {
    expect(read("## 1.0.0\n- Escape `<!--` <!-- x -->well\n- b\n<!-- x -->").shown).toEqual([
      "Escape `<!--` well",
      "b",
    ]);
  });

  it("reads numbered lists, and a yanked version", () => {
    expect(read("## [1.0.0] - 2026-01-01 [YANKED]\n1. a\n2. b").shown).toEqual(["a", "b"]);
  });

  it("says nothing about a plain Keep a Changelog file", () => {
    expect(read(FILE.replace(/```[\s\S]*?```/, "")).skipped).toEqual([]);
  });
});

describe("compareVersions", () => {
  it("compares numbers, not text, and puts a pre-release first", () => {
    expect(compareVersions("1.10.0", "1.9.0")).toBeGreaterThan(0);
    expect(compareVersions("1.0", "1.0.0")).toBe(0);
    expect(compareVersions("1.0.0-beta.2", "1.0.0")).toBeLessThan(0);
    expect(compareVersions("1.0.0-beta.10", "1.0.0-beta.2")).toBeGreaterThan(0);
  });
});

describe("unreadReleases", () => {
  const releases = parseChangelog(FILE);
  const unread = (since: string, read: string[] = []) =>
    unreadReleases(releases, { since, read }).map((r) => r.version);

  it("has nothing new on a first visit or without storage", () => {
    expect(unread("1.1.0")).toEqual([]);
    expect(unreadReleases(releases, null)).toEqual([]);
  });
  it("has what came after, until it is read", () => {
    expect(unread("1.0.0")).toEqual(["1.1.0"]);
    expect(unread("1.0.0", ["1.1.0"])).toEqual([]);
    expect(changeCount(releases[0])).toBe(3);
  });
  it("leaves out a version with nothing to show, and survives a rollback", () => {
    expect(unread("0.8.0")).toEqual(["1.1.0", "1.0.0"]);
    expect(unread("2.0.0")).toEqual([]);
  });
});

describe("inlineParts", () => {
  it("reads code, bold and links, nested too", () => {
    expect(plainText("**The `x`** in [docs](https://a.b)")).toBe("The x in docs");
    expect(inlineParts("[docs](https://a.b)")[0]).toMatchObject({ type: "link", href: "https://a.b" });
  });
  it("keeps only the text of a link that isn't http(s), and HTML as text", () => {
    expect(inlineParts("[x](javascript:alert)")).toEqual([{ type: "text", text: "x" }]);
    expect(inlineParts("<b>x</b>")).toEqual([{ type: "text", text: "<b>x</b>" }]);
  });
});
