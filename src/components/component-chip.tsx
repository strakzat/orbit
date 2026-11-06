import React from "react";
import { cx } from "../utils/cx";
import { ComponentIcon } from "../icons";

/**
 * A component of the project's (`data-orbit-component`), by name: Figma's purple, its four
 * diamonds. For the spotlight's tag and the trail of feedback (`PlaceTrail`).
 */
export function ComponentChip({ name, className }: { name: string; className?: string }) {
  return React.createElement(
    "span",
    { className: cx("orbit-component-chip", className) },
    React.createElement(ComponentIcon, { size: 12 }),
    React.createElement("span", { className: "orbit-component-chip__name" }, name)
  );
}
