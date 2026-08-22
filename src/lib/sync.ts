import { useSyncExternalStore } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { actions, getState, subscribeStore } from "./store";
import type { AppState } from "./types";

export type SyncStatus = "signed-out" | "loading" | "synced" | "saving" | "error";

type SyncInfo = {
  email: string | null;
  userId: string | null;
  status: SyncStatus;
  lastSyncedAt: number | null;
};

let info: SyncInfo = { email: null, userId: null, status: "signed-out", lastSyncedAt: null };
const infoListeners = new Set<() => void>();
const serverInfo = info;

function setInfo(patch: Partial<SyncInfo>) {
  info = { ...info, ...patch };
  infoListeners.forEach((l) => l());
}

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

async function pull(userId: string) {
  setInfo({ status: "loading" });
  const { data, error } = await supabase
    .from("user_state")
    .select("data, updated_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("[sync] pull failed", error);
    setInfo({ status: "error" });
    return false;
  }

  const remote = data?.data as AppState | undefined;
  if (remote && Array.isArray(remote.entries)) {
    // Never replace newer local edits that have not reached the cloud yet.
    if (!dirty) {
      suppress = true;
      actions.importState(remote);
      suppress = false;
    }
    dirty = false;
    setInfo({ status: "synced", lastSyncedAt: Date.now() });
    return true;
  }

  return push(userId);
}

async function push(userId: string) {
  setInfo({ status: "saving" });
  const { error } = await supabase.from("user_state").upsert(
    {
      user_id: userId,
      data: getState() as never,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (error) {
    console.error("[sync] push failed", error);
    setInfo({ status: "error" });
    return false;
  }

  dirty = false;
  setInfo({ status: "synced", lastSyncedAt: Date.now() });
  return true;
}

function schedulePush() {
  if (suppress || !info.userId) return;
  dirty = true;
  const userId = info.userId;
  if (timer) clearTimeout(timer);
  setInfo({ status: "saving" });
  timer = setTimeout(() => void push(userId), 1200);
}

function attach(session: Session | null) {
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
    setInfo({ email: null, userId: null, status: "signed-out", lastSyncedAt: null });
    return;
  }

  setInfo({ email: session.user.email ?? null, userId: session.user.id, status: "loading" });
  void pull(session.user.id).then(() => {
    unsubscribeStore = subscribeStore(schedulePush);
  });
}

export function startSync() {
  if (started || typeof window === "undefined") return;
  started = true;

  void supabase.auth.getSession().then(({ data }) => attach(data.session));

  supabase.auth.onAuthStateChange((_event, session) => {
    attach(session);
  });

  // Refresh from the cloud when returning to the app on another device/tab.
  window.addEventListener("focus", () => {
    if (!info.userId) return;
    if (dirty) void syncNow();
    else void pullNow();
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState !== "visible" || !info.userId) return;
    if (dirty) void syncNow();
    else void pullNow();
  });
}

export async function syncNow() {
  if (!info.userId) return;
  await push(info.userId);
}

export async function pullNow() {
  if (!info.userId) return;
  await pull(info.userId);
}

export async function signOut() {
  await supabase.auth.signOut();
}
