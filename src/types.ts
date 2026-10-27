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
  /** The variants that change something on the current page. */
  variantsThisPage: string;
  /** The variants that go for every page. */
  variantsEverywhere: string;
  /** The rail's own name, for a screen reader. */
  rail: string;
}

/** One of a few options, as a row of segments in the variants pane. */
export interface OrbitChoiceVariant {
  type: "choice";
  id: string;
  title: string;
  options: readonly { id: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  /** The routes it changes something on: it shows under "Deze pagina" there. Left out, it shows under "Overal". */
  pages?: (route: string) => boolean;
}

/** On or off, as a switch in the variants pane. */
export interface OrbitSwitchVariant {
  type: "switch";
  id: string;
  title: string;
  value: boolean;
  onChange: (value: boolean) => void;
  pages?: (route: string) => boolean;
}

/** What a demo switches that is not part of the product: a project's own variants, in the rail's pane. */
export type OrbitVariant = OrbitChoiceVariant | OrbitSwitchVariant;

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
}

export interface AnnotationProviderProps {
  annotations: Annotation[];
  currentRoute?: string;
  settings?: AnnotationSettings;
  labels?: Partial<AnnotationLabels>;
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
