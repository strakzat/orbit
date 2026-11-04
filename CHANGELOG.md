# Changelog

## 4.11.0

- **The profile says which version is running,** for when a client reports something.
- **A tour of Orbit.** A viewer who hasn't seen it gets a short tour once, also on existing
  projects after this update: a welcome to the prototype, which asks their name and language and
  names the project with the new `settings.projectName`, then sample pins and threads, a try at
  placing feedback with the real picker, the real panel, Varianten and the profile. With comments
  on, the welcome needs a name before it can be left, so feedback says who it's from. Radial's
  stars drift around the welcome card, and each step's target lets stars go in a slow corona,
  after Radial's home core. One small WebGL2 canvas, for as long as the tour runs. A full boot from
  black is in the code, switched off (`TOUR_BOOT`). During the tour the context holds samples
  instead of the project's data and nothing reaches the API. It can be replayed from the profile;
  `settings.tour: false` turns off the automatic start only.
- **No more 1px window scroll** under a full-height shell, from the inspector's status region.

## 4.10.4

- **The scrim reaches every corner.** On a large window, an element in one corner left the
  opposite corner of the frame undimmed, behind a curved edge: a spread shadow rounds its outer
  corners by as much as it spreads, and 100vmax is less than the window's diagonal. The spread
  is now 200vmax, and an element scrolled far out of view no longer takes the scrim with it.

## 4.10.3

- **Feedback lands on the instance by default.** Inside a component, the bubble's choice now
  starts on Instance, and Instance comes first: feedback is usually about the one element in
  front of you. Component is one click away, for feedback that holds on every page.

## 4.10.2

- **The spotlight's pill stays visible.** On an element too tall for room above or below the
  ring, or at the top of the view, the pill fell outside the frame. It now sits inside the
  ring, at the top of what shows, and stays within the frame when an element is scrolled out of
  view or wider than the frame. The comment bubble no longer covers the pill when it opens
  above the element.

## 4.10.1

- **Releases publish themselves.** A version bump merged to `main` runs
  `.github/workflows/release.yml`: tests, `npm publish` to GitHub Packages, and a GitHub
  release with this file's entry as its notes. A version without an entry here stops before
  publishing. Each step skips what already exists, so a failed run can be re-run.

## 4.10.0

- **Orbit ships the comments API.** `createCommentsHandler()` from `@strakzat/orbit/server` is
  the whole `/api/comments` route: `export default createCommentsHandler()`. It takes every
  field the widget sends, so new ones reach Notion with a package update. Before, each project
  copied a handler that passed the fields on one by one, and `orbit-init`'s template left out
  `component`: feedback on a component landed in production as feedback on one element, while
  it worked in dev. `handleCommentsRequest()` is the same without a framework.
- **Dev and production are the same handler.** The Vite plugin now serves
  `createCommentsHandler()`. Its GET now also returns comments oldest first, and its POST refuses
  a comment without `annotationId` or text (400), like the Vercel example.
- **`orbit-init`** writes the one-line route, and suggests it when `api/comments.js` is a handler
  of its own.
- **Delete your own comment.** In a thread, a comment you wrote in this browser has a bin
  (on hover or focus, always on touch). It asks first, in the card (Annuleren / Verwijderen),
  and the comment leaves the thread, the panel and the pins at once. The API signs a
  `deleteToken` for each new comment (HMAC with `ORBIT_SECRET`, else the Notion key) that the
  browser keeps under `@strakzat/orbit:own`; `DELETE /api/comments` with `{ id, token }`
  archives the Notion page. No accounts, nothing stored server-side: a name can be typed by
  anyone, a token cannot. Only through `createCommentsHandler()`: a handler of a project's own
  gives no token, and no bin shows.

## 4.9.1

- **The composer is part of the thread.** In a thread, in the panel and in a pin's popover, the
  message box is no longer a field floating in the Feedback section: it is the thread's last
  section, under a divider like the others, without a field shell of its own.

## 4.9.0

- **Pins look like pins.** Glass like the component chip: a dark film tinted by the kind, a lit
  edge, a light glyph, the same in both themes. A pin on an element has a tail, a square tip
  recessed into the circle, pointing at the spot it is pinned to: the element's top-right corner,
  the pin above and to the right of it. Without room there, it turns around. A parked pin has no
  tail and keeps its dashed edge. Hovering grows it from its tip, with a pointer cursor. New
  tokens: `--orbit-pin-glass`, `--orbit-pin-fg`, `--orbit-pin-shadow`, `-shadow_hover`, and a hue
  per kind, `--orbit-pin-{documentation,pro,question,con,suggestion,critical,user-insight,feedback}`.
- **No highlight on the page.** Hovering or opening a pin no longer lights its element; the
  faint hover highlight and the outline around a wrapped element are gone.
- **A thread opens on its pin**, the way a comment does in Figma: the popover's corner on the
  pin, covering it, growing right and down (left or up without room). It grows out of the pin
  as it opens and back into it as it closes; with reduced motion, a fade. An open thread is
  always above every other pin: AnnotationMarker's popover now renders in `document.body`.
- **A dot for what you have not read.** An annotation's pin no longer has a feedback count beside
  it; a white dot says its thread has a comment or an answer you have not seen (not your own).
  Opening the thread reads it. Kept in localStorage per project (`@strakzat/orbit:seen`). New on
  the context: `unseenAnnotationIds`, `markSeen`. New label: `markerUnseen`.
- **Feedback pins say who.** Grey for everyone, with the initials of whoever started the thread
  (the feedback icon for `Anonymous`); feedback on a component looks the same. The count is in
  the pin's name for screen readers.
- **Resolved feedback, half there or not at all.** Pins with everything resolved are at 50%
  opacity, whole on hover. A profile switch, "Opgeloste feedback tonen", or Shift + R hides
  them. New on the context: `showResolvedPins`, `setViewerShowResolved`, and `viewer.showResolved`.
  New label: `profileResolved`.

## 4.8.0

- **The pins are the viewer's to show or hide.** Annotations and feedback on the page show by
  default, so you see what is there. A switch in the profile ("Annotaties en feedback tonen")
  hides them, and Cmd/Ctrl + `.` does the same; the choice is kept with the name and language.
  `settings.defaultVisible` is now `true` and is where it starts until the viewer chooses.
- **The panel no longer shows or hides the pins.** Opening and closing Annotaties en feedback
  leaves them as they are, and clicking a pin no longer opens the panel. With the pins hidden,
  the panel still opens threads and points at their elements.
- `annotationMode` / `setAnnotationMode` on the context are that setting now; new on the
  context: `setViewerShowMarkers`, and `viewer.showMarkers`. New labels: `profileMarkers`,
  `profileMarkersHint` ("Sneltoets", followed by the keys as chips: ⌘ . on a Mac, Ctrl . elsewhere).
- **A thread without the panel.** A pin opens its thread as a popover on the page; the panel is
  for browsing everything, and only opens from its own button.
- **The panel points with the spotlight you place feedback with.** Hovering a card dims the
  page around its element, ringed in white with its name in a tag, the same as picking with
  Feedback plaatsen; moving between cards, it glides along. Hovering a pin on the page keeps
  the faint highlight.
- **A thread opens inside the panel.** Clicking a card pushes its thread over the list as the
  panel's next page, with a back button (‹ Annotaties / ‹ Feedback) and the composer; no popover
  opens on the page, where it could end up behind the panel. The element is scrolled into view
  and stays in the spotlight while the thread is open. The list slides away to the left and keeps its filters, search and scroll. Escape
  in a thread goes back; the focus goes to Back, and back to the card. New label: `threadBack`.
- **One initial for one name.** "Elwin" is E, "Elwin de Witte" is EW.

## 4.7.0

- **A comment bubble instead of a popover.** After picking an element, a message bubble opens
  under it (above it when there is no room): its top-left corner square on the element's, the
  rest rounded. It holds only the comment: one line with a round send button, which opens up to
  three lines with the button below once you type, and grows with the text. Enter sends,
  Shift + Enter is a new line. No focus ring, no annotation, thread or close button; Escape or a
  click beside it lets go. The tag above the spotlight stays, naming what the comment is on.
- **The composer everywhere.** `CommentForm` is that composer in the popovers of pins and
  annotations too.
- **No name field.** Feedback goes out under the name in the profile, or as `Anonymous`.
- **Component ❖ or Instance ◇.** Inside a component, the choice is a small segmented control
  in the bubble, icons only, before the send button. Component is the default and comes first.
  Each option has a tooltip saying what it means. New labels: `scopeComponentHint`,
  `scopeInstanceHint`.
- Labels: `formAs` is gone; `formOn` ("Feedback op {label}") names the bubble for a screen reader.

## 4.6.0

- **Feedback on a component.** Mark a component with `data-orbit-component="Sidebar"`
  (`COMPONENT_ATTR`). Pick something inside it, and the popover shows the component's pill,
  the element under it, and an Instance / Component choice. Feedback on the component shows
  on every page where the component is rendered, with one pin, on the first instance. It is
  listed under Deze pagina and counted on the rail there, and hidden on pages without it.
- **A pill in a pill.** While picking inside a component, the tag above the spotlight starts
  with the component's pill, before the element. The pill, the pin and the chip on a comment
  card are dark purple glass with light text. New tokens: `--orbit-component`,
  `--orbit-component-glass`, `--orbit-component-glass-edge`, `--orbit-text-component_on-glass`.
- **One element at a time.** With an element picked, a click beside its popover lets go of it
  instead of picking another one; the next click picks again.
- **`component` on a comment**, sent in the POST and written to the Notion column `Component`
  (rich text, made by `orbit-feedback init`) only when it is set. The Vite plugin resends
  without the column if the database has none.

## 4.5.0

- **The inspector picks what you mean.** Hover and click now agree: what lights up is
  what gets the feedback. Picking skips wrappers nobody would name and stops at buttons,
  links, text, images and anything with its own box. ↑ and ↓ move to the element around
  the lit one or back inside it, and a tag above the ring names it.
- **A spotlight.** While picking, the app dims and the element stays lit with a white
  ring, as in Radial. The rail stays lit. The form opens beside the element, not on top
  of it. New tokens: `--orbit-scrim`, `--orbit-spotlight-ring`, `--orbit-spotlight-glow`, `--orbit-spotlight-edge`, `--orbit-spotlight-tag`, `--orbit-spotlight-tag-text`.
- **C to give feedback.** Pressing C turns the inspector on, and C again turns it off,
  like the rail's button. It's behind `settings.keyboardShortcut`, like Cmd/Ctrl + `.`,
  and does nothing while you type in a field, with a modifier held, or when the page
  already handled the key.
- **The button shows how to stop.** While picking, a × grows in at the end of the
  Feedback plaatsen button, with a "Stop (C or Esc)" tooltip. The button widens smoothly
  and the × turns in; turned off, it's exactly as wide as before.
- **Picking is about one element.** While the inspector is on, the other annotation
  and feedback markers are hidden, also in annotation mode. Once a comment is sent, the
  popover and the inspector close, its pin and the rail's count update right away (new
  `refreshComments()` on the context), and "Feedback sent." is announced. A failed send
  keeps everything open with the form's error.
- **Feedback stays on its element.** A new comment is stored as a selector from the
  nearest id, test id or annotation id (`#activiteit > div:nth-of-type(2)`), not as a
  path from the root. When the markup changes underneath it, the comment's label finds
  the element again. Older comments keep working and get the same fallback.
- **Inside an annotated component, the precise element.** Clicking the amount in an
  annotated card gives feedback on the amount. The card itself (its edge, or ↑) still
  opens the annotation and its thread.
- **Inter and Geist Mono, bundled.** Orbit's interface is set in Inter and its mono
  text (element labels) in Geist Mono on every site, not only where the project loads
  them. They're Latin woff2 files inlined in `dist`: Inter variable with every weight
  (~48 KB), Geist Mono regular (~10 KB). There's no request to a font service. They're
  declared as `"Orbit Inter"` and `"Orbit Geist Mono"` so they never collide with a
  project's own fonts. The licences (OFL) are in `THIRD-PARTY-NOTICES.md`.

## 4.4.0

- **A screenshot with every comment.** When feedback is sent, Orbit takes a screenshot of
  the app: its own interface hidden, cropped to what the viewer saw, the element outlined
  in blue. The comments API gets it as `screenshot` (a JPEG data URL), and the new server
  helper `buildNotionCommentChildren()` uploads it to Notion and returns the image block
  for the page's body (`children`). The dev API and the route `orbit-init` writes do this
  already.
- **Nothing to install.** Orbit renders it with html-to-image (MIT), bundled into `dist`
  and loaded only when feedback is sent; `package.json` still has no dependencies. It
  rebuilds the page from the DOM, so there is no browser prompt, and a scrolled page comes
  out as scrolled, without the frame's rounded corners. Cross-origin images without CORS
  headers, iframes and video stay blank.
- **`comments.screenshot`** is `false` to turn it off, or a function to render with a
  library of the project's own (`ScreenshotCapture`).
- **Nothing stops the feedback.** A render that fails, a route that answers 413 to the
  larger body (Orbit sends again without it), or an upload Notion refuses: the comment
  lands, without a screenshot.

> **Optional, for a route of your own (from `orbit-init` or the Vercel example).** To get
> the screenshot in Notion, add `screenshot` to what the POST reads, and pass
> `children: await buildNotionCommentChildren({ annotationId, comment, screenshot }, NOTION_API_KEY)`
> next to `properties`. Without it the route works as before.

## 4.3.0

> **Action needed in projects set up with `orbit-init` (3.0 and up).** Updating Orbit is
> not enough. In the project's own `api/comments` file, replace `'AnnotationId'` with
> `'Annotatie ID'`, then deploy. Until then, a comment or annotation opened on the page
> shows no thread. Placing feedback, the panel and the rail's counter keep working, and no
> feedback is lost. This works on 3.x as well; no upgrade is needed for it.

- **The Varianten button stays on the rail.** Passing `variants` is the opt-in: the
  button is on every page, in the same place, where it used to show only on a page with
  variants that apply there. On a page with none, the pane holds one line, "Hier valt
  niets te wisselen.", without tabs, hint or footer, and the focus lands on its close.
- **`orbit-init` writes `Annotatie ID`**, and its route answers 502 with Notion's message
  when Notion refuses a query or a page, as the dev API now does for a page too.
- **The Vercel example uses the server helpers.** It wrote `Project` as text and `Status` as
  a status, sorted on an `Aangemaakt` column the schema does not have, and answered 400
  to the overlay's poll without `annotationId`. It now builds and parses with
  `@strakzat/orbit/server`, like the route `orbit-init` writes.
- **`orbit-feedback init --check` checks the title column.** It has to be called `Naam`:
  a database with Notion's default `Name` refused every comment.
- **`orbit-feedback fetch` reads long comments whole.** Notion splits a long text into
  runs; the comment, the reply and the other text columns were read from the first only.
- **The dev API finds a comment's thread.** `annotationsDevApi()` filtered `?annotationId=`
  on a column called `AnnotationId`; the column is `Annotatie ID`, the name the server
  helpers write and read. Notion refused the query, so a comment opened from the panel showed
  no thread. A refused query now answers 502 with Notion's message.
- **The README's GET handler shows the filter**, column name included, for projects that
  write their own comments API.

## 4.2.1

- **The profile pane without a title.** The close floats in the top right; the pane's name
  stays as its `aria-label`.
- **Name fields kept away from password managers.** The profile's and the comment form's
  name fields carry `NO_AUTOFILL`: `autocomplete="off"` plus the ignore attributes of
  1Password, LastPass, Bitwarden and Dashlane. It is a name for feedback, not a login.

## 4.2.0

A profile on the rail, and Orbit in English.

- **The viewer on the rail.** At the right end, a monogram once there is a name, a profile
  icon until then. It opens a small pane with the name feedback goes out under and the
  language. The comment form shows "Als Elwin" instead of the name field once the name is
  set; a press on it brings the field back. The name the form used to keep is taken over.
  The pane opens on a large monogram, centred, with the name typed straight in under it.
  Opening it closes everything else: the panel, a popover, the inspector and the variants.
- **Dutch and English.** `language="en"` on the provider sets where Orbit starts; the
  viewer's choice goes over it. Both are kept in `localStorage` (`@strakzat/orbit:viewer`).
  Every text the components had in Dutch is a label now, relative times included
  ("3u" / "3h"). Dates stay "15 Apr 2026" in both.
- **`useOrbitLanguage()`** for a project's own content: build your variants from it and they
  follow the switch. Annotations and feedback are not translated.
- **`labels` per language.** Flat overrides go for every language, as before; keyed by
  language (`{ nl: {…}, en: {…} }`) each follows the switch. `LABELS` is exported.
- `AnnotationLabels` has new keys (the former inline texts, the profile with
  `profileNamePlaceholder`, the time units, `status`); a few are templates with `{count}`,
  `{name}`, `{label}` or `{title}`. `AnnotationContextValue` has `language`, `viewer`,
  `setViewerName` and `setViewerLanguage`. A full labels object or a typed context mock
  needs them.
- `relativeTime(iso, units)` takes its units from the labels.

## 4.1.1

- **`useVariant` starts from the stored value.** It started on its default and read the
  tab and the link in a layout effect, so the first render of a component had the
  default. An effect from that render still ran: a redirect that depends on a variant
  sent the page away and back again, without end. Now the first render has the stored
  value; only a server render still starts on the default.

## 4.1.0

The variants pane grows from two controls into a settings pane for prototypes.

- **More kinds of variant.** Next to `choice` and `switch`: `multi` (checkboxes),
  `range` (a slider, with `format`) and `action` (a button that runs something). Every
  variant takes a `hint`; options can be `disabled`.
- **A `choice` picks its own control.** Segments while every option fits an equal
  share of the pill, measured rather than counted, so three long labels become radios;
  a native select from 7 options. `display: "segments" | "radios" | "select"` forces one.
  A stretched segment now centres its label, and the pane is as wide as the panel.
- **`defaultValue`, and Standaard herstellen.** The Varianten button carries a dot while
  a variant on the page is off its default.
- **`useVariant(id, default)`** keeps a value for the tab and reads it from a link;
  *Link kopiëren* writes the variants it keeps onto the address (`?orbit.<id>=…`).
- **Feedback carries its variants.** `Comment.varianten`, a line each, shown under the
  comment. `buildNotionCommentProperties` writes it to a `Varianten` text column only
  when there are any; add that column to the Notion database once a project has
  variants. The Vite dev API sends the comment without them if the column is missing,
  and `orbit-feedback init --check` mentions it.
- **The pane has a title, and tabs.** "Varianten" with a close button on top, then
  *Deze pagina* and *Alle pagina's* (was the heading *Overal*) as tabs with a count and
  a line on what each holds, as the annotations panel has them. Only the list scrolls.
- `AnnotationLabels` has `variantsThisPageHint`, `variantsEverywhereHint`,
  `variantsEmpty`, `variantsClose`, `variantsReset`, `variantsCopyLink`, `variantsLinkCopied`,
  `variantsChanged`, `variantsNone`, `variantsOn` and `variantsOff`; `AnnotationContextValue` has `registerVariants`
  and `describeVariants`. A full labels object or a typed context mock needs them.

## 4.0.0

Orbit sits in a rail under the project now, in the studio's Radial look, instead of
floating over it. First built in praktijkdata-app, then moved here.

### Breaking

- **`OrbitShell` replaces `AnnotationButton` and the floating inspector button.** Wrap
  the app: `<AnnotationProvider …><OrbitShell>{app}</OrbitShell></AnnotationProvider>`.
  The shell renders the rail and the panel; remove `<AnnotationButton />`,
  `<AnnotationPanel />` and any `<Inspector />` from the layout. `AnnotationButton` is
  no longer exported.
- **The app scrolls in the shell's frame, not the window.** A site that depends on the
  window's scroll passes `frame={false}`: the rail is then laid over the foot of the
  window and the page is left as it was.
- **Dark by default, in Radial's colours**, whatever the OS. `data-orbit-theme="light"`
  on `<html>` still turns it light (Geist's light values, as before).
  `prefers-color-scheme` is no longer followed. Inter comes first in the font stack.
- **The panel no longer drags.** It stays bottom right above the rail.
  `settings.togglePosition`, `PanelCorner` and `panelCorner` / `setPanelCorner` on the
  context are gone, and the stored corner is no longer read.
- **`labels.panelTitle`** defaults to "Annotaties en feedback" (was "Annotaties &
  Feedback"); it is also the rail button's label.
- **Size the app's root to `100%`, not `100vh`.** In the frame, `100vh` is the rail's
  height (48px) taller than the room it has.
- **Types grew required members.** `AnnotationLabels` has `placeFeedback`, `variants`,
  `variantsThisPage`, `variantsEverywhere` and `rail`; `AnnotationContextValue` has
  `commentsLoading` and `commentsError`. A full labels object or a typed context mock
  needs them. `labels` itself stays partial on the provider.
- **`Inspector` and `AnnotationPanel` are still exported, but nothing opens them without
  the shell**: the inspector's toggle and the panel's button are on the rail.
- **CSS**: the `.orbit-fab*` classes, `.orbit-panel__grip` and `--orbit-z-inspector-toggle`
  are gone; `--orbit-radius-2xl` is 16px (was 12px); every dark value changed. An
  override of a dark token may need a second look.

### Added

- **`OrbitShell`**, the frame and the rail: Feedback plaatsen (the inspector) and
  Annotaties en feedback (the panel) with the open count on the page.
- **`variants`**, opt-in: a project's own variants and switches in a pane on the rail's
  left, under Deze pagina (`pages(route)`) and Overal. Controlled values; Orbit keeps
  nothing.
- **`useOrbitFrame()`**, the frame element, for the project's own portals.
- **`ORBIT_UI_ATTR`**, for a project's own element that belongs to Orbit's interface:
  the inspector lets a click there through.
- **New labels**: `placeFeedback`, `variants`, `variantsThisPage`, `variantsEverywhere`,
  `rail`. **New tokens**: `--orbit-bg-chrome`, `--orbit-glass-*`, `--orbit-shadow-pane`,
  `--orbit-rail-height`, `--orbit-frame-bg`.

### Changed

- **One comments poller, always on.** The provider fetches the list once for the rail, the
  panel and the markers (`commentsLoading` and `commentsError` on the context), where the
  button, the panel and the provider each polled before. It now runs whenever comments
  are on, for the rail's count, every 30 seconds; a hidden tab skips its turn. After a
  failure it tries again two minutes on, where it used to stop for the whole visit.
- **The panel opens on Feedback** when the project has no annotations.
- The panel, the popovers, tabs, filters, fields and the send button take Radial's look:
  glass panes, items on a pill with the current one on the chip, a near-white primary.

### Fixed

- `orbit-init` no longer adds a second `<Inspector />`: the provider already mounts it.

## 3.2.0

### Changed

- **The bot does the change at a developer's scale, not the smallest edit.** The
  Claude prompt now allows a new component, a modal or multiple files, and only
  skips genuinely non-code points (compliment, question) or a target it cannot
  locate. A point needing a new dependency stays a skip-with-reason
  (`package.json` / lockfiles are never touched). `--max-turns` raised to 120.

### Added

- **Caveats.** On an assumption about approach, scope or place the bot makes the
  change anyway and records a `Kanttekening: <reason>` line in the commit body.
  `orbit-feedback pr-body` reads those and renders a "Kanttekeningen" section, so
  every consumer gets them without workflow glue.
- **Stale-claim self-healing.** Both workflows call `status --stale 6h` at the
  start, releasing `In behandeling` points older than the cutoff back to `Open`,
  so a cancelled or hard-killed run's leaked claims recover on their own. The
  on-failure release is kept.

### Fixed

- **The feedback branch is never cleaned up.** The process workflow pushes with
  `--force-with-lease` (with a fetched baseline) so a stale same-day branch is
  overwritten safely, and the sync workflow deletes the branch when its PR merges.
- **Partial / max-turns runs.** Commits are counted in their own step gated on
  `!cancelled()`, so commits from a failed Claude step still become a PR; only
  actually-committed points go to `In review`, the rest back to `Open`.

## 3.1.1

### Fixed

`orbit-feedback init` templates, from bugs hit on a fresh setup in a Next.js
client project:

- **`npm ci` 401/403.** Both workflows only set `NODE_AUTH_TOKEN`, so a project
  `.npmrc` that authenticates `npm.pkg.github.com` via `${NPM_TOKEN}` got an empty
  token. The install step now also sets `NPM_TOKEN`. Documented that `GITHUB_TOKEN`
  only works when the repo has read access to the package (package "Manage Actions
  access" / Internal visibility); otherwise `ORBIT_NPM_TOKEN` (a PAT with
  `read:packages`) is required.
- **`git push` "Invalid username or token".** `anthropics/claude-code-action`
  mints its own GitHub App token via OIDC and revokes it when its step ends, so
  the following push failed. The action is now passed an explicit `github_token`.
- **`gh pr create` "label 'orbit-feedback' not found".** The label is now created
  idempotently (`gh label create ... --force`) before the PR is opened.
- **`gh pr create` "GitHub Actions is not permitted to create or approve pull
  requests".** Documented the required "Allow GitHub Actions to create and approve
  pull requests" setting (or `ORBIT_GH_TOKEN`); `init --check` now verifies it via
  `repos/{owner}/{repo}/actions/permissions/workflow`.
- **Re-run on the same day.** A leftover `feedback/<date>` branch from a failed
  run blocked the push; it is now pushed with `--force-with-lease` on that
  bot-owned branch.
- **Every point skipped.** When Claude changes nothing, the branch has no commits
  and "No commits between main and feedback/<date>" failed the run. The step now
  counts commits against the default branch first; with zero it skips the push and
  PR and releases every point back to `Open` with its skip reason as the answer.
- **Unreadable skip reasons.** `claude-code-action` hides its output, so `.orbit/`
  (manifest, results, PR body) is now uploaded as a run artifact
  (`actions/upload-artifact@v4`, `if: always()`, `include-hidden-files: true`,
  14-day retention).
- **`orbit-feedback sync` "ambiguous argument 'main..HEAD'".** A CI checkout of
  the feedback branch has no local base branch, only `origin/main`. The base is
  now resolved to `origin/<base>` (from the PR body's `base=` marker) before the
  `git log` range, with a regression test covering a checkout that lacks a local
  base branch.

## 3.1.0

### Added

- **Feedback → PR automation.** An `orbit-feedback` CLI (`fetch` / `status` /
  `pr-body` / `sync` / `init`) that turns client feedback in Notion into a
  reviewable pull request: one branch per run, one commit per feedback point,
  and a PR checklist where reviewers reject a point by unchecking it (its commit
  is reverted and the point goes to `Afgewezen`; on merge checked points go to
  `Opgelost`). Runs from a GitHub Action (scheduled + manual) or a local Claude
  Code skill; `orbit-feedback init` scaffolds both into a consuming project.
- Builds on the existing Notion schema — `Project` relation (`NOTION_PROJECT_ID`)
  and `Status` select — adding the statuses `In review` / `Afgewezen` and reading
  `Component` / `Bron` / `PR` when present.

This release is additive: the annotation/feedback library and its API are
unchanged, so upgrading from 3.0.x only adds the new CLI.

## 3.0.0

- Rebrand to Orbit (`@strakzat/orbit`) and a UI rebuild in a Geist/Vercel style,
  with inline styles replaced by a prefixed stylesheet and design tokens.
