/** Shared family account — UI credentials are fixed; mapped to Supabase under the hood. */

export const SHARED_USERNAME_HE = "דנה";
export const SHARED_USERNAME_EN = "DANA";
/** What the user types */
export const SHARED_PASSWORD_UI = "1234";

/** Internal Supabase email (not shown in UI) */
export const SHARED_EMAIL = "dana@fitrack.sync";
/**
 * Internal password — meets Supabase strength rules.
 * The UI still only asks for 1234; this value is never shown.
 */
export const SHARED_PASSWORD_INTERNAL = "FitTrack-Dana-Sync-9xK2!";

export function isSharedUsername(raw: string): boolean {
  const n = raw.trim().toLowerCase().replace(/\s+/g, "");
  return (
    n === "דנה" ||
    n === "dana" ||
    n === SHARED_USERNAME_EN.toLowerCase() ||
    n === "דנה"
  );
}

export function isSharedPassword(raw: string): boolean {
  return raw === SHARED_PASSWORD_UI;
}

export function displayNameForEmail(email: string | null | undefined): string {
  if (!email) return "דנה";
  if (email.toLowerCase() === SHARED_EMAIL) return SHARED_USERNAME_HE;
  return email;
}
