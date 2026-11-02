import { TOKENS_CSS } from "./tokens";
import { RULES_CSS } from "./rules";
import { FONT_CSS } from "./font";

export const STYLE_ATTR = "data-orbit-styles";
export const CURSOR_ATTR = "data-orbit-cursor";

/** The font, the tokens, then the reset, then the component rules — source order matters. */
export const SHEET_CSS = `${FONT_CSS}\n${TOKENS_CSS}\n${RULES_CSS}`;

/**
 * The inspector's crosshair has to reach every element on the page, so it is the one
 * rule that cannot be scoped to `.orbit-root`. It is injected only while the inspector
 * is picking, and removed the moment it stops.
 */
export const CURSOR_CSS = `*, *::before, *::after { cursor: crosshair !important; }`;
