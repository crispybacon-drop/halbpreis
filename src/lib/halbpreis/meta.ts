import type { GroupId, StoreId } from "./types";

export const DATA_URL: string =
  (import.meta.env["VITE_DATA_URL"] as string | undefined) ||
  "https://raw.githubusercontent.com/crispybacon-drop/halbpreis/data/deals.json";

export interface StoreMeta {
  id: StoreId;
  name: string;
  /** brand colour */
  color: string;
  /** text colour on the brand colour */
  on: string;
  /** small accent used next to the brand colour */
  accent: string;
}

export const STORES: StoreMeta[] = [
  { id: "migros", name: "Migros", color: "#FF6600", on: "#FFFFFF", accent: "#FFE0CC" },
  { id: "coop", name: "Coop", color: "#D6001C", on: "#FFFFFF", accent: "#FFD6DB" },
  { id: "denner", name: "Denner", color: "#9E1B20", on: "#FFFFFF", accent: "#F3D3D4" },
  { id: "lidl", name: "Lidl", color: "#0050AA", on: "#FFFFFF", accent: "#FFF000" },
  { id: "aldi", name: "Aldi", color: "#00005F", on: "#FFFFFF", accent: "#00B4DC" },
];

export const STORE: Record<StoreId, StoreMeta> = Object.fromEntries(
  STORES.map((s) => [s.id, s]),
) as Record<StoreId, StoreMeta>;

export const GROUPS: { id: GroupId; name: string }[] = [
  { id: "lebensmittel", name: "Lebensmittel" },
  { id: "getraenke", name: "Getränke" },
  { id: "haushalt", name: "Haushalt & Reinigung" },
  { id: "hygiene", name: "Hygiene & Kosmetik" },
  { id: "baby", name: "Baby & Kind" },
  { id: "tier", name: "Tierbedarf" },
  { id: "kleidung", name: "Kleidung & Schuhe" },
  { id: "wohnen", name: "Wohnen & Garten" },
  { id: "freizeit", name: "Freizeit & Technik" },
  { id: "sonstiges", name: "Sonstiges" },
];

export const GROUP_NAME: Record<GroupId, string> = Object.fromEntries(
  GROUPS.map((g) => [g.id, g.name]),
) as Record<GroupId, string>;
