import React, { useState, useEffect, useCallback, useRef } from "react";
import { useAnnotationsSafe } from "../context/use-annotations-safe";
import { useComments } from "../hooks/use-comments";
import { useAnnotationStyles, useInspectorCursor } from "../styles/inject";
import { cx } from "../utils/cx";
import { useStableId } from "../utils/use-stable-id";
import { getElementLabel, getElementPath } from "../utils/element-id";
import { getOverlapPopoverStyle } from "../utils/popover-position";
import { AnnotationPopover } from "./annotation-popover";
import { ORBIT_UI_ATTR } from "../constants";

const DATA_INSPECTOR = ORBIT_UI_ATTR;

/** On the rail's toggle, so the focus can go back to it. */
export const INSPECTOR_TOGGLE_ATTR = "data-orbit-inspector-toggle";

const focusToggle = () => document.querySelector<HTMLElement>(`[${INSPECTOR_TOGGLE_ATTR}]`)?.focus();

interface SelectedElement {
  el: HTMLElement;
  rect: DOMRect;
  path: string;
  label: string;
}

function isInspectorUI(el: HTMLElement): boolean {
  let current: HTMLElement | null = el;
  while (current) {
    if (current.hasAttribute(DATA_INSPECTOR)) return true;
    current = current.parentElement;
  }
  return false;
}

function isAnnotationButton(el: HTMLElement): boolean {
  let current: HTMLElement | null = el;
  while (current) {
    if (current.hasAttribute("data-annotation-button")) return true;
    current = current.parentElement;
  }
  return false;
}

function InspectorPopover({
  selected,
  onClose,
}: {
  selected: SelectedElement;
  onClose: () => void;
}) {
  const { commentsConfig, allAnnotations } = useAnnotationsSafe();
  const popoverId = useStableId("orbit-inspector-popover");

  // The clicked element resolved to a stable id (data-annotation-id wins). If that
  // id belongs to an annotation, show the annotation here too — so clicking an
  // annotated component through the inspector opens the same annotation + feedback
  // thread the annotation pin would, not a bare feedback box on the side.
  const annotation = allAnnotations.find((a) => a.id === selected.path);

  const { comments, isLoading, error, submitComment } = useComments({
    apiBase: commentsConfig?.apiBase ?? "",
    project: commentsConfig?.project ?? "",
    annotationId: selected.path,
    label: annotation?.title ?? selected.label,
    enabled: !!commentsConfig,
  });

  // Just the element locator; the popover renders its own close button top-right.
  const header = React.createElement(
    "div",
    { className: "orbit-popover__section" },
    React.createElement("div", { className: "orbit-mono" }, selected.label)
  );

  return React.createElement(AnnotationPopover, {
    id: popoverId,
    header,
    annotation,
    showComments: true,
    comments,
    isLoading,
    error,
    onSubmit: submitComment,
    onClose,
    variant: "inspector",
    style: getOverlapPopoverStyle(selected.rect, 320),
    extraProps: { [DATA_INSPECTOR]: "" },
  });
}

export function Inspector() {
  useAnnotationStyles();

  const {
    commentsConfig,
    inspectorActive: active,
    setInspectorActive: setActive,
    labels,
  } = useAnnotationsSafe();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const [hoverRect, setHoverRect] = useState<DOMRect | null>(null);
  const [selected, setSelected] = useState<SelectedElement | null>(null);
  const hoveredRef = useRef<HTMLElement | null>(null);

  useInspectorCursor(active && !selected);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!active || selected) return;
      const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
      if (!el || isInspectorUI(el)) {
        setHoverRect(null);
        hoveredRef.current = null;
        return;
      }
      if (el !== hoveredRef.current) {
        hoveredRef.current = el;
        setHoverRect(el.getBoundingClientRect());
      }
    },
    [active, selected]
  );

  const handleClick = useCallback(
    (e: MouseEvent) => {
      if (!active) return;
      const el = e.target as HTMLElement;
      if (isInspectorUI(el)) return;

      // Let annotation button clicks through — deactivate inspector
      if (isAnnotationButton(el)) {
        setActive(false);
        setSelected(null);
        setHoverRect(null);
        return;
      }

      e.preventDefault();
      e.stopPropagation();

      // Walk up from clicked element to find nearest ancestor with a stable identifier.
      // Priority: data-annotation-id > id attribute > CSS selector path.
      // Skip elements that cover most of the viewport (e.g. <div id="root">).
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      let target: HTMLElement | null = el;
      let stableId: string | null = null;

      // Pass 1: prefer data-annotation-id (predefined annotation markers)
      let walk: HTMLElement | null = el;
      while (walk && walk !== document.body) {
        const annotationId = walk.getAttribute("data-annotation-id");
        if (annotationId) {
          const r = walk.getBoundingClientRect();
          if (!(r.width > vw * 0.9 && r.height > vh * 0.9)) {
            stableId = annotationId;
            target = walk;
            break;
          }
        }
        walk = walk.parentElement;
      }

      // Pass 2: fall back to element id attribute
      if (!stableId) {
        walk = el;
        while (walk && walk !== document.body) {
          if (walk.id) {
            const r = walk.getBoundingClientRect();
            if (!(r.width > vw * 0.9 && r.height > vh * 0.9)) {
              stableId = walk.id;
              target = walk;
              break;
            }
          }
          walk = walk.parentElement;
        }
      }

      // Pass 3: fall back to CSS selector path
      if (!stableId || !target) {
        target = el;
        stableId = getElementPath(el);
      }

      const rect = target.getBoundingClientRect();
      setSelected({
        el: target,
        rect,
        path: stableId,
        label: getElementLabel(target),
      });
      setHoverRect(null);
    },
    [active, setActive]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (selected) {
        setSelected(null);
      } else if (active) {
        setActive(false);
        setHoverRect(null);
        focusToggle();
      }
    },
    [active, selected, setActive]
  );

  useEffect(() => {
    if (!active) return;
    document.addEventListener("mousemove", handleMouseMove, true);
    document.addEventListener("click", handleClick, true);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove, true);
      document.removeEventListener("click", handleClick, true);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [active, handleMouseMove, handleClick, handleKeyDown]);

  // Update selected rect on scroll/resize
  useEffect(() => {
    if (!selected) return;
    const update = () => {
      setSelected((prev) =>
        prev ? { ...prev, rect: prev.el.getBoundingClientRect() } : null
      );
    };
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [selected]);

  if (!mounted || !commentsConfig) return null;

  // The toggle is the rail's (`OrbitShell`); this is the picking itself.
  // Picking mode changes how the whole page behaves, so it is announced rather
  // than left to the button's colour.
  const announcement = React.createElement(
    "div",
    { key: "status", className: "orbit-root orbit-sr-only", role: "status" },
    active && !selected ? labels.inspectorActive : ""
  );

  const highlight =
    active && hoverRect && !selected
      ? React.createElement("div", {
          key: "hover",
          [DATA_INSPECTOR]: "",
          className: "orbit-root orbit-overlay",
          style: {
            left: hoverRect.left,
            top: hoverRect.top,
            width: hoverRect.width,
            height: hoverRect.height,
          },
        })
      : null;

  const selectedOutline = selected
    ? React.createElement("div", {
        key: "selected",
        [DATA_INSPECTOR]: "",
        className: "orbit-root orbit-overlay orbit-overlay--selected",
        style: {
          left: selected.rect.left,
          top: selected.rect.top,
          width: selected.rect.width,
          height: selected.rect.height,
        },
      })
    : null;

  const popover = selected
    ? React.createElement(InspectorPopover, {
        key: "popover",
        selected,
        onClose: () => {
          setSelected(null);
          focusToggle();
        },
      })
    : null;

  return React.createElement(
    React.Fragment,
    null,
    announcement,
    highlight,
    selectedOutline,
    popover
  );
}
