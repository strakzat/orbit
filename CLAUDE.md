# Orbit (`@strakzat/orbit`)

Client-facing annotation & feedback engine voor alle projecten. React-based, zero runtime dependencies buiten React (html-to-image zit gebundeld in `dist`, zie De screenshot).

## Quick start (consuming project)

```tsx
import { AnnotationProvider, OrbitShell, AnnotationMarker } from "@strakzat/orbit";

<AnnotationProvider
  annotations={annotations}
  currentRoute={window.location.pathname}
  language="nl" /* optioneel; de kijker kan wisselen */
  comments={{ enabled: true, apiBase: "", project: "my-project" }}
>
  <OrbitShell variants={variants /* optioneel */}>
    {/* de app; wrap specifieke elementen: */}
    <AnnotationMarker annotationId="my-annotation-id">
      <MyComponent />
    </AnnotationMarker>
  </OrbitShell>
</AnnotationProvider>
```

## Architecture

### Core data flow

```
AnnotationProvider (context + state, één poller voor alle comments)
├── OrbitShell              — de app in een frame bovenop, de rail eronder op zwart
│   ├── OrbitRail           — Varianten (opt-in) links; Feedback plaatsen en Annotaties en feedback rechts
│   │   ├── VariantsPane    — de varianten van het project, onder een titel: tabs Deze pagina en Alle pagina's
│   │   └── ProfilePane     — de avatar rechts op de rail: naam en taal van de kijker
│   └── AnnotationPanel     — paneel rechtsonder boven de rail; de tabs Annotaties / Feedback zijn de bovenste rij
├── Inspector               — element picker met spotlight voor feedback comments (de knop staat op de rail)
├── FeedbackMarkers         — floating badges op elementen met comments (niet gewrapt in AnnotationMarker)
├── AutoAnnotationMarkers   — floating badges op auto-discovered elementen met data-annotation-id
└── AnnotationMarker        — wrapper component voor specifieke elementen (inline badge + popover)
```

### Key types

```typescript
interface Annotation {
  id: string;              // Uniek ID, matcht met data-annotation-id in DOM
  target: string;          // Route pattern ("/", "/settings", "global") — supports :param wildcards
  elementId?: string;      // Optioneel: DOM element id of data-annotation-id om te highlighten
  title: string;
  body: string;
  author: string;
  date: string;
  type?: AnnotationType;   // "documentation" | "pro" | "question" | "con" | "suggestion" | "critical" | "user-insight"
}

interface Comment {
  id: string;
  auteur: string;          // Auteur naam
  comment: string;         // Feedback tekst
  status: "Open" | "In behandeling" | "Opgelost";
  antwoord: string | null; // Admin reply
  aangemaakt: string;      // ISO date
  pagina?: string;         // Route waar feedback is geplaatst (window.location.pathname)
  label?: string;          // Element label ("<button> Submit...")
  annotationId?: string;   // Element reference (data-annotation-id, id, of CSS selector path)
  varianten?: string;      // De varianten waarin de feedback is gegeven, een regel elk
  component?: string;      // Feedback op een component: z'n naam (data-orbit-component)
}

interface CommentsConfig {
  enabled: boolean;
  apiBase: string;         // Leeg string = window.location.origin
  project: string;         // Project identifier voor API calls
  screenshot?: boolean | ScreenshotCapture; // standaard aan (gebundelde html-to-image); false of eigen renderer
}
```

### AnnotationProvider props

| Prop | Type | Default | Beschrijving |
|------|------|---------|-------------|
| `annotations` | `Annotation[]` | required | Alle annotaties voor het project |
| `currentRoute` | `string` | `"/"` | Huidige route — nodig voor page filtering |
| `settings` | `AnnotationSettings` | zie defaults | UI instellingen |
| `labels` | `Partial<AnnotationLabels>` of `{ nl?, en? }` | per taal | UI teksten: plat voor elke taal, of per taal |
| `language` | `"nl" \| "en"` | `"nl"` | De taal waarin Orbit begint, tot de kijker kiest |
| `comments` | `CommentsConfig` | undefined | Feedback systeem config |

### Settings defaults

```typescript
{
  defaultVisible: false,
  accentColor: "#171717",
  panelWidth: 420,
  panelHeight: 640,         // ook de hoogte van het variantenpaneel
  zIndex: 9000,
  keyboardShortcut: true,   // Cmd+. / Ctrl+. (annotatiemodus), C (feedback plaatsen)
}
```

## File structure

Bestands- en mapnamen zijn `kebab-case`, componentnamen `PascalCase` — `AnnotationPanel` woont in `annotation-panel.tsx`.

```
src/
├── index.ts                          — Public exports
├── types.ts                          — Alle TypeScript types
├── constants.ts                      — Defaults, type-iconen (géén kleuren)
├── labels.ts                         — LABELS per taal (nl, en), fill() voor {templates}, resolveLabels()
├── icons.ts                          — Inline SVG iconen via één createIcon() factory
├── vite.ts                           — Vite plugin: annotationsDevApi() voor local dev API
├── styles/
│   ├── font.ts                        — Inter en Geist Mono als @font-face, gebundeld (fonts/*.woff2)
│   ├── tokens.ts                      — CSS-variabelen: light, dark, type- en statuskleuren
│   ├── rules.ts                       — Component-regels, reset eerst
│   ├── sheet.ts                       — Stelt de stylesheet samen
│   ├── inject.ts                      — useAnnotationStyles() + useInspectorCursor()
│   └── brand.ts                       — Luminantie: welke tekstkleur op de brandkleur past
├── context/
│   ├── frame-context.ts               — FrameContext + useOrbitFrame(): het frame voor de portals van het project
│   ├── annotation-context.tsx         — Provider: state, keyboard shortcuts, route tracking, runtime tokens
│   ├── use-annotations.ts             — Hook (throws als buiten provider)
│   ├── use-annotations-safe.ts        — Hook (geeft defaults terug als buiten provider)
│   └── use-orbit-language.ts          — useOrbitLanguage(): de taal, voor de content van het project
├── components/
│   ├── orbit-shell.tsx                — Het frame met de app en de rail eronder; rendert het paneel
│   ├── orbit-rail.tsx                 — De rail: Varianten, Feedback plaatsen, Annotaties en feedback
│   ├── variants-pane.tsx              — Het variantenpaneel: titel, tabs Deze pagina / Alle pagina's
│   ├── profile-pane.tsx               — Het profiel: naam voor feedback, taal
│   ├── annotation-panel.tsx           — Side panel: annotation list + feedback list + filters + search
│   ├── annotation-card.tsx            — Annotation card in panel
│   ├── annotation-marker.tsx          — Wrapper component: ring + badges + popover
│   ├── annotation-popover.tsx         — Gedeelde popover (marker, auto-marker én inspector)
│   ├── auto-annotation-markers.tsx    — Auto-discovers data-annotation-id elementen
│   ├── feedback-markers.tsx           — Floating feedback badges op elementen met comments
│   ├── inspector.tsx                  — Element picker: spotlight, ↑/↓ niveaus, click-to-comment
│   ├── comment-thread.tsx             — Comment lijst
│   ├── comment-card.tsx               — Eén comment (thread én panel-lijst)
│   ├── comment-form.tsx               — Feedback submit formulier
│   ├── component-chip.tsx             — Paarse chip: icoon + naam van een component
│   ├── marker-badge.tsx               — De ronde badge, één implementatie voor alle drie de plekken
│   ├── marker-geometry.ts             — Badge-afmetingen en hoekposities
│   ├── status-pill.tsx                — Comment-status
│   └── type-badge.tsx                 — Annotatietype
├── hooks/
│   ├── use-comments.ts                — Fetch + submit comments voor specifiek annotationId (polls 30s)
│   ├── use-variant.ts                 — useVariant(): een variant bewaard voor de tab en uit een link
│   ├── use-viewer.ts                  — Naam en taal van de kijker, in localStorage
│   └── use-all-comments.ts            — Fetch alle comments voor project (polls 30s)
└── utils/
    ├── cx.ts                          — Class names samenvoegen
    ├── format.ts                      — initials() + relativeTime() voor de comment-UI
    ├── element-id.ts                  — getLocator() selector vanaf een anker + getElementLabel() preview
    ├── pick-element.ts                — levelsFrom(): de elementen onder de cursor die de inspector aanbiedt
    ├── find-element.ts                — findElementByAnnotationId() 3-tier lookup + highlight overlays
    ├── popover-position.ts            — Smart popover positioning (fixed + absolute varianten)
    ├── route-matching.ts              — Route matching, breadcrumb en navigatie
    ├── variants.ts                    — Groepen, standaardwaarden, beschrijving en link-serialisatie van varianten
    ├── screenshot.ts                  — De screenshot bij feedback: vastleggen, bijsnijden, element omlijnen
    └── use-stable-id.ts               — DOM-id voor label/veld-koppeling (React 17-safe)
```

## Inspector element snap logic

Hover en klik geven hetzelfde antwoord (`utils/pick-element.ts`): wat oplicht, krijgt de feedback.

1. **Niveaus.** `levelsFrom(hit)` loopt vanaf het element onder de cursor omhoog en houdt alleen elementen die iemand zou aanwijzen: interactief (`button`, `a`, `input`, `[role]`, …), semantisch (`p`, `li`, `h1`–`h6`, `img`, `section`, …), met een `data-annotation-id`, `data-testid` of `id`, of met een eigen tekst of eigen box (achtergrond, rand, schaduw). Een `span` in een zin telt niet; containers die ≥90% van het frame vullen ook niet. Elementen met precies dezelfde box zijn één niveau, genoemd naar de sterkste (annotatie-id > component > test-id > id > interactief > semantisch).
2. **↑/↓** stappen tijdens hoveren door die niveaus; het label boven de ring toont het element en `1/3 ↑↓`. Bewegen zet hem terug op het binnenste.
3. **De locator** (`getLocator()` in `element-id.ts`): een element met een `data-annotation-id` of `id` is die id. Al het andere is een selector vanaf de dichtstbijzijnde naam erboven: `#activiteit > div:nth-of-type(2)`, `[data-annotation-id="2"] > p`, met `aria-label`, `name`, `role` of `type` vóór een positie.
4. **Terugvinden** (`findElementByAnnotationId(id, label?)`): `getElementById`, dan `[data-annotation-id]`, dan de selector. Met het `label` van de comment (tag + begin van de tekst, zonder Orbits eigen badges) wordt de selector gecontroleerd: leest het element daar anders, dan wint het ene element onder het anker dat nog zo leest. Zo overleeft feedback een rij erbij of een wrapper erom. Twee kandidaten is geen antwoord; dan blijft de selector staan.

**Eén element tegelijk.** Staat er een popover open, dan pakt een klik ernaast geen ander element: hij laat het gekozen element los, en de volgende klik kiest weer.

**De spotlight.** Zolang de inspector aanstaat, dimt een scrim (`--orbit-scrim`) het frame rond het opgelichte element, met een witte ring (`--orbit-spotlight-ring`). De scrim is de schaduw van een uitsparing, geknipt op het frame, dus de rail blijft licht. De popover komt naast het element (`getBesidePopoverStyle()`), erboven of eronder, en er alleen overheen als er nergens anders plek is.

**De knop zegt hoe je stopt.** Zolang de inspector aanstaat, groeit er rechts in Feedback plaatsen een × bij, met de tooltip "Stoppen (C of Esc)". `.orbit-rail__close` is altijd gerenderd: z'n kolom gaat van `minmax(0, 0fr)` naar `minmax(0, 1fr)`, zodat de knop vloeiend breder wordt in plaats van te springen, en de × draait erin (`opacity`, `transform`), 200 ms `--orbit-ease`. Dicht is hij precies zo breed als zonder ×.

**Tijdens het kiezen geen andere markers.** Zolang de inspector aanstaat, tonen `AnnotationMarker`, `AutoAnnotationMarkers` en `FeedbackMarkers` niets, ook in annotatiemodus: de spotlight gaat over het ene element waar de feedback op komt. Is de comment verstuurd, dan sluiten popover én inspector, haalt `refreshComments()` (op de context) de lijst meteen opnieuw op zodat pin en teller er direct zijn, en meldt de status-regio "Feedback geplaatst.". Mislukt het versturen, dan blijft alles open met de foutmelding van het formulier.

**Annotatie en feedback delen één id per component.** `AnnotationMarker` stempelt `data-annotation-id={annotationId}` op z'n wrapper, en wrapper en component hebben één box, dus het niveau van de kaart heet naar de annotatie. Kies je dat niveau (klik op de rand, of ↑ vanuit de inhoud), dan landt de feedback in dezelfde bak als de annotatie en toont de popover beide; `FeedbackMarkers` slaat geregistreerde marker-id's over. Klik je iets ín de kaart aan, het bedrag, dan krijgt dat element eigen feedback met een eigen pin, onder het anker van de annotatie.


## Feedback op een component

Een project markeert een component met `data-orbit-component="Sidebar"` (`COMPONENT_ATTR`). Orbit leest geen React-internals: op een preview (minified) heten componenten `e` en `t`.

- **De kijker kiest.** Zit het gekozen element in een component, dan toont de popover van de inspector de pil van het component (`ComponentHead`), daaronder het element in wit, en dan Instance / Component (een `radiogroup` in Radials pil, gewoon gestyled). Standaard is Instance. De spotlight blijft op de gekozen instance, ook bij Component: die is ook wat de screenshot omlijnt.
- **De pil boven de ring** begint met de pil van het component (`ComponentChip`) als het opgelichte element in een component zit, ook als het het component zelf is: een pil in de pil, vóór het element. `rank()` geeft `data-orbit-component` 45, tussen annotatie-id en test-id.
- **Opslag.** `annotationId` is de selector `[data-orbit-component="Sidebar"]` (`componentOf()` / `componentLocator()` in `element-id.ts`), `component` de naam, `pagina` de route waar hij geplaatst is (alleen als context). Het component is géén anker voor `getLocator()`: elke instance heeft dezelfde naam.
- **Waar hij staat.** `isOnPage()` (`route-matching.ts`) filtert paneel, railteller en pins: feedback op een component staat op elke pagina waar het component nu gerenderd is (`componentsOnPage`, bijgehouden door de provider met een `MutationObserver`, niet tijdens een render). Eén pin, op de eerste instance, paars (`orbit-marker--component`). Zonder het component op de pagina is er geen pin, ook niet geparkeerd: anders stond hij linksboven op elke pagina.
- **Notion.** `Component` (rich text, gemaakt door `orbit-feedback init`) wordt alleen geschreven als hij gezet is, net als `Varianten`. De Vite-plugin stuurt opnieuw zonder als de kolom ontbreekt.

## API endpoints (verwacht door consuming project)

```
GET  {apiBase}/api/comments?project={project}                         → Comment[]
GET  {apiBase}/api/comments?project={project}&annotationId={id}       → Comment[]
POST {apiBase}/api/comments  body: { project, annotationId, auteur, comment, pagina, label, varianten?, component?, screenshot? }
```

Als `apiBase` leeg is, wordt `window.location.origin` gebruikt.

## Page filtering & counters

- **Annotations**: gefilterd op `matchRoute(annotation.target, currentRoute)` — supports `:param` wildcards
- **Feedback**: gefilterd op `comment.pagina === currentRoute || !comment.pagina`
- **Panel sub-tabs**: "Deze pagina" vs "Alles" — gedeelde tab tussen annotations en feedback views
- **Panel-header**: geen aparte titelbalk. De twee tabs en de sluitknop delen één rij; het paneel sleept niet, het blijft boven de knop op de rail die het opent. Een project zonder annotaties opent op Feedback. `labels.panelTitle` is nog steeds de `aria-label` van het paneel, maar staat niet meer als tekst boven twee tabs die al Annotaties en Feedback heten.
- **Losse annotaties krijgen tóch een marker.** Heeft een annotatie geen element op de pagina — `target: "global"`, of het element is nu niet gerenderd — dan parkeert `AutoAnnotationMarkers` de badge in een kolom linksboven (`unplacedBadgeRect()` in `marker-geometry.ts`), met een streepjesrand als teken dat hij nergens aan hangt. De popover opent daar. Zonder dat waren die annotaties alleen in het paneel te lezen.
- **Een annotatiekaart selecteert, hij klapt niet uit.** Klikken zet `activeAnnotationId`, waardoor de popover van die annotatie op de pagina opent — daar staat de volledige body. De kaart blijft op twee regels afgekapt: hij is een lijstingang, geen tweede kopie van de annotatie. Nog eens klikken sluit de popover.
  - Zit het element op deze pagina, dan wordt er ook naartoe gescrold en gehighlight.
  - Staat de annotatie op een andere route (tab "Alles"), dan navigeert de klik daar eerst heen; `activeAnnotationId` blijft staan, dus de popover opent zodra de marker daar rendert.
- **Een feedbackkaart werkt hetzelfde.** Klikken opent de thread als popover op de pagina, naast het element waar de feedback op zit. `FeedbackMarkers` rendert die popover; de kaart in het paneel blijft afgekapt (comment 3 regels, antwoord 2).
- **Losse feedback wordt ook geparkeerd.** Is het element van een comment verdwenen, dan krijgt de badge een plek in dezelfde kolom linksboven, onder de losse annotaties. `marker-placement.ts` bepaalt de volgorde, zodat `AutoAnnotationMarkers` en `FeedbackMarkers` niet in hetzelfde vakje tekenen.
- **Beide tabs tellen hetzelfde soort ding**: annotaties op deze pagina, en niet-opgeloste feedback op deze pagina.
- **Teller op de rail** (Annotaties en feedback): `currentAnnotations.length + openFeedbackCount` (page-gefilterd)
- **Feedback tab badge**: toont count van niet-opgeloste feedback op huidige pagina

## Server helpers (voor consuming projects)

Het package exporteert server-side helpers via `@strakzat/orbit/server` voor gebruik in API routes. **Gebruik deze altijd** bij het bouwen van een comments API — ze garanderen dat alle velden (inclusief `pagina`) correct worden opgeslagen.

```typescript
import { buildNotionCommentChildren, buildNotionCommentProperties, parseNotionComment } from "@strakzat/orbit/server";

// POST handler — bouwt alle Notion properties inclusief Pagina, en de body: de screenshot
const properties = buildNotionCommentProperties(
  { annotationId, auteur, comment, pagina, label },
  NOTION_PROJECT_ID
);
const children = await buildNotionCommentChildren({ annotationId, comment, screenshot }, NOTION_API_KEY);
await fetch(`https://api.notion.com/v1/pages`, {
  method: "POST",
  headers: { Authorization: `Bearer ${NOTION_API_KEY}`, "Notion-Version": "2022-06-28", "Content-Type": "application/json" },
  body: JSON.stringify({ parent: { database_id: NOTION_DATABASE_ID }, properties, children }),
});

// GET handler — parsed Notion page → Comment object
const comments = data.results.map(parseNotionComment);
```

**De screenshot.** Elke nieuwe comment krijgt een screenshot mee: de app zonder Orbit erop (`data-orbit-capturing` op `<html>` verbergt elke `.orbit-root`), bijgesneden tot wat de kijker zag, het element blauw omlijnd (`utils/screenshot.ts`). Orbit rendert hem met html-to-image, gebundeld (devDependency, door tsup ingelijfd; de licentie staat in `THIRD-PARTY-NOTICES.md`) en via een dynamische `import()` pas geladen als er feedback verstuurd wordt: in ESM een eigen chunk. html-to-image bouwt de pagina na uit de DOM, dus geen prompt van de browser; wat hij niet na kan bouwen (cross-origin beelden zonder CORS, iframes, video) blijft leeg. `comments.screenshot: false` zet het uit; een functie (`ScreenshotCapture`) rendert met een library van het project. De renderer krijgt `target`, de scroll-container van het frame (of `document.body` zonder frame), en `options` (`width`, `height`, `style`) die hem op volle hoogte neerleggen, want een kopie van de DOM vergeet waar hij gescrold stond; Orbit snijdt het zichtbare stuk eruit. Zo blijven ook de ronde hoeken van het frame buiten beeld. Transparante delen krijgen de eerste achtergrond eronder. Een JPEG van maximaal 1600px breed, als data-URL in de POST. `buildNotionCommentChildren` uploadt hem via Notions File Upload API en geeft een image-blok voor `children`. Niets hiervan houdt de feedback tegen: een fout, een 413 van de route (dan opnieuw zonder) of een mislukte upload, en de comment gaat zonder screenshot.

`varianten` gaat alleen naar Notion als de comment varianten heeft: een database zonder kolom `Varianten` blijft werken voor een project zonder varianten. Heeft het project ze wél, dan moet de kolom (tekst) bestaan, anders weigert Notion de pagina. De Vite-plugin vangt dat op door zonder varianten opnieuw te sturen.

## Vite plugin (voor local dev)

Vite serveert geen Vercel serverless functions, dus `/api/comments` geeft een 404 tijdens local dev. Het package biedt een Vite plugin die de API middleware inline afhandelt:

```typescript
import { annotationsDevApi } from "@strakzat/orbit/vite";

export default defineConfig({
  plugins: [annotationsDevApi(), react()],
});
```

De plugin laadt `.env` uit de project root en waarschuwt als `NOTION_API_KEY`, `NOTION_DATABASE_ID` of `NOTION_PROJECT_ID` ontbreekt.

## Build & publish

```bash
npm run build     # tsup → dist/ (ESM + CJS + DTS)
npm version patch # bump version
npm publish       # publishes to GitHub Packages (npm.pkg.github.com)
```

Output: `dist/index.js` (CJS), `dist/index.mjs` (ESM), `dist/index.d.ts` (types). Client entry krijgt `"use client";` banner voor Next.js compatibiliteit. Server entry (`dist/server.*`) en Vite entry (`dist/vite.*`) hebben geen banner.

## Theming

Het package injecteert één stylesheet in `document.head` (`<style data-orbit-styles>`), de eerste keer dat een component mount. De consumer importeert niets. Alles is geprefixt met `orbit-`: elke class, elke variabele, elk data-attribuut.

### Waarom een stylesheet en niet inline styles

Zonder stylesheet bestaan `:focus-visible`, `:hover` en `prefers-reduced-motion` niet. Die ontbraken daardoor volledig — op twee plekken was de focus-outline zelfs actief weggehaald. Dat is de reden dat de ~880 regels inline `React.CSSProperties` vervangen zijn door classes.

Inline styles blijven alléén voor runtime-metingen: de positie van een popover, de rect van een gemarkeerd element, de door de gebruiker ingestelde `panelWidth`. `npm run check:tokens` faalt op alles daarbuiten.

### Isolatie

De module draait in de app van een klant, dus de CSS gaat twee kanten op lekken als je niet oppast. Drie maatregelen:

1. Elke selector draagt `orbit-`.
2. Elk element dat wij renderen draagt óók `.orbit-root`, en er is een reset op `.orbit-root, .orbit-root *`. Die weegt zwaarder dan een kale `button {}` of `* {}` uit de host.
3. De reset staat als eerste in de sheet, zodat de componentregels erna winnen bij gelijke specificiteit.

**Uitzondering:** `.orbit-marker-wrap` in `annotation-marker.tsx` draagt bewust géén `orbit-root`, want dat element omsluit de componenten van de klant zelf. De reset zou hun styling slopen.

Wat er nog wél doorheen komt: een host-regel met `!important`. Alleen `box-sizing` is daartegen verdedigd (met `!important`), omdat `content-box` elke breedte in de module kapotmaakt. Een geforceerd `font-family` komt er doorheen — cosmetisch, geen structurele schade.

### Dark mode

Orbit is altijd donker, wat het OS of het project ook doet: het is de chrome van de studio rond een project, niet het project, zoals de site van Radial. Licht is een keuze van het project:

```js
document.documentElement.setAttribute("data-orbit-theme", "light");
```

De attribuutnaam is geëxporteerd als `THEME_ATTR`.

### De shell, het frame en de popups van het project

`OrbitShell` zet de app in `.orbit-frame`: `flex: 1`, eigen scroll, onderhoeken afgerond, en `transform: translateZ(0)`, waardoor het frame het containing block wordt van elk `position: fixed` element erin. De vaste lagen van het project (een toast-stapel, een sidepanel) blijven zo vanzelf boven de rail. Wat het project naar `document.body` portalt, ontsnapt wel: `useOrbitFrame()` geeft het frame-element, om de portal-container van het project naar te wijzen (react-aria `UNSAFE_PortalProvider`, Radix `container`, een `createPortal`-doel). Orbit kent de UI-library van het project niet, dus dat ene stuk blijft van het project.

`frame={false}` is voor een site die op de scroll van het venster leunt: de rail ligt dan `position: fixed` over de voet van het venster en de pagina blijft zoals ze was.

### Varianten

`variants` op `OrbitShell` is opt-in: zonder is er geen knop. Mét staat de knop op elke pagina op dezelfde plek, ook waar de lijst leeg is of niets ervan geldt; het paneel toont dan alleen "Hier valt niets te wisselen.", zonder tabs, regel of voet, en is niet hoger dan die regel. Het paneel heeft een titel (Varianten, ook z'n `aria-labelledby`) met een sluitknop, en daaronder twee tabs zoals het annotatiepaneel: **Deze pagina** en **Alle pagina's**, met een telling en een regel die zegt wat erin staat. Niet "Alles" zoals in het annotatiepaneel: daar betekent het "ook van andere pagina's", hier "geldt op elke pagina". Met `pages(route)` staat een variant onder Deze pagina op de routes die hij verandert, zonder onder Alle pagina's. Het paneel opent op Deze pagina als die varianten heeft, anders op Alle pagina's, en kiest opnieuw na een routewissel. Alleen de lijst scrolt; titel, tabs en voet blijven staan. De waarden zijn van het project (controlled: `value` en `onChange`). Een wijziging wordt voorgelezen via de live region van de rail. Het paneel is zo hoog en breed als het annotatiepaneel (`panelHeight`, `panelWidth`). De besturing is die van Radial, nagebouwd in CSS — Radials componenten zelf leunen op react-aria en Untitled UI, en die dependencies neemt Orbit niet.

- **`choice`** — één van een paar. Zonder `display` kiest Orbit: segmenten (Radials pil, `radiogroup` met pijltjes, `disabled` wordt overgeslagen) zolang elke optie in een gelijk deel van de pil past, anders radio's, vanaf 7 opties een native `<select>`. Dat passen wordt *gemeten*, niet geteld: een onzichtbare kopie van de pil (`.orbit-probe`, een grid met `1fr`-kolommen op `max-content`, dus elke kolom zo breed als de breedste) wordt tegen de beschikbare breedte gehouden, met een `ResizeObserver`, in een layout effect zodat er niets flitst.
- **`multi`** — checkboxes. **`switch`** — één ding aan of uit; een losse checkbox bestaat bewust niet, want alles in dit paneel werkt meteen, en dat zegt een switch. **`range`** — native slider, `format` voor de waarde naast de titel. **`action`** — een knop, die wacht op een teruggegeven promise.
- Radio's en checkboxes zijn native inputs, onzichtbaar over hun eigen merkteken: klik, toetsenbord en groep komen van de browser.
- **`defaultValue`** maakt een variant herstelbaar (Standaard herstellen, onderaan) en geeft de Varianten-knop een stip zolang er op deze pagina een variant van z'n standaard af staat.
- **`useVariant(id, default)`** is de enige plek waar Orbit iets bewaart: in `sessionStorage` voor de tab, en uit een link (`?orbit.<id>=…`, gelezen bij de eerste hook en dan van het adres gehaald). Link kopiëren schrijft alleen de varianten die zo bewaard worden, en alleen als ze van hun standaard af staan.
- **Feedback krijgt de varianten mee.** `OrbitShell` registreert z'n varianten bij de provider (een ref, geen state); `useComments` stuurt bij een POST `varianten` mee: de varianten op deze pagina, een regel elk (`Rol: Administratie`). `CommentCard` toont ze onder de comment.

### Taal en naam

Rechts op de rail staat de kijker: een monogram zodra er een naam is, anders een profielicoon. Het opent een klein paneel (niet-modale `dialog`, zoals Varianten) met de naam en de taal: Nederlands of English, met de segmenten van een `choice`. Geen titel: de sluitknop zweeft rechtsboven (`labels.profileTitle` is de `aria-label`). Bovenin staat het monogram groot en gecentreerd als voorbeeld, met de naam eronder: direct te typen, zonder veldstijl (placeholder "Je naam..."), de focus als een blauwe lijn eronder. De naamvelden (profiel én formulier) dragen `NO_AUTOFILL`: `autocomplete="off"` plus de negeer-attributen van 1Password, LastPass, Bitwarden en Dashlane — het is een naam voor feedback, geen login. Openen sluit al het andere: paneel, popover, inspector en Varianten — elk apart, want de inspector kan aanstaan zonder annotatiemodus.

- **De naam is voor feedback.** Eén keer gezet, gaat elke comment eronder uit; het formulier toont dan "Als Elwin" in plaats van het naamveld, en een klik daarop geeft het veld terug. Zonder naam staat het veld er zoals altijd, en wat je typt wordt het profiel. Annotaties komen uit de data van het project, die schrijft Orbit niet.
- **De taal is van de kijker.** `language` op de provider is waar Orbit begint; de keuze van de kijker gaat erboven. Naam en taal staan in `localStorage` (`@strakzat/orbit:viewer`), voor elk project op dezelfde origin; de oude sleutel van het formulier (`commentAuteur`) wordt één keer overgenomen. Gelezen na mount, zodat server-HTML en de eerste client-render gelijk zijn.
- **Orbit vertaalt alleen zichzelf.** Annotaties, feedback en de varianten zijn van het project. Wil een project z'n varianten in beide talen, dan bouwt het ze uit `useOrbitLanguage()`, en ze volgen de wissel. De `varianten` op een comment zijn de tekst die de kijker zag, in de taal van dat moment.
- **Labels per taal.** `LABELS.nl` en `LABELS.en` in `labels.ts`; een overschrijving is plat (voor elke taal) of per taal (`{ nl: {…}, en: {…} }`). Een tekst met `{count}`, `{name}`, `{label}` of `{title}` is een template, gevuld met `fill()`. Er staat geen Nederlandse tekst meer los in een component.
- Datums blijven "15 Apr 2026" in beide talen: vaste maandnamen, hetzelfde in elke browser-locale.
- Rail, paneel, panes en popovers dragen `lang`, zodat een schermlezer Engels als Engels uitspreekt.

### CSS-variabelen — publieke API

Overschrijf ze op `:root` of op een ancestor. Hernoemen is breaking, dus dat gebeurt met een major bump.

| Groep | Tokens |
|---|---|
| Achtergrond | `--orbit-bg-primary`, `-primary_hover`, `-secondary`, `-secondary_hover`, `-tertiary`, `-quaternary`, `-disabled` |
| Tekst | `--orbit-text-primary`, `-secondary`, `-tertiary`, `-quaternary`, `-disabled` |
| Rand | `--orbit-border-primary`, `-secondary`, `--orbit-border-input` |
| Popover | `POPOVER_MAX_HEIGHT` in `marker-geometry.ts`; `popover-position.ts` klemt dat af op de ruimte die er werkelijk is |
| Focus | `--orbit-outline-focus-ring` |
| Brand | `--orbit-brand` en de afgeleiden `--orbit-bg-brand-solid`, `-solid_hover`, `--orbit-bg-brand-primary`, `--orbit-border-brand`, `--orbit-text-brand-secondary`, `--orbit-text-primary_on-brand` |
| Status | `--orbit-bg-{error,warning,success}-primary`, `--orbit-border-{…}`, `--orbit-text-{…}-primary` |
| Feedback | `--orbit-bg-feedback`, `--orbit-border-feedback`, `--orbit-text-feedback`, `--orbit-bg-feedback-solid` |
| Overlay | `--orbit-overlay-fill`, `-fill-strong`, `--orbit-overlay-ring` |
| Spotlight | `--orbit-scrim`, `--orbit-spotlight-ring`, `--orbit-spotlight-glow`, `--orbit-spotlight-edge`, `--orbit-spotlight-tag`, `-tag-text` |
| Component | `--orbit-component`, `--orbit-component-glass`, `--orbit-component-glass-edge`, `--orbit-text-component_on-glass` — Figma's paars `#9747FF` als accent; chip, tag en pin zijn donkerpaars glas met lichte tekst, de naam in mono (in beide thema's, zoals de spotlight-tag). Bewust niet het paars van `suggestion` |
| Type | `--orbit-type-{documentation,pro,question,con,suggestion,critical,user-insight}-{bg,border,fg}` |
| Schaal | `--orbit-space-*`, `--orbit-radius-*`, `--orbit-text-*`, `--orbit-shadow-*`, `--orbit-font-body`, `--orbit-font-mono` |
| Motion | `--orbit-duration-fast`, `--orbit-duration`, `--orbit-duration-slow`, `--orbit-ease` |
| Stapeling | `--orbit-z-base` (uit `settings.zIndex`) plus vaste offsets |
| Chrome | `--orbit-bg-chrome`, `--orbit-glass-*` (film, chip, edge, pane, hairline, blur), `--orbit-shadow-pane`, `--orbit-rail-height`, `--orbit-frame-bg` |

De naamgeving volgt de semantische laag van Untitled UI (`bg-primary`, `text-tertiary`, `*_hover`, `*_on-brand`), zodat het vocabulaire hetzelfde is als in onze Tailwind-projecten. De donkere *waarden*, de standaard, zijn die van Radial (strakzat/radial): de neutrale ladder van de site, glas als een paar procent wit met een belichte bovenrand (`--orbit-glass-*`), een bijna-witte primaire knop en Radials blauwe focusring. Een paneel dat over het project opent is Radials chrome-glas met een dichte tint (88%), zodat lichte tekst boven een witte pagina 4.5:1 houdt. De lichte waarden zijn nog die van Geist. Beide lettertypes zitten gebundeld (`styles/font.ts`), zodat Orbit op elke site hetzelfde oogt: Inter, zoals Radial, als variabel font (gewicht 100–900 in één woff2, Latin, ~48 KB), en Geist Mono voor mono (Latin, gewicht 400, ~10 KB). tsup lijft ze in als data-URL (`loader` in `tsup.config.ts`), als `@font-face` vooraan in de sheet. De familienamen zijn `"Orbit Inter"` en `"Orbit Geist Mono"`, zodat ze nooit botsen met een `Inter` of `Geist Mono` van het project; daarna volgen die van het project en het systeem. Geen Google Fonts: dat zou op elke klantsite een verzoek naar Google doen (AVG) en strandt op een strikte CSP. Satoshi kan niet: de ITF Free Font License verbiedt herdistributie via een publieke repo of package. De licenties (OFL) staan in `THIRD-PARTY-NOTICES.md`. Tailwind zelf zit hier niet in: dat zou elke consumer een buildstap opleggen.

**`accentColor` tint, hij kleurt de primaire knop niet.** Eén kleur in `settings.accentColor` voedt `--orbit-brand`; daaruit worden de stille brand-tokens afgeleid met `color-mix()` — de subtiele vulling, de rand, de secundaire tekst. De solide brandknop (`--orbit-bg-brand-solid`) is bewust *niet* van de accent afgeleid: hij is een theme-aware constante — bijna-zwart in licht, bijna-wit in donker, Vercels omgekeerde primaire knop — zodat hij in beide thema's leesbaar blijft wat een consumer ook instelt. `onBrandTextColor()` blijft geëxporteerd voor wie zelf een brandknop bouwt.

### Wat bewust anders is

- **Geen JSX.** `React.createElement()` overal. Het package hoeft geen JSX transform en werkt in elke bundler.
- **Geen `@/`-alias.** `meridian:component-conventions` schrijft absolute imports voor, maar dit is een gepubliceerd package dat door tsup gebundeld wordt en één niveau diep is. Relatieve imports blijven.
- **Geen `@strakzat/eslint-config-ui`.** Die leest alleen `className`-literals en `clsx`/`cn`-argumenten; op dit package zou hij groen draaien zonder iets te zien. `npm run check:tokens` doet het equivalente werk voor hoe dit package geschreven is.
- **Geen ARIA-tablist in het paneel.** De twee views zijn toggle-knoppen met `aria-pressed`. Een `role="tablist"` belooft pijltjesnavigatie die we niet implementeren.

## Accessibility

- Elk interactief element heeft een zichtbare `:focus-visible` outline van 2px in `--orbit-outline-focus-ring` — Radials blauw `#3A81FC` in donker.
- De rail is een `toolbar`: één tabstop, pijltjes, Home en End tussen de knoppen. Het variantenpaneel is een niet-modale `dialog`: openen zet de focus op de eerste keuze, Escape sluit en geeft de focus terug aan Varianten, klikken ernaast sluit.
- Content-grijstinten blijven ≥ 4.5:1 op `bg-primary`. In donker, de standaard, is `--orbit-text-quaternary` `#9AA4B2` (ongeveer 7:1 op `#121926`) — die tint draagt echte inhoud (auteurs, datums, breadcrumbs) en moet door WCAG 1.4.3. `--orbit-text-disabled` (`#697586`) is bewust decoratief. In licht zijn het `#737373` (4.74:1) en `#A1A1A1`.
- **Uitzondering:** `--orbit-border-input` is een hairline (`#4B5565` in donker, `#E0E0E0` in licht) en haalt de 3:1 van WCAG 1.4.11 niet op zichzelf; velden dragen daarom ook Radials belichte rand (`--orbit-glass-field-edge`), en de focusring draagt de last. Overschrijf de token om de rand te verzwaren.
- Elk veld heeft een `<label>`; visueel verborgen met `.orbit-sr-only` waar het ontwerp er geen ruimte voor heeft.
- Kaarten met twee acties gebruiken een uitgerekte overlay-knop plus een link erboven, want een `<button>` mag geen `<button>` bevatten.
- Escape sluit paneel, popover en inspector, en geeft de focus terug aan de knop die ze opende.
- **C** zet Feedback plaatsen aan en weer uit (`aria-keyshortcuts="C"`, tooltip "Feedback plaatsen (C)"), achter `settings.keyboardShortcut` zoals Cmd/Ctrl + `.`. Een kale letter, dus hij doet niets als hij iets anders betekent: typen in een veld of `contenteditable` (van het project of van Orbit), een modifier erbij, een ingedrukt gehouden toets, een IME die componeert, of een pagina die de toets al zelf afhandelde (`defaultPrevented`).
- `prefers-reduced-motion: reduce` zet alle transities en animaties in de module op 0,01ms.
- Iconen zijn `aria-hidden`; de knop eromheen draagt de naam.

## Code patterns

- Alle components gebruiken `React.createElement()` — geen JSX.
- Geen externe dependencies buiten de React peer dep. Wat Orbit van buiten gebruikt (html-to-image, en de lettertypes Inter en Geist Mono) zit gebundeld in `dist`, met de licenties in `THIRD-PARTY-NOTICES.md`.
- `useAnnotationsSafe()` geeft safe defaults wanneer buiten AnnotationProvider — voorkomt crashes bij optioneel gebruik.
- `useAnnotationStyles()` staat in élk geëxporteerd component, niet alleen in de provider, omdat `useAnnotationsSafe()` gebruik buiten de provider toestaat. Een refcount zorgt dat de sheet één keer bestaat.
- Het paneel staat vast rechtsonder boven de rail. In localStorage staat alleen de kijker: naam en taal.
- Comments worden door de provider gepolled, één keer voor alles, elke 30 seconden zolang comments aanstaan — ook als het paneel dicht is, voor de teller op de rail. Een verborgen tab slaat over; na een fout wordt het twee minuten later opnieuw geprobeerd.

## Checks

```bash
npm run check        # typecheck + check:tokens
npm run check:tokens # geen ruwe kleur, geen styling terug in een inline style object
npm run build        # tsup → dist/
```
