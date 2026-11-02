import { COMPONENT_ATTR } from "../constants";

/**
 * The selector of an element the project gave a name: an annotation id, a test id or an
 * element id. A locator starts at the nearest of these, so it survives anything that
 * changes above it.
 */
function anchorSelector(el: Element): string | null {
  const annotationId = el.getAttribute("data-annotation-id");
  if (annotationId) return `[data-annotation-id="${CSS.escape(annotationId)}"]`;
  const testId = el.getAttribute("data-testid");
  if (testId) return `[data-testid="${CSS.escape(testId)}"]`;
  if (el.id) return `#${CSS.escape(el.id)}`;
  return null;
}

// Attributes that say what an element is, preferred over its position among its siblings.
const NAMING_ATTRS = ["aria-label", "name", "role", "type"];

/** One step of a locator: the tag, an attribute that names it, a position only when needed. */
function step(el: Element): string {
  const tag = el.tagName.toLowerCase();
  const siblings = el.parentElement ? Array.from(el.parentElement.children) : [el];

  for (const attr of NAMING_ATTRS) {
    const value = el.getAttribute(attr);
    if (!value) continue;
    const selector = `${tag}[${attr}="${CSS.escape(value)}"]`;
    if (siblings.filter((s) => s.matches(selector)).length === 1) return selector;
  }

  const sameTag = siblings.filter((s) => s.tagName === el.tagName);
  return sameTag.length > 1 ? `${tag}:nth-of-type(${sameTag.indexOf(el) + 1})` : tag;
}

/**
 * Where feedback on an element is kept. An element with an annotation id or an id is
 * that id, so feedback on an annotated component lands in the annotation's thread.
 * Anything else is a selector from its nearest named ancestor, e.g.
 * `[data-annotation-id="2"] > p:nth-of-type(2)`; `findElementByAnnotationId()` finds it
 * again, and falls back to the comment's label when the markup moved.
 */
export function getLocator(el: HTMLElement): string {
  const annotationId = el.getAttribute("data-annotation-id");
  if (annotationId) return annotationId;
  if (el.id) return el.id;

  const parts: string[] = [];
  for (
    let current: Element | null = el;
    current && current !== document.body && current !== document.documentElement;
    current = current.parentElement
  ) {
    const anchor = anchorSelector(current);
    if (anchor) {
      parts.unshift(anchor);
      break;
    }
    parts.unshift(step(current));
  }

  return parts.join(" > ");
}

/** A component of the project's, as marked with `data-orbit-component`. */
export interface ComponentRef {
  name: string;
  /** The instance around the element. */
  el: HTMLElement;
  /** What feedback on the component is kept under: a selector every instance answers to. */
  locator: string;
}

/** The selector every instance of a component answers to. */
export function componentLocator(name: string): string {
  return `[${COMPONENT_ATTR}="${CSS.escape(name)}"]`;
}

/**
 * The component `el` is part of: the nearest element with `data-orbit-component`, itself or
 * above it. Not an anchor for `getLocator()`: every instance carries the same name, so feedback
 * on one element would land on all of them.
 */
export function componentOf(el: Element): ComponentRef | null {
  const host = el.closest<HTMLElement>(`[${COMPONENT_ATTR}]`);
  const name = host?.getAttribute(COMPONENT_ATTR)?.trim();
  if (!host || !name) return null;
  return { name, el: host, locator: componentLocator(name) };
}

/**
 * The element's own text, one space between text nodes ("Omzet € 24.500", not
 * "Omzet€ 24.500"), without Orbit's: the badges in a marker wrapper are not the project's.
 */
function textOf(el: Element): string {
  const parts: string[] = [];
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
    acceptNode: (node) =>
      node.nodeType === Node.ELEMENT_NODE && (node as Element).classList.contains("orbit-root")
        ? NodeFilter.FILTER_REJECT
        : NodeFilter.FILTER_ACCEPT,
  });
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (node.nodeType === Node.TEXT_NODE && node.textContent?.trim()) parts.push(node.textContent.trim());
  }
  return parts.join(" ").replace(/\s+/g, " ");
}

const LABEL_TEXT = 40;

/** A short label for the element: its tag and the start of its text, `<p> € 24.500`. */
export function getElementLabel(el: Element): string {
  const tag = el.tagName.toLowerCase();
  const text = textOf(el);
  if (!text) return `<${tag}>`;
  return `<${tag}> ${text.slice(0, LABEL_TEXT)}${text.length > LABEL_TEXT ? "…" : ""}`;
}
