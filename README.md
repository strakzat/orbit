# Orbit

`@strakzat/orbit` — central annotation & feedback engine. One package, many projects.

Orbit does three things, and you can adopt them one at a time:

1. **An in-app overlay** clients use on a staging build — annotations you write for
   them, and a feedback Inspector where they click any element and leave a comment.
2. **A comments API** (on Vercel, or the built-in Vite dev plugin locally) that
   stores those comments in a Notion database.
3. **A feedback → PR automation** (a GitHub Action) that, daily or on demand, turns
   the open Notion feedback into a branch with one commit per point and a pull
   request with a checklist you review, tweak and merge.

## How the feedback loop works

```
Client clicks an element on staging, leaves a comment
        │
        ▼
Comments API (Vercel / Vite dev plugin)  ──►  Notion "Feedback" database  (status: Open)
        │
        ▼
GitHub Action "Orbit feedback"  (weekdays 18:00, or Run workflow)
   • claims the open points (status: In behandeling)
   • AI makes one commit per point on a feedback/<date> branch
   • opens a PR with a checklist                            (status: In review)
        │
        ▼
You review the PR
   • uncheck a point  ──►  its commit is reverted           (status: Afgewezen)
   • merge            ──►  checked points kept               (status: Opgelost)
```

Every point is tied to its commit by a `Orbit-Feedback: <notion-page-id>` trailer,
so unchecking a box in the PR body maps back to exactly one commit and one Notion
row.

---

## Environment variables — where each one goes

The three parts run in three places, so the same Notion values are set in more than
one spot. Nothing here is optional unless marked.

**Vercel** (the comments API deployment) — Project → Settings → Environment Variables:

| Variable | What it is |
|---|---|
| `NOTION_API_KEY` | Secret of a Notion internal integration (starts with `ntn_`) |
| `NOTION_DATABASE_ID` | The Feedback database's id (32 chars from its URL) |
| `NOTION_PROJECT_ID` | The project's page id in your Projects database (the relation target) |

**GitHub Actions** (the client repo) — Settings → Secrets and variables → Actions → **Secrets**:

| Secret | What it is |
|---|---|
| `NOTION_API_KEY` | Same value as in Vercel |
| `NOTION_DATABASE_ID` | Same value as in Vercel |
| `NOTION_PROJECT_ID` | Same value as in Vercel |
| `CLAUDE_CODE_OAUTH_TOKEN` | From `claude setup-token` — lets the Action run Claude on your subscription |
| `ORBIT_GH_TOKEN` | *Optional.* A PAT (repo scope). Needed if the repo can't create PRs with the default token, or if you want CI to run on the feedback PR |
| `ORBIT_NPM_TOKEN` | *Optional.* A PAT with `read:packages`. Needed only if the repo can't read the `@strakzat/orbit` package with its default token |

**Local development** (the client app) — a `.env` in the project root, read by the
Vite dev plugin so feedback works without deploying the API:

```dotenv
NOTION_API_KEY=ntn_...
NOTION_DATABASE_ID=...
NOTION_PROJECT_ID=...
```

Two GitHub **repository settings** also matter for the automation (not env vars):

- **Package read access** — set the `@strakzat/orbit` package to **Internal**
  visibility, or add the repo under the package's **Manage Actions access**, so the
  Action's token may install it. (Otherwise use `ORBIT_NPM_TOKEN`.)
- **PR creation** — enable **Allow GitHub Actions to create and approve pull
  requests** under Settings → Actions → General → Workflow permissions. (Otherwise
  use `ORBIT_GH_TOKEN`.)

---

## Install

### 1. Install the package

```bash
npm install @strakzat/orbit
```

The package lives on GitHub Packages, so your project's `.npmrc` needs:

```
@strakzat:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NPM_TOKEN}
```

Set `NPM_TOKEN` in your shell (and, for CI, as the `ORBIT_NPM_TOKEN` secret) to a
GitHub PAT with at least `read:packages`.

### 2. Add the overlay to the app

```bash
npx orbit-init
```

This finds your root layout, adds the imports and wraps it in `<AnnotationProvider>`
and `<OrbitShell>`: the app on top, the rail under it with Orbit's controls. It's idempotent. See
[Manual setup](#manual-setup) if you'd rather wire it up yourself, and enable the
feedback Inspector by passing a `comments` config (below).

### 3. Create the Notion database and integration

- Create (or reuse) a **Feedback** database with the [schema below](#notion-schema).
  `Project` is a **relation** to your Projects database.
- Create a Notion **internal integration** (notion.so/my-integrations) and copy its
  secret — this is `NOTION_API_KEY`.
- **Share both databases** with that integration (the Feedback DB *and* the Projects
  DB it relates to) via each database's ••• → Connections. Without access to the
  Projects DB, Notion hides the `Project` relation from the API.

### 4. Deploy the comments API

The widget POSTs comments to `/api/comments` and reads them back with GET. Build that
endpoint with the server helpers and deploy it (e.g. on Vercel), setting the three
Notion variables there:

```ts
import { buildNotionCommentProperties, parseNotionComment } from "@strakzat/orbit/server";
```

See [Server helpers](#server-helpers-for-the-comments-api) for the full handler. For
local development you don't need the deployed API — add the Vite dev plugin instead:

```ts
// vite.config.ts
import { annotationsDevApi } from "@strakzat/orbit/vite";
export default defineConfig({ plugins: [annotationsDevApi(), react()] });
```

It serves `/api/comments` from your `.env` during `vite dev`.

Point the overlay at the API and enable the Inspector:

```tsx
<AnnotationProvider
  annotations={annotations}
  currentRoute={pathname}
  comments={{
    enabled: true,
    apiBase: "",                       // same-origin; or your Vercel URL
    project: import.meta.env.VITE_NOTION_PROJECT_ID,
  }}
>
```

### 5. Set up the feedback → PR automation

In the client repo:

```bash
npx orbit-feedback init
```

This copies two GitHub workflows and a Claude Code skill into the project. Then:

1. Add the GitHub **secrets** from the table above (`NOTION_*`,
   `CLAUDE_CODE_OAUTH_TOKEN`, and the optional PATs).
2. Enable the two repo **settings** (package access, PR creation).
3. Verify everything:

   ```bash
   npx orbit-feedback init --check
   ```

   This checks the Notion schema (properties and statuses) and whether GitHub
   Actions is allowed to open PRs, and tells you exactly what's missing.

The scheduled run fires on weekdays at 18:00 Amsterdam time; start it by hand from
the Actions tab ("Orbit feedback" → Run workflow). The `orbit-feedback` label is
created automatically on the first run.

---

## Notion schema

The Feedback database needs these properties (Dutch names, exactly):

| Property | Type | Holds |
|---|---|---|
| `Naam` | Title | Auto-filled summary |
| `Project` | **Relation** | Link to the Projects database (keyed by `NOTION_PROJECT_ID`) |
| `Annotatie ID` | Text | CSS path or annotation id of the element |
| `Comment` | Text | The client's comment |
| `Auteur` | Text | Client name |
| `Status` | Select | `Open`, `In behandeling`, `In review`, `Opgelost`, `Afgewezen` |
| `Pagina` | Text | The page/route the comment is on |
| `Label` | Text | Tag + text of the element |
| `Component` | Text | React component name (when available) |
| `Bron` | Text | `file:line` of the element (when available) |
| `Antwoord` | Text | Reply shown back to the client |
| `PR` | URL | Link to the feedback PR |
| `Varianten` | Text | The variants the feedback was given in, a line each. Only needed once the project has variants: without the column Notion refuses a comment that carries them |

`npx orbit-feedback init --check` validates all of this.

---

## The automation in detail

- **Scale.** The bot addresses each point the way a developer would — a new
  component, a modal, multiple files — not the smallest possible edit. Everything
  lands as a reviewable, revertable PR, so it can be eager.
- **Caveats.** When it makes an assumption about approach, scope or place, it makes
  the change anyway and records a `Kanttekening:` line in the commit body. These are
  collected into a **Kanttekeningen** section at the bottom of the PR.
- **Skips.** It only skips genuinely non-code points (a compliment, a question) or a
  target it truly can't locate; a point needing a new dependency is skipped with a
  reason (it never touches `package.json` or lockfiles). Skip reasons are written
  back to Notion as the answer, and every run uploads its `.orbit/` folder (manifest,
  results, PR body) as a run artifact so you can read them — the AI step hides its
  own output.
- **No changes.** If every point is skipped, no PR is opened and each point is
  released back to `Open` with its reason.
- **Cleanup & self-healing.** A merged PR's `feedback/<date>` branch is deleted, and
  a cancelled run's claims recover: both workflows release `In behandeling` points
  older than six hours back to `Open` at the start of the next run.

### Run it locally

```bash
# with NOTION_API_KEY, NOTION_DATABASE_ID and NOTION_PROJECT_ID set
/orbit-feedback
```

Reject a point outside the PR flow:

```bash
npx orbit-feedback sync --pr 42 && git push
```

### CLI

| Command | Does |
|---------|------|
| `orbit-feedback fetch` | Pulls open feedback → `.orbit/feedback.json` (`--claim` sets In behandeling) |
| `orbit-feedback status` | Updates Notion status (`--set`, `--pr`, `--antwoord`, `--stale <hours>`) |
| `orbit-feedback pr-body` | Builds the PR checklist (and Kanttekeningen) from the manifest + git trailers |
| `orbit-feedback sync` | Handles check/uncheck: revert + status update |
| `orbit-feedback init` | Copies skill + workflows (`--check` validates schema and PR permission) |

> **Source capture** (sending the React component name and source file with a
> comment, so the AI maps feedback to code more precisely) is a planned follow-up;
> the AI currently falls back to the label, page and element path.

---

## Manual setup

### 1. Provider + shell in your root layout

```tsx
import { AnnotationProvider, OrbitShell } from "@strakzat/orbit";
import { useLocation } from "react-router-dom";
import { annotations } from "@/annotations/data";

export default function RootLayout() {
  const { pathname } = useLocation();

  return (
    <AnnotationProvider annotations={annotations} currentRoute={pathname}>
      <OrbitShell>
        <Outlet />
      </OrbitShell>
    </AnnotationProvider>
  );
}
```

`OrbitShell` puts the app in a frame on top and the rail behind it, on black, in the
studio's Radial look. The app scrolls in the frame: size its root with `100%`, not
`100vh` or `h-screen`, or it runs 48px under the rail. **Feedback plaatsen** (the inspector) and **Annotaties en
feedback** (the panel, bottom right above it). It renders the panel itself.

**The app's own popups.** Fixed elements inside the frame stay in it. Dialogs,
popovers and toasts that portal to `document.body` would cover the rail; point them
at the frame:

```tsx
import { useOrbitFrame } from "@strakzat/orbit";
import { UNSAFE_PortalProvider } from "react-aria"; // or Radix's `container`, a createPortal target

function Portals({ children }) {
  const frame = useOrbitFrame();
  return <UNSAFE_PortalProvider getContainer={() => frame}>{children}</UNSAFE_PortalProvider>;
}
```

**A site that scrolls the window** (scroll effects, a sticky header on `window`):
`<OrbitShell frame={false}>` lays the rail over the foot of the window and leaves the
page as it was.

**Variants (opt-in).** A prototype that compares variants passes them; the rail then
gets **Varianten** on the left: a pane titled Varianten with two tabs, *Deze pagina*
for what changes the current page and *Alle pagina's* for the rest:

```tsx
const [tasks, setTasks] = useVariant("tasks", "a"); // kept by Orbit, and on a shared link
const [rows, setRows] = useVariant("rows", 12);

const variants: OrbitVariant[] = [
  {
    type: "choice",
    id: "tasks",
    title: "Variant Taken",
    hint: "Waar de taken staan.",
    options: [{ id: "a", label: "In Berichten" }, { id: "b", label: "Los" }],
    value: tasks,
    defaultValue: "a",
    onChange: setTasks,
    pages: (route) => route.startsWith("/taken"), // left out: under Alle pagina's
  },
  { type: "multi", id: "mods", title: "Modules", options, value: mods, onChange: setMods },
  { type: "switch", id: "empty", title: "Lege staat", value: empty, onChange: setEmpty },
  { type: "range", id: "rows", title: "Berichten", min: 0, max: 200, value: rows, onChange: setRows,
    format: (n) => `${n} berichten` },
  { type: "action", id: "toast", title: "Toon een melding", onRun: () => toast("Opgeslagen") },
];

<OrbitShell variants={variants}>…</OrbitShell>
```

| Type | Drawn as | For |
|---|---|---|
| `choice` | Segments while every option fits its equal share of the pill, radios when one does not, a select from 7 options. `display` forces one | One of a few |
| `multi` | Checkboxes | Any number at once |
| `switch` | A switch | One thing on or off |
| `range` | A slider, its value (`format`) beside the title | How many, how long |
| `action` | A button, held while a returned promise runs | Something the prototype does |

Every variant takes a `hint`; an option of a `choice` or `multi` can be `disabled`.

- **`defaultValue`** makes a variant resettable: *Standaard herstellen* puts every variant
  on the page back, and the Varianten button carries a dot while one is off its default.
- **`useVariant(id, default)`** keeps the value for the tab (through reloads and page
  changes) and reads it from a link: *Link kopiëren* writes those variants onto the
  address as `?orbit.<id>=<value>`, and Orbit takes them off again once read. Without
  `useVariant` the values stay the project's alone and there is no link button.
- **Feedback carries the variants.** A comment sent while there are variants gets them
  as `varianten`, a line each (`Rol: Administratie`), shown under the comment and saved
  in Notion's `Varianten` column.

Without `variants` there is no Varianten button. Elements of your own that belong to
Orbit's interface, rather than the page, carry `ORBIT_UI_ATTR` so the inspector lets a
click on them through.

### 2. Annotations data in your project

```ts
// src/annotations/data.ts
import type { Annotation } from "@strakzat/orbit";

export const annotations: Annotation[] = [
  {
    id: "1",
    target: "dashboard",
    title: "Welcome to the dashboard",
    body: "Here you'll find an overview of all the relevant data.",
    author: "Elwin",
    date: "2026-03-30",
    type: "info",
  },
  {
    id: "2",
    target: "dashboard/orders",
    elementId: "order-table",
    title: "New column: status",
    body: "We added a status column so you can see at a glance where each order stands.",
    author: "Jasper",
    date: "2026-03-31",
    type: "new",
  },
];
```

### 3. AnnotationMarker on elements

```tsx
import { AnnotationMarker } from "@strakzat/orbit";

function OrderTable() {
  return (
    <AnnotationMarker annotationId="2" position="top-right">
      <table>{/* ... */}</table>
    </AnnotationMarker>
  );
}
```

### 4. Context stack for dialogs/panels

```tsx
import { useAnnotations } from "@strakzat/orbit";

function ConversationDialog() {
  const { pushContext, popContext } = useAnnotations();

  useEffect(() => {
    pushContext("dialog:conversation");
    return () => popContext();
  }, [pushContext, popContext]);

  return <div>{/* dialog content */}</div>;
}
```

### 5. Add annotation IDs automatically

Run the scanner to find UI elements and add `data-annotation-id` attributes automatically:

```bash
npx orbit-scan
```

This scans your `src/` folder for navigation, tables, forms, cards, modals, etc. and offers to add stable IDs. The feedback inspector recognises these IDs automatically when users leave comments.

> **Tip:** after `orbit-init`, `orbit-scan` is the logical next step to label your UI elements.

### Server helpers for the comments API

The package exports server-side helpers for your Notion comments API:

```ts
import {
  buildNotionCommentProperties,
  parseNotionComment,
} from "@strakzat/orbit/server";
```

**POST handler**: builds all the Notion properties (including the `pagina` field):

```ts
const { annotationId, auteur, comment, pagina, label } = req.body;
const properties = buildNotionCommentProperties(
  { annotationId, auteur, comment, pagina, label },
  NOTION_PROJECT_ID
);

await fetch(`https://api.notion.com/v1/pages`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${NOTION_API_KEY}`,
    "Notion-Version": "2022-06-28",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    parent: { database_id: NOTION_DATABASE_ID },
    properties,
  }),
});
```

**GET handler**: filters on the project, and on the element when the overlay asks with
`?annotationId=` (it does when a comment's thread opens), then parses Notion pages into
Comment objects. The element's column is `Annotatie ID`:

```ts
const filter = {
  and: [
    { property: "Project", relation: { contains: NOTION_PROJECT_ID } },
    ...(annotationId ? [{ property: "Annotatie ID", rich_text: { equals: annotationId } }] : []),
  ],
};
const response = await fetch(`https://api.notion.com/v1/databases/${NOTION_DATABASE_ID}/query`, {
  method: "POST",
  headers,
  body: JSON.stringify({ filter }),
});
const data = await response.json();
const comments = data.results.map(parseNotionComment);
```

---

## Annotation types

| Type            | Colour  | Use                               |
|-----------------|---------|-----------------------------------|
| `documentation` | Grey    | Explanation and documentation     |
| `pro`           | Green   | A positive point, what works well |
| `question`      | Blue    | An open question or unclear point |
| `con`           | Red     | A negative point, a problem       |
| `suggestion`    | Purple  | A proposal or improvement         |
| `critical`      | Orange  | Urgent, needs fixing              |
| `user-insight`  | Pink    | An insight from user testing/feedback |

---

## Configuration

### Settings

```tsx
<AnnotationProvider
  annotations={data}
  currentRoute={pathname}
  settings={{
    defaultVisible: false,           // start with annotations on/off
    accentColor: "#1567a4",          // accent colour
    panelWidth: 420,                 // panel width in px
    panelHeight: 640,                // panel height in px, and the variants pane's
    zIndex: 9000,                    // base z-index
    keyboardShortcut: true,          // Cmd+. / Ctrl+. toggle
  }}
>
```

### Language and labels

Orbit speaks Dutch and English. `language` is where it starts; the viewer can switch in the
profile at the right end of the rail, where they also set the name their feedback goes out
under. Both are kept in `localStorage`.

```tsx
<AnnotationProvider annotations={data} currentRoute={pathname} language="en">
```

Only Orbit's own interface is translated. Annotations, feedback and your variants are your
content. To give your variants both languages, build them from `useOrbitLanguage()`:

```tsx
const en = useOrbitLanguage() === "en";
const variants = [{ type: "switch", id: "leeg", title: en ? "Empty state" : "Lege staat", … }];
```

`labels` overrides Orbit's texts: flat for every language, or keyed by language so each
follows the switch. A text in `{braces}` is a template (`"{count} open feedback"`).

```tsx
<AnnotationProvider
  annotations={data}
  currentRoute={pathname}
  labels={{ nl: { panelTitle: "Notities" }, en: { panelTitle: "Notes" } }}
>
```

---

## Route matching

Annotations are filtered by `target` against `currentRoute`:

- **Exact match**: `"dashboard/orders"` matches `/dashboard/orders`
- **Wildcards**: `"projects/:id/details"` matches `/projects/123/details`
- **Global**: `"global"` always matches, on every page
- **Context**: `"dialog:conversation"` matches when `pushContext("dialog:conversation")` is active

---

## Deploying an update

```bash
# In this package:
npm version patch   # bug fix
npm version minor   # new feature
npm version major   # breaking change
npm publish

# In each project:
npm update @strakzat/orbit
```
