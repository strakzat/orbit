import React from "react";
import { useAnnotations } from "../context/use-annotations";
import { useComments } from "../hooks/use-comments";
import { ChevronLeftIcon, XIcon } from "../icons";
import { fill } from "../labels";
import { ThreadSections } from "./annotation-popover";
import { ComponentHead } from "./component-chip";
import type { Annotation } from "../types";

/** A thread opened from the panel: an annotation with its feedback, or feedback on an element. */
export type PanelThread =
  | { kind: "annotation"; annotation: Annotation }
  | { kind: "feedback"; annotationId: string; label: string; component?: string };

interface ThreadPageProps {
  thread: PanelThread;
  /** The view it was opened from: the back button's text. */
  backLabel: string;
  backRef: React.Ref<HTMLButtonElement>;
  onBack: () => void;
  onClose: () => void;
}

/**
 * A thread as a page of the panel, pushed over the list it was opened from. The panel is where
 * you browse; reading one item stays there too, rather than in a popover on the page that the
 * panel can sit on top of. The panel keeps the element in the spotlight while it is open, so the
 * page still says where it is.
 */
export function ThreadPage({ thread, backLabel, backRef, onBack, onClose }: ThreadPageProps) {
  const { labels, commentsConfig, refreshComments, markSeen } = useAnnotations();

  const annotationId = thread.kind === "annotation" ? thread.annotation.id : thread.annotationId;

  // Open, its thread is read: also what arrives while it is (markSeen follows the comments).
  React.useEffect(() => markSeen(annotationId), [annotationId, markSeen]);
  const label = thread.kind === "annotation" ? thread.annotation.title : thread.label;

  const { comments, isLoading, error, submitComment } = useComments({
    apiBase: commentsConfig?.apiBase ?? "",
    project: commentsConfig?.project ?? "",
    annotationId,
    label,
    // Also while it slides out after Back: emptied then, it would slide out blank. The panel
    // unmounts it once it is out.
    enabled: !!commentsConfig,
    component: thread.kind === "feedback" ? thread.component : undefined,
  });

  const header =
    thread.kind === "feedback"
      ? React.createElement(
          "div",
          { className: "orbit-popover__section" },
          thread.component && React.createElement(ComponentHead, { name: thread.component, labels }),
          // Old feedback without a label: the selector, to show something, never to send.
          React.createElement("div", { className: "orbit-mono" }, thread.label || thread.annotationId)
        )
      : undefined;

  return React.createElement(
    React.Fragment,
    null,
    React.createElement(
      "div",
      { className: "orbit-panel__header" },
      React.createElement(
        "button",
        {
          ref: backRef,
          type: "button",
          className: "orbit-back",
          onClick: onBack,
          "aria-label": fill(labels.threadBack, { view: backLabel }),
        },
        React.createElement(ChevronLeftIcon, { size: 16 }),
        backLabel
      ),
      React.createElement(
        "button",
        {
          type: "button",
          className: "orbit-icon-button",
          onClick: onClose,
          "aria-label": labels.closePanel,
        },
        React.createElement(XIcon, { size: 16 })
      )
    ),
    React.createElement(
      "div",
      { className: "orbit-thread-page" },
      React.createElement(ThreadSections, {
        annotation: thread.kind === "annotation" ? thread.annotation : undefined,
        header,
        showComments: !!commentsConfig,
        comments,
        isLoading,
        error,
        // The list behind it, its tab and the rail count the new comment at once, not at the next poll.
        onSubmit: async (data) => {
          await submitComment(data);
          void refreshComments();
        },
      })
    )
  );
}
