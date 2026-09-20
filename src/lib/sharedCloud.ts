import type { AppState } from "./types";
import { getSharedState, setSharedState } from "./sharedState.functions";
import {
  OREN_USERNAME_HE,
  cloudCacheKeyForUser,
  getActiveDisplayName,
} from "./sharedAccount";

export type SharedCloudPayload = {
  v: 1;
  updated_at: string;
  state: AppState;
  user?: string;
};

function userSlug(): "oren" | "dana" {
  return getActiveDisplayName() === OREN_USERNAME_HE ? "oren" : "dana";
}

function cacheKey(): string {
  return cloudCacheKeyForUser(getActiveDisplayName());
}

function readLocalCache(): SharedCloudPayload | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(cacheKey());
    if (!raw) return null;
    return JSON.parse(raw) as SharedCloudPayload;
  } catch {
    return null;
  }
}

function writeLocalCache(payload: SharedCloudPayload) {
  if (typeof window === "undefined") return;
  localStorage.setItem(cacheKey(), JSON.stringify(payload));
}

export async function pullSharedCloud(): Promise<SharedCloudPayload | null> {
  const user = userSlug();
  try {
    const data = (await getSharedState({ data: { user } })) as SharedCloudPayload | null;
    if (data?.v === 1 && data.state) {
      writeLocalCache(data);
      return data;
    }
  } catch {
    /* continue */
  }

  return readLocalCache();
}

export async function pushSharedCloud(state: AppState): Promise<boolean> {
  const user = userSlug();
  const payload: SharedCloudPayload = {
    v: 1,
    updated_at: new Date().toISOString(),
    state,
    user,
  };
  writeLocalCache(payload);

  try {
    await setSharedState({ data: payload });
    return true;
  } catch {
    return true;
  }
}
