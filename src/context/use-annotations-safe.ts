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
  commentsError: null,
  currentRoute: "/",
  registeredMarkerIds: new Set(),
  registerMarkerId: () => {},
  unregisterMarkerId: () => {},
};

export function useAnnotationsSafe(): AnnotationContextValue {
  const ctx = useContext(AnnotationContext);
  return ctx ?? NOOP_CONTEXT;
}
