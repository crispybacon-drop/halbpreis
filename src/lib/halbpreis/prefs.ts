import { useSyncExternalStore } from "react";
import type { Deal, FavSnapshot, GroupId, Prefs, StoreId, Watch } from "./types";

const KEY = "halbpreis:v1";

const EMPTY: Prefs = { favs: {}, watches: [], hiddenGroups: [], hiddenStores: [], seen: [] };

let state: Prefs = EMPTY;
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) state = { ...EMPTY, ...JSON.parse(raw) };
  } catch {
    state = EMPTY;
  }
  window.addEventListener("storage", (e) => {
    if (e.key !== KEY) return;
    try {
      state = { ...EMPTY, ...JSON.parse(e.newValue || "{}") };
      listeners.forEach((l) => l());
    } catch {
      /* ignore */
    }
  });
}

function set(next: Prefs) {
  state = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* storage full or blocked: keep in memory */
  }
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  load();
  listeners.add(l);
  return () => listeners.delete(l);
}

export function usePrefs(): Prefs {
  return useSyncExternalStore(
    subscribe,
    () => {
      load();
      return state;
    },
    () => EMPTY,
  );
}

const uid = () => Math.random().toString(36).slice(2, 10);
const now = () => new Date().toISOString();

export const prefs = {
  toggleFav(d: Deal) {
    const favs = { ...state.favs };
    if (favs[d.id]) delete favs[d.id];
    else {
      const snap: FavSnapshot = {
        id: d.id,
        store: d.store,
        name: d.name,
        img: d.img,
        info: d.info,
        price: d.price,
        addedAt: now(),
      };
      favs[d.id] = snap;
    }
    set({ ...state, favs });
  },
  removeFav(id: string) {
    const favs = { ...state.favs };
    delete favs[id];
    set({ ...state, favs });
  },
  setProductWatch(d: Deal, target: number | null) {
    const others = state.watches.filter((w) => !(w.kind === "product" && w.dealId === d.id));
    const w: Watch = {
      id: uid(),
      kind: "product",
      dealId: d.id,
      store: d.store,
      name: d.name,
      img: d.img,
      target,
      createdAt: now(),
    };
    set({ ...state, watches: [w, ...others] });
  },
  addKeywordWatch(
    query: string,
    opts: { stores?: StoreId[]; maxPrice?: number | null; minPct?: number | null } = {},
  ) {
    const q = query.trim();
    if (!q) return;
    const w: Watch = {
      id: uid(),
      kind: "keyword",
      query: q,
      stores: opts.stores ?? [],
      maxPrice: opts.maxPrice ?? null,
      minPct: opts.minPct ?? null,
      createdAt: now(),
    };
    set({ ...state, watches: [w, ...state.watches] });
  },
  removeWatch(id: string) {
    set({ ...state, watches: state.watches.filter((w) => w.id !== id) });
  },
  toggleGroup(g: GroupId) {
    const hidden = state.hiddenGroups.includes(g)
      ? state.hiddenGroups.filter((x) => x !== g)
      : [...state.hiddenGroups, g];
    set({ ...state, hiddenGroups: hidden });
  },
  toggleStore(s: StoreId) {
    const hidden = state.hiddenStores.includes(s)
      ? state.hiddenStores.filter((x) => x !== s)
      : [...state.hiddenStores, s];
    set({ ...state, hiddenStores: hidden });
  },
  markSeen(keys: string[]) {
    const seen = Array.from(new Set([...keys, ...state.seen])).slice(0, 2000);
    set({ ...state, seen });
  },
  reset() {
    set(EMPTY);
  },
};
