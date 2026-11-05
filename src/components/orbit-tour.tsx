import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useAnnotations } from "../context/use-annotations";
import { INSPECTOR_TOGGLE_ATTR } from "./inspector";
import { ORBIT_UI_ATTR } from "../constants";
import { cx } from "../utils/cx";
import { findElementByAnnotationId } from "../utils/find-element";
import { pickArea } from "../utils/pick-element";
import { tourCardPosition } from "../utils/tour";
import { useStableId } from "../utils/use-stable-id";
import { fill } from "../labels";
import { LanguageChoice, ViewerIdentity } from "./profile-pane";
import { Spotlight } from "./spotlight";
import { TOUR_BOOT, TourStars } from "./tour-stars";
import type { TourStepId } from "../types";

// The rail's button a step points at.
const TARGETS: Partial<Record<TourStepId, string>> = {
  feedback: `[${INSPECTOR_TOGGLE_ATTR}]`,
  variants: "[data-orbit-variants-toggle]",
  profile: "[data-orbit-profile-toggle]",
};
// These steps are looked at, not used: the viewer can do nothing but read on.
const MODAL: TourStepId[] = ["welcome", "variants", "profile"];

interface OrbitTourProps {
  steps: TourStepId[];
  onAnnounce: (text: string) => void;
}

/**
 * How Orbit works, once for each viewer: a card that walks through it, on Orbit's real pins, panel
 * and picker. The provider swaps the project's data for samples while the tour runs (and
 * `useComments` keeps them from the network), so this is only the card and what's around it.
 * Rendered by the rail, which knows which steps this project has.
 */
export function OrbitTour({ steps, onAnnounce }: OrbitTourProps) {
  const {
    labels,
    language,
    viewer,
    settings,
    tourStep,
    setTourStep,
    endTour,
    tourPractised,
    allAnnotations,
    commentsConfig,
    panelOpen,
    setPanelOpen,
    inspectorActive,
    setInspectorActive,
    activeAnnotationId,
    setActiveAnnotationId,
  } = useAnnotations();

  const step = tourStep ?? "welcome";
  const index = Math.max(steps.indexOf(step), 0);
  const last = index === steps.length - 1;
  const modal = MODAL.includes(step);
  // Feedback has to say who it's from, so with comments on the way in is through the name.
  const needsName = step === "welcome" && !!commentsConfig && !viewer.name.trim();
  const cardRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const titleId = useStableId("orbit-tour-title");
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);
  // The boot: black, the stars come in, and then the page and the card come up together.
  const [landed, setLanded] = useState(!TOUR_BOOT);
  const land = useCallback(() => setLanded(true), []);

  const next = useCallback(() => {
    if (last) endTour();
    else setTourStep(steps[index + 1]);
  }, [last, endTour, setTourStep, steps, index]);

  // Each step sets the stage: the picker for practice, the panel to review in.
  useEffect(() => {
    setActiveAnnotationId(null);
    setInspectorActive(step === "feedback");
    setPanelOpen(step === "panel");
  }, [step, setActiveAnnotationId, setInspectorActive, setPanelOpen]);

  // The pins rise above the spotlight's scrim (rules.ts).
  useEffect(() => {
    document.documentElement.setAttribute("data-orbit-tour", step);
    return () => document.documentElement.removeAttribute("data-orbit-tour");
  }, [step]);

  // Practice done: on to the next step.
  const practised = useRef(tourPractised);
  useEffect(() => {
    if (step === "feedback" && tourPractised > practised.current) next();
    practised.current = tourPractised;
  }, [step, tourPractised, next]);

  // The focus goes with the step: to the name when there is one to fill in, else its title.
  useEffect(() => {
    const field = step === "welcome" ? cardRef.current?.querySelector("input") : null;
    if (landed) (field ?? titleRef.current)?.focus({ preventScroll: true });
  }, [step, landed]);

  useLayoutEffect(() => {
    const place = () => {
      const card = cardRef.current;
      if (!card) return;
      const size = { width: card.offsetWidth, height: card.offsetHeight };
      const viewport = { width: window.innerWidth, height: window.innerHeight };
      const button = TARGETS[step] ? document.querySelector(TARGETS[step]!) : null;
      const panel = step === "panel" ? document.querySelector(".orbit-panel") : null;
      setPosition(
        tourCardPosition(
          button
            ? { at: "above", target: button.getBoundingClientRect() }
            : panel
              ? { at: "left", target: panel.getBoundingClientRect() }
              : { at: step === "pins" ? "corner" : "center", area: pickArea() },
          size,
          viewport
        )
      );
    };
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [step, language, panelOpen]);

  // Escape closes the innermost thing: a thread, the picker and the panel see to their own.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented || needsName) return;
      if (inspectorActive || activeAnnotationId) return;
      if (document.activeElement?.closest(".orbit-panel")) return;
      endTour();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [needsName, inspectorActive, activeAnnotationId, endTour]);

  // With nothing else to do on these steps, Tab stays in the card. On the document: a click on the
  // scrim takes the focus out of the card, which then no longer hears the key.
  useEffect(() => {
    if (!modal) return;
    const onTab = (e: KeyboardEvent) => {
      const card = cardRef.current;
      if (e.key !== "Tab" || !card) return;
      const stops = Array.from(
        card.querySelectorAll<HTMLElement>(
          'button:not(:disabled):not([tabindex="-1"]), input:not([tabindex="-1"]), [tabindex="0"]'
        )
      );
      const at = stops.indexOf(document.activeElement as HTMLElement);
      const edge = !card.contains(document.activeElement) || (e.shiftKey ? at <= 0 : at === stops.length - 1);
      if (!edge) return;
      e.preventDefault();
      stops[e.shiftKey ? stops.length - 1 : 0]?.focus();
    };
    document.addEventListener("keydown", onTab);
    return () => document.removeEventListener("keydown", onTab);
  }, [modal]);

  const hasComments = !!commentsConfig;
  const projectName = settings.projectName.trim();
  const copy: Record<TourStepId, { title: string; body: string; note?: string }> = {
    welcome: {
      title: projectName ? fill(labels.tourWelcomeTitleNamed, { name: projectName }) : labels.tourWelcomeTitle,
      body: hasComments ? labels.tourWelcomeBody : labels.tourWelcomeBodyAnnotations,
    },
    pins: {
      title: labels.tourPinsTitle,
      body: hasComments ? labels.tourPinsBody : labels.tourPinsBodyAnnotations,
    },
    feedback: { title: labels.placeFeedback, body: labels.tourFeedbackBody, note: labels.tourFeedbackNote },
    panel: {
      title: labels.panelTitle,
      body: hasComments ? labels.tourPanelBody : labels.tourPanelBodyAnnotations,
    },
    variants: { title: labels.variants, body: labels.tourVariantsBody },
    profile: { title: labels.profile, body: labels.tourProfileBody },
  };
  const { title, body, note } = copy[step];

  const quiet = (label: string, onClick: () => void, disabled?: boolean) =>
    React.createElement("button", { type: "button", className: "orbit-tour__quiet", onClick, disabled }, label);

  const area = pickArea();
  const framed = !!document.querySelector(".orbit-frame");
  const sample = allAnnotations[0];
  const lit = step === "pins" && sample?.elementId ? findElementByAnnotationId(sample.elementId) : null;
  // What lets the corona go. The panel itself on its step, since it stands right
  // over its button; asked for every frame, because it opens after the step does.
  const target = () => {
    if (step === "pins") return lit;
    if (step === "panel") return document.querySelector(".orbit-panel");
    return TARGETS[step] ? document.querySelector(TARGETS[step]!) : null;
  };

  return React.createElement(
    React.Fragment,
    null,
    // While practising, the page belongs to the picker.
    step !== "feedback" &&
      React.createElement("div", {
        [ORBIT_UI_ATTR]: "",
        "aria-hidden": true,
        className: cx(
          "orbit-root orbit-tour__scrim",
          framed && "orbit-tour__scrim--framed",
          step === "pins" && "orbit-tour__scrim--clear"
        ),
        style: { left: area.left, top: area.top, width: area.width, height: area.height },
      }),
    lit && React.createElement(Spotlight, { el: lit, still: true }),
    TOUR_BOOT &&
      React.createElement("div", {
        [ORBIT_UI_ATTR]: "",
        "aria-hidden": true,
        className: cx("orbit-root orbit-tour__black", landed && "orbit-tour__black--up"),
      }),
    React.createElement(
      "div",
      {
        ref: cardRef,
        role: "dialog",
        "aria-modal": modal,
        "aria-labelledby": titleId,
        lang: language,
        [ORBIT_UI_ATTR]: "",
        className: cx(
          "orbit-root orbit-tour orbit-glass-pane",
          !TOUR_BOOT && "orbit-animate-in",
          step === "welcome" && "orbit-tour--welcome",
          !landed && "orbit-tour--waiting"
        ),
        // Measured before the first paint. Not hidden until then: it has to take the focus.
        style: position ?? undefined,
      },
      React.createElement(
        "h2",
        { ref: titleRef, id: titleId, tabIndex: -1, className: "orbit-tour__title" },
        title
      ),
      React.createElement("p", { className: "orbit-tour__body" }, body),
      note && React.createElement("p", { className: "orbit-tour__note" }, note),
      step === "welcome" && hasComments && React.createElement(ViewerIdentity, { required: true }),
      step === "welcome" && React.createElement(LanguageChoice, { onAnnounce }),
      React.createElement(
        "div",
        { className: "orbit-tour__foot" },
        // The welcome card isn't a step of what it announces.
        index > 0 &&
          React.createElement(
            "span",
            { className: "orbit-tour__progress" },
            fill(labels.tourProgress, { current: index, total: steps.length - 1 })
          ),
        // Skipping is a choice at the door. Once under way, Escape still leaves.
        step === "welcome" && quiet(labels.tourSkip, endTour, needsName),
        index > 0 && quiet(labels.tourBack, () => setTourStep(steps[index - 1])),
        React.createElement(
          "button",
          { type: "button", className: "orbit-button", onClick: next, disabled: needsName },
          step === "welcome" ? labels.tourStart : last ? labels.tourDone : labels.tourNext
        )
      )
    ),
    // After the card, so its ref is set when the stars' layout effect runs. The stacking is z-index.
    React.createElement(TourStars, { cardRef, on: step === "welcome", target, onLanded: land })
  );
}
