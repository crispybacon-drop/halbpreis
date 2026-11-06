import { memo } from "react";
import { Star } from "lucide-react";
import { STORE } from "@/lib/halbpreis/meta";
import { chf, validity } from "@/lib/halbpreis/format";
import { prefs } from "@/lib/halbpreis/prefs";
import type { Deal } from "@/lib/halbpreis/types";

export function PctBadge({ deal, size = "sm" }: { deal: Deal; size?: "sm" | "lg" }) {
  if (!deal.pct) return null;
  const est = deal.pctSrc === "history";
  return (
    <span
      className={`inline-flex items-center rounded-md font-extrabold tabular-nums ${
        est ? "bg-white text-[#E3000F] ring-1 ring-inset ring-[#E3000F]" : "bg-[#E3000F] text-white"
      } ${size === "lg" ? "px-2 py-1 text-base" : "px-1.5 py-0.5 text-xs"}`}
    >
      −{deal.pct}%
    </span>
  );
}

export function StoreTag({ store }: { store: Deal["store"] }) {
  const s = STORE[store];
  return (
    <span
      className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide"
      style={{ background: s.color, color: s.on }}
    >
      {s.name}
    </span>
  );
}

export function Price({ deal, large = false }: { deal: Deal; large?: boolean }) {
  if (deal.price === null) {
    return (
      <span className={`font-bold ${large ? "text-2xl" : "text-base"}`}>
        {deal.pct ? `${deal.pct}% Rabatt` : ""}
      </span>
    );
  }
  return (
    <span className="flex items-baseline gap-1.5">
      {deal.multi && <span className="text-xs text-muted-foreground">z.B.</span>}
      <span className={`font-extrabold tabular-nums ${large ? "text-2xl" : "text-base"}`}>
        {chf(deal.price)}
      </span>
      {deal.old && (
        <span
          className={`tabular-nums text-muted-foreground line-through ${large ? "text-base" : "text-xs"}`}
        >
          {chf(deal.old)}
        </span>
      )}
    </span>
  );
}

function Card({
  deal,
  fav,
  onOpen,
  showStore = false,
}: {
  deal: Deal;
  fav: boolean;
  onOpen: (d: Deal) => void;
  showStore?: boolean;
}) {
  const s = STORE[deal.store];
  return (
    <article
      className="relative flex flex-col overflow-hidden rounded-xl border bg-card [content-visibility:auto] [contain-intrinsic-size:auto_290px]"
      style={{ borderTop: `3px solid ${s.color}` }}
    >
      <button type="button" onClick={() => onOpen(deal)} className="flex flex-1 flex-col text-left">
        <div className="relative aspect-square bg-white">
          {deal.img ? (
            <img
              src={deal.img}
              alt=""
              loading="lazy"
              decoding="async"
              onError={(e) => (e.currentTarget.style.visibility = "hidden")}
              className="h-full w-full object-contain p-2"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
              Kein Bild
            </div>
          )}
          <div className="absolute left-2 top-2">
            <PctBadge deal={deal} />
          </div>
        </div>
        <div className="flex flex-1 flex-col gap-1 p-2.5">
          {showStore && (
            <div>
              <StoreTag store={deal.store} />
            </div>
          )}
          <h3 className="line-clamp-2 text-sm font-semibold leading-snug">{deal.name}</h3>
          {deal.info && <p className="line-clamp-1 text-xs text-muted-foreground">{deal.info}</p>}
          <div className="mt-auto pt-1">
            <Price deal={deal} />
            <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">
              {[validity(deal.from, deal.to), deal.tag].filter(Boolean).join(" · ")}
            </p>
          </div>
        </div>
      </button>
      <button
        type="button"
        aria-label={fav ? "Von Merkliste entfernen" : "Auf Merkliste"}
        onClick={() => prefs.toggleFav(deal)}
        className="absolute right-1 top-1 flex h-9 w-9 items-center justify-center rounded-full"
      >
        <Star className={`h-5 w-5 ${fav ? "fill-[#FFB800] text-[#FFB800]" : "text-neutral-400"}`} />
      </button>
    </article>
  );
}

export const DealCard = memo(Card);
