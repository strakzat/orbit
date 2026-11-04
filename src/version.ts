// Stamped in by the build from package.json (tsup.config.ts), so it can't drift from the release.
declare const __ORBIT_VERSION__: string | undefined;

/** The version of Orbit running on this page, for when something needs troubleshooting. */
export const ORBIT_VERSION = typeof __ORBIT_VERSION__ === "string" ? __ORBIT_VERSION__ : "dev";
