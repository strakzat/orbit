import { getElementLabel } from "./element-id";

// A selector the inspector wrote (`getLocator()`, or the CSS path of earlier versions),
// as opposed to a bare id. A bare id never contains these.
const SELECTOR = /[>[:#]/;

// Markers recompute on every scroll; a search by label is remembered, and a miss for a second.
const byLabelCache = new Map<string, { el: HTMLElement | null; at: number }>();
const MISS_TTL = 1000;

/**
 * The one element in `scope` with this label (tag + text preview), or `null` when there
 * is none or more than one: a guess between two buttons that say "Opslaan" is no answer.
 */
function findByLabel(scope: Element, label: string): HTMLElement | null {
  const tag = /^<([a-z0-9-]+)>/.exec(label)?.[1];
  if (!tag) return null;
  const matches = Array.from(scope.querySelectorAll<HTMLElement>(tag)).filter(
    (el) => getElementLabel(el) === label
  );
  return matches.length === 1 ? matches[0] : null;
}

/**
 * Finds a DOM element by the annotationId stored in a comment or an annotation:
 * 1. an element `id`
 * 2. a `data-annotation-id`
 * 3. a selector written by the inspector (`getLocator()`, or an older CSS path)
 *
 * With the comment's `label`, a selector that no longer finds the element it was written
 * for — a sibling was added, a wrapper moved — is checked against it: if the element there
 * reads differently, the one element under the selector's anchor that still reads like
 * the label wins.
 */
export function findElementByAnnotationId(annotationId: string, label?: string): HTMLElement | null {
  // Try by element id
  const byId = document.getElementById(annotationId);
  if (byId) return byId;

  // Try by data-annotation-id
  const byData = document.querySelector<HTMLElement>(
    `[data-annotation-id="${CSS.escape(annotationId)}"]`
  );
  if (byData) return byData;

  if (!SELECTOR.test(annotationId)) return null;

  let bySelector: HTMLElement | null = null;
  try {
    bySelector = document.querySelector<HTMLElement>(annotationId);
  } catch {
    // Invalid selector — ignore
  }
  if (!label || (bySelector && getElementLabel(bySelector) === label)) return bySelector;

  const key = `${annotationId}\n${label}`;
  const cached = byLabelCache.get(key);
  if (cached?.el?.isConnected && getElementLabel(cached.el) === label) return cached.el;
  if (cached && !cached.el && Date.now() - cached.at < MISS_TTL) return bySelector;

  // The first step is the anchor: an id the project gave, which outlives the path below it.
  let scope: Element | null = null;
  try {
    scope = document.querySelector(annotationId.split(" > ")[0]);
  } catch {
    // Invalid selector — search the page
  }
  const byLabel = findByLabel(scope ?? document.body, label);
  byLabelCache.set(key, { el: byLabel, at: Date.now() });
  return byLabel ?? bySelector;
}

const HOVER_ATTR = "data-orbit-hover-highlight";
let hoverDispose: (() => void) | null = null;
const HIGHLIGHT_PADDING = 4;
const FLASH_DURATION = 2000;
const FADE_DURATION = 200; // must match --orbit-duration-slow

/**
 * Draws a box over a host element. The overlay is a real DOM node in the host page
 * rather than a React element, because it has to sit over content this module does
 * not render — so it carries `.orbit-root` and picks up the same tokens.
 */
function createOverlay(el: HTMLElement, className: string): {
  overlay: HTMLElement;
  dispose: () => void;
} {
  const overlay = document.createElement("div");
  overlay.className = `orbit-root ${className}`;

  const position = () => {
    const rect = el.getBoundingClientRect();
    overlay.style.left = `${rect.left - HIGHLIGHT_PADDING}px`;
    overlay.style.top = `${rect.top - HIGHLIGHT_PADDING}px`;
    overlay.style.width = `${rect.width + HIGHLIGHT_PADDING * 2}px`;
    overlay.style.height = `${rect.height + HIGHLIGHT_PADDING * 2}px`;
  };

  position();
  document.body.appendChild(overlay);
  window.addEventListener("scroll", position, true);
  window.addEventListener("resize", position);

  return {
    overlay,
    dispose: () => {
      overlay.remove();
      window.removeEventListener("scroll", position, true);
      window.removeEventListener("resize", position);
    },
  };
}

/** Scrolls to an element and flashes a highlight over it. */
export function scrollToAndHighlight(el: HTMLElement): void {
  el.scrollIntoView({ behavior: "smooth", block: "center" });

  const { overlay, dispose } = createOverlay(el, "orbit-highlight");

  window.setTimeout(() => {
    overlay.classList.add("orbit-highlight--leaving");
    window.setTimeout(dispose, FADE_DURATION + 100);
  }, FLASH_DURATION);
}

/** Shows a hover highlight over an element. Returns a cleanup function. */
export function showHoverHighlight(el: HTMLElement): () => void {
  removeHoverHighlight();

  const { overlay, dispose } = createOverlay(el, "orbit-highlight orbit-highlight--hover");
  overlay.setAttribute(HOVER_ATTR, "");
  hoverDispose = dispose;

  return () => {
    if (hoverDispose === dispose) hoverDispose = null;
    dispose();
  };
}

export function removeHoverHighlight(): void {
  hoverDispose?.();
  hoverDispose = null;
  // Belt and braces: an overlay left behind by an unmount that missed its cleanup.
  document.querySelectorAll(`[${HOVER_ATTR}]`).forEach((el) => el.remove());
}
