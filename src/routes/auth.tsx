import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CloudUpload, Mail, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/Stat";
import { getSupabaseEnv, supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "התחברות וסנכרון — פיטראק" },
      {
        name: "description",
        content: "התחברות עם חשבון גוגל או אימייל כדי לסנכרן את הנתונים בין כל המכשירים.",
      },
    ],
  }),
  component: AuthPage,
});

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

function errorText(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error) {
    const o = error as { msg?: string; message?: string; error_description?: string };
    return o.msg || o.message || o.error_description || "ההתחברות נכשלה";
  }
  return String(error ?? "ההתחברות נכשלה");
}

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const configured = typeof window !== "undefined" ? !!getSupabaseEnv() : true;

  useEffect(() => {
    if (!getSupabaseEnv()) return;

    // OAuth / magic-link return may put tokens in the URL hash
    if (typeof window !== "undefined" && window.location.hash.includes("access_token")) {
      toast.success("התחברת בהצלחה");
    }

    let unsub: (() => void) | undefined;
    void (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          void navigate({ to: "/settings" });
          return;
        }
        const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
          if (session && ["SIGNED_IN", "INITIAL_SESSION", "TOKEN_REFRESHED"].includes(event)) {
            void navigate({ to: "/settings" });
          }
        });
        unsub = () => listener.subscription.unsubscribe();
      } catch (e) {
        console.error("[auth] session check failed", e);
      }
    })();

    return () => unsub?.();
  }, [navigate]);

  const withGoogle = async () => {
    if (!getSupabaseEnv()) {
      toast.error("סנכרון בענן לא מוגדר");
      return;
    }
    setBusy(true);
    setHint(null);
    try {
      // Lovable Cloud Auth owns the Google client secret in Lovable-hosted builds.
      const lovableResult = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: `${window.location.origin}/auth`,
      });

      if (lovableResult.redirected) return;

      if (!lovableResult.error) {
        toast.success("התחברת בהצלחה");
        void navigate({ to: "/settings" });
        return;
      }

      const lovableMsg = errorText(lovableResult.error);
      console.warn("[auth] Lovable Google:", lovableMsg);

      // Native Supabase only works when Google Client Secret is set in the dashboard.
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth`,
          queryParams: { prompt: "select_account" },
        },
      });
      if (error) throw error;
    } catch (error) {
      const message = errorText(error);
      if (/missing OAuth secret|Unsupported provider/i.test(message)) {
        setHint(
          "Google עדיין לא מוגדר במלואו בשרת (חסר Client Secret ב-Supabase). אפשר להתחבר עם אימייל, או להשתמש בגרסה המפורסמת ב-Lovable שם Google כבר עובד.",
        );
        toast.error("התחברות Google לא זמינה בסביבה הזו");
      } else {
        toast.error(message);
      }
      setBusy(false);
    }
  };

  const withEmail = async () => {
    if (!getSupabaseEnv()) {
      toast.error("סנכרון בענן לא מוגדר");
      return;
    }
    if (!email.trim() || password.length < 6) {
      toast.error("יש להזין אימייל וסיסמה באורך 6 תווים לפחות");
      return;
    }
    setBusy(true);
    setHint(null);
    try {
      const result =
        mode === "signin"
          ? await supabase.auth.signInWithPassword({ email: email.trim(), password })
          : await supabase.auth.signUp({
              email: email.trim(),
              password,
              options: { emailRedirectTo: `${window.location.origin}/auth` },
            });
      if (result.error) throw result.error;
      if (mode === "signup" && !result.data.session) {
        toast.success("נשלח מייל אישור. לאחר האישור אפשר להתחבר עם אותו אימייל וסיסמה.");
        return;
      }
      toast.success("התחברת בהצלחה");
      void navigate({ to: "/settings" });
    } catch (error) {
      toast.error(errorText(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-md space-y-4">
      <header className="text-center">
        <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-3xl bg-primary/10 text-primary">
          <CloudUpload className="size-7" />
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight">סנכרון בענן</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          התחברות עם Google או אימייל מאפשרת סנכרון אוטומטי בין הטלפון למחשב.
        </p>
      </header>

      {!configured && (
        <Card className="space-y-2 border-destructive/40 bg-destructive/5">
          <div className="flex items-start gap-2 text-sm">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
            <div>
              <p className="font-medium text-destructive">סנכרון בענן לא מוגדר בסביבה הזו</p>
              <p className="mt-1 text-xs text-muted-foreground">
                חסרים משתני הסביבה של Supabase.
              </p>
            </div>
          </div>
        </Card>
      )}

      {hint && (
        <Card className="space-y-1 border-amber-500/40 bg-amber-500/5 text-sm">
          <p className="font-medium">טיפ להתחברות</p>
          <p className="text-xs text-muted-foreground">{hint}</p>
        </Card>
      )}

      <Card className="space-y-4">
        <Button
          type="button"
          variant="outline"
          className="w-full rounded-full gap-2 border-border bg-background hover:bg-accent"
          onClick={withGoogle}
          disabled={busy || !configured}
        >
          <GoogleIcon className="size-5" />
          התחברות עם Google
        </Button>

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          או עם אימייל
          <span className="h-px flex-1 bg-border" />
        </div>

        <div className="space-y-1.5">
          <Label>אימייל</Label>
          <Input
            type="email"
            dir="ltr"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
            autoComplete="email"
            disabled={!configured}
          />
        </div>
        <div className="space-y-1.5">
          <Label>סיסמה</Label>
          <Input
            type="password"
            dir="ltr"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            disabled={!configured}
          />
        </div>
        <Button className="w-full rounded-full" onClick={withEmail} disabled={busy || !configured}>
          <Mail className="size-4" />
          {mode === "signin" ? "התחברות" : "הרשמה"}
        </Button>
        <button
          type="button"
          className="w-full text-center text-xs text-muted-foreground underline disabled:opacity-50"
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          disabled={!configured}
        >
          {mode === "signin" ? "אין לי חשבון — הרשמה" : "יש לי כבר חשבון — התחברות"}
        </button>
      </Card>
    </div>
  );
}
