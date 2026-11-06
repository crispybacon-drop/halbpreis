// Aldi Suisse: the product-search API behind aldi-suisse.ch.
// Uses the dated special-buy lists (Monday/Thursday) plus the "Aktionen" range.
// Only some items carry an old price; the rest get a % from price history later.
import { getJson, num, pct, round2, classify, today, addDays, weekday, sleep } from "../lib.mjs";

const API = "https://asl.api.aldi-suisse.ch/commerce/v3/product-search";
const STORE = "E172";
const AKTIONEN = "1588161418433031";
const TIEFPREIS = "1588161431768066";
const LIMIT = 60;

async function all(params, max = 1200) {
  const out = [];
  for (let offset = 0; offset < max; offset += LIMIT) {
    const q = new URLSearchParams({
      currency: "CHF",
      serviceType: "walk-in",
      limit: String(LIMIT),
      offset: String(offset),
      sort: "relevance",
      servicePoint: STORE,
      ...params,
    });
    const r = await getJson(`${API}?${q}`, {
      headers: { Accept: "application/json", Origin: "https://www.aldi-suisse.ch", Referer: "https://www.aldi-suisse.ch/" },
    });
    const data = r.data || [];
    out.push(...data);
    const total = r.meta?.pagination?.totalCount ?? 0;
    if (!data.length || offset + LIMIT >= total) break;
    await sleep(300);
  }
  return out;
}

// Special-buy days of the last week: every Monday and Thursday up to today.
function promoDays() {
  const d = today();
  const days = [];
  for (let i = 0; i <= 8; i++) {
    const x = addDays(d, -i);
    const wd = weekday(x);
    if (wd === 0 || wd === 3) days.push(x);
  }
  return days;
}

function toDeal(p, from, special) {
  const price = num(p.price?.amountRelevant) / 100;
  if (!price) return null;
  const old = num(p.price?.wasPriceDisplay);
  const tags = (p.badges || [])
    .flatMap((b) => b.items || [])
    .map((i) => i.displayText)
    .filter(Boolean);
  if (special) tags.unshift("Aktion");
  const cats = (p.categories || []).map((c) => c.name);
  const asset = p.assets?.[0]?.url;
  return {
    id: `aldi:${p.sku}`,
    store: "aldi",
    name: [p.brandName, p.name].filter(Boolean).join(" "),
    info: p.sellingSize || null,
    price: round2(price),
    old: old && old > price ? round2(old) : null,
    pct: pct(price, old),
    pctSrc: pct(price, old) ? "store" : null,
    tag: [...new Set(tags)].join(" · ") || null,
    img: asset ? asset.replace("{width}", "400").replace("{slug}", encodeURIComponent(p.urlSlugText || "produkt")) : null,
    url: `https://www.aldi-suisse.ch/de/produkt/${p.urlSlugText}-${p.sku}`,
    cat: cats.join(" › "),
    group: classify(cats[0], cats.slice(1).join(" "), p.name),
    from: p.onSaleDate || from || null,
    to: null,
  };
}

export async function scrape() {
  const deals = new Map();
  const add = (d) => d && !deals.has(d.id) && deals.set(d.id, d);

  for (const day of promoDays()) {
    for (const p of await all({ promotionKey: day }, 600)) add(toDeal(p, day, true));
  }
  for (const p of await all({ categoryKey: AKTIONEN })) add(toDeal(p, null, false));
  for (const p of await all({ categoryKey: TIEFPREIS }, 600)) {
    if (p.price?.wasPriceDisplay) add(toDeal(p, null, false));
  }
  if (!deals.size) throw new Error("Aldi: no products returned");
  return [...deals.values()];
}
