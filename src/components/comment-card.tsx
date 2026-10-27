import React from "react";
import { useAnnotationsSafe } from "../context/use-annotations-safe";
import { cx } from "../utils/cx";
import { initials, relativeTime } from "../utils/format";
import { StatusPill } from "./status-pill";
import type { Comment } from "../types";

interface CommentCardProps {
  comment: Comment;
  /** Shows the element reference the comment was left on. */
  showLabel?: boolean;
  footer?: React.ReactNode;
  /**
   * Opens this comment's thread on the page. Leave it out for a thread inside a
   * popover, where the comments are already shown in full.
   */
  onSelect?: () => void;
  isActive?: boolean;
  activateLabel?: string;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

/**
 * One comment, as it appears in a thread and in the panel's feedback list. An avatar
 * monogram sits in its own column; the author, a relative time and the status share
 * the first row, the comment text and any admin reply follow beneath.
 */
export function CommentCard({
  comment,
  showLabel,
  footer,
  onSelect,
  isActive,
  activateLabel,
  onMouseEnter,
  onMouseLeave,
}: CommentCardProps) {
  const { labels } = useAnnotationsSafe();
  return React.createElement(
    "div",
    {
      className: cx(
        "orbit-comment",
        onSelect && "orbit-comment--clickable",
        isActive && "orbit-comment--active"
      ),
      onMouseEnter,
      onMouseLeave,
    },

    onSelect &&
      React.createElement(
        "button",
        {
          type: "button",
          className: "orbit-comment__target",
          onClick: onSelect,
          "aria-expanded": !!isActive,
        },
        React.createElement(
          "span",
          { className: "orbit-sr-only" },
          activateLabel ?? `Feedback van ${comment.auteur}`
        )
      ),

    showLabel &&
      comment.label &&
      React.createElement("div", { className: "orbit-comment__label" }, comment.label),

    React.createElement(
      "span",
      { className: "orbit-avatar", "aria-hidden": true },
      initials(comment.auteur)
    ),

    React.createElement(
      "div",
      { className: "orbit-comment__body" },

      React.createElement(
        "div",
        { className: "orbit-comment__head" },
        React.createElement("span", { className: "orbit-comment__author" }, comment.auteur),
        React.createElement(
          "span",
          { className: "orbit-comment__time-rel" },
          relativeTime(comment.aangemaakt)
        ),
        React.createElement(StatusPill, { status: comment.status })
      ),

      React.createElement("div", { className: "orbit-comment__text" }, comment.comment),

      // The variants it was written in, on one line: a list entry is no place for more.
      comment.varianten
        ? React.createElement(
            "div",
            { className: "orbit-comment__variants" },
            React.createElement("span", { className: "orbit-sr-only" }, `${labels.variants}: `),
            comment.varianten.split("\n").join(" · ")
          )
        : null,

      comment.antwoord
        ? React.createElement(
            "div",
            { className: "orbit-comment__reply" },
            React.createElement(
              "span",
              { className: "orbit-comment__reply-label" },
              "Antwoord"
            ),
            React.createElement(
              "span",
              { className: "orbit-comment__reply-text" },
              comment.antwoord
            )
          )
        : null,

      footer
    )
  );
}
