import { COMPONENT_ATTR } from "../constants";

/**
 * Match a route pattern against a path.
 * Supports :param wildcards (e.g. "/projects/:id/details").
 * Supports query-parameter-based routing (e.g. "?panel=kpi_analysis").
 * "global" matches everything.
 */
export function matchRoute(pattern: string, path: string): boolean {
  if (pattern === "global") return true;

  // Split off query strings
  const [patternPath, patternSearch] = pattern.split("?");
  const [routePath, routeSearch] = path.split("?");

  // Match path segments (skip if both are empty/root)
  const normalize = (s: string) => s.replace(/^\/|\/$/g, "");
  const normalizedPattern = normalize(patternPath);
  const normalizedRoute = normalize(routePath);

  if (normalizedPattern || normalizedRoute) {
    const patternParts = normalizedPattern.split("/").filter(Boolean);
    const pathParts = normalizedRoute.split("/").filter(Boolean);

    if (patternParts.length !== pathParts.length) return false;

    const pathMatch = patternParts.every(
      (seg, i) => seg.startsWith(":") || seg === pathParts[i]
    );
    if (!pathMatch) return false;
  }

  // If the pattern has query params, check that all pattern params exist in the path
  if (patternSearch) {
    if (!routeSearch) return false;
    const patternParams = new URLSearchParams(patternSearch);
    const routeParams = new URLSearchParams(routeSearch);

    for (const [key, value] of patternParams) {
      // :param wildcard in query value
      if (value.startsWith(":")) continue;
      if (routeParams.get(key) !== value) return false;
    }
  }

  return true;
}

/**
 * Whether feedback is on a component as a whole, rather than on one instance in it. Both name the
 * component; only the whole has its selector for an `annotationId`, the one every instance answers to.
 */
export function isComponentWide(comment: { annotationId?: string; component?: string }): boolean {
  const id = comment.annotationId ?? "";
  // The selector alone: anything after it is a way into one instance.
  return !!comment.component && id.startsWith(`[${COMPONENT_ATTR}=`) && id.indexOf("]") === id.length - 1;
}

/**
 * Whether a comment belongs on the current page. Feedback on a component goes wherever that
 * component is (`componentsOnPage`, kept by the provider), not to the page it was given on.
 * Without a page (older feedback) it shows everywhere.
 */
export function isOnPage(
  comment: { annotationId?: string; pagina?: string; component?: string },
  route: string,
  componentsOnPage: Set<string>
): boolean {
  if (isComponentWide(comment)) return componentsOnPage.has(comment.component!);
  return !comment.pagina || matchRoute(route, comment.pagina);
}

/**
 * Turns a route target into a readable trail: "/projects/3?tab=kpi" reads as
 * "projects / 3 / tab=kpi". Used by the annotation cards and the feedback list,
 * which had grown two copies of this.
 */
export function routeBreadcrumb(target: string): string {
  if (!target) return "";

  const [path, search] = target.split("?");
  const pathParts = path.replace(/^\//, "").split("/").filter(Boolean);

  if (!search) return pathParts.join(" / ") || "global";

  const queryParts = Array.from(new URLSearchParams(search).entries()).map(
    ([key, value]) => `${key}=${value}`
  );
  return [...pathParts, ...queryParts].join(" / ");
}

/** The pages a place keeps before its element: the ones nearest to it. */
const PLACE_PAGES = 2;

/**
 * Where a comment is, as a trail: `Home / Sidebar`, `… / 40.2 / doelen / <h2> Doelen`. The route's
 * pages without its query, which says how the page stood rather than where it is. Past two, the
 * first ones go. Without a page (older feedback), only the element.
 */
export function placeTrail(pagina: string | undefined, element: string, home: string): string {
  const pages = (pagina ?? "").split("?")[0].split("/").filter(Boolean);
  const trail = !pagina ? [] : pages.length ? pages : [home];
  const shown = trail.length > PLACE_PAGES ? ["…", ...trail.slice(-PLACE_PAGES)] : trail;
  return [...shown, element].filter(Boolean).join(" / ");
}

/** Pushes a route target onto history and lets a listening router pick it up. */
export function navigateTo(target: string): void {
  if (!target || target === "global") return;

  const url = target.startsWith("?")
    ? `/${target}`
    : target.startsWith("/")
      ? target
      : `/${target}`;

  window.history.pushState(null, "", url);
  window.dispatchEvent(new PopStateEvent("popstate"));
}
