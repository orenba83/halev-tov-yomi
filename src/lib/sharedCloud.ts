import type { AppState } from "./types";
import { getSharedState, setSharedState } from "./sharedState.functions";

const STORAGE_KEY = "fitrack_shared_cloud_cache_v1";
const GITHUB_RAW =
  "https://raw.githubusercontent.com/orenba83/halev-tov-yomi/main/shared-sync-state.json";

export type SharedCloudPayload = {
  v: 1;
  updated_at: string;
  state: AppState;
};

function readLocalCache(): SharedCloudPayload | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SharedCloudPayload;
  } catch {
    return null;
  }
}

function writeLocalCache(payload: SharedCloudPayload) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

export async function pullSharedCloud(): Promise<SharedCloudPayload | null> {
  try {
    const data = (await getSharedState()) as SharedCloudPayload | null;
    if (data?.v === 1 && data.state) {
      writeLocalCache(data);
      return data;
    }
  } catch {
    /* continue */
  }

  try {
    const res = await fetch(`${GITHUB_RAW}?t=${Date.now()}`, {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    if (res.ok) {
      const data = (await res.json()) as SharedCloudPayload;
      if (data?.v === 1 && data.state) {
        writeLocalCache(data);
        return data;
      }
    }
  } catch {
    /* continue */
  }

  return readLocalCache();
}

export async function pushSharedCloud(state: AppState): Promise<boolean> {
  const payload: SharedCloudPayload = {
    v: 1,
    updated_at: new Date().toISOString(),
    state,
  };
  writeLocalCache(payload);

  try {
    await setSharedState({ data: payload });
    return true;
  } catch {
    return true;
  }
}
