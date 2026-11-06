import { useEffect, useState } from "react";
import { Bell, BellOff, ExternalLink, Star } from "lucide-react";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { STORE, GROUP_NAME } from "@/lib/halbpreis/meta";
import { chf, shortDate, validity } from "@/lib/halbpreis/format";
import { prefs, usePrefs } from "@/lib/halbpreis/prefs";
import type { Deal } from "@/lib/halbpreis/types";
import { PctBadge, Price, StoreTag } from "./DealCard";

export function DealSheet({ deal, onClose }: { deal: Deal | null; onClose: () => void }) {
  const p = usePrefs();
  const [target, setTarget] = useState("");
  const watch = deal
    ? p.watches.find((w) => w.kind === "product" && w.dealId === deal.id)
    : undefined;
  const fav = deal ? !!p.favs[deal.id] : false;

  useEffect(() => {
    if (!deal) return;
    const t = watch && watch.kind === "product" ? watch.target : null;
    setTarget(t !== null && t !== undefined ? String(t) : deal.price ? String(deal.price) : "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deal?.id]);

  return (
    <Drawer open={!!deal} onOpenChange={(o) => !o && onClose()} shouldScaleBackground={false}>
      <DrawerContent className="max-h-[92dvh]">
        {deal && (
          <div className="mx-auto w-full max-w-lg overflow-y-auto px-4 pb-8 pt-2">
            <div className="relative mx-auto aspect-square w-full max-w-[280px] bg-white">
              {deal.img && <img src={deal.img} alt="" className="h-full w-full object-contain" />}
            </div>
            <div className="mt-3 flex items-center gap-2">
              <StoreTag store={deal.store} />
              <PctBadge deal={deal} size="lg" />
              {deal.tag && (
                <span className="text-xs font-medium text-muted-foreground">{deal.tag}</span>
              )}
            </div>
            <DrawerTitle className="mt-2 text-xl font-bold leading-tight">{deal.name}</DrawerTitle>
            {deal.info && <p className="mt-1 text-sm text-muted-foreground">{deal.info}</p>}
            <div className="mt-3">
              <Price deal={deal} large />
            </div>
            {deal.pctSrc === "history" && deal.old && (
              <p className="mt-1 text-xs text-muted-foreground">
                Rabatt berechnet: am {shortDate(deal.oldDate)} kostete es {chf(deal.old)}.
              </p>
            )}
            {!deal.pct &&
              deal.store !== "migros" &&
              deal.store !== "coop" &&
              deal.store !== "denner" && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {STORE[deal.store].name} nennt für dieses Angebot keinen Normalpreis.
                </p>
              )}
            <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
              <dt className="text-muted-foreground">Gültig</dt>
              <dd>
                {deal.from && deal.to
                  ? `${shortDate(deal.from)} – ${shortDate(deal.to)}`
                  : validity(deal.from, deal.to) || "solange Vorrat"}
              </dd>
              <dt className="text-muted-foreground">Gruppe</dt>
              <dd>{GROUP_NAME[deal.group]}</dd>
              {deal.cat && (
                <>
                  <dt className="text-muted-foreground">Kategorie</dt>
                  <dd className="line-clamp-2">{deal.cat}</dd>
                </>
              )}
            </dl>

            <div className="mt-5 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => prefs.toggleFav(deal)}
                className="flex h-11 items-center justify-center gap-2 rounded-lg border text-sm font-semibold"
              >
                <Star className={`h-4 w-4 ${fav ? "fill-[#FFB800] text-[#FFB800]" : ""}`} />
                {fav ? "Gemerkt" : "Merken"}
              </button>
              {deal.url ? (
                <a
                  href={deal.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-11 items-center justify-center gap-2 rounded-lg text-sm font-semibold"
                  style={{ background: STORE[deal.store].color, color: STORE[deal.store].on }}
                >
                  Bei {STORE[deal.store].name}
                  <ExternalLink className="h-4 w-4" />
                </a>
              ) : (
                <span />
              )}
            </div>

            <section className="mt-5 rounded-xl border p-3">
              <h4 className="flex items-center gap-2 text-sm font-semibold">
                <Bell className="h-4 w-4" /> Preisalarm
              </h4>
              <p className="mt-1 text-xs text-muted-foreground">
                Meldet sich, wenn dieses Produkt wieder im Angebot ist und höchstens so viel kostet.
              </p>
              <form
                className="mt-2 flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  const v = parseFloat(target.replace(",", "."));
                  prefs.setProductWatch(deal, Number.isFinite(v) && v > 0 ? v : null);
                }}
              >
                <label className="flex h-11 flex-1 items-center gap-2 rounded-lg border px-3">
                  <span className="text-sm text-muted-foreground">CHF</span>
                  <input
                    inputMode="decimal"
                    value={target}
                    onChange={(e) => setTarget(e.target.value)}
                    placeholder="jeder Preis"
                    className="w-full bg-transparent text-sm outline-none"
                  />
                </label>
                <button
                  type="submit"
                  className="h-11 rounded-lg bg-foreground px-4 text-sm font-semibold text-background"
                >
                  {watch ? "Ändern" : "Setzen"}
                </button>
              </form>
              {watch && (
                <button
                  type="button"
                  onClick={() => prefs.removeWatch(watch.id)}
                  className="mt-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground"
                >
                  <BellOff className="h-3.5 w-3.5" /> Alarm löschen
                </button>
              )}
            </section>
          </div>
        )}
      </DrawerContent>
    </Drawer>
  );
}
