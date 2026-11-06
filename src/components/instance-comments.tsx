import React from "react";
import { useAnnotationsSafe } from "../context/use-annotations-safe";
import { InstanceIcon } from "../icons";
import { isComponentWide } from "../utils/route-matching";
import { PlaceTrail } from "./place-trail";
import type { Comment } from "../types";

interface InstanceCommentsProps {
  component: string;
  /** Opens the instance's own thread: the comment is read here, and answered there. */
  onOpen: (comment: Comment) => void;
}

/**
 * In the thread of a whole component: what was said about its instances, on any page. A list and
 * not part of the thread, so an instance keeps its own pin, page and replies.
 */
export function InstanceComments({ component, onOpen }: InstanceCommentsProps) {
  const { allComments, labels } = useAnnotationsSafe();
  const comments = allComments.filter((c) => c.component === component && !isComponentWide(c));
  if (comments.length === 0) return null;

  return React.createElement(
    "div",
    { className: "orbit-popover__section" },
    React.createElement(
      "div",
      { className: "orbit-section-heading" },
      React.createElement(InstanceIcon, { size: 12 }),
      labels.instanceFeedback,
      React.createElement("span", { className: "orbit-count" }, comments.length)
    ),
    React.createElement(
      "div",
      { className: "orbit-instance-comments" },
      comments.map((comment) =>
        React.createElement(
          "button",
          { key: comment.id, type: "button", className: "orbit-instance-comment", onClick: () => onOpen(comment) },
          React.createElement(
            "span",
            { className: "orbit-instance-comment__text" },
            React.createElement("span", { className: "orbit-instance-comment__author" }, comment.auteur),
            comment.comment
          ),
          React.createElement(PlaceTrail, {
            className: "orbit-comment__place",
            pagina: comment.pagina,
            element: comment.label,
          })
        )
      )
    )
  );
}
