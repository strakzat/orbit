import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useAnnotations } from "../context/use-annotations";
import { ORBIT_UI_ATTR } from "../constants";
import { cx } from "../utils/cx";
import { isOnPage } from "../utils/route-matching";
import { useStableId } from "../utils/use-stable-id";
import { ClockRewindIcon, MessageChatSquareIcon, MessagePlusSquareIcon, SettingsIcon, SlidersIcon, UserIcon, XIcon } from "../icons";
import { fill } from "../labels";
import { initials } from "../utils/format";
import { INSPECTOR_TOGGLE_ATTR } from "./inspector";
import { ChangesPane, createChangesMemory } from "./changes-pane";
import { VariantsPane, createVariantsMemory } from "./variants-pane";
import { ProfilePane } from "./profile-pane";
import { OrbitTour } from "./orbit-tour";
import { isChanged, variantsHere } from "../utils/variants";
import { changeCount } from "../utils/changelog";
import { tourSteps } from "../utils/tour";
import { useChanges } from "../hooks/use-changes";
import type { OrbitRelease, OrbitVariant, TourStepId } from "../types";

// The step that points at each button of the rail, and the buttons the viewer may press then.
const TOUR_TARGET: Record<string, TourStepId> = {
  variants: "variants",
  changes: "changes",
  inspector: "feedback",
  panel: "panel",
  profile: "profile",
};
const TOUR_PRESSABLE: TourStepId[] = ["feedback", "panel", "changes"];
const NO_RELEASES: OrbitRelease[] = [];

interface OrbitRailProps {
  variants?: OrbitVariant[];
  changelog?: OrbitRelease[];
  /** Laid over the foot of the window, for a shell without a frame. */
  overlay: boolean;
}

/**
 * The rail: Orbit's controls in a bar under the project, in Radial's tertiary buttons. On the left
 * the project's variants and what changed, with the version, when it has any; on the right the inspector and the panel, under the
 * corner the panel opens in, and at the end the viewer's profile. A toolbar: one stop for Tab, the arrow keys move between its buttons.
 */
// Long enough for a screen reader to see the live region empty.
const SPOKEN_DELAY_MS = 150;

export function OrbitRail({ variants, changelog = NO_RELEASES, overlay }: OrbitRailProps) {
  const {
    labels,
    panelOpen,
    setPanelOpen,
    inspectorActive,
    setInspectorActive,
    commentsConfig,
    project,
    allComments,
    currentAnnotations,
    currentRoute,
    componentsOnPage,
    language,
    viewer,
    setActiveAnnotationId,
    settings,
    tourStep,
    startTour,
    abandonTour,
    threadVariantsApplied,
  } = useAnnotations();

  const [variantsOpen, setVariantsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [changesOpen, setChangesOpen] = useState(false);
  // Closed, a pane is gone; the rail keeps where it was, so it opens there again. Until a reload.
  const [variantsMemory] = useState(createVariantsMemory);
  const [changesMemory] = useState(createChangesMemory);
  const [spoken, setSpoken] = useState("");
  const [focusIndex, setFocusIndex] = useState(0);
  const railRef = useRef<HTMLDivElement>(null);
  const touring = tourStep !== null;
  const paneId = useStableId("orbit-variants");
  const profileId = useStableId("orbit-profile");
  const changesId = useStableId("orbit-changes");

  // Passing a changelog is the opt-in. Nothing to show in any version: no button.
  const { unreadVersions, unreadCount, markRead } = useChanges(project || settings.projectName, changelog);
  const hasChanges = changelog.some((r) => changeCount(r) > 0);
  const version = hasChanges ? `v${changelog[0].version}` : "";

  // Passing `variants` is the opt-in: the button stays in its place on every page, also where
  // there is nothing to switch.
  const hasVariants = variants !== undefined;
  const here = variants ? variantsHere(variants, currentRoute) : [];
  // Off their defaults here: the prototype is not in the state it starts in.
  const changed = here.filter(isChanged).length;
  // The toolbar's one tab stop, kept on a button that is there: the list shrinks when the
  // variants or the comments go.
  const buttonCount = (hasVariants ? 1 : 0) + (hasChanges ? 1 : 0) + (commentsConfig ? 1 : 0) + 2;
  const tabStop = Math.min(focusIndex, buttonCount - 1);

  // What is open on this page: unresolved feedback, and the annotations here.
  const openFeedback = allComments.filter(
    (c) => c.status !== "Opgelost" && isOnPage(c, currentRoute, componentsOnPage)
  ).length;
  const count = currentAnnotations.length + openFeedback;

  // The tour starts by itself once for each viewer. The viewer is loaded by now: the shell only
  // renders the rail after mounting. Before the paint, so its black comes before the page does.
  // Only the rail can end a tour, so it goes with the rail. The same effect: StrictMode's simulated
  // unmount is followed by the start again, and the tour survives it.
  useLayoutEffect(() => {
    if (!viewer.tourSeen && settings.tour) startTour();
    return abandonTour;
  }, []);

  // The stage is the tour's, and it ends where it left off: on the profile.
  const wasTouring = useRef(false);
  useEffect(() => {
    if (touring) {
      setVariantsOpen(false);
      setProfileOpen(false);
      // Its step opens it, as the panel's does the panel.
      setChangesOpen(tourStep === "changes");
    } else if (wasTouring.current) {
      setChangesOpen(false);
      railRef.current?.querySelector<HTMLElement>("[data-orbit-profile-toggle]")?.focus();
    }
    wasTouring.current = touring;
  }, [touring, tourStep]);

  // The page changed without the viewer touching a variant, and a screen reader doesn't see it.
  // Emptied first: the same sentence twice is no change to a live region. One sentence for all of a
  // thread's variants, and only for what happened since this rail is here.
  const appliedAtMount = useRef(threadVariantsApplied);
  useEffect(() => {
    if (threadVariantsApplied === appliedAtMount.current) return;
    setSpoken("");
    const timer = window.setTimeout(() => setSpoken(labels.variantsAppliedSpoken), SPOKEN_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [threadVariantsApplied]);

  const closeVariants = useCallback((returnFocus: boolean) => {
    setVariantsOpen(false);
    if (returnFocus) railRef.current?.querySelector<HTMLElement>("[data-orbit-variants-toggle]")?.focus();
  }, []);

  // Gone with its button, so it doesn't come back open with it.
  useEffect(() => {
    if (!hasChanges) setChangesOpen(false);
  }, [hasChanges]);

  const closeChanges = useCallback((returnFocus: boolean) => {
    setChangesOpen(false);
    if (returnFocus) railRef.current?.querySelector<HTMLElement>("[data-orbit-changes-toggle]")?.focus();
  }, []);

  const closeProfile = useCallback((returnFocus: boolean) => {
    setProfileOpen(false);
    if (returnFocus) railRef.current?.querySelector<HTMLElement>("[data-orbit-profile-toggle]")?.focus();
  }, []);

  const buttons: React.ReactElement[] = [];
  const item = (
    key: string,
    isOn: boolean,
    extra: Record<string, unknown>,
    icon: React.ReactNode,
    label: React.ReactNode,
    badge?: number,
    dot?: boolean
  ) => {
    const index = buttons.length;
    const pointedAt = tourStep !== null && TOUR_TARGET[key] === tourStep;
    const pressable = pointedAt && TOUR_PRESSABLE.includes(tourStep);
    buttons.push(
      React.createElement(
        "button",
        {
          key,
          type: "button",
          // In the tour the one button that works is the tab stop: the others are disabled.
          tabIndex: (touring ? pressable : index === tabStop) ? 0 : -1,
          onFocus: () => setFocusIndex(index),
          ...extra,
          disabled: touring && !pressable,
          className: cx(
            "orbit-rail__item",
            // What the tour points at looks as it does when it's on, in the live rail.
            (isOn || pointedAt) && "orbit-rail__item--on",
            extra.className as string | undefined
          ),
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
          onClick: () => {
            // The two open in the same place.
            setChangesOpen(false);
            setVariantsOpen((open) => !open);
          },
        },
        React.createElement(SlidersIcon, { size: 16 }),
        labels.variants,
        undefined,
        changed > 0
      )
    : null;

  const changesButton = hasChanges
    ? item(
        "changes",
        changesOpen,
        {
          "data-orbit-changes-toggle": "",
          "aria-expanded": changesOpen,
          "aria-controls": changesOpen ? changesId : undefined,
          "aria-label":
            unreadCount > 0 ? fill(labels.changesUnread, { name: `${labels.changes} ${version}`, count: unreadCount }) : undefined,
          onClick: () => {
            setVariantsOpen(false);
            setProfileOpen(false);
            setChangesOpen((open) => !open);
          },
        },
        React.createElement(ClockRewindIcon, { size: 16 }),
        React.createElement(
          React.Fragment,
          null,
          labels.changes,
          // The space is for the button's name; the gap between them is the button's.
          " ",
          React.createElement("span", { className: "orbit-rail__version" }, version)
        ),
        unreadCount
      )
    : null;

  const inspectorButton = commentsConfig
    ? item(
        "inspector",
        inspectorActive,
        {
          [INSPECTOR_TOGGLE_ATTR]: "",
          "aria-pressed": inspectorActive,
          title: settings.keyboardShortcut
            ? inspectorActive ? labels.inspectorStop : labels.placeFeedbackShortcut
            : undefined,
          "aria-keyshortcuts": settings.keyboardShortcut ? "C" : undefined,
          onClick: () => setInspectorActive(!inspectorActive),
        },
        React.createElement(MessagePlusSquareIcon, { size: 16 }),
        React.createElement(
          React.Fragment,
          null,
          labels.placeFeedback,
          // While picking, a × opens up at the end: the same button ends the mode. Always
          // rendered, so it can grow in and out rather than appear.
          React.createElement(
            "span",
            { className: "orbit-rail__close", "aria-hidden": true },
            React.createElement("span", null, React.createElement(XIcon, { size: 14 }))
          )
        )
      )
    : null;

  // Without feedback the panel is the annotations.
  const panelTitle = commentsConfig ? labels.panelTitle : labels.panelTitleAnnotations;
  const panelButton = item(
    "panel",
    panelOpen,
    {
      // Where the panel gives the focus back when it closes.
      "data-annotation-button": "",
      "aria-expanded": panelOpen,
      "aria-label": count > 0 ? `${panelTitle}, ${fill(labels.onThisPage, { count })}` : undefined,
      onClick: () => setPanelOpen(!panelOpen),
    },
    React.createElement(MessageChatSquareIcon, { size: 16 }),
    panelTitle,
    count
  );

  // The viewer as a monogram once they have a name, the profile icon until then. The name is for
  // feedback: without it there is no one to show, only settings.
  const name = commentsConfig ? viewer.name.trim() : "";
  const profileButton = item(
    "profile",
    profileOpen,
    {
      className: "orbit-rail__item--avatar",
      "data-orbit-profile-toggle": "",
      "aria-expanded": profileOpen,
      "aria-controls": profileOpen ? profileId : undefined,
      "aria-label": name ? fill(labels.profileNamed, { name }) : commentsConfig ? labels.profile : labels.settings,
      onClick: () => {
        if (profileOpen) return setProfileOpen(false);
        // The profile has the stage to itself: the panel, a popover, the inspector and the
        // variants all close. The pins stay: whether they show is the viewer's own setting.
        setPanelOpen(false);
        setInspectorActive(false);
        setActiveAnnotationId(null);
        setVariantsOpen(false);
        setChangesOpen(false);
        setProfileOpen(true);
      },
    },
    name
      ? React.createElement("span", { className: "orbit-rail__monogram", "aria-hidden": true }, initials(name))
      : React.createElement(commentsConfig ? UserIcon : SettingsIcon, { size: 16 }),
    null
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
        lang: language,
        "aria-orientation": "horizontal",
        [ORBIT_UI_ATTR]: "",
        className: cx("orbit-root", "orbit-rail", hasChanges && "orbit-rail--changes", overlay && "orbit-rail--overlay"),
        onKeyDown,
      },
      React.createElement("div", { className: "orbit-rail__group" }, variantsButton, changesButton),
      React.createElement("div", { className: "orbit-rail__group" }, inspectorButton, panelButton, profileButton),
      React.createElement("p", { className: "orbit-sr-only", role: "status" }, spoken)
    ),
    hasVariants && variantsOpen
      ? React.createElement(VariantsPane, {
          id: paneId,
          variants: variants!,
          onClose: closeVariants,
          onAnnounce: setSpoken,
          memory: variantsMemory,
        })
      : null,
    hasChanges && changesOpen
      ? React.createElement(ChangesPane, {
          id: changesId,
          releases: changelog,
          unreadVersions,
          onRead: markRead,
          onClose: closeChanges,
          memory: changesMemory,
        })
      : null,
    profileOpen
      ? React.createElement(ProfilePane, { id: profileId, onClose: closeProfile, onAnnounce: setSpoken })
      : null,
    touring
      ? React.createElement(OrbitTour, {
          steps: tourSteps({ hasVariants, hasChanges, hasComments: !!commentsConfig }),
          changesOpen,
          onAnnounce: setSpoken,
        })
      : null
  );
}
