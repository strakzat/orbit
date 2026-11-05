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
 * Whether a comment belongs on the current page. Feedback on a component goes wherever that
 * component is (`componentsOnPage`, kept by the provider), not to the page it was given on.
 * Without a page (older feedback) it shows everywhere.
 */
export function isOnPage(
  comment: { pagina?: string; component?: string },
  route: string,
  componentsOnPage: Set<string>
): boolean {
  if (comment.component) return componentsOnPage.has(comment.component);
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
