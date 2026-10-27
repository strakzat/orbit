/**
 * Server-side helpers for Notion comments API.
 * Import from "@strakzat/orbit/server"
 */

import type { Comment } from "./types";

interface CommentInput {
  annotationId: string;
  auteur?: string;
  comment: string;
  pagina?: string;
  label?: string;
  /** The variants the feedback was given in, a line each. Sent by Orbit when the project has any. */
  varianten?: string;
}

/**
 * Builds Notion page properties for creating a comment.
 * Use this in your POST /api/comments handler to ensure all fields are included.
 *
 * `Varianten` is only written when the comment carries variants, so a database without that
 * column keeps working for a project without variants. A project with variants needs the column
 * (rich text), or Notion refuses the page.
 */
export function buildNotionCommentProperties(
  input: CommentInput,
  projectId: string
): Record<string, unknown> {
  const properties: Record<string, unknown> = {
    Naam: {
      title: [{ text: { content: input.comment } }],
    },
    Auteur: {
      rich_text: [{ text: { content: input.auteur || "Anoniem" } }],
    },
    Comment: {
      rich_text: [{ text: { content: input.comment } }],
    },
    Status: {
      select: { name: "Open" },
    },
    Project: {
      relation: [{ id: projectId }],
    },
    "Annotatie ID": {
      rich_text: [{ text: { content: input.annotationId } }],
    },
    Label: {
      rich_text: [{ text: { content: input.label || "" } }],
    },
    Pagina: {
      rich_text: [{ text: { content: input.pagina || "" } }],
    },
  };
  if (input.varianten) {
    // Notion takes at most 2000 characters in one text object.
    properties.Varianten = { rich_text: [{ text: { content: input.varianten.slice(0, 2000) } }] };
  }
  return properties;
}

/**
 * Parses a Notion page result into a Comment object.
 * Use this in your GET /api/comments handler.
 */
export function parseNotionComment(page: any): Comment {
  return {
    id: page.id,
    annotationId: getPlainText(page.properties["Annotatie ID"]),
    auteur: getPlainText(page.properties["Auteur"]),
    comment: getPlainText(page.properties["Comment"]),
    label: getPlainText(page.properties["Label"]),
    status: page.properties["Status"]?.select?.name ?? "Open",
    aangemaakt: page.properties["Aangemaakt"]?.created_time ?? page.created_time,
    antwoord: getPlainText(page.properties["Antwoord"]),
    pagina: getPlainText(page.properties["Pagina"]),
    varianten: getPlainText(page.properties["Varianten"]) || undefined,
  };
}

function getPlainText(property: any): string {
  if (!property) return "";
  if (property.rich_text) {
    return property.rich_text.map((t: any) => t.plain_text).join("");
  }
  if (property.title) {
    return property.title.map((t: any) => t.plain_text).join("");
  }
  return "";
}
