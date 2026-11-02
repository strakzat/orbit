import React, { useEffect, useState } from "react";
import { cx } from "../utils/cx";
import { componentOf, getElementLabel } from "../utils/element-id";
import { pickArea } from "../utils/pick-element";
import { ORBIT_UI_ATTR } from "../constants";
import { ComponentChip } from "./component-chip";

// The ring sits this far outside the element, so it never covers its edge.
const SPOTLIGHT_PAD = 4;
// The ring's width (`outline` in .orbit-spotlight-ring): the tag lines up with its outer edge.
const SPOTLIGHT_RING = 1;
// The tag's height and its gap to the ring (.orbit-spotlight__tag).
const SPOTLIGHT_TAG_HEIGHT = 30;
const TAG_MAX_WIDTH = 320;
const TAG_MIN_WITH_COMPONENT = 280;
// Room the tag needs above the ring; with less, it goes below.
const TAG_ROOM = 32;

/** Whether the tag goes under the ring around `rect`: there is no room above it. */
function spotlightTagBelow(rect: DOMRect): boolean {
  return rect.top - pickArea().top - SPOTLIGHT_PAD < TAG_ROOM;
}

/**
 * What the spotlight draws around `rect`: the ring, and the tag too when it sits under the ring.
 * The inspector's bubble hangs from it, so it never covers the tag.
 */
export function spotlightAnchor(rect: DOMRect): DOMRect {
  const out = SPOTLIGHT_PAD + SPOTLIGHT_RING;
  return new DOMRect(
    rect.left - out,
    rect.top - out,
    rect.width + out * 2,
    rect.height + out * 2 + (spotlightTagBelow(rect) ? SPOTLIGHT_TAG_HEIGHT : 0)
  );
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
  const tagBelow = !!rect && spotlightTagBelow(rect);
  // In a component, the tag starts with its pill: a pill in the pill, before the element.
  const component = el && cutout ? componentOf(el) : null;

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
    cutout && React.createElement("div", { className: "orbit-spotlight__cutout", style: cutout }),
    cutout &&
      el &&
      React.createElement(
        "div",
        {
          className: cx(
            "orbit-spotlight__tag",
            tagBelow && "orbit-spotlight__tag--below",
            component && "orbit-spotlight__tag--component"
          ),
          style: {
            left: cutout.left - SPOTLIGHT_RING,
            top: tagBelow ? cutout.top + cutout.height + SPOTLIGHT_RING : cutout.top - SPOTLIGHT_RING,
            // Never wider than the ring it belongs to, the text ellipses instead; with a
            // component's pill in front, wide enough that the element still reads beside it.
            maxWidth: Math.min(
              TAG_MAX_WIDTH,
              Math.max(cutout.width + SPOTLIGHT_RING * 2, component ? TAG_MIN_WITH_COMPONENT : 0)
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
      !cutout && "orbit-spotlight-ring--idle",
      still && "orbit-spotlight-ring--selected"
    ),
    style: cutout
      ? {
          left: area.left + cutout.left,
          top: area.top + cutout.top,
          width: cutout.width,
          height: cutout.height,
        }
      : undefined,
  });

  return React.createElement(React.Fragment, null, scrim, ring);
}
