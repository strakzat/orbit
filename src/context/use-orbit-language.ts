import { useAnnotationsSafe } from "./use-annotations-safe";
import type { OrbitLanguage } from "../types";

/**
 * The language Orbit is in: the viewer's choice, else the project's. Orbit translates only
 * its own interface; a project that wants its variants in the same language builds their
 * titles and options from this, and they follow the switch. `"nl"` outside the provider.
 */
export function useOrbitLanguage(): OrbitLanguage {
  return useAnnotationsSafe().language;
}
