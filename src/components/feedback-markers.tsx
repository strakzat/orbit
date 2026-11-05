import React, { useState, useEffect, useCallback } from "react";
import { useAnnotationsSafe } from "../context/use-annotations-safe";
import { useComments } from "../hooks/use-comments";
import { useAnnotationStyles } from "../styles/inject";
import { useStableId } from "../utils/use-stable-id";
import { pickArea } from "../utils/pick-element";
import { getPinPopoverStyle } from "../utils/popover-position";
import { isOnPage, matchRoute } from "../utils/route-matching";
import { fill } from "../labels";
import { initials } from "../utils/format";
import { ANONYMOUS } from "../constants";
import { MarkerBadge } from "./marker-badge";
import { AnnotationPopover } from "./annotation-popover";
import { ComponentHead } from "./component-chip";
import {
  BADGE_SIZE,
  POPOVER_MAX_HEIGHT,
  besidePin,
  pinOnCorner,
  unplacedBadgeRect,
  type PinTail,
} from "./marker-geometry";
import { markerElement, outOfArea, sameRect, unplacedAnnotationIds } from "./marker-placement";
import type { Comment } from "../types";

interface FeedbackBadgeInfo {
  annotationId: string;
  label: string;
  rect: DOMRect;
  openCount: number;
  totalCount: number;
  allResolved: boolean;
  /** An annotation badge already sits in this element's corner. */
  sharesCorner: boolean;
  /** The element is gone; parked in the unplaced column instead. */
  unplaced: boolean;
  /** Feedback on a component: its name. */
  component?: string;
  /** Who started the thread: the first comment's author. */
  author: string;
}

const sameBadge = (a: FeedbackBadgeInfo, b: FeedbackBadgeInfo) =>
  a.annotationId === b.annotationId &&
  a.label === b.label &&
  a.openCount === b.openCount &&
  a.totalCount === b.totalCount &&
  a.allResolved === b.allResolved &&
  a.sharesCorner === b.sharesCorner &&
  a.unplaced === b.unplaced &&
  a.component === b.component &&
  a.author === b.author &&
  sameRect(a.rect, b.rect);

/** Its own pin on the element's corner, or a plain badge beside the annotation's pin there,
    or parked without a tail. */
function pinFor(badge: FeedbackBadgeInfo): { left: number; top: number; tail?: PinTail } {
  if (badge.unplaced) return { left: badge.rect.left, top: badge.rect.top };
  const pin = pinOnCorner(badge.rect);
  return badge.sharesCorner ? besidePin(pin) : pin;
}

/**
 * Renders floating feedback badges on DOM elements that have comments
 * but are NOT wrapped in an AnnotationMarker component.
 * AnnotationMarker already renders its own feedback badges.
 */
export function FeedbackMarkers() {
  useAnnotationStyles();

  const {
    annotationMode,
    inspectorActive,
    allComments,
    allAnnotations,
    commentsConfig,
    setActiveAnnotationId,
    activeAnnotationId,
    currentRoute,
    registeredMarkerIds,
    componentsOnPage,
    showResolvedPins,
    labels,
  } = useAnnotationsSafe();

  const [badges, setBadges] = useState<FeedbackBadgeInfo[]>([]);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const popoverId = useStableId("orbit-feedback-popover");

  // Not while picking: the spotlight is about the one element feedback goes on.
  const showMarkers = mounted && annotationMode && !inspectorActive;

  const activeBadge = activeAnnotationId
    ? badges.find((b) => b.annotationId === activeAnnotationId)
    : undefined;

  const { comments, isLoading, error, submitComment } = useComments({
    apiBase: commentsConfig?.apiBase ?? "",
    project: commentsConfig?.project ?? "",
    annotationId: activeAnnotationId ?? "",
    label: activeBadge?.label ?? "",
    enabled: !!commentsConfig && !!activeBadge,
    component: activeBadge?.component,
  });

  const updateBadges = useCallback(() => {
    if (!commentsConfig || !showMarkers) {
      setBadges([]);
      return;
    }

    // An annotation's own thread is on its pin, wrapped (AnnotationMarker) or found
    // (AutoAnnotationMarkers): a dot there says what is unread, not a second badge here.
    const pinned = new Set(registeredMarkerIds);
    for (const a of allAnnotations) {
      if (a.target === "global" || matchRoute(a.target, currentRoute)) pinned.add(a.id);
    }

    // Group comments by annotationId, filtering to current page only
    const grouped = new Map<string, Comment[]>();
    for (const c of allComments) {
      if (!c.annotationId || pinned.has(c.annotationId)) continue;
      // Feedback on a component goes wherever the component is; the rest stays on its page.
      if (!c.component && !c.pagina) continue;
      if (!isOnPage(c, currentRoute, componentsOnPage)) continue;
      const list = grouped.get(c.annotationId) || [];
      list.push(c);
      grouped.set(c.annotationId, list);
    }

    // The elements the annotation badges will occupy. A comment and an annotation
    // can point at the same element through different ids — the comment through the
    // element's own id, the annotation through its marker id — and then neither
    // component knows about the other and both draw in the same corner.
    const area = pickArea();
    const annotated = new Set<Element>();
    for (const annotation of allAnnotations) {
      const el = markerElement(annotation.elementId || annotation.id);
      if (el) annotated.add(el);
    }

    // The unplaced column starts below whatever AutoAnnotationMarkers parked there.
    let slot = unplacedAnnotationIds(allAnnotations, registeredMarkerIds, currentRoute)
      .length;

    const newBadges: FeedbackBadgeInfo[] = [];
    for (const [annotationId, comments] of grouped) {
      const el = markerElement(annotationId, comments[0]?.label);
      const component = comments.find((c) => c.component)?.component;
      // A component's pin is on its first instance. With none here (yet), there is none: parked,
      // it would sit in the corner of every page.
      if (component && !el) continue;
      const openCount = comments.filter((c) => c.status !== "Opgelost").length;
      // Done is done, if the viewer says so: no pin, and no place in the column either.
      if (openCount === 0 && !showResolvedPins) continue;
      // An open thread stays: it follows its pin to the edge of the frame.
      if (el && annotationId !== activeAnnotationId && outOfArea(el.getBoundingClientRect(), area)) continue;
      // The thread's first comment, whatever order the API gave them in.
      const first = comments.reduce((a, b) => (b.aangemaakt < a.aangemaakt ? b : a));

      newBadges.push({
        annotationId,
        label: comments[0]?.label ?? annotationId,
        // Feedback on an element that no longer exists still has to be reachable,
        // so it is parked rather than dropped.
        rect: el ? el.getBoundingClientRect() : unplacedBadgeRect(slot++),
        openCount,
        totalCount: comments.length,
        allResolved: openCount === 0,
        sharesCorner: !!el && (annotated.has(el) || !!el.closest(".orbit-marker-wrap")),
        unplaced: !el,
        component,
        author: first.auteur,
      });
    }

    // Unchanged is no render: the observer below would otherwise run on every commit.
    setBadges((prev) =>
      prev.length === newBadges.length && prev.every((b, i) => sameBadge(b, newBadges[i])) ? prev : newBadges
    );
  }, [
    allComments,
    allAnnotations,
    registeredMarkerIds,
    commentsConfig,
    showMarkers,
    currentRoute,
    componentsOnPage,
    showResolvedPins,
    activeAnnotationId,
  ]);

  // Update positions on mount, scroll, resize, and when comments change
  useEffect(() => {
    if (!showMarkers) return;
    updateBadges();

    window.addEventListener("scroll", updateBadges, true);
    window.addEventListener("resize", updateBadges);

    // The page renders after the route changes: without this its pins stay parked until a scroll.
    let rafId = 0;
    const observer = new MutationObserver(() => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(updateBadges);
    });
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      window.removeEventListener("scroll", updateBadges, true);
      window.removeEventListener("resize", updateBadges);
      cancelAnimationFrame(rafId);
      observer.disconnect();
    };
  }, [showMarkers, updateBadges]);

  const close = useCallback(() => {
    setActiveAnnotationId(null);
    document
      .querySelector<HTMLElement>(`button.orbit-marker[aria-controls="${popoverId}"]`)
      ?.focus();
  }, [setActiveAnnotationId, popoverId]);

  if (!showMarkers || badges.length === 0) return null;

  const elements: React.ReactElement[] = [];

  for (const badge of badges) {
    const isActive = activeAnnotationId === badge.annotationId;
    const { left, top, tail } = pinFor(badge);

    elements.push(
      React.createElement(MarkerBadge, {
        key: badge.annotationId,
        variant: "feedback",
        resolved: badge.allResolved,
        count: badge.openCount,
        active: isActive,
        unplaced: badge.unplaced,
        placement: "fixed",
        tail,
        pinId: badge.annotationId,
        controls: popoverId,
        style: { top, left },
        // Who started it, as their avatar does on a comment. Without a name, the feedback icon.
        monogram: badge.author && badge.author !== ANONYMOUS ? initials(badge.author) : undefined,
        label:
          (badge.allResolved
            ? fill(labels.feedbackAllResolved, { count: badge.totalCount })
            : fill(labels.feedbackOpen, { count: badge.openCount })) + `, ${badge.author}`,
        onClick: (e: React.MouseEvent) => {
          e.stopPropagation();
          setActiveAnnotationId(isActive ? null : badge.annotationId);
        },
      })
    );
  }

  if (activeBadge) {
    elements.push(
      React.createElement(AnnotationPopover, {
        key: `feedback-popover-${activeBadge.annotationId}`,
        id: popoverId,
        header: React.createElement(
          "div",
          { className: "orbit-popover__section" },
          activeBadge.component &&
            React.createElement(ComponentHead, { name: activeBadge.component, labels }),
          React.createElement("div", { className: "orbit-mono" }, activeBadge.label)
        ),
        showComments: true,
        comments,
        isLoading,
        error,
        onSubmit: submitComment,
        onClose: close,
        pinId: activeBadge.annotationId,
        // On its pin, covering it.
        style: (() => {
          const { left, top } = pinFor(activeBadge);
          return getPinPopoverStyle(
            new DOMRect(left, top, BADGE_SIZE, BADGE_SIZE),
            320,
            POPOVER_MAX_HEIGHT
          );
        })(),
      })
    );
  }

  return React.createElement(React.Fragment, null, ...elements);
}
