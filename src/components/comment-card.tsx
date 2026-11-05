import React, { useEffect, useRef, useState } from "react";
import { useAnnotationsSafe } from "../context/use-annotations-safe";
import { cx } from "../utils/cx";
import { initials, relativeTime } from "../utils/format";
import { fill } from "../labels";
import { canRetry } from "../utils/send-failure";
import { FailureText } from "./failure-text";
import { StatusPill } from "./status-pill";
import { ComponentChip } from "./component-chip";
import { TrashIcon } from "../icons";
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
  onSelect?: (e: React.MouseEvent<HTMLElement>) => void;
  isActive?: boolean;
  activateLabel?: string;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  /** The viewer's own comment, in a thread: it can be deleted, after a question. */
  onDelete?: () => Promise<void>;
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
  onDelete,
}: CommentCardProps) {
  const { labels, retryComment } = useAnnotationsSafe();
  // Deleting asks first, in the card: Annuleren, or Verwijderen.
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteFailed, setDeleteFailed] = useState(false);
  const trashRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const askedRef = useRef(false);
  useEffect(() => {
    // The question takes the focus, on the safe answer; dismissed, the focus goes back to the bin.
    if (confirming) cancelRef.current?.focus();
    else if (askedRef.current) trashRef.current?.focus();
    askedRef.current = confirming;
  }, [confirming]);

  const cancel = () => {
    setConfirming(false);
    setDeleteFailed(false);
  };
  const confirmDelete = async () => {
    if (!onDelete || deleting) return;
    setDeleting(true);
    setDeleteFailed(false);
    try {
      await onDelete();
    } catch {
      setDeleteFailed(true);
      setDeleting(false);
    }
  };
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
          activateLabel ?? fill(labels.feedbackFrom, { name: comment.auteur })
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
          comment.delivery === "sending"
            ? labels.commentSending
            : comment.delivery === "failed"
              ? labels.commentNotSent
              : relativeTime(comment.aangemaakt, labels)
        ),
        React.createElement(StatusPill, { status: comment.status }),
        onDelete &&
          React.createElement(
            "button",
            {
              ref: trashRef,
              type: "button",
              className: cx("orbit-icon-button", "orbit-comment__delete", confirming && "orbit-comment__delete--open"),
              onClick: () => setConfirming(true),
              "aria-label": labels.commentDelete,
              "aria-expanded": confirming,
              title: labels.commentDelete,
            },
            React.createElement(TrashIcon, { size: 14 })
          )
      ),

      React.createElement("div", { className: "orbit-comment__text" }, comment.comment),

      // The toast is gone after a while; the comment and its retry stay here.
      comment.delivery === "failed" &&
        React.createElement(
          "p",
          { className: "orbit-comment__failure" },
          React.createElement(FailureText, { failure: comment.deliveryFailure })
        ),
      // Not in the panel's list: the card opens the thread, and the button is there.
      comment.delivery === "failed" &&
        !onSelect &&
        canRetry(comment.deliveryFailure) &&
        React.createElement(
          "button",
          {
            type: "button",
            className: "orbit-comment__confirm-button orbit-comment__retry",
            onClick: () => retryComment(comment.id),
          },
          labels.commentRetry
        ),

      // Given on a component: it shows wherever the component is, so the card says which.
      comment.component
        ? React.createElement(
            "div",
            { className: "orbit-comment__component" },
            React.createElement(
              "span",
              { className: "orbit-sr-only" },
              fill(labels.componentNamed, { name: comment.component })
            ),
            React.createElement(
              "span",
              { "aria-hidden": true },
              React.createElement(ComponentChip, { name: comment.component })
            )
          )
        : null,

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
              labels.reply
            ),
            React.createElement(
              "span",
              { className: "orbit-comment__reply-text" },
              comment.antwoord
            )
          )
        : null,

      confirming &&
        React.createElement(
          "div",
          {
            className: "orbit-comment__confirm",
            role: "group",
            "aria-label": labels.commentDeleteConfirm,
            // Escape answers the question, rather than closing the thread around it.
            onKeyDown: (e: React.KeyboardEvent) => {
              if (e.key !== "Escape") return;
              e.stopPropagation();
              cancel();
            },
          },
          React.createElement("span", { className: "orbit-comment__confirm-text" }, labels.commentDeleteConfirm),
          React.createElement(
            "button",
            { ref: cancelRef, type: "button", className: "orbit-comment__confirm-button", onClick: cancel },
            labels.commentDeleteCancel
          ),
          React.createElement(
            "button",
            {
              type: "button",
              className: "orbit-comment__confirm-button orbit-comment__confirm-button--danger",
              onClick: confirmDelete,
              disabled: deleting,
            },
            labels.commentDeleteSubmit
          ),
          deleteFailed &&
            React.createElement("p", { className: "orbit-error orbit-comment__confirm-error", role: "alert" }, labels.commentDeleteError)
        ),

      footer
    )
  );
}
