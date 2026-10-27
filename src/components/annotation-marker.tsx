import React, { useState, useEffect, useRef, useCallback } from "react";
import { useAnnotationsSafe } from "../context/use-annotations-safe";
import { useComments } from "../hooks/use-comments";
import { useAnnotationStyles } from "../styles/inject";
import { cx } from "../utils/cx";
import { useStableId } from "../utils/use-stable-id";
import { getAbsolutePopoverStyle } from "../utils/popover-position";
import { fill } from "../labels";
import { MarkerBadge } from "./marker-badge";
import { AnnotationPopover } from "./annotation-popover";
import { MARKER_CORNERS, POPOVER_MAX_HEIGHT, feedbackCorner } from "./marker-geometry";
import type { MarkerPosition, Annotation } from "../types";

interface AnnotationMarkerProps {
  annotationId: string;
  children: React.ReactNode;
  position?: MarkerPosition;
  className?: string;
}

export function AnnotationMarker({
  annotationId,
  children,
  position = "top-right",
  className,
}: AnnotationMarkerProps) {
  useAnnotationStyles();

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const popoverId = useStableId("orbit-popover");

  const {
    annotationMode,
    inspectorActive,
    activeAnnotationId,
    hoveredAnnotationId,
    setActiveAnnotationId,
    setHoveredAnnotationId,
    setPanelOpen,
    commentsConfig,
    allAnnotations,
    allComments,
    registerMarkerId,
    unregisterMarkerId,
    labels,
  } = useAnnotationsSafe();

  // Register this marker so AutoAnnotationMarkers skips it
  useEffect(() => {
    registerMarkerId(annotationId);
    return () => unregisterMarkerId(annotationId);
  }, [annotationId, registerMarkerId, unregisterMarkerId]);

  const wrapperRef = useRef<HTMLDivElement>(null);

  const isActive = activeAnnotationId === annotationId;
  const matchingAnnotations = allAnnotations.filter((a) => a.id === annotationId);
  const annotation = matchingAnnotations[0] as Annotation | undefined;
  const annotationLabel = annotation?.title ?? annotationId;

  const { comments, isLoading, error, submitComment } = useComments({
    apiBase: commentsConfig?.apiBase ?? "",
    project: commentsConfig?.project ?? "",
    annotationId,
    label: annotationLabel,
    enabled: !!commentsConfig && isActive,
  });

  const showMarkers = mounted && (annotationMode || inspectorActive);
  const isHovered = hoveredAnnotationId === annotationId;
  const annotationType = annotation?.type ?? "documentation";

  // Feedback badge: filter allComments for this annotationId
  const elementComments = commentsConfig
    ? allComments.filter((c) => c.annotationId === annotationId)
    : [];
  const openCommentCount = elementComments.filter((c) => c.status !== "Opgelost").length;
  const hasComments = elementComments.length > 0;
  const allResolved = hasComments && openCommentCount === 0;

  // Closing puts focus back on the badge that opened the popover, so keyboard
  // users are not dropped at the top of the document.
  const close = useCallback(() => {
    setActiveAnnotationId(null);
    wrapperRef.current?.querySelector<HTMLElement>("button.orbit-marker")?.focus();
  }, [setActiveAnnotationId]);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveAnnotationId(isActive ? null : annotationId);
    if (!isActive) setPanelOpen(true);
  };

  return React.createElement(
    "div",
    { className: cx("orbit-contents", className) },
    React.createElement(
      "div",
      {
        ref: wrapperRef,
        // Deliberately no `orbit-root` here: this element wraps the consumer's own
        // components, and the reset that comes with orbit-root would strip their
        // styling. The ring needs no reset, and the badges inside carry their own.
        className: cx(
          "orbit-marker-wrap",
          showMarkers && (isActive || isHovered) && "orbit-marker-wrap--lit",
          showMarkers && isActive && "orbit-marker-wrap--active"
        ),
        // Stamp the annotation id on the wrapper so the element is identified by the
        // *same* id everywhere: the inspector walking up for feedback resolves to this
        // id, findElementByAnnotationId() locates it, and annotation + feedback end up
        // in one thread on one component instead of three separate buckets.
        "data-annotation-id": annotationId,
        "data-orbit-type": annotationType,
      },
      children,

      showMarkers &&
        React.createElement(MarkerBadge, {
          variant: "annotation",
          type: annotationType,
          count: matchingAnnotations.length > 1 ? matchingAnnotations.length : undefined,
          label: fill(labels.annotationMarker, { title: annotationLabel }),
          placement: "absolute",
          style: MARKER_CORNERS[position],
          active: isActive,
          controls: popoverId,
          onClick: handleClick,
          onMouseEnter: () => setHoveredAnnotationId(annotationId),
          onMouseLeave: () => setHoveredAnnotationId(null),
        }),

      showMarkers &&
        hasComments &&
        React.createElement(MarkerBadge, {
          variant: "feedback",
          resolved: allResolved,
          count: openCommentCount,
          label: allResolved
            ? fill(labels.feedbackAllResolved, { count: elementComments.length })
            : fill(labels.feedbackOpen, { count: openCommentCount }),
          placement: "absolute",
          behind: true,
          style: feedbackCorner(position),
        }),

      showMarkers &&
        isActive &&
        React.createElement(AnnotationPopover, {
          id: popoverId,
          annotation,
          showComments: !!commentsConfig,
          comments,
          isLoading,
          error,
          onSubmit: submitComment,
          onClose: close,
          style: wrapperRef.current
            ? getAbsolutePopoverStyle(
                wrapperRef.current.getBoundingClientRect(),
                300,
                POPOVER_MAX_HEIGHT
              )
            : { position: "absolute", top: "100%", left: 0, marginTop: 8 },
        })
    )
  );
}
