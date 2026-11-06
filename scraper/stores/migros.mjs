// Migros: public offer API used by migros.ch/de/offers, region Genossenschaft Migros Zürich.
import { http, getJson, num, pct, round2, stripHtml, classify, today } from "../lib.mjs";

const BASE = "https://www.migros.ch";
const REGION = "gmzh";
const IMG_STACK = "mo-custom/v-w-400-h-400";

function img(url) {
  return url ? url.replace("{stack}", IMG_STACK) : null;
}

async function guestToken() {
  const res = await http(`${BASE}/authentication/public/v1/api/guest?authorizationNotRequired=true`, {
    headers: { Accept: "application/json" },
  });
  const token = res.headers.get("leshopch");
  if (!res.ok || !token) throw new Error(`Migros guest login failed (HTTP ${res.status})`);
  return token;
}

function chunks(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function badgeInfo(badges = []) {
  let percent = null;
  const tags = [];
  for (const b of badges) {
    const text = (b.description || b.rawDescription || "").trim();
    if (b.type === "PERCENTAGE_PROMOTION") percent = num(text);
    else if (text) tags.push(text);
  }
  return { percent, tag: tags.join(" · ") || null };
}

export async function scrape() {
  const token = await guestToken();
  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json",
    leshopch: token,
    "migros-language": "de",
    Origin: BASE,
    Referer: `${BASE}/de/offers/home`,
  };
  const day = today();

  const search = await getJson(`${BASE}/product-display/public/web/v3/products/promotion/search`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      storeType: "OFFLINE",
      period: "CURRENT",
      filters: {},
      sortFields: ["categoryLevel"],
      sortOrder: "asc",
      from: 0,
      until: 5000,
      region: REGION,
      warehouse: "8",
      enabledSponsoredProducts: false,
    }),
  });

  const all = [...(search.items || []), ...(search.weekendPromotions?.items || [])];
  const productIds = [...new Set(all.filter((i) => i.type === "PRODUCT").map((i) => i.id))];
  const groupIds = [...new Set(all.filter((i) => i.type === "GROUP_PROMOTION").map((i) => String(i.id)))];
  const weekendIds = new Set((search.weekendPromotions?.items || []).map((i) => String(i.id)));

  const deals = [];

  for (const uids of chunks(productIds, 40)) {
    const cards = await getJson(`${BASE}/product-display/public/v4/product-cards`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        offerFilter: { storeType: "OFFLINE", region: REGION, ongoingOfferDate: `${day}T00:00:00` },
        productFilter: { uids },
      }),
    });
    for (const p of cards || []) {
      const offer = p.offer || {};
      const promo = offer.promotionPrice;
      const regular = offer.price;
      const price = num(promo?.effectiveValue ?? regular?.effectiveValue);
      if (!price) continue;
      const old = promo ? num(regular?.effectiveValue) : null;
      const { percent, tag } = badgeInfo(offer.badges);
      const crumbs = (p.breadcrumb || []).map((c) => c.name);
      deals.push({
        id: `migros:${p.uid}`,
        store: "migros",
        name: p.title || [p.brand, p.name].filter(Boolean).join(" "),
        info: offer.quantity || null,
        price: round2(price),
        old: old && old > price ? round2(old) : null,
        pct: percent ?? pct(price, old),
        pctSrc: percent || pct(price, old) ? "store" : null,
        tag: weekendIds.has(String(p.uid)) ? ["Wochenende", tag].filter(Boolean).join(" · ") : tag,
        img: img(p.images?.[0]?.url || p.imageTransparent?.url),
        url: p.productUrls || `${BASE}/de/product/${p.migrosId}`,
        cat: crumbs.join(" › "),
        group: classify(crumbs[0], crumbs.slice(1).join(" "), p.title),
        from: offer.promotionDateRange?.startDate || search.startDate || null,
        to: offer.promotionDateRange?.endDate || search.endDate || null,
      });
    }
  }

  for (const ids of chunks(groupIds, 40)) {
    const groups = await getJson(
      `${BASE}/product-display/public/v2/promotions-details/${ids.join(",")}?region=${REGION}`,
      { headers },
    );
    for (const g of groups || []) {
      const { percent, tag } = badgeInfo(g.badges);
      const hint = stripHtml(g.discountHint);
      // "z.B. Kräuterseitling, … 3.56 statt 4.45, …"
      const m = hint.match(/(\d+\.\d{2}|\d+\.–)\s*statt\s*(\d+\.\d{2}|\d+\.–)/);
      const price = m ? num(m[1]) : null;
      const old = m ? num(m[2]) : null;
      const cat = (g.categories || []).map((c) => c.name).join(" › ");
      deals.push({
        id: `migros:g${g.id}`,
        store: "migros",
        name: g.description,
        info: hint.replace(/,?\s*Angebot gilt.*$/i, "").slice(0, 160) || null,
        price: price ? round2(price) : null,
        old: old ? round2(old) : null,
        pct: percent ?? pct(price, old),
        pctSrc: percent || pct(price, old) ? "store" : null,
        tag: weekendIds.has(String(g.id)) ? ["Wochenende", tag].filter(Boolean).join(" · ") : tag,
        img: img(g.image?.url),
        url: `${BASE}/de/offers/home`,
        cat,
        group: classify(cat, g.description),
        from: g.startDate || null,
        to: g.endDate || null,
        multi: true,
      });
    }
  }

  return deals;
}
