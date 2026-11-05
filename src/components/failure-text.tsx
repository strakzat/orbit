import React from "react";
import { useAnnotationsSafe } from "../context/use-annotations-safe";
import { SUPPORT_EMAIL } from "../limits";
import { fill } from "../labels";
import { failureLabel } from "../utils/send-failure";
import type { SendFailure } from "../types";

/** Why a comment didn't go out, with our address as a link where the sentence gives it. */
export function FailureText({ failure }: { failure: SendFailure | undefined }) {
  const { labels, commentsConfig } = useAnnotationsSafe();
  const text = failureLabel(labels, failure);
  const at = text.indexOf(SUPPORT_EMAIL);
  if (at < 0) return React.createElement(React.Fragment, null, text);

  // Which project, so the mail says where without the viewer having to.
  const subject = fill(labels.sendFailureMailSubject, { project: commentsConfig?.project ?? "" });
  return React.createElement(
    React.Fragment,
    null,
    text.slice(0, at),
    React.createElement(
      "a",
      { className: "orbit-failure-link", href: `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}` },
      SUPPORT_EMAIL
    ),
    text.slice(at + SUPPORT_EMAIL.length)
  );
}
