import React, { useEffect, useRef, useState } from "react";
import { Toaster, toast } from "sonner";
import { useAnnotationsSafe } from "../context/use-annotations-safe";
import { useAnnotationStyles } from "../styles/inject";
import { AlertCircleIcon } from "../icons";
import { ORBIT_UI_ATTR } from "../constants";
import { canRetry } from "../utils/send-failure";
import { FailureText } from "./failure-text";
import type { AnnotationLabels, Comment } from "../types";

// Long enough to read two lines and reach for the button; hovering holds it. The comment stays
// behind in its thread, so running out loses nothing.
const TOAST_MS = 10_000;

/** Untitled UI's floating alert in Orbit's glass, with one action. */
function FailedAlert({
  comment,
  labels,
  language,
  onRetry,
}: {
  comment: Comment;
  labels: AnnotationLabels;
  language: string;
  onRetry: () => void;
}) {
  return React.createElement(
    "div",
    { className: "orbit-root orbit-alert orbit-glass-pane", lang: language, [ORBIT_UI_ATTR]: "" },
    React.createElement(
      "span",
      { className: "orbit-alert__icon", "aria-hidden": true },
      React.createElement(AlertCircleIcon, { size: 20 })
    ),
    React.createElement(
      "div",
      { className: "orbit-alert__body" },
      React.createElement(
        "div",
        null,
        React.createElement("p", { className: "orbit-alert__title" }, labels.feedbackFailed),
        React.createElement(
          "p",
          { className: "orbit-alert__description" },
          React.createElement(FailureText, { failure: comment.deliveryFailure })
        ),
      ),
      canRetry(comment.deliveryFailure) &&
        React.createElement(
          "button",
          { type: "button", className: "orbit-alert__action", onClick: onRetry },
          labels.commentRetry
        )
    )
  );
}

/**
 * The toasts for feedback that didn't go out: sent in the background, so there is no bubble left
 * to show it in. Sonner, bundled, does the placing, stacking and timing; `toast.custom` keeps
 * everything visible Orbit's. Its own copy, so it never mixes with a project's Sonner.
 */
export function FeedbackToasts() {
  useAnnotationStyles();
  const { commentsConfig, allComments, labels, language, retryComment } = useAnnotationsSafe();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Which failures have had their toast: a retry that fails again gets a new one.
  const toasted = useRef(new Set<string>());
  useEffect(() => {
    if (!mounted) return;
    const failed = allComments.filter((c) => c.delivery === "failed");
    for (const comment of failed) {
      if (toasted.current.has(comment.id)) continue;
      toasted.current.add(comment.id);
      toast.custom(
        () =>
          React.createElement(FailedAlert, {
            comment,
            labels,
            language,
            onRetry: () => retryComment(comment.id),
          }),
        { id: comment.id, duration: TOAST_MS }
      );
    }
    for (const id of toasted.current) {
      if (failed.some((c) => c.id === id)) continue;
      toasted.current.delete(id);
      toast.dismiss(id);
    }
  }, [mounted, allComments, labels, language, retryComment]);

  if (!mounted || !commentsConfig) return null;

  return React.createElement(Toaster, {
    className: "orbit-toaster",
    position: "bottom-center",
    offset: { bottom: "calc(var(--orbit-rail-height) + var(--orbit-space-4))" },
    mobileOffset: { bottom: "calc(var(--orbit-rail-height) + var(--orbit-space-4))" },
    containerAriaLabel: labels.toastsLabel,
    // Alt + T is the default: a shortcut Orbit doesn't get to take from the project.
    hotkey: [],
  });
}
