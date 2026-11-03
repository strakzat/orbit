import type { MarkerPosition } from "../types";

/** Visible badge diameter — see `.orbit-marker` in src/styles/rules.ts. */
export const BADGE_SIZE = 26;

const RADIUS = BADGE_SIZE / 2;

/** The angle at the tip of the tail: square, so it reads as a pin rather than a needle. */
const TAIL_TIP_ANGLE = 90;

/** How far from the badge's centre the tip reaches. Below RADIUS / sin(45°) ≈ 18.4, where the
    tail's sides would only touch the circle (the teardrop): just under it, they cut into it, and
    the tail is recessed, with a small notch on both sides where it meets the circle. */
const TAIL_REACH = 17.8;

/** How far the tip sits outside the badge's box, past both of its edges. */
const TIP_OUT = TAIL_REACH / Math.SQRT2 - RADIUS;

/** How far into the element the tip goes: pinned on it, not floating beside it. */
const TIP_INSET = 3;

/** Clearance a pin keeps from the edge of the window before it turns around. */
const EDGE_MARGIN = 4;

/** The way a pin's tail points: towards the spot it is pinned to. */
export type PinTail = "bottom-left" | "bottom-right" | "top-left" | "top-right";

const TAIL_ANGLE: Record<PinTail, number> = {
  "bottom-right": 45,
  "bottom-left": 135,
  "top-left": 225,
  "top-right": 315,
};

function at(deg: number, d: number): [number, number] {
  return [
    RADIUS + d * Math.cos((deg * Math.PI) / 180),
    RADIUS + d * Math.sin((deg * Math.PI) / 180),
  ];
}

function pinPath(tail: PinTail): string {
  // A little before the tip on either side, so the tip is rounded by a curve through it.
  const toward = (a: [number, number], b: [number, number], t: number): [number, number] => {
    const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
    return [a[0] + ((b[0] - a[0]) / length) * t, a[1] + ((b[1] - a[1]) / length) * t];
  };
  const f = (p: [number, number]) => p.map((n) => +n.toFixed(2)).join(" ");

  const angle = TAIL_ANGLE[tail];
  const tip = at(angle, TAIL_REACH);
  // Where each side, leaving the tip at half the tip angle off the way back to the centre, first
  // meets the circle: the nearer root of |tip + t·u − centre| = RADIUS.
  const half = ((TAIL_TIP_ANGLE / 2) * Math.PI) / 180;
  const reach = TAIL_REACH * Math.cos(half);
  const t = reach - Math.sqrt(reach * reach - TAIL_REACH * TAIL_REACH + RADIUS * RADIUS);
  const side = (sign: number): [number, number] => {
    const a = ((angle + 180) * Math.PI) / 180 + sign * half;
    return [tip[0] + t * Math.cos(a), tip[1] + t * Math.sin(a)];
  };
  const start = side(1);
  const end = side(-1);

  return (
    `M${f(start)}L${f(toward(tip, start, 1.2))}Q${f(tip)} ${f(toward(tip, end, 1.2))}` +
    `L${f(end)}A${RADIUS} ${RADIUS} 0 1 1 ${f(start)}Z`
  );
}

/** The outline of a pin in the badge's own 26×26 box: a circle with its tail, one per direction. */
export const PIN_PATHS: Record<PinTail, string> = {
  "bottom-left": pinPath("bottom-left"),
  "bottom-right": pinPath("bottom-right"),
  "top-left": pinPath("top-left"),
  "top-right": pinPath("top-right"),
};

/** A pin that is attached to nothing: the circle alone. */
export const CIRCLE_PATH =
  `M${RADIUS} 0A${RADIUS} ${RADIUS} 0 1 1 ${RADIUS} ${BADGE_SIZE}` +
  `A${RADIUS} ${RADIUS} 0 1 1 ${RADIUS} 0Z`;

/**
 * Where a pin goes on an element in the fixed layer: its tip on the top-right corner,
 * the badge above and to the right of it, the tail pointing down and to the left. Where
 * there is no room for that, the badge turns: below the corner if the element is at the top
 * of the window, to the left of it if the element is at the right edge.
 */
export function pinOnCorner(rect: DOMRect): { left: number; top: number; tail: PinTail } {
  const x = rect.right - TIP_INSET;
  const y = rect.top + TIP_INSET;
  const above = y - TIP_OUT - BADGE_SIZE >= EDGE_MARGIN;
  const right = x + TIP_OUT + BADGE_SIZE <= window.innerWidth - EDGE_MARGIN;

  return {
    left: right ? x + TIP_OUT : x - TIP_OUT - BADGE_SIZE,
    top: above ? y - TIP_OUT - BADGE_SIZE : y + TIP_OUT,
    tail: `${above ? "bottom" : "top"}-${right ? "left" : "right"}` as PinTail,
  };
}

/** Where a badge goes beside a pin that already sits on the element: on the side its tail
    points to, over the element, so it does not read as the neighbour's. Level with the pin's
    head. Beside a parked badge, to its right. */
export function besidePin(pin: { left: number; top: number; tail?: PinTail }) {
  const toward = pin.tail?.endsWith("left") ? -BADGE_GAP : BADGE_GAP;
  return { left: pin.left + toward, top: pin.top };
}

/**
 * Distance between an annotation badge and the feedback badge beside it. Wide
 * enough that the 40px hit areas (the badge plus its 6px pseudo-element) of two
 * interactive badges never touch.
 */
export const BADGE_GAP = BADGE_SIZE + 14;

/**
 * How tall a popover may get before it starts scrolling. Generous on purpose: an
 * annotation plus a comment thread plus the submit form runs to roughly 600px, and
 * a scrollbar inside a popover is worse than a tall popover. The real cap is the
 * viewport — popover-position.ts clamps to the space that is actually there.
 */
export const POPOVER_MAX_HEIGHT = 720;

/** Inset of the column of unplaced badges from the top-left of the viewport. */
export const UNPLACED_INSET = 16;

// Same spacing as BADGE_GAP, for the same reason: 26px badges with a 6px hit-area
// ring need 40px of clearance or two neighbours become one ambiguous target.
const UNPLACED_STEP = BADGE_GAP;

/**
 * Where a badge goes when its annotation has no element on the page — a `global`
 * target, or an element that is not rendered right now. They stack down the
 * left edge so every annotation is reachable from the interface rather than only
 * from the panel. Returns the same shape as getBoundingClientRect so the popover
 * positioning can anchor to it.
 */
export function unplacedBadgeRect(index: number): DOMRect {
  const left = UNPLACED_INSET;
  const top = UNPLACED_INSET + index * UNPLACED_STEP;

  return {
    x: left,
    y: top,
    left,
    top,
    right: left + BADGE_SIZE,
    bottom: top + BADGE_SIZE,
    width: BADGE_SIZE,
    height: BADGE_SIZE,
    toJSON: () => ({}),
  } as DOMRect;
}

// From the wrapper's edge to the badge's near edge, with the tip just inside the corner.
const OUTSIDE = TIP_INSET - TIP_OUT - BADGE_SIZE;

/**
 * Placement for a pin inside an AnnotationMarker wrapper: the tip on the chosen corner, the
 * badge outside it, diagonally away from the element.
 */
export const MARKER_CORNERS: Record<MarkerPosition, React.CSSProperties> = {
  "top-right": { top: OUTSIDE, right: OUTSIDE },
  "top-left": { top: OUTSIDE, left: OUTSIDE },
  "bottom-right": { bottom: OUTSIDE, right: OUTSIDE },
  "bottom-left": { bottom: OUTSIDE, left: OUTSIDE },
};

/** The box of the pin MARKER_CORNERS puts on a corner of `rect`, in the window. */
export function pinBoxAtCorner(rect: DOMRect, corner: MarkerPosition): DOMRect {
  const left = corner.endsWith("right") ? rect.right - OUTSIDE - BADGE_SIZE : rect.left + OUTSIDE;
  const top = corner.startsWith("top") ? rect.top + OUTSIDE : rect.bottom - OUTSIDE - BADGE_SIZE;
  return new DOMRect(left, top, BADGE_SIZE, BADGE_SIZE);
}

/** A pin on a corner points back into the element: the opposite way. */
export const CORNER_TAIL: Record<MarkerPosition, PinTail> = {
  "top-right": "bottom-left",
  "top-left": "bottom-right",
  "bottom-right": "top-left",
  "bottom-left": "top-right",
};
