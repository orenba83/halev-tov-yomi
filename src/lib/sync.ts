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
      return () => {
        infoListeners.delete(cb);
      };
    },
    () => info,
    () => serverInfo,
  );
}

let started = false;
let suppress = false;
let timer: ReturnType<typeof setTimeout> | null = null;
let unsubscribeStore: (() => void) | null = null;

async function pull(userId: string) {
  setInfo({ status: "loading" });
  const { data, error } = await supabase
    .from("user_state")
    .select("data")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    setInfo({ status: "error" });
    return;
  }

  const remote = data?.data as AppState | undefined;
  if (remote && Array.isArray((remote as AppState).entries)) {
    suppress = true;
    actions.importState(remote);
    suppress = false;
    setInfo({ status: "synced", lastSyncedAt: Date.now() });
  } else {
    await push(userId);
  }
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
  setInfo(error ? { status: "error" } : { status: "synced", lastSyncedAt: Date.now() });
}

function schedulePush() {
  if (suppress || !info.userId) return;
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

  if (!session?.user) {
    setInfo({ email: null, userId: null, status: "signed-out", lastSyncedAt: null });
    return;
  }

  setInfo({ email: session.user.email ?? null, userId: session.user.id, status: "loading" });
  void pull(session.user.id).then(() => {
    unsubscribeStore = subscribeStore(schedulePush);
  });
}

/** מפעיל סנכרון ענן: משיכה בעליית האפליקציה ודחיפה בכל שינוי */
export function startSync() {
  if (started || typeof window === "undefined") return;
  started = true;

  void supabase.auth.getSession().then(({ data }) => attach(data.session));

  supabase.auth.onAuthStateChange((event, session) => {
    if (event === "TOKEN_REFRESHED") return;
    attach(session);
  });
}

/** דחיפה מיידית (כפתור "סנכרן עכשיו") */
export async function syncNow() {
  if (!info.userId) return;
  await push(info.userId);
}

/** משיכה מחדש מהענן */
export async function pullNow() {
  if (!info.userId) return;
  await pull(info.userId);
}

export async function signOut() {
  await supabase.auth.signOut();
}
