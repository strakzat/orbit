import React, { useContext, useState, useEffect } from "react";
import { useAnnotationStyles } from "../styles/inject";
import { AnnotationContext } from "../context/annotation-context";
import { useAnnotationsSafe } from "../context/use-annotations-safe";
import { fill } from "../labels";
import { useStableId } from "../utils/use-stable-id";
import { AlertCircleIcon } from "../icons";

interface CommentFormProps {
  onSubmit: (data: { auteur: string; comment: string }) => Promise<void>;
}

export function CommentForm({ onSubmit }: CommentFormProps) {
  useAnnotationStyles();
  const { labels } = useAnnotationsSafe();

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const nameId = useStableId("orbit-name");
  const commentId = useStableId("orbit-comment");
  const errorId = useStableId("orbit-error");

  // The name is the viewer's, set once in the rail's profile. Outside the provider there is no
  // profile, and the form keeps its own.
  const context = useContext(AnnotationContext);
  const [ownName, setOwnName] = useState("");
  const auteur = context ? context.viewer.name : ownName;
  const setAuteur = context ? context.setViewerName : setOwnName;
  // With a name, the field gives way to "Als …"; typing one in keeps the field until the form goes.
  const [showName, setShowName] = useState(false);
  const nameVisible = showName || !auteur.trim();

  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!mounted) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auteur.trim() || !comment.trim()) return;

    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmit({ auteur: auteur.trim(), comment: comment.trim() });
      setComment("");
    } catch {
      setError(labels.formError);
    } finally {
      setIsSubmitting(false);
    }
  };

  return React.createElement(
    "form",
    { className: "orbit-root orbit-form", onSubmit: handleSubmit },

    nameVisible
      ? React.createElement(
          React.Fragment,
          null,
          React.createElement("label", { className: "orbit-sr-only", htmlFor: nameId }, labels.formName),
          React.createElement("input", {
            id: nameId,
            className: "orbit-input",
            type: "text",
            autoComplete: "name",
            // Opened from "Als …": the focus follows the button that is gone.
            autoFocus: showName,
            placeholder: labels.formName,
            value: auteur,
            onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
              setShowName(true);
              setAuteur(e.target.value);
            },
            "aria-invalid": error ? true : undefined,
            "aria-describedby": error ? errorId : undefined,
          })
        )
      : React.createElement(
          "button",
          {
            type: "button",
            className: "orbit-link orbit-form__as",
            onClick: () => setShowName(true),
          },
          fill(labels.formAs, { name: auteur.trim() })
        ),

    React.createElement(
      "label",
      { className: "orbit-sr-only", htmlFor: commentId },
      labels.formComment
    ),
    React.createElement("textarea", {
      id: commentId,
      className: "orbit-input orbit-textarea",
      placeholder: labels.formCommentPlaceholder,
      value: comment,
      rows: 3,
      onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => setComment(e.target.value),
      "aria-invalid": error ? true : undefined,
      "aria-describedby": error ? errorId : undefined,
    }),

    // role="alert" so the failure is announced, not only shown in red.
    error &&
      React.createElement(
        "div",
        { id: errorId, className: "orbit-error", role: "alert" },
        React.createElement(AlertCircleIcon, { size: 14 }),
        error
      ),

    React.createElement(
      "button",
      {
        type: "submit",
        className: "orbit-button",
        disabled: isSubmitting || !auteur.trim() || !comment.trim(),
      },
      isSubmitting ? labels.formSubmitting : labels.formSubmit
    )
  );
}
