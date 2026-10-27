import { describe, expect, it } from "vitest";
import { LABELS, fill, resolveLabels } from "../labels";

describe("resolveLabels", () => {
  it("gives a language's own labels without overrides", () => {
    expect(resolveLabels("en").formSubmit).toBe("Send");
    expect(resolveLabels("nl").formSubmit).toBe("Verstuur");
  });

  it("lays flat overrides over every language", () => {
    expect(resolveLabels("nl", { rail: "Studio" }).rail).toBe("Studio");
    expect(resolveLabels("en", { rail: "Studio" }).rail).toBe("Studio");
  });

  it("takes overrides keyed by language for that language only", () => {
    const overrides = { nl: { rail: "Werkplaats" }, en: { rail: "Workshop" } };
    expect(resolveLabels("nl", overrides).rail).toBe("Werkplaats");
    expect(resolveLabels("en", overrides).rail).toBe("Workshop");
    expect(resolveLabels("en", { nl: { rail: "Werkplaats" } }).rail).toBe("Orbit");
  });
});

describe("LABELS", () => {
  it("has every key in every language", () => {
    expect(Object.keys(LABELS.en).sort()).toEqual(Object.keys(LABELS.nl).sort());
  });
});

describe("fill", () => {
  it("fills in the placeholders it is given and leaves the rest", () => {
    expect(fill("{count} open feedback", { count: 2 })).toBe("2 open feedback");
    expect(fill("Feedback van {name} op {label}", { name: "Elwin" })).toBe("Feedback van Elwin op {label}");
  });
});
