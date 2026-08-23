import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  SHARED_EMAIL,
  SHARED_PASSWORD_INTERNAL,
  SHARED_PASSWORD_UI,
  isSharedPassword,
  isSharedUsername,
} from "./sharedAccount";

const Input = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

function supabaseUrl() {
  return (
    process.env["SUPABASE_URL"] ||
    process.env["VITE_SUPABASE_URL"] ||
    "https://lwlvvcgufkdhuyhxhfdh.supabase.co"
  );
}

function publishableKey() {
  return (
    process.env["SUPABASE_PUBLISHABLE_KEY"] ||
    process.env["VITE_SUPABASE_PUBLISHABLE_KEY"] ||
    "sb_publishable_3YicPcpdjZZTShJVDJqthA_RLF1O5XX"
  );
}

function serviceRoleKey() {
  return (
    process.env["SUPABASE_SERVICE_ROLE_KEY"] ||
    process.env["SUPABASE_SECRET_KEY"] ||
    process.env["SERVICE_ROLE_KEY"] ||
    ""
  );
}

async function adminConfirmOrCreate() {
  const service = serviceRoleKey();
  if (!service) return { ok: false as const, reason: "no-service-role" as const };

  const base = supabaseUrl();
  // List users / create with email_confirm
  const createRes = await fetch(`${base}/auth/v1/admin/users`, {
    method: "POST",
    headers: {
      apikey: service,
      Authorization: `Bearer ${service}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: SHARED_EMAIL,
      password: SHARED_PASSWORD_INTERNAL,
      email_confirm: true,
      user_metadata: { name: "דנה", shared: true },
    }),
  });

  if (createRes.ok) return { ok: true as const };

  const body = (await createRes.json().catch(() => ({}))) as { msg?: string; message?: string };
  const msg = body.msg || body.message || "";
  // Already exists — try update to confirm
  if (/already|registered|exists/i.test(msg) || createRes.status === 422) {
    const listRes = await fetch(
      `${base}/auth/v1/admin/users?page=1&per_page=50`,
      {
        headers: { apikey: service, Authorization: `Bearer ${service}` },
      },
    );
    if (listRes.ok) {
      const list = (await listRes.json()) as {
        users?: { id: string; email?: string }[];
      };
      const user = list.users?.find((u) => u.email?.toLowerCase() === SHARED_EMAIL);
      if (user) {
        await fetch(`${base}/auth/v1/admin/users/${user.id}`, {
          method: "PUT",
          headers: {
            apikey: service,
            Authorization: `Bearer ${service}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email_confirm: true,
            password: SHARED_PASSWORD_INTERNAL,
          }),
        });
        return { ok: true as const };
      }
    }
  }
  return { ok: false as const, reason: "admin-failed" as const, detail: msg };
}

async function passwordGrant() {
  const base = supabaseUrl();
  const key = publishableKey();
  const res = await fetch(`${base}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      apikey: key,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: SHARED_EMAIL,
      password: SHARED_PASSWORD_INTERNAL,
    }),
  });
  const data = (await res.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    token_type?: string;
    user?: { id: string; email?: string };
    msg?: string;
    error_description?: string;
    error_code?: string;
  };
  if (!res.ok || !data.access_token || !data.refresh_token) {
    return {
      ok: false as const,
      message: data.msg || data.error_description || data.error_code || "ההתחברות נכשלה",
    };
  }
  return {
    ok: true as const,
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    user: data.user,
  };
}

/**
 * Shared login for דנה / 1234.
 * Ensures the backend user exists (when service role is available), then returns session tokens.
 */
export const sharedLogin = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data }) => {
    if (!isSharedUsername(data.username) || !isSharedPassword(data.password)) {
      return { ok: false as const, message: "שם משתמש או סיסמה שגויים" };
    }
    // Best-effort: confirm/create with service role if Lovable/Vercel injected it
    await adminConfirmOrCreate();

    let grant = await passwordGrant();
    if (!grant.ok) {
      // Try signup once (in case user was never created on this project)
      const key = publishableKey();
      const base = supabaseUrl();
      await fetch(`${base}/auth/v1/signup`, {
        method: "POST",
        headers: { apikey: key, "Content-Type": "application/json" },
        body: JSON.stringify({
          email: SHARED_EMAIL,
          password: SHARED_PASSWORD_INTERNAL,
        }),
      });
      await adminConfirmOrCreate();
      grant = await passwordGrant();
    }

    if (!grant.ok) {
      return {
        ok: false as const,
        message:
          grant.message === "Email not confirmed"
            ? "החשבון המשותף עדיין לא אושר בשרת. נסה שוב בעוד רגע, או פנה לתמיכה."
            : grant.message,
      };
    }

    return {
      ok: true as const,
      access_token: grant.access_token,
      refresh_token: grant.refresh_token,
      email: SHARED_EMAIL,
      displayName: "דנה",
    };
  });

// silence unused in client bundles
void SHARED_PASSWORD_UI;
