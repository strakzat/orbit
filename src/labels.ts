import type { AnnotationLabels, OrbitLanguage } from "./types";

/**
 * Orbit's own texts, a set per language. Only the interface: annotations, feedback and a
 * project's variants are the project's, and stay in the language they were written in.
 */
export const LABELS: Record<OrbitLanguage, AnnotationLabels> = {
  nl: {
    toggleShow: "Annotaties tonen",
    toggleHide: "Annotaties verbergen",
    tabCurrentPage: "Deze pagina",
    tabAll: "Alles",
    searchPlaceholder: "Zoek annotaties...",
    panelTitle: "Annotaties en feedback",
    noResults: "Geen resultaten",
    placeFeedback: "Feedback plaatsen",
    variants: "Varianten",
    variantsThisPage: "Deze pagina",
    variantsEverywhere: "Alle pagina's",
    variantsThisPageHint: "Verandert alleen wat er op deze pagina staat.",
    variantsEverywhereHint: "Geldt op elke pagina van het prototype.",
    variantsEmpty: "Hier valt niets te wisselen.",
    variantsClose: "Sluit varianten",
    variantsReset: "Standaard herstellen",
    variantsCopyLink: "Link kopiëren",
    variantsLinkCopied: "Link gekopieerd.",
    variantsChanged: "aangepast",
    variantsNone: "geen",
    variantsOn: "aan",
    variantsOff: "uit",
    rail: "Orbit",
    onThisPage: "{count} op deze pagina",
    viewAnnotations: "Annotaties",
    viewFeedback: "Feedback",
    closePanel: "Sluit paneel",
    close: "Sluiten",
    searchFeedbackPlaceholder: "Zoek feedback...",
    feedbackLoading: "Feedback laden...",
    feedbackError: "Fout bij laden feedback",
    feedbackEmpty: "Nog geen feedback",
    commentsLoading: "Comments laden…",
    commentsError: "Fout bij laden comments",
    commentsEmpty: "Nog geen comments",
    feedbackFrom: "Feedback van {name}",
    feedbackFromOn: "Feedback van {name} op {label}",
    reply: "Antwoord",
    status: { Open: "Open", "In behandeling": "In behandeling", Opgelost: "Opgelost" },
    annotationMarker: "Annotatie: {title}",
    annotationMarkerUnplaced: "Annotatie: {title} (niet aan een element gekoppeld)",
    feedbackOpen: "{count} open feedback",
    feedbackAllResolved: "{count} feedback, alles opgelost",
    inspectorActive: "Inspectormodus actief. Klik een element aan om feedback te plaatsen, Escape om te stoppen.",
    formName: "Naam",
    formComment: "Comment",
    formCommentPlaceholder: "Schrijf een comment...",
    formSubmit: "Verstuur",
    formSubmitting: "Versturen...",
    formError: "Versturen mislukt. Probeer het opnieuw.",
    formAs: "Als {name}",
    profile: "Profiel",
    profileNamed: "Jij: {name}",
    profileTitle: "Jij",
    profileClose: "Sluit profiel",
    profileNameHint: "Staat bij de feedback die je plaatst.",
    profileLanguage: "Taal",
    timeNow: "nu",
    timeMinutes: "m",
    timeHours: "u",
    timeDays: "d",
  },
  en: {
    toggleShow: "Show annotations",
    toggleHide: "Hide annotations",
    tabCurrentPage: "This page",
    tabAll: "All",
    searchPlaceholder: "Search annotations...",
    panelTitle: "Annotations and feedback",
    noResults: "No results",
    placeFeedback: "Give feedback",
    variants: "Variants",
    variantsThisPage: "This page",
    variantsEverywhere: "All pages",
    variantsThisPageHint: "Only changes what is on this page.",
    variantsEverywhereHint: "Applies to every page of the prototype.",
    variantsEmpty: "Nothing to switch here.",
    variantsClose: "Close variants",
    variantsReset: "Restore defaults",
    variantsCopyLink: "Copy link",
    variantsLinkCopied: "Link copied.",
    variantsChanged: "changed",
    variantsNone: "none",
    variantsOn: "on",
    variantsOff: "off",
    rail: "Orbit",
    onThisPage: "{count} on this page",
    viewAnnotations: "Annotations",
    viewFeedback: "Feedback",
    closePanel: "Close panel",
    close: "Close",
    searchFeedbackPlaceholder: "Search feedback...",
    feedbackLoading: "Loading feedback...",
    feedbackError: "Could not load feedback",
    feedbackEmpty: "No feedback yet",
    commentsLoading: "Loading comments…",
    commentsError: "Could not load comments",
    commentsEmpty: "No comments yet",
    feedbackFrom: "Feedback from {name}",
    feedbackFromOn: "Feedback from {name} on {label}",
    reply: "Reply",
    status: { Open: "Open", "In behandeling": "In progress", Opgelost: "Resolved" },
    annotationMarker: "Annotation: {title}",
    annotationMarkerUnplaced: "Annotation: {title} (not attached to an element)",
    feedbackOpen: "{count} open feedback",
    feedbackAllResolved: "{count} feedback, all resolved",
    inspectorActive: "Inspector on. Click an element to give feedback on it, Escape to stop.",
    formName: "Name",
    formComment: "Comment",
    formCommentPlaceholder: "Write a comment...",
    formSubmit: "Send",
    formSubmitting: "Sending...",
    formError: "Could not send. Please try again.",
    formAs: "As {name}",
    profile: "Profile",
    profileNamed: "You: {name}",
    profileTitle: "You",
    profileClose: "Close profile",
    profileNameHint: "Shown with the feedback you give.",
    profileLanguage: "Language",
    timeNow: "now",
    timeMinutes: "m",
    timeHours: "h",
    timeDays: "d",
  },
};

/** Each language in its own name, as the switch shows it: the same in every language. */
export const LANGUAGE_NAMES: Record<OrbitLanguage, string> = {
  nl: "Nederlands",
  en: "English",
};

/** A label's {placeholders} filled in: `fill("{count} open", { count: 2 })` is "2 open". */
export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match
  );
}

function isPerLanguage(
  labels: Partial<AnnotationLabels> | Partial<Record<OrbitLanguage, Partial<AnnotationLabels>>>
): labels is Partial<Record<OrbitLanguage, Partial<AnnotationLabels>>> {
  return Object.keys(labels).some((key) => key in LABELS);
}

/** A language's labels with a project's overrides on top: flat for every language, or keyed by one. */
export function resolveLabels(
  language: OrbitLanguage,
  overrides?: Partial<AnnotationLabels> | Partial<Record<OrbitLanguage, Partial<AnnotationLabels>>>
): AnnotationLabels {
  const own = !overrides ? undefined : isPerLanguage(overrides) ? overrides[language] : overrides;
  return { ...LABELS[language], ...own };
}
