import React, { createContext, useState, useCallback, useEffect, useMemo, useRef, useReducer } from "react";
import type { AnnotationContextValue, AnnotationProviderProps } from "../types";
import { DEFAULT_LABELS, DEFAULT_SETTINGS } from "../constants";
import { useAnnotationStyles } from "../styles/inject";
import { applyRuntimeTokens } from "../styles/brand";
import { matchRoute } from "../utils/route-matching";
import { Inspector } from "../components/inspector";
import { FeedbackMarkers } from "../components/feedback-markers";
import { AutoAnnotationMarkers } from "../components/auto-annotation-markers";
import { useAllComments } from "../hooks/use-all-comments";

export const AnnotationContext = createContext<AnnotationContextValue | null>(null);

export function AnnotationProvider({
  annotations,
  currentRoute = "/",
  settings: settingsOverride,
  labels: labelsOverride,
  comments: commentsConfig,
  children,
}: AnnotationProviderProps) {
  useAnnotationStyles();

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const settings = useMemo(
    () => ({ ...DEFAULT_SETTINGS, ...settingsOverride }),
    [settingsOverride]
  );
  const labels = useMemo(
    () => ({ ...DEFAULT_LABELS, ...labelsOverride }),
    [labelsOverride]
  );

  // The settings-driven half of the token layer: one brand colour, plus the label
  // colour that keeps enough contrast on top of it, plus the stacking base.
  useEffect(
    () => applyRuntimeTokens(settings.accentColor, settings.zIndex),
    [settings.accentColor, settings.zIndex]
  );

  const [annotationMode, setAnnotationMode] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);

  // Apply defaultVisible after mount
  useEffect(() => {
    setAnnotationMode(settings.defaultVisible);
  }, []);
  const [activeAnnotationId, setActiveAnnotationId] = useState<string | null>(null);
  const [hoveredAnnotationId, setHoveredAnnotationId] = useState<string | null>(null);
  const [inspectorActive, setInspectorActive] = useState(false);
  const [contextStack, setContextStack] = useState<string[]>([]);

  const contextStackRef = useRef(contextStack);
  contextStackRef.current = contextStack;

  const pushContext = useCallback((context: string) => {
    setContextStack((prev) => [...prev, context]);
  }, []);

  const popContext = useCallback(() => {
    setContextStack((prev) => prev.slice(0, -1));
  }, []);

  // Warn when currentRoute is not provided but annotations have route targets
  useEffect(() => {
    if (
      currentRoute === "/" &&
      annotations.some((a) => a.target !== "global" && a.target !== "/")
    ) {
      console.warn(
        '[@strakzat/orbit] currentRoute prop is not set on AnnotationProvider, ' +
        'but some annotations have route-specific targets. The "current page" filter will not work correctly. ' +
        'Pass currentRoute={window.location.pathname} or your router\'s current path.'
      );
    }
  }, []);

  // Clear context stack on route change
  const prevRouteRef = useRef(currentRoute);
  useEffect(() => {
    if (prevRouteRef.current !== currentRoute) {
      setContextStack([]);
      prevRouteRef.current = currentRoute;
    }
  }, [currentRoute]);

  // Close panel and inspector when annotation mode is turned off
  useEffect(() => {
    if (!annotationMode) {
      setPanelOpen(false);
      setActiveAnnotationId(null);
      setInspectorActive(false);
    }
  }, [annotationMode]);

  // Keyboard shortcut: Cmd+. / Ctrl+.
  useEffect(() => {
    if (!settings.keyboardShortcut) return;

    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === ".") {
        e.preventDefault();
        setAnnotationMode((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [settings.keyboardShortcut]);

  // Track which annotation IDs are rendered by AnnotationMarker wrappers
  const [registeredMarkerIds, setRegisteredMarkerIds] = useState<Set<string>>(() => new Set());
  // Force re-render counter so consumers see registration changes
  const [, forceUpdate] = useReducer((x: number) => x + 1, 0);

  const registerMarkerId = useCallback((id: string) => {
    setRegisteredMarkerIds((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    forceUpdate();
  }, []);

  const unregisterMarkerId = useCallback((id: string) => {
    setRegisteredMarkerIds((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    forceUpdate();
  }, []);

  // One poller for the whole module: the rail shows the open count at all times, and the panel,
  // the markers and the rail all read this one list rather than each fetching their own.
  const {
    comments: allComments,
    isLoading: commentsLoading,
    error: commentsError,
  } = useAllComments({
    apiBase: commentsConfig?.apiBase ?? "",
    project: commentsConfig?.project ?? "",
    enabled: !!commentsConfig?.enabled,
  });

  const currentContext = contextStack.length > 0
    ? contextStack[contextStack.length - 1]
    : currentRoute;

  const currentAnnotations = useMemo(
    () =>
      annotations.filter(
        (a) =>
          matchRoute(a.target, currentContext) ||
          a.target === "global"
      ),
    [annotations, currentContext]
  );

  const value = useMemo<AnnotationContextValue>(
    () => ({
      annotationMode,
      setAnnotationMode,
      panelOpen,
      setPanelOpen,
      activeAnnotationId,
      setActiveAnnotationId,
      hoveredAnnotationId,
      setHoveredAnnotationId,
      inspectorActive,
      setInspectorActive,
      currentAnnotations,
      allAnnotations: annotations,
      pushContext,
      popContext,
      labels,
      settings,
      commentsConfig: commentsConfig?.enabled ? commentsConfig : null,
      allComments,
      commentsLoading,
      commentsError,
      currentRoute,
      registeredMarkerIds,
      registerMarkerId,
      unregisterMarkerId,
    }),
    [
      annotationMode,
      panelOpen,
      activeAnnotationId,
      hoveredAnnotationId,
      inspectorActive,
      currentAnnotations,
      annotations,
      pushContext,
      popContext,
      labels,
      settings,
      commentsConfig,
      allComments,
      commentsLoading,
      commentsError,
      currentRoute,
      registeredMarkerIds,
      registerMarkerId,
      unregisterMarkerId,
    ]
  );

  return React.createElement(
    AnnotationContext.Provider,
    { value },
    children,
    mounted && commentsConfig?.enabled ? React.createElement(Inspector) : null,
    mounted && commentsConfig?.enabled ? React.createElement(FeedbackMarkers) : null,
    mounted ? React.createElement(AutoAnnotationMarkers) : null
  );
}
