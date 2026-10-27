/**
 * Design tokens as CSS custom properties.
 *
 * The naming mirrors the Untitled UI semantic layer (`bg-primary`, `text-tertiary`,
 * `border-brand`, `*_hover`, `*_on-brand`) so the vocabulary matches the rest of our
 * projects, even though this package ships plain CSS instead of Tailwind. The dark
 * *values*, the default, are Radial's (strakzat/radial): its neutral ladder, white films
 * with a lit top edge for glass, a near-white primary and its blue focus ring. The light
 * values are still Geist's, for a project that asks for light.
 *
 * Every variable is prefixed `--orbit-` and lives on `:root`. They are a public API:
 * a consuming project may override any of them. Renaming one is a breaking change.
 *
 * Orbit is dark by default, whatever the OS or the project's theme: it is the studio's
 * chrome around a project, not the project. `[data-orbit-theme="light"]` on `<html>`
 * turns it light.
 */

import type { AnnotationType, Comment } from "../types";

export const PREFIX = "orbit";
export const THEME_ATTR = "data-orbit-theme";

/** Slug used in `data-orbit-status`, because the status values contain spaces. */
export const STATUS_SLUGS: Record<Comment["status"], string> = {
  "Open": "open",
  "In behandeling": "pending",
  "Opgelost": "resolved",
};

export const ANNOTATION_TYPES: AnnotationType[] = [
  "documentation",
  "pro",
  "question",
  "con",
  "suggestion",
  "critical",
  "user-insight",
];

type Vars = Record<string, string>;

// ── Light ────────────────────────────────────────────────────────────────────

const LIGHT: Vars = {
  // Surfaces
  "--orbit-bg-primary": "#FFFFFF",
  "--orbit-bg-primary_hover": "#FAFAFA",
  "--orbit-bg-secondary": "#FAFAFA",
  "--orbit-bg-secondary_hover": "#F2F2F2",
  "--orbit-bg-tertiary": "#F2F2F2",
  "--orbit-bg-quaternary": "#EBEBEB",
  "--orbit-bg-disabled": "#FAFAFA",

  // Foreground. Content greys stay >= 4.5:1 on bg-primary — timestamps, authors and
  // breadcrumbs are real text, not decoration, so they clear WCAG 1.4.3.
  "--orbit-text-primary": "#171717",
  "--orbit-text-secondary": "#525252", // 8.0:1
  "--orbit-text-tertiary": "#666666",  // 5.7:1
  "--orbit-text-quaternary": "#737373", // 4.74:1 — the muted grey, still readable
  "--orbit-text-disabled": "#A1A1A1",   // decorative only

  // Structure — Geist hairlines
  "--orbit-border-primary": "#E5E5E5",
  "--orbit-border-secondary": "#EDEDED",
  // Vercel's input border is a hairline that does not, on its own, clear the 3:1 of
  // WCAG 1.4.11; the 2px focus ring below carries the weight. Override to darken it.
  "--orbit-border-input": "#E0E0E0",

  // Focus — the Vercel blue, 2px ring
  "--orbit-outline-focus-ring": "#0070F3",

  // Statuses
  "--orbit-bg-error-primary": "#FEECEB",
  "--orbit-border-error": "#F5C4C0",
  "--orbit-text-error-primary": "#C4342B",
  "--orbit-bg-warning-primary": "#FFF7E6",
  "--orbit-border-warning": "#F5D98A",
  "--orbit-text-warning-primary": "#946200",
  "--orbit-bg-success-primary": "#E8F6EE",
  "--orbit-border-success": "#A9DEBE",
  "--orbit-text-success-primary": "#0F7A3D",

  // Feedback accent — the blue the inspector and comment badges share
  "--orbit-bg-feedback": "#EDF4FF",
  "--orbit-border-feedback": "#B3D3FF",
  "--orbit-text-feedback": "#0060D1",
  "--orbit-bg-feedback-solid": "#0070F3",
  "--orbit-text-feedback_on-solid": "#FFFFFF",

  // Fills for the boxes drawn over host elements while pointing at them
  "--orbit-overlay-fill": "rgba(0, 112, 243, 0.05)",
  "--orbit-overlay-fill-strong": "rgba(0, 112, 243, 0.09)",
  "--orbit-overlay-ring": "rgba(0, 112, 243, 0.20)",

  // Annotation types — kept colour-coded (icon + text carry the meaning too), toned
  // to sit quietly next to the monochrome chrome.
  "--orbit-type-documentation-bg": "#F4F4F4",
  "--orbit-type-documentation-border": "#E0E0E0",
  "--orbit-type-documentation-fg": "#525252",
  "--orbit-type-pro-bg": "#E8F6EE",
  "--orbit-type-pro-border": "#A9DEBE",
  "--orbit-type-pro-fg": "#0F7A3D",
  "--orbit-type-question-bg": "#EDF4FF",
  "--orbit-type-question-border": "#B3D3FF",
  "--orbit-type-question-fg": "#0060D1",
  "--orbit-type-con-bg": "#FEECEB",
  "--orbit-type-con-border": "#F5C4C0",
  "--orbit-type-con-fg": "#C4342B",
  "--orbit-type-suggestion-bg": "#F1EEFE",
  "--orbit-type-suggestion-border": "#D3C9FB",
  "--orbit-type-suggestion-fg": "#6941C6",
  "--orbit-type-critical-bg": "#FFF1E8",
  "--orbit-type-critical-border": "#F7C9A4",
  "--orbit-type-critical-fg": "#B54708",
  "--orbit-type-user-insight-bg": "#FDEEF7",
  "--orbit-type-user-insight-border": "#F6C2E0",
  "--orbit-type-user-insight-fg": "#B12379",

  // Elevation — Vercel's soft, wide shadow, always over a hairline ring
  "--orbit-shadow-xs": "0 1px 2px 0 rgba(0, 0, 0, 0.04)",
  "--orbit-shadow-sm":
    "0 1px 2px 0 rgba(0, 0, 0, 0.06), 0 1px 1px 0 rgba(0, 0, 0, 0.04)",
  "--orbit-shadow-md":
    "0 2px 8px -1px rgba(0, 0, 0, 0.08), 0 1px 3px -1px rgba(0, 0, 0, 0.06)",
  "--orbit-shadow-lg":
    "0 8px 30px -4px rgba(0, 0, 0, 0.12), 0 2px 6px -2px rgba(0, 0, 0, 0.06)",
  "--orbit-shadow-xl":
    "0 12px 40px -6px rgba(0, 0, 0, 0.16), 0 4px 10px -4px rgba(0, 0, 0, 0.08)",
  "--orbit-shadow-border": "0 0 0 1px rgba(0, 0, 0, 0.08)",

  // The chrome in light: a pale rail, dark films.
  "--orbit-bg-chrome": "#EBEBEB",
  "--orbit-glass-film": "rgba(0, 0, 0, 0.04)",
  "--orbit-glass-film-strong": "rgba(0, 0, 0, 0.07)",
  "--orbit-glass-film-faint": "rgba(0, 0, 0, 0.02)",
  "--orbit-glass-edge": "inset 0 0 0 1px rgba(0, 0, 0, 0.06)",
  "--orbit-glass-chip": "#FFFFFF",
  "--orbit-glass-chip-edge": "0 0 0 1px rgba(0, 0, 0, 0.06), 0 1px 2px 0 rgba(0, 0, 0, 0.06)",
  "--orbit-glass-field-edge": "inset 0 0 0 1px #E0E0E0",
  "--orbit-glass-pane": "rgba(255, 255, 255, 0.92)",
  "--orbit-glass-pane-sheen": "rgba(255, 255, 255, 0)",
  "--orbit-glass-pane-sheen-foot": "rgba(255, 255, 255, 0)",
  "--orbit-glass-pane-edge": "inset 0 0 0 1px rgba(0, 0, 0, 0.08)",
  "--orbit-glass-hairline": "rgba(0, 0, 0, 0.08)",
  "--orbit-shadow-pane": "0 12px 40px -6px rgba(0, 0, 0, 0.16), 0 4px 10px -4px rgba(0, 0, 0, 0.08)",
  "--orbit-glass-blur": "blur(24px) saturate(150%)",
};

// ── Dark ─────────────────────────────────────────────────────────────────────

const DARK: Vars = {
  // Radial's neutral ladder: 900 for a surface, 800 for its hover and the tertiary fill.
  "--orbit-bg-primary": "#121926",
  "--orbit-bg-primary_hover": "#202939",
  "--orbit-bg-secondary": "#070A10",
  "--orbit-bg-secondary_hover": "#202939",
  "--orbit-bg-tertiary": "#202939",
  "--orbit-bg-quaternary": "#364152",
  "--orbit-bg-disabled": "#202939",

  "--orbit-text-primary": "#F8FAFC",
  "--orbit-text-secondary": "#E3E8EF",
  "--orbit-text-tertiary": "#CDD5DF",
  "--orbit-text-quaternary": "#9AA4B2",
  "--orbit-text-disabled": "#697586",

  "--orbit-border-primary": "#364152",
  "--orbit-border-secondary": "#202939",
  "--orbit-border-input": "#4B5565",

  "--orbit-outline-focus-ring": "#3A81FC",

  "--orbit-bg-error-primary": "#2A1210",
  "--orbit-border-error": "#7A2420",
  "--orbit-text-error-primary": "#FF6166",
  "--orbit-bg-warning-primary": "#241A02",
  "--orbit-border-warning": "#6B4E07",
  "--orbit-text-warning-primary": "#F5C13B",
  "--orbit-bg-success-primary": "#08210F",
  "--orbit-border-success": "#12572B",
  "--orbit-text-success-primary": "#5FD08A",

  "--orbit-bg-feedback": "#0A1B33",
  "--orbit-border-feedback": "#17417A",
  "--orbit-text-feedback": "#669EFF",
  "--orbit-bg-feedback-solid": "#005BE4",
  "--orbit-text-feedback_on-solid": "#FFFFFF",

  "--orbit-overlay-fill": "rgba(58, 129, 252, 0.10)",
  "--orbit-overlay-fill-strong": "rgba(58, 129, 252, 0.16)",
  "--orbit-overlay-ring": "rgba(58, 129, 252, 0.40)",

  // Radial's chrome: the black the rail is, and its glass. A film is a few percent of white
  // with a lit top edge; the chip is what is on, a shade brighter than the film it sits on.
  "--orbit-bg-chrome": "#000000",
  "--orbit-glass-film": "rgba(252, 252, 253, 0.05)",
  "--orbit-glass-film-strong": "rgba(252, 252, 253, 0.08)",
  "--orbit-glass-film-faint": "rgba(252, 252, 253, 0.03)",
  "--orbit-glass-edge":
    "inset 0 1px 0 0 rgba(255, 255, 255, 0.08), inset 0 0 0 1px rgba(255, 255, 255, 0.04)",
  "--orbit-glass-chip": "rgba(252, 252, 253, 0.08)",
  "--orbit-glass-chip-edge":
    "inset 0 1px 0 0 rgba(255, 255, 255, 0.11), inset 0 0 0 1px rgba(255, 255, 255, 0.04)",
  "--orbit-glass-field-edge":
    "inset 0 1px 0 0 rgba(255, 255, 255, 0.10), inset 0 0 0 1px rgba(255, 255, 255, 0.08)",
  // A pane that opens over the project: Radial's chrome glass with its tint made dense. Over a
  // white page Radial's own 40% would leave light text under 3:1; at 88% it keeps 4.5:1.
  "--orbit-glass-pane": "rgba(18, 25, 38, 0.88)",
  "--orbit-glass-pane-sheen": "rgba(255, 255, 255, 0.07)",
  "--orbit-glass-pane-sheen-foot": "rgba(255, 255, 255, 0.025)",
  "--orbit-glass-pane-edge":
    "inset 0 1px 0 0 rgba(255, 255, 255, 0.16), inset 0 0 0 1px rgba(255, 255, 255, 0.06)",
  "--orbit-glass-hairline": "rgba(252, 252, 253, 0.08)",
  "--orbit-shadow-pane":
    "0 12px 16px -4px rgba(0, 0, 0, 0.36), 0 4px 6px -2px rgba(0, 0, 0, 0.2)",
  "--orbit-glass-blur": "blur(24px) saturate(190%)",

  "--orbit-type-documentation-bg": "#1F1F1F",
  "--orbit-type-documentation-border": "#2E2E2E",
  "--orbit-type-documentation-fg": "#B4B4B4",
  "--orbit-type-pro-bg": "#08210F",
  "--orbit-type-pro-border": "#12572B",
  "--orbit-type-pro-fg": "#5FD08A",
  "--orbit-type-question-bg": "#0A1B33",
  "--orbit-type-question-border": "#17417A",
  "--orbit-type-question-fg": "#5EA8FF",
  "--orbit-type-con-bg": "#2A1210",
  "--orbit-type-con-border": "#7A2420",
  "--orbit-type-con-fg": "#FF6166",
  "--orbit-type-suggestion-bg": "#1A1233",
  "--orbit-type-suggestion-border": "#3B2A73",
  "--orbit-type-suggestion-fg": "#B39DFF",
  "--orbit-type-critical-bg": "#241402",
  "--orbit-type-critical-border": "#6B3D07",
  "--orbit-type-critical-fg": "#F5A15B",
  "--orbit-type-user-insight-bg": "#2A0E20",
  "--orbit-type-user-insight-border": "#722052",
  "--orbit-type-user-insight-fg": "#F09BD0",

  // A ring reads the elevation on a dark surface; the drop shadow only deepens it.
  "--orbit-shadow-xs": "0 0 0 1px rgba(255, 255, 255, 0.06)",
  "--orbit-shadow-sm":
    "0 0 0 1px rgba(255, 255, 255, 0.08), 0 1px 3px 0 rgba(0, 0, 0, 0.50)",
  "--orbit-shadow-md":
    "0 0 0 1px rgba(255, 255, 255, 0.08), 0 4px 12px -2px rgba(0, 0, 0, 0.55)",
  "--orbit-shadow-lg":
    "0 0 0 1px rgba(255, 255, 255, 0.08), 0 12px 34px -6px rgba(0, 0, 0, 0.65)",
  "--orbit-shadow-xl":
    "0 0 0 1px rgba(255, 255, 255, 0.10), 0 20px 48px -8px rgba(0, 0, 0, 0.70)",
  "--orbit-shadow-border": "0 0 0 1px rgba(255, 255, 255, 0.08)",
};

// The solid brand surface is Vercel's primary button: pure high-contrast, inverted
// per theme (near-black on light, near-white on dark). It is deliberately *not*
// derived from `--orbit-brand`, so it stays legible in both themes whatever accent a
// consumer sets. `--orbit-brand` (from settings.accentColor) still tints the quiet
// brand tokens below — subtle fill, border, secondary text.
const BRAND_LIGHT = `
  --orbit-brand: #171717;
  --orbit-bg-brand-solid: #171717;
  --orbit-bg-brand-solid_hover: #000000;
  --orbit-bg-brand-primary: #F2F2F2;
  --orbit-bg-brand-primary: color-mix(in oklab, var(--orbit-brand), white 92%);
  --orbit-border-brand: var(--orbit-brand);
  --orbit-text-brand-secondary: var(--orbit-brand);
  --orbit-text-primary_on-brand: #FFFFFF;
`;

const BRAND_DARK = `
  --orbit-bg-brand-solid: #F8FAFC;
  --orbit-bg-brand-solid_hover: #E3E8EF;
  --orbit-bg-brand-primary: #1F1F1F;
  --orbit-bg-brand-primary: color-mix(in oklab, var(--orbit-brand), black 78%);
  --orbit-border-brand: #8F8F8F;
  --orbit-border-brand: color-mix(in oklab, var(--orbit-brand), white 45%);
  --orbit-text-brand-secondary: #B4B4B4;
  --orbit-text-brand-secondary: color-mix(in oklab, var(--orbit-brand), white 58%);
  --orbit-text-primary_on-brand: #0D121C;
`;

// ── Scales ───────────────────────────────────────────────────────────────────

// Theme-independent, so they are declared once.
const SCALES = `
  --orbit-space-0-5: 2px;
  --orbit-space-1: 4px;
  --orbit-space-1-5: 6px;
  --orbit-space-2: 8px;
  --orbit-space-2-5: 10px;
  --orbit-space-3: 12px;
  --orbit-space-4: 16px;
  --orbit-space-5: 20px;
  --orbit-space-6: 24px;
  --orbit-space-8: 32px;

  --orbit-radius-xs: 4px;
  --orbit-radius-sm: 5px;
  --orbit-radius-md: 6px;
  --orbit-radius-lg: 8px;
  --orbit-radius-xl: 10px;
  --orbit-radius-2xl: 16px;
  --orbit-radius-full: 9999px;

  /* Inter, as Radial, when the consuming app has loaded it; then the system stack. */
  --orbit-font-body: "Inter Variable", "Inter", -apple-system, BlinkMacSystemFont,
    "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;

  /* The rail's height; the panel and the variants pane keep clear of it. */
  --orbit-rail-height: 48px;
  /* The frame's own ground, behind a project that paints none: the browser's page colour.
     A project with its own sets it, or paints its root. */
  --orbit-frame-bg: Canvas;
  --orbit-font-mono: "Geist Mono", ui-monospace, SFMono-Regular, "SF Mono", Menlo,
    Consolas, "Liberation Mono", monospace;

  --orbit-text-2xs: 11px;
  --orbit-text-xs: 12px;
  --orbit-text-sm: 13px;
  --orbit-text-md: 14px;
  --orbit-text-lg: 18px;

  --orbit-leading-none: 1;
  --orbit-leading-snug: 1.4;
  --orbit-leading-normal: 1.5;

  --orbit-duration-fast: 100ms;
  --orbit-duration: 150ms;
  --orbit-duration-slow: 200ms;
  --orbit-ease: cubic-bezier(0.2, 0, 0, 1);

  /* Base is rewritten at runtime from settings.zIndex; the rest are offsets on it. */
  --orbit-z-base: 9000;
  --orbit-z-badge-feedback: 19;
  --orbit-z-badge: 20;
  --orbit-z-overlay: 40;
  --orbit-z-highlight: 45;
  --orbit-z-toolbar: 999;
  /* Popovers are the modal layer: they sit above the panel, so opening one next to
     an element the panel overlaps is never hidden behind it. */
  --orbit-z-popover: 1000;
  --orbit-z-inspector-popover: 1010;
`;

function declarations(vars: Vars): string {
  return Object.entries(vars)
    .map(([name, value]) => `  ${name}: ${value};`)
    .join("\n");
}

const LIGHT_DECLS = `${declarations(LIGHT)}\n${BRAND_LIGHT.trim()}`;
const DARK_DECLS = `${declarations(DARK)}\n${BRAND_DARK.trim()}`;

export const TOKENS_CSS = `
:root {
${SCALES.trim()}
${DARK_DECLS}
}

:root[${THEME_ATTR}="light"] {
${LIGHT_DECLS}
}
`;
