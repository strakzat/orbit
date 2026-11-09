import { ORBIT_UI_ATTR } from "../constants";
import { getElementLabel, getLocator } from "./element-id";
import { levelsFrom, pickArea } from "./pick-element";
import type { Annotation, AnnotationLabels, Comment, TourStepId } from "../types";

/** Something on the page a sample sits on. */
export interface TourAnchor {
  locator: string;
  label: string;
}

const ANNOTATION_ID = "orbit-tour-annotation";
/** The feedback's id when the page offers no second element: it parks, as lost feedback does. */
const FEEDBACK_ID = "orbit-tour-feedback";

/** Where the page is served from this machine: a dev server, a preview build, a test. */
export function isLocalHost(hostname: string): boolean {
  return ["localhost", "127.0.0.1", "[::1]", "::1"].includes(hostname) || hostname.endsWith(".localhost");
}

/**
 * Whether the tour starts by itself for a viewer who has not seen it. Set by the project, as it says;
 * left out, everywhere but on a local host, where a fresh browser (a Playwright run, a screenshot
 * script, an agent) would meet it every time and its overlay takes the clicks.
 */
export function startsTour(tour: boolean | undefined, hostname: string): boolean {
  return tour ?? !isLocalHost(hostname);
}

/** The steps for what this project has. Step 1 is always the welcome card, the last the profile. */
export function tourSteps({ hasVariants, hasComments }: { hasVariants: boolean; hasComments: boolean }): TourStepId[] {
  return [
    "welcome",
    "pins",
    ...(hasComments ? (["feedback"] as const) : []),
    "panel",
    ...(hasVariants ? (["variants"] as const) : []),
    "profile",
  ];
}

interface TourSampleOptions {
  labels: AnnotationLabels;
  route: string;
  /** What the samples sit on; empty parks them, null is not yet known. */
  anchors: TourAnchor[] | null;
  /** Whether the project has feedback: without it, the annotation alone. */
  comments: boolean;
  now?: Date;
}

/** An annotation with a question in its thread, and feedback elsewhere with an answer. */
export function tourSample({ labels, route, anchors, comments, now = new Date() }: TourSampleOptions): {
  annotations: Annotation[];
  comments: Comment[];
} {
  if (!anchors) return { annotations: [], comments: [] };

  const author = labels.tourSampleAuthor;
  const [first, second = first] = anchors;
  const annotation: Annotation = {
    id: ANNOTATION_ID,
    target: "global",
    elementId: first?.locator,
    title: labels.tourSampleTitle,
    body: labels.tourSampleBody,
    author,
    date: now.toISOString().slice(0, 10),
    type: "documentation",
  };
  if (!comments) return { annotations: [annotation], comments: [] };

  const hoursAgo = (hours: number) => new Date(now.getTime() - hours * 3_600_000).toISOString();
  return {
    annotations: [annotation],
    comments: [
      {
        id: "orbit-tour-question",
        annotationId: ANNOTATION_ID,
        auteur: author,
        comment: labels.tourSampleQuestion,
        status: "Open",
        antwoord: null,
        aangemaakt: hoursAgo(2),
        pagina: route,
        label: labels.tourSampleTitle,
      },
      {
        id: "orbit-tour-comment",
        annotationId: second?.locator ?? FEEDBACK_ID,
        auteur: author,
        comment: labels.tourSampleComment,
        status: "In behandeling",
        antwoord: labels.tourSampleAnswer,
        aangemaakt: hoursAgo(5),
        pagina: route,
        label: second?.label ?? labels.tourSampleTitle,
      },
    ],
  };
}

// Big enough for a pin on its corner to look like it belongs to the element.
const MIN_WIDTH = 120;
const MIN_HEIGHT = 32;
// Where to look in the area, as fractions of it: the middle first, where the pins are in view.
const PROBES: [number, number][] = [[0.5, 0.4], [0.3, 0.6], [0.7, 0.6], [0.3, 0.25], [0.7, 0.25]];

/** Up to two separate elements of the project near the middle of what's in view. */
export function tourAnchors(): TourAnchor[] {
  const area = pickArea();
  const found: HTMLElement[] = [];
  for (const [x, y] of PROBES) {
    if (found.length === 2) break;
    const hit = document
      .elementsFromPoint(area.left + area.width * x, area.top + area.height * y)
      .find(
        (el): el is HTMLElement =>
          el instanceof HTMLElement && !el.closest(`.orbit-root, [${ORBIT_UI_ATTR}]`)
      );
    if (!hit) continue;
    const levels = levelsFrom(hit);
    const el =
      levels.find((level) => {
        const rect = level.getBoundingClientRect();
        return rect.width >= MIN_WIDTH && rect.height >= MIN_HEIGHT;
      }) ?? levels[0];
    if (el && !found.some((other) => other.contains(el) || el.contains(other))) found.push(el);
  }
  return found.map((el) => ({ locator: getLocator(el), label: getElementLabel(el) }));
}

/** A token's `#RRGGBB` as a shader takes it: 0 to 1 a channel. White for anything else. */
export function hexToRgb(hex: string): [number, number, number] {
  const match = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex.trim());
  if (!match) return [1, 1, 1];
  return [parseInt(match[1], 16) / 255, parseInt(match[2], 16) / 255, parseInt(match[3], 16) / 255];
}

const EDGE = 16;
// Past the ring and the first of the corona around what the card points at.
const GAP = 22;

interface Size {
  width: number;
  height: number;
}

/** The tour's card next to what it explains, always wholly in the window. */
export function tourCardPosition(
  place:
    | { at: "center" | "corner"; area: Pick<DOMRect, "left" | "top" | "width" | "height"> }
    | { at: "above" | "left"; target: Pick<DOMRect, "left" | "top" | "width" | "bottom"> },
  card: Size,
  viewport: Size
): { left: number; top: number } {
  let left: number;
  let top: number;
  if ("area" in place) {
    const { area } = place;
    left = place.at === "center" ? area.left + (area.width - card.width) / 2 : area.left + EDGE;
    top =
      place.at === "center"
        ? area.top + (area.height - card.height) / 2
        : area.top + area.height - card.height - EDGE;
  } else if (place.at === "left") {
    left = place.target.left - card.width - GAP;
    top = place.target.bottom - card.height;
  } else {
    left = place.target.left + place.target.width / 2 - card.width / 2;
    top = place.target.top - card.height - GAP;
  }
  return {
    left: Math.max(EDGE, Math.min(left, viewport.width - card.width - EDGE)),
    top: Math.max(EDGE, Math.min(top, viewport.height - card.height - EDGE)),
  };
}
