/** Family accounts — each user has separate local + cloud data. */

export const SHARED_USERNAME_HE = "דנה";
export const SHARED_USERNAME_EN = "DANA";
export const OREN_USERNAME_HE = "אורן";
export const OREN_USERNAME_EN = "OREN";

/** What the user types */
export const SHARED_PASSWORD_UI = "1234";

/** Internal Supabase email (legacy single account; still used for optional Supabase path) */
export const SHARED_EMAIL = "dana@fitrack.sync";
export const SHARED_PASSWORD_INTERNAL = "FitTrack-Dana-Sync-9xK2!";

export const DANA_USER_ID = "00000000-0000-4000-a000-00000000dana";
export const OREN_USER_ID = "00000000-0000-4000-a000-00000000oren";
/** @deprecated use getActiveUserId() */
export const SHARED_USER_ID = DANA_USER_ID;

const SESSION_KEY = "fitrack_shared_session_v1";

function norm(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, "");
}

export function isSharedUsername(raw: string): boolean {
  const n = norm(raw);
  return (
    n === "דנה" ||
    n === "dana" ||
    n === SHARED_USERNAME_EN.toLowerCase() ||
    n === "אורן" ||
    n === "oren" ||
    n === OREN_USERNAME_EN.toLowerCase()
  );
}

export function isOrenUsername(raw: string): boolean {
  const n = norm(raw);
  return n === "אורן" || n === "oren" || n === OREN_USERNAME_EN.toLowerCase();
}

export function isSharedPassword(raw: string): boolean {
  return raw === SHARED_PASSWORD_UI;
}

export function displayNameFromUsername(raw: string): string {
  return isOrenUsername(raw) ? OREN_USERNAME_HE : SHARED_USERNAME_HE;
}

export function userIdForDisplayName(name: string | null | undefined): string {
  return name === OREN_USERNAME_HE ? OREN_USER_ID : DANA_USER_ID;
}

export function storageKeyForUser(name: string | null | undefined): string {
  return name === OREN_USERNAME_HE ? "fitrack-state-v2-oren" : "fitrack-state-v2-dana";
}

export function cloudCacheKeyForUser(name: string | null | undefined): string {
  return name === OREN_USERNAME_HE
    ? "fitrack_shared_cloud_cache_v1_oren"
    : "fitrack_shared_cloud_cache_v1_dana";
}

export function getActiveUserId(): string {
  return userIdForDisplayName(getActiveDisplayName());
}

export function displayNameForEmail(email: string | null | undefined): string {
  if (!email) return getActiveDisplayName() || SHARED_USERNAME_HE;
  if (email.toLowerCase() === SHARED_EMAIL) return getActiveDisplayName() || SHARED_USERNAME_HE;
  if (email === SHARED_USERNAME_HE || email === "shared:dana") return SHARED_USERNAME_HE;
  if (email === OREN_USERNAME_HE || email === "shared:oren") return OREN_USERNAME_HE;
  return email;
}

export function setSharedSession(displayName: string = SHARED_USERNAME_HE): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(
    SESSION_KEY,
    JSON.stringify({ name: displayName, at: Date.now() }),
  );
}

export function clearSharedSession(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(SESSION_KEY);
}

export function getActiveDisplayName(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { name?: string };
    return parsed?.name ?? null;
  } catch {
    return null;
  }
}

export function hasSharedSession(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as { name?: string };
    const name = parsed?.name ?? "";
    return name === SHARED_USERNAME_HE || name === OREN_USERNAME_HE;
  } catch {
    return false;
  }
}
