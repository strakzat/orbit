import React, { useCallback, useRef, useState } from "react";
import { useAnnotations } from "../context/use-annotations";
import { ORBIT_UI_ATTR } from "../constants";
import { cx } from "../utils/cx";
import { matchRoute } from "../utils/route-matching";
import { useStableId } from "../utils/use-stable-id";
import { MessageChatSquareIcon, MessagePlusSquareIcon, SlidersIcon } from "../icons";
import { INSPECTOR_TOGGLE_ATTR } from "./inspector";
import { VariantsPane } from "./variants-pane";
import { isChanged, variantsHere } from "../utils/variants";
import type { OrbitVariant } from "../types";

interface OrbitRailProps {
  variants?: OrbitVariant[];
  /** Laid over the foot of the window, for a shell without a frame. */
  overlay: boolean;
}

/**
 * The rail: Orbit's controls in a bar under the project, in Radial's tertiary buttons. On the left
 * the project's variants, when it has any; on the right the inspector and the panel, under the
 * corner the panel opens in. A toolbar: one stop for Tab, the arrow keys move between its buttons.
 */
export function OrbitRail({ variants, overlay }: OrbitRailProps) {
  const {
    labels,
    annotationMode,
    setAnnotationMode,
    panelOpen,
    setPanelOpen,
    inspectorActive,
    setInspectorActive,
    commentsConfig,
    allComments,
    currentAnnotations,
    currentRoute,
  } = useAnnotations();

  const [variantsOpen, setVariantsOpen] = useState(false);
  const [spoken, setSpoken] = useState("");
  const [focusIndex, setFocusIndex] = useState(0);
  const railRef = useRef<HTMLDivElement>(null);
  const paneId = useStableId("orbit-variants");

  // Only when there is something to switch here: variants for other pages alone leave no button.
  const here = variants ? variantsHere(variants, currentRoute) : [];
  const hasVariants = here.length > 0;
  // Off their defaults here: the prototype is not in the state it starts in.
  const changed = here.filter(isChanged).length;
  // The toolbar's one tab stop, kept on a button that is there: the list shrinks when the
  // variants or the comments go.
  const buttonCount = (hasVariants ? 1 : 0) + (commentsConfig ? 1 : 0) + 1;
  const tabStop = Math.min(focusIndex, buttonCount - 1);
  const panelExpanded = annotationMode && panelOpen;

  // What is open on this page: unresolved feedback, and the annotations here.
  const openFeedback = allComments.filter(
    (c) => c.status !== "Opgelost" && matchRoute(currentRoute, c.pagina ?? "")
  ).length;
  const count = currentAnnotations.length + openFeedback;

  const closeVariants = useCallback((returnFocus: boolean) => {
    setVariantsOpen(false);
    if (returnFocus) railRef.current?.querySelector<HTMLElement>("[data-orbit-variants-toggle]")?.focus();
  }, []);

  const buttons: React.ReactElement[] = [];
  const item = (
    key: string,
    isOn: boolean,
    extra: Record<string, unknown>,
    icon: React.ReactNode,
    label: string,
    badge?: number,
    dot?: boolean
  ) => {
    const index = buttons.length;
    buttons.push(
      React.createElement(
        "button",
        {
          key,
          type: "button",
          className: cx("orbit-rail__item", isOn && "orbit-rail__item--on"),
          tabIndex: index === tabStop ? 0 : -1,
          onFocus: () => setFocusIndex(index),
          ...extra,
        },
        icon,
        label,
        badge ? React.createElement("span", { className: "orbit-rail__count", "aria-hidden": true }, badge) : null,
        dot ? React.createElement("span", { className: "orbit-rail__dot", "aria-hidden": true }) : null
      )
    );
    return buttons[index];
  };

  const variantsButton = hasVariants
    ? item(
        "variants",
        variantsOpen,
        {
          "data-orbit-variants-toggle": "",
          "aria-expanded": variantsOpen,
          "aria-controls": variantsOpen ? paneId : undefined,
          "aria-label": changed > 0 ? `${labels.variants}, ${changed} ${labels.variantsChanged}` : undefined,
          onClick: () => setVariantsOpen((open) => !open),
        },
        React.createElement(SlidersIcon, { size: 16 }),
        labels.variants,
        undefined,
        changed > 0
      )
    : null;

  const inspectorButton = commentsConfig
    ? item(
        "inspector",
        inspectorActive,
        {
          [INSPECTOR_TOGGLE_ATTR]: "",
          "aria-pressed": inspectorActive,
          onClick: () => setInspectorActive(!inspectorActive),
        },
        React.createElement(MessagePlusSquareIcon, { size: 16 }),
        labels.placeFeedback
      )
    : null;

  const panelButton = item(
    "panel",
    panelExpanded,
    {
      // Where the panel gives the focus back when it closes.
      "data-annotation-button": "",
      "aria-expanded": panelExpanded,
      "aria-label": count > 0 ? `${labels.panelTitle}, ${count} op deze pagina` : undefined,
      onClick: () => {
        if (!annotationMode) {
          setAnnotationMode(true);
          setPanelOpen(true);
        } else setPanelOpen(!panelOpen);
      },
    },
    React.createElement(MessageChatSquareIcon, { size: 16 }),
    labels.panelTitle,
    count
  );

  // ARIA's toolbar pattern: the arrow keys, Home and End move between the buttons.
  const onKeyDown = (e: React.KeyboardEvent) => {
    const list = Array.from(railRef.current?.querySelectorAll<HTMLElement>(".orbit-rail__item") ?? []);
    const at = list.indexOf(document.activeElement as HTMLElement);
    if (at < 0) return;
    const last = list.length - 1;
    const to =
      e.key === "ArrowRight" ? (at >= last ? 0 : at + 1)
        : e.key === "ArrowLeft" ? (at <= 0 ? last : at - 1)
          : e.key === "Home" ? 0
            : e.key === "End" ? last
              : -1;
    if (to < 0) return;
    e.preventDefault();
    list[to].focus();
  };

  return React.createElement(
    React.Fragment,
    null,
    React.createElement(
      "div",
      {
        ref: railRef,
        role: "toolbar",
        "aria-label": labels.rail,
        "aria-orientation": "horizontal",
        [ORBIT_UI_ATTR]: "",
        className: cx("orbit-root", "orbit-rail", overlay && "orbit-rail--overlay"),
        onKeyDown,
      },
      React.createElement("div", { className: "orbit-rail__group" }, variantsButton),
      React.createElement("div", { className: "orbit-rail__group" }, inspectorButton, panelButton),
      React.createElement("p", { className: "orbit-sr-only", role: "status" }, spoken)
    ),
    hasVariants && variantsOpen
      ? React.createElement(VariantsPane, {
          id: paneId,
          variants: variants!,
          onClose: closeVariants,
          onAnnounce: setSpoken,
        })
      : null
  );
}
