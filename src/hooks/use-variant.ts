import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";
import { comparableValue, parseValue, serializeValue } from "../utils/variants";
import type { OrbitVariant, OrbitVariantValue } from "../types";

/** A variant on a link: `?orbit.rol=administratie`. */
const PARAM_PREFIX = "orbit.";
/** The values for this tab, so they hold as the pages change and through a reload. */
const STORAGE_KEY = "orbit:variants";

// Layout effect in the browser: the stored value is in before the first paint, with no flash of
// the default. On the server the plain effect, which does not warn there.
const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

/** Every value `useVariant` keeps, as a link writes it. Read once, from the tab and the link. */
let stored: Record<string, string> | null = null;
/** The defaults of the ids `useVariant` keeps, as compared: a link carries only these, and only off them. */
const managed = new Map<string, string>();
/** How many hooks keep each id: the last one to go takes it off `managed`. */
const holders = new Map<string, number>();
const listeners = new Set<() => void>();

function save() {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  } catch {
    // Storage refused: the values last as long as the page.
  }
}

/**
 * The stored values, the link's over the tab's. The link's are then taken off the address, so a
 * reload keeps what was switched since, and the page's own query is left as it was.
 */
function load(): Record<string, string> {
  if (stored) return stored;
  stored = {};
  try {
    Object.assign(stored, JSON.parse(window.sessionStorage.getItem(STORAGE_KEY) ?? "{}"));
  } catch {
    // Nothing stored, or nothing readable.
  }
  const url = new URL(window.location.href);
  const fromLink = Array.from(url.searchParams).filter(([key]) => key.startsWith(PARAM_PREFIX));
  if (fromLink.length) {
    for (const [key, value] of fromLink) {
      stored[key.slice(PARAM_PREFIX.length)] = value;
      url.searchParams.delete(key);
    }
    save();
    window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
  }
  return stored;
}

/**
 * A variant's value, kept by Orbit for this tab and readable from a link. The pane's "Link
 * kopiëren" writes the variants kept here onto the address (`?orbit.rol=administratie`), so a
 * client opens the prototype in the state it was sent in. Every value kept here is the project's
 * still: it passes it to `OrbitShell` as `value` and `onChange`, as any other.
 *
 * ```ts
 * const [rol, setRol] = useVariant("rol", "regie");
 * { type: "choice", id: "rol", value: rol, onChange: setRol, defaultValue: "regie", … }
 * ```
 *
 * The id is the variant's: the link carries it under that name. The default's type is the
 * value's: a boolean, a number, a string or a list of ids.
 */
export function useVariant(id: string, defaultValue: boolean): [boolean, (value: boolean) => void];
export function useVariant(id: string, defaultValue: number): [number, (value: number) => void];
export function useVariant(id: string, defaultValue: string): [string, (value: string) => void];
export function useVariant(
  id: string,
  defaultValue: readonly string[]
): [string[], (value: readonly string[]) => void];
export function useVariant(
  id: string,
  defaultValue: OrbitVariantValue
): [OrbitVariantValue, (value: never) => void] {
  const fallback = serializeValue(defaultValue);
  const fallbackCompared = comparableValue(defaultValue);
  const [raw, setRaw] = useState(fallback);

  useIsomorphicLayoutEffect(() => {
    managed.set(id, fallbackCompared);
    holders.set(id, (holders.get(id) ?? 0) + 1);
    const sync = () => setRaw(load()[id] ?? fallback);
    sync();
    listeners.add(sync);
    return () => {
      listeners.delete(sync);
      const left = (holders.get(id) ?? 1) - 1;
      if (left > 0) holders.set(id, left);
      else {
        holders.delete(id);
        managed.delete(id);
      }
    };
  }, [id, fallback, fallbackCompared]);

  const set = useCallback(
    (value: OrbitVariantValue) => {
      const values = load();
      if (comparableValue(value) === fallbackCompared) delete values[id];
      else values[id] = serializeValue(value);
      save();
      // Every hook on this id, in any component, follows.
      listeners.forEach((listener) => listener());
    },
    [id, fallbackCompared]
  );

  // The same value keeps the same reference, so a list in an effect's dependencies holds still.
  // `defaultValue` is read through `fallback`: a new array literal each render changes nothing.
  const value = useMemo(() => parseValue(raw, defaultValue), [raw, fallback]);
  return [value, set];
}

/** Whether any variant is kept by `useVariant`: only then does a link carry something. */
export const hasLinkedVariants = () => managed.size > 0;

/**
 * The address of this page with the variants `useVariant` keeps, each one off its default. The
 * values are read from the variants themselves, so the link is what the pane shows.
 */
export function variantLink(variants: OrbitVariant[]): string {
  const url = new URL(window.location.href);
  for (const key of Array.from(url.searchParams.keys())) {
    if (key.startsWith(PARAM_PREFIX)) url.searchParams.delete(key);
  }
  for (const variant of variants) {
    if (variant.type === "action" || !managed.has(variant.id)) continue;
    if (comparableValue(variant.value) === managed.get(variant.id)) continue;
    url.searchParams.set(PARAM_PREFIX + variant.id, serializeValue(variant.value));
  }
  return url.toString();
}
