export type MarkerPosition = "top-left" | "top-right" | "bottom-left" | "bottom-right";
export type AnnotationType = "documentation" | "pro" | "question" | "con" | "suggestion" | "critical" | "user-insight";

export interface Annotation {
  id: string;
  target: string;
  elementId?: string;
  title: string;
  body: string;
  author: string;
  date: string;
  type?: AnnotationType;
}

export interface AnnotationSettings {
  defaultVisible?: boolean;
  accentColor?: string;
  panelWidth?: number;
  panelHeight?: number;
  zIndex?: number;
  keyboardShortcut?: boolean;
}

export interface AnnotationLabels {
  toggleShow: string;
  toggleHide: string;
  tabCurrentPage: string;
  tabAll: string;
  searchPlaceholder: string;
  panelTitle: string;
  noResults: string;
  /** The rail's inspector toggle. */
  placeFeedback: string;
  /** The rail's button for the variants pane, and the pane's name. */
  variants: string;
  /** The pane's tab with the variants that change something on the current page. */
  variantsThisPage: string;
  /** The pane's tab with the variants that go for every page. */
  variantsEverywhere: string;
  /** Under the "Deze pagina" tab: what its variants are. */
  variantsThisPageHint: string;
  /** Under the "Alle pagina's" tab: what its variants are. */
  variantsEverywhereHint: string;
  /** A tab without variants. */
  variantsEmpty: string;
  /** The variants pane's close button. */
  variantsClose: string;
  /** The variants pane's button that puts every variant back to its default. */
  variantsReset: string;
  /** The variants pane's button that copies a link to the prototype in its current variants. */
  variantsCopyLink: string;
  /** Said once the link is copied. */
  variantsLinkCopied: string;
  /** After the Varianten button's name, for a screen reader: "2 aangepast". */
  variantsChanged: string;
  /** A `multi` with nothing chosen, as it is said and sent with feedback. */
  variantsNone: string;
  /** A switch on, or a checkbox ticked, as it is said and sent with feedback. */
  variantsOn: string;
  /** A switch off, or a checkbox cleared. */
  variantsOff: string;
  /** The rail's own name, for a screen reader. */
  rail: string;
  /*
   * A text in {braces} is a template: Orbit fills in the {count}, {name}, {label} or {title}.
   * An override may move them, and leave out what it does not need.
   */
  /** After the rail's panel button, for a screen reader: "{count} op deze pagina". */
  onThisPage: string;
  /** The panel's two views. */
  viewAnnotations: string;
  viewFeedback: string;
  /** The close button of the panel, and of a popover. */
  closePanel: string;
  close: string;
  searchFeedbackPlaceholder: string;
  feedbackLoading: string;
  feedbackError: string;
  feedbackEmpty: string;
  commentsLoading: string;
  commentsError: string;
  commentsEmpty: string;
  /** A feedback card's button: "Feedback van {name}". */
  feedbackFrom: string;
  /** The same, in the panel, for feedback on an element: "Feedback van {name} op {label}". */
  feedbackFromOn: string;
  /** The admin's reply under a comment. */
  reply: string;
  /** A comment's status, as shown on its pill and in the filters. */
  status: Record<Comment["status"], string>;
  /** An annotation marker: "Annotatie: {title}". */
  annotationMarker: string;
  /** One that hangs on no element, parked top left. */
  annotationMarkerUnplaced: string;
  /** A feedback marker: "{count} open feedback". */
  feedbackOpen: string;
  /** One with nothing open: "{count} feedback, alles opgelost". */
  feedbackAllResolved: string;
  /** Said when the inspector starts. */
  inspectorActive: string;
  /** The comment form. */
  formName: string;
  formComment: string;
  formCommentPlaceholder: string;
  formSubmit: string;
  formSubmitting: string;
  formError: string;
  /** "Als {name}", over the comment field once the name is set: a button that shows the name field. */
  formAs: string;
  /** The rail's button for the profile with no name set, and its name with one: "Jij: {name}". */
  profile: string;
  profileNamed: string;
  /** The profile pane's title. */
  profileTitle: string;
  profileClose: string;
  /** Under the name field: what the name is for. */
  profileNameHint: string;
  profileLanguage: string;
  /** A relative time: just now, then minutes, hours and days as a suffix ("5m", "3u", "2d"). */
  timeNow: string;
  timeMinutes: string;
  timeHours: string;
  timeDays: string;
}

/** The languages Orbit speaks: its own interface, not the project's content. */
export type OrbitLanguage = "nl" | "en";

/** Who is looking: their name for feedback, and the language they chose. Kept in localStorage. */
export interface OrbitViewer {
  name: string;
  /** Null until they choose: the project's `language` then. */
  language: OrbitLanguage | null;
}

/** One option of a `choice` or a `multi`. */
export interface OrbitVariantOption {
  id: string;
  label: string;
  /** Shown, but not to be picked: an option the prototype does not have yet. */
  disabled?: boolean;
}

/** What every variant has: a name, where it shows, and an optional line of explanation. */
interface OrbitVariantBase {
  id: string;
  title: string;
  /** A line under the title: what the variant changes, or why. */
  hint?: string;
  /** The routes it changes something on: it shows under "Deze pagina" there. Left out, it shows under "Alle pagina's". */
  pages?: (route: string) => boolean;
}

/**
 * How a `choice` is drawn. `segments`: the options side by side on Radial's pill. `radios`: a
 * list, one option a row. `select`: a native select. Left out, Orbit picks: segments while every
 * option fits its share of the pill, a list when one does not, a select from 7 options.
 */
export type OrbitChoiceDisplay = "segments" | "radios" | "select";

/** One of a few options. */
export interface OrbitChoiceVariant extends OrbitVariantBase {
  type: "choice";
  options: readonly OrbitVariantOption[];
  value: string;
  onChange: (value: string) => void;
  /** The value the prototype starts in. Given, "Standaard herstellen" can go back to it. */
  defaultValue?: string;
  display?: OrbitChoiceDisplay;
}

/** Any number of options at once, as checkboxes. */
export interface OrbitMultiVariant extends OrbitVariantBase {
  type: "multi";
  options: readonly OrbitVariantOption[];
  value: readonly string[];
  onChange: (value: string[]) => void;
  defaultValue?: readonly string[];
}

/** On or off, as a switch. */
export interface OrbitSwitchVariant extends OrbitVariantBase {
  type: "switch";
  value: boolean;
  onChange: (value: boolean) => void;
  defaultValue?: boolean;
}

/** A number in a range, as a slider: how many rows, how long a name. */
export interface OrbitRangeVariant extends OrbitVariantBase {
  type: "range";
  min: number;
  max: number;
  /** 1 when left out. */
  step?: number;
  value: number;
  onChange: (value: number) => void;
  defaultValue?: number;
  /** The value as it is read beside the slider and in feedback: `(n) => `${n} berichten``. */
  format?: (value: number) => string;
}

/** Something the prototype does rather than a state it is in: show a toast, simulate an error. */
export interface OrbitActionVariant extends OrbitVariantBase {
  type: "action";
  /** The button's text. The title when left out. */
  label?: string;
  /** May return a promise: the button waits for it. */
  onRun: () => void | Promise<void>;
}

/** What a demo switches that is not part of the product: a project's own variants, in the rail's pane. */
export type OrbitVariant =
  | OrbitChoiceVariant
  | OrbitMultiVariant
  | OrbitSwitchVariant
  | OrbitRangeVariant
  | OrbitActionVariant;

/** What a variant's value can be: what `useVariant` keeps, and what a link carries. */
export type OrbitVariantValue = string | boolean | number | readonly string[];

export interface OrbitShellProps {
  children: React.ReactNode;
  /**
   * The project's variants. Left out or empty, the rail has no Varianten button: the pane is opt-in.
   */
  variants?: OrbitVariant[];
  /**
   * `true` (the default): the app sits in a frame above the rail, as if on top of it, and scrolls in
   * the frame. `false`: the rail is laid over the foot of the window and the page scrolls as before,
   * for a site that depends on the window's scroll.
   */
  frame?: boolean;
}

export interface AnnotationContextValue {
  annotationMode: boolean;
  setAnnotationMode: (value: boolean) => void;
  panelOpen: boolean;
  setPanelOpen: (value: boolean) => void;
  activeAnnotationId: string | null;
  setActiveAnnotationId: (id: string | null) => void;
  hoveredAnnotationId: string | null;
  setHoveredAnnotationId: (id: string | null) => void;
  inspectorActive: boolean;
  setInspectorActive: (value: boolean) => void;
  currentAnnotations: Annotation[];
  allAnnotations: Annotation[];
  pushContext: (context: string) => void;
  popContext: () => void;
  labels: AnnotationLabels;
  settings: Required<AnnotationSettings>;
  commentsConfig: CommentsConfig | null;
  allComments: Comment[];
  commentsLoading: boolean;
  commentsError: string | null;
  currentRoute: string;
  registeredMarkerIds: Set<string>;
  registerMarkerId: (id: string) => void;
  unregisterMarkerId: (id: string) => void;
  /** Called by `OrbitShell` with its variants, so feedback can say which ones it was given in. */
  registerVariants: (variants: OrbitVariant[] | undefined) => void;
  /** The variants on the current page and their values, a line each, as sent with feedback. */
  describeVariants: () => string;
  /** The language Orbit is in: the viewer's choice, else the project's. */
  language: OrbitLanguage;
  viewer: OrbitViewer;
  setViewerName: (name: string) => void;
  setViewerLanguage: (language: OrbitLanguage) => void;
}

export interface AnnotationProviderProps {
  annotations: Annotation[];
  currentRoute?: string;
  settings?: AnnotationSettings;
  /**
   * Overrides of Orbit's texts. Flat, they go for every language; keyed by language
   * (`{ nl: {…}, en: {…} }`), each follows the viewer's switch.
   */
  labels?: Partial<AnnotationLabels> | Partial<Record<OrbitLanguage, Partial<AnnotationLabels>>>;
  /** The language Orbit starts in, until the viewer picks one. `"nl"` when left out. */
  language?: OrbitLanguage;
  comments?: CommentsConfig;
  children: React.ReactNode;
}

export interface Comment {
  id: string;
  auteur: string;
  comment: string;
  status: "Open" | "In behandeling" | "Opgelost";
  antwoord: string | null;
  aangemaakt: string;
  pagina?: string;
  label?: string;
  annotationId?: string;
  /** The variants the feedback was given in, a line each: "Rol: Administratie". */
  varianten?: string;
}

export interface CommentsConfig {
  enabled: boolean;
  apiBase: string;
  project: string;
}

export interface AnnotationConfig {
  project: string;
  annotations: Annotation[];
  settings?: AnnotationSettings;
  comments?: CommentsConfig;
}
