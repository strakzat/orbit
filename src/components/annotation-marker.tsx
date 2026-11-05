import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useAnnotationsSafe } from "../context/use-annotations-safe";
import { useComments } from "../hooks/use-comments";
import { useAnnotationStyles } from "../styles/inject";
import { cx } from "../utils/cx";
import { useStableId } from "../utils/use-stable-id";
import { getPinPopoverStyle } from "../utils/popover-position";
import { fill } from "../labels";
import { MarkerBadge } from "./marker-badge";
import { AnnotationPopover } from "./annotation-popover";
import {
  CORNER_TAIL,
  MARKER_CORNERS,
  POPOVER_MAX_HEIGHT,
  pinBoxAtCorner,
} from "./marker-geometry";
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
    setActiveAnnotationId,
    setHoveredAnnotationId,
    commentsConfig,
    allAnnotations,
    unseenAnnotationIds,
    registerMarkerId,
    unregisterMarkerId,
    labels,
    tourStep,
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

  // Not while picking: the spotlight is about the one element feedback goes on.
  // Nor during the tour: its annotation isn't one of the samples. The wrapper and what it wraps stay.
  const showMarkers = mounted && annotationMode && !inspectorActive && tourStep === null;
  const annotationType = annotation?.type ?? "documentation";

  // Feedback in this annotation's thread that the viewer has not read: a dot on its pin.
  const unseen = !!commentsConfig && unseenAnnotationIds.has(annotationId);

  // Open, the thread follows its pin through scrolling and resizing, once a frame at most.
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!isActive) return;
    let frame = 0;
    const update = () => {
      if (!frame) frame = requestAnimationFrame(() => {
        frame = 0;
        setTick((t) => t + 1);
      });
    };
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [isActive]);

  // Closing puts focus back on the badge that opened the popover, so keyboard
  // users are not dropped at the top of the document.
  const close = useCallback(() => {
    setActiveAnnotationId(null);
    wrapperRef.current?.querySelector<HTMLElement>("button.orbit-marker")?.focus();
  }, [setActiveAnnotationId]);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveAnnotationId(isActive ? null : annotationId);
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
        className: "orbit-marker-wrap",
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
          label:
            fill(labels.annotationMarker, { title: annotationLabel }) +
            (unseen ? `, ${labels.markerUnseen}` : ""),
          placement: "absolute",
          style: MARKER_CORNERS[position],
          tail: CORNER_TAIL[position],
          pinId: annotationId,
          unseen,
          active: isActive,
          controls: popoverId,
          onClick: handleClick,
          onMouseEnter: () => setHoveredAnnotationId(annotationId),
          onMouseLeave: () => setHoveredAnnotationId(null),
        }),

      // The thread on its pin, covering it. Out of the frame, in the fixed layer with the other
      // pins' threads: inside it, the pins out there would draw over it.
      showMarkers &&
        isActive &&
        wrapperRef.current &&
        createPortal(
          React.createElement(AnnotationPopover, {
            id: popoverId,
            annotation,
            showComments: !!commentsConfig,
            comments,
            isLoading,
            error,
            onSubmit: submitComment,
            onClose: close,
            pinId: annotationId,
            style: getPinPopoverStyle(
              pinBoxAtCorner(wrapperRef.current.getBoundingClientRect(), position),
              300,
              POPOVER_MAX_HEIGHT
            ),
          }),
          document.body
        )
    )
  );
}
