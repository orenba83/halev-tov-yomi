import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CloudUpload, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/Stat";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "התחברות וסנכרון — פיטראק" },
      { name: "description", content: "התחברות עם חשבון גוגל או אימייל כדי לסנכרן את הנתונים בין כל המכשירים." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) void navigate({ to: "/settings" });
    });
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && ["SIGNED_IN", "INITIAL_SESSION"].includes(event)) {
        void navigate({ to: "/settings" });
      }
    });
    return () => listener.subscription.unsubscribe();
  }, [navigate]);

  const withEmail = async () => {
    if (!email.trim() || password.length < 6) {
      toast.error("יש להזין אימייל וסיסמה באורך 6 תווים לפחות");
      return;
    }
    setBusy(true);
    try {
      const result = mode === "signin"
        ? await supabase.auth.signInWithPassword({ email: email.trim(), password })
        : await supabase.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: `${window.location.origin}/auth` } });
      if (result.error) throw result.error;
      if (mode === "signup" && !result.data.session) {
        toast.success("נשלח מייל אישור. לאחר האישור אפשר להתחבר עם אותו אימייל וסיסמה.");
        return;
      }
      toast.success("התחברת בהצלחה");
      void navigate({ to: "/settings" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "ההתחברות נכשלה");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-md space-y-4">
      <header className="text-center">
        <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-3xl bg-primary/10 text-primary"><CloudUpload className="size-7" /></div>
        <h1 className="text-2xl font-extrabold tracking-tight">סנכרון בענן</h1>
        <p className="mt-1 text-sm text-muted-foreground">התחברות עם אימייל מאפשרת סנכרון אוטומטי בין הטלפון למחשב.</p>
      </header>
      <Card className="space-y-4">
        <div className="rounded-2xl bg-muted/50 p-3 text-center text-sm text-muted-foreground">
          התחברות עם Google זמינה רק לאחר שה־Google OAuth מוגדר בשרת. עד אז אפשר להשתמש באימייל — ללא צורך בהגדרה נוספת.
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" /> התחברות באמצעות אימייל <span className="h-px flex-1 bg-border" /></div>
        <div className="space-y-1.5"><Label>אימייל</Label><Input type="email" dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" autoComplete="email" /></div>
        <div className="space-y-1.5"><Label>סיסמה</Label><Input type="password" dir="ltr" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === "signin" ? "current-password" : "new-password"} /></div>
        <Button className="w-full rounded-full" onClick={withEmail} disabled={busy}><Mail className="size-4" /> {mode === "signin" ? "התחברות" : "הרשמה"}</Button>
        <button className="w-full text-center text-xs text-muted-foreground underline" onClick={() => setMode(mode === "signin" ? "signup" : "signin")}>
          {mode === "signin" ? "אין לי חשבון — הרשמה" : "יש לי כבר חשבון — התחברות"}
        </button>
      </Card>
    </div>
  );
}
