import React, { useState, useEffect, useRef } from "react";
import { useAnnotationStyles } from "../styles/inject";
import { useAnnotationsSafe } from "../context/use-annotations-safe";
import { CommentCard } from "./comment-card";
import type { Comment } from "../types";

interface CommentThreadProps {
  comments: Comment[];
  isLoading: boolean;
  error: string | null;
}

export function CommentThread({ comments, isLoading, error }: CommentThreadProps) {
  useAnnotationStyles();
  const { labels, isOwnComment, deleteComment } = useAnnotationsSafe();
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
      message
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
        onDelete: isOwnComment(comment.id) ? remove(comment.id) : undefined,
      })
    )
  );
}
