import type { AnnotationLabels, AnnotationSettings, AnnotationType } from "./types";
import {
  FileTextIcon, ThumbsUpIcon,
  HelpCircleIcon, ThumbsDownIcon, SparklesIcon, AlertTriangleIcon, EyeIcon,
} from "./icons";

export const TYPE_ICONS: Record<AnnotationType, typeof FileTextIcon> = {
  documentation: FileTextIcon,
  pro: ThumbsUpIcon,
  question: HelpCircleIcon,
  con: ThumbsDownIcon,
  suggestion: SparklesIcon,
  critical: AlertTriangleIcon,
  "user-insight": EyeIcon,
};

export const DEFAULT_LABELS: AnnotationLabels = {
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
  variantsEverywhere: "Overal",
  rail: "Orbit",
};

export const DEFAULT_SETTINGS: Required<AnnotationSettings> = {
  defaultVisible: false,
  // Tints the quiet brand tokens (subtle fill, border, links). The primary button is
  // a theme-aware monochrome constant, so this no longer needs to read on both themes.
  accentColor: "#171717",
  panelWidth: 420,
  panelHeight: 640,
  zIndex: 9000,
  keyboardShortcut: true,
};

/**
 * On an element of a project's own that belongs to Orbit's interface rather than the page: the
 * inspector lets a click there through instead of taking it as the element to comment on.
 */
export const ORBIT_UI_ATTR = "data-annotation-inspector";

// Colours live in src/styles/tokens.ts as CSS custom properties. Nothing here
// should carry a colour value: the check:tokens script fails the build if it does.
