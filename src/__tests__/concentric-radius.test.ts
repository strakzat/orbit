import { describe, expect, it } from "vitest";
import { concentricRadius } from "../utils/pick-element";

const all = (radius: string) => [radius, radius, radius, radius];

describe("concentricRadius", () => {
  it("adds the gap to a square element's corners", () => {
    expect(concentricRadius(all("0px"), 100, 40, 4)).toBe("4px 4px 4px 4px / 4px 4px 4px 4px");
  });

  it("adds the gap to each corner on its own", () => {
    expect(concentricRadius(["8px", "0px", "2px", "0px"], 100, 40, 4)).toBe(
      "12px 4px 6px 4px / 12px 4px 6px 4px"
    );
  });

  it("makes a circle of a 50% circle", () => {
    expect(concentricRadius(all("50%"), 40, 40, 4)).toBe("24px 24px 24px 24px / 24px 24px 24px 24px");
  });

  it("shrinks a pill's radius to what fits, as CSS does", () => {
    expect(concentricRadius(all("9999px"), 100, 32, 4)).toBe("20px 20px 20px 20px / 20px 20px 20px 20px");
  });

  it("keeps an ellipse an ellipse", () => {
    expect(concentricRadius(all("50%"), 100, 40, 4)).toBe("54px 54px 54px 54px / 24px 24px 24px 24px");
    expect(concentricRadius(all("10px 5px"), 100, 40, 4)).toBe("14px 14px 14px 14px / 9px 9px 9px 9px");
  });

  it("survives an empty box", () => {
    expect(concentricRadius(all("50%"), 0, 0, 4)).toBe("4px 4px 4px 4px / 4px 4px 4px 4px");
  });
});
