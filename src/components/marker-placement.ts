import { findElementByAnnotationId } from "../utils/find-element";
import { matchRoute } from "../utils/route-matching";
import type { Annotation } from "../types";

/**
 * The element a pin goes on. One without a box (`display: none`, a closed tab) is no place: it
 * would put the pin in the corner of the window, as if it were on something there.
 */
export function markerElement(id: string, label?: string): HTMLElement | null {
  const el = findElementByAnnotationId(id, label);
  if (!el) return null;
  const { width, height } = el.getBoundingClientRect();
  return width > 0 && height > 0 ? el : null;
}

/** Scrolled out of the frame: its pin isn't laid over the rail, or over what is there instead. */
export function outOfArea(rect: DOMRect, area: DOMRect): boolean {
  return rect.bottom <= area.top || rect.top >= area.bottom || rect.right <= area.left || rect.left >= area.right;
}

/** Within a pixel: whether a pin has moved at all. */
export function sameRect(a: DOMRect, b: DOMRect): boolean {
  return (
    Math.abs(a.top - b.top) < 1 &&
    Math.abs(a.left - b.left) < 1 &&
    Math.abs(a.right - b.right) < 1 &&
    Math.abs(a.bottom - b.bottom) < 1
  );
}

/**
 * The annotations that end up in the unplaced column, in the order they get a slot.
 *
 * Two components draw into that column — AutoAnnotationMarkers for annotations and
 * FeedbackMarkers for comments whose element is gone — and they have to agree about
 * who sits where. This is the one place that decides.
 */
export function unplacedAnnotationIds(
  annotations: Annotation[],
  registeredMarkerIds: Set<string>,
  currentRoute: string
): string[] {
  const ids: string[] = [];

  for (const annotation of annotations) {
    if (registeredMarkerIds.has(annotation.id)) continue;
    if (annotation.target !== "global" && !matchRoute(annotation.target, currentRoute)) {
      continue;
    }
    if (markerElement(annotation.elementId || annotation.id)) continue;
    ids.push(annotation.id);
  }

  return ids;
}
