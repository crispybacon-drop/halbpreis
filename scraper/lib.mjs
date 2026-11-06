// Shared helpers for the store scrapers. Node 22, no dependencies.

export const UA =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36";

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function http(url, opts = {}, { retries = 2, timeout = 30000 } = {}) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeout);
    try {
      const res = await fetch(url, {
        ...opts,
        signal: ctrl.signal,
        headers: {
          "User-Agent": UA,
          "Accept-Language": "de-CH,de;q=0.9",
          ...(opts.headers || {}),
        },
      });
      clearTimeout(timer);
      if (res.status >= 500 || res.status === 429) throw new Error(`HTTP ${res.status} ${url}`);
      return res;
    } catch (err) {
      clearTimeout(timer);
      lastErr = err;
      if (attempt < retries) await sleep(1500 * (attempt + 1));
    }
  }
  throw lastErr;
}

export async function getJson(url, opts) {
  const res = await http(url, opts);
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  return res.json();
}

export function num(v) {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  // "46.–", "-.95", "1'299.00", "CHF 1.59"
  let s = String(v)
    .replace(/CHF/i, "")
    .replace(/[’'\s]/g, "");
  s = s.replace(/\.–$/, ".00").replace(/^–\./, "0.").replace(/^-\./, "0.");
  const m = s.match(/\d+(?:\.\d+)?/);
  return m ? Number(m[0]) : null;
}

export function pct(price, old) {
  if (!price || !old || old <= price) return null;
  return Math.round((1 - price / old) * 100);
}

export function round2(n) {
  return n === null || n === undefined ? null : Math.round(n * 100) / 100;
}

const ENTITIES = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  auml: "ä",
  ouml: "ö",
  uuml: "ü",
  Auml: "Ä",
  Ouml: "Ö",
  Uuml: "Ü",
  szlig: "ß",
  eacute: "é",
  egrave: "è",
  agrave: "à",
  ccedil: "ç",
  ndash: "–",
  mdash: "—",
  reg: "®",
  trade: "™",
  deg: "°",
};

export function decodeEntities(s) {
  if (!s) return s;
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
    if (e[0] === "#") {
      const code =
        e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : m;
    }
    return ENTITIES[e] ?? m;
  });
}

export function stripHtml(s) {
  return decodeEntities(String(s || "").replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

// Extract every JSON object that starts with `marker` from a text blob.
export function extractObjects(text, marker) {
  const out = [];
  let idx = text.indexOf(marker);
  while (idx !== -1) {
    let depth = 0;
    let inStr = false;
    let esc = false;
    let end = -1;
    for (let i = idx; i < text.length; i++) {
      const c = text[i];
      if (inStr) {
        if (esc) esc = false;
        else if (c === "\\") esc = true;
        else if (c === '"') inStr = false;
        continue;
      }
      if (c === '"') inStr = true;
      else if (c === "{") depth++;
      else if (c === "}") {
        depth--;
        if (depth === 0) {
          end = i;
          break;
        }
      }
    }
    if (end === -1) break;
    try {
      out.push(JSON.parse(text.slice(idx, end + 1)));
    } catch {
      /* skip malformed */
    }
    idx = text.indexOf(marker, end);
  }
  return out;
}

// Zurich-local calendar date as YYYY-MM-DD.
export function today() {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Zurich" });
}

export function addDays(iso, n) {
  const d = new Date(iso + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function weekday(iso) {
  // 0 = Monday … 6 = Sunday
  return (new Date(iso + "T12:00:00Z").getUTCDay() + 6) % 7;
}

export function isoWeek(iso) {
  const d = new Date(iso + "T12:00:00Z");
  const day = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - day + 3);
  const firstThu = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  return 1 + Math.round(((d - firstThu) / 86400000 - 3 + ((firstThu.getUTCDay() + 6) % 7)) / 7);
}

// Product groups used by the app's settings toggles.
export const GROUPS = [
  "lebensmittel",
  "getraenke",
  "haushalt",
  "hygiene",
  "baby",
  "tier",
  "kleidung",
  "wohnen",
  "freizeit",
  "sonstiges",
];

const RULES = [
  ["tier", /\b(tier|heimtier|katze|katzen|hund|hunde|vogel|nager|haustier)/],
  ["baby", /(baby|windel|kleinkind|baby-und-kind|baby und kind|babynahrung)/],
  [
    "getraenke",
    /(getränk|getraenk|wein|weine|bier|spirituos|champagner|schaumwein|prosecco|säfte|saft|mineral|wasser|sirup|kaffee|tee\b|tee\/|kakao|energy|softdrink|limonade|cola|whisky|gin\b|rum\b|vodka|likör)/,
  ],
  [
    "hygiene",
    /(kosmetik|körperpflege|koerperpflege|pflege|hygiene|beauty|drogerie|gesundheit|zahn|dusch|shampoo|deo|rasier|parfum|make-up|haar|gesicht|damenhygiene|tampon|binde|apotheke|vitamin)/,
  ],
  [
    "haushalt",
    /(haushalt|reinigung|reiniger|putz|wasch|spül|spuel|abwasch|papier|wc-|toilettenpapier|küchenpapier|abfall|müll|kehricht|batterie|insekt)/,
  ],
  [
    "kleidung",
    /(kleidung|bekleidung|mode|schuh|socke|damen|herren|unterwäsche|wäsche-mode|jacke|hose|pullover|accessoires|kinderbekleidung)/,
  ],
  [
    "wohnen",
    /(wohnen|deko|heimtextil|textil|bett|möbel|moebel|garten|pflanzen|blumen|beleuchtung|lampe|heimwerk|werkzeug|küche|kueche|kochen|geschirr|weihnacht|advent|bad\b|bad\/)/,
  ],
  [
    "freizeit",
    /(freizeit|sport|fitness|spiel|spielzeug|spielwaren|elektronik|technik|multimedia|computer|handy|büro|buero|schule|auto|velo|töff|reise|camping|bücher|buecher|zeitschrift|basteln|kinder\b)/,
  ],
  [
    "lebensmittel",
    /(lebensmittel|(?<!non[\s-]?)food|früchte|fruechte|gemüse|gemuese|obst|fleisch|fisch|geflügel|wurst|milch|käse|kaese|joghurt|eier|brot|back|frühstück|vorräte|vorraete|teigwaren|pasta|reis|konserven|süss|suess|snack|schokolade|chips|guetzli|tiefkühl|tiefkuehl|fertig|glace|salat|würz|gewürz|sauce|öl|essig|mehl|zucker|nüsse|delikatess|feinkost|aufschnitt|butter|rahm|convenience|near food|apéro|apero)/,
  ],
];

const GENERIC = /^(aktionen?|angebote?|sonstiges|weitere|alle|neuheiten|highlights?|weihnachten)$/i;

const NAME_RULES = [
  ["tier", /(hunde|katzen|tierfutter|katzenstreu|vogelfutter|nager)/],
  [
    "getraenke",
    /(wein\b|weisswein|rotwein|rosé|prosecco|champagner|bier\b|lager\b|saft\b|sirup|mineralwasser|cola\b|eistee|kaffee|espresso|kapseln|tee\b|whisky|vodka|gin\b|rum\b|likör|energy drink)/,
  ],
  [
    "lebensmittel",
    /(schinken|schinkli|poulet|huhn|truten|rind|schwein|kalb|lamm|lachs|thon|crevetten|fisch|salami|wurst|würstli|wienerli|cervelat|speck|fleisch|plätzli|geschnetzelt|pizza|pasta|nudel|spaghetti|penne|ravioli|lasagne|reis\b|kartoffel|rösti|spätzli|gemüse|salat|tomate|zwiebel|karotte|apfel|äpfel|birne|banane|trauben|beeren|mandarin|clementine|orange|zitrone|kaki|granatapfel|avocado|pilz|champignon|milch|joghurt|jogurt|quark|rahm|butter|käse|mozzarella|gruyère|emmentaler|raclette|fondue|eier\b|brot\b|zopf|gipfeli|croissant|toast|kuchen|torte|guetzli|biscuits|praline|schokolade|lebkuchen|biber|chips|nüss|mandeln|honig|konfitüre|müesli|flakes|suppe|bouillon|sauce|ketchup|mayonnaise|senf|öl\b|olivenöl|essig|mehl|zucker|glace|dessert|snack|cracker|tortilla|wraps|bohnen|linsen|mais\b|antipasti|oliven|kapern|tomatenmark|passierte)/,
  ],
  ["baby", /(windel|baby|schnuller|babybrei)/],
  [
    "hygiene",
    /(rasier|zahnpasta|zahnbürste|zahnseide|duschgel|dusch|shampoo|spülung|deo|seife|creme|lotion|körper|gesicht|parfum|make-up|mascara|nagellack|tampon|binden|slipeinlage|feuchttücher|taschentücher|wattestäbchen|pflaster|vitamin)/,
  ],
  [
    "haushalt",
    /(waschmittel|wasch|weichspüler|spülmittel|geschirrtabs|tabs\b|reiniger|putz|wc-|toilettenpapier|haushaltpapier|küchenpapier|kehricht|abfallsäcke|schwamm|lappen|alufolie|frischhaltefolie|backpapier|batterien|insekten)/,
  ],
  [
    "kleidung",
    /(shirt|pullover|hose|jeans|leggings|pyjama|socken|strümpfe|unterhose|boxershorts|bh\b|jacke|weste|mütze|schal|handschuh|schuhe|stiefel|sneaker|hausschuhe|thermo)/,
  ],
  [
    "wohnen",
    /(kissen|decke|bettwäsche|frottier|handtuch|vorhang|teppich|kerze|vase|deko|lichterkette|lampe|leuchte|topf|pfanne|messer|schüssel|teller|tasse|gläser|aufbewahrung|regal|pflanze|blumen|orchidee|amaryllis|helleborus|weihnachtsstern|garten|werkzeug|bohrmaschine|akkuschrauber|kochtopf)/,
  ],
  [
    "freizeit",
    /(lego|puzzle|spiel|plüsch|puppe|ball\b|velo|fahrrad|ski|fitness|yoga|kopfhörer|lautsprecher|ladegerät|powerbank|usb|kabel|tablet|smartwatch|kamera|buch\b|stifte|schreib|ordner|koffer|rucksack|camping|auto)/,
  ],
];

function match(text, rules = RULES) {
  const t = String(text || "").toLowerCase();
  if (!t) return null;
  for (const [group, re] of rules) if (re.test(t)) return group;
  return null;
}

// The top-level store category decides first; deeper levels and the product
// name are only used when the top level is ambiguous.
export function classify(top, ...rest) {
  if (top && !GENERIC.test(top.trim())) {
    const g = match(top);
    if (g) return g;
  }
  const text = rest.filter(Boolean).join(" / ");
  return match(text) || match(text, NAME_RULES) || "sonstiges";
}

// For stores whose top level is broad (Lidl, Aldi): most specific category
// first, then broader ones, then the product name.
export function classifyDeep(levels, name) {
  const useful = (levels || []).filter((l) => l && !GENERIC.test(l.trim()));
  for (let i = useful.length - 1; i >= 0; i--) {
    const g = match(useful[i]);
    if (g) return g;
  }
  return match(name, NAME_RULES) || "sonstiges";
}

export function byName(name) {
  return match(name, NAME_RULES);
}

export function clip(text, max = 140) {
  if (!text) return text;
  const t = String(text).replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  return cut.slice(0, Math.max(cut.lastIndexOf(" "), max - 20)).replace(/[,;:\s]+$/, "") + " …";
}
