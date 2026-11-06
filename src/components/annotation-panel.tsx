import React, { useState, useRef, useCallback, useEffect } from "react";
import { useAnnotations } from "../context/use-annotations";
import { useAnnotationStyles } from "../styles/inject";
import { cx } from "../utils/cx";
import { useStableId } from "../utils/use-stable-id";
import { findElementByAnnotationId } from "../utils/find-element";
import { isOnPage, matchRoute, navigateTo } from "../utils/route-matching";
import { STATUS_SLUGS } from "../styles/tokens";
import { XIcon, SearchIcon } from "../icons";
import { TYPE_ICONS } from "../constants";
import { fill } from "../labels";
import { AnnotationCard } from "./annotation-card";
import { CommentCard } from "./comment-card";
import { ThreadPage, type PanelThread } from "./thread-page";
import { Spotlight } from "./spotlight";
import type { Comment, AnnotationType } from "../types";

const ALL_TYPES: AnnotationType[] = [
  "documentation", "pro", "question", "con", "suggestion", "critical", "user-insight",
];
// The thread's slide out (.orbit-panel__page, --orbit-duration-slow), and a little room.
const THREAD_EXIT_MS = 300;

const ALL_STATUSES: Comment["status"][] = ["Open", "In behandeling", "Opgelost"];
const UNRESOLVED: Comment["status"][] = ["Open", "In behandeling"];

export function AnnotationPanel() {
  useAnnotationStyles();

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const {
    panelOpen,
    setPanelOpen,
    activeAnnotationId,
    setActiveAnnotationId,
    hoveredAnnotationId,
    currentAnnotations,
    allAnnotations,
    labels,
    settings,
    allComments: allFeedback,
    commentsLoading: feedbackLoading,
    commentsError: feedbackError,
    currentRoute,
    componentsOnPage,
    language,
    inspectorActive,
    tourStep,
    threadVariantsApplied,
  } = useAnnotations();

  // A project that writes no annotations uses Orbit for its feedback: open there.
  // Until the viewer picks one, it follows the annotations: a project may load them after mount.
  const [pickedView, setView] = useState<"annotations" | "feedback" | null>(null);
  const view = pickedView ?? (allAnnotations.length > 0 ? "annotations" : "feedback");
  const [tab, setTab] = useState<"page" | "all">("page");
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<Set<AnnotationType>>(new Set());
  const [statusFilter, setStatusFilter] = useState<Set<Comment["status"]>>(new Set(UNRESOLVED));
  const panelRef = useRef<HTMLDivElement>(null);
  const activeCardRef = useRef<HTMLDivElement>(null);
  const searchId = useStableId("orbit-search");

  // A thread opened from a card is a page of the panel, pushed over the list. It stays rendered
  // after Back until it has slid out; `threadOpen` says which page is in view.
  const [thread, setThread] = useState<PanelThread | null>(null);
  const [threadOpen, setThreadOpen] = useState(false);
  const backRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  // The spotlight the inspector picks with: on the card under the mouse, and on the open thread's
  // element for as long as it is open. "This one" looks the same wherever it is said. The hovered
  // card by its key, so a card that leaves the list under the mouse (a filter, the poll) takes
  // its spotlight with it, without a mouseleave.
  const [hover, setHover] = useState<{ key: string; el: HTMLElement | null } | null>(null);
  const [threadEl, setThreadEl] = useState<HTMLElement | null>(null);

  // The card's own button, from the click: Safari does not focus a button it clicks, so the
  // focused element would not say which card it was.
  const openThread = (next: PanelThread, opener: HTMLElement) => {
    openerRef.current = opener;
    setHover(null);
    // One place to read it: a popover open on the page closes.
    setActiveAnnotationId(null);
    setThread(next);
    setThreadOpen(true);
  };

  const back = useCallback(() => setThreadOpen(false), []);

  // Slid out, the thread goes: its comments stop polling, and the next one starts fresh.
  useEffect(() => {
    if (threadOpen || !thread) return;
    const timer = window.setTimeout(() => setThread(null), THREAD_EXIT_MS);
    return () => window.clearTimeout(timer);
  }, [threadOpen, thread]);

  // The focus goes with the page: onto Back once the thread is in, and back to the card that
  // opened it once the list is. After the render, when the page is no longer hidden.
  const wasThreadOpen = useRef(false);
  useEffect(() => {
    if (threadOpen) backRef.current?.focus({ preventScroll: true });
    else if (wasThreadOpen.current && panelRef.current?.contains(openerRef.current)) {
      openerRef.current?.focus({ preventScroll: true });
    }
    wasThreadOpen.current = threadOpen;
  }, [threadOpen, thread]);

  // In the tour the panel opens on the sample annotation, and after it on what it usually does.
  // The panel stays mounted while it's closed, so what was filtered before a replay would hide it.
  useEffect(() => {
    if (tourStep === "panel") {
      setView("annotations");
      setSearchQuery("");
      setTypeFilter(new Set());
      setStatusFilter(new Set(UNRESOLVED));
    } else if (tourStep === null) {
      setView(null);
    }
  }, [tourStep]);

  // A closed panel opens on the list again.
  useEffect(() => {
    if (!panelOpen) {
      setThreadOpen(false);
      setHover(null);
    }
  }, [panelOpen]);

  // The open thread's element, also after the panel took the viewer to its page. Looked for until
  // it's there: a route renders a frame later, and a variant when the project gets to it. Scrolled
  // into view, then held in the spotlight.
  useEffect(() => {
    if (!threadOpen || !thread) {
      setThreadEl(null);
      return;
    }
    let frame = 0;
    const observer = new MutationObserver(() => {
      if (!frame) frame = requestAnimationFrame(look);
    });
    function look() {
      frame = 0;
      const el =
        thread!.kind === "annotation"
          ? findElementByAnnotationId(thread!.annotation.elementId || thread!.annotation.id)
          : findElementByAnnotationId(thread!.annotationId, thread!.label || undefined);
      setThreadEl(el);
      if (!el) return;
      observer.disconnect();
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    observer.observe(document.body, { childList: true, subtree: true });
    frame = requestAnimationFrame(look);
    return () => {
      observer.disconnect();
      if (frame) cancelAnimationFrame(frame);
    };
    // Again after a variant: the element may only exist in the one the thread was written in.
  }, [threadOpen, thread, currentRoute, threadVariantsApplied]);

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
    setPanelOpen(false);
    document.querySelector<HTMLElement>("[data-annotation-button]")?.focus();
  }, [setPanelOpen]);

  useEffect(() => {
    if (!panelOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && panelRef.current?.contains(document.activeElement)) {
        // In a thread, Escape goes back a page; on the list it closes the panel.
        if (threadOpen) back();
        else close();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [panelOpen, close, back, threadOpen]);

  if (!mounted || !panelOpen) return null;

  const sourceAnnotations = tab === "page" ? currentAnnotations : allAnnotations;
  const filtered = sourceAnnotations.filter((a) => {
    if (typeFilter.size > 0 && !typeFilter.has(a.type ?? "documentation")) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!a.title.toLowerCase().includes(q) && !a.body.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const pageFeedback = allFeedback.filter((c) => isOnPage(c, currentRoute, componentsOnPage));
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
          v === "annotations" ? labels.viewAnnotations : labels.viewFeedback,
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
        "aria-label": labels.closePanel,
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
      view === "feedback" ? labels.searchFeedbackPlaceholder : labels.searchPlaceholder
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
      placeholder: view === "feedback" ? labels.searchFeedbackPlaceholder : labels.searchPlaceholder,
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
            labels.status[s]
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
              // The card is the index; the thread opens as the panel's next page,
              // and the element on the page is pointed at.
              onSelect: (e: React.MouseEvent<HTMLElement>) => {
                openThread({ kind: "annotation", annotation }, e.currentTarget);
                // On another route, go there too: the thread then points at its element.
                if (
                  annotation.target !== "global" &&
                  !matchRoute(annotation.target, currentRoute)
                ) {
                  navigateTo(annotation.target);
                }
              },
              // The spotlight, not the pin's quiet hover: from the panel it has to be as
              // clear where on the page the card is.
              onHoverStart: () =>
                setHover({
                  key: `a:${annotation.id}`,
                  el: findElementByAnnotationId(annotation.elementId || annotation.id),
                }),
              onHoverEnd: () => setHover(null),
            })
          )
        )
  );

  const feedbackEmpty =
    feedbackLoading && filteredFeedback.length === 0
      ? { message: labels.feedbackLoading, isError: false }
      : feedbackError && filteredFeedback.length === 0
        ? { message: labels.feedbackError, isError: true }
        : filteredFeedback.length === 0
          ? { message: labels.feedbackEmpty, isError: false }
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
            hidePages: tab === "page",
            isActive: !!c.annotationId && c.annotationId === activeAnnotationId,
            activateLabel: c.label
              ? fill(labels.feedbackFromOn, { name: c.auteur, label: c.label })
              : fill(labels.feedbackFrom, { name: c.auteur }),
            // Same model as an annotation card: the thread is the panel's next page.
            onSelect: c.annotationId
              ? (e: React.MouseEvent<HTMLElement>) => {
                  openThread(
                    {
                      kind: "feedback",
                      annotationId: c.annotationId!,
                      // No label is no label: the selector is not one, and would be sent as one.
                      label: c.label ?? "",
                      component: c.component,
                      pagina: c.pagina,
                    },
                    e.currentTarget
                  );
                  // Feedback on a component is on every page the component is on: no need to go back.
                  if (c.pagina && !isOnPage(c, currentRoute, componentsOnPage)) navigateTo(c.pagina);
                }
              : undefined,
            onMouseEnter: c.annotationId
              ? () => setHover({ key: `f:${c.id}`, el: findElementByAnnotationId(c.annotationId!, c.label) })
              : undefined,
            onMouseLeave: () => setHover(null),
          })
        )
  );

  // The spotlight is the panel's sibling, not its child: the panel's pages move with
  // transforms, and a fixed layer inside them would move along.
  // While picking, the inspector's spotlight is the only one.
  const hovered =
    hover &&
    (view === "annotations"
      ? filtered.some((a) => `a:${a.id}` === hover.key)
      : filteredFeedback.some((c) => `f:${c.id}` === hover.key));
  const lit = inspectorActive ? null : threadOpen ? threadEl : hovered ? hover.el : null;
  return React.createElement(
    React.Fragment,
    null,
    React.createElement(
      "div",
      {
        ref: panelRef,
        className: cx("orbit-root", "orbit-panel", "orbit-glass-pane", "orbit-animate-in"),
        // Bottom right above the rail, by the stylesheet; only the project's size is inline.
        style: { width: panelWidth, height: panelHeight },
        role: "complementary",
        "aria-label": labels.panelTitle,
        lang: language,
      },
      // Two pages over each other: the list, and the thread pushed over it. The one out of view is
      // hidden by the stylesheet once it has slid away, so it is out of the tab order too.
      React.createElement(
        "div",
        { className: cx("orbit-panel__page", "orbit-panel__page--list", !threadOpen && "orbit-panel__page--in") },
        header,
        subTabs,
        search,
        filters,
        view === "annotations" ? annotationList : feedbackList
      ),
      React.createElement(
        "div",
        {
          className: cx("orbit-panel__page", "orbit-panel__page--thread", threadOpen && "orbit-panel__page--in"),
          role: "region",
          "aria-label": thread
            ? thread.kind === "annotation" ? thread.annotation.title : thread.label || thread.annotationId
            : undefined,
        },
        thread &&
          React.createElement(ThreadPage, {
            // A new thread is a new page: its comments start empty rather than the last one's.
            key: thread.kind === "annotation" ? `a:${thread.annotation.id}` : `f:${thread.annotationId}`,
            thread,
            backLabel: view === "annotations" ? labels.viewAnnotations : labels.viewFeedback,
            backRef,
            onBack: back,
            onClose: close,
            onOpenInstance: (c: Comment) => {
              setThread({
                kind: "feedback",
                annotationId: c.annotationId ?? "",
                label: c.label ?? "",
                component: c.component,
                pagina: c.pagina,
              });
              if (c.pagina && !isOnPage(c, currentRoute, componentsOnPage)) navigateTo(c.pagina);
            },
          })
      )
    ),
    React.createElement(Spotlight, { el: lit, still: threadOpen })
  );
}
