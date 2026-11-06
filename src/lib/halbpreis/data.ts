import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { DATA_URL } from "./meta";
import { normalize } from "./format";
import { usePrefs } from "./prefs";
import type { Deal, DealsFile, Prefs, Watch } from "./types";

async function fetchDeals(): Promise<DealsFile> {
  const res = await fetch(DATA_URL, { cache: "no-cache" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = (await res.json()) as DealsFile;
  for (const d of data.deals)
    (d as Deal & { _q?: string })._q = normalize(`${d.name} ${d.info ?? ""} ${d.cat}`);
  return data;
}

export function useDeals() {
  return useQuery({
    queryKey: ["deals"],
    queryFn: fetchDeals,
    staleTime: 15 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    retry: 2,
    refetchOnWindowFocus: true,
  });
}

/** Deals after the user's store and product-group settings. */
export function useVisibleDeals() {
  const q = useDeals();
  const p = usePrefs();
  const deals = useMemo(() => {
    if (!q.data) return [];
    const hs = new Set(p.hiddenStores);
    const hg = new Set(p.hiddenGroups);
    return q.data.deals.filter((d) => !hs.has(d.store) && !hg.has(d.group));
  }, [q.data, p.hiddenStores, p.hiddenGroups]);
  return { ...q, deals };
}

export function searchText(d: Deal): string {
  return (d as Deal & { _q?: string })._q ?? normalize(`${d.name} ${d.info ?? ""} ${d.cat}`);
}

export function matches(d: Deal, query: string): boolean {
  const words = normalize(query).split(/\s+/).filter(Boolean);
  if (!words.length) return false;
  const text = searchText(d);
  return words.every((w) => text.includes(w));
}

/** Sort: known discount high → low, then deals without a % by price. */
export function byDiscount(a: Deal, b: Deal) {
  const pa = a.pct ?? -1;
  const pb = b.pct ?? -1;
  if (pa !== pb) return pb - pa;
  return (a.price ?? 1e9) - (b.price ?? 1e9);
}

export function byPrice(a: Deal, b: Deal) {
  return (a.price ?? 1e9) - (b.price ?? 1e9);
}

export function byName(a: Deal, b: Deal) {
  return a.name.localeCompare(b.name, "de");
}

export interface Hit {
  key: string;
  watch: Watch;
  deal: Deal;
}

export function watchHits(watches: Watch[], deals: Deal[]): Hit[] {
  if (!deals.length || !watches.length) return [];
  const byId = new Map(deals.map((d) => [d.id, d]));
  const hits: Hit[] = [];
  for (const w of watches) {
    if (w.kind === "product") {
      const d = byId.get(w.dealId);
      if (d && d.price !== null && (w.target === null || d.price <= w.target)) {
        hits.push({ key: `${w.id}:${d.id}:${d.price}`, watch: w, deal: d });
      } else if (d && d.price === null && w.target === null) {
        hits.push({ key: `${w.id}:${d.id}:x`, watch: w, deal: d });
      }
    } else {
      for (const d of deals) {
        if (w.stores.length && !w.stores.includes(d.store)) continue;
        if (!matches(d, w.query)) continue;
        if (w.maxPrice !== null && (d.price === null || d.price > w.maxPrice)) continue;
        if (w.minPct !== null && (d.pct === null || d.pct < w.minPct)) continue;
        hits.push({ key: `${w.id}:${d.id}:${d.price}`, watch: w, deal: d });
      }
    }
  }
  return hits;
}

/** Watch hits over all deals (store/group settings do not hide alarms). */
export function useHits(): { hits: Hit[]; unseen: Hit[]; prefs: Prefs } {
  const { data } = useDeals();
  const p = usePrefs();
  return useMemo(() => {
    const hits = watchHits(p.watches, data?.deals ?? []);
    const seen = new Set(p.seen);
    return { hits, unseen: hits.filter((h) => !seen.has(h.key)), prefs: p };
  }, [data, p]);
}
