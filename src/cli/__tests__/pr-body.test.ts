import { describe, it, expect } from "vitest";
import type { FeedbackItem } from "../types";
import {
  renderPrBody,
  parsePrBody,
  parsePrMeta,
} from "../pr-body";

function item(overrides: Partial<FeedbackItem>): FeedbackItem {
  return {
    id: "00000000-0000-0000-0000-000000000000",
    project: "demo",
    annotationId: "#root > button",
    label: "<button> Export",
    pagina: "/dashboard",
    auteur: "Elwin",
    comment: "Knop moet rechts",
    component: "DashboardCard",
    bron: "src/DashboardCard.tsx:33",
    status: "In behandeling",
    antwoord: null,
    pr: "",
    varianten: "",
    aangemaakt: "2026-09-09T10:00:00.000Z",
    ...overrides,
  };
}

describe("pr-body render + parse round-trip", () => {
  const processed = [
    {
      item: item({ id: "11111111-1111-1111-1111-111111111111" }),
      shortSha: "abc1234",
      notes: ["Aangenomen dat de knop rechts uitlijnt met de tabel."],
    },
    {
      item: item({ id: "22222222-2222-2222-2222-222222222222" }),
      shortSha: "def5678",
      notes: [],
    },
  ];
  const notProcessed = [
    {
      item: item({ id: "33333333-3333-3333-3333-333333333333", comment: "Mooi!" }),
      reason: "Geen codewijziging nodig.",
    },
  ];

  const body = renderPrBody({
    project: "demo",
    date: "2026-09-09",
    base: "main",
    processed,
    notProcessed,
  });

  it("marks processed items checked and not-processed items unlisted as checkboxes", () => {
    const entries = parsePrBody(body);
    expect(entries).toEqual([
      { id: "11111111-1111-1111-1111-111111111111", checked: true },
      { id: "22222222-2222-2222-2222-222222222222", checked: true },
    ]);
  });

  it("detects an unchecked box after a human edit", () => {
    const edited = body.replace(
      "- [x] `22222222-2222-2222-2222-222222222222`",
      "- [ ] `22222222-2222-2222-2222-222222222222`"
    );
    const entries = parsePrBody(edited);
    expect(entries.find((e) => e.id.startsWith("2222"))?.checked).toBe(false);
    expect(entries.find((e) => e.id.startsWith("1111"))?.checked).toBe(true);
  });

  it("embeds machine-readable project/base metadata", () => {
    expect(parsePrMeta(body)).toEqual({ project: "demo", base: "main" });
  });

  it("renders a Kanttekeningen section for processed points that have notes", () => {
    expect(body).toContain("### Kanttekeningen van de bot");
    expect(body).toContain(
      "- `11111111-1111-1111-1111-111111111111` **Elwin**: Aangenomen dat de knop rechts uitlijnt met de tabel."
    );
    // A note line is not a checklist line, so parsing still yields two entries.
    expect(parsePrBody(body)).toHaveLength(2);
  });

  it("omits the Kanttekeningen section when no point has notes", () => {
    const plain = renderPrBody({
      project: "demo",
      date: "2026-09-09",
      base: "main",
      processed: [
        { item: item({ id: "44444444-4444-4444-4444-444444444444" }), shortSha: "aaa1111", notes: [] },
      ],
      notProcessed: [],
    });
    expect(plain).not.toContain("Kanttekeningen");
  });

  it("ignores prose the reviewer may add", () => {
    const withProse = body + "\n\nEeven bellen met de klant hierover.\n";
    expect(parsePrBody(withProse)).toHaveLength(2);
  });
});
