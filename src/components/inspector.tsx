import React, { useState, useEffect, useCallback, useRef } from "react";
import { useAnnotationsSafe } from "../context/use-annotations-safe";
import { useComments } from "../hooks/use-comments";
import { useAnnotationStyles, useInspectorCursor } from "../styles/inject";
import { cx } from "../utils/cx";
import { componentOf, getElementLabel, getLocator, type ComponentRef } from "../utils/element-id";
import { levelsFrom, pickArea } from "../utils/pick-element";
import { getBubblePlacement } from "../utils/popover-position";
import { CommentForm } from "./comment-form";
import { ComponentChip } from "./component-chip";
import { useStableId } from "../utils/use-stable-id";
import { fill } from "../labels";
import { ComponentIcon, InstanceIcon } from "../icons";
import { ORBIT_UI_ATTR } from "../constants";
import type { AnnotationLabels } from "../types";

const DATA_INSPECTOR = ORBIT_UI_ATTR;

/** On the rail's toggle, so the focus can go back to it. */
export const INSPECTOR_TOGGLE_ATTR = "data-orbit-inspector-toggle";

const focusToggle = () => document.querySelector<HTMLElement>(`[${INSPECTOR_TOGGLE_ATTR}]`)?.focus();

interface SelectedElement {
  el: HTMLElement;
  path: string;
  label: string;
  /** The component the element is part of, when the project marked one. */
  component: ComponentRef | null;
}

/** What feedback goes on: the picked element, or every instance of its component. */
type Scope = "element" | "component";

/** What the pointer is over: the levels under it, innermost first, and which one is lit. */
interface Hover {
  levels: HTMLElement[];
  index: number;
}

// The ring sits this far outside the element, so it never covers its edge.
const SPOTLIGHT_PAD = 4;
// The ring's width (`outline` in .orbit-spotlight-ring): the tag lines up with its outer edge.
const RING = 1;
const TAG_MAX_WIDTH = 320;
const TAG_MIN_WITH_COMPONENT = 280;
// Room the tag needs above the ring; with less, it goes below.
const TAG_ROOM = 32;
// The tag's height and its gap to the ring (.orbit-spotlight__tag).
const TAG_HEIGHT = 30;
const BUBBLE_WIDTH = 320;
// The bubble once it has opened up for a few lines: below the element only if that fits.
const BUBBLE_HEIGHT = 140;

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

/**
 * Component ❖ or Instance ◇: Radial's pill as a radio group, icons only, each with a tooltip
 * that says what it means. Only there when the element is part of a component; the component
 * is the default, the one a component's feedback is usually about.
 */
function ScopeChoice({
  scope,
  onScope,
  name,
  labels,
}: {
  scope: Scope;
  onScope: (scope: Scope) => void;
  /** The component's name, in the tooltips. */
  name: string;
  labels: AnnotationLabels;
}) {
  const groupRef = useRef<HTMLDivElement>(null);
  const tipId = useStableId("orbit-scope-tip");
  const options: [Scope, string, string, typeof ComponentIcon][] = [
    ["component", labels.scopeComponent, fill(labels.scopeComponentHint, { name }), ComponentIcon],
    ["element", labels.scopeInstance, fill(labels.scopeInstanceHint, { name }), InstanceIcon],
  ];

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) return;
    e.preventDefault();
    // The arrows are the group's here, not the page's.
    e.stopPropagation();
    const next = options.findIndex(([value]) => value !== scope);
    onScope(options[next][0]);
    groupRef.current?.querySelectorAll<HTMLElement>("[role=radio]")[next]?.focus();
  };

  return React.createElement(
    "div",
    {
      ref: groupRef,
      role: "radiogroup",
      "aria-label": labels.scopeLabel,
      className: "orbit-segments orbit-scope",
      onKeyDown,
    },
    ...options.map(([value, label, hint, Icon]) =>
      React.createElement(
        "button",
        {
          key: value,
          type: "button",
          role: "radio",
          "aria-checked": scope === value,
          "aria-label": label,
          "aria-describedby": `${tipId}-${value}`,
          tabIndex: scope === value ? 0 : -1,
          className: "orbit-segment",
          onClick: () => onScope(value),
        },
        React.createElement(Icon, { size: 14 }),
        React.createElement(
          "span",
          { id: `${tipId}-${value}`, role: "tooltip", className: "orbit-scope__tip" },
          React.createElement("span", { className: "orbit-scope__tip-title" }, label),
          hint
        )
      )
    )
  );
}

/**
 * The comment, and nothing else: a bubble under the picked element with a field and a send
 * button, and inside a component the choice between this instance and the component.
 */
function CommentBubble({
  selected,
  scope,
  onScope,
  ring,
  onSent,
}: {
  selected: SelectedElement;
  scope: Scope;
  onScope: (scope: Scope) => void;
  /** The spotlight's ring around the element: the bubble's corner goes on its corner. */
  ring: DOMRect;
  /** After the comment is in: picking is done, so the bubble and the inspector close. */
  onSent: () => void;
}) {
  const { commentsConfig, allAnnotations, refreshComments, labels, language } = useAnnotationsSafe();

  // On the component, the feedback is kept under a selector every instance answers to.
  const component = scope === "component" ? selected.component : null;
  // An annotated element is named by its annotation, as the annotation's own feedback is.
  const annotation = component ? undefined : allAnnotations.find((a) => a.id === selected.path);

  const { submitComment } = useComments({
    apiBase: commentsConfig?.apiBase ?? "",
    project: commentsConfig?.project ?? "",
    annotationId: component ? component.locator : selected.path,
    label: component ? getElementLabel(component.el) : annotation?.title ?? selected.label,
    // Only sending: the bubble shows no thread, so there is nothing to fetch.
    enabled: false,
    component: component?.name,
    target: selected.el,
  });

  const { style, above } = getBubblePlacement(ring, pickArea(), BUBBLE_WIDTH, BUBBLE_HEIGHT);

  return React.createElement(
    "div",
    {
      className: cx("orbit-root orbit-bubble orbit-glass-pane orbit-animate-in", above && "orbit-bubble--above"),
      style,
      lang: language,
      role: "group",
      "aria-label": fill(labels.formOn, { label: component ? component.name : selected.label }),
      [DATA_INSPECTOR]: "",
    },
    React.createElement(CommentForm, {
      autoFocus: true,
      tools:
        selected.component &&
        React.createElement(ScopeChoice, { scope, onScope, name: selected.component.name, labels }),
      // A failed send throws before onSent, so the bubble keeps the text and shows its error.
      onSubmit: async (data: { auteur: string; comment: string }) => {
        await submitComment(data);
        void refreshComments();
        onSent();
      },
    })
  );
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
  const [hover, setHover] = useState<Hover | null>(null);
  const [selected, setSelected] = useState<SelectedElement | null>(null);
  const [scope, setScope] = useState<Scope>("component");
  // Bumped on scroll and resize: the rects are read at render, from the elements.
  const [, setTick] = useState(0);
  const hitRef = useRef<HTMLElement | null>(null);
  // What the status region says once the inspector has closed itself after a send.
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!notice) return;
    const id = window.setTimeout(() => setNotice(""), 4000);
    return () => window.clearTimeout(id);
  }, [notice]);

  useInspectorCursor(active && !selected);

  useEffect(() => {
    if (active) return;
    setHover(null);
    setSelected(null);
    hitRef.current = null;
  }, [active]);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!active || selected) return;
      const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
      if (el === hitRef.current) return;
      hitRef.current = el;
      if (!el || isInspectorUI(el)) {
        setHover(null);
        return;
      }
      const levels = levelsFrom(el);
      setHover(levels.length ? { levels, index: 0 } : null);
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
        return;
      }

      e.preventDefault();
      e.stopPropagation();

      // With an element picked, a click beside its popover lets go of it rather than picking
      // another: the next click picks again.
      if (selected) {
        setSelected(null);
        return;
      }

      // The lit level when the pointer is still on what it lit; anything else (a click
      // while a popover is open, a touch without hover) resolves the same way.
      const levels = hover && hitRef.current === el ? hover.levels : levelsFrom(el);
      const target = levels.length
        ? levels[Math.min(hover && hitRef.current === el ? hover.index : 0, levels.length - 1)]
        : null;
      if (!target) return;

      setSelected({
        el: target,
        path: getLocator(target),
        label: getElementLabel(target),
        component: componentOf(target),
      });
      setScope("component");
      setHover(null);
      hitRef.current = null;
    },
    [active, hover, selected, setActive]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (selected) {
          setSelected(null);
          focusToggle();
        } else if (active) {
          setActive(false);
          focusToggle();
        }
        return;
      }

      // ↑ to the element around the lit one, ↓ back toward the one under the pointer.
      if ((e.key === "ArrowUp" || e.key === "ArrowDown") && hover && !selected) {
        e.preventDefault();
        const step = e.key === "ArrowUp" ? 1 : -1;
        const index = Math.max(0, Math.min(hover.levels.length - 1, hover.index + step));
        if (index !== hover.index) setHover({ ...hover, index });
      }
    },
    [active, hover, selected, setActive]
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

  // The spotlight follows its element through scrolling and resizing.
  useEffect(() => {
    if (!active) return;
    const update = () => setTick((t) => t + 1);
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [active]);

  if (!mounted || !commentsConfig) return null;

  // The toggle is the rail's (`OrbitShell`); this is the picking itself.
  // Picking mode changes how the whole page behaves, so it is announced rather
  // than left to the button's colour.
  const announcement = React.createElement(
    "div",
    { key: "status", className: "orbit-root orbit-sr-only", role: "status" },
    notice || (active && !selected ? labels.inspectorActive : "")
  );

  const lit = selected ? selected.el : hover ? hover.levels[hover.index] : null;
  const litRect = lit?.isConnected ? lit.getBoundingClientRect() : null;

  // Radial's spotlight: the app dims, the element stays as it is, ringed in white. The
  // scrim is the shadow of the cutout, clipped to the frame, so the rail stays lit.
  let spotlight: React.ReactElement | null = null;
  // The tag goes under the ring when there is no room above it.
  let tagBelow = false;
  if (active) {
    const area = pickArea();
    const framed = !!document.querySelector(".orbit-frame");
    const cutout = litRect
      ? {
          left: litRect.left - area.left - SPOTLIGHT_PAD,
          top: litRect.top - area.top - SPOTLIGHT_PAD,
          width: litRect.width + SPOTLIGHT_PAD * 2,
          height: litRect.height + SPOTLIGHT_PAD * 2,
        }
      : null;
    tagBelow = !!cutout && cutout.top < TAG_ROOM;
    // Picked, the tag stays: it names what the bubble under it is about.
    const showTag = !!lit;
    // In a component, the tag starts with its pill: a pill in the pill, before the element.
    const litComponent = showTag && lit ? componentOf(lit) : null;

    const scrim = React.createElement(
      "div",
      {
        key: "spotlight",
        [DATA_INSPECTOR]: "",
        "aria-hidden": true,
        className: cx(
          "orbit-root orbit-spotlight",
          framed && "orbit-spotlight--framed",
          !cutout && "orbit-spotlight--idle",
          selected && "orbit-spotlight--selected"
        ),
        style: { left: area.left, top: area.top, width: area.width, height: area.height },
      },
      cutout &&
        React.createElement("div", {
          className: "orbit-spotlight__cutout",
          style: cutout,
        }),
      cutout &&
        showTag &&
        lit &&
        React.createElement(
          "div",
          {
            className: cx(
              "orbit-spotlight__tag",
              tagBelow && "orbit-spotlight__tag--below",
              litComponent && "orbit-spotlight__tag--component"
            ),
            style: {
              left: cutout.left - RING,
              top: tagBelow ? cutout.top + cutout.height + RING : cutout.top - RING,
              // Never wider than the ring it belongs to, the text ellipses instead; with a
              // component's pill in front, wide enough that the element still reads beside it.
              maxWidth: Math.min(
                TAG_MAX_WIDTH,
                Math.max(cutout.width + RING * 2, litComponent ? TAG_MIN_WITH_COMPONENT : 0)
              ),
            },
          },
          litComponent && React.createElement(ComponentChip, { name: litComponent.name }),
          React.createElement("span", { className: "orbit-spotlight__label" }, getElementLabel(lit)),
          hover && hover.levels.length > 1
            ? React.createElement(
                "span",
                { className: "orbit-spotlight__keys" },
                `${hover.index + 1}/${hover.levels.length} ↑↓`
              )
            : null
        )
    );

    // The ring is its own layer, outside the clipped scrim: a blend mode only mixes with
    // what shares its stacking context, and inside the scrim that would be the scrim alone.
    // Here it adds light to the page under it, so it glows on a dim edge and stays white
    // on a white one.
    const ring = React.createElement("div", {
      key: "ring",
      [DATA_INSPECTOR]: "",
      "aria-hidden": true,
      className: cx(
        "orbit-root orbit-spotlight-ring",
        !cutout && "orbit-spotlight-ring--idle",
        selected && "orbit-spotlight-ring--selected"
      ),
      style: cutout
        ? {
            left: area.left + cutout.left,
            top: area.top + cutout.top,
            width: cutout.width,
            height: cutout.height,
          }
        : undefined,
    });

    spotlight = React.createElement(React.Fragment, null, scrim, ring);
  }

  const popover =
    selected && litRect
      ? React.createElement(CommentBubble, {
          // A new bubble, with an empty field, for every element picked.
          key: selected.path,
          selected,
          scope,
          onScope: setScope,
          ring: new DOMRect(
            litRect.left - SPOTLIGHT_PAD - RING,
            litRect.top - SPOTLIGHT_PAD - RING,
            litRect.width + (SPOTLIGHT_PAD + RING) * 2,
            // With the tag under the ring, the bubble goes under the tag.
            litRect.height + (SPOTLIGHT_PAD + RING) * 2 + (tagBelow ? TAG_HEIGHT : 0)
          ),
          onSent: () => {
            setActive(false);
            setNotice(labels.feedbackPlaced);
            focusToggle();
          },
        })
      : null;

  return React.createElement(React.Fragment, null, announcement, spotlight, popover);
}
