import React, { useState, useRef, useCallback, useEffect } from "react";
import { useAnnotations } from "../context/use-annotations";
import { useAnnotationStyles } from "../styles/inject";
import { cx } from "../utils/cx";
import { useStableId } from "../utils/use-stable-id";
import {
  findElementByAnnotationId,
  scrollToAndHighlight,
  showHoverHighlight,
  removeHoverHighlight,
} from "../utils/find-element";
import { matchRoute, navigateTo, routeBreadcrumb } from "../utils/route-matching";
import { STATUS_SLUGS } from "../styles/tokens";
import { XIcon, SearchIcon } from "../icons";
import { TYPE_ICONS } from "../constants";
import { AnnotationCard } from "./annotation-card";
import { CommentCard } from "./comment-card";
import type { Comment, AnnotationType } from "../types";

const ALL_TYPES: AnnotationType[] = [
  "documentation", "pro", "question", "con", "suggestion", "critical", "user-insight",
];
const ALL_STATUSES: Comment["status"][] = ["Open", "In behandeling", "Opgelost"];

export function AnnotationPanel() {
  useAnnotationStyles();

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const {
    annotationMode,
    setAnnotationMode,
    panelOpen,
    activeAnnotationId,
    setActiveAnnotationId,
    hoveredAnnotationId,
    setHoveredAnnotationId,
    currentAnnotations,
    allAnnotations,
    labels,
    settings,
    allComments: allFeedback,
    commentsLoading: feedbackLoading,
    commentsError: feedbackError,
    currentRoute,
  } = useAnnotations();

  // A project that writes no annotations uses Orbit for its feedback: open there.
  const [view, setView] = useState<"annotations" | "feedback">(allAnnotations.length > 0 ? "annotations" : "feedback");
  const [tab, setTab] = useState<"page" | "all">("page");
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<Set<AnnotationType>>(new Set());
  const [statusFilter, setStatusFilter] = useState<Set<Comment["status"]>>(new Set(["Open", "In behandeling"]));
  const panelRef = useRef<HTMLDivElement>(null);
  const activeCardRef = useRef<HTMLDivElement>(null);
  const searchId = useStableId("orbit-search");

  const { panelWidth, panelHeight } = settings;

  // Auto-scroll to active annotation card
  useEffect(() => {
    if (activeAnnotationId && activeCardRef.current) {
      activeCardRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [activeAnnotationId]);

  const close = useCallback(() => {
    // Move focus out before unmounting, and hand it back to the rail's button that
    // opened the panel rather than dropping it at the top of the document.
    setAnnotationMode(false);
    document.querySelector<HTMLElement>("[data-annotation-button]")?.focus();
  }, [setAnnotationMode]);

  useEffect(() => {
    if (!panelOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && panelRef.current?.contains(document.activeElement)) {
        close();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [panelOpen, close]);

  if (!mounted || !annotationMode || !panelOpen) return null;

  const sourceAnnotations = tab === "page" ? currentAnnotations : allAnnotations;
  const filtered = sourceAnnotations.filter((a) => {
    if (typeFilter.size > 0 && !typeFilter.has(a.type ?? "documentation")) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!a.title.toLowerCase().includes(q) && !a.body.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const pageFeedback = allFeedback.filter((c) => matchRoute(currentRoute, c.pagina ?? ""));
  const sourceFeedback = tab === "page" ? pageFeedback : allFeedback;
  const filteredFeedback = sourceFeedback.filter((c) => {
    if (statusFilter.size > 0 && !statusFilter.has(c.status)) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (
        !c.comment.toLowerCase().includes(q) &&
        !c.auteur.toLowerCase().includes(q) &&
        !(c.label ?? "").toLowerCase().includes(q)
      ) return false;
    }
    return true;
  });

  const tabCounts = {
    annotations: currentAnnotations.length,
    feedback: pageFeedback.filter((c) => c.status !== "Opgelost").length,
  };

  // No separate title bar: the panel's name lives in aria-label, and repeating
  // "Annotaties & Feedback" above two tabs called Annotaties and Feedback was a
  // row that said nothing. Close moves into the tab row. The panel no longer drags:
  // it stays above the rail's button that opens it.
  //
  // Two toggle buttons rather than an ARIA tablist: a tablist announces arrow-key
  // navigation, and we would be claiming a keyboard contract we do not implement.
  const header = React.createElement(
    "div",
    { className: "orbit-panel__header" },
    React.createElement(
      "div",
      { className: "orbit-tabs" },
      ...(["annotations", "feedback"] as const).map((v) =>
        React.createElement(
          "button",
          {
            key: v,
            type: "button",
            className: cx("orbit-tab", view === v && "orbit-tab--active"),
            onClick: () => setView(v),
            "aria-pressed": view === v,
          },
          v === "annotations" ? "Annotaties" : "Feedback",
          // Both counters are page-filtered, so the two tabs answer the same
          // question: how much is there to look at right here.
          tabCounts[v] > 0 &&
            React.createElement("span", { className: "orbit-count" }, tabCounts[v])
        )
      )
    ),
    React.createElement(
      "button",
      {
        type: "button",
        className: "orbit-icon-button",
        onClick: close,
        "aria-label": "Sluit paneel",
      },
      React.createElement(XIcon, { size: 16 })
    )
  );

  const subTabs = React.createElement(
    "div",
    { className: "orbit-subtabs" },
    ...[
      {
        key: "page" as const,
        label: labels.tabCurrentPage,
        count:
          view === "annotations"
            ? currentAnnotations.length
            : pageFeedback.filter((c) => statusFilter.size === 0 || statusFilter.has(c.status)).length,
      },
      {
        key: "all" as const,
        label: labels.tabAll,
        count:
          view === "annotations"
            ? allAnnotations.length
            : allFeedback.filter((c) => statusFilter.size === 0 || statusFilter.has(c.status)).length,
      },
    ].map((t) =>
      React.createElement(
        "button",
        {
          key: t.key,
          type: "button",
          className: cx("orbit-subtab", tab === t.key && "orbit-subtab--active"),
          onClick: () => setTab(t.key),
          "aria-pressed": tab === t.key,
        },
        t.label,
        React.createElement("span", { className: "orbit-subtab__count" }, t.count)
      )
    )
  );

  const search = React.createElement(
    "div",
    { className: "orbit-search" },
    React.createElement(
      "label",
      { className: "orbit-sr-only", htmlFor: searchId },
      view === "feedback" ? "Zoek feedback" : labels.searchPlaceholder
    ),
    React.createElement(
      "span",
      { className: "orbit-search__icon" },
      React.createElement(SearchIcon, { size: 14 })
    ),
    React.createElement("input", {
      id: searchId,
      className: "orbit-input",
      type: "search",
      placeholder: view === "feedback" ? "Zoek feedback..." : labels.searchPlaceholder,
      value: searchQuery,
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value),
    })
  );

  const filters = React.createElement(
    "div",
    { className: "orbit-filters" },
    ...(view === "annotations"
      ? ALL_TYPES.map((t) => {
          const isOn = typeFilter.has(t);
          const Icon = TYPE_ICONS[t];
          return React.createElement(
            "button",
            {
              key: t,
              type: "button",
              className: cx("orbit-filter", isOn && "orbit-filter--active"),
              "data-orbit-type": t,
              "aria-pressed": isOn,
              onClick: () =>
                setTypeFilter((prev) => {
                  const next = new Set(prev);
                  if (next.has(t)) next.delete(t);
                  else next.add(t);
                  return next;
                }),
            },
            React.createElement(Icon, { size: 12 }),
            t.charAt(0).toUpperCase() + t.slice(1)
          );
        })
      : ALL_STATUSES.map((s) => {
          const isOn = statusFilter.has(s);
          return React.createElement(
            "button",
            {
              key: s,
              type: "button",
              className: cx("orbit-filter", isOn && "orbit-filter--active"),
              "data-orbit-status": STATUS_SLUGS[s],
              "aria-pressed": isOn,
              onClick: () =>
                setStatusFilter((prev) => {
                  const next = new Set(prev);
                  if (next.has(s)) next.delete(s);
                  else next.add(s);
                  return next;
                }),
            },
            s
          );
        })
    )
  );

  const annotationList = React.createElement(
    "div",
    { className: "orbit-list" },
    filtered.length === 0
      ? React.createElement("p", { className: "orbit-empty", role: "status" }, labels.noResults)
      : filtered.map((annotation) =>
          React.createElement(
            "div",
            {
              key: annotation.id,
              ref: annotation.id === activeAnnotationId ? activeCardRef : undefined,
            },
            React.createElement(AnnotationCard, {
              annotation,
              isActive: annotation.id === activeAnnotationId,
              isHovered: annotation.id === hoveredAnnotationId,
              // The card is the index; the popover on the page is where you read
              // the annotation. So the card selects rather than expands — that is
              // also what keeps the same text from appearing twice at once.
              onSelect: () => {
                const isOpen = annotation.id === activeAnnotationId;
                setActiveAnnotationId(isOpen ? null : annotation.id);
                if (isOpen) return;

                // An annotation for another route has no marker here to open. Go
                // to that route first; the popover follows once it renders.
                if (
                  annotation.target !== "global" &&
                  !matchRoute(annotation.target, currentRoute)
                ) {
                  navigateTo(annotation.target);
                  return;
                }

                const el = findElementByAnnotationId(
                  annotation.elementId || annotation.id
                );
                if (el) scrollToAndHighlight(el);
              },
              onHoverStart: (id: string) => setHoveredAnnotationId(id),
              onHoverEnd: () => setHoveredAnnotationId(null),
            })
          )
        )
  );

  const feedbackEmpty =
    feedbackLoading && filteredFeedback.length === 0
      ? { message: "Feedback laden...", isError: false }
      : feedbackError && filteredFeedback.length === 0
        ? { message: "Fout bij laden feedback", isError: true }
        : filteredFeedback.length === 0
          ? { message: "Nog geen feedback", isError: false }
          : null;

  const feedbackList = React.createElement(
    "div",
    { className: "orbit-list orbit-list--comments" },
    feedbackEmpty
      ? React.createElement(
          "p",
          {
            className: cx("orbit-empty", feedbackEmpty.isError && "orbit-empty--error"),
            role: feedbackEmpty.isError ? "alert" : "status",
          },
          feedbackEmpty.message
        )
      : filteredFeedback.map((c: Comment) =>
          React.createElement(CommentCard, {
            key: c.id,
            comment: c,
            showLabel: true,
            isActive: !!c.annotationId && c.annotationId === activeAnnotationId,
            activateLabel: `Feedback van ${c.auteur}${c.label ? ` op ${c.label}` : ""}`,
            // Same model as an annotation card: the panel is the index, and the
            // thread opens on the page next to the element it belongs to.
            onSelect: c.annotationId
              ? () => {
                  const isOpen = c.annotationId === activeAnnotationId;
                  setActiveAnnotationId(isOpen ? null : c.annotationId!);
                  if (isOpen) return;

                  if (c.pagina && !matchRoute(currentRoute, c.pagina)) {
                    navigateTo(c.pagina);
                    return;
                  }

                  const el = findElementByAnnotationId(c.annotationId!);
                  if (el) scrollToAndHighlight(el);
                }
              : undefined,
            onMouseEnter: c.annotationId
              ? () => {
                  const el = findElementByAnnotationId(c.annotationId!);
                  if (el) showHoverHighlight(el);
                }
              : undefined,
            onMouseLeave: removeHoverHighlight,
            footer: c.pagina
              ? React.createElement(
                  "div",
                  { className: "orbit-comment__foot" },
                  React.createElement(
                    "button",
                    {
                      type: "button",
                      className: "orbit-link",
                      onClick: (e: React.MouseEvent) => {
                        e.stopPropagation();
                        navigateTo(c.pagina!);
                      },
                    },
                    routeBreadcrumb(c.pagina)
                  )
                )
              : undefined,
          })
        )
  );

  return React.createElement(
    "div",
    {
      ref: panelRef,
      className: cx("orbit-root", "orbit-panel", "orbit-glass-pane", "orbit-animate-in"),
      // Bottom right above the rail, by the stylesheet; only the project's size is inline.
      style: { width: panelWidth, height: panelHeight },
      role: "complementary",
      "aria-label": labels.panelTitle,
    },
    header,
    subTabs,
    search,
    filters,
    view === "annotations" ? annotationList : feedbackList
  );
}
