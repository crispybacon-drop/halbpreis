import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { Bell, ChevronRight } from "lucide-react";
import { AppShell } from "@/components/halbpreis/AppShell";
import { DealGrid, Loading, LoadError } from "@/components/halbpreis/common";
import { byDiscount, useHits, useVisibleDeals } from "@/lib/halbpreis/data";
import { STORES } from "@/lib/halbpreis/meta";
import { stamp } from "@/lib/halbpreis/format";
import { usePrefs } from "@/lib/halbpreis/prefs";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Halbpreis" }] }),
  component: Start,
});

function Start() {
  const { data, deals, isLoading, isError, refetch } = useVisibleDeals();
  const { hits, unseen } = useHits();
  const p = usePrefs();

  const perStore = useMemo(
    () =>
      STORES.filter((s) => !p.hiddenStores.includes(s.id)).map((s) => {
        const list = deals.filter((d) => d.store === s.id);
        return {
          ...s,
          count: list.length,
          best: list.reduce((m, d) => Math.max(m, d.pct ?? 0), 0),
        };
      }),
    [deals, p.hiddenStores],
  );
  const top = useMemo(
    () =>
      deals
        .filter((d) => d.pct)
        .sort(byDiscount)
        .slice(0, 6),
    [deals],
  );

  return (
    <AppShell title="Halbpreis">
      <div className="space-y-6 p-4">
        <Link
          to="/angebote"
          className="flex h-16 items-center justify-between rounded-2xl bg-[#E3000F] px-5 text-white shadow-sm active:scale-[0.99]"
        >
          <span className="text-lg font-extrabold">Rabatt-Übersicht</span>
          <span className="flex items-center gap-1 text-sm font-semibold tabular-nums">
            {data ? `${deals.length} Angebote` : ""}
            <ChevronRight className="h-5 w-5" />
          </span>
        </Link>

        {data && (
          <p className="-mt-3 text-xs text-muted-foreground">Stand {stamp(data.generatedAt)}</p>
        )}

        {isLoading && <Loading />}
        {isError && <LoadError onRetry={() => refetch()} />}

        {hits.length > 0 && (
          <Link
            to="/merkliste"
            search={{ tab: "alarme" }}
            className="flex items-center gap-3 rounded-xl border p-3"
          >
            <Bell className="h-5 w-5 shrink-0" />
            <span className="flex-1 text-sm">
              <span className="font-semibold">{hits.length} Alarm-Treffer</span>
              {unseen.length > 0 && <span className="text-[#E3000F]"> · {unseen.length} neu</span>}
            </span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>
        )}

        {data && (
          <section>
            <h2 className="mb-2 text-sm font-semibold text-muted-foreground">Läden</h2>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              {perStore.map((s) => (
                <Link
                  key={s.id}
                  to="/angebote"
                  hash={s.id}
                  className="flex flex-col rounded-xl p-3"
                  style={{ background: s.color, color: s.on }}
                >
                  <span className="text-base font-extrabold">{s.name}</span>
                  <span className="text-xs opacity-90">
                    {s.count} Angebote{s.best ? ` · bis −${s.best}%` : ""}
                  </span>
                  {data.stores[s.id] && !data.stores[s.id]!.ok && (
                    <span className="mt-1 text-[10px] font-semibold opacity-90">nicht aktuell</span>
                  )}
                </Link>
              ))}
            </div>
          </section>
        )}

        {top.length > 0 && (
          <section>
            <h2 className="mb-2 text-sm font-semibold text-muted-foreground">Höchste Rabatte</h2>
            <DealGrid deals={top} initial={6} showStore />
          </section>
        )}
      </div>
    </AppShell>
  );
}
