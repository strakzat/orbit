/**
 * Component rules — Geist / Vercel idiom.
 *
 * Every selector carries the `orbit-` prefix and every element we render also carries
 * `.orbit-root`. That is what keeps a host application's CSS out of this module and
 * this module's CSS out of the host: `.orbit-root *` outweighs a bare `button {}` or
 * `* {}` from the page around us.
 *
 * The reset block comes first on purpose. `.orbit-root *` and `.orbit-panel__title`
 * have the same specificity, so source order decides, and the component rules have
 * to win.
 *
 * The look: near-monochrome surfaces, hairline borders, one blue reserved for the
 * comment/feedback layer, a big soft shadow on anything that floats, and a primary
 * button that inverts per theme (black on light, white on dark).
 */

import { ANNOTATION_TYPES, STATUS_SLUGS } from "./tokens";

// ── Reset and base ───────────────────────────────────────────────────────────

const BASE = `
.orbit-root,
.orbit-root *,
.orbit-root *::before,
.orbit-root *::after {
  /* The one !important in the sheet. A host page forcing content-box on every
     element would otherwise break every width in this module; the rest of the
     reset can lose that fight without anything breaking structurally. */
  box-sizing: border-box !important;
  margin: 0;
  padding: 0;
  border: 0 solid transparent;
  outline: 0;
  font: inherit;
  letter-spacing: normal;
  text-transform: none;
  text-align: start;
  text-decoration: none;
  text-indent: 0;
  color: inherit;
  background: transparent;
  list-style: none;
  float: none;
  min-width: 0;
}

.orbit-root {
  font-family: var(--orbit-font-body);
  font-size: var(--orbit-text-md);
  font-weight: 400;
  font-style: normal;
  line-height: var(--orbit-leading-normal);
  color: var(--orbit-text-primary);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.orbit-root button,
.orbit-root input,
.orbit-root textarea {
  -webkit-appearance: none;
  appearance: none;
}

.orbit-root button {
  cursor: pointer;
}

.orbit-root button:disabled {
  cursor: not-allowed;
}

.orbit-root :focus-visible,
.orbit-root:focus-visible {
  outline: 2px solid var(--orbit-outline-focus-ring);
  outline-offset: 2px;
}

/* Keeps a wrapper out of its parent's layout entirely. */
.orbit-contents {
  display: contents;
}

.orbit-sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}

@keyframes orbit-enter {
  from {
    opacity: 0;
    transform: translateY(-6px) scale(0.99);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.orbit-animate-in {
  animation: orbit-enter var(--orbit-duration-slow) var(--orbit-ease) both;
  transform-origin: top center;
}

/* The copy of a closed popover that goes back into its pin (usePinMorph): only to look at. */
.orbit-popover--leaving {
  pointer-events: none;
}

@media (prefers-reduced-motion: reduce) {
  .orbit-root,
  .orbit-root * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
`;

// ── Type and status token bridges ────────────────────────────────────────────

// A `data-orbit-type` / `data-orbit-status` attribute maps the palette for that
// variant onto three local variables, so the rules below stay variant-agnostic.
const TYPE_BRIDGE = ANNOTATION_TYPES.map(
  (type) => `[data-orbit-type="${type}"] {
  --orbit-variant-bg: var(--orbit-type-${type}-bg);
  --orbit-variant-border: var(--orbit-type-${type}-border);
  --orbit-variant-fg: var(--orbit-type-${type}-fg);
  --orbit-variant-ring: var(--orbit-type-${type}-border);
  --orbit-variant-ring: color-mix(in oklab, var(--orbit-type-${type}-fg) 16%, transparent);
}`
).join("\n");

const STATUS_TONE: Record<string, string> = {
  open: "warning",
  pending: "feedback",
  resolved: "success",
};

// The feedback tone has no `-primary` suffix, so its slug maps a little differently.
const STATUS_BRIDGE = Object.values(STATUS_SLUGS)
  .map((slug) => {
    const tone = STATUS_TONE[slug];
    if (tone === "feedback") {
      return `[data-orbit-status="${slug}"] {
  --orbit-variant-bg: var(--orbit-bg-feedback);
  --orbit-variant-border: var(--orbit-border-feedback);
  --orbit-variant-fg: var(--orbit-text-feedback);
}`;
    }
    return `[data-orbit-status="${slug}"] {
  --orbit-variant-bg: var(--orbit-bg-${tone}-primary);
  --orbit-variant-border: var(--orbit-border-${tone});
  --orbit-variant-fg: var(--orbit-text-${tone}-primary);
}`;
  })
  .join("\n");

// ── Shell and rail ───────────────────────────────────────────────────────────

const CHROME = `
/* The app on top, its corners rounded off at the foot, the rail behind it on black. The
   frame's transform makes it the containing block of every fixed element inside, so the
   project's own fixed layers stay in it; its portals go there through useOrbitFrame(). */
.orbit-shell {
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100vh;
  height: 100dvh;
  overflow: hidden;
  background: var(--orbit-bg-chrome);
}

/* Two boxes, so a fixed element stays put while the app scrolls: the frame carries the
   transform and clips, the box inside it scrolls. A fixed child of a transformed box that
   scrolls itself would be placed against its scrolled content, and scroll away with it. */
.orbit-frame {
  position: relative;
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
  transform: translateZ(0);
  border-radius: 0 0 24px 24px;
  background: var(--orbit-frame-bg);
}

.orbit-frame__scroll {
  height: 100%;
  overflow-y: auto;
}

.orbit-rail {
  display: flex;
  flex: none;
  align-items: center;
  justify-content: space-between;
  gap: var(--orbit-space-2);
  height: var(--orbit-rail-height);
  padding: 0 var(--orbit-space-3);
  background: var(--orbit-bg-chrome);
  color: var(--orbit-text-primary);
}

/* Without a frame: over the foot of the window, the page scrolling under it as before. */
.orbit-rail--overlay {
  position: fixed;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: calc(var(--orbit-z-base) + var(--orbit-z-toolbar));
}

.orbit-rail__group {
  display: flex;
  align-items: center;
  gap: var(--orbit-space-1);
}

/* Radial's tertiary button: no film at rest, the chip on hover, on it in semibold while on. */
.orbit-rail__item {
  position: relative;
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  gap: var(--orbit-space-1-5);
  height: 32px;
  padding: 0 var(--orbit-space-3);
  border-radius: var(--orbit-radius-full);
  color: var(--orbit-text-secondary);
  font-size: var(--orbit-text-md);
  font-weight: 500;
  white-space: nowrap;
  transition:
    background-color var(--orbit-duration-slow) var(--orbit-ease),
    box-shadow var(--orbit-duration-slow) var(--orbit-ease),
    color var(--orbit-duration-slow) var(--orbit-ease);
}

.orbit-rail__item svg {
  color: var(--orbit-text-quaternary);
}

.orbit-rail__item:hover,
.orbit-rail__item--on {
  background: var(--orbit-glass-chip);
  box-shadow: var(--orbit-glass-chip-edge);
  color: var(--orbit-text-primary);
}

.orbit-rail__item--on {
  font-weight: 600;
}

.orbit-rail__item--on svg {
  color: var(--orbit-text-primary);
}

/* The × at the end of the feedback button while picking. Its track opens from 0fr to 1fr,
   so the button widens smoothly instead of jumping, and the × turns in as it gets room.
   The negative margin takes back the button's gap while the track is shut; the gap lives
   inside the track instead. Reduced motion makes it a plain show and hide. */
.orbit-rail__close {
  display: grid;
  grid-template-columns: minmax(0, 0fr);
  margin-left: calc(var(--orbit-space-1-5) * -1);
  transition: grid-template-columns var(--orbit-duration-slow) var(--orbit-ease);
}

.orbit-rail__close > span {
  display: flex;
  align-items: center;
  min-width: 0;
  overflow: hidden;
  padding-left: var(--orbit-space-1-5);
}

.orbit-rail__close svg {
  flex: none;
  opacity: 0;
  transform: rotate(-90deg) scale(0.6);
  transition:
    opacity var(--orbit-duration-slow) var(--orbit-ease),
    transform var(--orbit-duration-slow) var(--orbit-ease);
}

.orbit-rail__item--on .orbit-rail__close {
  grid-template-columns: minmax(0, 1fr);
}

.orbit-rail__item--on .orbit-rail__close svg {
  opacity: 1;
  transform: none;
}

.orbit-rail__count {
  min-width: 20px;
  margin-right: calc(var(--orbit-space-1) * -1);
  padding: 0 var(--orbit-space-1-5);
  border-radius: var(--orbit-radius-full);
  background: var(--orbit-bg-brand-solid);
  color: var(--orbit-text-primary_on-brand);
  font-size: var(--orbit-text-xs);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  line-height: 18px;
  text-align: center;
}

/* On the Varianten button while a variant is off its default: the prototype is not as it starts. */
.orbit-rail__dot {
  width: 6px;
  height: 6px;
  margin-right: calc(var(--orbit-space-1) * -1);
  border-radius: var(--orbit-radius-full);
  background: var(--orbit-bg-brand-solid);
}

/* The profile: the viewer's monogram, a round chip the height of the rail's buttons. */
.orbit-rail__item--avatar {
  justify-content: center;
  width: 32px;
  padding: 0;
}

.orbit-rail__monogram {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: var(--orbit-radius-full);
  background: var(--orbit-glass-chip);
  box-shadow: var(--orbit-glass-chip-edge);
  color: var(--orbit-text-primary);
  font-size: var(--orbit-text-2xs);
  font-weight: 600;
  letter-spacing: 0.3px;
}

/* A pane over the project: Radial's chrome glass, made dense. The panel and the popovers
   take it too. */
.orbit-glass-pane {
  background-color: var(--orbit-glass-pane);
  background-image: linear-gradient(
    to bottom,
    var(--orbit-glass-pane-sheen),
    transparent 50%,
    var(--orbit-glass-pane-sheen-foot)
  );
  -webkit-backdrop-filter: var(--orbit-glass-blur);
  backdrop-filter: var(--orbit-glass-blur);
  box-shadow: var(--orbit-glass-pane-edge), var(--orbit-shadow-pane);
}

/* The variants pane: as high and as far in from the window's edge as the panel on the
   other side. Its height is settings.panelHeight, inline. */
.orbit-variants {
  position: fixed;
  bottom: calc(var(--orbit-rail-height) + var(--orbit-space-4));
  left: var(--orbit-space-4);
  z-index: calc(var(--orbit-z-base) + var(--orbit-z-toolbar));
  display: flex;
  flex-direction: column;
  max-width: calc(100vw - var(--orbit-space-8));
  max-height: calc(100vh - var(--orbit-rail-height) - var(--orbit-space-8));
  max-height: calc(100dvh - var(--orbit-rail-height) - var(--orbit-space-8));
  overflow: hidden;
  border-radius: var(--orbit-radius-2xl);
}

/* The tour's card: over everything Orbit opens, a thread included, because it says what's next.
   Where it stands is a measurement, inline; between steps it travels there. */
.orbit-tour {
  position: fixed;
  z-index: calc(var(--orbit-z-base) + var(--orbit-z-tour));
  display: flex;
  flex-direction: column;
  gap: var(--orbit-space-3);
  width: 340px;
  max-width: calc(100vw - var(--orbit-space-8));
  max-height: calc(100vh - var(--orbit-space-8));
  max-height: calc(100dvh - var(--orbit-space-8));
  padding: var(--orbit-space-4);
  overflow-y: auto;
  border-radius: var(--orbit-radius-2xl);
  transition:
    left var(--orbit-duration-slow) var(--orbit-ease),
    top var(--orbit-duration-slow) var(--orbit-ease),
    opacity var(--orbit-duration-boot) var(--orbit-ease),
    transform var(--orbit-duration-boot) var(--orbit-ease);
}

/* Until the stars are in. Still in the page: it has a size for them to land around. */
.orbit-tour--waiting {
  opacity: 0;
  transform: scale(0.96);
  pointer-events: none;
}

/* The boot: everything starts black, the rail too, and comes up under the stars. */
.orbit-tour__black {
  position: fixed;
  inset: 0;
  z-index: calc(var(--orbit-z-base) + var(--orbit-z-tour-black));
  background: var(--orbit-boot-bg);
  transition: opacity var(--orbit-duration-boot) var(--orbit-ease);
}

.orbit-tour__black--up {
  opacity: 0;
  pointer-events: none;
}

.orbit-tour__title {
  font-size: var(--orbit-text-md);
  font-weight: 600;
  color: var(--orbit-text-primary);
}

/* It takes the focus so the step is read out, by script: nothing to act on, so no ring. */
.orbit-root .orbit-tour__title:focus-visible {
  outline: none;
}

.orbit-tour__body {
  font-size: var(--orbit-text-sm);
  line-height: 1.5;
  color: var(--orbit-text-secondary);
}

/* Closer to the text it qualifies than the card's gap. */
.orbit-tour__note {
  margin-top: calc(var(--orbit-space-1) * -1);
  font-size: var(--orbit-text-xs);
  line-height: 1.5;
  color: var(--orbit-text-quaternary);
}

.orbit-tour__foot {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--orbit-space-2);
  margin-top: var(--orbit-space-1);
}

/* Under the fields, the buttons need more air than under a line of text. */
.orbit-tour--welcome .orbit-tour__foot {
  margin-top: var(--orbit-space-4);
}

.orbit-tour__progress {
  margin-right: auto;
  font-size: var(--orbit-text-xs);
  font-variant-numeric: tabular-nums;
  color: var(--orbit-text-quaternary);
}

.orbit-tour__foot button {
  flex-shrink: 0;
  white-space: nowrap;
}

.orbit-tour__quiet {
  min-height: 36px;
  padding: 0 var(--orbit-space-3);
  border-radius: var(--orbit-radius-full);
  font-size: var(--orbit-text-sm);
  font-weight: 500;
  color: var(--orbit-text-secondary);
  transition:
    background-color var(--orbit-duration) var(--orbit-ease),
    color var(--orbit-duration) var(--orbit-ease);
}

.orbit-tour__quiet:hover:not(:disabled) {
  background: var(--orbit-glass-chip);
  color: var(--orbit-text-primary);
}

.orbit-tour__quiet:disabled {
  color: var(--orbit-text-disabled);
}

/* Over the frame, or the window, as the spotlight's scrim is: the rail stays lit. It takes the
   clicks, so nothing happens to the project during the tour. */
.orbit-tour__scrim {
  position: fixed;
  z-index: calc(var(--orbit-z-base) + var(--orbit-z-overlay));
  background: var(--orbit-scrim);
  transition: background-color var(--orbit-duration) var(--orbit-ease);
}

.orbit-tour__scrim--framed {
  border-radius: 0 0 24px 24px;
}

/* Clear, and under the pins, where the viewer is meant to click those and not the project. */
.orbit-tour__scrim--clear {
  z-index: calc(var(--orbit-z-base) + 1);
  background: transparent;
}

/* Above the page and the rail, under what opens: the panel, a thread, the card. */
.orbit-tour__stars {
  position: fixed;
  inset: 0;
  z-index: calc(var(--orbit-z-base) + var(--orbit-z-tour-stars));
  width: 100%;
  height: 100%;
  pointer-events: none;
}

/* Without a frame the rail is laid over the window: under the stars while they're around it. */
[data-orbit-tour] .orbit-rail--overlay {
  z-index: calc(var(--orbit-z-base) + var(--orbit-z-tour-black) - 1);
}

/* The profile's way back to the tour: quiet, under the settings it isn't one of. */
.orbit-profile__tour {
  align-self: center;
  padding: var(--orbit-space-1) var(--orbit-space-2);
  border-radius: var(--orbit-radius-xs);
  font-size: var(--orbit-text-xs);
  color: var(--orbit-text-tertiary);
  transition: color var(--orbit-duration) var(--orbit-ease);
}

.orbit-profile__tour:hover {
  color: var(--orbit-text-primary);
}

/* The profile pane: over the rail's right end, where its button is, as the variants pane is
   over the left. Only as high as what it holds. */
.orbit-profile {
  position: fixed;
  right: var(--orbit-space-4);
  bottom: calc(var(--orbit-rail-height) + var(--orbit-space-4));
  z-index: calc(var(--orbit-z-base) + var(--orbit-z-toolbar));
  display: flex;
  flex-direction: column;
  width: 320px;
  max-width: calc(100vw - var(--orbit-space-8));
  overflow: hidden;
  border-radius: var(--orbit-radius-2xl);
}

/* No title row: the close floats in the corner, over the monogram's padding. */
.orbit-profile .orbit-profile__close {
  position: absolute;
  top: var(--orbit-space-2);
  right: var(--orbit-space-2);
  z-index: 1;
}

.orbit-profile__body {
  display: flex;
  flex-direction: column;
  gap: var(--orbit-space-4);
  /* As the variants pane's body: titles sit in from the controls, on the controls' text. */
  padding: var(--orbit-space-5) var(--orbit-space-3) var(--orbit-space-4);
}

/* The monogram, centred, with the name under it: what the rail and a comment will show. */
.orbit-profile__identity {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--orbit-space-2);
  padding: var(--orbit-space-2) var(--orbit-space-3) var(--orbit-space-4);
  border-bottom: 1px solid var(--orbit-glass-hairline);
}

.orbit-profile__avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  margin-bottom: var(--orbit-space-1);
  border-radius: var(--orbit-radius-full);
  background: var(--orbit-glass-chip);
  box-shadow: var(--orbit-glass-chip-edge);
  color: var(--orbit-text-primary);
  font-size: var(--orbit-text-lg);
  font-weight: 600;
  letter-spacing: 0.5px;
}

.orbit-profile__avatar svg {
  color: var(--orbit-text-tertiary);
}

/* Typed straight onto the pane, no field around it. Focus shows as a line under the name, in
   the focus ring's blue, rather than a ring that would make it a field again. */
.orbit-profile__name {
  width: 100%;
  padding: var(--orbit-space-1) 0;
  border: 0;
  border-bottom: 1px solid transparent;
  background: transparent;
  color: var(--orbit-text-primary);
  font-size: var(--orbit-text-lg);
  font-weight: 600;
  text-align: center;
  transition: border-color var(--orbit-duration-fast) var(--orbit-ease);
}

.orbit-profile__name::placeholder {
  color: var(--orbit-text-quaternary);
  font-weight: 500;
}

.orbit-profile__name:hover {
  border-bottom-color: var(--orbit-glass-hairline);
}

.orbit-root .orbit-profile__name:focus-visible {
  outline: none;
  border-bottom-color: var(--orbit-outline-focus-ring);
}

.orbit-profile__hint {
  color: var(--orbit-text-quaternary);
  font-size: var(--orbit-text-xs);
  text-align: center;
}

/* The pane's name and its close, on one row as the panel's tabs and close are. */
.orbit-variants__header {
  display: flex;
  flex: none;
  align-items: center;
  justify-content: space-between;
  gap: var(--orbit-space-2);
  min-height: 48px;
  padding: var(--orbit-space-2) var(--orbit-space-2) var(--orbit-space-2) var(--orbit-space-4);
  border-bottom: 1px solid var(--orbit-glass-hairline);
}

.orbit-variants__heading {
  color: var(--orbit-text-primary);
  font-size: var(--orbit-text-md);
  font-weight: 600;
}

.orbit-variants__tabs {
  flex: none;
}

/* The tab's variants scroll; the title, the tabs and the foot stay. */
.orbit-variants__body {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  gap: var(--orbit-space-4);
  min-height: 0;
  overflow-y: auto;
  padding: var(--orbit-space-2) var(--orbit-space-3) var(--orbit-space-4);
}

/* What the tab holds, in a line, before what it holds. */
.orbit-variants__intro {
  padding: 0 var(--orbit-space-3);
  color: var(--orbit-text-quaternary);
  font-size: var(--orbit-text-xs);
}

.orbit-variants__list {
  display: flex;
  flex-direction: column;
  gap: var(--orbit-space-4);
}

.orbit-variants__empty {
  padding: var(--orbit-space-6) var(--orbit-space-3);
  color: var(--orbit-text-tertiary);
  font-size: var(--orbit-text-sm);
  text-align: center;
}

.orbit-variants__field {
  display: flex;
  flex-direction: column;
  gap: var(--orbit-space-1-5);
}

/* The title, and what stands beside it: a slider's value. */
.orbit-variants__label {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--orbit-space-3);
  padding: 0 var(--orbit-space-3);
}

.orbit-variants__title {
  color: var(--orbit-text-tertiary);
  font-size: var(--orbit-text-xs);
}

.orbit-variants__hint {
  margin-top: calc(var(--orbit-space-1) * -1);
  padding: 0 var(--orbit-space-3);
  color: var(--orbit-text-quaternary);
  font-size: var(--orbit-text-xs);
  line-height: var(--orbit-leading-normal);
}

/* Under a switch, whose row carries its own padding. */
.orbit-variants__hint--switch {
  margin-top: calc(var(--orbit-space-1-5) * -1);
}

/* A shortcut, a chip per key: the profile's hint under the pins switch. */
.orbit-keys {
  display: inline-flex;
  gap: var(--orbit-space-1);
  margin-left: var(--orbit-space-1-5);
  vertical-align: middle;
}

.orbit-key {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 var(--orbit-space-1-5);
  border-radius: var(--orbit-radius-sm);
  background: var(--orbit-glass-chip);
  box-shadow: var(--orbit-glass-chip-edge);
  color: var(--orbit-text-secondary);
  font-family: var(--orbit-font-body);
  font-size: var(--orbit-text-xs);
  line-height: 1;
}

/* Holds the measuring copy of a choice's pill. */
.orbit-variants__measure {
  position: relative;
}

/* A box of no size: what is in it is laid out and measured, never seen, and widens nothing. */
.orbit-probe {
  position: absolute;
  top: 0;
  left: 0;
  width: 0;
  height: 0;
  overflow: hidden;
  visibility: hidden;
  pointer-events: none;
}

/* Every option as wide as the widest, the grid's way: the pill's width at equal shares. Two
   classes, so it outweighs the pill's own flex, which comes later in the sheet. */
.orbit-segments.orbit-segments--probe {
  display: grid;
  grid-auto-columns: 1fr;
  grid-auto-flow: column;
  width: max-content;
}

.orbit-segments--probe .orbit-segment {
  display: flex;
  align-items: center;
  font-weight: 600;
}

/* The pane's foot: back to the defaults, a link to this state. */
.orbit-variants__footer {
  display: flex;
  flex: none;
  flex-wrap: wrap;
  gap: var(--orbit-space-1);
  padding: var(--orbit-space-2);
  border-top: 1px solid var(--orbit-glass-hairline);
}

/* Radial's tertiary button, as on the rail, a size down. */
.orbit-variants__footer-button {
  display: inline-flex;
  align-items: center;
  gap: var(--orbit-space-1-5);
  height: 32px;
  padding: 0 var(--orbit-space-3);
  border-radius: var(--orbit-radius-full);
  color: var(--orbit-text-secondary);
  font-size: var(--orbit-text-sm);
  font-weight: 500;
  white-space: nowrap;
  transition:
    background-color var(--orbit-duration-slow) var(--orbit-ease),
    color var(--orbit-duration-slow) var(--orbit-ease);
}

.orbit-variants__footer-button svg {
  color: var(--orbit-text-quaternary);
}

.orbit-variants__footer-button:hover:not(:disabled) {
  background: var(--orbit-glass-chip);
  box-shadow: var(--orbit-glass-chip-edge);
  color: var(--orbit-text-primary);
}

.orbit-variants__footer-button:disabled {
  color: var(--orbit-text-disabled);
}

.orbit-variants__footer-button:disabled svg {
  color: var(--orbit-text-disabled);
}

/* Radial's pill, the options side by side on it, as its variant switch. */
.orbit-segments {
  display: flex;
  gap: var(--orbit-space-1);
  padding: var(--orbit-space-1);
  border-radius: var(--orbit-radius-full);
  background-color: var(--orbit-glass-film);
  box-shadow: var(--orbit-glass-edge);
}

.orbit-segment {
  flex: 1 1 0;
  height: 32px;
  padding: 0 var(--orbit-space-3);
  border-radius: var(--orbit-radius-full);
  color: var(--orbit-text-secondary);
  font-size: var(--orbit-text-md);
  font-weight: 500;
  /* The reset sets every element to start; a stretched segment centres its label. */
  text-align: center;
  white-space: nowrap;
  transition: color var(--orbit-duration-slow) var(--orbit-ease);
}

.orbit-segment:hover {
  color: var(--orbit-text-primary);
}

.orbit-segment[aria-disabled="true"] {
  color: var(--orbit-text-disabled);
  cursor: not-allowed;
}

.orbit-segment[aria-checked="true"] {
  background: var(--orbit-glass-chip);
  box-shadow: var(--orbit-glass-chip-edge);
  color: var(--orbit-text-primary);
  font-weight: 600;
}

/* The component the popover is about: its pill, above the element. */
.orbit-popover__component {
  display: flex;
  margin-bottom: var(--orbit-space-2);
}

.orbit-root .orbit-segment:focus-visible {
  outline-offset: -2px;
}

.orbit-switch {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--orbit-space-6);
  padding: var(--orbit-space-1-5) var(--orbit-space-3);
  border-radius: var(--orbit-radius-full);
  color: var(--orbit-text-secondary);
  font-size: var(--orbit-text-md);
  font-weight: 500;
  text-align: start;
}

.orbit-switch:hover {
  color: var(--orbit-text-primary);
}

.orbit-switch__track {
  display: flex;
  flex: none;
  align-items: center;
  width: 36px;
  height: 20px;
  padding: 2px;
  border-radius: var(--orbit-radius-full);
  background: var(--orbit-bg-tertiary);
  box-shadow: inset 0 0 0 1px var(--orbit-glass-hairline);
  transition: background-color var(--orbit-duration) var(--orbit-ease);
}

.orbit-switch__knob {
  width: 16px;
  height: 16px;
  border-radius: var(--orbit-radius-full);
  background: var(--orbit-text-primary);
  box-shadow: var(--orbit-shadow-xs);
  transition: transform var(--orbit-duration) var(--orbit-ease);
}

.orbit-switch[aria-checked="true"] .orbit-switch__track {
  background: var(--orbit-bg-brand-solid);
}

.orbit-switch[aria-checked="true"] .orbit-switch__knob {
  transform: translateX(16px);
  background: var(--orbit-bg-primary);
}

/* Radios and checkboxes, a row each, as Untitled UI's in Radial: a ring, filled near-white when
   on, a dark dot or tick on it. */
.orbit-options {
  display: flex;
  flex-direction: column;
}

.orbit-option {
  display: flex;
  align-items: center;
  gap: var(--orbit-space-2-5);
  min-height: 32px;
  padding: var(--orbit-space-1) var(--orbit-space-3);
  border-radius: var(--orbit-radius-lg);
  color: var(--orbit-text-secondary);
  font-size: var(--orbit-text-md);
  font-weight: 500;
  cursor: pointer;
  transition: color var(--orbit-duration-slow) var(--orbit-ease);
}

.orbit-option:hover {
  color: var(--orbit-text-primary);
}

.orbit-option:has(:checked) {
  color: var(--orbit-text-primary);
}

.orbit-option--disabled,
.orbit-option--disabled:hover {
  color: var(--orbit-text-disabled);
  cursor: not-allowed;
}

.orbit-option__mark {
  position: relative;
  display: flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  background: var(--orbit-glass-film);
  box-shadow: inset 0 0 0 1px var(--orbit-border-input), var(--orbit-glass-field-edge);
  transition:
    background-color var(--orbit-duration) var(--orbit-ease),
    box-shadow var(--orbit-duration) var(--orbit-ease);
}

.orbit-option__mark--radio {
  border-radius: var(--orbit-radius-full);
}

.orbit-option__mark--checkbox {
  border-radius: var(--orbit-radius-xs);
}

/* The native input, over its mark: the click, the keyboard and the state are the browser's. */
.orbit-root .orbit-option__input {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  margin: 0;
  opacity: 0;
  cursor: inherit;
}

.orbit-option:has(:checked) .orbit-option__mark {
  background: var(--orbit-bg-brand-solid);
  box-shadow: none;
}

.orbit-option--disabled .orbit-option__mark {
  background: var(--orbit-bg-disabled);
}

.orbit-option:has(:focus-visible) .orbit-option__mark {
  outline: 2px solid var(--orbit-outline-focus-ring);
  outline-offset: 2px;
}

.orbit-option__dot {
  width: 6px;
  height: 6px;
  border-radius: var(--orbit-radius-full);
  background: var(--orbit-text-primary_on-brand);
  opacity: 0;
  pointer-events: none;
}

.orbit-option__check {
  display: flex;
  color: var(--orbit-text-primary_on-brand);
  opacity: 0;
  pointer-events: none;
}

.orbit-option:has(:checked) .orbit-option__dot,
.orbit-option:has(:checked) .orbit-option__check {
  opacity: 1;
}

/* A native select in Radial's glass field, its own arrow over the browser's. */
.orbit-select {
  position: relative;
}

.orbit-root .orbit-select__field {
  -webkit-appearance: none;
  appearance: none;
  padding-right: var(--orbit-space-8);
  font-weight: 500;
  cursor: pointer;
}

.orbit-select__field option {
  background: var(--orbit-bg-primary);
  color: var(--orbit-text-primary);
}

.orbit-select__chevron {
  position: absolute;
  top: 50%;
  right: var(--orbit-space-3);
  display: flex;
  color: var(--orbit-text-quaternary);
  transform: translateY(-50%);
  pointer-events: none;
}

/* Radial's slider: a rounded track filled near-white up to the value, a knob on it. */
.orbit-variants__label .orbit-range__value {
  color: var(--orbit-text-primary);
  font-size: var(--orbit-text-xs);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.orbit-root .orbit-range {
  -webkit-appearance: none;
  appearance: none;
  width: calc(100% - var(--orbit-space-6));
  height: 24px;
  margin: 0 var(--orbit-space-3);
  background: transparent;
  cursor: pointer;
}

.orbit-range::-webkit-slider-runnable-track {
  height: 6px;
  border-radius: var(--orbit-radius-full);
  background: linear-gradient(
    to right,
    var(--orbit-bg-brand-solid) var(--orbit-range-progress, 0%),
    var(--orbit-bg-quaternary) var(--orbit-range-progress, 0%)
  );
}

.orbit-range::-moz-range-track {
  height: 6px;
  border-radius: var(--orbit-radius-full);
  background: var(--orbit-bg-quaternary);
}

.orbit-range::-moz-range-progress {
  height: 6px;
  border-radius: var(--orbit-radius-full);
  background: var(--orbit-bg-brand-solid);
}

.orbit-range::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 18px;
  height: 18px;
  margin-top: -6px;
  border-radius: var(--orbit-radius-full);
  background: var(--orbit-bg-brand-solid);
  box-shadow: 0 0 0 2px var(--orbit-bg-primary), var(--orbit-shadow-sm);
}

.orbit-range::-moz-range-thumb {
  width: 18px;
  height: 18px;
  border: 0;
  border-radius: var(--orbit-radius-full);
  background: var(--orbit-bg-brand-solid);
  box-shadow: 0 0 0 2px var(--orbit-bg-primary), var(--orbit-shadow-sm);
}

.orbit-root .orbit-range:focus-visible {
  outline: 0;
}

.orbit-range:focus-visible::-webkit-slider-thumb {
  outline: 2px solid var(--orbit-outline-focus-ring);
  outline-offset: 2px;
}

.orbit-range:focus-visible::-moz-range-thumb {
  outline: 2px solid var(--orbit-outline-focus-ring);
  outline-offset: 2px;
}

/* Radial's secondary button: the glass film and its lit edge, a pill the width of the pane. */
.orbit-action {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 36px;
  padding: 0 var(--orbit-space-4);
  border-radius: var(--orbit-radius-full);
  background: var(--orbit-glass-film);
  box-shadow: var(--orbit-glass-edge);
  color: var(--orbit-text-primary);
  font-size: var(--orbit-text-sm);
  font-weight: 600;
  text-align: center;
  transition:
    background-color var(--orbit-duration) var(--orbit-ease),
    transform var(--orbit-duration-fast) var(--orbit-ease);
}

.orbit-action:hover:not(:disabled) {
  background: var(--orbit-glass-film-strong);
}

.orbit-action:active:not(:disabled) {
  transform: scale(0.98);
}

.orbit-action:disabled {
  color: var(--orbit-text-disabled);
  cursor: progress;
}
`;

// ── Marker badges (pins) ──────────────────────────────────────────────────────

const MARKER = `
/* A pin is glass, like the component chip: a dark film tinted by one hue, a lit edge in that
   hue, a light glyph. The outline is an SVG behind the glyph (\`.orbit-marker__shape\`), so the
   tail and the circle are one surface. */
.orbit-marker {
  --orbit-marker-hue: var(--orbit-pin-documentation);
  --orbit-marker-fill: color-mix(
    in oklab,
    color-mix(in oklab, var(--orbit-marker-hue) 30%, var(--orbit-pin-glass)) 88%,
    transparent
  );
  --orbit-marker-edge: color-mix(in oklab, var(--orbit-marker-hue) 40%, transparent);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: var(--orbit-radius-full);
  color: color-mix(in oklab, var(--orbit-marker-hue) 45%, var(--orbit-pin-fg));
  cursor: pointer;
  transition: transform var(--orbit-duration) var(--orbit-ease);
}

${ANNOTATION_TYPES.map(
  (type) => `.orbit-marker[data-orbit-type="${type}"] {
  --orbit-marker-hue: var(--orbit-pin-${type});
}`
).join("\n")}

/* Behind the glyph, inside the pin's own stacking context (it always has a z-index). */
.orbit-marker__shape {
  position: absolute;
  z-index: -1;
  inset: 0;
  overflow: visible;
  filter: var(--orbit-pin-shadow);
  transition: filter var(--orbit-duration) var(--orbit-ease);
}

.orbit-marker__body {
  fill: var(--orbit-marker-fill);
  stroke: var(--orbit-marker-edge);
  stroke-width: 1px;
}

/* Extends the hit area to ~38px without growing the visible pin, which would
   cover the very element being annotated. */
.orbit-marker::before {
  content: "";
  position: absolute;
  inset: -6px;
  border-radius: inherit;
}

/* It grows from its tip, which stays on the spot it is pinned to. */
.orbit-marker--tail-bottom-left { transform-origin: left bottom; }
.orbit-marker--tail-bottom-right { transform-origin: right bottom; }
.orbit-marker--tail-top-left { transform-origin: left top; }
.orbit-marker--tail-top-right { transform-origin: right top; }

.orbit-marker:hover {
  transform: scale(1.12);
}

.orbit-marker:hover .orbit-marker__shape {
  filter: var(--orbit-pin-shadow_hover);
}

.orbit-marker:active {
  transform: scale(0.96);
}

/* Mirrors of what the panel already lists take no hit area and no pointer. */
.orbit-marker--static {
  pointer-events: none;
}

.orbit-marker--static::before {
  content: none;
}

.orbit-marker--feedback {
  --orbit-marker-hue: var(--orbit-pin-feedback);
}

/* Everything on it is resolved: the same pin, half there. Whole again under the mouse or the
   keyboard, to be read. The profile can hide these (showResolvedPins). */
.orbit-marker--resolved {
  opacity: 0.5;
  transition:
    transform var(--orbit-duration) var(--orbit-ease),
    opacity var(--orbit-duration) var(--orbit-ease);
}

.orbit-marker--resolved:hover,
.orbit-marker--resolved:focus-visible {
  opacity: 1;
}

/* Open, the pin is its thread: the popover grows out of it and lies on top of it. Gone from
   sight but not from the page, so closing can put the focus back on it. After the resolved
   pin's hover, which it beats. */
.orbit-marker--active,
.orbit-marker--active:hover,
.orbit-marker--active:focus-visible {
  opacity: 0;
}

/* Something in its thread the viewer has not read: a white dot on the rim, top right, like the
   one on Varianten. A ring of the pin's film keeps it apart from the rim. */
.orbit-marker__dot {
  position: absolute;
  top: 0;
  right: 0;
  width: 7px;
  height: 7px;
  border-radius: var(--orbit-radius-full);
  background: var(--orbit-pin-fg);
  box-shadow: 0 0 0 1.5px var(--orbit-pin-glass);
}

/* Who started the thread, as on their avatar beside a comment. */
.orbit-marker__monogram {
  font-size: var(--orbit-text-2xs);
  font-weight: 600;
  letter-spacing: 0.3px;
  line-height: var(--orbit-leading-none);
}

.orbit-marker__count {
  font-size: var(--orbit-text-2xs);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  line-height: var(--orbit-leading-none);
}

.orbit-marker--fixed {
  position: fixed;
  z-index: calc(var(--orbit-z-base) + var(--orbit-z-badge));
}

.orbit-marker--absolute {
  position: absolute;
  z-index: calc(var(--orbit-z-base) + var(--orbit-z-badge));
}

/* A dashed edge says this pin points at nothing in particular — the annotation is
   page-level, or its element is not rendered right now. It has no tail either. */
.orbit-marker--unplaced .orbit-marker__body {
  stroke: color-mix(in oklab, var(--orbit-marker-hue) 70%, transparent);
  stroke-dasharray: 3 2.5;
}

/* Around a wrapped element: the box its pin hangs from. Lit, it is in the spotlight. */
.orbit-marker-wrap {
  position: relative;
  flex: 1;
  min-width: 0;
}

`;

// ── Popover ──────────────────────────────────────────────────────────────────

const POPOVER = `
.orbit-popover {
  position: relative;
  z-index: calc(var(--orbit-z-base) + var(--orbit-z-popover));
  min-width: 300px;
  max-width: 360px;
  /* The inline maxHeight from popover-position.ts is the real cap; this only
     stops a popover from running past the viewport when there is no anchor. */
  max-height: calc(100vh - var(--orbit-space-8));
  overflow-y: auto;
  border-radius: var(--orbit-radius-2xl);
}

.orbit-popover--inspector {
  z-index: calc(var(--orbit-z-base) + var(--orbit-z-inspector-popover));
  min-width: 320px;
  max-width: 360px;
}

/* Pinned to the popover's top-right corner. The compound selector outweighs the
   .orbit-icon-button base (which sets position: relative and is declared later), so
   the absolute positioning wins. A solid background keeps it legible over content. */
.orbit-popover .orbit-popover__close {
  position: absolute;
  /* Level with the first content row (the type badge / label at the section's
     16px top padding), tight into the corner. */
  top: var(--orbit-space-3);
  right: var(--orbit-space-2);
  z-index: 2;
  /* The chip, so it reads over content scrolling under it. */
  background: var(--orbit-glass-chip);
}

.orbit-popover__section {
  padding: var(--orbit-space-4);
}

.orbit-popover__section + .orbit-popover__section {
  border-top: 1px solid var(--orbit-border-secondary);
}

.orbit-popover__section > .orbit-type-badge {
  margin-bottom: var(--orbit-space-2);
}

/* The Vercel breadcrumb bar: a thin strip carrying the element reference and the
   close button, its own quiet background. */
.orbit-popover__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--orbit-space-2);
}

.orbit-popover__title {
  margin-bottom: var(--orbit-space-1);
  font-size: var(--orbit-text-md);
  font-weight: 600;
  color: var(--orbit-text-primary);
  text-wrap: balance;
}

.orbit-popover__body {
  font-size: var(--orbit-text-md);
  line-height: var(--orbit-leading-normal);
  color: var(--orbit-text-secondary);
  white-space: pre-wrap;
  text-wrap: pretty;
}

.orbit-popover__meta {
  display: flex;
  align-items: center;
  gap: var(--orbit-space-1-5);
  margin-top: var(--orbit-space-3);
  font-size: var(--orbit-text-xs);
  color: var(--orbit-text-quaternary);
}

.orbit-mono {
  overflow: hidden;
  /* Clears the close button pinned in the top-right corner. */
  padding-right: var(--orbit-space-8);
  font-family: var(--orbit-font-mono);
  font-size: var(--orbit-text-sm);
  color: var(--orbit-text-tertiary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.orbit-section-heading {
  display: flex;
  align-items: center;
  gap: var(--orbit-space-1-5);
  margin-bottom: var(--orbit-space-3);
  font-size: var(--orbit-text-xs);
  font-weight: 600;
  color: var(--orbit-text-tertiary);
}

.orbit-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 var(--orbit-space-1-5);
  border-radius: var(--orbit-radius-full);
  background: var(--orbit-glass-chip);
  color: var(--orbit-text-primary);
  font-size: var(--orbit-text-2xs);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  letter-spacing: normal;
}
`;

// ── Badges and pills ─────────────────────────────────────────────────────────

const BADGES = `
.orbit-type-badge {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  gap: var(--orbit-space-1);
  height: 20px;
  padding: 0 var(--orbit-space-1-5);
  border: 1px solid var(--orbit-variant-border);
  border-radius: var(--orbit-radius-sm);
  background: var(--orbit-variant-bg);
  color: var(--orbit-variant-fg);
  font-size: var(--orbit-text-2xs);
  font-weight: 500;
  line-height: var(--orbit-leading-none);
  letter-spacing: 0.3px;
  text-transform: capitalize;
}

/* A status is a dot plus a word — the colour never carries the meaning alone. */
.orbit-status {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  gap: var(--orbit-space-1-5);
  height: 20px;
  padding: 0 var(--orbit-space-2);
  border: 1px solid var(--orbit-variant-border);
  border-radius: var(--orbit-radius-full);
  background: var(--orbit-variant-bg);
  color: var(--orbit-variant-fg);
  font-size: var(--orbit-text-xs);
  font-weight: 500;
}

.orbit-status::before {
  content: "";
  width: 6px;
  height: 6px;
  border-radius: var(--orbit-radius-full);
  background: currentColor;
}

/* Small round monogram standing in for a user, in a thread and the composer. */
.orbit-avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 26px;
  height: 26px;
  border-radius: var(--orbit-radius-full);
  background: var(--orbit-bg-tertiary);
  color: var(--orbit-text-secondary);
  font-size: var(--orbit-text-2xs);
  font-weight: 600;
  letter-spacing: 0.3px;
  text-transform: uppercase;
}
`;

// ── Panel ────────────────────────────────────────────────────────────────────

const PANEL = `
/* Bottom right above the rail, where its button is; settings.panelWidth and panelHeight are
   applied inline, and these caps keep it inside a small window. It does not drag: it stays
   by the button that opens it. */
.orbit-panel {
  position: fixed;
  right: var(--orbit-space-4);
  bottom: calc(var(--orbit-rail-height) + var(--orbit-space-4));
  z-index: calc(var(--orbit-z-base) + var(--orbit-z-toolbar));
  max-width: calc(100vw - var(--orbit-space-8));
  max-height: calc(100vh - var(--orbit-rail-height) - var(--orbit-space-8));
  max-height: calc(100dvh - var(--orbit-rail-height) - var(--orbit-space-8));
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-radius: var(--orbit-radius-2xl);
}

/*
 * The panel's two pages, over each other: the list, and a thread pushed over it from the right.
 * The list gives way to the left, at half the distance, so the thread reads as the next page
 * and Back as the way to the one before. The page going out fades quicker than the one coming in. Transitions, not keyframes: a quick Back mid-push turns
 * around from where it is. The page out of view goes hidden once it has slid away, so it leaves
 * the tab order; coming in, it is visible at once.
 */
.orbit-panel__page {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  min-height: 0;
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  /* Out quicker than in: the panel is glass, and two pages through each other read as noise. */
  transition:
    transform var(--orbit-duration-slow) var(--orbit-ease),
    opacity var(--orbit-duration-fast) var(--orbit-ease),
    visibility 0s linear var(--orbit-duration-slow);
}

.orbit-panel__page--list {
  transform: translateX(-12%);
}

.orbit-panel__page--thread {
  transform: translateX(24%);
}

.orbit-panel__page--in {
  opacity: 1;
  visibility: visible;
  pointer-events: auto;
  transform: none;
  transition:
    transform var(--orbit-duration-slow) var(--orbit-ease),
    opacity var(--orbit-duration-slow) var(--orbit-ease),
    visibility 0s;
}

/* Less motion: no sliding, the pages still cross-fade so the change is not a jump. */
@media (prefers-reduced-motion: reduce) {
  .orbit-root .orbit-panel__page {
    transform: none;
    transition-duration: var(--orbit-duration-slow) !important;
  }
}

/* The thread scrolls under its header, as the list does. */
.orbit-thread-page {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

/* Back to the list: the view it came from, after a chevron. */
.orbit-back {
  display: flex;
  align-items: center;
  gap: var(--orbit-space-1);
  height: 32px;
  margin-right: auto;
  padding: 0 var(--orbit-space-3) 0 var(--orbit-space-1-5);
  border-radius: var(--orbit-radius-full);
  color: var(--orbit-text-secondary);
  font-size: var(--orbit-text-md);
  font-weight: 500;
  transition:
    background-color var(--orbit-duration-fast) var(--orbit-ease),
    color var(--orbit-duration-fast) var(--orbit-ease);
}

.orbit-back:hover {
  background: var(--orbit-glass-chip);
  color: var(--orbit-text-primary);
}

/* The tabs and the close share one row. */
.orbit-panel__header {
  display: flex;
  align-items: center;
  gap: var(--orbit-space-1);
  padding: var(--orbit-space-2);
  border-bottom: 1px solid var(--orbit-glass-hairline);
}

.orbit-panel__header .orbit-icon-button {
  align-self: center;
}

.orbit-icon-button {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  border-radius: var(--orbit-radius-full);
  color: var(--orbit-text-tertiary);
  transition:
    background-color var(--orbit-duration-fast) var(--orbit-ease),
    color var(--orbit-duration-fast) var(--orbit-ease),
    transform var(--orbit-duration-fast) var(--orbit-ease);
}

/* 28px is the visible box; the pseudo-element brings the hit area to 40px. */
.orbit-icon-button::before {
  content: "";
  position: absolute;
  inset: -6px;
}

.orbit-icon-button:hover {
  background: var(--orbit-glass-chip);
  color: var(--orbit-text-primary);
}

.orbit-icon-button:active {
  transform: scale(0.94);
}

.orbit-tabs {
  display: flex;
  flex: 0 1 auto;
  gap: var(--orbit-space-1);
  margin-right: auto;
  padding: var(--orbit-space-1);
  border-radius: var(--orbit-radius-full);
  background-color: var(--orbit-glass-film);
  box-shadow: var(--orbit-glass-edge);
}

.orbit-tab {
  display: flex;
  align-items: center;
  gap: var(--orbit-space-1-5);
  height: 32px;
  padding: 0 var(--orbit-space-3);
  border-radius: var(--orbit-radius-full);
  color: var(--orbit-text-secondary);
  font-size: var(--orbit-text-md);
  font-weight: 500;
  transition: color var(--orbit-duration) var(--orbit-ease);
}

.orbit-tab:hover {
  color: var(--orbit-text-primary);
}

.orbit-tab--active {
  background: var(--orbit-glass-chip);
  box-shadow: var(--orbit-glass-chip-edge);
  color: var(--orbit-text-primary);
  font-weight: 600;
}

/* The counter says how much is waiting in the tab you are not looking at. Once
   you are in it, the list below answers that. */
.orbit-tab--active .orbit-count {
  display: none;
}

.orbit-subtabs {
  display: flex;
  gap: var(--orbit-space-1);
  padding: var(--orbit-space-3) var(--orbit-space-4) var(--orbit-space-1);
}

.orbit-subtab {
  display: flex;
  align-items: center;
  gap: var(--orbit-space-1-5);
  height: 32px;
  padding: 0 var(--orbit-space-3);
  border-radius: var(--orbit-radius-full);
  color: var(--orbit-text-secondary);
  font-size: var(--orbit-text-md);
  font-weight: 500;
  transition: color var(--orbit-duration-fast) var(--orbit-ease);
}

.orbit-subtab:hover {
  color: var(--orbit-text-primary);
}

.orbit-subtab--active {
  background: var(--orbit-glass-chip);
  box-shadow: var(--orbit-glass-chip-edge);
  color: var(--orbit-text-primary);
  font-weight: 600;
}

.orbit-subtab__count {
  min-width: 16px;
  color: var(--orbit-text-quaternary);
  font-size: var(--orbit-text-2xs);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  text-align: center;
}

.orbit-subtab--active .orbit-subtab__count {
  color: var(--orbit-text-secondary);
}

.orbit-search {
  position: relative;
  /* Symmetric top/bottom padding so the icon's 50% is the input's true centre. */
  padding: var(--orbit-space-2) var(--orbit-space-4);
}

.orbit-search__icon {
  position: absolute;
  top: 50%;
  left: calc(var(--orbit-space-4) + var(--orbit-space-2-5));
  display: flex;
  transform: translateY(-50%);
  color: var(--orbit-text-quaternary);
  pointer-events: none;
}

.orbit-search .orbit-input {
  min-height: 36px;
  padding-left: var(--orbit-space-8);
}

.orbit-filters {
  display: flex;
  flex-wrap: wrap;
  gap: var(--orbit-space-1-5);
  padding: var(--orbit-space-2) var(--orbit-space-4);
}

.orbit-filter {
  display: flex;
  align-items: center;
  gap: var(--orbit-space-1);
  height: 28px;
  padding: 0 var(--orbit-space-3);
  border: 1px solid transparent;
  border-radius: var(--orbit-radius-full);
  background-color: var(--orbit-glass-film);
  box-shadow: var(--orbit-glass-edge);
  color: var(--orbit-text-secondary);
  font-size: var(--orbit-text-xs);
  font-weight: 500;
  transition:
    background-color var(--orbit-duration-fast) var(--orbit-ease),
    border-color var(--orbit-duration-fast) var(--orbit-ease),
    color var(--orbit-duration-fast) var(--orbit-ease);
}

.orbit-filter:hover {
  color: var(--orbit-text-primary);
}

.orbit-filter--active {
  border-color: var(--orbit-variant-border);
  background: var(--orbit-variant-bg);
  color: var(--orbit-variant-fg);
}

.orbit-filter--active:hover {
  border-color: var(--orbit-variant-fg);
  color: var(--orbit-variant-fg);
}

.orbit-list {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: var(--orbit-space-0-5);
  overflow-y: auto;
  padding: var(--orbit-space-1) var(--orbit-space-2) var(--orbit-space-2);
}

.orbit-list--comments {
  gap: var(--orbit-space-2);
  padding: var(--orbit-space-2) var(--orbit-space-3) var(--orbit-space-3);
}

.orbit-empty {
  padding: var(--orbit-space-8) var(--orbit-space-4);
  color: var(--orbit-text-quaternary);
  font-size: var(--orbit-text-sm);
  text-align: center;
}

.orbit-empty--error {
  color: var(--orbit-text-error-primary);
}
`;

// ── Annotation card ──────────────────────────────────────────────────────────

const CARD = `
.orbit-card {
  position: relative;
  padding: var(--orbit-space-3);
  border: 1px solid transparent;
  border-radius: var(--orbit-radius-xl);
  transition:
    background-color var(--orbit-duration-fast) var(--orbit-ease),
    border-color var(--orbit-duration-fast) var(--orbit-ease);
}

/* Same reason as .orbit-comment__target: the card opens an annotation and the
   breadcrumb inside it opens a route, and a button cannot contain a button. */
.orbit-card__target {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  border-radius: inherit;
  cursor: pointer;
}

.orbit-card__target:focus-visible {
  outline-offset: -3px;
}

.orbit-card:hover,
.orbit-card--hovered {
  background: var(--orbit-glass-film);
}

.orbit-card--active {
  border-color: var(--orbit-glass-hairline);
  background: var(--orbit-glass-film);
}

.orbit-card__head {
  display: flex;
  align-items: center;
  gap: var(--orbit-space-2);
  margin-bottom: var(--orbit-space-1-5);
}

.orbit-card__title {
  flex: 1;
  overflow: hidden;
  font-size: var(--orbit-text-md);
  font-weight: 600;
  color: var(--orbit-text-primary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.orbit-card__pin {
  display: flex;
  flex-shrink: 0;
  color: var(--orbit-text-quaternary);
}

.orbit-card__body {
  display: -webkit-box;
  margin-bottom: var(--orbit-space-2);
  overflow: hidden;
  font-size: var(--orbit-text-sm);
  line-height: var(--orbit-leading-normal);
  color: var(--orbit-text-tertiary);
  text-wrap: pretty;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.orbit-card__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--orbit-space-2);
  font-size: var(--orbit-text-xs);
  color: var(--orbit-text-quaternary);
}

.orbit-meta {
  flex-shrink: 0;
}

/* Sits above the stretched card button, so it stays clickable in its own right. */
.orbit-link {
  position: relative;
  z-index: 1;
  max-width: 60%;
  overflow: hidden;
  color: var(--orbit-text-tertiary);
  text-overflow: ellipsis;
  white-space: nowrap;
  transition: color var(--orbit-duration-fast) var(--orbit-ease);
}

.orbit-link:hover {
  color: var(--orbit-text-primary);
}

/* 12px text would leave a 15px-tall target; WCAG 2.2 asks for 24. Padding would
   push the footer around, so the hit area grows on a pseudo-element instead. */
.orbit-link::before {
  content: "";
  position: absolute;
  inset: -5px -2px;
}
`;

// ── Comments ─────────────────────────────────────────────────────────────────

const COMMENTS = `
.orbit-thread {
  display: flex;
  flex-direction: column;
  gap: var(--orbit-space-4);
}

/* A comment in a thread: avatar in its own column, everything else to the right. */
.orbit-comment {
  position: relative;
  display: grid;
  grid-template-columns: 26px 1fr;
  gap: var(--orbit-space-2-5);
  text-align: start;
}

/* In the panel list a comment is an entry rather than the comment itself: it keeps
   the same avatar grid but gains a card shell, and clicking it opens the thread on
   the page. */
.orbit-comment--clickable {
  padding: var(--orbit-space-3);
  border: 1px solid var(--orbit-glass-hairline);
  border-radius: var(--orbit-radius-xl);
  background: var(--orbit-glass-film-faint);
  transition:
    border-color var(--orbit-duration) var(--orbit-ease),
    background-color var(--orbit-duration) var(--orbit-ease);
}

.orbit-comment--clickable:hover {
  border-color: var(--orbit-glass-hairline);
  background: var(--orbit-glass-film);
}

.orbit-comment--active {
  border-color: var(--orbit-text-feedback);
  background: var(--orbit-bg-secondary);
}

/* A card with two actions — jump to the element, and open the page it is on —
   cannot nest one button inside another. The primary action is an overlay button
   the size of the card; the page link sits above it. */
.orbit-comment__target {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  border-radius: inherit;
  cursor: pointer;
}

.orbit-comment__target:focus-visible {
  outline-offset: -3px;
}

.orbit-comment__label {
  grid-column: 1 / -1;
  margin-bottom: var(--orbit-space-1);
  overflow: hidden;
  font-family: var(--orbit-font-mono);
  font-size: var(--orbit-text-xs);
  color: var(--orbit-text-quaternary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.orbit-comment__body {
  min-width: 0;
}

.orbit-comment__head {
  display: flex;
  align-items: baseline;
  gap: var(--orbit-space-2);
  margin-bottom: var(--orbit-space-1);
}

.orbit-comment__author {
  font-size: var(--orbit-text-sm);
  font-weight: 600;
  color: var(--orbit-text-primary);
}

.orbit-comment__time-rel {
  flex-shrink: 0;
  font-size: var(--orbit-text-xs);
  color: var(--orbit-text-quaternary);
  font-variant-numeric: tabular-nums;
}

/* Status sits at the right end of the header row. */
.orbit-comment__head .orbit-status {
  margin-left: auto;
}

.orbit-comment__text {
  font-size: var(--orbit-text-sm);
  line-height: var(--orbit-leading-normal);
  color: var(--orbit-text-secondary);
  white-space: pre-wrap;
  text-wrap: pretty;
}

.orbit-comment__variants {
  margin-top: var(--orbit-space-1);
  font-size: var(--orbit-text-xs);
  color: var(--orbit-text-quaternary);
}

.orbit-comment__component {
  display: flex;
  margin-top: var(--orbit-space-1-5);
}

.orbit-comment--clickable .orbit-comment__variants {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* A comment in the panel list stays clamped: it is the entry, not the thread. */
.orbit-comment--clickable .orbit-comment__text {
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
}

.orbit-comment--clickable .orbit-comment__reply-text {
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.orbit-comment__time {
  margin-top: var(--orbit-space-1);
  font-size: var(--orbit-text-2xs);
  color: var(--orbit-text-quaternary);
  font-variant-numeric: tabular-nums;
}

.orbit-comment__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--orbit-space-2);
  margin-top: var(--orbit-space-2);
  font-size: var(--orbit-text-xs);
  color: var(--orbit-text-quaternary);
}

/* The bin on the viewer's own comment: there when the comment is pointed at or holds the focus,
   always on a touch screen, which has no pointing. */
.orbit-comment__delete {
  align-self: center;
  width: 24px;
  height: 24px;
  margin: -4px -4px -4px 0;
  opacity: 0;
  transition:
    opacity var(--orbit-duration-fast) var(--orbit-ease),
    background-color var(--orbit-duration-fast) var(--orbit-ease),
    color var(--orbit-duration-fast) var(--orbit-ease);
}

.orbit-comment__delete::before {
  inset: -8px;
}

.orbit-comment:hover .orbit-comment__delete,
.orbit-comment:focus-within .orbit-comment__delete,
.orbit-comment__delete--open {
  opacity: 1;
}

@media (hover: none) {
  .orbit-comment__delete {
    opacity: 1;
  }
}

.orbit-comment__delete:hover {
  color: var(--orbit-text-error-primary);
}

/* The question before deleting, under the comment it is about. */
.orbit-comment__confirm {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--orbit-space-2);
  margin-top: var(--orbit-space-2);
  font-size: var(--orbit-text-xs);
  color: var(--orbit-text-secondary);
}

.orbit-comment__confirm-text {
  margin-right: auto;
}

.orbit-comment__confirm-button {
  min-height: 28px;
  padding: 0 var(--orbit-space-3);
  border-radius: var(--orbit-radius-full);
  background: var(--orbit-glass-chip);
  color: var(--orbit-text-primary);
  font-size: var(--orbit-text-xs);
  font-weight: 600;
  transition: background-color var(--orbit-duration-fast) var(--orbit-ease);
}

.orbit-comment__confirm-button:hover:not(:disabled) {
  background: var(--orbit-bg-secondary_hover);
}

.orbit-comment__confirm-button--danger {
  background: var(--orbit-bg-error-primary);
  color: var(--orbit-text-error-primary);
}

.orbit-comment__confirm-button--danger:hover:not(:disabled) {
  background: var(--orbit-bg-error-primary);
  box-shadow: inset 0 0 0 1px var(--orbit-border-error);
}

.orbit-comment__confirm-button:disabled {
  color: var(--orbit-text-disabled);
}

.orbit-comment__confirm-error {
  flex-basis: 100%;
}

/* The admin reply, as a nested note under the comment it answers. */
.orbit-comment__reply {
  margin-top: var(--orbit-space-2-5);
  padding: var(--orbit-space-2-5) var(--orbit-space-3);
  border-radius: var(--orbit-radius-lg);
  background: var(--orbit-bg-secondary);
  font-size: var(--orbit-text-sm);
  line-height: var(--orbit-leading-normal);
  color: var(--orbit-text-secondary);
  white-space: pre-wrap;
}

.orbit-comment--clickable .orbit-comment__reply {
  border: 1px solid var(--orbit-border-secondary);
}

.orbit-comment__reply-label {
  display: flex;
  align-items: center;
  gap: var(--orbit-space-1-5);
  margin-bottom: var(--orbit-space-1);
  font-size: var(--orbit-text-xs);
  font-weight: 600;
  color: var(--orbit-text-tertiary);
}

.orbit-comment__reply-label::before {
  content: "";
  width: 12px;
  height: 1px;
  background: var(--orbit-border-primary);
}
`;

// ── Form / composer ────────────────────────────────────────────────────────────

const FORM = `
/* Figma's composer: one line with the send button beside it. With text it opens up, the
   button drops to its own row, and the field grows to the stylesheet's cap. A field like the
   search: no focus ring, the caret says where the typing goes. */
.orbit-composer {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  grid-template-areas:
    "field tools send"
    "error error error";
  align-items: end;
  column-gap: var(--orbit-space-2);
  padding: var(--orbit-space-1) var(--orbit-space-1) var(--orbit-space-1) var(--orbit-space-3);
  border-radius: var(--orbit-radius-2xl);
  background: var(--orbit-glass-film-faint);
  box-shadow: var(--orbit-glass-field-edge);
}

/* In a thread, its own section under a divider: no field of its own, the section is the field.
   The section's padding plus the composer's lines the text up with the content above. */
.orbit-popover__section.orbit-popover__compose {
  padding: var(--orbit-space-2) var(--orbit-space-3) var(--orbit-space-2) var(--orbit-space-1);
}

.orbit-popover__compose .orbit-composer {
  padding: var(--orbit-space-1) var(--orbit-space-1) var(--orbit-space-1) var(--orbit-space-3);
  border-radius: 0;
  background: transparent;
  box-shadow: none;
}

.orbit-composer__field {
  grid-area: field;
  display: block;
  width: 100%;
  min-height: 32px;
  max-height: 200px;
  padding: 6px 0;
  border: 0;
  background: transparent;
  color: var(--orbit-text-primary);
  font-size: var(--orbit-text-md);
  line-height: var(--orbit-leading-normal);
  resize: none;
  overflow-y: auto;
}

.orbit-composer__field::placeholder {
  color: var(--orbit-text-quaternary);
}

.orbit-root .orbit-composer__field:focus-visible {
  outline: none;
}

/* Room for three lines once there is text: the field says there is more to write. */
.orbit-composer--expanded {
  grid-template-columns: minmax(0, 1fr) auto;
  grid-template-areas:
    "field field"
    "error error"
    "tools send";
  padding: var(--orbit-space-2) var(--orbit-space-2) var(--orbit-space-2) var(--orbit-space-3);
}

.orbit-composer--expanded .orbit-composer__field {
  min-height: 72px;
  padding-right: var(--orbit-space-1);
}

.orbit-composer__error {
  grid-area: error;
  padding: var(--orbit-space-1) 0;
}

.orbit-composer__send {
  grid-area: send;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: var(--orbit-radius-full);
  background: var(--orbit-bg-brand-solid);
  color: var(--orbit-text-primary_on-brand);
  transition:
    background-color var(--orbit-duration) var(--orbit-ease),
    transform var(--orbit-duration-fast) var(--orbit-ease);
}

.orbit-composer__tools {
  grid-area: tools;
  display: flex;
  align-items: center;
  align-self: center;
}

.orbit-composer--expanded .orbit-composer__tools {
  justify-self: start;
}

.orbit-composer--expanded .orbit-composer__send,
.orbit-composer--expanded .orbit-composer__tools {
  margin-top: var(--orbit-space-1);
}

.orbit-composer__send:hover:not(:disabled) {
  background: var(--orbit-bg-brand-solid_hover);
}

.orbit-composer__send:active:not(:disabled) {
  transform: scale(0.94);
}

.orbit-composer__send:disabled {
  background: var(--orbit-bg-disabled);
  color: var(--orbit-text-disabled);
}

.orbit-composer[aria-busy="true"] .orbit-composer__send {
  cursor: progress;
}

/* The inspector's comment: a message bubble under the element it is about, its corner on
   the element's. Above the element, the corner flips to the bottom. */
.orbit-bubble {
  z-index: calc(var(--orbit-z-base) + var(--orbit-z-inspector-popover));
  border-radius: var(--orbit-radius-2xl);
  border-top-left-radius: 0;
}

.orbit-bubble--above {
  border-top-left-radius: var(--orbit-radius-2xl);
  border-bottom-left-radius: 0;
  transform-origin: bottom left;
}

/* Component ❖ or instance ◇: Radial's pill, a size for two icons. */
.orbit-scope {
  position: relative;
  flex: none;
  gap: 2px;
  padding: 2px;
}

.orbit-scope .orbit-segment {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: none;
  width: 28px;
  height: 24px;
  padding: 0;
}

/* What an option means, on hover or keyboard focus. Under the bubble, away from the element;
   anchored to the side of the pill that has room: its right on one line, where the pill is at
   the bubble's right, its left once the composer opens and the pill drops to the left. */
.orbit-scope__tip {
  position: absolute;
  top: calc(100% + var(--orbit-space-3));
  right: 0;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  width: max-content;
  max-width: 240px;
  padding: var(--orbit-space-2) var(--orbit-space-2-5);
  border-radius: var(--orbit-radius-lg);
  background: var(--orbit-spotlight-tag);
  box-shadow: var(--orbit-shadow-pane);
  color: color-mix(in oklab, var(--orbit-spotlight-tag-text) 72%, transparent);
  font-size: var(--orbit-text-xs);
  font-weight: 400;
  line-height: var(--orbit-leading-snug);
  text-align: start;
  white-space: normal;
  pointer-events: none;
  visibility: hidden;
  opacity: 0;
  transform: translateY(-2px);
  transition:
    opacity var(--orbit-duration-fast) var(--orbit-ease),
    transform var(--orbit-duration-fast) var(--orbit-ease),
    visibility 0s linear var(--orbit-duration-fast);
}

.orbit-scope__tip-title {
  color: var(--orbit-spotlight-tag-text);
  font-weight: 600;
}

.orbit-composer--expanded .orbit-scope__tip {
  right: auto;
  left: 0;
}

/* Above the element, the bubble's foot is nearest the element: the tip goes over the bubble. */
.orbit-bubble--above .orbit-scope__tip {
  top: auto;
  bottom: calc(100% + var(--orbit-space-3));
  transform: translateY(2px);
}

/* A short wait on hover, so moving across the pill does not flash them; at once for the keyboard. */
.orbit-segment:hover .orbit-scope__tip,
.orbit-segment:focus-visible .orbit-scope__tip {
  visibility: visible;
  opacity: 1;
  transform: none;
  transition:
    opacity var(--orbit-duration-fast) var(--orbit-ease) 300ms,
    transform var(--orbit-duration-fast) var(--orbit-ease) 300ms,
    visibility 0s linear 300ms;
}

.orbit-segment:focus-visible .orbit-scope__tip {
  transition-delay: 0s;
}

.orbit-bubble .orbit-composer {
  border-radius: inherit;
  background: transparent;
  box-shadow: none;
}

/* A 1px inset ring rather than a border, so focus can thicken it without shifting
   layout. Matches the Untitled UI field shell, restyled to Geist proportions. */
.orbit-input {
  width: 100%;
  min-height: 38px;
  padding: var(--orbit-space-2) var(--orbit-space-3);
  border: 0;
  /* Radial's glass field: a faint film with a lit edge. */
  border-radius: var(--orbit-radius-xl);
  background: var(--orbit-glass-film-faint);
  color: var(--orbit-text-primary);
  font-size: var(--orbit-text-md);
  box-shadow: var(--orbit-glass-field-edge);
  transition: box-shadow var(--orbit-duration-fast) linear;
}

.orbit-input::placeholder {
  color: var(--orbit-text-quaternary);
}

/* A crisp 1px ring in the interaction blue — Vercel's focus state. */
.orbit-root .orbit-input:focus {
  outline: 2px solid var(--orbit-outline-focus-ring);
  outline-offset: 0;
}

.orbit-input[aria-invalid="true"] {
  box-shadow: inset 0 0 0 1px var(--orbit-text-error-primary);
}

.orbit-input[aria-invalid="true"]:focus {
  box-shadow:
    inset 0 0 0 1px var(--orbit-text-error-primary),
    0 0 0 3px color-mix(in oklab, var(--orbit-text-error-primary) 20%, transparent);
}

.orbit-textarea {
  resize: vertical;
  min-height: 76px;
  line-height: var(--orbit-leading-normal);
}

.orbit-error {
  display: flex;
  align-items: center;
  gap: var(--orbit-space-1-5);
  font-size: var(--orbit-text-xs);
  color: var(--orbit-text-error-primary);
}

/* The primary button: Vercel's inverted monochrome, filled, no shadow. */
.orbit-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  align-self: flex-end;
  min-height: 36px;
  padding: 0 var(--orbit-space-4);
  /* Radial's primary: a near-white pill. */
  border-radius: var(--orbit-radius-full);
  background: var(--orbit-bg-brand-solid);
  color: var(--orbit-text-primary_on-brand);
  font-size: var(--orbit-text-sm);
  font-weight: 600;
  transition:
    background-color var(--orbit-duration) var(--orbit-ease),
    transform var(--orbit-duration-fast) var(--orbit-ease);
}

.orbit-button:hover:not(:disabled) {
  background: var(--orbit-bg-brand-solid_hover);
}

.orbit-button:active:not(:disabled) {
  transform: scale(0.97);
}

.orbit-button:disabled {
  background: var(--orbit-bg-disabled);
  color: var(--orbit-text-disabled);
}
`;

// ── Overlays drawn over host elements ────────────────────────────────────────

const OVERLAYS = `
/* While the screenshot for a comment is taken: the page without Orbit on it. */
[data-orbit-capturing] .orbit-root {
  visibility: hidden;
}

/* The pins the tour is about, above the spotlight's scrim. */
[data-orbit-tour="pins"] .orbit-marker--fixed {
  z-index: calc(var(--orbit-z-base) + var(--orbit-z-highlight) + 1);
}

/* The inspector's spotlight. The box is the picking area (the frame, or the window) and
   clips; the cutout's shadow is the scrim, so the element under it stays untouched and
   everything outside the area, the rail first, stays lit. */
.orbit-spotlight {
  position: fixed;
  z-index: calc(var(--orbit-z-base) + var(--orbit-z-overlay));
  overflow: hidden;
  pointer-events: none;
  opacity: 1;
  transition: opacity var(--orbit-duration) var(--orbit-ease);
}

.orbit-spotlight--framed {
  border-radius: 0 0 24px 24px;
}

.orbit-spotlight--idle {
  opacity: 0;
}


.orbit-spotlight__cutout,
.orbit-spotlight__tag,
.orbit-spotlight-ring {
  position: absolute;
  transition:
    top var(--orbit-duration-fast) var(--orbit-ease),
    left var(--orbit-duration-fast) var(--orbit-ease),
    width var(--orbit-duration-fast) var(--orbit-ease),
    height var(--orbit-duration-fast) var(--orbit-ease);
}

/* A spread shadow rounds its outer corners by as much as it spreads, so the scrim is a circle
   around each corner of the hole. 100vmax left the far corner of the area bare; 200vmax clears
   the diagonal of any window, from a hole anywhere in it. */
.orbit-spotlight__cutout {
  border-radius: var(--orbit-radius-xs);
  box-shadow: var(--orbit-spotlight-edge), 0 0 0 200vmax var(--orbit-scrim);
}

/* A hairline of light rather than a line of paint: plus-lighter adds it to the page under
   it, so it glows over the scrim and never greys out a white element. */
.orbit-spotlight-ring {
  position: fixed;
  z-index: calc(var(--orbit-z-base) + var(--orbit-z-overlay));
  border-radius: var(--orbit-radius-xs);
  outline: 1px solid var(--orbit-spotlight-ring);
  box-shadow: 0 0 8px 0 var(--orbit-spotlight-glow);
  mix-blend-mode: plus-lighter;
  pointer-events: none;
  opacity: 1;
}

.orbit-spotlight-ring--idle {
  opacity: 0;
}

.orbit-spotlight--selected .orbit-spotlight__cutout,
.orbit-spotlight-ring--selected {
  transition: none;
}

/* What is lit, above the ring: its tag and text, and the ↑↓ to the levels around it. A
   dark pill, apart from the white ring. */
.orbit-spotlight__tag {
  display: flex;
  gap: var(--orbit-space-2);
  align-items: center;
  padding: 3px var(--orbit-space-2-5);
  border-radius: var(--orbit-radius-full);
  background: var(--orbit-spotlight-tag);
  color: var(--orbit-spotlight-tag-text);
  font-size: var(--orbit-text-xs);
  line-height: var(--orbit-leading-normal);
  white-space: nowrap;
  transform: translateY(calc(-100% - 6px));
}

/* With a component's pill in front: as much room left of it as above and below. */
.orbit-spotlight__tag--component {
  padding-left: 3px;
}

.orbit-spotlight__tag--below {
  transform: translateY(6px);
}

.orbit-spotlight__label {
  overflow: hidden;
  font-family: var(--orbit-font-mono);
  text-overflow: ellipsis;
}

.orbit-spotlight__keys {
  flex: none;
  opacity: 0.6;
}

/* A component of the project's: dark purple glass, light text. A pill at the head of the
   spotlight's tag, of a popover, and on a comment card. */
.orbit-component-chip {
  display: inline-flex;
  flex: none;
  gap: var(--orbit-space-1);
  align-items: center;
  max-width: 100%;
  padding: 0 var(--orbit-space-1-5);
  border-radius: var(--orbit-radius-full);
  background: var(--orbit-component-glass);
  box-shadow: var(--orbit-component-glass-edge);
  color: var(--orbit-text-component_on-glass);
  /* A name from the code, like the element beside it. Geist Mono is bundled at 400 only. */
  font-family: var(--orbit-font-mono);
  font-size: var(--orbit-text-xs);
  font-weight: 400;
  line-height: 18px;
  white-space: nowrap;
}

.orbit-component-chip svg {
  flex: none;
  opacity: 0.8;
}

.orbit-component-chip__name {
  overflow: hidden;
  text-overflow: ellipsis;
}

.orbit-highlight {
  position: fixed;
  z-index: calc(var(--orbit-z-base) + var(--orbit-z-highlight));
  border: 2px solid var(--orbit-bg-feedback-solid);
  border-radius: var(--orbit-radius-md);
  background: var(--orbit-overlay-fill-strong);
  box-shadow: 0 0 0 4px var(--orbit-overlay-ring);
  opacity: 1;
  pointer-events: none;
  transition: opacity var(--orbit-duration-slow) var(--orbit-ease);
}

.orbit-highlight--leaving {
  opacity: 0;
}
`;

export const RULES_CSS = [
  BASE,
  TYPE_BRIDGE,
  STATUS_BRIDGE,
  CHROME,
  MARKER,
  POPOVER,
  BADGES,
  PANEL,
  CARD,
  COMMENTS,
  FORM,
  OVERLAYS,
].join("\n");

/**
 * The shell's layout alone, rendered with `OrbitShell` itself, so a server-rendered page lays the
 * app out in the frame from its first paint. The full sheet is only injected once React runs;
 * without this the page would scroll the window until then, and jump when the frame took over.
 */
export const SHELL_LAYOUT_CSS = `
.orbit-shell { display: flex; flex-direction: column; height: 100vh; height: 100dvh; overflow: hidden; }
.orbit-frame { position: relative; flex: 1 1 auto; min-height: 0; overflow: hidden; transform: translateZ(0); }
.orbit-frame__scroll { height: 100%; overflow-y: auto; }
.orbit-shell::after { content: ""; flex: none; height: 48px; }
.orbit-shell:has(.orbit-rail)::after { display: none; }
`;
