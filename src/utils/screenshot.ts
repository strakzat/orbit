/**
 * The screenshot that goes along with a piece of feedback: the app as the viewer saw it, Orbit's
 * own interface hidden, the commented element outlined.
 *
 * html-to-image renders it: bundled into Orbit, and loaded only when feedback is sent. A
 * project can bring its own renderer (`comments.screenshot`). Orbit hands the renderer the
 * element and the options to render it with, then crops and outlines what comes back. Nothing
 * here may stop the feedback: every failure ends in `null`, and the comment goes without a
 * screenshot.
 */

import type { ScreenshotCapture, ScreenshotOptions } from "../types";
import { findElementByAnnotationId } from "./find-element";

/** On `<html>` while the screenshot is taken: the sheet hides every `.orbit-root` then. */
export const CAPTURING_ATTR = "data-orbit-capturing";

const MAX_WIDTH = 1600;
const QUALITY = 0.8;
/** Room around the element's outline, in CSS px, as the highlight on the page has. */
const RING_PADDING = 4;

type Source = HTMLCanvasElement | HTMLImageElement | ImageBitmap;

/** Orbit's own renderer. A separate chunk, so a visitor who never sends feedback never loads it. */
export const renderWithHtmlToImage: ScreenshotCapture = async ({ target, options }) => {
  const { toCanvas } = await import("html-to-image");
  return toCanvas(target, options);
};

/** What a project's capture hands back, as something a canvas can draw. */
async function toSource(result: Awaited<ReturnType<ScreenshotCapture>>): Promise<Source | null> {
  if (!result) return null;
  if (result instanceof HTMLCanvasElement) return result;
  if (result instanceof Blob) return createImageBitmap(result);
  const image = new Image();
  image.src = result;
  await image.decode();
  return image;
}

function sourceSize(source: Source): { width: number; height: number } {
  if (source instanceof HTMLImageElement) return { width: source.naturalWidth, height: source.naturalHeight };
  return { width: source.width, height: source.height };
}

/**
 * What to render and which part of it the viewer saw. The renderer gets the scroll container
 * whole, at its full height, because a copy of the DOM forgets where it was scrolled; Orbit cuts
 * the visible part out afterwards. In CSS px.
 */
interface Plan {
  target: HTMLElement;
  options: ScreenshotOptions;
  /** The visible part, within the render. */
  crop: { x: number; y: number; width: number; height: number };
  /** The visible part, on the screen: where the element's outline is measured from. */
  view: DOMRect;
}

function plan(): Plan {
  // The shell's frame scrolls on its own; without one, the window scrolls the page.
  const scroller = document.querySelector<HTMLElement>(".orbit-frame__scroll");
  if (scroller) {
    const view = scroller.getBoundingClientRect();
    const width = scroller.clientWidth;
    const height = scroller.scrollHeight;
    return {
      target: scroller,
      options: { width, height, style: { height: `${height}px`, overflow: "visible" } },
      crop: { x: scroller.scrollLeft, y: scroller.scrollTop, width, height: scroller.clientHeight },
      view,
    };
  }
  const body = document.body;
  const origin = body.getBoundingClientRect();
  const width = document.documentElement.clientWidth;
  const height = Math.max(body.scrollHeight, window.innerHeight);
  return {
    target: body,
    options: { width, height, style: {} },
    crop: { x: -origin.left, y: -origin.top, width, height: window.innerHeight },
    view: new DOMRect(0, 0, width, window.innerHeight),
  };
}

/**
 * The colour behind the render's transparent parts: the first background under `target` (the
 * frame's, in the shell), or white. A JPEG has no transparency, and would make them black.
 */
function backdrop(target: HTMLElement): string {
  for (let el: HTMLElement | null = target; el; el = el.parentElement) {
    const color = getComputedStyle(el).backgroundColor;
    if (color && color !== "transparent" && !/^rgba\(.*,\s*0\)$/.test(color)) return color;
  }
  return "white";
}

/** Cuts the visible part out of `source`, outlines the element, and encodes a JPEG data URL. */
function compose(source: Source, { target, options, crop, view }: Plan, rect: DOMRect | null): string | null {
  const { width } = sourceSize(source);
  if (!width || crop.width <= 0 || crop.height <= 0) return null;

  // The render's pixels per CSS pixel: 1, or the device's ratio when the library takes it.
  const ratio = width / options.width;
  const scale = Math.min(1, MAX_WIDTH / (crop.width * ratio));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(crop.width * ratio * scale);
  canvas.height = Math.round(crop.height * ratio * scale);
  const context = canvas.getContext("2d");
  if (!context) return null;

  context.fillStyle = backdrop(target);
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(
    source,
    crop.x * ratio,
    crop.y * ratio,
    crop.width * ratio,
    crop.height * ratio,
    0,
    0,
    canvas.width,
    canvas.height
  );

  if (rect) {
    // The colour of the focus ring, from the sheet: the blue that means "this one" in Orbit.
    const ring =
      getComputedStyle(document.documentElement).getPropertyValue("--orbit-outline-focus-ring").trim() ||
      "blue";
    const k = canvas.width / crop.width;
    const x = (rect.left - view.left - RING_PADDING) * k;
    const y = (rect.top - view.top - RING_PADDING) * k;
    const w = (rect.width + RING_PADDING * 2) * k;
    const h = (rect.height + RING_PADDING * 2) * k;

    context.save();
    context.fillStyle = ring;
    context.globalAlpha = 0.12;
    context.fillRect(x, y, w, h);
    context.globalAlpha = 1;
    context.strokeStyle = ring;
    context.lineWidth = Math.max(2, 3 * k);
    context.strokeRect(x, y, w, h);
    context.restore();
  }

  return canvas.toDataURL("image/jpeg", QUALITY);
}

/** The screenshot for feedback on `annotationId`, as a JPEG data URL, or `null`. */
export async function screenshotFeedback(
  annotationId: string,
  capture: ScreenshotCapture
): Promise<string | null> {
  if (typeof window === "undefined") return null;
  const root = document.documentElement;
  const element = findElementByAnnotationId(annotationId);
  const rect = element ? element.getBoundingClientRect() : null;
  const layout = plan();

  root.setAttribute(CAPTURING_ATTR, "");
  try {
    const source = await toSource(
      await capture({ target: layout.target, options: layout.options, element })
    );
    return source ? compose(source, layout, rect) : null;
  } catch (err) {
    console.warn("[@strakzat/orbit] Screenshot mislukt:", err);
    return null;
  } finally {
    root.removeAttribute(CAPTURING_ATTR);
  }
}
