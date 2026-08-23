import { useSyncExternalStore } from "react";
import type { Session } from "@supabase/supabase-js";
import { getSupabaseEnv, supabase } from "@/integrations/supabase/client";
import { actions, getState, subscribeStore } from "./store";
import type { AppState } from "./types";
import {
  SHARED_USER_ID,
  SHARED_USERNAME_HE,
  clearSharedSession,
  hasSharedSession,
} from "./sharedAccount";
import { pullSharedCloud, pushSharedCloud } from "./sharedCloud";

export type SyncStatus = "signed-out" | "loading" | "synced" | "saving" | "error";
type SyncInfo = {
  email: string | null;
  userId: string | null;
  status: SyncStatus;
  lastSyncedAt: number | null;
  error: string | null;
  shared: boolean;
};
let info: SyncInfo = {
  email: null,
  userId: null,
  status: "signed-out",
  lastSyncedAt: null,
  error: null,
  shared: false,
};
const infoListeners = new Set<() => void>();
const serverInfo = info;
const setInfo = (patch: Partial<SyncInfo>) => {
  info = { ...info, ...patch };
  infoListeners.forEach((l) => l());
};
export function useSyncInfo(): SyncInfo {
  return useSyncExternalStore(
    (cb) => {
      infoListeners.add(cb);
      return () => infoListeners.delete(cb);
    },
    () => info,
    () => serverInfo,
  );
}

let started = false;
let suppress = false;
let dirty = false;
let timer: ReturnType<typeof setTimeout> | null = null;
let unsubscribeStore: (() => void) | null = null;

const friendlyError = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error ?? "שגיאה לא ידועה");
  if (/row-level security|permission denied|42501/i.test(message))
    return "אין הרשאה לסנכרון בענן עבור החשבון הזה.";
  if (/relation .*user_state.*does not exist|column .*user_state.*does not exist/i.test(message))
    return "מבנה טבלת הסנכרון בענן אינו מעודכן.";
  if (/placeholder\.supabase|Failed to fetch|NetworkError|fetch/i.test(message))
    return "סנכרון בענן לא מוגדר (חסרים משתני סביבה של Supabase).";
  return message;
};

async function pullShared() {
  setInfo({ status: "loading", error: null, shared: true, email: SHARED_USERNAME_HE, userId: SHARED_USER_ID });
  try {
    const remote = await pullSharedCloud();
    const state = remote?.state;
    if (state && Array.isArray((state as AppState).entries)) {
      if (!dirty) {
        suppress = true;
        actions.importState(state as AppState);
        suppress = false;
      }
      dirty = false;
      setInfo({ status: "synced", lastSyncedAt: Date.now(), error: null });
      return true;
    }
    return pushShared();
  } catch (e) {
    setInfo({ status: "error", error: friendlyError(e) });
    return false;
  }
}

async function pushShared() {
  setInfo({ status: "saving", error: null, shared: true, email: SHARED_USERNAME_HE, userId: SHARED_USER_ID });
  try {
    await pushSharedCloud(getState());
    dirty = false;
    setInfo({ status: "synced", lastSyncedAt: Date.now(), error: null });
    return true;
  } catch (e) {
    setInfo({ status: "error", error: friendlyError(e) });
    return false;
  }
}

async function pull(userId: string) {
  if (info.shared) return pullShared();
  if (!getSupabaseEnv()) {
    setInfo({ status: "error", error: "סנכרון בענן לא מוגדר (חסרים משתני סביבה של Supabase)." });
    return false;
  }
  setInfo({ status: "loading", error: null });
  const { data, error } = await supabase
    .from("user_state")
    .select("state, updated_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) {
    const msg = friendlyError(error);
    console.error("[sync] pull failed", error);
    setInfo({ status: "error", error: msg });
    return false;
  }
  const remote = data?.state as AppState | undefined;
  if (remote && Array.isArray(remote.entries)) {
    if (!dirty) {
      suppress = true;
      actions.importState(remote);
      suppress = false;
    }
    dirty = false;
    setInfo({ status: "synced", lastSyncedAt: Date.now(), error: null });
    return true;
  }
  return push(userId);
}

async function push(userId: string) {
  if (info.shared) return pushShared();
  if (!getSupabaseEnv()) {
    setInfo({ status: "error", error: "סנכרון בענן לא מוגדר (חסרים משתני סביבה של Supabase)." });
    return false;
  }
  setInfo({ status: "saving", error: null });
  const { error } = await supabase.from("user_state").upsert(
    { user_id: userId, state: getState() as never, updated_at: new Date().toISOString() },
    { onConflict: "user_id" },
  );
  if (error) {
    const msg = friendlyError(error);
    console.error("[sync] push failed", error);
    setInfo({ status: "error", error: msg });
    return false;
  }
  dirty = false;
  setInfo({ status: "synced", lastSyncedAt: Date.now(), error: null });
  return true;
}

function schedulePush() {
  if (suppress || !info.userId) return;
  dirty = true;
  const userId = info.userId;
  if (timer) clearTimeout(timer);
  setInfo({ status: "saving", error: null });
  timer = setTimeout(() => void push(userId), 800);
}

function attach(session: Session | null) {
  if (hasSharedSession()) {
    attachSharedSession();
    return;
  }
  if (unsubscribeStore) {
    unsubscribeStore();
    unsubscribeStore = null;
  }
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  dirty = false;
  if (!session?.user) {
    setInfo({
      email: null,
      userId: null,
      status: "signed-out",
      lastSyncedAt: null,
      error: null,
      shared: false,
    });
    return;
  }
  setInfo({
    email: session.user.email ?? null,
    userId: session.user.id,
    status: "loading",
    error: null,
    shared: false,
  });
  void pull(session.user.id).then(() => {
    if (info.userId === session.user.id) unsubscribeStore = subscribeStore(schedulePush);
  });
}

export function attachSharedSession() {
  if (unsubscribeStore) {
    unsubscribeStore();
    unsubscribeStore = null;
  }
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  dirty = false;
  setInfo({
    email: SHARED_USERNAME_HE,
    userId: SHARED_USER_ID,
    status: "loading",
    error: null,
    shared: true,
  });
  void pullShared().then(() => {
    if (info.shared && info.userId === SHARED_USER_ID) {
      unsubscribeStore = subscribeStore(schedulePush);
    }
  });
}

export function startSync() {
  if (started || typeof window === "undefined") return;
  started = true;

  if (hasSharedSession()) {
    attachSharedSession();
    return;
  }

  if (!getSupabaseEnv()) {
    setInfo({
      email: null,
      userId: null,
      status: "signed-out",
      lastSyncedAt: null,
      error: null,
      shared: false,
    });
    return;
  }

  void supabase.auth
    .getSession()
    .then(({ data }) => attach(data.session))
    .catch((e) => {
      console.error("[sync] getSession failed", e);
      setInfo({ status: "error", error: friendlyError(e) });
    });

  try {
    supabase.auth.onAuthStateChange((_event, session) => attach(session));
  } catch (e) {
    console.error("[sync] onAuthStateChange failed", e);
  }

  const refresh = () => {
    if (!info.userId) return;
    if (dirty) void syncNow();
    else void pullNow();
  };
  window.addEventListener("focus", refresh);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") refresh();
  });
}

export async function syncNow(): Promise<boolean> {
  if (!info.userId) return false;
  return push(info.userId);
}
export async function pullNow(): Promise<boolean> {
  if (!info.userId) return false;
  return pull(info.userId);
}
export async function signOut() {
  if (info.shared || hasSharedSession()) {
    clearSharedSession();
    if (unsubscribeStore) {
      unsubscribeStore();
      unsubscribeStore = null;
    }
    setInfo({
      email: null,
      userId: null,
      status: "signed-out",
      lastSyncedAt: null,
      error: null,
      shared: false,
    });
    return;
  }
  if (!getSupabaseEnv()) return;
  await supabase.auth.signOut();
}
