import React from "react";
import { cx } from "../utils/cx";
import { TYPE_ICONS } from "../constants";
import { MessageSquareTextIcon } from "../icons";
import { CIRCLE_PATH, PIN_PATHS, type PinTail } from "./marker-geometry";
import type { AnnotationType } from "../types";

interface MarkerBadgeProps {
  /** An annotation marker takes the colour of its type; a feedback marker is blue. */
  variant: "annotation" | "feedback";
  type?: AnnotationType;
  /** Feedback only: every comment on this element is resolved. */
  resolved?: boolean;
  /** Shown instead of the icon. */
  count?: number;
  /** Initials, shown instead of the icon and the count: who started a feedback thread. */
  monogram?: string;
  /** The accessible name. Required — a coloured circle says nothing on its own. */
  label: string;
  placement: "fixed" | "absolute";
  /** Runtime coordinates only. Everything else belongs in the stylesheet. */
  style?: React.CSSProperties;
  active?: boolean;
  /** The thread it opens: how the spotlight finds the pin, to leave it undimmed. */
  pinId?: string;
  /** Its thread has something the viewer has not read: a white dot. Say so in `label` too. */
  unseen?: boolean;
  /** Not attached to an element — drawn with a dashed edge to say so. */
  unplaced?: boolean;
  /** Pinned to a spot: the way its tail points. Without one it is a plain circle, like a badge
      beside a pin or one that is attached to nothing. */
  tail?: PinTail;
  controls?: string;
  onClick?: (event: React.MouseEvent) => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

/**
 * The round badge that sits on an annotated element. One implementation for all
 * three places it appears: the AnnotationMarker wrapper, the auto-discovered
 * markers, and the standalone feedback markers.
 *
 * Without an `onClick` it renders as a span: a badge that only mirrors what the
 * panel already shows should not be a tab stop.
 */
export function MarkerBadge({
  variant,
  type = "documentation",
  resolved,
  count,
  monogram,
  label,
  placement,
  style,
  active,
  pinId,
  unseen,
  unplaced,
  tail,
  controls,
  onClick,
  onMouseEnter,
  onMouseLeave,
}: MarkerBadgeProps) {
  const interactive = !!onClick;
  const Icon = variant === "feedback" ? MessageSquareTextIcon : TYPE_ICONS[type];

  const className = cx(
    "orbit-root",
    "orbit-marker",
    placement === "fixed" ? "orbit-marker--fixed" : "orbit-marker--absolute",
    variant === "feedback" && "orbit-marker--feedback",
    resolved && "orbit-marker--resolved",
    active && "orbit-marker--active",
    unplaced && "orbit-marker--unplaced",
    !interactive && "orbit-marker--static",
    tail && `orbit-marker--tail-${tail}`
  );

  // The shape is drawn rather than a rounded box, so the tail is one surface with the circle:
  // two translucent shapes would show their overlap.
  const outline = tail && !unplaced ? PIN_PATHS[tail] : CIRCLE_PATH;
  const shape = React.createElement(
    "svg",
    {
      className: "orbit-marker__shape",
      width: 26,
      height: 26,
      viewBox: "0 0 26 26",
      "aria-hidden": true,
      focusable: false,
    },
    React.createElement("path", { className: "orbit-marker__body", d: outline })
  );

  const dot = unseen
    ? React.createElement("span", { className: "orbit-marker__dot", "aria-hidden": true })
    : null;

  const content = monogram
    ? React.createElement(
        "span",
        { className: "orbit-marker__monogram", "aria-hidden": true },
        monogram
      )
    : count !== undefined && count > 0
      ? React.createElement(
          "span",
          { className: "orbit-marker__count", "aria-hidden": true },
          count
        )
      : React.createElement(Icon, { size: 14 });

  if (!interactive) {
    return React.createElement(
      "span",
      {
        className,
        style,
        "data-orbit-type": variant === "annotation" ? type : undefined,
        "data-orbit-pin": pinId,
        "data-orbit-tail": tail,
      },
      React.createElement("span", { className: "orbit-sr-only" }, label),
      shape,
      content,
      dot
    );
  }

  return React.createElement(
    "button",
    {
      type: "button",
      className,
      style,
      "data-orbit-type": variant === "annotation" ? type : undefined,
      "data-orbit-pin": pinId,
      "data-orbit-tail": tail,
      "aria-label": label,
      "aria-expanded": controls ? !!active : undefined,
      "aria-controls": controls && active ? controls : undefined,
      onClick,
      onMouseEnter,
      onMouseLeave,
    },
    shape,
    content,
    dot
  );
}
