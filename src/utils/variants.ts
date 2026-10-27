import type { AnnotationLabels, OrbitVariant, OrbitVariantValue } from "../types";

/**
 * The pane's two tabs: Deze pagina, what changes the current route (`pages`), and Alle pagina's,
 * what has no `pages`. A variant whose `pages` says no to this route is in neither. The one place
 * this rule lives: the rail, the pane and the feedback all read it from here.
 */
export function variantScopes(variants: OrbitVariant[], route: string) {
  return {
    page: variants.filter((v) => v.pages?.(route)),
    all: variants.filter((v) => !v.pages),
  };
}

/** The variants in the pane on this route, in its order. */
export function variantsHere(variants: OrbitVariant[], route: string): OrbitVariant[] {
  const { page, all } = variantScopes(variants, route);
  return page.concat(all);
}

const sameSet = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && a.every((id) => b.includes(id));

/** Whether a variant is off its default. One without a default, or an action, never is. */
export function isChanged(variant: OrbitVariant): boolean {
  switch (variant.type) {
    case "action":
      return false;
    case "multi":
      return variant.defaultValue !== undefined && !sameSet(variant.value, variant.defaultValue);
    default:
      return variant.defaultValue !== undefined && variant.value !== variant.defaultValue;
  }
}

/** Puts a variant back on its default, if it is off it. */
export function resetVariant(variant: OrbitVariant): void {
  if (!isChanged(variant)) return;
  switch (variant.type) {
    case "choice":
      return variant.onChange(variant.defaultValue!);
    case "multi":
      return variant.onChange([...variant.defaultValue!]);
    case "switch":
      return variant.onChange(variant.defaultValue!);
    case "range":
      return variant.onChange(variant.defaultValue!);
  }
}

export const formatRange = (value: number, format?: (value: number) => string) =>
  format ? format(value) : String(value);

type ValueLabels = Pick<AnnotationLabels, "variantsNone" | "variantsOn" | "variantsOff">;

/** A variant's value as it is read: the option's label, "aan", "3 berichten". Null for an action. */
export function describeValue(variant: OrbitVariant, labels: ValueLabels): string | null {
  switch (variant.type) {
    case "choice":
      return variant.options.find((o) => o.id === variant.value)?.label ?? variant.value;
    case "multi": {
      const chosen = variant.options.filter((o) => variant.value.includes(o.id)).map((o) => o.label);
      return chosen.length ? chosen.join(", ") : labels.variantsNone;
    }
    case "switch":
      return variant.value ? labels.variantsOn : labels.variantsOff;
    case "range":
      return formatRange(variant.value, variant.format);
    case "action":
      return null;
  }
}

/** The variants on this route and their values, a line each, as feedback carries them. */
export function describeVariants(
  variants: OrbitVariant[],
  route: string,
  labels: ValueLabels
): string {
  return variantsHere(variants, route)
    .map((variant) => {
      const value = describeValue(variant, labels);
      return value === null ? null : `${variant.title}: ${value}`;
    })
    .filter(Boolean)
    .join("\n");
}

/** A variant's value as a link carries it: `1`/`0`, a number, an id, ids joined by commas. */
export function serializeValue(value: OrbitVariantValue): string {
  if (typeof value === "boolean") return value ? "1" : "0";
  if (Array.isArray(value)) return value.join(",");
  return String(value);
}

/**
 * A value as two values are compared: a list of ids in any order is the same list. The order
 * stays the project's in the value itself; only the comparison ignores it.
 */
export function comparableValue(value: OrbitVariantValue): string {
  return Array.isArray(value) ? [...value].sort().join(",") : serializeValue(value);
}

/** Back from a link, in the type of `fallback`; `fallback` itself when it does not read. */
export function parseValue<T extends OrbitVariantValue>(raw: string, fallback: T): T {
  if (typeof fallback === "boolean") {
    if (raw === "1" || raw === "true") return true as T;
    if (raw === "0" || raw === "false") return false as T;
    return fallback;
  }
  if (typeof fallback === "number") {
    const n = Number(raw);
    return (raw !== "" && Number.isFinite(n) ? n : fallback) as T;
  }
  if (Array.isArray(fallback)) return (raw ? raw.split(",") : []) as unknown as T;
  return raw as T;
}
