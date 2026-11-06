import React from "react";
import { useAnnotationsSafe } from "../context/use-annotations-safe";
import { fill } from "../labels";
import { cx } from "../utils/cx";
import { placeTrail } from "../utils/route-matching";
import { ComponentChip } from "./component-chip";

interface PlaceTrailProps {
  className: string;
  /** Feedback in a component, on the whole or on one instance: its pill, after the pages. */
  component?: string;
  pagina?: string;
  /** The element's label. */
  element?: string;
}

/**
 * Where feedback is, on one line: the pages, the component's pill, the element beside it. On the
 * canvas a caller leaves `pagina` out: a thread there is on the page you are looking at. A thread on a whole
 * component passes only the component: it isn't about one page. Its comments each pass where they
 * were placed, without the pill.
 */
export function PlaceTrail({ className, component, pagina, element = "" }: PlaceTrailProps) {
  const { labels } = useAnnotationsSafe();
  const pages = placeTrail(pagina, "", labels.placeHome);
  const trail = placeTrail(pagina, element, labels.placeHome);
  if (!component && !trail) return null;

  const text = (value: string, pagesOnly?: boolean) =>
    React.createElement("span", { className: cx("orbit-place__text", pagesOnly && "orbit-place__text--pages") }, value);
  const separator = React.createElement("span", { "aria-hidden": true }, "/");
  return React.createElement(
    "span",
    { className: cx("orbit-place", className), title: pagina },
    !component && text(trail),
    component && pages && text(pages, true),
    component && pages && separator,
    component &&
      React.createElement("span", { className: "orbit-sr-only" }, fill(labels.componentNamed, { name: component })),
    component &&
      React.createElement(
        "span",
        { "aria-hidden": true, className: "orbit-place__chip" },
        React.createElement(ComponentChip, { name: component })
      ),
    // The spotlight's tag reads the same: a pill, then the element beside it.
    component && element && text(element)
  );
}
