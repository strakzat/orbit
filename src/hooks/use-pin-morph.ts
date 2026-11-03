import { useLayoutEffect } from "react";

const MORPH_IN_MS = 240;
// Leaving is quicker than arriving: the viewer is already done with it.
const MORPH_OUT_MS = 180;
// The content fades in once the shape has mostly grown, and out before it shrinks.
const CONTENT_IN_DELAY_MS = 90;
const CONTENT_IN_MS = 150;
const CONTENT_OUT_MS = 90;
// The clip at rest reaches past the panel, so it never cuts its shadow; the panel's own
// radius rounds it. A radius this large keeps the clip from cutting the panel's corners.
const OPEN_CLIP = "inset(-48px round 64px)";

function pinOf(pinId: string): HTMLElement | null {
  return document.querySelector<HTMLElement>(`.orbit-marker[data-orbit-pin="${CSS.escape(pinId)}"]`);
}

/**
 * The popover as its pin: a circle as big as the pin's head, on the pin, cut from the corner
 * of the popover nearest it. From there it grows into the panel while it travels. The insets
 * are relative to the panel, which can still grow while it opens (its comments come in).
 */
function pinFrame(box: DOMRect, pin: DOMRect): Keyframe {
  const size = Math.min(pin.width, pin.height);
  const right = pin.left + pin.width / 2 > box.left + box.width / 2;
  const below = pin.top + pin.height / 2 > box.top + box.height / 2;
  const rest = `calc(100% - ${size}px)`;
  const x = right ? box.right - size : box.left;
  const y = below ? box.bottom - size : box.top;
  return {
    transform: `translate(${pin.left - x}px, ${pin.top - y}px)`,
    clipPath:
      `inset(${below ? rest : "0px"} ${right ? "0px" : rest} ${below ? "0px" : rest} ` +
      `${right ? rest : "0px"} round ${size / 2}px)`,
  };
}

const OPEN_FRAME: Keyframe = { transform: "translate(0px, 0px)", clipPath: OPEN_CLIP };

function reducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function easing(el: HTMLElement): string {
  return getComputedStyle(el).getPropertyValue("--orbit-ease").trim() || "ease-out";
}

/**
 * A thread's popover comes out of the pin that opens it, and goes back into it when it closes:
 * where it came from stays legible, without a highlight on the page. With reduced motion, a
 * plain fade.
 */
export function usePinMorph(ref: React.RefObject<HTMLElement>, pinId: string | undefined) {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || !pinId) return;
    const ease = easing(el);
    const pin = pinOf(pinId);
    // Measured as it rests: not part-way through a morph a moment ago (StrictMode runs this twice).
    for (const animation of el.getAnimations({ subtree: true })) animation.cancel();

    if (reducedMotion() || !pin) {
      el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: CONTENT_IN_MS, easing: ease });
    } else {
      el.animate([pinFrame(el.getBoundingClientRect(), pin.getBoundingClientRect()), OPEN_FRAME], {
        duration: MORPH_IN_MS,
        easing: ease,
      });
      for (const child of Array.from(el.children)) {
        child.animate([{ opacity: 0 }, { opacity: 1 }], {
          duration: CONTENT_IN_MS,
          delay: CONTENT_IN_DELAY_MS,
          easing: ease,
          fill: "backwards",
        });
      }
    }

    return () => {
      // React takes the popover off the page right after this. A copy of it, inert, goes back
      // into the pin instead. Only if it really went: StrictMode runs this once while the
      // popover stays.
      const box = el.getBoundingClientRect();
      const parent = el.parentNode;
      const ghost = el.cloneNode(true) as HTMLElement;
      queueMicrotask(() => {
        if (el.isConnected || !parent?.isConnected) return;
        ghost.removeAttribute("id");
        ghost.querySelectorAll("[id]").forEach((node) => node.removeAttribute("id"));
        ghost.setAttribute("aria-hidden", "true");
        ghost.setAttribute("inert", "");
        ghost.classList.add("orbit-popover--leaving");
        parent.appendChild(ghost);

        const target = pinOf(pinId);
        const animation =
          reducedMotion() || !target
            ? ghost.animate([{ opacity: 1 }, { opacity: 0 }], {
                duration: CONTENT_OUT_MS,
                easing: ease,
                fill: "forwards",
              })
            : ghost.animate([OPEN_FRAME, pinFrame(box, target.getBoundingClientRect())], {
                duration: MORPH_OUT_MS,
                easing: ease,
                fill: "forwards",
              });
        if (target && !reducedMotion()) {
          for (const child of Array.from(ghost.children)) {
            child.animate([{ opacity: 1 }, { opacity: 0 }], {
              duration: CONTENT_OUT_MS,
              easing: ease,
              fill: "forwards",
            });
          }
        }
        animation.finished.finally(() => ghost.remove());
      });
    };
  }, [ref, pinId]);
}
