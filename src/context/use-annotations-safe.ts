import { useContext } from "react";
import { AnnotationContext } from "./annotation-context";
import type { AnnotationContextValue } from "../types";
import { DEFAULT_LABELS, DEFAULT_SETTINGS } from "../constants";

const NOOP_CONTEXT: AnnotationContextValue = {
  annotationMode: false,
  setAnnotationMode: () => {},
  panelOpen: false,
  setPanelOpen: () => {},
  activeAnnotationId: null,
  setActiveAnnotationId: () => {},
  hoveredAnnotationId: null,
  setHoveredAnnotationId: () => {},
  inspectorActive: false,
  setInspectorActive: () => {},
  currentAnnotations: [],
  allAnnotations: [],
  pushContext: () => {},
  popContext: () => {},
  labels: DEFAULT_LABELS,
  settings: DEFAULT_SETTINGS,
  commentsConfig: null,
  allComments: [],
  commentsLoading: false,
  refreshComments: async () => {},
  commentsError: null,
  unseenAnnotationIds: new Set(),
  markSeen: () => {},
  isOwnComment: () => false,
  rememberOwnComment: () => {},
  deleteComment: async () => {},
  deletedCommentIds: new Set(),
  currentRoute: "/",
  registeredMarkerIds: new Set(),
  componentsOnPage: new Set(),
  registerMarkerId: () => {},
  unregisterMarkerId: () => {},
  registerVariants: () => {},
  describeVariants: () => "",
  language: "nl",
  viewer: { name: "", language: null, showMarkers: null, showResolved: null },
  setViewerName: () => {},
  setViewerLanguage: () => {},
  setViewerShowMarkers: () => {},
  showResolvedPins: true,
  setViewerShowResolved: () => {},
};

export function useAnnotationsSafe(): AnnotationContextValue {
  const ctx = useContext(AnnotationContext);
  return ctx ?? NOOP_CONTEXT;
}
