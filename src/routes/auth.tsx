import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CloudUpload, LogIn, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/Stat";
import { getSupabaseEnv, supabase } from "@/integrations/supabase/client";
import { sharedLogin } from "@/lib/sharedAuth.functions";
import {
  SHARED_PASSWORD_UI,
  SHARED_USERNAME_HE,
  isSharedPassword,
  isSharedUsername,
} from "@/lib/sharedAccount";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "התחברות וסנכרון — פיטראק" },
      {
        name: "description",
        content: "התחברות עם חשבון משותף כדי לסנכרן נתונים בין כל המכשירים.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState(SHARED_USERNAME_HE);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const configured = typeof window !== "undefined" ? !!getSupabaseEnv() : true;

  useEffect(() => {
    if (!getSupabaseEnv()) return;

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

  const login = async () => {
    if (!configured) {
      toast.error("סנכרון בענן לא מוגדר");
      return;
    }
    if (!isSharedUsername(username) || !isSharedPassword(password)) {
      toast.error(`יש להזין ${SHARED_USERNAME_HE} וסיסמה ${SHARED_PASSWORD_UI}`);
      return;
    }
    setBusy(true);
    try {
      const result = await sharedLogin({
        data: { username: username.trim(), password },
      });

      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      const { error } = await supabase.auth.setSession({
        access_token: result.access_token,
        refresh_token: result.refresh_token,
      });
      if (error) throw error;

      toast.success("התחברת כ־דנה — הסנכרון בין המכשירים פעיל");
      void navigate({ to: "/settings" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "ההתחברות נכשלה");
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
        <h1 className="text-2xl font-extrabold tracking-tight">סנכרון בין מכשירים</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          התחברות עם החשבון המשותף — אותם נתונים בטלפון ובמחשב.
        </p>
      </header>

      {!configured && (
        <Card className="space-y-2 border-destructive/40 bg-destructive/5">
          <div className="flex items-start gap-2 text-sm">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
            <p className="font-medium text-destructive">סנכרון בענן לא מוגדר בסביבה הזו</p>
          </div>
        </Card>
      )}

      <Card className="space-y-4">
        <p className="text-xs text-muted-foreground">
          שם משתמש: <b>דנה</b> (או DANA) · סיסמה: <b dir="ltr">1234</b>
        </p>

        <div className="space-y-1.5">
          <Label>שם משתמש</Label>
          <Input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="דנה"
            autoComplete="username"
            disabled={!configured || busy}
            onKeyDown={(e) => e.key === "Enter" && void login()}
          />
        </div>
        <div className="space-y-1.5">
          <Label>סיסמה</Label>
          <Input
            type="password"
            dir="ltr"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="1234"
            autoComplete="current-password"
            disabled={!configured || busy}
            onKeyDown={(e) => e.key === "Enter" && void login()}
          />
        </div>
        <Button className="w-full rounded-full" onClick={() => void login()} disabled={busy || !configured}>
          <LogIn className="size-4" />
          {busy ? "מתחבר…" : "התחברות וסנכרון"}
        </Button>
      </Card>
    </div>
  );
}
