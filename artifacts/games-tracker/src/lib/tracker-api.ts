import { trackerUrl } from "@/lib/tracker";

export type TrackerApiResponse = {
  success?: boolean;
  error?: string;
  running?: boolean;
  total_seconds?: number;
  message?: string;
};

export type TrackerRequestResult = {
  ok: boolean;
  status: number;
  data: TrackerApiResponse | null;
  unreachable: boolean;
};

export async function trackerRequest(
  path: string,
  body: Record<string, unknown>,
): Promise<TrackerRequestResult> {
  try {
    const response = await fetch(trackerUrl(path), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const text = await response.text();
    let data: TrackerApiResponse | null = null;

    if (text) {
      try {
        data = JSON.parse(text) as TrackerApiResponse;
      } catch {
        data = null;
      }
    }

    const unreachable = !response.ok && (response.status === 0 || response.status >= 500);

    return {
      ok: response.ok,
      status: response.status,
      data,
      unreachable,
    };
  } catch {
    return { ok: false, status: 0, data: null, unreachable: true };
  }
}

export const TRACKER_OFFLINE_MESSAGE =
  "Nexus Tracker is not running. Start it with: pnpm tauri dev (in the nexus-tracker folder).";
