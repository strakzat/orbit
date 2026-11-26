import React, { useEffect, useRef, useState } from "react";
import { useAnnotations } from "../context/use-annotations";
import { ORBIT_UI_ATTR } from "../constants";
import { usePaged } from "../hooks/use-paged";
import { useRememberedScroll, type ScrollMemory } from "../hooks/use-remembered-scroll";
import { ChevronLeftIcon, XIcon } from "../icons";
import { fill } from "../labels";
import { CHANGE_SECTIONS, changeCount, inlineParts, plainText, type InlinePart } from "../utils/changelog";
import { cx } from "../utils/cx";
import { formatDate } from "../utils/format";
import { useStableId } from "../utils/use-stable-id";
import type { AnnotationLabels, OrbitRelease } from "../types";

/** Keep a Changelog's own sections in the viewer's language; any other as the project wrote it. */
function sectionTitle(title: string, labels: AnnotationLabels): string {
  const known = CHANGE_SECTIONS.find((s) => s.toLowerCase() === title.toLowerCase());
  return known ? labels[`changes${known}`] : title;
}

/** "2 added, 1 fixed". Changes without a section are just changes. */
function summary(release: OrbitRelease, labels: AnnotationLabels): string {
  return release.sections
    .filter(({ entries }) => entries.length > 0)
    .map(({ title, entries }) => {
      const plain = entries.length === 1 ? labels.changesOne : labels.changes;
      return `${entries.length} ${(title ? sectionTitle(title, labels) : plain).toLowerCase()}`;
    })
    .join(", ");
}

/** React elements, never HTML: a changelog is text, whatever is in it. */
function inline(parts: InlinePart[]): React.ReactNode[] {
  return parts.map((part, key) => {
    switch (part.type) {
      case "text":
        return part.text;
      case "code":
        return React.createElement("code", { key, className: "orbit-changes__code" }, part.text);
      case "bold":
        return React.createElement("strong", { key, className: "orbit-changes__bold" }, ...inline(part.parts));
      case "link":
        return React.createElement(
          "a",
          { key, className: "orbit-changes__link", href: part.href, target: "_blank", rel: "noopener noreferrer" },
          ...inline(part.parts)
        );
    }
  });
}

/**
 * Where the pane was left, kept by the rail while it is closed: the open version, and how far the
 * list and that version were scrolled. Until a reload.
 */
export interface ChangesMemory {
  version: string | null;
  list: ScrollMemory;
  page: ScrollMemory;
}

export function createChangesMemory(): ChangesMemory {
  return { version: null, list: { top: 0 }, page: { top: 0 } };
}

interface ReleaseCardProps {
  release: OrbitRelease;
  isNew: boolean;
  onOpen: (e: React.MouseEvent<HTMLElement>) => void;
}

function ReleaseCard({ release, isNew, onOpen }: ReleaseCardProps) {
  const { labels } = useAnnotations();
  const id = useStableId("orbit-release");
  return React.createElement(
    "div",
    { className: "orbit-card" },
    React.createElement("button", {
      type: "button",
      className: "orbit-card__target",
      // What Back focuses after a version the pane opened on.
      "data-orbit-release": release.version,
      onClick: onOpen,
      "aria-labelledby": isNew ? `${id}-title ${id}-new` : `${id}-title`,
      "aria-describedby": `${id}-foot`,
    }),
    React.createElement(
      "div",
      { className: "orbit-card__head" },
      React.createElement(
        "span",
        { className: "orbit-card__title", id: `${id}-title` },
        fill(labels.changesVersion, { version: release.version })
      ),
      isNew && React.createElement("span", { className: "orbit-changes__new", id: `${id}-new` }, labels.changesNew)
    ),
    React.createElement(
      "p",
      { className: "orbit-card__body orbit-changes__preview" },
      plainText(release.sections.find((s) => s.entries.length > 0)?.entries[0] ?? "")
    ),
    React.createElement(
      "div",
      { className: "orbit-card__foot", id: `${id}-foot` },
      React.createElement("span", null, summary(release, labels)),
      release.date && React.createElement("span", { className: "orbit-meta" }, formatDate(release.date))
    )
  );
}

interface ChangesPaneProps {
  id: string;
  releases: OrbitRelease[];
  unreadVersions: Set<string>;
  onRead: (version: string) => void;
  /** `true` when the focus should go back to the rail's button: Escape or the close button. */
  onClose: (returnFocus: boolean) => void;
  memory: ChangesMemory;
}

/**
 * What changed, over the foot of the window on the rail's left, where the variants pane is: a card
 * for each version, and the version as the pane's next page, as the panel opens a thread. Opening a
 * version reads it. A non-modal dialog, as the variants pane: Escape goes back a page and then
 * closes it, a press outside closes it.
 */
export function ChangesPane({ id, releases, unreadVersions, onRead, onClose, memory: kept }: ChangesPaneProps) {
  const { labels, settings, language, tourStep } = useAnnotations();
  const paneRef = useRef<HTMLDivElement>(null);
  const titleId = useStableId("orbit-changes-title");
  const pageTitleId = useStableId("orbit-changes-page");
  const listed = releases.filter((r) => changeCount(r) > 0);
  // In the tour the focus is on its card, and the card and the scrim around the pane aren't outside it.
  const touring = tourStep !== null;
  // It opens where it was left: on the version that was open, scrolled as it was. Not in the tour,
  // whose step is about the list: opened there, it has a memory of its own, and the rail's stays as it was.
  const [memory] = useState(() => (touring ? createChangesMemory() : kept));
  const [restored] = useState(() => listed.find((r) => r.version === memory.version) ?? null);
  const { page: release, isOpen, backRef, openerRef, open, back } = usePaged<OrbitRelease>(paneRef, restored);
  const listScroll = useRememberedScroll<HTMLDivElement>(memory.list);
  const pageScroll = useRememberedScroll<HTMLDivElement>(memory.page);

  const goBack = () => {
    memory.version = null;
    back();
  };

  useEffect(() => {
    if (restored) {
      // On its version, the focus is on Back (`usePaged`), and Back goes to its card.
      openerRef.current = paneRef.current?.querySelector<HTMLElement>(
        `[data-orbit-release="${CSS.escape(restored.version)}"]`
      ) ?? null;
      return;
    }
    if (touring) return;
    paneRef.current?.querySelector<HTMLElement>(".orbit-icon-button")?.focus();
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      const active = document.activeElement as HTMLElement | null;
      const inside = paneRef.current?.contains(active);
      if (!inside && !active?.closest("[data-orbit-changes-toggle]")) return;
      // Handled: closing moves the focus, and the tour must not take the same key to end.
      e.preventDefault();
      if (inside && isOpen) goBack();
      else onClose(true);
    };
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement;
      if (touring) return;
      // The rail's own button toggles the pane itself.
      if (paneRef.current?.contains(target) || target.closest("[data-orbit-changes-toggle]")) return;
      onClose(false);
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown, true);
    };
  }, [onClose, isOpen, back, touring, memory]);

  const close = React.createElement(
    "button",
    {
      type: "button",
      className: "orbit-icon-button",
      "aria-label": labels.changesClose,
      onClick: () => onClose(true),
    },
    React.createElement(XIcon, { size: 16 })
  );

  return React.createElement(
    "div",
    {
      ref: paneRef,
      id,
      role: "dialog",
      "aria-labelledby": titleId,
      [ORBIT_UI_ATTR]: "",
      "data-orbit-changes-pane": "",
      lang: language,
      className: "orbit-root orbit-variants orbit-glass-pane orbit-animate-in",
      style: { width: settings.panelWidth, height: settings.panelHeight },
    },
    React.createElement(
      "div",
      { className: cx("orbit-panel__page", "orbit-panel__page--list", !isOpen && "orbit-panel__page--in") },
      React.createElement(
        "div",
        { className: "orbit-variants__header" },
        React.createElement("h2", { id: titleId, className: "orbit-variants__heading" }, labels.changes),
        close
      ),
      React.createElement(
        "div",
        { ref: listScroll.ref, onScroll: listScroll.onScroll, className: "orbit-list" },
        ...listed.map((r) =>
          React.createElement(ReleaseCard, {
            key: r.version,
            release: r,
            isNew: unreadVersions.has(r.version),
            onOpen: (e: React.MouseEvent<HTMLElement>) => {
              memory.version = r.version;
              memory.page.top = 0;
              open(r, e.currentTarget);
              onRead(r.version);
            },
          })
        )
      )
    ),
    React.createElement(
      "div",
      { className: cx("orbit-panel__page", "orbit-panel__page--thread", isOpen && "orbit-panel__page--in") },
      release &&
        React.createElement(
          React.Fragment,
          null,
          React.createElement(
            "div",
            { className: "orbit-panel__header" },
            React.createElement(
              "button",
              {
                ref: backRef,
                type: "button",
                className: "orbit-back",
                onClick: goBack,
                "aria-label": fill(labels.threadBack, { view: labels.changes }),
              },
              React.createElement(ChevronLeftIcon, { size: 16 }),
              labels.changes
            ),
            close
          ),
          React.createElement(
            "div",
            {
              key: release.version,
              ref: pageScroll.ref,
              onScroll: pageScroll.onScroll,
              className: "orbit-thread-page orbit-changes__page",
              role: "region",
              "aria-labelledby": pageTitleId,
              // A long version scrolls with the arrow keys too.
              tabIndex: 0,
            },
            React.createElement(
              "div",
              { className: "orbit-changes__head" },
              React.createElement(
                "h3",
                { id: pageTitleId, className: "orbit-changes__version" },
                fill(labels.changesVersion, { version: release.version })
              ),
              release.date && React.createElement("p", { className: "orbit-changes__date" }, formatDate(release.date))
            ),
            ...release.sections.filter((s) => s.entries.length > 0).map((section) =>
              React.createElement(
                "section",
                { key: section.title, className: "orbit-changes__section" },
                section.title
                  ? React.createElement(
                      "h4",
                      { className: "orbit-changes__title" },
                      sectionTitle(section.title, labels)
                    )
                  : null,
                React.createElement(
                  "ul",
                  { className: "orbit-changes__list" },
                  ...section.entries.map((entry, key) =>
                    React.createElement("li", { key, className: "orbit-changes__item" }, ...inline(inlineParts(entry)))
                  )
                )
              )
            )
          )
        )
    )
  );
}
