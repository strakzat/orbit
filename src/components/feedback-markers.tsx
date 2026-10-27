import React, { useState, useEffect, useCallback } from "react";
import { useAnnotationsSafe } from "../context/use-annotations-safe";
import { useComments } from "../hooks/use-comments";
import { useAnnotationStyles } from "../styles/inject";
import { useStableId } from "../utils/use-stable-id";
import { findElementByAnnotationId } from "../utils/find-element";
import { getFixedPopoverStyle } from "../utils/popover-position";
import { matchRoute } from "../utils/route-matching";
import { fill } from "../labels";
import { MarkerBadge } from "./marker-badge";
import { AnnotationPopover } from "./annotation-popover";
import { BADGE_GAP, BADGE_OFFSET, POPOVER_MAX_HEIGHT, unplacedBadgeRect } from "./marker-geometry";
import { unplacedAnnotationIds } from "./marker-placement";
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
    setPanelOpen,
    currentRoute,
    registeredMarkerIds,
    labels,
  } = useAnnotationsSafe();

  const [badges, setBadges] = useState<FeedbackBadgeInfo[]>([]);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const popoverId = useStableId("orbit-feedback-popover");

  const showMarkers = mounted && (annotationMode || inspectorActive);

  const activeBadge = activeAnnotationId
    ? badges.find((b) => b.annotationId === activeAnnotationId)
    : undefined;

  const { comments, isLoading, error, submitComment } = useComments({
    apiBase: commentsConfig?.apiBase ?? "",
    project: commentsConfig?.project ?? "",
    annotationId: activeAnnotationId ?? "",
    label: activeBadge?.label ?? "",
    enabled: !!commentsConfig && !!activeBadge,
  });

  const updateBadges = useCallback(() => {
    if (!commentsConfig || !showMarkers) {
      setBadges([]);
      return;
    }

    // Group comments by annotationId, excluding those handled by AnnotationMarker
    // and filtering to current page only
    const grouped = new Map<string, Comment[]>();
    for (const c of allComments) {
      if (!c.annotationId || registeredMarkerIds.has(c.annotationId)) continue;
      if (!c.pagina || !matchRoute(currentRoute, c.pagina)) continue;
      const list = grouped.get(c.annotationId) || [];
      list.push(c);
      grouped.set(c.annotationId, list);
    }

    // The elements the annotation badges will occupy. A comment and an annotation
    // can point at the same element through different ids — the comment through the
    // element's own id, the annotation through its marker id — and then neither
    // component knows about the other and both draw in the same corner.
    const annotated = new Set<Element>();
    for (const annotation of allAnnotations) {
      const el = findElementByAnnotationId(annotation.elementId || annotation.id);
      if (el) annotated.add(el);
    }

    // The unplaced column starts below whatever AutoAnnotationMarkers parked there.
    let slot = unplacedAnnotationIds(allAnnotations, registeredMarkerIds, currentRoute)
      .length;

    const newBadges: FeedbackBadgeInfo[] = [];
    for (const [annotationId, comments] of grouped) {
      const el = findElementByAnnotationId(annotationId);
      const openCount = comments.filter((c) => c.status !== "Opgelost").length;

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
      });
    }

    setBadges(newBadges);
  }, [
    allComments,
    allAnnotations,
    registeredMarkerIds,
    commentsConfig,
    showMarkers,
    currentRoute,
  ]);

  // Update positions on mount, scroll, resize, and when comments change
  useEffect(() => {
    if (!showMarkers) return;
    updateBadges();

    window.addEventListener("scroll", updateBadges, true);
    window.addEventListener("resize", updateBadges);
    return () => {
      window.removeEventListener("scroll", updateBadges, true);
      window.removeEventListener("resize", updateBadges);
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
    const offset = badge.unplaced ? 0 : BADGE_OFFSET;
    const left = badge.unplaced
      ? badge.rect.left
      : badge.rect.right - offset + (badge.sharesCorner ? BADGE_GAP : 0);

    elements.push(
      React.createElement(MarkerBadge, {
        key: badge.annotationId,
        variant: "feedback",
        resolved: badge.allResolved,
        count: badge.openCount,
        active: isActive,
        unplaced: badge.unplaced,
        placement: "fixed",
        controls: popoverId,
        style: { top: badge.rect.top - offset, left },
        label: badge.allResolved
          ? fill(labels.feedbackAllResolved, { count: badge.totalCount })
          : fill(labels.feedbackOpen, { count: badge.openCount }),
        onClick: (e: React.MouseEvent) => {
          e.stopPropagation();
          setActiveAnnotationId(isActive ? null : badge.annotationId);
          if (!isActive) setPanelOpen(true);
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
          React.createElement("div", { className: "orbit-mono" }, activeBadge.label)
        ),
        showComments: true,
        comments,
        isLoading,
        error,
        onSubmit: submitComment,
        onClose: close,
        style: getFixedPopoverStyle(activeBadge.rect, 320, POPOVER_MAX_HEIGHT),
      })
    );
  }

  return React.createElement(React.Fragment, null, ...elements);
}
