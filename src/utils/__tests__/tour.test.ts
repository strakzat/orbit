import { describe, expect, it } from "vitest";
import { LABELS } from "../../labels";
import { tourCardPosition, tourSample, tourSteps } from "../tour";

const labels = LABELS.nl;
const viewport = { width: 1000, height: 700 };
const card = { width: 340, height: 200 };

describe("tourSteps", () => {
  it("has everything for a project with variants and comments", () => {
    expect(tourSteps({ hasVariants: true, hasComments: true })).toEqual([
      "welcome", "pins", "feedback", "panel", "variants", "profile",
    ]);
  });

  it("skips what the project doesn't have", () => {
    expect(tourSteps({ hasVariants: false, hasComments: true })).not.toContain("variants");
    expect(tourSteps({ hasVariants: true, hasComments: false })).not.toContain("feedback");
    expect(tourSteps({ hasVariants: false, hasComments: false })).toEqual([
      "welcome", "pins", "panel", "profile",
    ]);
  });
});

describe("tourSample", () => {
  const anchor = { locator: "#a", label: "<h1> A" };
  const other = { locator: "#b", label: "<p> B" };

  it("has nothing until the anchors are known", () => {
    expect(tourSample({ labels, route: "/", anchors: null, comments: true })).toEqual({
      annotations: [],
      comments: [],
    });
  });

  it("puts the annotation and the feedback on separate elements", () => {
    const { annotations, comments } = tourSample({
      labels, route: "/x", anchors: [anchor, other], comments: true,
    });
    expect(annotations[0].elementId).toBe("#a");
    expect(comments.map((c) => c.annotationId)).toEqual([annotations[0].id, "#b"]);
    expect(comments.every((c) => c.pagina === "/x")).toBe(true);
    expect(comments[1].antwoord).toBe(labels.tourSampleAnswer);
  });

  it("gives feedback its own thread on a page with one element", () => {
    const { annotations, comments } = tourSample({ labels, route: "/", anchors: [anchor], comments: true });
    expect(comments[1].annotationId).toBe("#a");
    expect(comments[1].annotationId).not.toBe(annotations[0].id);
  });

  it("parks both on a page with no element to sit on", () => {
    const { annotations, comments } = tourSample({ labels, route: "/", anchors: [], comments: true });
    expect(annotations[0].elementId).toBeUndefined();
    expect(comments[1].annotationId).not.toBe(annotations[0].id);
  });

  it("is only the annotation without comments", () => {
    const { annotations, comments } = tourSample({ labels, route: "/", anchors: [anchor], comments: false });
    expect(annotations).toHaveLength(1);
    expect(comments).toEqual([]);
  });
});

describe("tourCardPosition", () => {
  const area = { left: 0, top: 0, width: 1000, height: 640 };

  it("centres in the area", () => {
    expect(tourCardPosition({ at: "center", area }, card, viewport)).toEqual({ left: 330, top: 220 });
  });

  it("goes in the area's foot on the left", () => {
    expect(tourCardPosition({ at: "corner", area }, card, viewport)).toEqual({ left: 16, top: 424 });
  });

  it("stands above a button, centred on it", () => {
    const target = { left: 400, top: 650, width: 100, bottom: 690 };
    expect(tourCardPosition({ at: "above", target }, card, viewport)).toEqual({ left: 280, top: 438 });
  });

  it("stays in the window at both edges", () => {
    const right = { left: 950, top: 650, width: 40, bottom: 690 };
    const left = { left: 10, top: 650, width: 40, bottom: 690 };
    expect(tourCardPosition({ at: "above", target: right }, card, viewport).left).toBe(644);
    expect(tourCardPosition({ at: "above", target: left }, card, viewport).left).toBe(16);
  });

  it("stands left of a panel, level with its foot", () => {
    const target = { left: 560, top: 100, width: 420, bottom: 620 };
    expect(tourCardPosition({ at: "left", target }, card, viewport)).toEqual({ left: 208, top: 420 });
  });
});
