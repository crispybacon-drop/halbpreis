export type StoreId = "migros" | "coop" | "denner" | "lidl" | "aldi";

export type GroupId =
  | "lebensmittel"
  | "getraenke"
  | "haushalt"
  | "hygiene"
  | "baby"
  | "tier"
  | "kleidung"
  | "wohnen"
  | "freizeit"
  | "sonstiges";

export interface Deal {
  id: string;
  store: StoreId;
  name: string;
  info: string | null;
  price: number | null;
  old: number | null;
  pct: number | null;
  /** "store": published by the store; "history": compared with an earlier recorded price */
  pctSrc: "store" | "history" | null;
  oldDate?: string;
  tag: string | null;
  img: string | null;
  url: string | null;
  cat: string;
  group: GroupId;
  from: string | null;
  to: string | null;
  /** offer covers a whole range ("alle Lindt Tafeln"), price is an example */
  multi?: boolean;
}

export interface StoreStatus {
  ok: boolean;
  count: number;
  stale?: boolean;
  error?: string;
  ms?: number;
}

export interface DealsFile {
  generatedAt: string;
  date: string;
  stores: Partial<Record<StoreId, StoreStatus>>;
  count: number;
  deals: Deal[];
}

export interface FavSnapshot {
  id: string;
  store: StoreId;
  name: string;
  img: string | null;
  info: string | null;
  price: number | null;
  addedAt: string;
}

export type Watch =
  | {
      id: string;
      kind: "product";
      dealId: string;
      store: StoreId;
      name: string;
      img: string | null;
      /** alert when the price is at or below this value; null = whenever it is on offer */
      target: number | null;
      createdAt: string;
    }
  | {
      id: string;
      kind: "keyword";
      query: string;
      stores: StoreId[];
      maxPrice: number | null;
      minPct: number | null;
      createdAt: string;
    };

export interface Prefs {
  favs: Record<string, FavSnapshot>;
  watches: Watch[];
  hiddenGroups: GroupId[];
  hiddenStores: StoreId[];
  /** watch-hit keys the user has already seen */
  seen: string[];
}
