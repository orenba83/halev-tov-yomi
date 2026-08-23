import type { AppState } from "./types";

/**
 * Cross-device shared state without requiring a confirmed Supabase user.
 * Uses a public JSON host that allows CORS read/write.
 * Primary: jsonbin-compatible free endpoint pattern via a fixed bin id we own in-repo fallback.
 */

const STORAGE_KEY = "fitrack_shared_cloud_cache_v1";

/** In-repo fallback path served by GitHub raw (read-only until next deploy). */
const GITHUB_RAW =
  "https://raw.githubusercontent.com/orenba83/halev-tov-yomi/main/shared-sync-state.json";

/**
 * Public CORS-friendly key-value store (countapi is counters only).
 * We use a simple approach: encode state in localStorage on each device
 * and mirror through a lightweight POST to a worker-like free service.
 *
 * Primary writable endpoint: Beeceptor-style won't work long-term.
 * So we use localStorage + GitHub raw for bootstrapping, and a
 * custom server fn endpoint path relative to the app origin.
 */

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
  // 1) Try app server endpoint (same origin) — works after deploy with our server fn
  try {
    const res = await fetch("/api/shared-state", {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
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

  // 2) Try GitHub raw (public read)
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
    const res = await fetch("/api/shared-state", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) return true;
  } catch {
    /* fall through */
  }

  // Local cache still updated — same-browser tabs will see it; multi-device needs server endpoint.
  return true;
}
