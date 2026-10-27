import React, { useEffect, useRef } from "react";
import { useAnnotations } from "../context/use-annotations";
import { ORBIT_UI_ATTR } from "../constants";
import { LABELS, LANGUAGE_NAMES } from "../labels";
import { UserIcon, XIcon } from "../icons";
import { initials } from "../utils/format";
import { useStableId } from "../utils/use-stable-id";
import { Choice } from "./variants-pane";
import type { OrbitChoiceVariant, OrbitLanguage } from "../types";

interface ProfilePaneProps {
  id: string;
  /** `true` when the focus should go back to the rail's button: Escape or the close button. */
  onClose: (returnFocus: boolean) => void;
  onAnnounce: (text: string) => void;
}

/**
 * Who is looking: the name their feedback goes out under, and the language Orbit is in. Over the
 * rail's right end, where its button is; opening it closes everything else Orbit has open (the
 * rail does that). The monogram is a preview, centred, with the name typed straight in under it.
 * A non-modal dialog, as the variants pane: the focus on the name when it opens, Escape and a
 * press outside close it.
 */
export function ProfilePane({ id, onClose, onAnnounce }: ProfilePaneProps) {
  const { labels, language, viewer, setViewerName, setViewerLanguage } = useAnnotations();
  const paneRef = useRef<HTMLDivElement>(null);
  const titleId = useStableId("orbit-profile-title");
  const nameId = useStableId("orbit-profile-name");
  const nameHintId = useStableId("orbit-profile-name-hint");
  const name = viewer.name.trim();

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

  // The variants pane's own control, so the switch looks and answers the keys as a variant does.
  const languageChoice: OrbitChoiceVariant = {
    type: "choice",
    id: "orbit-language",
    title: labels.profileLanguage,
    display: "segments",
    options: (Object.keys(LABELS) as OrbitLanguage[]).map((code) => ({ id: code, label: LANGUAGE_NAMES[code] })),
    value: language,
    onChange: (code) => setViewerLanguage(code as OrbitLanguage),
  };

  return React.createElement(
    "div",
    {
      ref: paneRef,
      id,
      role: "dialog",
      "aria-labelledby": titleId,
      lang: language,
      [ORBIT_UI_ATTR]: "",
      className: "orbit-root orbit-profile orbit-glass-pane orbit-animate-in",
    },
    React.createElement(
      "div",
      { className: "orbit-variants__header" },
      React.createElement("h2", { id: titleId, className: "orbit-variants__heading" }, labels.profileTitle),
      React.createElement(
        "button",
        {
          type: "button",
          className: "orbit-icon-button",
          "aria-label": labels.profileClose,
          onClick: () => onClose(true),
        },
        React.createElement(XIcon, { size: 16 })
      )
    ),
    React.createElement(
      "div",
      { className: "orbit-profile__body" },
      // Who they are, as the rail and a comment will show them: the monogram over the name. The
      // name is typed straight in, on the pane rather than in a field.
      React.createElement(
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
          autoComplete: "name",
          spellCheck: false,
          placeholder: labels.profileNamePlaceholder,
          value: viewer.name,
          "aria-describedby": nameHintId,
          onChange: (e: React.ChangeEvent<HTMLInputElement>) => setViewerName(e.target.value),
        }),
        React.createElement("p", { id: nameHintId, className: "orbit-profile__hint" }, labels.profileNameHint)
      ),
      React.createElement(Choice, { variant: languageChoice, onAnnounce })
    )
  );
}
