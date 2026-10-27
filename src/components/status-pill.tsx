import React from "react";
import { STATUS_SLUGS } from "../styles/tokens";
import { useAnnotationsSafe } from "../context/use-annotations-safe";
import type { Comment } from "../types";

interface StatusPillProps {
  status: Comment["status"];
}

/** The single source for how a comment status looks, in the panel and in a thread. */
export function StatusPill({ status }: StatusPillProps) {
  const { labels } = useAnnotationsSafe();
  return React.createElement(
    "span",
    { className: "orbit-status", "data-orbit-status": STATUS_SLUGS[status] },
    labels.status[status]
  );
}
