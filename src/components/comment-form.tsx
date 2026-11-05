import React, { useContext, useState, useEffect, useLayoutEffect, useRef } from "react";
import { useAnnotationStyles } from "../styles/inject";
import { AnnotationContext } from "../context/annotation-context";
import { useAnnotationsSafe } from "../context/use-annotations-safe";
import { cx } from "../utils/cx";
import { useStableId } from "../utils/use-stable-id";
import { AlertCircleIcon, ArrowUpIcon } from "../icons";
import { ANONYMOUS } from "../constants";
import { MAX_COMMENT_LENGTH } from "../limits";
import { fill } from "../labels";

// The counter stays out of the way until the limit is in sight.
const COUNT_FROM = Math.round(MAX_COMMENT_LENGTH * 0.8);

// Before mount there is no layout to measure; on the server useLayoutEffect only warns.
const useIsomorphicLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

interface CommentFormProps {
  onSubmit: (data: { auteur: string; comment: string }) => Promise<void>;
  /** Focus the field on mount: the inspector's bubble opens to be typed in. */
  autoFocus?: boolean;
  /** Small controls before the send button: beside it on one line, under the text once open. */
  tools?: React.ReactNode;
  className?: string;
}

/**
 * Figma's composer: one line with a send button beside it. Once there is text it opens up,
 * the send button drops below, and the field grows with what is typed. Enter sends, Shift +
 * Enter is a new line. The name is the viewer's, from the rail's profile; without one the
 * feedback goes out as Anonymous.
 */
export function CommentForm({ onSubmit, autoFocus, tools, className }: CommentFormProps) {
  useAnnotationStyles();
  const { labels } = useAnnotationsSafe();

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const commentId = useStableId("orbit-comment");
  const errorId = useStableId("orbit-error");
  const countId = useStableId("orbit-count");
  const fieldRef = useRef<HTMLTextAreaElement>(null);

  const context = useContext(AnnotationContext);
  const auteur = context?.viewer.name.trim() || ANONYMOUS;

  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const expanded = comment.length > 0;

  // The field is as tall as its text; the stylesheet caps it and scrolls beyond that.
  useIsomorphicLayoutEffect(() => {
    const field = fieldRef.current;
    if (!field) return;
    field.style.height = "auto";
    field.style.height = `${field.scrollHeight}px`;
  }, [comment, expanded, mounted]);

  if (!mounted) return null;

  const length = comment.trim().length;
  const over = length - MAX_COMMENT_LENGTH;
  const tooLong = over > 0;
  const canSend = !isSubmitting && length > 0 && !tooLong;
  const describedBy = [error && errorId, tooLong && countId].filter(Boolean).join(" ") || undefined;

  const send = async () => {
    if (!canSend) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmit({ auteur, comment: comment.trim() });
      setComment("");
    } catch {
      setError(labels.formError);
    } finally {
      setIsSubmitting(false);
    }
  };

  return React.createElement(
    "form",
    {
      className: cx("orbit-root orbit-composer", expanded && "orbit-composer--expanded", className),
      "aria-busy": isSubmitting || undefined,
      onSubmit: (e: React.FormEvent) => {
        e.preventDefault();
        void send();
      },
    },
    React.createElement("label", { className: "orbit-sr-only", htmlFor: commentId }, labels.formComment),
    React.createElement("textarea", {
      ref: fieldRef,
      id: commentId,
      className: "orbit-composer__field",
      placeholder: labels.formCommentPlaceholder,
      value: comment,
      rows: 1,
      autoFocus,
      onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => setComment(e.target.value),
      onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        // 229: Safari's Enter that confirms an IME's candidate, after the composition ended.
        if (e.key !== "Enter" || e.shiftKey || e.nativeEvent.isComposing || e.keyCode === 229) return;
        e.preventDefault();
        void send();
      },
      "aria-invalid": error || tooLong ? true : undefined,
      "aria-describedby": describedBy,
    }),

    // role="alert" so the failure is announced, not only shown in red.
    error &&
      React.createElement(
        "div",
        { id: errorId, className: "orbit-error orbit-composer__error", role: "alert" },
        React.createElement(AlertCircleIcon, { size: 14 }),
        error
      ),

    tools && React.createElement("div", { className: "orbit-composer__tools" }, tools),

    // Pasted text stays whole, so nothing is cut off unseen: it can't go until it is shorter.
    length >= COUNT_FROM &&
      React.createElement(
        "span",
        {
          id: countId,
          className: cx("orbit-composer__count", tooLong && "orbit-composer__count--over"),
          title: tooLong ? fill(labels.formTooLong, { max: MAX_COMMENT_LENGTH, over }) : undefined,
          "aria-label": tooLong ? fill(labels.formTooLong, { max: MAX_COMMENT_LENGTH, over }) : undefined,
        },
        fill(labels.formCount, { count: length, max: MAX_COMMENT_LENGTH })
      ),

    React.createElement(
      "button",
      {
        type: "submit",
        className: "orbit-composer__send",
        disabled: !canSend,
        "aria-label": isSubmitting ? labels.formSubmitting : labels.formSubmit,
        title: labels.formSubmit,
      },
      React.createElement(ArrowUpIcon, { size: 16 })
    )
  );
}
