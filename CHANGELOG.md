# Changelog

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
