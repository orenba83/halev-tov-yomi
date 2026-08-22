import { Link, useRouterState } from "@tanstack/react-router";
import { Activity, Bot, KeyRound, LayoutDashboard, LineChart, Moon, Settings, Sun, UtensilsCrossed } from "lucide-react";
import type { ReactNode } from "react";
import { actions, useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { FabMenu } from "./FabMenu";

const NAV = [
  { to: "/", label: "בית", icon: LayoutDashboard },
  { to: "/log", label: "יומן", icon: UtensilsCrossed },
  { to: "/progress", label: "התקדמות", icon: LineChart },
  { to: "/advisor", label: "יועץ AI", icon: Bot },
  { to: "/settings", label: "הגדרות", icon: Settings },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const { settings } = useStore();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const inSettings = pathname === "/settings" || pathname === "/ai-settings";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border/70 bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-5xl items-center gap-3 px-4">
          <div className="flex min-w-0 items-center gap-2">
            <span className="grid size-9 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground"><Activity className="size-5" /></span>
            <span className="truncate text-lg font-extrabold tracking-tight">פיטראק</span>
          </div>
          <nav className="mr-auto hidden items-center gap-1 md:flex">
            {NAV.map((item) => <Link key={item.to} to={item.to} className={cn("rounded-full px-3.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground", pathname === item.to && "bg-accent text-accent-foreground")}>{item.label}</Link>)}
          </nav>
          <button aria-label="החלפת מצב תצוגה" onClick={() => actions.updateSettings({ theme: settings.theme === "dark" ? "light" : "dark" })} className="mr-auto grid size-9 shrink-0 place-items-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground md:mr-0">
            {settings.theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </button>
        </div>
        {inSettings && (
          <div className="border-t border-border/50 bg-muted/20">
            <div className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-4 py-2">
              <Link to="/settings" className={cn("inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium", pathname === "/settings" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground")}>
                <Settings className="size-3.5" /> הגדרות כלליות
              </Link>
              <Link to="/ai-settings" className={cn("inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium", pathname === "/ai-settings" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground")}>
                <KeyRound className="size-3.5" /> AI ו־API
              </Link>
            </div>
          </div>
        )}
      </header>
      <main className="mx-auto w-full max-w-5xl px-4 pt-5 pb-44 md:pb-28">{children}</main>
      <FabMenu />
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border/70 bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden">
        <div className="mx-auto grid max-w-5xl grid-cols-5">
          {NAV.map((item) => { const active = pathname === item.to; return <Link key={item.to} to={item.to} className={cn("flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition-colors", active ? "text-primary" : "text-muted-foreground")}><item.icon className={cn("size-5", active && "stroke-[2.5]")} />{item.label}</Link>; })}
        </div>
      </nav>
    </div>
  );
}
