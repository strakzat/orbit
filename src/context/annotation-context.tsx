import React, { createContext, useState, useCallback, useEffect, useMemo, useRef, useReducer } from "react";
import type { SendFailure,
  AnnotationContextValue,
  AnnotationProviderProps,
  Comment,
  OrbitLanguage,
  OrbitVariant,
  TourStepId,
} from "../types";
import { COMPONENT_ATTR, resolveSettings } from "../constants";
import { resolveLabels } from "../labels";
import { useViewer } from "../hooks/use-viewer";
import { useSeen } from "../hooks/use-seen";
import { failureFrom } from "../utils/send-failure";
import { useOwnComments } from "../hooks/use-own-comments";
import { useAnnotationStyles } from "../styles/inject";
import { applyRuntimeTokens } from "../styles/brand";
import { matchRoute } from "../utils/route-matching";
import { Inspector } from "../components/inspector";
import { FeedbackToasts } from "../components/feedback-toasts";
import { FeedbackMarkers } from "../components/feedback-markers";
import { AutoAnnotationMarkers } from "../components/auto-annotation-markers";
import { useAllComments } from "../hooks/use-all-comments";
import { describeVariants as describe } from "../utils/variants";
import { tourAnchors, tourSample, type TourAnchor } from "../utils/tour";

/** The names of the components on the page now. */
function readComponents(): Set<string> {
  const names = new Set<string>();
  document.querySelectorAll(`[${COMPONENT_ATTR}]`).forEach((el) => {
    const name = el.getAttribute(COMPONENT_ATTR)?.trim();
    if (name) names.add(name);
  });
  return names;
}

// During the tour no wrapper shows a pin, so none of them stands in for feedback's own pin.
const NO_MARKERS: Set<string> = new Set();
const NOTHING_TO_MARK = () => {};

const sameSet = (a: Set<string>, b: Set<string>) =>
  a.size === b.size && Array.from(a).every((name) => b.has(name));

export const AnnotationContext = createContext<AnnotationContextValue | null>(null);

/** Whether a key press is text going into a field (of the project's or Orbit's own). */
function isTyping(target: EventTarget | null): boolean {
  const el = target instanceof HTMLElement ? target : null;
  if (!el) return false;
  if (el.isContentEditable) return true;
  if (el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) return true;
  if (el instanceof HTMLInputElement) {
    return !["checkbox", "radio", "button", "submit", "reset", "range", "color", "file"].includes(el.type);
  }
  return false;
}

// Long enough for the next polls to have it: a list read just before the write would drop the pin.
const SENT_LINGER_MS = 60_000;

export function AnnotationProvider({
  annotations,
  currentRoute = "/",
  settings: settingsOverride,
  labels: labelsOverride,
  language: projectLanguage = "nl",
  comments: commentsConfig,
  children,
}: AnnotationProviderProps) {
  useAnnotationStyles();

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const settings = useMemo(() => resolveSettings(settingsOverride), [settingsOverride]);
  // The viewer's language when they chose one, else the project's.
  const {
    viewer,
    setViewerName,
    setViewerLanguage,
    setViewerShowMarkers,
    setViewerShowResolved,
    setViewerTourSeen,
  } = useViewer();
  const showResolvedPins = viewer.showResolved ?? true;
  const language: OrbitLanguage = viewer.language ?? projectLanguage;
  const labels = useMemo(() => resolveLabels(language, labelsOverride), [language, labelsOverride]);


  // The settings-driven half of the token layer: one brand colour, plus the label
  // colour that keeps enough contrast on top of it, plus the stacking base.
  useEffect(
    () => applyRuntimeTokens(settings.accentColor, settings.zIndex),
    [settings.accentColor, settings.zIndex]
  );

  // The pins on the page, annotations and feedback: the viewer's choice, else the project's. Apart
  // from the panel, which opens and closes without them.
  const annotationMode = viewer.showMarkers ?? settings.defaultVisible;
  const [panelOpen, setPanelOpen] = useState(false);
  const [activeAnnotationId, setActiveAnnotationId] = useState<string | null>(null);

  const setAnnotationMode = useCallback(
    (show: boolean) => {
      setViewerShowMarkers(show);
      // Hidden is nothing on the page, an open popover included.
      if (!show) setActiveAnnotationId(null);
    },
    [setViewerShowMarkers]
  );
  const annotationModeRef = useRef(annotationMode);
  annotationModeRef.current = annotationMode;
  const [hoveredAnnotationId, setHoveredAnnotationId] = useState<string | null>(null);
  const [inspectorActive, setInspectorActive] = useState(false);
  const inspectorActiveRef = useRef(inspectorActive);
  inspectorActiveRef.current = inspectorActive;
  const [contextStack, setContextStack] = useState<string[]>([]);

  // The tour. While it runs, the context holds its samples instead of the project's data.
  const [tourStep, setTourStep] = useState<TourStepId | null>(null);
  const [tourComments, setTourComments] = useState<Comment[]>([]);
  const [tourPractised, setTourPractised] = useState(0);
  const tourStepRef = useRef(tourStep);
  tourStepRef.current = tourStep;
  const [anchors, setAnchors] = useState<TourAnchor[] | null>(null);
  const touring = tourStep !== null;
  const touringRef = useRef(touring);
  touringRef.current = touring;

  const leaveEverything = useCallback(() => {
    setPanelOpen(false);
    setInspectorActive(false);
    setActiveAnnotationId(null);
  }, []);

  const startTour = useCallback(() => {
    leaveEverything();
    setTourStep("welcome");
  }, [leaveEverything]);

  const strikeStage = useCallback(() => {
    leaveEverything();
    setTourStep(null);
    setAnchors(null);
  }, [leaveEverything]);

  const endTour = useCallback(() => {
    strikeStage();
    setViewerTourSeen();
  }, [strikeStage, setViewerTourSeen]);

  // Cut off, not finished: only the shell can run a tour, so without it the stage is struck. Not
  // seen, like a reload halfway. Nothing to do without a tour: the shell also goes on any other day.
  const abandonTour = useCallback(() => {
    if (touringRef.current) strikeStage();
  }, [strikeStage]);

  const addTourComment = useCallback<AnnotationContextValue["addTourComment"]>((comment) => {
    // Practice: it's kept nowhere, not even for the rest of the tour. It only says it happened.
    // From the picker: with the picker closed the pins are back, and a reply there is a reply.
    if (tourStepRef.current === "feedback" && inspectorActiveRef.current) {
      setTourPractised((count) => count + 1);
      return;
    }
    setTourComments((prev) => [
      ...prev,
      {
        ...comment,
        id: `orbit-tour-own-${prev.length}`,
        status: "Open",
        antwoord: null,
        aangemaakt: new Date().toISOString(),
        pagina: routeRef.current,
      },
    ]);
  }, []);

  // A reply in a sample thread stays for as long as that thread is on the page, and no longer.
  useEffect(() => {
    if (tourStep !== "pins") setTourComments([]);
  }, [tourStep]);

  // Where the samples sit, read once the welcome card is done: by then the page has rendered.
  useEffect(() => {
    if (touring && tourStep !== "welcome") setAnchors((prev) => prev ?? tourAnchors());
  }, [touring, tourStep]);

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

  // Keyboard shortcut: Cmd+. / Ctrl+. shows or hides the pins, as the profile's switch does.
  useEffect(() => {
    if (!settings.keyboardShortcut) return;

    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === ".") {
        e.preventDefault();
        if (touringRef.current) return;
        setAnnotationMode(!annotationModeRef.current);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [settings.keyboardShortcut, setAnnotationMode]);

  // C: place feedback, like the rail's button; C again stops. A bare letter, so it stands down
  // whenever the key means something else: typing in a field, a modifier held, a held-down
  // repeat, an IME composing, or a page that already handled the key itself.
  const commentsOn = !!commentsConfig?.enabled;
  useEffect(() => {
    if (!settings.keyboardShortcut || !commentsOn) return;

    const handler = (e: KeyboardEvent) => {
      if (e.key !== "c" && e.key !== "C") return;
      if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey || e.repeat || e.isComposing) return;
      if (e.defaultPrevented || isTyping(e.target) || touringRef.current) return;
      e.preventDefault();
      setInspectorActive((prev) => !prev);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [settings.keyboardShortcut, commentsOn]);

  // Shift + R: resolved feedback's pins on or off, as the profile's switch does. Figma has no key
  // for its "Show resolved comments"; R for resolved, with Shift so a bare R stays the page's.
  // The same stand-downs as C.
  const showResolvedRef = useRef(showResolvedPins);
  showResolvedRef.current = showResolvedPins;
  useEffect(() => {
    if (!settings.keyboardShortcut || !commentsOn) return;

    const handler = (e: KeyboardEvent) => {
      if (e.key !== "R" && e.key !== "r") return;
      if (!e.shiftKey || e.metaKey || e.ctrlKey || e.altKey || e.repeat || e.isComposing) return;
      if (e.defaultPrevented || isTyping(e.target) || touringRef.current) return;
      e.preventDefault();
      setViewerShowResolved(!showResolvedRef.current);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [settings.keyboardShortcut, commentsOn, setViewerShowResolved]);

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

  // The components on the page, for their feedback: it shows wherever they are. Read from the DOM
  // after it changed rather than during a render, which still sees the page before it.
  const [componentsOnPage, setComponentsOnPage] = useState<Set<string>>(() => new Set());
  useEffect(() => {
    if (!commentsOn) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const next = readComponents();
      setComponentsOnPage((prev) => (sameSet(prev, next) ? prev : next));
    };
    update();
    const observer = new MutationObserver(() => {
      if (!frame) frame = requestAnimationFrame(update);
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: [COMPONENT_ATTR],
    });
    return () => {
      observer.disconnect();
      if (frame) cancelAnimationFrame(frame);
    };
  }, [commentsOn]);

  // The shell's variants, kept for the moment feedback is sent rather than in state: a variant
  // changing re-renders the shell, not every consumer of this context.
  const variantsRef = useRef<OrbitVariant[]>([]);
  const routeRef = useRef(currentRoute);
  routeRef.current = currentRoute;
  const labelsRef = useRef(labels);
  labelsRef.current = labels;
  const registerVariants = useCallback((variants: OrbitVariant[] | undefined) => {
    variantsRef.current = variants ?? [];
  }, []);
  const describeVariants = useCallback(
    () => describe(variantsRef.current, routeRef.current, labelsRef.current),
    []
  );

  // One poller for the whole module: the rail shows the open count at all times, and the panel,
  // the markers and the rail all read this one list rather than each fetching their own.
  const {
    comments: fetchedComments,
    isLoading: commentsLoading,
    error: commentsError,
    refresh: refreshComments,
  } = useAllComments({
    apiBase: commentsConfig?.apiBase ?? "",
    project: commentsConfig?.project ?? "",
    enabled: !!commentsConfig?.enabled,
  });

  // The viewer's own comments, which they can delete. A deleted one leaves every list at once,
  // before the API's next list confirms it.
  const { tokens: ownTokens, remember: rememberOwnComment, forget: forgetOwnComment } = useOwnComments(
    commentsConfig?.project ?? ""
  );
  const [deletedCommentIds, setDeletedCommentIds] = useState<Set<string>>(() => new Set());

  // Comments on their way: on the page before the API has them, so placing one doesn't wait for
  // the screenshot and the upload. Once sent, one stays until the API's list has it; a failed one
  // stays until it is sent again or discarded, or its text would be gone.
  const [outbox, setOutbox] = useState<Comment[]>([]);
  const deliveries = useRef(new Map<string, () => Promise<{ id: string } | null>>());
  const outboxCount = useRef(0);

  const deliverComment = useCallback(
    async (id: string) => {
      const deliver = deliveries.current.get(id);
      if (!deliver) return;
      const mark = (delivery: Comment["delivery"], newId = id, deliveryFailure?: SendFailure) =>
        setOutbox((prev) =>
          prev.map((c) => (c.id === id ? { ...c, id: newId, delivery, deliveryFailure, deliveryToastGone: false } : c))
        );
      mark("sending");
      try {
        const created = await deliver();
        const sentId = created?.id ?? id;
        deliveries.current.delete(id);
        mark("sent", sentId);
        await refreshComments();
        window.setTimeout(() => setOutbox((prev) => prev.filter((c) => c.id !== sentId)), SENT_LINGER_MS);
      } catch (err) {
        console.warn("[@strakzat/orbit] Feedback niet verstuurd:", err);
        mark("failed", id, failureFrom(err, navigator.onLine));
      }
    },
    [refreshComments]
  );

  const sendFeedback = useCallback<AnnotationContextValue["sendFeedback"]>(
    (comment, deliver) => {
      outboxCount.current += 1;
      const id = `orbit-outbox-${outboxCount.current}`;
      deliveries.current.set(id, deliver);
      setOutbox((prev) => [
        ...prev,
        {
          ...comment,
          id,
          status: "Open",
          antwoord: null,
          aangemaakt: new Date().toISOString(),
          pagina: routeRef.current,
          delivery: "sending",
        },
      ]);
      void deliverComment(id);
    },
    [deliverComment]
  );

  // Only a comment that is still failed: a retry dismisses the toast too, and keeps its pin.
  const settleFailedComment = useCallback((id: string) => {
    setOutbox((prev) =>
      prev.map((c) => (c.id === id && c.delivery === "failed" ? { ...c, deliveryToastGone: true } : c))
    );
  }, []);

  const discardComment = useCallback((id: string) => {
    deliveries.current.delete(id);
    setOutbox((prev) => prev.filter((c) => c.id !== id));
  }, []);

  // What isn't with the API yet is only here: leaving the page asks first.
  const unsent = outbox.some((c) => c.delivery !== "sent");
  useEffect(() => {
    if (!unsent) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [unsent]);

  const realComments = useMemo(() => {
    const fetched = new Set(fetchedComments.map((c) => c.id));
    const comments = [...fetchedComments, ...outbox.filter((c) => !fetched.has(c.id))];
    return deletedCommentIds.size ? comments.filter((c) => !deletedCommentIds.has(c.id)) : comments;
  }, [fetchedComments, outbox, deletedCommentIds]);
  const isOwnComment = useCallback((id: string) => id in ownTokens, [ownTokens]);
  const apiBase = commentsConfig?.apiBase;
  const project = commentsConfig?.project ?? "";
  const deleteComment = useCallback(
    async (id: string) => {
      const token = ownTokens[id];
      if (!token) throw new Error("Not a comment of this viewer's");
      const res = await fetch(`${apiBase || window.location.origin}/api/comments`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project, id, token }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setDeletedCommentIds((prev) => new Set(prev).add(id));
      forgetOwnComment(id);
      void refreshComments();
    },
    [ownTokens, apiBase, project, forgetOwnComment, refreshComments]
  );

  // What the viewer has not read yet: a white dot on the annotation's pin. An open popover reads
  // its thread, also what arrives while it is open; the panel's thread page does the same.
  const { unseen: unseenAnnotationIds, markSeen: markRealSeen } = useSeen(
    commentsConfig?.project ?? "",
    realComments,
    viewer.name
  );
  // Reading a sample is not reading the project's feedback.
  const markSeen = touring ? NOTHING_TO_MARK : markRealSeen;
  useEffect(() => {
    if (activeAnnotationId) markSeen(activeAnnotationId);
  }, [activeAnnotationId, markSeen]);

  // The tour's stand-ins for the project's data. Nothing until the anchors are known, so the
  // pins don't first appear parked. Everything that reads the context gets them, so the tour
  // shows the real pins, panel and threads; the network stops at `useComments`.
  const sample = useMemo(
    () =>
      touring
        ? tourSample({ labels, route: currentRoute, anchors, comments: commentsOn })
        : null,
    [touring, labels, currentRoute, anchors, commentsOn]
  );
  const shownAnnotations = sample ? sample.annotations : annotations;
  const allComments = useMemo(
    // Newest first: what the viewer wrote tops the panel's list.
    () => (sample ? [...tourComments.slice().reverse(), ...sample.comments] : realComments),
    [sample, tourComments, realComments]
  );

  const currentContext = contextStack.length > 0
    ? contextStack[contextStack.length - 1]
    : currentRoute;

  const currentAnnotations = useMemo(
    () =>
      shownAnnotations.filter(
        (a) =>
          matchRoute(a.target, currentContext) ||
          a.target === "global"
      ),
    [shownAnnotations, currentContext]
  );

  const value = useMemo<AnnotationContextValue>(
    () => ({
      // The tour shows pins, also to a viewer who hid them. Their choice stays as it is.
      annotationMode: annotationMode || touring,
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
      allAnnotations: shownAnnotations,
      pushContext,
      popContext,
      labels,
      settings,
      commentsConfig: commentsConfig?.enabled ? commentsConfig : null,
      allComments,
      commentsLoading: !touring && commentsLoading,
      commentsError: touring ? null : commentsError,
      refreshComments,
      unseenAnnotationIds,
      markSeen,
      isOwnComment,
      rememberOwnComment,
      sendFeedback,
      retryComment: deliverComment,
      settleFailedComment,
      discardComment,
      deleteComment,
      deletedCommentIds,
      currentRoute,
      registeredMarkerIds: touring ? NO_MARKERS : registeredMarkerIds,
      componentsOnPage,
      registerMarkerId,
      unregisterMarkerId,
      registerVariants,
      describeVariants,
      language,
      viewer,
      setViewerName,
      setViewerLanguage,
      setViewerShowMarkers,
      showResolvedPins,
      setViewerShowResolved,
      tourStep,
      setTourStep,
      startTour,
      endTour,
      abandonTour,
      tourPractised,
      addTourComment,
    }),
    [
      annotationMode,
      setAnnotationMode,
      panelOpen,
      activeAnnotationId,
      hoveredAnnotationId,
      inspectorActive,
      currentAnnotations,
      shownAnnotations,
      pushContext,
      popContext,
      labels,
      settings,
      commentsConfig,
      allComments,
      commentsLoading,
      commentsError,
      refreshComments,
      unseenAnnotationIds,
      markSeen,
      isOwnComment,
      rememberOwnComment,
      sendFeedback,
      deliverComment,
      settleFailedComment,
      discardComment,
      deleteComment,
      deletedCommentIds,
      currentRoute,
      registeredMarkerIds,
      componentsOnPage,
      registerMarkerId,
      unregisterMarkerId,
      registerVariants,
      describeVariants,
      language,
      viewer,
      setViewerName,
      setViewerLanguage,
      setViewerShowMarkers,
      showResolvedPins,
      setViewerShowResolved,
      touring,
      tourStep,
      startTour,
      endTour,
      abandonTour,
      tourPractised,
      addTourComment,
    ]
  );

  return React.createElement(
    AnnotationContext.Provider,
    { value },
    children,
    mounted && commentsConfig?.enabled ? React.createElement(Inspector) : null,
    mounted && commentsConfig?.enabled ? React.createElement(FeedbackToasts) : null,
    mounted && commentsConfig?.enabled ? React.createElement(FeedbackMarkers) : null,
    mounted ? React.createElement(AutoAnnotationMarkers) : null
  );
}
