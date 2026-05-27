/** Local Nexus Tracker (Tauri) HTTP API — proxied in dev via vite.config.ts */
export const TRACKER_API =
  import.meta.env.VITE_TRACKER_URL?.replace(/\/$/, "") || "/tracker";

export function trackerUrl(path: string): string {
  const base = TRACKER_API;
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}
