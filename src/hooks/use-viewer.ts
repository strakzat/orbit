import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { LABELS } from "../labels";
import type { OrbitLanguage, OrbitViewer } from "../types";

/** Who is looking, for every project on this origin: their name and their language. */
const STORAGE_KEY = "@strakzat/orbit:viewer";
/** Where the comment form kept the name before there was a profile. */
const LEGACY_NAME_KEY = "@strakzat/orbit:commentAuteur";

const NOBODY: OrbitViewer = { name: "", language: null };

// Layout effect in the browser: the stored language is in before the first paint. On the server
// the plain effect, which does not warn there.
const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

function load(): OrbitViewer {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<OrbitViewer>;
      return {
        name: typeof parsed.name === "string" ? parsed.name : "",
        language: parsed.language && parsed.language in LABELS ? parsed.language : null,
      };
    }
    return { name: window.localStorage.getItem(LEGACY_NAME_KEY) ?? "", language: null };
  } catch {
    return NOBODY;
  }
}

function save(viewer: OrbitViewer) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(viewer));
    window.localStorage.removeItem(LEGACY_NAME_KEY);
  } catch {
    // Storage refused: the profile lasts as long as the page.
  }
}

/**
 * The viewer's profile, kept in localStorage. Read after mount rather than in the first render,
 * so a server-rendered page and its first client render agree.
 */
export function useViewer() {
  const [viewer, setViewer] = useState<OrbitViewer>(NOBODY);

  useIsomorphicLayoutEffect(() => setViewer(load()), []);

  const update = useCallback((change: Partial<OrbitViewer>) => {
    setViewer((prev) => {
      const next = { ...prev, ...change };
      save(next);
      return next;
    });
  }, []);

  const setViewerName = useCallback((name: string) => update({ name }), [update]);
  const setViewerLanguage = useCallback((language: OrbitLanguage) => update({ language }), [update]);

  return { viewer, setViewerName, setViewerLanguage };
}
