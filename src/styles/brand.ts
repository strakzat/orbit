/**
 * Runtime tokens: the ones that depend on the consumer's `settings`, not on the theme.
 *
 * `--orbit-brand` (from settings.accentColor) tints the quiet brand tokens — subtle
 * fill, border, secondary text — through color-mix(). The solid brand surface (the
 * primary button) is a theme-aware constant in tokens.ts instead, so it stays a
 * legible high-contrast monochrome in both themes whatever accent someone sets.
 * `onBrandTextColor` stays exported for consumers who build their own brand button.
 */

const WHITE_LUMINANCE = 1;
const ON_BRAND_LIGHT = "#FFFFFF";
const ON_BRAND_DARK = "#0C111D";
// Relative luminance of ON_BRAND_DARK, precomputed.
const ON_BRAND_DARK_LUMINANCE = 0.00535;

function channel(value: number): number {
  const c = value / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/** Parses `#rgb`, `#rgba`, `#rrggbb`, `#rrggbbaa`, `rgb(...)` and `rgba(...)`. */
function parseColor(input: string): [number, number, number] | null {
  const value = input.trim();

  if (value.startsWith("#")) {
    const hex = value.slice(1);
    if (hex.length === 3 || hex.length === 4) {
      const [r, g, b] = hex.split("");
      return [parseInt(r + r, 16), parseInt(g + g, 16), parseInt(b + b, 16)];
    }
    if (hex.length === 6 || hex.length === 8) {
      return [
        parseInt(hex.slice(0, 2), 16),
        parseInt(hex.slice(2, 4), 16),
        parseInt(hex.slice(4, 6), 16),
      ];
    }
    return null;
  }

  const rgb = value.match(/^rgba?\(\s*([\d.]+%?)[\s,]+([\d.]+%?)[\s,]+([\d.]+%?)/i);
  if (rgb) {
    const read = (c: string) => (c.endsWith("%") ? parseFloat(c) * 2.55 : Number(c));
    return [read(rgb[1]), read(rgb[2]), read(rgb[3])];
  }

  return null;
}

/** WCAG relative luminance, or null when the colour is not in a format we can read. */
export function relativeLuminance(color: string): number | null {
  const rgb = parseColor(color);
  if (!rgb) return null;
  const [r, g, b] = rgb;
  if ([r, g, b].some((c) => Number.isNaN(c))) return null;
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrast(a: number, b: number): number {
  const [light, dark] = a > b ? [a, b] : [b, a];
  return (light + 0.05) / (dark + 0.05);
}

/**
 * Picks the label colour for text sitting on a solid brand background: whichever of
 * white or near-black has the better contrast against it. Falls back to white when
 * the colour cannot be parsed, which matches the token default.
 */
export function onBrandTextColor(brand: string): string {
  const luminance = relativeLuminance(brand);
  if (luminance === null) return ON_BRAND_LIGHT;

  const onWhite = contrast(luminance, WHITE_LUMINANCE);
  const onDark = contrast(luminance, ON_BRAND_DARK_LUMINANCE);
  return onWhite >= onDark ? ON_BRAND_LIGHT : ON_BRAND_DARK;
}

/**
 * Writes the settings-driven tokens onto `<html>`. Called by AnnotationProvider.
 * Returns a cleanup that removes them again.
 */
export function applyRuntimeTokens(brand: string, zIndexBase: number): () => void {
  if (typeof document === "undefined") return () => {};

  const root = document.documentElement;
  root.style.setProperty("--orbit-brand", brand);
  root.style.setProperty("--orbit-z-base", String(zIndexBase));

  return () => {
    root.style.removeProperty("--orbit-brand");
    root.style.removeProperty("--orbit-z-base");
  };
}
