import { createContext, useContext } from "react";

/** The element the app sits in under `OrbitShell`, once it is mounted; `null` without a frame. */
export const FrameContext = createContext<HTMLElement | null>(null);

/**
 * The frame `OrbitShell` puts the app in, for the project's own popups: dialogs, popovers and
 * toasts that are portalled to `document.body` would cover the rail. Point the project's portal
 * container here (react-aria's `UNSAFE_PortalProvider`, Radix's `container`, a `createPortal`
 * target) and they stay in the frame. Fixed-position elements inside the frame stay in it already:
 * the frame is their containing block. `null` until the frame has mounted, and with `frame={false}`.
 */
export function useOrbitFrame(): HTMLElement | null {
  return useContext(FrameContext);
}
