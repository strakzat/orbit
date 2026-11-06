import React, { useState, useEffect, useRef } from "react";
import { useAnnotationStyles } from "../styles/inject";
import { useAnnotationsSafe } from "../context/use-annotations-safe";
import { CommentCard } from "./comment-card";
import type { Comment } from "../types";

interface CommentThreadProps {
  comments: Comment[];
  isLoading: boolean;
  error: string | null;
  /** Leaves the pages out of where each comment was placed. */
  hidePages?: boolean;
}

export function CommentThread({ comments, isLoading, error, hidePages }: CommentThreadProps) {
  useAnnotationStyles();
  const { labels, isOwnComment, deleteComment, discardComment } = useAnnotationsSafe();
  const ref = useRef<HTMLDivElement>(null);
  // Said once a comment of the viewer's is gone; the focus stays in the thread it was in.
  const [notice, setNotice] = useState("");

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const status = React.createElement("span", { className: "orbit-sr-only", role: "status" }, notice);
  const remove = (id: string) => async () => {
    await deleteComment(id);
    setNotice(labels.commentDeleted);
    ref.current?.focus();
  };

  // Never sent, so nothing to ask the API: it only leaves this page.
  const discard = (id: string) => async () => {
    discardComment(id);
    setNotice(labels.commentDeleted);
    ref.current?.focus();
  };

  if (comments.length === 0) {
    const [message, isError] = isLoading
      ? [labels.commentsLoading, false]
      : error
        ? [labels.commentsError, true]
        : [labels.commentsEmpty, false];

    // role changes with the message so a failure interrupts and a status does not.
    return React.createElement(
      "div",
      {
        ref,
        tabIndex: -1,
        className: isError ? "orbit-root orbit-empty orbit-empty--error" : "orbit-root orbit-empty",
        role: isError ? "alert" : "status",
      },
      message,
      // The last comment deleted: the notice still has to be said.
      status
    );
  }

  return React.createElement(
    "div",
    { ref, tabIndex: -1, className: "orbit-root orbit-thread" },
    status,
    ...comments.map((comment) =>
      React.createElement(CommentCard, {
        key: comment.id,
        comment,
        hidePages,
        onDelete:
          comment.delivery === "failed"
            ? discard(comment.id)
            : isOwnComment(comment.id)
              ? remove(comment.id)
              : undefined,
      })
    )
  );
}
