// Lidl: the leaflet API behind lidl.ch's weekly "Lidl Aktuell" flyer.
// The feed only carries the current price, so the discount % is filled in
// later from recorded price history where possible.
import {
  getJson,
  num,
  round2,
  decodeEntities,
  classifyDeep,
  clip,
  today,
  addDays,
  isoWeek,
} from "../lib.mjs";

const API = "https://endpoints.leaflets.schwarz/v4/flyer?flyer_identifier=";

async function flyer(id) {
  try {
    const r = await getJson(API + encodeURIComponent(id), {
      headers: {
        Accept: "application/json",
        Origin: "https://www.lidl.ch",
        Referer: "https://www.lidl.ch/",
      },
    });
    return r?.flyer || null;
  } catch {
    return null;
  }
}

export async function scrape() {
  const day = today();
  const weeks = new Set([isoWeek(addDays(day, -7)), isoWeek(day), isoWeek(addDays(day, 7))]);
  const flyers = [];
  for (const w of weeks) {
    const f =
      (await flyer(`lidl-aktuell-kw${String(w).padStart(2, "0")}`)) ||
      (await flyer(`lidl-aktuell-kw${w}`));
    if (!f) continue;
    const from = (f.offerStartDate || f.startDate || "").slice(0, 10);
    const to = (f.offerEndDate || f.endDate || "").slice(0, 10);
    if (from && from <= day && (!to || to >= day)) flyers.push({ f, from, to });
  }
  if (!flyers.length) throw new Error("Lidl: no current 'Lidl Aktuell' flyer found");

  const deals = new Map();
  for (const { f, from, to } of flyers) {
    // product -> page -> topic ("Super Wochenende", "Wochenaktion", …)
    const pageOf = new Map();
    for (const p of f.pages || []) {
      for (const l of p.links || []) {
        const id = l.productDetails?.productId;
        if (id && !pageOf.has(id)) pageOf.set(id, p.number);
      }
    }
    const topicOf = (n) =>
      (f.topics || []).find((t) => n >= t.startPageNumber && n <= t.endPageNumber)?.name || null;

    for (const p of Object.values(f.products || {})) {
      const price = num(p.price);
      if (!price) continue;
      const topic = topicOf(pageOf.get(p.productId));
      const cat = (p.wonCategoryPrimary || "").split("/").filter(Boolean);
      deals.set(`lidl:${p.productId}`, {
        id: `lidl:${p.productId}`,
        store: "lidl",
        name: decodeEntities(p.title),
        info:
          clip(decodeEntities(p.description || "").replace(/Wine Ranking.*$/i, ""), 120) || null,
        price: round2(price),
        old: null,
        pct: null,
        pctSrc: null,
        tag: topic && topic !== "Wochenaktion" ? topic : null,
        img: p.image || null,
        url: p.url || (p.canonicalUrl ? `https://www.lidl.ch${p.canonicalUrl}` : null),
        cat: cat.slice(1).join(" › "),
        group: classifyDeep(cat.slice(1), decodeEntities(p.title)),
        from,
        to,
      });
    }
  }
  return [...deals.values()];
}
