import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/halbpreis/AppShell";
import { Chip, ChipRow, DealGrid, Empty, Loading, LoadError } from "@/components/halbpreis/common";
import { byDiscount, byName, byPrice, useVisibleDeals } from "@/lib/halbpreis/data";
import { GROUPS, STORES } from "@/lib/halbpreis/meta";
import { shortDate } from "@/lib/halbpreis/format";
import { usePrefs } from "@/lib/halbpreis/prefs";
import type { GroupId, StoreId } from "@/lib/halbpreis/types";

export const Route = createFileRoute("/angebote")({
  head: () => ({ meta: [{ title: "Angebote · Halbpreis" }] }),
  component: Angebote,
});

type Sort = "rabatt" | "preis" | "name";
const SORTS: { id: Sort; label: string }[] = [
  { id: "rabatt", label: "Rabatt" },
  { id: "preis", label: "Preis" },
  { id: "name", label: "A–Z" },
];

function Angebote() {
  const { data, deals, isLoading, isError, refetch } = useVisibleDeals();
  const p = usePrefs();
  const [store, setStore] = useState<StoreId | null>(null);
  const [group, setGroup] = useState<GroupId | null>(null);
  const [sort, setSort] = useState<Sort>("rabatt");
  const [onlyPct, setOnlyPct] = useState(false);

  // Jump to a store section when opened from the start page (#migros …)
  useEffect(() => {
    if (!data) return;
    const id = window.location.hash.slice(1);
    if (id) document.getElementById(id)?.scrollIntoView({ block: "start" });
  }, [data]);

  const groups = GROUPS.filter(
    (g) => !p.hiddenGroups.includes(g.id) && deals.some((d) => d.group === g.id),
  );
  const stores = STORES.filter((s) => !p.hiddenStores.includes(s.id));

  const sections = useMemo(() => {
    const cmp = sort === "preis" ? byPrice : sort === "name" ? byName : byDiscount;
    return stores
      .filter((s) => !store || s.id === store)
      .map((s) => {
        const list = deals
          .filter((d) => d.store === s.id && (!group || d.group === group) && (!onlyPct || d.pct))
          .sort(cmp);
        const until =
          list
            .map((d) => d.to)
            .filter(Boolean)
            .sort()
            .at(-1) ?? null;
        return { store: s, list, until };
      });
  }, [deals, stores, store, group, sort, onlyPct]);

  return (
    <AppShell title="Rabatt-Übersicht">
      <div className="sticky top-14 z-20 space-y-1 border-b bg-background/95 px-4 py-2 backdrop-blur">
        <ChipRow>
          <Chip active={!store} onClick={() => setStore(null)}>
            Alle Läden
          </Chip>
          {stores.map((s) => (
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
        <ChipRow>
          <Chip active={!group} onClick={() => setGroup(null)}>
            Alles
          </Chip>
          {groups.map((g) => (
            <Chip
              key={g.id}
              active={group === g.id}
              onClick={() => setGroup(group === g.id ? null : g.id)}
            >
              {g.name}
            </Chip>
          ))}
        </ChipRow>
        <div className="flex items-center justify-between pt-1">
          <div className="flex rounded-lg border p-0.5">
            {SORTS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSort(s.id)}
                className={`h-7 rounded-md px-3 text-xs font-semibold ${sort === s.id ? "bg-foreground text-background" : ""}`}
              >
                {s.label}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 text-xs font-medium">
            <input
              type="checkbox"
              checked={onlyPct}
              onChange={(e) => setOnlyPct(e.target.checked)}
              className="h-4 w-4 accent-[#E3000F]"
            />
            nur mit %
          </label>
        </div>
      </div>

      {isLoading && <Loading />}
      {isError && <LoadError onRetry={() => refetch()} />}

      {data &&
        sections.map(({ store: s, list, until }) => (
          <section key={s.id} id={s.id} className="scroll-mt-44 px-4 pt-5">
            <div
              className="mb-3 flex items-center justify-between rounded-xl px-4 py-3"
              style={{ background: s.color, color: s.on }}
            >
              <h2 className="text-lg font-extrabold">{s.name}</h2>
              <span className="text-xs font-semibold opacity-90">
                {list.length} Angebote{until ? ` · bis ${shortDate(until)}` : ""}
              </span>
            </div>
            {data.stores[s.id] && !data.stores[s.id]!.ok && (
              <p className="mb-2 text-xs text-muted-foreground">
                {s.name} konnte heute nicht aktualisiert werden
                {data.stores[s.id]!.stale ? ", Stand vom letzten Abruf." : "."}
              </p>
            )}
            {list.length ? (
              <DealGrid
                key={`${s.id}-${group}-${sort}-${onlyPct}`}
                deals={list}
                initial={store ? 48 : 12}
              />
            ) : data.stores[s.id]?.ok === false ? null : (
              <Empty>Keine Angebote für diese Auswahl.</Empty>
            )}
          </section>
        ))}
    </AppShell>
  );
}
