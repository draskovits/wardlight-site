// Facts every page shares.
export const SITE = "https://playwardlight.com";
export const SITE_NAME = "Wardlight";
export const AUTHOR = "Stefan Draskovits";
export const APP_ID = "6826542922";
export const APP_STORE = `https://apps.apple.com/app/id${APP_ID}`;
export const RELEASE = "2026-12-03";
export const OG_IMAGE = "/assets/img/og.jpg";
export const TELEMETRY_APP_ID = "478692B9-F1F4-41C4-B43A-EE0E2AD8ABBF";

/** True from the release day on (UTC), at build time. The daily build flips it. */
export const released = () => new Date().toISOString().slice(0, 10) >= RELEASE;

export const abs = (path: string) => (path.startsWith("http") ? path : SITE + path);
