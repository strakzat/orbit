import React, { useEffect, useState } from "react";
import { FrameContext } from "../context/frame-context";
import { useAnnotationsSafe } from "../context/use-annotations-safe";
import { useAnnotationStyles } from "../styles/inject";
import { SHELL_LAYOUT_CSS } from "../styles/rules";
import { AnnotationPanel } from "./annotation-panel";
import { OrbitRail } from "./orbit-rail";
import type { OrbitShellProps } from "../types";

/**
 * Orbit around a project: the app in a frame on top, its corners rounded at the foot, and the rail
 * behind it on black with Orbit's controls and, opt-in, the project's variants. Inside an
 * `AnnotationProvider`. Renders the panel itself; a project does not add `AnnotationPanel` too.
 *
 * The frame is the containing block of every fixed element inside it, and the app scrolls in a box
 * within it, so the project's own fixed layers stay above the rail. Its portals do with
 * `useOrbitFrame()`. The app's root takes the frame's height with `100%`, not `100vh`. A site
 * that depends on the window's scroll passes `frame={false}`: the rail is then laid over the foot
 * of the window and the page is left as it was.
 */
export function OrbitShell({ children, variants, frame = true }: OrbitShellProps) {
  useAnnotationStyles();

  // Feedback says which variants it was written in: the provider reads them as it is sent.
  const { registerVariants } = useAnnotationsSafe();
  useEffect(() => {
    registerVariants(variants);
    // Gone with the shell: later feedback is not said to be in variants that are no longer there.
    return () => registerVariants(undefined);
  });

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const [frameElement, setFrameElement] = useState<HTMLElement | null>(null);

  const chrome = mounted
    ? [
        React.createElement(OrbitRail, { key: "rail", variants, overlay: !frame }),
        React.createElement(AnnotationPanel, { key: "panel" }),
      ]
    : [];

  if (!frame) return React.createElement(React.Fragment, null, children, ...chrome);

  return React.createElement(
    FrameContext.Provider,
    { value: frameElement },
    // Not `orbit-root`: the reset would reach the project's own elements in the frame.
    React.createElement(
      "div",
      { className: "orbit-shell" },
      // In the server's HTML too, before the sheet is injected (SHELL_LAYOUT_CSS).
      React.createElement("style", { "data-orbit-shell": "" }, SHELL_LAYOUT_CSS),
      React.createElement(
        "div",
        { ref: setFrameElement, className: "orbit-frame" },
        React.createElement("div", { className: "orbit-frame__scroll" }, children)
      ),
      ...chrome
    )
  );
}
