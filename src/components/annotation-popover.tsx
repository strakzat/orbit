import React, { useEffect, useRef } from "react";
import { cx } from "../utils/cx";
import { useAnnotationsSafe } from "../context/use-annotations-safe";
import { formatDate } from "../utils/format";
import { TypeBadge } from "./type-badge";
import { CommentThread } from "./comment-thread";
import { CommentForm } from "./comment-form";
import { usePinMorph } from "../hooks/use-pin-morph";
import { MessageSquareTextIcon, XIcon } from "../icons";
import type { Annotation, Comment } from "../types";

interface AnnotationPopoverProps {
  /** A section between the comments and the composer. */
  extra?: React.ReactNode;
  /** Referenced by the trigger's aria-controls. */
  id: string;
  annotation?: Annotation;
  /** Rendered above the annotation section; the inspector puts its element label here. */
  header?: React.ReactNode;
  showComments: boolean;
  comments: Comment[];
  isLoading: boolean;
  error: string | null;
  onSubmit: (data: { auteur: string; comment: string }) => Promise<void>;
  onClose: () => void;
  /** Runtime placement from popover-position.ts. */
  style?: React.CSSProperties;
  variant?: "marker" | "inspector";
  extraProps?: Record<string, string>;
  /** The pin that opened it (`data-orbit-pin`): it grows out of that pin, and back into it. */
  pinId?: string;
}

/**
 * The panel that opens off an annotation marker. One implementation for the wrapped
 * markers, the auto-discovered markers and the inspector — they had drifted into
 * three different radii, paddings and shadows for the same thing.
 */
export function AnnotationPopover({
  extra,
  id,
  annotation,
  header,
  showComments,
  comments,
  isLoading,
  error,
  onSubmit,
  onClose,
  style,
  variant = "marker",
  extraProps,
  pinId,
}: AnnotationPopoverProps) {
  const { labels, language } = useAnnotationsSafe();
  const ref = useRef<HTMLDivElement>(null);
  usePinMorph(ref, pinId);
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return React.createElement(
    "div",
    {
      id,
      ref,
      className: cx(
        "orbit-root",
        "orbit-popover",
        "orbit-glass-pane",
        // Opened from a pin, it morphs out of the pin instead (usePinMorph).
        !pinId && "orbit-animate-in",
        variant === "inspector" && "orbit-popover--inspector"
      ),
      style,
      lang: language,
      role: "group",
      "aria-label": annotation ? annotation.title : labels.viewFeedback,
      onClick: (e: React.MouseEvent) => e.stopPropagation(),
      ...extraProps,
    },

    // Every popover carries its own close button, top-right, so it is dismissable by
    // click as well as by Escape or re-clicking the pin.
    React.createElement(
      "button",
      {
        type: "button",
        className: "orbit-icon-button orbit-popover__close",
        onClick: onClose,
        "aria-label": labels.close,
      },
      React.createElement(XIcon, { size: 16 })
    ),

    React.createElement(ThreadSections, {
      annotation,
      header,
      showComments,
      comments,
      isLoading,
      error,
      onSubmit,
      // On the canvas: the viewer is on the page already.
      hidePages: true,
      extra,
    })
  );
}

type ThreadSectionsProps = Pick<
  AnnotationPopoverProps,
  "annotation" | "header" | "extra" | "showComments" | "comments" | "isLoading" | "error" | "onSubmit"
>;

/**
 * What a thread is: the annotation, if there is one, the feedback on it, and the composer.
 * The popover on the page and the thread page in the panel both show it.
 */
export function ThreadSections({
  annotation,
  header,
  showComments,
  comments,
  isLoading,
  error,
  onSubmit,
  hidePages,
  extra,
}: ThreadSectionsProps & { hidePages?: boolean }) {
  const { labels } = useAnnotationsSafe();
  const type = annotation?.type ?? "documentation";

  return React.createElement(
    React.Fragment,
    null,
    header,

    annotation &&
      React.createElement(
        "div",
        { className: "orbit-popover__section" },
        React.createElement(TypeBadge, { type }),
        React.createElement("div", { className: "orbit-popover__title" }, annotation.title),
        React.createElement("div", { className: "orbit-popover__body" }, annotation.body),
        React.createElement(
          "div",
          { className: "orbit-popover__meta" },
          `${annotation.author} · ${formatDate(annotation.date)}`
        )
      ),

    showComments &&
      React.createElement(
        "div",
        { className: "orbit-popover__section" },
        React.createElement(
          "div",
          { className: "orbit-section-heading" },
          React.createElement(MessageSquareTextIcon, { size: 12 }),
          labels.viewFeedback,
          comments.length > 0 &&
            React.createElement("span", { className: "orbit-count" }, comments.length)
        ),
        React.createElement(CommentThread, { comments, isLoading, error, hidePages })
      ),

    extra,

    // The composer is the thread's last section, under a divider like the others: part of the
    // thread, not a field floating in it.
    showComments &&
      React.createElement(
        "div",
        { className: "orbit-popover__section orbit-popover__compose" },
        React.createElement(CommentForm, { onSubmit })
      )
  );
}
