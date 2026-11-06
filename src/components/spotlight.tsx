import React, { useEffect, useState } from "react";
import { cx } from "../utils/cx";
import { componentOf, getElementLabel } from "../utils/element-id";
import { pickArea, ringRadius } from "../utils/pick-element";
import { ORBIT_UI_ATTR } from "../constants";
import { ComponentChip } from "./component-chip";

// The ring sits this far outside the element, so it never covers its edge.
const SPOTLIGHT_PAD = 4;
// The ring's width (`outline` in .orbit-spotlight-ring): the tag lines up with its outer edge.
const SPOTLIGHT_RING = 1;
// The tag's height and its gap to the ring (.orbit-spotlight__tag).
const SPOTLIGHT_TAG_HEIGHT = 30;
const TAG_MAX_WIDTH = 320;
// A ring on a small element is too narrow to read the tag by: past it, the tag gets this much.
const TAG_MIN_WIDTH = 180;
const TAG_MIN_WITH_COMPONENT = 280;
// Room the tag needs above or below the ring; with less on both sides, it goes inside.
const TAG_ROOM = 32;
// The tag's distance to the edge of the area, where it can't line up with the ring.
const TAG_EDGE = 6;
// How far the scrim's hole may lie outside the area: past its rounded corners, out of sight.
const HOLE_OVERSCAN = 32;

/**
 * Where the tag goes for `rect`, so it stays readable: above the ring, under it when there is
 * no room above, and with room on neither side (a tall element, or one scrolled out of view)
 * inside the area, at the top of what shows. `top` is relative to the area.
 */
function spotlightTag(rect: DOMRect): { side: "above" | "below" | "inside"; top: number } {
  const area = pickArea();
  const top = rect.top - area.top - SPOTLIGHT_PAD;
  const bottom = rect.bottom - area.top + SPOTLIGHT_PAD;
  if (top >= TAG_ROOM && top <= area.height) return { side: "above", top: top - SPOTLIGHT_RING };
  if (bottom >= 0 && bottom + TAG_ROOM <= area.height) {
    return { side: "below", top: bottom + SPOTLIGHT_RING };
  }
  return { side: "inside", top: Math.min(Math.max(top, 0), area.height - TAG_ROOM) };
}

/**
 * What the spotlight draws around `rect`: `box` is the ring, and the tag too when it sits outside
 * the ring; `foot` is the ring's bottom. The inspector's bubble hangs from them, so it never
 * covers the tag.
 */
export function spotlightAnchor(rect: DOMRect): { box: DOMRect; foot: number } {
  const out = SPOTLIGHT_PAD + SPOTLIGHT_RING;
  const { side } = spotlightTag(rect);
  const above = side === "above" ? SPOTLIGHT_TAG_HEIGHT : 0;
  const below = side === "below" ? SPOTLIGHT_TAG_HEIGHT : 0;
  return {
    box: new DOMRect(
      rect.left - out,
      rect.top - out - above,
      rect.width + out * 2,
      rect.height + out * 2 + above + below
    ),
    foot: rect.bottom + out,
  };
}

interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** `box`, in area coordinates, with what lies well outside the area cut off. */
function scrimHole(box: Box, area: DOMRect): Box {
  const clamp = (n: number, size: number) => Math.min(Math.max(n, -HOLE_OVERSCAN), size + HOLE_OVERSCAN);
  const left = clamp(box.left, area.width);
  const top = clamp(box.top, area.height);
  return {
    left,
    top,
    width: clamp(box.left + box.width, area.width) - left,
    height: clamp(box.top + box.height, area.height) - top,
  };
}

interface SpotlightProps {
  /** What is lit. Null keeps the layers, faded out, so the next element fades in. */
  el: HTMLElement | null;
  /** After the element's name in the tag: the inspector's `1/3 ↑↓`. */
  keys?: React.ReactNode;
  /** Holds still on its element rather than gliding to it: picked, or read in the panel. */
  still?: boolean;
}

/**
 * Radial's spotlight: the app dims, the element stays as it is, ringed in white, its name in a
 * tag above it. The inspector draws it while picking; the panel draws the same one for the card
 * under the mouse and the thread it has open, so "this one" looks the same everywhere. The
 * scrim is the shadow of the cutout, clipped to the frame, so the rail and the panel stay lit.
 */
export function Spotlight({ el, keys, still }: SpotlightProps) {
  // It follows its element through scrolling and resizing, once a frame at most. A scroll in
  // Orbit's own UI (the panel's list, a thread) moves nothing on the page.
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!el) return;
    let frame = 0;
    const update = (e: Event) => {
      if (e.target instanceof Element && e.target.closest(".orbit-root")) return;
      if (!frame) frame = requestAnimationFrame(() => {
        frame = 0;
        setTick((t) => t + 1);
      });
    };
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [el]);

  const rect = el?.isConnected ? el.getBoundingClientRect() : null;
  const area = pickArea();
  const framed = !!document.querySelector(".orbit-frame");
  const cutout = rect
    ? {
        left: rect.left - area.left - SPOTLIGHT_PAD,
        top: rect.top - area.top - SPOTLIGHT_PAD,
        width: rect.width + SPOTLIGHT_PAD * 2,
        height: rect.height + SPOTLIGHT_PAD * 2,
      }
    : null;
  // The hole in the scrim is the cutout, kept near the area: its shadow only reaches so far, and
  // an element scrolled far out of view would take the whole scrim with it.
  const hole = cutout ? scrimHole(cutout, area) : null;
  // A measurement, so it comes in as a variable: cutout and ring follow the element's own corners.
  const radius =
    el && cutout
      ? ({ "--orbit-spotlight-radius": ringRadius(el, SPOTLIGHT_PAD) } as React.CSSProperties)
      : undefined;
  const tag = rect ? spotlightTag(rect) : null;
  // In a component, the tag starts with its pill: a pill in the pill, before the element.
  const component = el && cutout ? componentOf(el) : null;
  const tagMin = component ? TAG_MIN_WITH_COMPONENT : TAG_MIN_WIDTH;
  // Lined up with the ring, unless that leaves it too little room at the right edge of the area.
  const tagLeft = cutout
    ? Math.max(Math.min(cutout.left - SPOTLIGHT_RING, area.width - tagMin - TAG_EDGE), TAG_EDGE)
    : 0;

  const scrim = React.createElement(
    "div",
    {
      key: "spotlight",
      [ORBIT_UI_ATTR]: "",
      "aria-hidden": true,
      className: cx(
        "orbit-root orbit-spotlight",
        framed && "orbit-spotlight--framed",
        !cutout && "orbit-spotlight--idle",
        still && "orbit-spotlight--selected"
      ),
      style: { left: area.left, top: area.top, width: area.width, height: area.height },
    },
    hole && React.createElement("div", { className: "orbit-spotlight__cutout", style: { ...hole, ...radius } }),
    cutout &&
      tag &&
      el &&
      React.createElement(
        "div",
        {
          className: cx(
            "orbit-spotlight__tag",
            tag.side !== "above" && "orbit-spotlight__tag--below",
            component && "orbit-spotlight__tag--component"
          ),
          style: {
            left: tagLeft,
            top: tag.top,
            // As wide as the ring it belongs to, the text ellipses instead; on a small element
            // or with a component's pill in front, wide enough that the name still reads.
            maxWidth: Math.min(
              TAG_MAX_WIDTH,
              area.width - tagLeft - TAG_EDGE,
              Math.max(cutout.width + SPOTLIGHT_RING * 2, tagMin)
            ),
          },
        },
        component && React.createElement(ComponentChip, { name: component.name }),
        React.createElement("span", { className: "orbit-spotlight__label" }, getElementLabel(el)),
        keys ? React.createElement("span", { className: "orbit-spotlight__keys" }, keys) : null
      )
  );

  // The ring is its own layer, outside the clipped scrim: a blend mode only mixes with
  // what shares its stacking context, and inside the scrim that would be the scrim alone.
  // Here it adds light to the page under it, so it glows on a dim edge and stays white
  // on a white one.
  const ring = React.createElement("div", {
    key: "ring",
    [ORBIT_UI_ATTR]: "",
    "aria-hidden": true,
    className: cx(
      "orbit-root orbit-spotlight-ring",
      framed && "orbit-spotlight-ring--framed",
      !cutout && "orbit-spotlight-ring--idle",
      still && "orbit-spotlight-ring--selected"
    ),
    style: cutout
      ? ({
          left: area.left + cutout.left,
          top: area.top + cutout.top,
          width: cutout.width,
          height: cutout.height,
          ...radius,
          // The frame, as seen from the ring: it can't sit in the clipped scrim, so it clips itself.
          "--orbit-ring-clip-top": `${-cutout.top}px`,
          "--orbit-ring-clip-left": `${-cutout.left}px`,
          "--orbit-ring-clip-right": `${cutout.left + cutout.width - area.width}px`,
          "--orbit-ring-clip-bottom": `${cutout.top + cutout.height - area.height}px`,
        } as React.CSSProperties)
      : undefined,
  });

  return React.createElement(React.Fragment, null, scrim, ring);
}
