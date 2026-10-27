import React, { useState, useEffect } from "react";
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
  const { labels } = useAnnotationsSafe();

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

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
        className: isError ? "orbit-root orbit-empty orbit-empty--error" : "orbit-root orbit-empty",
        role: isError ? "alert" : "status",
      },
      message
    );
  }

  return React.createElement(
    "div",
    { className: "orbit-root orbit-thread" },
    ...comments.map((comment) =>
      React.createElement(CommentCard, { key: comment.id, comment })
    )
  );
}
