import type { AnnotationLabels, AnnotationSettings, AnnotationType } from "./types";
import { LABELS } from "./labels";
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

/** Orbit's texts in Dutch, the language it starts in. Every language's are in `LABELS`. */
export const DEFAULT_LABELS: AnnotationLabels = LABELS.nl;

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

/**
 * On the name fields: a name for feedback, not a login. `autocomplete="off"` keeps the browser's
 * own autofill away; the password managers each read their own attribute (1Password, LastPass,
 * Bitwarden, Dashlane) and ignore the standard one.
 */
export const NO_AUTOFILL = {
  autoComplete: "off",
  "data-1p-ignore": "",
  "data-lpignore": "true",
  "data-bwignore": "",
  "data-form-type": "other",
} as const;

// Colours live in src/styles/tokens.ts as CSS custom properties. Nothing here
// should carry a colour value: the check:tokens script fails the build if it does.
