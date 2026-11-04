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
│   │   ├── ProfilePane     — de avatar rechts op de rail: naam, taal en pins van de kijker
│   │   └── OrbitTour       — de rondleiding: eenmalig per kijker, op voorbeelddata
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
  defaultVisible: true,     // de pins tonen, tot de kijker kiest
  accentColor: "#171717",
  panelWidth: 420,
  panelHeight: 640,         // ook de hoogte van het variantenpaneel
  zIndex: 9000,
  keyboardShortcut: true,   // Cmd+. / Ctrl+. (pins tonen/verbergen), C (feedback plaatsen), Shift+R (opgeloste pins)
  tour: true,               // de rondleiding start één keer vanzelf; terugkijken kan altijd in het profiel
}
```

## File structure

Bestands- en mapnamen zijn `kebab-case`, componentnamen `PascalCase` — `AnnotationPanel` woont in `annotation-panel.tsx`.

```
src/
├── index.ts                          — Public exports
├── types.ts                          — Alle TypeScript types
├── constants.ts                      — Defaults, type-iconen (géén kleuren)
├── version.ts                        — ORBIT_VERSION: door de build gezet uit package.json
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
│   ├── orbit-tour.tsx                 — De rondleiding: kaart, scrim, focus; de stappen zetten het toneel
│   ├── tour-stars.tsx                 — De sterren van de tour: het canvas, het veld rond de kaart, de boot (uit)
│   ├── tour-corona.ts                 — De sterren die loslaten van wat een stap aanwijst
│   ├── annotation-panel.tsx           — Side panel: annotation list + feedback list + filters + search
│   ├── annotation-card.tsx            — Annotation card in panel
│   ├── annotation-marker.tsx          — Wrapper component: ring + badges + popover
│   ├── annotation-popover.tsx         — Gedeelde popover (marker, auto-marker én inspector); ThreadSections
│   ├── thread-page.tsx                — Een thread als pagina van het paneel, met Terug
│   ├── auto-annotation-markers.tsx    — Auto-discovers data-annotation-id elementen
│   ├── feedback-markers.tsx           — Floating feedback badges op elementen met comments
│   ├── inspector.tsx                  — Element picker: spotlight, ↑/↓ niveaus, click-to-comment
│   ├── spotlight.tsx                  — De spotlight: scrim, witte ring, pil; voor de inspector én het paneel
│   ├── comment-thread.tsx             — Comment lijst
│   ├── comment-card.tsx               — Eén comment (thread én panel-lijst)
│   ├── comment-form.tsx               — De composer: één regel met verstuurknop, groeit met de tekst
│   ├── component-chip.tsx             — Paarse chip: icoon + naam van een component
│   ├── marker-badge.tsx               — De pin, één implementatie voor alle drie de plekken
│   ├── marker-geometry.ts             — Pin-afmetingen, de vorm (cirkel met staart) en waar hij staat
│   ├── status-pill.tsx                — Comment-status
│   └── type-badge.tsx                 — Annotatietype
├── hooks/
│   ├── use-comments.ts                — Fetch + submit comments voor specifiek annotationId (polls 30s)
│   ├── use-variant.ts                 — useVariant(): een variant bewaard voor de tab en uit een link
│   ├── use-viewer.ts                  — Naam, taal en pins van de kijker, in localStorage
│   ├── use-seen.ts                    — Wat de kijker per thread gelezen heeft, in localStorage
│   ├── use-own-comments.ts            — De comments die deze browser schreef, met hun delete-token
│   ├── use-pin-morph.ts               — De popover van een pin groeit uit die pin, en terug
│   └── use-all-comments.ts            — Fetch alle comments voor project (polls 30s)
└── utils/
    ├── cx.ts                          — Class names samenvoegen
    ├── format.ts                      — initials() + relativeTime() voor de comment-UI
    ├── tour.ts                        — Stappen, voorbeelddata, ankers en de plek van de kaart
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

**De spotlight.** Zolang de inspector aanstaat, dimt een scrim (`--orbit-scrim`) het frame rond het opgelichte element, met een witte ring (`--orbit-spotlight-ring`). De scrim is de schaduw van een uitsparing, geknipt op het frame, dus de rail blijft licht. Een schaduw met spread rondt z'n buitenhoeken af met die spread, dus de spread is 200vmax (groter dan elke diagonaal; 100vmax liet de verste hoek van het frame open), en de uitsparing blijft dicht bij het frame (`scrimHole()`), ook als het element ver uit beeld gescrold is. Na een klik komt er geen popover maar een tekstballon (`CommentBubble`, `.orbit-bubble`): alleen de comment, geen annotatie, thread of sluitknop. De pil boven de ring blijft staan en zegt waar de comment over gaat. Geen plek erboven, dan staat hij onder de ring; ook daar geen plek (een hoog element, of een dat uit beeld gescrold is), dan in de ring, bovenaan wat zichtbaar is (`spotlightTag()`). De ballon bedekt hem nooit: hij hangt aan de ring plus de pil (`spotlightAnchor()`), dus onder de pil als die onder de ring staat, en boven de pil als de ballon boven het element moet.

**De ballon.** Hij hangt onder de ring, z'n linkerbovenhoek recht op de hoek van de ring, de andere hoeken rond: een berichtballon. Past hij er niet onder, dan erboven (de rechte hoek gaat dan linksonder, `.orbit-bubble--above`), en anders in de voet van het element (`getBubblePlacement()`, binnen het frame, dus nooit over de rail). Erin staat `CommentForm`, Figma's composer in onze stijl, een veld zoals de zoekbalk: geen focusring, de cursor zegt waar je typt. één regel met een ronde verstuurknop (↑) ernaast. Zodra er tekst is gaat hij open naar drie regels met de knop eronder rechts, en groeit hij mee tot 200px (de hoogte is een meting, inline). Enter verstuurt, Shift + Enter is een nieuwe regel. Geen andere acties: geen emoji, mentions of bijlagen. Escape of een klik ernaast laat het element los.

**De knop zegt hoe je stopt.** Zolang de inspector aanstaat, groeit er rechts in Feedback plaatsen een × bij, met de tooltip "Stoppen (C of Esc)". `.orbit-rail__close` is altijd gerenderd: z'n kolom gaat van `minmax(0, 0fr)` naar `minmax(0, 1fr)`, zodat de knop vloeiend breder wordt in plaats van te springen, en de × draait erin (`opacity`, `transform`), 200 ms `--orbit-ease`. Dicht is hij precies zo breed als zonder ×.

**Tijdens het kiezen geen andere markers.** Zolang de inspector aanstaat, tonen `AnnotationMarker`, `AutoAnnotationMarkers` en `FeedbackMarkers` niets, ook als de pins aanstaan: de spotlight gaat over het ene element waar de feedback op komt. Is de comment verstuurd, dan sluiten ballon én inspector, haalt `refreshComments()` (op de context) de lijst meteen opnieuw op zodat pin en teller er direct zijn, en meldt de status-regio "Feedback geplaatst.". Mislukt het versturen, dan blijft alles open met de tekst en de foutmelding in de ballon.

**Annotatie en feedback delen één id per component.** `AnnotationMarker` stempelt `data-annotation-id={annotationId}` op z'n wrapper, en wrapper en component hebben één box, dus het niveau van de kaart heet naar de annotatie. Kies je dat niveau (klik op de rand, of ↑ vanuit de inhoud), dan landt de feedback in dezelfde bak als de annotatie (de popover van de annotatie toont beide); `FeedbackMarkers` slaat geregistreerde marker-id's over. Klik je iets ín de kaart aan, het bedrag, dan krijgt dat element eigen feedback met een eigen pin, onder het anker van de annotatie.


## De rondleiding

Een kijker die hem nog niet zag, krijgt één keer een rondleiding door Orbit (niet door het project), ook op bestaande projecten na een update: `tourSeen` ontbreekt daar in `@strakzat/orbit:viewer`, dus niet gezien. Hij telt als gezien na Klaar of Overslaan, niet bij de start: een reload halverwege begint opnieuw. Zonder storage start hij niet, anders kwam hij bij elke load terug. `settings.tour: false` zet alleen de automatische start uit; "Rondleiding opnieuw bekijken" staat in het profiel. Alleen met `OrbitShell`: `OrbitRail` start en rendert hem, want die kent de varianten.

- **De stappen** (`tourSteps()`): welkom (naam en taal, `ViewerIdentity` en `LanguageChoice` uit het profiel; de naam alleen met comments), pins, feedback plaatsen (met comments), het paneel, Varianten (met `variants`), het profiel. De welkomstkaart telt niet mee in "1 van 5". Elke stap zet zelf het toneel: de inspector aan voor de oefening, het paneel open voor het paneel.
- **Voorbeelddata vervangt de echte data.** Zolang `tourStep` niet null is, geeft de provider `tourSample()` door als `allAnnotations`, `currentAnnotations` en `allComments`, dus pins, paneel, tellers en threads zijn de echte, zonder eigen UI. Niet gemengd: een voorbeeld is nooit met echte feedback te verwarren. `AnnotationMarker` toont dan geen pin (z'n annotatie is geen voorbeeld) en `registeredMarkerIds` is leeg, anders kreeg feedback op een wrapper geen pin. **Een oefencomment wordt nergens bewaard,** ook niet voor de rest van de tour: versturen telt alleen (`tourPractised`) en gaat door naar de volgende stap, en de status-regio zegt niet dat hij geplaatst is. Een antwoord in een voorbeeldthread blijft staan zolang die thread op de pagina is (`tourComments`) en verdwijnt zodra de pins-stap voorbij is. Het paneel opent in de tour op Annotaties, en staat erna weer op z'n gewone view.
- **Niets gaat de deur uit.** `useComments` is de enige plek die threads ophaalt of POST: in de tour leest hij uit de context en schrijft hij met `addTourComment()`, zonder fetch of screenshot. `useSeen` krijgt de echte comments en `markSeen` doet niets, dus er komt geen voorbeeld in `@strakzat/orbit:seen`. De poller loopt gewoon door. **Een nieuwe schrijfactie naar de API hoort achter dezelfde guard.**
- **Waar de voorbeelden staan.** `tourAnchors()` zoekt twee losse elementen van het project rond het midden van het frame, leest pas na de welkomstkaart (dan is de pagina er), en parkeert ze in de kolom linksboven als er niets is. De spotlight staat op het eerste; `[data-orbit-tour="pins"]` tilt de pins boven z'n scrim.
- **Modaal of niet.** Welkom, Varianten en het profiel zijn om te lezen: de scrim (`.orbit-tour__scrim`, zelfde vlak als de spotlight, de rail blijft licht) vangt de klikken, Tab blijft in de kaart, `aria-modal`. Pins en paneel zijn om te gebruiken, zonder dat het project reageert: bij de pins is de scrim doorzichtig en ligt hij onder de pins, bij het paneel dimt hij de pagina, want op wit verdwijnen de sterren rond het paneel. Bij de oefening is er geen scrim, want daar is de pagina van de picker; versturen gaat vanzelf door naar het paneel. Op de rail zijn knoppen `disabled`, behalve die van de oefening en het paneel. `C`, `Shift + R` en Cmd/Ctrl + `.` doen niets.
- **De welkomstkaart vraagt een naam.** Met comments aan staan Start en Rondleiding overslaan op `disabled` en doet Escape niets tot er een naam is (spaties tellen niet): feedback moet zeggen van wie hij komt. Zonder comments is er geen naamveld en geen drempel. Dit is geen garantie: de naam kan later leeg in het profiel, en zonder tour (`settings.tour: false`, geen storage) blijft `Anonymous` mogelijk.
- **De boot staat uit (`TOUR_BOOT` in `tour-stars.tsx`).** Af en getest, ook in Firefox, maar voor een kijker die een prototype komt reviewen te veel. `true` brengt alles terug. Dan begint de tour zwart, de rail ook (`.orbit-tour__black`, in de layout-effects van shell en rail, dus vóór de eerste paint; server-HTML is er wel eerst). De sterren trekken samen, en op dat moment (1,6 s) komen pagina en kaart samen op (800 ms), dus je laadt het prototype mee. De klok is de echte tijd: een trage machine laat frames vallen, niemand zit langer in het zwart. Met `prefers-reduced-motion` of zonder WebGL2 geen wachten. Zonder boot spreidt het veld zich zacht uit vanaf de kaart.
- **De corona** (`createCorona()` in `tour-corona.ts`) wijst per stap aan wat telt, naar Radials home-core: sterren die het element loslaat en die in een rechte lijn wegvaren, vervagend, elk op eigen tempo, naast wat het element zelf zegt: een railknop staat zoals hij aan staat in de echte rail (`.orbit-rail__item--on`), het element op de pins-stap in z'n spotlight. Een ring van sterren en een witte rand om de knop zijn geprobeerd en terug uit de code: dit is rustiger. Deze sterren glijden op hele pixels en staan op geen raster. Doel per stap: het sample-element, de railknop, en op de paneel-stap het paneel zelf, want dat staat recht boven z'n knop. Het doel wordt elk frame gevraagd, want het paneel opent na de stap. Het canvas ligt boven pagina en rail, onder paneel, thread en kaart. Met `prefers-reduced-motion` of zonder WebGL2 geen corona: die aan-stand wijst aan.
- **De sterren** (`TourStars`) zijn die van Radial, nagebouwd: één maat op Radials raster (7 px), scherp, in de kleuren van de prisma (`--orbit-star-*`), met stromen licht erdoorheen. Op een lichte pagina zijn ze subtiel, en dat is goed: een donkere halo eromheen las als een zware schaduw. In de boot (3 s) beweegt geen ster: een vorm wordt over het raster getekend met alleen opacity en kleur, een gekantelde schijf van drie armen die het hele venster vult, met de klok mee gebogen en met de klok mee draaiend, en steeds sneller invalt op het hart. Elke ster gaat aan op een eigen drempel als een arm hem bereikt, dus een arm is een dichtheid van sterren en geen band verf; de kleur loopt door de prisma en wordt wit op de top van een arm. Hij begint gekanteld en wordt rond terwijl hij samentrekt, dus de bal en z'n rimpels zijn cirkels. Samengetrokken is hij een bal (na 1,6 s, `GATHER`), en die blijft: niets loopt terug zoals het kwam, dat las als de animatie achteruit. Uit de bal gaat één zachte rimpel, een ring zoals Radials kern ze uitzendt, in Radials tempo (`1 - (1 - t)^3`), en de kaart komt op over de bal. **Het rustbeeld komt als laatste:** een tweede golf is niets anders dan dat rustbeeld dat zich uitspreidt, en hij dooft op de rand ervan, als de pagina op is. Los op het optrekkende zwart las het als een stil raster met een kaartvormig gat. Geen `three`, dat zou Orbit's bundel meer dan verdubbelen: één draw van punten op één canvas, zonder buffers (`gl_VertexID` is de ster), en na de boot is alleen de ring rond de kaart (240 px) nog licht. Het veld staat alleen op de welkomstkaart en trekt daarna terug in de kaart; het canvas tekent zolang de tour loopt, voor de corona. **Geen `pow()` zonder guard in de shader:** `pow()` van een negatief getal is ongedefinieerd, Chromium gaf 0 en Firefox (ook Zen) NaN, en dan brandde elke ster buiten de ring. Test een shader dus ook in Firefox. Versiering, dus hij wijkt: één stilstaand frame met `prefers-reduced-motion`, niets zonder WebGL2 of na een verloren context.
- **Overslaan staat alleen op de welkomstkaart.** Eenmaal onderweg is er geen knop meer, wel Escape.
- **Escape sluit het binnenste eerst**: een thread, de ballon, de picker, de focus in het paneel. Daarna slaat hij de tour over. Aan het eind staat de focus op de profielknop.
- **De kaart** (`tourCardPosition()`) staat boven z'n knop, links naast het paneel, in het midden (welkom) of linksonder in het frame (pins), altijd binnen het venster, gemeten vóór de eerste paint. Hij reist mee tussen stappen en is niet verborgen tot de meting, want hij moet de focus kunnen krijgen.

## Feedback op een component

Een project markeert een component met `data-orbit-component="Sidebar"` (`COMPONENT_ATTR`). Orbit leest geen React-internals: op een preview (minified) heten componenten `e` en `t`.

- **De kijker kiest.** Zit het gekozen element in een component, dan staat er in de ballon een kleine segmented control vóór de verstuurknop: ◇ Instance (`InstanceIcon`) en ❖ Component (`ComponentIcon`), alleen iconen (een `radiogroup` in Radials pil). Standaard is Instance, want feedback gaat meestal over dit ene exemplaar; daarom staat hij eerst. Elke optie heeft een tooltip (`.orbit-scope__tip`, `role="tooltip"` via `aria-describedby`): de naam en wat hij betekent (`scopeComponentHint`, `scopeInstanceHint`, met `{name}`). Hij verschijnt na 300 ms hover of meteen bij keyboard-focus, onder de ballon zodat hij het element niet bedekt (erboven als de ballon boven het element staat). Op één regel staat hij naast het veld, opengeklapt linksonder (`tools` op `CommentForm`). De spotlight blijft op de gekozen instance, ook bij Component: die is ook wat de screenshot omlijnt.
- **De pil boven de ring** begint met de pil van het component (`ComponentChip`) als het opgelichte element in een component zit, ook als het het component zelf is: een pil in de pil, vóór het element. `rank()` geeft `data-orbit-component` 45, tussen annotatie-id en test-id.
- **Opslag.** `annotationId` is de selector `[data-orbit-component="Sidebar"]` (`componentOf()` / `componentLocator()` in `element-id.ts`), `component` de naam, `pagina` de route waar hij geplaatst is (alleen als context). Het component is géén anker voor `getLocator()`: elke instance heeft dezelfde naam.
- **Waar hij staat.** `isOnPage()` (`route-matching.ts`) filtert paneel, railteller en pins: feedback op een component staat op elke pagina waar het component nu gerenderd is (`componentsOnPage`, bijgehouden door de provider met een `MutationObserver`, niet tijdens een render). Eén pin, op de eerste instance, grijs zoals alle feedback; het component staat in de popover (`ComponentHead`). Zonder het component op de pagina is er geen pin, ook niet geparkeerd: anders stond hij linksboven op elke pagina.
- **Notion.** `Component` (rich text, gemaakt door `orbit-feedback init`) wordt alleen geschreven als hij gezet is, net als `Varianten`. De Vite-plugin stuurt opnieuw zonder als de kolom ontbreekt.

## API endpoints (verwacht door consuming project)

```
GET  {apiBase}/api/comments?project={project}                         → Comment[]
GET  {apiBase}/api/comments?project={project}&annotationId={id}       → Comment[]
POST {apiBase}/api/comments  body: { project, annotationId, auteur, comment, pagina, label, varianten?, component?, screenshot? }  → Comment & { deleteToken }
DELETE {apiBase}/api/comments  body: { project, id, token }                                     → { id }
```

**Je eigen comment verwijderen.** De POST geeft een `deleteToken` terug: een HMAC van het page-id (`commentDeleteToken()`, met `ORBIT_SECRET` of anders de Notion-key), dus de server bewaart niets. De browser die schreef bewaart hem (`useOwnComments()`, `@strakzat/orbit:own`, per project); `isOwnComment`, `rememberOwnComment`, `deleteComment` en `deletedCommentIds` staan op de context. Alleen in een thread (`CommentThread`), niet in de lijst van het paneel: een prullenbak in de kop, zichtbaar bij hover of focus (altijd zonder hover), die eerst in de kaart vraagt (Annuleren krijgt de focus, Escape annuleert zonder de thread te sluiten). Verwijderd verdwijnt hij meteen overal (`deletedCommentIds` filtert de lijsten tot de API hem niet meer geeft), de focus blijft in de thread en de status-regio zegt "Comment verwijderd.". DELETE archiveert de Notion-page (30 dagen in de prullenbak). Niet op naam: een naam typt iedereen.

Als `apiBase` leeg is, wordt `window.location.origin` gebruikt.

## Page filtering & counters

- **Annotations**: gefilterd op `matchRoute(annotation.target, currentRoute)` — supports `:param` wildcards
- **Feedback**: gefilterd op `comment.pagina === currentRoute || !comment.pagina`
- **Panel sub-tabs**: "Deze pagina" vs "Alles" — gedeelde tab tussen annotations en feedback views
- **Panel-header**: geen aparte titelbalk. De twee tabs en de sluitknop delen één rij; het paneel sleept niet, het blijft boven de knop op de rail die het opent. Een project zonder annotaties opent op Feedback. `labels.panelTitle` is nog steeds de `aria-label` van het paneel, maar staat niet meer als tekst boven twee tabs die al Annotaties en Feedback heten.
- **De pins.** Een pin is glas zoals de component-chip: een donkere film (`--orbit-pin-glass`, 88%) getint met de tint van z'n soort, een rand in die tint en een lichte glyph, in beide thema's. Hangt hij aan een element, dan heeft hij een staart die naar het punt wijst: de punt 3px binnen de rechterbovenhoek, de pin erboven en rechts, de staart naar linksonder. Geen ruimte erboven of rechts (element bovenaan of aan de rand van het venster), dan draait hij (`pinOnCorner()` in `marker-geometry.ts`). De staart heeft een rechte hoek in de punt, maar reikt net niet tot de hoek van z'n box (17.8 van het midden, onder de 18.4 waar de zijden de cirkel alleen raken, de druppel): de zijden snijden de cirkel, met een kleine inkeping aan beide kanten. De vorm is een SVG-pad achter de glyph (`PIN_PATHS`), zodat staart en cirkel één doorschijnend vlak zijn, en de schaduw een `drop-shadow` die de staart volgt. Open is de pin onzichtbaar (`.orbit-marker--active`, `opacity: 0`, dus nog focusbaar): z'n thread ligt erop. Hij groeit bij hover vanuit z'n punt, met een pointer-cursor. Een feedbackpin is grijs, voor iedereen dezelfde (`--orbit-pin-feedback`, net als de avatar naast een comment; helemaal opgelost dezelfde pin op 50% opacity, heel onder de muis of met focus, en weg als de kijker dat kiest), en draagt de initialen van wie de thread begon (de auteur van de eerste comment, als `.orbit-avatar` naast een comment), zonder naam (`Anonymous`) het feedbackicoon; het aantal staat in z'n naam, niet op de pin. Feedback in de thread van een annotatie krijgt géén teller naast de pin; staat er iets in dat de kijker nog niet gelezen heeft (een comment, of een antwoord erop, niet van de kijker zelf), dan krijgt de pin een witte stip rechtsboven, zoals op Varianten, en z'n naam `labels.markerUnseen`. Gelezen is een thread zodra hij open is, als popover of als pagina van het paneel, ook wat er binnenkomt terwijl hij open is (`useSeen()`, `unseenAnnotationIds` en `markSeen` op de context; in `localStorage` onder `@strakzat/orbit:seen`, per project). Een nieuwe kijker heeft nog niets gelezen. `FeedbackMarkers` slaat daarom elke comment over waarvan het id een annotatie met een pin op deze pagina is. Feedback die via een ander id op hetzelfde element staat, is een eigen thread: een cirkel zonder staart naast de pin, aan de kant waar de staart heen wijst, zodat hij niet bij de buurman lijkt te horen. `AnnotationMarker` zet z'n pin met `position` op een van de vier hoeken, de staart terug het element in (`CORNER_TAIL`).
- **Losse annotaties krijgen tóch een marker.** Heeft een annotatie geen element op de pagina — `target: "global"`, of het element is nu niet gerenderd — dan parkeert `AutoAnnotationMarkers` de badge in een kolom linksboven (`unplacedBadgeRect()` in `marker-geometry.ts`), zonder staart en met een streepjesrand als teken dat hij nergens aan hangt. De popover opent daar. Zonder dat waren die annotaties alleen in het paneel te lezen.
- **Een kaart opent z'n thread in het paneel, als volgende pagina.** Klikken schuift `ThreadPage` (`thread-page.tsx`) over de lijst: een terugknop met de naam van de view (‹ Annotaties / ‹ Feedback), dan de annotatie voluit, de feedback, en de composer als laatste sectie onder een scheidingslijn, zonder eigen veldrand (`ThreadSections`, dezelfde inhoud als de popover). Op de pagina opent dan géén popover, die viel soms achter het paneel; het element wordt in beeld gescrold en blijft in de spotlight zolang de thread open is. Een pin op de pagina opent nog steeds z'n popover daar, zonder het paneel: het paneel is om door alles te bladeren. De kaart blijft afgekapt (annotatie twee regels, comment drie, antwoord twee): hij is een lijstingang.
  - **De overgang.** Beide pagina's liggen over elkaar (`.orbit-panel__page`), de lijst blijft gerenderd, dus filters, zoekveld en scrollpositie staan er nog na Terug. De thread komt van rechts (`translateX(24%)`), de lijst wijkt half zo ver naar links: 200 ms `--orbit-ease`, transitions zodat een snelle Terug halverwege omkeert. De pagina die weggaat vervaagt sneller (`--orbit-duration-fast`) dan de nieuwe verschijnt, want door glas heen lezen twee pagina's als ruis. Weg is hij `visibility: hidden`, dus uit de tabvolgorde. Met `prefers-reduced-motion` geen schuiven, alleen de crossfade.
  - **Focus en Escape.** Openen zet de focus op Terug; Terug (of Escape in de thread) brengt hem naar de kaart die hem opende (de knop uit de klik, want Safari focust geen knop bij een klik). Uitgeschoven verdwijnt de thread (`THREAD_EXIT_MS`): z'n comments pollen niet door. Een comment vanuit de thread ververst meteen de lijst en de teller (`refreshComments()`). Escape op de lijst sluit het paneel, en een gesloten paneel opent weer op de lijst.
  - Staat de annotatie of feedback op een andere route (tab "Alles"), dan navigeert de klik daar ook heen, en wijst de thread het element daar aan zodra de route gerenderd is.
- **Het paneel wijst aan met de spotlight van Feedback plaatsen.** Een kaart onder de muis zet z'n element in dezelfde spotlight als de inspector bij het kiezen: het frame dimt, het element houdt een witte ring en de pil met z'n naam (en component). Van kaart naar kaart glijdt hij mee. Staat er een thread open, dan blijft z'n element in de spotlight tot Terug; openen scrolt het in beeld. `Spotlight` (`spotlight.tsx`) is één component voor de inspector en het paneel; het paneel rendert hem náást zich, niet erin, want de pagina's van het paneel bewegen met transforms. Zolang de inspector aanstaat, tekent alleen díe een spotlight.
- **De thread ligt op z'n pin**, zoals een comment in Figma: de hoek van de popover op de hoek van de pin, de pin bedekt, naar rechts en omlaag; zonder ruimte rechts naar links vanaf de rechterkant van de pin, zonder ruimte eronder omhoog vanaf z'n onderkant, binnen het frame (`getPinPopoverStyle()` in `popover-position.ts`; `pinBoxAtCorner()` voor `AnnotationMarker`). Een open thread ligt altijd boven elke pin: de popover van `AnnotationMarker` gaat met een portal naar `document.body`, want in het frame (een eigen stapelcontext) tekenden de pins van `AutoAnnotationMarkers` en `FeedbackMarkers` erover; hij volgt z'n pin bij scrollen en resizen. `react-dom` is daarvoor een peer dependency (al), `@types/react-dom` een devDependency.
- **Een pin licht niets op; z'n thread komt uit de pin.** Geen spotlight, stille highlight of rand om `.orbit-marker-wrap` bij hover of open: de popover zegt zelf waar hij vandaan komt (`usePinMorph()`, `pinId` op `AnnotationPopover`, de pin gevonden via `data-orbit-pin`). Hij begint als een cirkel zo groot als de kop van de pin, óp de pin: een `clip-path: inset(… round …)` op de hoek van de popover die het dichtst bij de pin ligt, met een `translate` naar de pin. Van daar groeit hij in 240 ms (`--orbit-ease`) tot het paneel terwijl hij naar z'n plek reist; de inhoud verschijnt pas als de vorm er grotendeels is (90 ms later, 150 ms). De insets zijn `calc(100% - …)`, want het paneel groeit nog als z'n comments binnenkomen; de clip in rust reikt 48 px buiten het paneel, zodat hij z'n schaduw niet afsnijdt. Sluiten gaat dezelfde weg terug, sneller (180 ms): React haalt de popover meteen weg, dus een inerte kopie (`.orbit-popover--leaving`) krimpt terug in de pin en verdwijnt. WAAPI, geen CSS: het beginpunt is een meting. Het effect annuleert eerst lopende animaties voor het meet (StrictMode draait het twee keer), en maakt de kopie alleen als de popover echt weg is. Met `prefers-reduced-motion` alleen een fade. De popover van de inspector heeft geen pin en houdt `orbit-animate-in`.
- **Losse feedback wordt ook geparkeerd.** Is het element van een comment verdwenen, dan krijgt de badge een plek in dezelfde kolom linksboven, onder de losse annotaties. `marker-placement.ts` bepaalt de volgorde, zodat `AutoAnnotationMarkers` en `FeedbackMarkers` niet in hetzelfde vakje tekenen.
- **Beide tabs tellen hetzelfde soort ding**: annotaties op deze pagina, en niet-opgeloste feedback op deze pagina.
- **Teller op de rail** (Annotaties en feedback): `currentAnnotations.length + openFeedbackCount` (page-gefilterd)
- **Feedback tab badge**: toont count van niet-opgeloste feedback op huidige pagina

## Server helpers (voor consuming projects)

Het package exporteert de hele comments API via `@strakzat/orbit/server`: `createCommentsHandler()`, een Node-handler (Vercel, Express, de Vite-plugin), en daaronder `handleCommentsRequest({ method, query, body }, options)` zonder framework. Een `api/comments.js` is één regel, `export default createCommentsHandler()`, en dat schrijft `orbit-init` ook. **Een nieuw veld in de POST komt in `COMMENT_FIELDS` (`server.ts`)**, dan neemt elke route en de Vite-plugin het mee met een update van het package. Eerder schreef elk project z'n eigen handler die de velden één voor één doorgaf; daar viel `component` uit (4.9), en feedback op een component landde in productie als feedback op één element.

Wie toch een eigen handler bouwt, gebruikt de helpers eronder — ze garanderen dat alle velden (inclusief `pagina`) correct worden opgeslagen, zolang de handler ze doorgeeft.

```typescript
import { buildNotionCommentChildren, buildNotionCommentProperties, parseNotionComment } from "@strakzat/orbit/server";

// POST handler — bouwt alle Notion properties inclusief Pagina, en de body: de screenshot
const properties = buildNotionCommentProperties(
  { annotationId, auteur, comment, pagina, label, varianten, component },
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

`varianten` gaat alleen naar Notion als de comment varianten heeft: een database zonder kolom `Varianten` blijft werken voor een project zonder varianten. Heeft het project ze wél, dan moet de kolom (tekst) bestaan, anders weigert Notion de pagina. `handleCommentsRequest` vangt dat op door zonder varianten opnieuw te sturen, en zo ook voor `Component`.

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
npm version patch --no-git-tag-version # bump version
```

**Publiceren doet de merge.** Komt er een nieuwe versie op `main`, dan draait `.github/workflows/release.yml`: tests, `npm publish` naar GitHub Packages (npm.pkg.github.com), en een GitHub-release `vX.Y.Z` met de entry uit `CHANGELOG.md` als notes. Zonder entry stopt hij vóór het publiceren. Wat al bestaat slaat hij over, dus een mislukte run kan opnieuw (ook handmatig, via `workflow_dispatch`). De token is `GITHUB_TOKEN`, of `ORBIT_NPM_TOKEN` als die secret gezet is. Publiceren met de hand is niet meer nodig.

**Elke PR bumpt de versie.** `npm version patch|minor|major --no-git-tag-version` (package.json én package-lock.json), met een entry bovenaan `CHANGELOG.md`, en de titel van de PR begint met de nieuwe versie (`4.9.1: …`). Patch voor een fix of kleine UI-aanpassing, minor voor nieuwe functionaliteit, major voor een breaking change (zoals een hernoemde CSS-variabele).

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

Rechts op de rail staat de kijker: een monogram zodra er een naam is, anders een profielicoon. Het opent een klein paneel (niet-modale `dialog`, zoals Varianten) met de naam, de taal (Nederlands of English, met de segmenten van een `choice`), een switch voor de pins en een voor de pins van opgeloste feedback. Geen titel: de sluitknop zweeft rechtsboven (`labels.profileTitle` is de `aria-label`). Bovenin staat het monogram groot en gecentreerd als voorbeeld, met de naam eronder: direct te typen, zonder veldstijl (placeholder "Je naam..."), de focus als een blauwe lijn eronder. Het naamveld draagt `NO_AUTOFILL`: `autocomplete="off"` plus de negeer-attributen van 1Password, LastPass, Bitwarden en Dashlane — het is een naam voor feedback, geen login. Openen sluit al het andere: paneel, popover, inspector en Varianten. De pins blijven staan: die zijn een instelling, geen venster.

- **De versie staat onderaan het profiel** (`Orbit 4.11.0`, selecteerbaar), voor als een klant een probleem meldt. tsup zet hem bij de build uit `package.json` (`define`, `src/version.ts`), dus hij loopt nooit achter; buiten de build staat er `dev`.
- **De naam is voor feedback.** Eén keer gezet, gaat elke comment eronder uit. Het formulier heeft geen naamveld: zonder naam gaat de comment uit als `Anonymous` (`ANONYMOUS` in `constants.ts`). De naam zet je alleen in het profiel. Annotaties komen uit de data van het project, die schrijft Orbit niet.
- **De pins zijn van de kijker.** Annotaties en feedback op de pagina staan standaard aan, zodat je ziet wat er is; uitzetten kan in het profiel (switch "Annotaties en feedback tonen") of met Cmd/Ctrl + `.`, en dat blijft bewaard (`showMarkers`). `settings.defaultVisible` is waar het begint tot de kijker kiest, net als `language`. Het paneel staat er los van: openen en sluiten verandert niets aan de pins. Op de context zijn `annotationMode` / `setAnnotationMode` die instelling. Staan de pins uit, dan werkt het paneel gewoon: een kaart opent z'n thread in het paneel en de spotlight wijst het element aan. Een pin aanklikken opent alleen z'n thread, niet het paneel: het paneel is om alles door te bladeren. Onder de switch staat de sneltoets als toetsen, een `<kbd class="orbit-key">` elk (⌘ . op een Mac, Ctrl . elders), achter `labels.profileMarkersHint` ("Sneltoets").
- **Opgeloste feedback ook.** De switch "Opgeloste feedback tonen" (`labels.profileResolved`) staat standaard aan; uit, dan krijgt feedback waarvan alles opgelost is geen pin en geen plek in de kolom linksboven (`showResolvedPins` / `setViewerShowResolved` op de context, `showResolved` in de kijker). Paneel en teller veranderen niet. Sneltoets Shift + R, met dezelfde terughoudendheid als C (niet in een veld, geen andere modifier, geen herhaling of IME, niet als de pagina hem al afhandelde), onder de switch als toetsen (⇧ R op een Mac). Figma heeft er geen: daar is "Show resolved comments" alleen een filter, en Shift + C zet álle comments aan of uit (bij ons Cmd/Ctrl + `.`). De switch staat er alleen als comments aanstaan.
- **De taal is van de kijker.** `language` op de provider is waar Orbit begint; de keuze van de kijker gaat erboven. Naam, taal, pins en opgeloste pins staan in `localStorage` (`@strakzat/orbit:viewer`), voor elk project op dezelfde origin; de oude sleutel van het formulier (`commentAuteur`) wordt één keer overgenomen. Gelezen na mount, zodat server-HTML en de eerste client-render gelijk zijn.
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
| Pin | `--orbit-pin-glass`, `--orbit-pin-fg`, `--orbit-pin-shadow`, `-shadow_hover`, en één tint per soort: `--orbit-pin-{documentation,pro,question,con,suggestion,critical,user-insight,feedback,resolved}` |
| Sterren | `--orbit-star-{amber,peach,ice,cyan,blue}` — hex, want de shader leest ze: de prisma van Radial, van boven naar beneden; `--orbit-boot-bg`, zwart in beide thema's |
| Component | `--orbit-component`, `--orbit-component-glass`, `--orbit-component-glass-edge`, `--orbit-text-component_on-glass` — Figma's paars `#9747FF` als accent; chip en tag zijn donkerpaars glas met lichte tekst, de naam in mono (in beide thema's, zoals de spotlight-tag). Bewust niet het paars van `suggestion` |
| Type | `--orbit-type-{documentation,pro,question,con,suggestion,critical,user-insight}-{bg,border,fg}` |
| Schaal | `--orbit-space-*`, `--orbit-radius-*`, `--orbit-text-*`, `--orbit-shadow-*`, `--orbit-font-body`, `--orbit-font-mono` |
| Motion | `--orbit-duration-fast`, `--orbit-duration`, `--orbit-duration-slow`, `--orbit-duration-boot`, `--orbit-ease` |
| Stapeling | `--orbit-z-base` (uit `settings.zIndex`) plus vaste offsets, de hoogste `--orbit-z-tour` |
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
- Het paneel staat vast rechtsonder boven de rail. In localStorage staat alleen de kijker: naam, taal, pins en of hij de rondleiding zag, en wat hij per thread gelezen heeft.
- Comments worden door de provider gepolled, één keer voor alles, elke 30 seconden zolang comments aanstaan — ook als het paneel dicht is, voor de teller op de rail. Een verborgen tab slaat over; na een fout wordt het twee minuten later opnieuw geprobeerd.

## Checks

```bash
npm run check        # typecheck + check:tokens
npm run check:tokens # geen ruwe kleur, geen styling terug in een inline style object
npm run build        # tsup → dist/
```
