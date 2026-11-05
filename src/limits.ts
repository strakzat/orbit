/**
 * The most a comment can say. Shared by the composer and the server, and free of React, so the
 * server entry can import it. Notion would take 200,000 characters; this is about the limit of one
 * point, a short paragraph. Feedback is separate messages: more than this is usually two.
 */
export const MAX_COMMENT_LENGTH = 500;

/** Where a viewer goes when feedback can't reach us: the failure a retry won't solve. */
export const SUPPORT_EMAIL = "info@strakzat.com";
