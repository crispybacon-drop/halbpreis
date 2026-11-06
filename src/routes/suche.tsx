import { createFileRoute } from "@tanstack/react-router";
import { useDeferredValue, useMemo, useState } from "react";
import { Bell, Search, X } from "lucide-react";
import { AppShell } from "@/components/halbpreis/AppShell";
import { Chip, ChipRow, DealGrid, Empty, Loading, LoadError } from "@/components/halbpreis/common";
import { byDiscount, byPrice, matches, useVisibleDeals } from "@/lib/halbpreis/data";
import { STORES } from "@/lib/halbpreis/meta";
import { prefs, usePrefs } from "@/lib/halbpreis/prefs";
import type { StoreId } from "@/lib/halbpreis/types";

export const Route = createFileRoute("/suche")({
  head: () => ({ meta: [{ title: "Suche · Halbpreis" }] }),
  component: Suche,
});

function Suche() {
  const { data, deals, isLoading, isError, refetch } = useVisibleDeals();
  const p = usePrefs();
  const [q, setQ] = useState("");
  const [store, setStore] = useState<StoreId | null>(null);
  const [sort, setSort] = useState<"preis" | "rabatt">("preis");
  const query = useDeferredValue(q);

  const results = useMemo(() => {
    if (query.trim().length < 2) return [];
    return deals
      .filter((d) => (!store || d.store === store) && matches(d, query))
      .sort(sort === "preis" ? byPrice : byDiscount);
  }, [deals, query, store, sort]);

  const already = p.watches.some(
    (w) => w.kind === "keyword" && w.query.toLowerCase() === q.trim().toLowerCase(),
  );

  return (
    <AppShell title="Suche">
      <div className="sticky top-14 z-20 space-y-2 border-b bg-background/95 px-4 py-3 backdrop-blur">
        <label className="flex h-11 items-center gap-2 rounded-xl border px-3">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            autoFocus
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Produkt, Marke …"
            className="w-full bg-transparent text-base outline-none"
          />
          {q && (
            <button type="button" aria-label="Leeren" onClick={() => setQ("")}>
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </label>
        <ChipRow>
          <Chip active={!store} onClick={() => setStore(null)}>
            Alle
          </Chip>
          {STORES.filter((s) => !p.hiddenStores.includes(s.id)).map((s) => (
            <Chip
              key={s.id}
              active={store === s.id}
              color={s.color}
              onClick={() => setStore(store === s.id ? null : s.id)}
            >
              {s.name}
            </Chip>
          ))}
        </ChipRow>
      </div>

      {isLoading && <Loading />}
      {isError && <LoadError onRetry={() => refetch()} />}

      {data && query.trim().length >= 2 && (
        <div className="px-4 pt-3">
          <div className="mb-3 flex items-center justify-between gap-2">
            <span className="text-sm text-muted-foreground">{results.length} Treffer</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSort(sort === "preis" ? "rabatt" : "preis")}
                className="h-8 rounded-lg border px-3 text-xs font-semibold"
              >
                {sort === "preis" ? "Günstigste zuerst" : "Höchster Rabatt zuerst"}
              </button>
              <button
                type="button"
                disabled={already}
                onClick={() => prefs.addKeywordWatch(q, { stores: store ? [store] : [] })}
                className="flex h-8 items-center gap-1.5 rounded-lg bg-foreground px-3 text-xs font-semibold text-background disabled:opacity-40"
              >
                <Bell className="h-3.5 w-3.5" />
                {already ? "Alarm aktiv" : "Alarm"}
              </button>
            </div>
          </div>
          {results.length ? (
            <DealGrid key={`${query}-${store}-${sort}`} deals={results} showStore />
          ) : (
            <Empty>
              Diese Woche nichts zu «{query.trim()}» im Angebot. Mit «Alarm» meldet sich die App,
              sobald es auftaucht.
            </Empty>
          )}
        </div>
      )}
    </AppShell>
  );
}
