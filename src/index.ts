// Components
export { AnnotationProvider } from "./context/annotation-context";
export { AnnotationMarker } from "./components/annotation-marker";
export { AnnotationPanel } from "./components/annotation-panel";
export { CommentThread } from "./components/comment-thread";
export { CommentForm } from "./components/comment-form";
export { Inspector } from "./components/inspector";
export { OrbitShell } from "./components/orbit-shell";

// Hooks
export { useAnnotations } from "./context/use-annotations";
export { useAnnotationsSafe } from "./context/use-annotations-safe";
export { useComments } from "./hooks/use-comments";
export { useAllComments } from "./hooks/use-all-comments";
export { useOrbitFrame } from "./context/frame-context";
export { useVariant } from "./hooks/use-variant";

// Theming — the CSS custom properties are a public contract; see CLAUDE.md.
export { THEME_ATTR } from "./styles/tokens";
export { onBrandTextColor } from "./styles/brand";
export { ORBIT_UI_ATTR } from "./constants";

// Types
export type {
  Annotation,
  AnnotationConfig,
  AnnotationProviderProps,
  AnnotationLabels,
  AnnotationSettings,
  AnnotationContextValue,
  AnnotationType,
  MarkerPosition,
  Comment,
  CommentsConfig,
  OrbitShellProps,
  OrbitVariant,
  OrbitVariantOption,
  OrbitVariantValue,
  OrbitChoiceVariant,
  OrbitChoiceDisplay,
  OrbitMultiVariant,
  OrbitSwitchVariant,
  OrbitRangeVariant,
  OrbitActionVariant,
} from "./types";
