import React, { useState, useEffect, useCallback } from "react";
import { useAnnotationsSafe } from "../context/use-annotations-safe";
import { useComments } from "../hooks/use-comments";
import { useAnnotationStyles } from "../styles/inject";
import { useStableId } from "../utils/use-stable-id";
import { pickArea } from "../utils/pick-element";
import { getPinPopoverStyle } from "../utils/popover-position";
import { matchRoute } from "../utils/route-matching";
import { fill } from "../labels";
import { MarkerBadge } from "./marker-badge";
import { AnnotationPopover } from "./annotation-popover";
import {
  BADGE_SIZE,
  POPOVER_MAX_HEIGHT,
  pinOnCorner,
  unplacedBadgeRect,
  type PinTail,
} from "./marker-geometry";
import { markerElement, outOfArea, sameRect, unplacedAnnotationIds } from "./marker-placement";
import type { Annotation } from "../types";

/** A placed pin points at the element's top-right corner; an unplaced one sits where the
    geometry helper parked it, without a tail. */
function pinFor(badge: AutoBadgeInfo): { left: number; top: number; tail?: PinTail } {
  return badge.unplaced ? { left: badge.rect.left, top: badge.rect.top } : pinOnCorner(badge.rect);
}

interface AutoBadgeInfo {
  annotation: Annotation;
  rect: DOMRect;
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
    setActiveAnnotationId,
    setHoveredAnnotationId,
    allAnnotations,
    unseenAnnotationIds,
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

  // Not while picking: the spotlight is about the one element feedback goes on.
  const showMarkers = mounted && annotationMode && !inspectorActive;

  const updateBadges = useCallback(() => {
    if (!showMarkers) {
      setBadges([]);
      return;
    }

    const newBadges: AutoBadgeInfo[] = [];
    const area = pickArea();
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
      const el = markerElement(lookupId);
      const unplaced = !el;
      const rect = el
        ? el.getBoundingClientRect()
        : unplacedBadgeRect(unplacedSlots.get(annotation.id) ?? 0);
      // An open thread stays: it follows its pin to the edge of the frame.
      if (el && annotation.id !== activeAnnotationId && outOfArea(rect, area)) continue;

      newBadges.push({ annotation, rect, unplaced });
    }

    // Bail out if badges haven't actually changed to avoid re-render loops
    setBadges((prev) => {
      if (prev.length !== newBadges.length) return newBadges;
      const unchanged = prev.every((b, i) => {
        const n = newBadges[i];
        return b.annotation === n.annotation && b.unplaced === n.unplaced && sameRect(b.rect, n.rect);
      });
      return unchanged ? prev : newBadges;
    });
  }, [allAnnotations, registeredMarkerIds, showMarkers, currentRoute, activeAnnotationId]);

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
    // Feedback in its thread that the viewer has not read: a dot on the pin.
    const unseen = !!commentsConfig && unseenAnnotationIds.has(annotation.id);

    const pin = pinFor(badge);

    elements.push(
      React.createElement(MarkerBadge, {
        key: `auto-${annotation.id}`,
        variant: "annotation",
        type: annotationType,
        label:
          fill(badge.unplaced ? labels.annotationMarkerUnplaced : labels.annotationMarker, {
            title: annotation.title,
          }) + (unseen ? `, ${labels.markerUnseen}` : ""),
        unseen,
        placement: "fixed",
        unplaced: badge.unplaced,
        tail: pin.tail,
        pinId: annotation.id,
        style: { top: pin.top, left: pin.left },
        active: isActive,
        controls: popoverId,
        onClick: (e: React.MouseEvent) => {
          e.stopPropagation();
          setActiveAnnotationId(isActive ? null : annotation.id);
        },
        onMouseEnter: () => setHoveredAnnotationId(annotation.id),
        onMouseLeave: () => setHoveredAnnotationId(null),
      })
    );
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
        pinId: activeAnnotation.id,
        // On its pin, covering it.
        style: (() => {
          const pin = pinFor(activeBadge);
          return getPinPopoverStyle(
            new DOMRect(pin.left, pin.top, BADGE_SIZE, BADGE_SIZE),
            300,
            POPOVER_MAX_HEIGHT
          );
        })(),
      })
    );
  }

  return React.createElement(React.Fragment, null, ...elements);
}
