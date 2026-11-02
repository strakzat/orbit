// Bundled by tsup as data URLs (`loader` in tsup.config.ts): no request to a font
// service from the project's site, and nothing to load under a strict CSP's `font-src`
// beyond `data:`. Latin only, from Fontsource.
import INTER_LATIN_WGHT from "./fonts/inter-latin-wght-normal.woff2";
import GEIST_MONO_LATIN_400 from "./fonts/geist-mono-latin-400-normal.woff2";

// Fontsource's Latin subset; anything outside it falls through to the rest of the stack.
const LATIN =
  "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, " +
  "U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD";

/**
 * Inter (variable, every weight from 100 to 900 in one file) and Geist Mono (regular, the
 * only weight the mono text uses), under names of Orbit's own, so they never collide with
 * an `Inter` or `Geist Mono` the project declares.
 */
export const FONT_CSS = `
@font-face {
  font-family: "Orbit Inter";
  font-style: normal;
  font-weight: 100 900;
  font-display: swap;
  src: url("${INTER_LATIN_WGHT}") format("woff2");
  unicode-range: ${LATIN};
}

@font-face {
  font-family: "Orbit Geist Mono";
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url("${GEIST_MONO_LATIN_400}") format("woff2");
  unicode-range: ${LATIN};
}
`;
