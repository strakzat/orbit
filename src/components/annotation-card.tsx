import React from "react";
import { cx } from "../utils/cx";
import { formatDate } from "../utils/format";
import { CrosshairIcon } from "../icons";
import { TypeBadge } from "./type-badge";
import { navigateTo, routeBreadcrumb } from "../utils/route-matching";
import { useStableId } from "../utils/use-stable-id";
import type { Annotation } from "../types";

interface AnnotationCardProps {
  annotation: Annotation;
  /** This annotation's popover is open on the page. */
  isActive: boolean;
  /** Set when the marker for this annotation is hovered out on the page. */
  isHovered: boolean;
  onSelect: (e: React.MouseEvent<HTMLElement>) => void;
  onHoverStart: (id: string) => void;
  onHoverEnd: () => void;
}

export function AnnotationCard({
  annotation,
  isActive,
  isHovered,
  onSelect,
  onHoverStart,
  onHoverEnd,
}: AnnotationCardProps) {
  const titleId = useStableId("orbit-card-title");
  const type = annotation.type ?? "documentation";
  const hasElement = !!annotation.elementId;
  const breadcrumb = routeBreadcrumb(annotation.target);
  const canNavigate = !!annotation.target && annotation.target !== "global";

  return React.createElement(
    "div",
    {
      className: cx(
        "orbit-card",
        isHovered && "orbit-card--hovered",
        isActive && "orbit-card--active"
      ),
      onMouseEnter: () => onHoverStart(annotation.id),
      onMouseLeave: onHoverEnd,
    },

    // Stretched primary action, so the breadcrumb below can stay its own button.
    // It borrows its name from the visible title rather than repeating it.
    //
    // Clicking opens this annotation's popover on the page, where the body is
    // shown in full. The card itself stays clamped to two lines — it is a list
    // entry, not a second copy of the annotation.
    React.createElement("button", {
      type: "button",
      className: "orbit-card__target",
      onClick: onSelect,
      "aria-labelledby": titleId,
      "aria-expanded": isActive,
    }),

    React.createElement(
      "div",
      { className: "orbit-card__head" },
      React.createElement(
        "span",
        { className: "orbit-card__title", id: titleId },
        annotation.title
      ),
      hasElement &&
        React.createElement(
          "span",
          { className: "orbit-card__pin" },
          React.createElement(CrosshairIcon, { size: 12 })
        ),
      React.createElement(TypeBadge, { type })
    ),

    React.createElement("p", { className: "orbit-card__body" }, annotation.body),

    React.createElement(
      "div",
      { className: "orbit-card__foot" },
      canNavigate
        ? React.createElement(
            "button",
            {
              type: "button",
              className: "orbit-link",
              onClick: (e: React.MouseEvent) => {
                e.stopPropagation();
                navigateTo(annotation.target);
              },
            },
            breadcrumb
          )
        : React.createElement("span", { className: "orbit-meta" }, breadcrumb),
      React.createElement(
        "span",
        { className: "orbit-meta" },
        `${annotation.author} · ${formatDate(annotation.date)}`
      )
    )
  );
}
