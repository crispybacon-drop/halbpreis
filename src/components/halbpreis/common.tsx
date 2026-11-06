import { useState, type ReactNode } from "react";
import { usePrefs } from "@/lib/halbpreis/prefs";
import type { Deal } from "@/lib/halbpreis/types";
import { DealCard } from "./DealCard";
import { DealSheet } from "./DealSheet";

export function Chip({
  active,
  onClick,
  children,
  color,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  color?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-8 shrink-0 rounded-full border px-3 text-xs font-semibold transition-colors ${
        active ? "border-transparent text-white" : "bg-background text-foreground"
      }`}
      style={active ? { background: color ?? "#111" } : undefined}
    >
      {children}
    </button>
  );
}

export function ChipRow({ children }: { children: ReactNode }) {
  return <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 py-1">{children}</div>;
}

export function Loading() {
  return (
    <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-64 animate-pulse rounded-xl bg-muted" />
      ))}
    </div>
  );
}

export function LoadError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="p-8 text-center">
      <p className="font-semibold">Angebote konnten nicht geladen werden.</p>
      <p className="mt-1 text-sm text-muted-foreground">Prüfe die Internetverbindung.</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 h-10 rounded-lg bg-foreground px-4 text-sm font-semibold text-background"
      >
        Erneut versuchen
      </button>
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="px-4 py-10 text-center text-sm text-muted-foreground">{children}</p>;
}

/** Grid of deal cards with the detail sheet. Renders in steps to stay fast. */
export function DealGrid({
  deals,
  initial = 24,
  step = 48,
  showStore = false,
  className = "",
}: {
  deals: Deal[];
  initial?: number;
  step?: number;
  showStore?: boolean;
  className?: string;
}) {
  const p = usePrefs();
  const [limit, setLimit] = useState(initial);
  const [open, setOpen] = useState<Deal | null>(null);
  const shown = deals.slice(0, limit);
  return (
    <>
      <div className={`grid grid-cols-2 gap-3 sm:grid-cols-3 ${className}`}>
        {shown.map((d) => (
          <DealCard
            key={d.id}
            deal={d}
            fav={!!p.favs[d.id]}
            onOpen={setOpen}
            showStore={showStore}
          />
        ))}
      </div>
      {deals.length > limit && (
        <button
          type="button"
          onClick={() => setLimit((l) => l + step)}
          className="mt-3 h-11 w-full rounded-lg border text-sm font-semibold"
        >
          Mehr anzeigen ({deals.length - limit})
        </button>
      )}
      <DealSheet deal={open} onClose={() => setOpen(null)} />
    </>
  );
}
