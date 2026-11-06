// Coop: "Alle Aktionen" listing on coop.ch. Product tiles are embedded as
// HTML-escaped JSON in the server-rendered page.
import {
  http,
  num,
  pct,
  round2,
  decodeEntities,
  extractObjects,
  classify,
  today,
  addDays,
  weekday,
  sleep,
} from "../lib.mjs";

const BASE = "https://www.coop.ch";
const LIST = `${BASE}/de/aktionen/alle-aktionen/c/m_1111`;
const PAGE_SIZE = 120;
const MAX_PAGES = 45;
const MARKER = '{"elementType":".producttile.ProductTileSupermarketElement"';

// Coop's regular promotion week runs Thursday to Wednesday.
function promoWeek() {
  const d = today();
  const back = (weekday(d) - 3 + 7) % 7; // days since last Thursday
  const from = addDays(d, -back);
  return { from, to: addDays(from, 6) };
}

function abs(u) {
  if (!u) return null;
  if (u.startsWith("//")) return "https:" + u;
  if (u.startsWith("/")) return BASE + u;
  return u;
}

async function page(n) {
  const url = `${LIST}?page=${n}&pageSize=${PAGE_SIZE}&q=%3Arelevance&sort=relevance`;
  const res = await http(
    url,
    { headers: { Accept: "text/html,application/xhtml+xml" } },
    { timeout: 60000 },
  );
  if (!res.ok) throw new Error(`Coop HTTP ${res.status} (page ${n})`);
  const html = await res.text();
  const total = Number((html.match(/([\d’']+)\s*Produkte/) || [])[1]?.replace(/[’']/g, "")) || null;
  const tiles = extractObjects(decodeEntities(html), MARKER);
  return { tiles, total };
}

export async function scrape() {
  const { from, to } = promoWeek();
  const seen = new Map();
  let total = null;
  for (let n = 1; n <= MAX_PAGES; n++) {
    const r = await page(n);
    if (r.total) total = r.total;
    if (!r.tiles.length) break;
    for (const t of r.tiles) if (!seen.has(t.id)) seen.set(t.id, t);
    if (total && n * PAGE_SIZE >= total) break;
    await sleep(800);
  }
  if (!seen.size) throw new Error("Coop: no product tiles found");

  const deals = [];
  for (const t of seen.values()) {
    const price = num(t.price);
    if (!price) continue;
    const old = num(t.saving);
    const label = t.productAriaLabel || "";
    const multi = (label.match(/\bab\s+\d+\b/i) || [])[0] || null;
    const percent = num(t.savingText);
    if (!percent && !(old > price) && !multi) continue; // not actually discounted
    const cats = t.udoCat || [];
    const srcset = t.image?.srcset || [];
    const image = srcset.length ? srcset[srcset.length - 1][0] : t.image?.src;
    deals.push({
      id: `coop:${t.id}`,
      store: "coop",
      name: t.title,
      info: t.quantity || null,
      price: round2(price),
      old: old && old > price ? round2(old) : null,
      pct: percent || pct(price, old),
      pctSrc: percent || pct(price, old) ? "store" : null,
      tag: multi ? multi.replace(/^ab/i, "ab") + " Stück" : null,
      img: abs(image)?.replace(/\?_=\d+$/, ""),
      url: abs(t.href),
      cat: cats.join(" › "),
      group: classify(cats[0], cats.slice(1).join(" "), t.title),
      from,
      to,
    });
  }
  return deals;
}
