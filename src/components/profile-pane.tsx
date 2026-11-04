import React, { useEffect, useRef } from "react";
import { useAnnotations } from "../context/use-annotations";
import { NO_AUTOFILL, ORBIT_UI_ATTR } from "../constants";
import { LABELS, LANGUAGE_NAMES } from "../labels";
import { UserIcon, XIcon } from "../icons";
import { initials } from "../utils/format";
import { useStableId } from "../utils/use-stable-id";
import { Choice, Switch } from "./variants-pane";
import type { OrbitChoiceVariant, OrbitLanguage, OrbitSwitchVariant } from "../types";

/** Who they are, as the rail and a comment will show them: the monogram over the name. The name
    is typed straight in, on the pane rather than in a field. The profile and the tour's welcome. */
export function ViewerIdentity({ required }: { required?: boolean }) {
  const { labels, viewer, setViewerName } = useAnnotations();
  const nameId = useStableId("orbit-profile-name");
  const nameHintId = useStableId("orbit-profile-name-hint");
  const name = viewer.name.trim();

  return React.createElement(
    "div",
    { className: "orbit-profile__identity" },
    React.createElement(
      "span",
      { className: "orbit-profile__avatar", "aria-hidden": true },
      name ? initials(name) : React.createElement(UserIcon, { size: 28 })
    ),
    React.createElement("label", { htmlFor: nameId, className: "orbit-sr-only" }, labels.formName),
    React.createElement("input", {
      id: nameId,
      className: "orbit-profile__name",
      type: "text",
      ...NO_AUTOFILL,
      spellCheck: false,
      placeholder: labels.profileNamePlaceholder,
      value: viewer.name,
      "aria-describedby": nameHintId,
      "aria-required": required || undefined,
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => setViewerName(e.target.value),
    }),
    React.createElement("p", { id: nameHintId, className: "orbit-profile__hint" }, labels.profileNameHint)
  );
}

/** The variants pane's own control, so the switch looks and answers the keys as a variant does. */
export function LanguageChoice({ onAnnounce }: { onAnnounce: (text: string) => void }) {
  const { labels, language, setViewerLanguage } = useAnnotations();
  const variant: OrbitChoiceVariant = {
    type: "choice",
    id: "orbit-language",
    title: labels.profileLanguage,
    display: "segments",
    options: (Object.keys(LABELS) as OrbitLanguage[]).map((code) => ({ id: code, label: LANGUAGE_NAMES[code] })),
    value: language,
    onChange: (code) => setViewerLanguage(code as OrbitLanguage),
  };
  return React.createElement(Choice, { variant, onAnnounce });
}

interface ProfilePaneProps {
  id: string;
  /** `true` when the focus should go back to the rail's button: Escape or the close button. */
  onClose: (returnFocus: boolean) => void;
  onAnnounce: (text: string) => void;
}

/**
 * Who is looking: the name their feedback goes out under, and the language Orbit is in. Over the
 * rail's right end, where its button is; opening it closes everything else Orbit has open (the
 * rail does that). The monogram is a preview, centred, with the name typed straight in under it;
 * no title over it, only the close floating in the corner.
 * A non-modal dialog, as the variants pane: the focus on the name when it opens, Escape and a
 * press outside close it.
 */
export function ProfilePane({ id, onClose, onAnnounce }: ProfilePaneProps) {
  const {
    labels,
    language,
    annotationMode,
    setAnnotationMode,
    showResolvedPins,
    setViewerShowResolved,
    commentsConfig,
    settings,
    startTour,
  } = useAnnotations();
  const paneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    paneRef.current?.querySelector<HTMLElement>("input")?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      const active = document.activeElement as HTMLElement | null;
      if (paneRef.current?.contains(active) || active?.closest("[data-orbit-profile-toggle]")) onClose(true);
    };
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement;
      // The rail's own button toggles the pane itself.
      if (paneRef.current?.contains(target) || target.closest("[data-orbit-profile-toggle]")) return;
      onClose(false);
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown, true);
    };
  }, [onClose]);

  // The pins on the page: the viewer's own, so they see what is there, or a clean prototype.
  const isMac = typeof navigator !== "undefined" && /Mac|iP(hone|ad|od)/.test(navigator.platform);
  const markersSwitch: OrbitSwitchVariant = {
    type: "switch",
    id: "orbit-markers",
    title: labels.profileMarkers,
    value: annotationMode,
    onChange: setAnnotationMode,
  };
  // Resolved feedback keeps a dimmed pin, or none: done is done.
  const resolvedSwitch: OrbitSwitchVariant = {
    type: "switch",
    id: "orbit-resolved",
    title: labels.profileResolved,
    value: showResolvedPins,
    onChange: setViewerShowResolved,
  };
  // A shortcut as the keys themselves, a chip each.
  const keysHint = (keys: string[]) =>
    settings.keyboardShortcut
      ? React.createElement(
          React.Fragment,
          null,
          labels.profileMarkersHint,
          React.createElement(
            "span",
            { className: "orbit-keys" },
            keys.map((key) => React.createElement("kbd", { key, className: "orbit-key" }, key))
          )
        )
      : undefined;
  const markersHint = keysHint(isMac ? ["⌘", "."] : ["Ctrl", "."]);
  const resolvedHint = keysHint(isMac ? ["⇧", "R"] : ["Shift", "R"]);

  return React.createElement(
    "div",
    {
      ref: paneRef,
      id,
      role: "dialog",
      "aria-label": labels.profileTitle,
      lang: language,
      [ORBIT_UI_ATTR]: "",
      className: "orbit-root orbit-profile orbit-glass-pane orbit-animate-in",
    },
    React.createElement(
      "button",
      {
        type: "button",
        className: "orbit-icon-button orbit-profile__close",
        "aria-label": labels.profileClose,
        onClick: () => onClose(true),
      },
      React.createElement(XIcon, { size: 16 })
    ),
    React.createElement(
      "div",
      { className: "orbit-profile__body" },
      React.createElement(ViewerIdentity),
      React.createElement(LanguageChoice, { onAnnounce }),
      React.createElement(Switch, { variant: markersSwitch, onAnnounce, hint: markersHint }),
      // Only with feedback: without it there is nothing to resolve.
      commentsConfig && React.createElement(Switch, { variant: resolvedSwitch, onAnnounce, hint: resolvedHint }),
      React.createElement(
        "button",
        {
          type: "button",
          className: "orbit-profile__tour",
          onClick: () => {
            onClose(false);
            startTour();
          },
        },
        labels.profileTour
      )
    )
  );
}
