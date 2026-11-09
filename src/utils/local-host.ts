/**
 * Whether a page is served from this machine: a dev server, a preview build, a test. `location.hostname`
 * gives an IPv6 host in brackets, `[::1]`; `0.0.0.0` is where `vite --host` can be opened.
 */
export function isLocalHost(hostname: string): boolean {
  return hostname === "localhost" || hostname.endsWith(".localhost") || /^127\./.test(hostname) || ["[::1]", "0.0.0.0"].includes(hostname);
}
