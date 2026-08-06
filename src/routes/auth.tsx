import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CloudUpload, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/Stat";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "התחברות וסנכרון — פיטראק" },
      {
        name: "description",
        content: "התחברות עם חשבון גוגל או אימייל כדי לסנכרן את נתוני התזונה והאימונים בין כל המכשירים.",
      },
      { property: "og:title", content: "התחברות וסנכרון — פיטראק" },
      { property: "og:description", content: "סנכרון נתוני היומן בין הטלפון למחשב." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
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
  }, [navigate]);

  const google = async () => {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setBusy(false);
      toast.error("ההתחברות עם גוגל נכשלה");
      return;
    }
    if (result.redirected) return;
    toast.success("התחברת בהצלחה");
    void navigate({ to: "/settings" });
  };

  const withEmail = async () => {
    if (!email.trim() || password.length < 6) {
      toast.error("יש להזין אימייל וסיסמה באורך 6 תווים לפחות");
      return;
    }
    setBusy(true);
    const fn =
      mode === "signin"
        ? supabase.auth.signInWithPassword({ email: email.trim(), password })
        : supabase.auth.signUp({
            email: email.trim(),
            password,
            options: { emailRedirectTo: window.location.origin },
          });
    const { data, error } = await fn;
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (mode === "signup" && !data.session) {
      toast.success("נשלח אלייך מייל אישור — יש ללחוץ על הקישור כדי להשלים את ההרשמה");
      return;
    }
    toast.success("התחברת בהצלחה");
    void navigate({ to: "/settings" });
  };

  return (
    <div className="mx-auto max-w-md space-y-4">
      <header className="text-center">
        <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-3xl bg-primary/10 text-primary">
          <CloudUpload className="size-7" />
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight">סנכרון בענן</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          התחברי כדי שכל הנתונים יסתנכרנו אוטומטית בין הטלפון למחשב
        </p>
      </header>

      <Card className="space-y-4">
        <Button className="w-full rounded-full" onClick={google} disabled={busy}>
          המשך עם גוגל
        </Button>

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" /> או באמצעות אימייל{" "}
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
          />
        </div>
        <div className="space-y-1.5">
          <Label>סיסמה</Label>
          <Input
            type="password"
            dir="ltr"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <Button variant="outline" className="w-full rounded-full" onClick={withEmail} disabled={busy}>
          <Mail className="size-4" /> {mode === "signin" ? "התחברות" : "הרשמה"}
        </Button>

        <button
          className="w-full text-center text-xs text-muted-foreground underline"
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
        >
          {mode === "signin" ? "אין לי חשבון — הרשמה" : "יש לי כבר חשבון — התחברות"}
        </button>
      </Card>
    </div>
  );
}
