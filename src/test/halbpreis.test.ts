import { QueryClient } from "@tanstack/react-query";
import { createRouter, rootRouteId } from "@tanstack/react-router";
import { describe, expect, it } from "vitest";

import { routeTree } from "@/routeTree.gen";
import { byDiscount, matches, watchHits } from "@/lib/halbpreis/data";
import { chf } from "@/lib/halbpreis/format";
import type { Deal, Watch } from "@/lib/halbpreis/types";

const deal = (over: Partial<Deal>): Deal => ({
  id: "x:1",
  store: "migros",
  name: "Produkt",
  info: null,
  price: 2,
  old: null,
  pct: null,
  pctSrc: null,
  tag: null,
  img: null,
  url: null,
  cat: "",
  group: "lebensmittel",
  from: null,
  to: null,
  ...over,
});

describe("routes", () => {
  it.each(["/angebote", "/suche", "/merkliste", "/einstellungen"])("%s exists", (path) => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });
    expect(router.matchRoutes(path).at(-1)?.routeId).not.toBe(rootRouteId);
  });
});

describe("search", () => {
  it("matches all words, ignoring case and umlauts", () => {
    const d = deal({ name: "Emmi Kaltbach Raclettekäse Scheiben" });
    expect(matches(d, "raclettekase emmi")).toBe(true);
    expect(matches(d, "Raclettekäse")).toBe(true);
    expect(matches(d, "gruyere")).toBe(false);
  });
});

describe("sorting", () => {
  it("puts known discounts first, highest first", () => {
    const list = [
      deal({ id: "a", pct: null, price: 1 }),
      deal({ id: "b", pct: 20 }),
      deal({ id: "c", pct: 50 }),
    ];
    expect(list.sort(byDiscount).map((d) => d.id)).toEqual(["c", "b", "a"]);
  });
});

describe("price watches", () => {
  const deals = [
    deal({ id: "lidl:1", store: "lidl", name: "Pouletbrust XXL", price: 1.59 }),
    deal({ id: "coop:2", store: "coop", name: "Poulet Schenkel", price: 4.5, pct: 30 }),
  ];
  it("product watch hits only at or below the target", () => {
    const w = (target: number | null): Watch => ({
      id: "w",
      kind: "product",
      dealId: "lidl:1",
      store: "lidl",
      name: "",
      img: null,
      target,
      createdAt: "",
    });
    expect(watchHits([w(1.6)], deals)).toHaveLength(1);
    expect(watchHits([w(1.5)], deals)).toHaveLength(0);
    expect(watchHits([w(null)], deals)).toHaveLength(1);
  });
  it("keyword watch respects stores, max price and min %", () => {
    const w: Watch = {
      id: "k",
      kind: "keyword",
      query: "poulet",
      stores: [],
      maxPrice: null,
      minPct: null,
      createdAt: "",
    };
    expect(watchHits([w], deals)).toHaveLength(2);
    expect(watchHits([{ ...w, stores: ["coop"] }], deals)).toHaveLength(1);
    expect(watchHits([{ ...w, maxPrice: 2 }], deals)).toHaveLength(1);
    expect(watchHits([{ ...w, minPct: 25 }], deals)).toHaveLength(1);
  });
});

describe("format", () => {
  it("formats Swiss prices", () => {
    expect(chf(46)).toBe("46.–");
    expect(chf(1.5)).toBe("1.50");
  });
});
