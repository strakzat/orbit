import React, { useState, useEffect, useCallback } from "react";
import { useAnnotationsSafe } from "../context/use-annotations-safe";
import { useComments } from "../hooks/use-comments";
import { useAnnotationStyles } from "../styles/inject";
import { useStableId } from "../utils/use-stable-id";
import { findElementByAnnotationId, showHoverHighlight } from "../utils/find-element";
import { getFixedPopoverStyle } from "../utils/popover-position";
import { matchRoute } from "../utils/route-matching";
import { fill } from "../labels";
import { MarkerBadge } from "./marker-badge";
import { AnnotationPopover } from "./annotation-popover";
import {
  BADGE_GAP,
  BADGE_OFFSET,
  POPOVER_MAX_HEIGHT,
  unplacedBadgeRect,
} from "./marker-geometry";
import { unplacedAnnotationIds } from "./marker-placement";
import type { Annotation } from "../types";

interface AutoBadgeInfo {
  annotation: Annotation;
  rect: DOMRect;
  openCommentCount: number;
  commentCount: number;
  hasComments: boolean;
  allResolved: boolean;
  /** No element to sit on; parked in the column top-left instead. */
  unplaced: boolean;
}

/**
 * Auto-discovers DOM elements with data-annotation-id attributes that match
 * annotations in the config, and renders floating badges for any that are NOT
 * already handled by an explicit <AnnotationMarker> wrapper.
 */
export function AutoAnnotationMarkers() {
  useAnnotationStyles();

  const {
    annotationMode,
    inspectorActive,
    activeAnnotationId,
    hoveredAnnotationId,
    setActiveAnnotationId,
    setHoveredAnnotationId,
    setPanelOpen,
    allAnnotations,
    allComments,
    commentsConfig,
    currentRoute,
    registeredMarkerIds,
    labels,
  } = useAnnotationsSafe();

  const [badges, setBadges] = useState<AutoBadgeInfo[]>([]);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const popoverId = useStableId("orbit-auto-popover");

  // Find the active auto-badge (if any) for popover rendering
  const activeBadge = activeAnnotationId
    ? badges.find((b) => b.annotation.id === activeAnnotationId)
    : undefined;
  const activeAnnotation = activeBadge?.annotation;
  const activeAnnotationLabel = activeAnnotation?.title ?? activeAnnotationId ?? "";

  const { comments, isLoading, error, submitComment } = useComments({
    apiBase: commentsConfig?.apiBase ?? "",
    project: commentsConfig?.project ?? "",
    annotationId: activeAnnotationId ?? "",
    label: activeAnnotationLabel,
    enabled: !!commentsConfig && !!activeBadge,
  });

  const showMarkers = mounted && (annotationMode || inspectorActive);

  const updateBadges = useCallback(() => {
    if (!showMarkers) {
      setBadges([]);
      return;
    }

    const newBadges: AutoBadgeInfo[] = [];
    const unplacedSlots = new Map(
      unplacedAnnotationIds(allAnnotations, registeredMarkerIds, currentRoute).map(
        (id, index) => [id, index] as const
      )
    );

    for (const annotation of allAnnotations) {
      // Skip annotations already handled by an explicit AnnotationMarker
      if (registeredMarkerIds.has(annotation.id)) continue;

      // Skip annotations not targeting the current route
      if (annotation.target !== "global" && !matchRoute(annotation.target, currentRoute)) continue;

      // Try to find the element by annotation.elementId or annotation.id.
      // No element is not a reason to hide the annotation: a `global` one has
      // nothing to point at, and it still has to be readable from the page.
      const lookupId = annotation.elementId || annotation.id;
      const el = findElementByAnnotationId(lookupId);
      const unplaced = !el;
      const rect = el
        ? el.getBoundingClientRect()
        : unplacedBadgeRect(unplacedSlots.get(annotation.id) ?? 0);

      // Compute comment counts for this annotation
      const elementComments = commentsConfig
        ? allComments.filter((c) => c.annotationId === annotation.id)
        : [];
      const openCommentCount = elementComments.filter((c) => c.status !== "Opgelost").length;

      newBadges.push({
        annotation,
        rect,
        openCommentCount,
        commentCount: elementComments.length,
        hasComments: elementComments.length > 0,
        allResolved: elementComments.length > 0 && openCommentCount === 0,
        unplaced,
      });
    }

    // Bail out if badges haven't actually changed to avoid re-render loops
    setBadges((prev) => {
      if (prev.length !== newBadges.length) return newBadges;
      const unchanged = prev.every((b, i) => {
        const n = newBadges[i];
        return (
          b.annotation.id === n.annotation.id &&
          b.openCommentCount === n.openCommentCount &&
          b.commentCount === n.commentCount &&
          b.allResolved === n.allResolved &&
          Math.abs(b.rect.top - n.rect.top) < 1 &&
          Math.abs(b.rect.left - n.rect.left) < 1 &&
          Math.abs(b.rect.right - n.rect.right) < 1 &&
          Math.abs(b.rect.bottom - n.rect.bottom) < 1
        );
      });
      return unchanged ? prev : newBadges;
    });
  }, [allAnnotations, registeredMarkerIds, showMarkers, currentRoute, allComments, commentsConfig]);

  // Update positions on mount, scroll, resize, and when dependencies change
  useEffect(() => {
    if (!showMarkers) return;
    updateBadges();

    window.addEventListener("scroll", updateBadges, true);
    window.addEventListener("resize", updateBadges);

    // Debounce MutationObserver to avoid infinite loops:
    // setBadges re-renders → DOM changes → observer fires → setBadges again
    let rafId = 0;
    const debouncedUpdate = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(updateBadges);
    };
    const observer = new MutationObserver(debouncedUpdate);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      window.removeEventListener("scroll", updateBadges, true);
      window.removeEventListener("resize", updateBadges);
      cancelAnimationFrame(rafId);
      observer.disconnect();
    };
  }, [showMarkers, updateBadges]);

  // Show hover highlight on hovered element
  useEffect(() => {
    if (!showMarkers || !hoveredAnnotationId) return;

    const badge = badges.find((b) => b.annotation.id === hoveredAnnotationId);
    if (!badge) return;

    const el = findElementByAnnotationId(badge.annotation.elementId || badge.annotation.id);
    if (!el) return;

    return showHoverHighlight(el);
  }, [hoveredAnnotationId, badges, showMarkers]);

  const close = useCallback(() => {
    setActiveAnnotationId(null);
    document
      .querySelector<HTMLElement>(`button.orbit-marker[aria-controls="${popoverId}"]`)
      ?.focus();
  }, [setActiveAnnotationId, popoverId]);

  if (!showMarkers || badges.length === 0) return null;

  const elements: React.ReactElement[] = [];

  for (const badge of badges) {
    const { annotation } = badge;
    const isActive = activeAnnotationId === annotation.id;
    const annotationType = annotation.type ?? "documentation";

    // A placed badge hangs over the element's top-right corner; an unplaced one
    // sits where the geometry helper parked it.
    const offset = badge.unplaced ? 0 : BADGE_OFFSET;
    const badgeLeft = badge.unplaced ? badge.rect.left : badge.rect.right - offset;

    elements.push(
      React.createElement(MarkerBadge, {
        key: `auto-${annotation.id}`,
        variant: "annotation",
        type: annotationType,
        label: fill(badge.unplaced ? labels.annotationMarkerUnplaced : labels.annotationMarker, {
          title: annotation.title,
        }),
        placement: "fixed",
        unplaced: badge.unplaced,
        style: {
          top: badge.rect.top - offset,
          left: badgeLeft,
        },
        active: isActive,
        controls: popoverId,
        onClick: (e: React.MouseEvent) => {
          e.stopPropagation();
          setActiveAnnotationId(isActive ? null : annotation.id);
          if (!isActive) setPanelOpen(true);
        },
        onMouseEnter: () => setHoveredAnnotationId(annotation.id),
        onMouseLeave: () => setHoveredAnnotationId(null),
      })
    );

    if (badge.hasComments) {
      elements.push(
        React.createElement(MarkerBadge, {
          key: `auto-fb-${annotation.id}`,
          variant: "feedback",
          resolved: badge.allResolved,
          count: badge.openCommentCount,
          label: badge.allResolved
            ? fill(labels.feedbackAllResolved, { count: badge.commentCount })
            : fill(labels.feedbackOpen, { count: badge.openCommentCount }),
          placement: "fixed",
          behind: true,
          style: {
            top: badge.rect.top - offset,
            left: badgeLeft + BADGE_GAP,
          },
        })
      );
    }
  }

  if (activeBadge && activeAnnotation) {
    elements.push(
      React.createElement(AnnotationPopover, {
        key: `auto-popover-${activeAnnotation.id}`,
        id: popoverId,
        annotation: activeAnnotation,
        showComments: !!commentsConfig,
        comments,
        isLoading,
        error,
        onSubmit: submitComment,
        onClose: close,
        style: getFixedPopoverStyle(activeBadge.rect, 300, POPOVER_MAX_HEIGHT),
      })
    );
  }

  return React.createElement(React.Fragment, null, ...elements);
}
