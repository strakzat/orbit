import { SUPPORT_EMAIL } from "../limits";
import { fill } from "../labels";
import type { AnnotationLabels, SendFailure } from "../types";

// The rights and the database are the project's: Notion refusing them is a setup problem, and a
// validation error is a column that doesn't exist or doesn't fit. Retrying won't change either.
const SETUP_CODES = new Set([
  "not_configured",
  "unauthorized",
  "restricted_resource",
  "object_not_found",
  "validation_error",
]);

/** A refused send, with the reason the viewer gets told. The message is for the console. */
export class SendFailureError extends Error {
  constructor(
    readonly failure: SendFailure,
    message: string
  ) {
    super(message);
  }
}

/** What a status and the API's `code` (Notion's, passed on by the server) mean for the viewer. */
export function failureFromResponse(status: number, code?: string): SendFailure {
  if (status === 413) return "tooLarge";
  if (status === 429 || code === "rate_limited") return "busy";
  if (status === 401 || status === 403 || status === 404) return "setup";
  return code && SETUP_CODES.has(code) ? "setup" : "server";
}

/** What went wrong, from whatever a send threw. A `fetch` that rejects never got an answer. */
export function failureFrom(err: unknown, online: boolean): SendFailure {
  if (err instanceof SendFailureError) return err.failure;
  if ((err as Error | undefined)?.name === "AbortError") return "timeout";
  return online ? "network" : "offline";
}

/** Whether sending it again can help: not the same text refused again, or a route that isn't set up. */
export function canRetry(failure: SendFailure | undefined): boolean {
  return failure !== "tooLarge" && failure !== "setup";
}

/** The sentence for it, in the viewer's language. */
export function failureLabel(labels: AnnotationLabels, failure: SendFailure | undefined): string {
  switch (failure) {
    case "offline":
      return labels.sendFailureOffline;
    case "network":
      return labels.sendFailureNetwork;
    case "timeout":
      return labels.sendFailureTimeout;
    case "setup":
      return fill(labels.sendFailureSetup, { email: SUPPORT_EMAIL });
    case "tooLarge":
      return labels.sendFailureTooLarge;
    case "busy":
      return labels.sendFailureBusy;
    default:
      return labels.sendFailureServer;
  }
}
