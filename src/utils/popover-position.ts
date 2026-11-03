import { pickArea } from "./pick-element";

/**
 * Computes optimal popover placement based on the target element's position
 * relative to viewport boundaries.
 */

export interface PopoverPlacement {
  /** Place popover above or below the target */
  vertical: "above" | "below";
  /** Align popover to left or right edge of the target */
  horizontal: "align-left" | "align-right";
}

/**
 * Given a target element's bounding rect, determines the best popover placement.
 *
 * @param rect - The target element's DOMRect (from getBoundingClientRect)
 * @param popoverHeight - Estimated minimum height needed for the popover (default 240)
 * @param popoverWidth - Estimated width of the popover (default 320)
 */
export function computePopoverPlacement(
  rect: DOMRect,
  popoverHeight = 240,
  popoverWidth = 320
): PopoverPlacement {
  const viewportH = window.innerHeight;
  const viewportW = window.innerWidth;

  const spaceBelow = viewportH - rect.bottom;
  const spaceAbove = rect.top;
  const vertical: PopoverPlacement["vertical"] =
    spaceBelow >= popoverHeight || spaceBelow >= spaceAbove ? "below" : "above";

  const spaceRight = viewportW - rect.left;
  const horizontal: PopoverPlacement["horizontal"] =
    spaceRight >= popoverWidth ? "align-left" : "align-right";

  return { vertical, horizontal };
}

/**
 * Returns fixed-position CSS properties for a popover near the given rect.
 * Used by Inspector and other fixed-position popovers.
 */
export function getFixedPopoverStyle(
  rect: DOMRect,
  popoverWidth: number,
  popoverMaxHeight: number,
  gap = 8
): React.CSSProperties {
  const { vertical, horizontal } = computePopoverPlacement(
    rect,
    popoverMaxHeight,
    popoverWidth
  );

  const viewportH = window.innerHeight;

  return {
    position: "fixed",
    top: vertical === "below" ? rect.bottom + gap : undefined,
    bottom: vertical === "above" ? viewportH - rect.top + gap : undefined,
    left: horizontal === "align-left" ? rect.left : undefined,
    right: horizontal === "align-right" ? window.innerWidth - rect.right : undefined,
    width: popoverWidth,
    maxHeight: availableHeight(rect, vertical, gap, popoverMaxHeight),
  };
}

/**
 * The most a popover can use without running off screen. Without this the caller's
 * maximum is the only limit, so a popover either scrolls earlier than it needs to
 * or spills past the viewport edge.
 */
function availableHeight(
  rect: DOMRect,
  vertical: PopoverPlacement["vertical"],
  gap: number,
  requested: number,
  margin = 16
): number {
  const space =
    vertical === "below"
      ? window.innerHeight - rect.bottom - gap - margin
      : rect.top - gap - margin;

  return Math.max(240, Math.min(requested, space));
}

/**
 * The inspector's comment bubble: under the element, its top-left corner on the element's,
 * so the element stays in view and the bubble reads as said about it. Above the element when
 * there is no room below, and over its foot when there is room on neither side. `area` is
 * where the bubble may go: the frame, so it never covers the rail.
 */
export function getBubblePlacement(
  rect: DOMRect,
  area: DOMRect,
  width: number,
  height: number,
  gap = 6,
  margin = 12
): { style: React.CSSProperties; above: boolean } {
  const viewportH = window.innerHeight;
  const left = Math.max(
    area.left + margin,
    Math.min(rect.left, area.right - width - margin)
  );

  if (area.bottom - rect.bottom - gap - margin >= height) {
    return { style: { position: "fixed", left, width, top: rect.bottom + gap }, above: false };
  }
  if (rect.top - area.top - gap - margin >= height) {
    // Anchored by its bottom, so it grows upward, away from the element.
    return {
      style: { position: "fixed", left, width, bottom: viewportH - rect.top + gap },
      above: true,
    };
  }
  // The element fills the view: the bubble sits inside its foot, as low as the area allows.
  const foot = Math.min(rect.bottom, area.bottom) - margin;
  return { style: { position: "fixed", left, width, bottom: viewportH - foot }, above: true };
}

/**
 * A thread's popover on its pin, the way a comment opens in Figma: its corner on the pin's
 * corner, covering the pin, growing right and down from it. Without room to the right it grows
 * left from the pin's right edge; without room below, up from its bottom. Kept inside the
 * frame (or the window), clear of the rail.
 */
export function getPinPopoverStyle(
  pin: DOMRect,
  popoverWidth: number,
  popoverMaxHeight: number,
  margin = 16
): React.CSSProperties {
  const area = pickArea();
  const right = pin.left + popoverWidth <= area.right - margin;
  const roomBelow = area.bottom - margin - pin.top;
  const roomAbove = pin.bottom - area.top - margin;
  const down = roomBelow >= Math.min(popoverMaxHeight, 240) || roomBelow >= roomAbove;
  const left = right ? pin.left : pin.right - popoverWidth;

  return {
    position: "fixed",
    left: Math.max(area.left + margin, left),
    top: down ? pin.top : undefined,
    bottom: down ? undefined : window.innerHeight - pin.bottom,
    width: popoverWidth,
    maxHeight: Math.min(popoverMaxHeight, down ? roomBelow : roomAbove),
  };
}
