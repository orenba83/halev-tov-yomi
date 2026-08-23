/** Shared family account — UI credentials are fixed. */

export const SHARED_USERNAME_HE = "דנה";
export const SHARED_USERNAME_EN = "DANA";
/** What the user types */
export const SHARED_PASSWORD_UI = "1234";

/** Internal Supabase email (not shown in UI) */
export const SHARED_EMAIL = "dana@fitrack.sync";
export const SHARED_PASSWORD_INTERNAL = "FitTrack-Dana-Sync-9xK2!";

/** Fixed synthetic user id for shared mode (local + custom cloud). */
export const SHARED_USER_ID = "00000000-0000-4000-a000-00000000dana";

const SESSION_KEY = "fitrack_shared_session_v1";

export function isSharedUsername(raw: string): boolean {
  const n = raw.trim().toLowerCase().replace(/\s+/g, "");
  return n === "דנה" || n === "dana" || n === SHARED_USERNAME_EN.toLowerCase();
}

export function isSharedPassword(raw: string): boolean {
  return raw === SHARED_PASSWORD_UI;
}

export function displayNameForEmail(email: string | null | undefined): string {
  if (!email) return SHARED_USERNAME_HE;
  if (email.toLowerCase() === SHARED_EMAIL) return SHARED_USERNAME_HE;
  if (email === SHARED_USERNAME_HE || email === "shared:dana") return SHARED_USERNAME_HE;
  return email;
}

export function setSharedSession(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(
    SESSION_KEY,
    JSON.stringify({ name: SHARED_USERNAME_HE, at: Date.now() }),
  );
}

export function clearSharedSession(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(SESSION_KEY);
}

export function hasSharedSession(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as { name?: string };
    return parsed?.name === SHARED_USERNAME_HE;
  } catch {
    return false;
  }
}
