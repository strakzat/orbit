import { describe, expect, it } from "vitest";
import { relativeLuminance } from "../styles/brand";

describe("relativeLuminance", () => {
  it("reads #rgba and rgb() in percentages like their plain forms", () => {
    expect(relativeLuminance("#ff0f")).toBe(relativeLuminance("#ffff00"));
    expect(relativeLuminance("rgb(100%, 100%, 0%)")).toBeCloseTo(relativeLuminance("#ffff00")!, 5);
  });
});
