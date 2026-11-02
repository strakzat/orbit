import React from "react";
import { cx } from "../utils/cx";
import { ComponentIcon } from "../icons";
import type { AnnotationLabels } from "../types";

/**
 * A component of the project's (`data-orbit-component`), by name: Figma's purple, its four
 * diamonds. One look for the spotlight's tag, the popover's head and the feedback in the panel.
 */
export function ComponentChip({ name, className }: { name: string; className?: string }) {
  return React.createElement(
    "span",
    { className: cx("orbit-component-chip", className) },
    React.createElement(ComponentIcon, { size: 12 }),
    React.createElement("span", { className: "orbit-component-chip__name" }, name)
  );
}

/** At the head of a popover about a component: its pill, named for a screen reader as well. */
export function ComponentHead({ name, labels }: { name: string; labels: AnnotationLabels }) {
  return React.createElement(
    "div",
    { className: "orbit-popover__component" },
    React.createElement("span", { className: "orbit-sr-only" }, `${labels.scopeComponent}: `),
    React.createElement(ComponentChip, { name })
  );
}
