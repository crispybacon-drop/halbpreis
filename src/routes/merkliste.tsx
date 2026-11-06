import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Bell, Trash2 } from "lucide-react";
import { AppShell } from "@/components/halbpreis/AppShell";
import { DealGrid, Empty } from "@/components/halbpreis/common";
import { DealSheet } from "@/components/halbpreis/DealSheet";
import { PctBadge, Price, StoreTag } from "@/components/halbpreis/DealCard";
import { useDeals, useHits } from "@/lib/halbpreis/data";
import { STORE } from "@/lib/halbpreis/meta";
import { chf } from "@/lib/halbpreis/format";
import { prefs } from "@/lib/halbpreis/prefs";
import type { Deal, Watch } from "@/lib/halbpreis/types";

type Tab = "favoriten" | "alarme";

export const Route = createFileRoute("/merkliste")({
  validateSearch: (s: Record<string, unknown>): { tab?: Tab } =>
    s["tab"] === "alarme" ? { tab: "alarme" } : {},
  head: () => ({ meta: [{ title: "Merkliste · Halbpreis" }] }),
  component: Merkliste,
});

function Merkliste() {
  const { tab = "favoriten" } = Route.useSearch();
  const navigate = useNavigate({ from: "/merkliste" });
  const { data } = useDeals();
  const { hits, unseen, prefs: p } = useHits();
  const [open, setOpen] = useState<Deal | null>(null);

  const byId = useMemo(() => new Map((data?.deals ?? []).map((d) => [d.id, d])), [data]);
  const favs = Object.values(p.favs).sort((a, b) => b.addedAt.localeCompare(a.addedAt));
  const onOffer = favs.map((f) => byId.get(f.id)).filter(Boolean) as Deal[];
  const notOnOffer = favs.filter((f) => !byId.has(f.id));

  // Opening the alarm tab marks the current hits as seen.
  useEffect(() => {
    if (tab === "alarme" && unseen.length) prefs.markSeen(unseen.map((h) => h.key));
  }, [tab, unseen]);

  const setTab = (t: Tab) =>
    navigate({ search: t === "alarme" ? { tab: "alarme" } : {}, replace: true });

  return (
    <AppShell title="Merkliste">
      <div className="sticky top-14 z-20 border-b bg-background/95 px-4 py-2 backdrop-blur">
        <div className="grid grid-cols-2 rounded-lg border p-0.5">
          {(["favoriten", "alarme"] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`h-9 rounded-md text-sm font-semibold ${tab === t ? "bg-foreground text-background" : ""}`}
            >
              {t === "favoriten" ? `Favoriten (${favs.length})` : `Alarme (${p.watches.length})`}
            </button>
          ))}
        </div>
      </div>

      {tab === "favoriten" && (
        <div className="space-y-5 p-4">
          {!favs.length && (
            <Empty>Tippe auf den Stern bei einem Angebot, um es hier zu sammeln.</Empty>
          )}
          {onOffer.length > 0 && (
            <section>
              <h2 className="mb-2 text-sm font-semibold text-muted-foreground">
                Aktuell im Angebot
              </h2>
              <DealGrid deals={onOffer} showStore initial={48} />
            </section>
          )}
          {notOnOffer.length > 0 && (
            <section>
              <h2 className="mb-2 text-sm font-semibold text-muted-foreground">
                Gerade nicht im Angebot
              </h2>
              <ul className="divide-y rounded-xl border">
                {notOnOffer.map((f) => (
                  <li key={f.id} className="flex items-center gap-3 p-2.5">
                    <div className="h-12 w-12 shrink-0 bg-white">
                      {f.img && (
                        <img
                          src={f.img}
                          alt=""
                          loading="lazy"
                          className="h-full w-full object-contain"
                        />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <StoreTag store={f.store} />
                      <p className="truncate text-sm font-medium">{f.name}</p>
                      {f.price !== null && (
                        <p className="text-xs text-muted-foreground">zuletzt {chf(f.price)}</p>
                      )}
                    </div>
                    <button
                      type="button"
                      aria-label="Entfernen"
                      onClick={() => prefs.removeFav(f.id)}
                      className="p-2 text-muted-foreground"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}

      {tab === "alarme" && (
        <div className="space-y-3 p-4">
          {!p.watches.length && (
            <Empty>
              Setze einen Preisalarm im Angebot selbst oder suche nach einem Begriff und tippe auf
              «Alarm».
            </Empty>
          )}
          {p.watches.map((w) => (
            <WatchRow
              key={w.id}
              watch={w}
              deals={hits.filter((h) => h.watch.id === w.id).map((h) => h.deal)}
              onOpen={setOpen}
            />
          ))}
        </div>
      )}
      <DealSheet deal={open} onClose={() => setOpen(null)} />
    </AppShell>
  );
}

function WatchRow({
  watch,
  deals,
  onOpen,
}: {
  watch: Watch;
  deals: Deal[];
  onOpen: (d: Deal) => void;
}) {
  const title =
    watch.kind === "product"
      ? watch.name
      : `«${watch.query}»${watch.stores.length ? ` bei ${watch.stores.map((s) => STORE[s].name).join(", ")}` : ""}`;
  const condition =
    watch.kind === "product"
      ? watch.target !== null
        ? `${STORE[watch.store].name} · höchstens CHF ${chf(watch.target)}`
        : `${STORE[watch.store].name} · sobald im Angebot`
      : [
          watch.maxPrice !== null ? `höchstens CHF ${chf(watch.maxPrice)}` : null,
          watch.minPct !== null ? `ab ${watch.minPct}%` : null,
        ]
          .filter(Boolean)
          .join(" · ") || "jedes Angebot";
  const sorted = [...deals].sort((a, b) => (a.price ?? 1e9) - (b.price ?? 1e9));

  return (
    <article className={`rounded-xl border ${deals.length ? "border-[#E3000F]" : ""}`}>
      <div className="flex items-center gap-3 p-3">
        <Bell
          className={`h-5 w-5 shrink-0 ${deals.length ? "text-[#E3000F]" : "text-muted-foreground"}`}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{title}</p>
          <p className="text-xs text-muted-foreground">
            {condition} ·{" "}
            {deals.length ? (
              <span className="font-semibold text-[#E3000F]">{deals.length} Treffer</span>
            ) : (
              "kein Treffer"
            )}
          </p>
        </div>
        <button
          type="button"
          aria-label="Alarm löschen"
          onClick={() => prefs.removeWatch(watch.id)}
          className="p-2 text-muted-foreground"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
      {sorted.length > 0 && (
        <ul className="divide-y border-t">
          {sorted.slice(0, 8).map((d) => (
            <li key={d.id}>
              <button
                type="button"
                onClick={() => onOpen(d)}
                className="flex w-full items-center gap-3 p-2.5 text-left"
              >
                <div className="h-12 w-12 shrink-0 bg-white">
                  {d.img && (
                    <img
                      src={d.img}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-contain"
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <StoreTag store={d.store} />
                    <PctBadge deal={d} />
                  </div>
                  <p className="truncate text-sm">{d.name}</p>
                </div>
                <Price deal={d} />
              </button>
            </li>
          ))}
          {sorted.length > 8 && (
            <li className="p-2.5 text-center text-xs text-muted-foreground">
              + {sorted.length - 8} weitere
            </li>
          )}
        </ul>
      )}
    </article>
  );
}
