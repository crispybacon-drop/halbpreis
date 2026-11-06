// Denner: the JSON endpoint behind denner.ch/de/aktionen/aktuelle-aktionen.
import { getJson, num, pct, round2, classify, sleep } from "../lib.mjs";

const BASE = "https://www.denner.ch";
const PER_PAGE = 100;

function flat(item) {
  const o = {};
  for (const a of item.attributeInfo || [])
    o[a.attributeName] = (a.vals || []).map((v) => v.value).join("|");
  return o;
}

function isoFromUnix(s) {
  const n = Number(s);
  if (!n) return null;
  return new Date(n * 1000).toLocaleDateString("sv-SE", { timeZone: "Europe/Zurich" });
}

function imgUrl(u) {
  if (!u) return null;
  return `${u.split("?")[0]}?auto=format%2Ccompress&w=400&h=400&fit=fillmax`;
}

function toDeal(item, weekend) {
  const a = flat(item);
  if (a.has_discount === "false" && !a.discount_text) return null;
  const price = num(a.price) || num(item.price);
  const old = num((a.insteadPriceText || "").replace(/statt/i, ""));
  const percent = num(a.discount_percent) || null;
  const badge = a.discount_text && !/%/.test(a.discount_text) ? a.discount_text : null;
  const extra = a.extraDiscountBadgeLabel || a.extraDiscountBadgeValue || null;
  const name = a.name || a._tracking_item_name;
  if (!name) return null;
  const cat = [a._tracking_item_category2, a._tracking_item_category3].filter(Boolean).join(" › ");
  const tags = [weekend ? "Wochenende" : null, badge, extra].filter(Boolean);
  return {
    id: `denner:${a.articleId || item.sku}`,
    store: "denner",
    name,
    info: a.nameSubline || null,
    price: price ? round2(price) : null,
    old: old && price && old > price ? round2(old) : null,
    pct: percent || pct(price, old),
    pctSrc: percent || pct(price, old) ? "store" : null,
    tag: tags.join(" · ") || null,
    img: imgUrl(a.imageUrl || a.thumbnailUrl),
    url: a.itemUrl ? BASE + a.itemUrl : `${BASE}/de/aktionen/aktuelle-aktionen`,
    cat,
    group: classify(cat, name, a.nameSubline),
    from: isoFromUnix(a.promotionFrom),
    to: isoFromUnix(a.promotionTo),
    multi: !price || undefined,
  };
}

export async function scrape() {
  const deals = new Map();
  let page = 1;
  let totalPages = 1;
  do {
    const r = await getJson(`${BASE}/nuxt-api/promotions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Origin: BASE,
        Referer: `${BASE}/de/aktionen/aktuelle-aktionen`,
      },
      body: JSON.stringify({
        lang: "de",
        promoFlag: "promo_current_week",
        facetName: null,
        facetValue: null,
        page,
        hitsPerPage: PER_PAGE,
        sort: null,
        includeHighlights: page === 1,
      }),
    });
    const d = r.data || r;
    totalPages = d.stats?.totalPages || 1;
    for (const item of d.items || []) {
      const deal = toDeal(item, false);
      if (deal && !deals.has(deal.id)) deals.set(deal.id, deal);
    }
    for (const hl of d.highlights || []) {
      const weekend = /weekend/i.test(hl.flag || "");
      for (const item of hl.items || []) {
        const deal = toDeal(item, weekend);
        if (deal) deals.set(deal.id, { ...(deals.get(deal.id) || {}), ...deal });
      }
    }
    page++;
    await sleep(500);
  } while (page <= totalPages && page <= 20);
  if (!deals.size) throw new Error("Denner: no promotions returned");
  return [...deals.values()];
}
