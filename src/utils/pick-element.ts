/**
 * What the inspector picks under the pointer. The element the pointer is on is usually
 * a wrapper nobody would name: a `div` around a line of text, a `span` in a label. This
 * walks up to the elements a viewer would point at, and gives hover and click the same
 * answer, so what is lit is what gets the feedback.
 */

import { COMPONENT_ATTR } from "../constants";

const INTERACTIVE = new Set(["A", "BUTTON", "INPUT", "SELECT", "TEXTAREA", "LABEL", "SUMMARY"]);

const SEMANTIC = new Set([
  "IMG", "SVG", "VIDEO", "CANVAS", "PICTURE",
  "H1", "H2", "H3", "H4", "H5", "H6", "P", "LI", "TD", "TH", "DT", "DD",
  "FIGURE", "FIGCAPTION", "BLOCKQUOTE", "PRE",
  "NAV", "SECTION", "ARTICLE", "ASIDE", "HEADER", "FOOTER", "FORM", "TABLE", "TR",
  "UL", "OL", "DL", "FIELDSET", "DIALOG",
]);

// Inline text styling: never the thing itself, always part of the text around it.
const INLINE = new Set(["SPAN", "B", "STRONG", "I", "EM", "SMALL", "CODE", "MARK", "SUB", "SUP", "U", "S"]);

/** How strongly an element names itself; of two elements with one box, the stronger is kept. */
function rank(el: HTMLElement): number {
  const tag = el.tagName.toUpperCase();
  if (el.hasAttribute("data-annotation-id")) return 50;
  if (el.hasAttribute(COMPONENT_ATTR)) return 45;
  if (el.hasAttribute("data-testid")) return 40;
  if (el.id) return 30;
  if (INTERACTIVE.has(tag) || el.hasAttribute("role") || el.hasAttribute("tabindex")) return 20;
  if (SEMANTIC.has(tag)) return 10;
  return 0;
}

function hasOwnText(el: HTMLElement): boolean {
  for (const node of Array.from(el.childNodes)) {
    if (node.nodeType === Node.TEXT_NODE && node.textContent?.trim()) return true;
  }
  return false;
}

function hasOwnBox(el: HTMLElement): boolean {
  const style = getComputedStyle(el);
  const bg = style.backgroundColor;
  if (bg && bg !== "transparent" && !/rgba\(.*,\s*0\)$/.test(bg)) return true;
  if (style.backgroundImage && style.backgroundImage !== "none") return true;
  if (style.boxShadow && style.boxShadow !== "none") return true;
  return ["top", "right", "bottom", "left"].some(
    (side) =>
      parseFloat(style.getPropertyValue(`border-${side}-width`)) > 0 &&
      style.getPropertyValue(`border-${side}-style`) !== "none"
  );
}

function isMeaningful(el: HTMLElement): boolean {
  if (rank(el) > 0) return true;
  if (INLINE.has(el.tagName.toUpperCase())) return false;
  return hasOwnText(el) || hasOwnBox(el);
}

/** The area picking happens in: the frame under `OrbitShell`, or the window. */
export function pickArea(): DOMRect {
  const frame = document.querySelector<HTMLElement>(".orbit-frame");
  return frame ? frame.getBoundingClientRect() : new DOMRect(0, 0, window.innerWidth, window.innerHeight);
}

const sameBox = (a: DOMRect, b: DOMRect) =>
  Math.abs(a.left - b.left) < 1 &&
  Math.abs(a.top - b.top) < 1 &&
  Math.abs(a.width - b.width) < 1 &&
  Math.abs(a.height - b.height) < 1;

/**
 * The elements under `hit` a viewer could mean, innermost first: ↑ and ↓ step through
 * them. Elements that share one box (a card in its marker wrapper, an icon filling its
 * button) are one level, named by the strongest of them. Containers that fill the
 * picking area — the app root, the page — are no level at all.
 */
export function levelsFrom(hit: HTMLElement): HTMLElement[] {
  const area = pickArea();
  const levels: { el: HTMLElement; rect: DOMRect }[] = [];

  for (let el: HTMLElement | null = hit; el && el !== document.body; el = el.parentElement) {
    if (el.classList.contains("orbit-frame") || el.classList.contains("orbit-frame__scroll")) break;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) continue;
    if (rect.width >= area.width * 0.9 && rect.height >= area.height * 0.9) continue;
    if (!isMeaningful(el)) continue;

    const last = levels[levels.length - 1];
    if (last && sameBox(last.rect, rect)) {
      if (rank(el) >= rank(last.el)) last.el = el;
      continue;
    }
    levels.push({ el, rect });
  }

  return levels.map((level) => level.el);
}
