// Runs every store scraper and writes out/deals.json + out/history.json.
// Usage: node scraper/run.mjs [outDir] [store,store,…]
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { today, addDays, clip, GROUPS } from "./lib.mjs";
import * as migros from "./stores/migros.mjs";
import * as coop from "./stores/coop.mjs";
import * as denner from "./stores/denner.mjs";
import * as lidl from "./stores/lidl.mjs";
import * as aldi from "./stores/aldi.mjs";

const STORES = { migros, coop, denner, lidl, aldi };
const OUT = process.argv[2] || "out";
const ONLY = process.argv[3] ? process.argv[3].split(",") : Object.keys(STORES);

async function readJson(path, fallback) {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch {
    return fallback;
  }
}

function log(...a) {
  console.log(...a);
  logLines.push(a.join(" "));
}
const logLines = [];

const day = today();
await mkdir(OUT, { recursive: true });
const prevDeals = await readJson(join(OUT, "prev-deals.json"), { deals: [] });
const history = await readJson(join(OUT, "prev-history.json"), {});

const status = {};
let deals = [];

for (const name of Object.keys(STORES)) {
  if (!ONLY.includes(name)) continue;
  const t0 = Date.now();
  try {
    const list = (await STORES[name].scrape()).filter((d) => d && d.name && (d.price || d.pct));
    if (!list.length) throw new Error("0 offers");
    deals.push(...list);
    status[name] = { ok: true, count: list.length, ms: Date.now() - t0 };
    log(`✔ ${name}: ${list.length} offers in ${Date.now() - t0} ms`);
  } catch (err) {
    // Keep yesterday's still-valid offers so one broken store never blanks the app.
    const kept = (prevDeals.deals || []).filter((d) => d.store === name && (!d.to || d.to >= day));
    deals.push(...kept);
    status[name] = {
      ok: false,
      count: kept.length,
      stale: kept.length > 0,
      error: String(err?.message || err).slice(0, 300),
      ms: Date.now() - t0,
    };
    log(`✘ ${name}: ${err?.stack || err}`);
    log(`  kept ${kept.length} offers from the previous run`);
  }
}

// Drop offers that already ended and normalise groups.
deals = deals.filter((d) => !d.to || d.to >= day);
for (const d of deals) {
  if (!GROUPS.includes(d.group)) d.group = "sonstiges";
  d.info = clip(d.info, 140) || null;
}

// Price history: fills the discount % for offers whose store does not publish
// an old price (mainly Lidl and Aldi). Only a real drop versus the last
// different price seen at least 5 days earlier counts.
for (const d of deals) {
  if (!d.price) continue;
  const h = history[d.id];
  if (!h) {
    history[d.id] = { p: d.price, d: day, last: day };
  } else if (h.p === d.price) {
    h.last = day;
  } else {
    h.prev = { p: h.p, d: h.d, last: h.last };
    h.p = d.price;
    h.d = day;
    h.last = day;
  }
  const ref = history[d.id].prev;
  if (!d.pct && ref && ref.p > d.price && ref.last <= addDays(day, -5)) {
    d.old = ref.p;
    d.pct = Math.round((1 - d.price / ref.p) * 100);
    d.pctSrc = "history";
    d.oldDate = ref.last;
  }
}
const cutoff = addDays(day, -180);
for (const [id, h] of Object.entries(history)) if (h.last < cutoff) delete history[id];

const out = {
  generatedAt: new Date().toISOString(),
  date: day,
  stores: status,
  count: deals.length,
  deals,
};
await writeFile(join(OUT, "deals.json"), JSON.stringify(out));
await writeFile(join(OUT, "history.json"), JSON.stringify(history));
log(`total: ${deals.length} offers`);
await writeFile(join(OUT, "log.txt"), logLines.join("\n") + "\n");
