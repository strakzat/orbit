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
 * Fixed placement that maximises height by letting the popover overlap the target.
 *
 * A hugging popover (getFixedPopoverStyle) can never be taller than the gap between
 * the element and the viewport edge, so a tall form clicked on a mid-page element
 * scrolls. This anchors to whichever element edge leaves the most room and uses that
 * room in full — the popover sits over the element, extending toward the far edge.
 * The inspector's last resort (getBesidePopoverStyle), when the viewport has no room
 * for a form anywhere next to the element.
 */
export function getOverlapPopoverStyle(
  rect: DOMRect,
  popoverWidth: number,
  margin = 16
): React.CSSProperties {
  const viewportH = window.innerHeight;
  const viewportW = window.innerWidth;

  const style: React.CSSProperties = { position: "fixed", width: popoverWidth };

  // Horizontal: align to the element's left, or its right when the left would overrun.
  if (viewportW - rect.left >= popoverWidth) style.left = rect.left;
  else style.right = viewportW - rect.right;

  // Vertical: anchor to the element edge nearer the roomier side and take it all.
  const elementMiddle = rect.top + rect.height / 2;
  if (elementMiddle < viewportH / 2) {
    const top = Math.max(margin, rect.top);
    style.top = top;
    style.maxHeight = viewportH - top - margin;
  } else {
    const bottom = Math.max(margin, viewportH - rect.bottom);
    style.bottom = bottom;
    style.maxHeight = viewportH - bottom - margin;
  }

  return style;
}

/**
 * Fixed placement that keeps the target in view: the inspector lights the element it
 * picked, and a popover on top of it would hide what the feedback is about. Beside the
 * element when there is room, then above or below it, and over it only when the
 * viewport has no other place for a form.
 */
export function getBesidePopoverStyle(
  rect: DOMRect,
  popoverWidth: number,
  popoverMaxHeight: number,
  gap = 12,
  margin = 16
): React.CSSProperties {
  const viewportH = window.innerHeight;
  const viewportW = window.innerWidth;
  const minHeight = 240;

  const right = viewportW - rect.right - gap - margin >= popoverWidth;
  const left = rect.left - gap - margin >= popoverWidth;
  if (right || left) {
    const top = Math.max(margin, Math.min(rect.top, viewportH - margin - minHeight));
    return {
      position: "fixed",
      width: popoverWidth,
      top,
      left: right ? rect.right + gap : rect.left - gap - popoverWidth,
      maxHeight: Math.min(popoverMaxHeight, viewportH - top - margin),
    };
  }

  const roomBelow = viewportH - rect.bottom - gap - margin;
  const roomAbove = rect.top - gap - margin;
  if (Math.max(roomBelow, roomAbove) >= minHeight) {
    return getFixedPopoverStyle(rect, popoverWidth, popoverMaxHeight, gap);
  }

  return getOverlapPopoverStyle(rect, popoverWidth, margin);
}

/**
 * Returns absolute-position CSS properties for a popover inside a relative container.
 * Used by AnnotationMarker where the popover is a child of the annotated element.
 */
export function getAbsolutePopoverStyle(
  containerRect: DOMRect,
  popoverMinWidth: number,
  popoverMaxHeight: number,
  gap = 8
): React.CSSProperties {
  const { vertical, horizontal } = computePopoverPlacement(
    containerRect,
    popoverMaxHeight,
    popoverMinWidth
  );

  return {
    position: "absolute",
    top: vertical === "below" ? "100%" : undefined,
    bottom: vertical === "above" ? "100%" : undefined,
    marginTop: vertical === "below" ? gap : undefined,
    marginBottom: vertical === "above" ? gap : undefined,
    left: horizontal === "align-left" ? 0 : undefined,
    right: horizontal === "align-right" ? 0 : undefined,
    maxHeight: availableHeight(containerRect, vertical, gap, popoverMaxHeight),
  };
}
