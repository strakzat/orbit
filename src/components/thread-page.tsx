import React from "react";
import { useAnnotations } from "../context/use-annotations";
import { useComments } from "../hooks/use-comments";
import { ChevronLeftIcon, XIcon } from "../icons";
import { fill } from "../labels";
import { isComponentWide } from "../utils/route-matching";
import { ThreadSections } from "./annotation-popover";
import { InstanceComments } from "./instance-comments";
import { PlaceTrail } from "./place-trail";
import type { Annotation, Comment } from "../types";

/** A thread opened from the panel: an annotation with its feedback, or feedback on an element. */
export type PanelThread =
  | { kind: "annotation"; annotation: Annotation }
  | { kind: "feedback"; annotationId: string; label: string; component?: string; pagina?: string };

interface ThreadPageProps {
  thread: PanelThread;
  /** The view it was opened from: the back button's text. */
  backLabel: string;
  backRef: React.Ref<HTMLButtonElement>;
  onBack: () => void;
  onClose: () => void;
  /** Goes from a component's thread to the thread of one of its instances. */
  onOpenInstance: (comment: Comment) => void;
}

/**
 * A thread as a page of the panel, pushed over the list it was opened from. The panel is where
 * you browse; reading one item stays there too, rather than in a popover on the page that the
 * panel can sit on top of. The panel keeps the element in the spotlight while it is open, so the
 * page still says where it is.
 */
export function ThreadPage({ thread, backLabel, backRef, onBack, onClose, onOpenInstance }: ThreadPageProps) {
  const { labels, commentsConfig, refreshComments, markSeen, setPanelThreadId } = useAnnotations();

  const annotationId = thread.kind === "annotation" ? thread.annotation.id : thread.annotationId;

  // Open, its thread is read: also what arrives while it is (markSeen follows the comments).
  React.useEffect(() => markSeen(annotationId), [annotationId, markSeen]);

  // Open, the viewer sees the prototype as the thread was written in it.
  React.useEffect(() => {
    setPanelThreadId(annotationId);
    return () => setPanelThreadId(null);
  }, [annotationId, setPanelThreadId]);
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
          // Old feedback without a label: the selector, to show something, never to send.
          React.createElement(
            PlaceTrail,
            isComponentWide(thread)
              ? { className: "orbit-mono", component: thread.component }
              : {
                  className: "orbit-mono",
                  component: thread.component,
                  pagina: thread.pagina,
                  element: thread.label || thread.annotationId,
                }
          )
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
        extra:
          thread.kind === "feedback" && thread.component && isComponentWide(thread)
            ? React.createElement(InstanceComments, { component: thread.component, onOpen: onOpenInstance })
            : undefined,
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
