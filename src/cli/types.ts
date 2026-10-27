/**
 * Types for the `orbit-feedback` CLI. Kept self-contained (independent of the
 * React library's public types) so the CLI can evolve with the Notion schema
 * without touching the component API.
 */

export type CommentStatus =
  | "Open"
  | "In behandeling"
  | "In review"
  | "Opgelost"
  | "Afgewezen";

/**
 * A single piece of client feedback, as read from the Notion database.
 * Mirrors the Notion row; `component`/`bron`/`pr` are empty when absent.
 */
export interface FeedbackItem {
  /** Notion page id. */
  id: string;
  project: string;
  /** CSS element path or annotation id the comment was attached to. */
  annotationId: string;
  label: string;
  pagina: string;
  auteur: string;
  comment: string;
  component: string;
  bron: string;
  status: CommentStatus;
  antwoord: string | null;
  pr: string;
  /** The variants the feedback was given in, a line each; empty when there were none. */
  varianten: string;
  /** Notion `created_time`. */
  aangemaakt: string;
}
