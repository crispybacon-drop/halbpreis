import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Percent, Search, Star, Settings } from "lucide-react";
import type { ReactNode } from "react";
import { useHits } from "@/lib/halbpreis/data";

const NAV = [
  { to: "/", label: "Start", icon: Home },
  { to: "/angebote", label: "Angebote", icon: Percent },
  { to: "/suche", label: "Suche", icon: Search },
  { to: "/merkliste", label: "Merkliste", icon: Star },
  { to: "/einstellungen", label: "Einstellungen", icon: Settings },
] as const;

export function AppShell({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { unseen } = useHits();

  return (
    <div className="mx-auto flex min-h-dvh max-w-3xl flex-col bg-background">
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-background/95 px-4 backdrop-blur">
        <h1 className="text-lg font-bold tracking-tight">{title}</h1>
        {action}
      </header>
      <main className="flex-1 pb-24">{children}</main>
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur pb-[env(safe-area-inset-bottom)]">
        <ul className="mx-auto grid max-w-3xl grid-cols-5">
          {NAV.map(({ to, label, icon: Icon }) => {
            const active = to === "/" ? path === "/" : path.startsWith(to);
            return (
              <li key={to}>
                <Link
                  to={to}
                  className={`relative flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium ${
                    active ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  <Icon className="h-5 w-5" strokeWidth={active ? 2.4 : 1.8} />
                  {label}
                  {to === "/merkliste" && unseen.length > 0 && (
                    <span className="absolute right-[calc(50%-18px)] top-2 min-w-4 rounded-full bg-[#E3000F] px-1 text-center text-[10px] font-bold leading-4 text-white">
                      {unseen.length > 99 ? "99+" : unseen.length}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
