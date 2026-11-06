import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/halbpreis/AppShell";
import { Switch } from "@/components/ui/switch";
import { useDeals } from "@/lib/halbpreis/data";
import { GROUPS, STORES } from "@/lib/halbpreis/meta";
import { stamp } from "@/lib/halbpreis/format";
import { prefs, usePrefs } from "@/lib/halbpreis/prefs";

export const Route = createFileRoute("/einstellungen")({
  head: () => ({ meta: [{ title: "Einstellungen · Halbpreis" }] }),
  component: Einstellungen,
});

function Einstellungen() {
  const p = usePrefs();
  const { data } = useDeals();
  const countBy = (key: "group" | "store", id: string) =>
    data?.deals.filter((d) => d[key] === id).length ?? 0;

  return (
    <AppShell title="Einstellungen">
      <div className="space-y-6 p-4">
        <section>
          <h2 className="mb-2 text-sm font-semibold text-muted-foreground">Produktgruppen</h2>
          <ul className="divide-y rounded-xl border">
            {GROUPS.map((g) => (
              <li key={g.id}>
                <label className="flex h-12 items-center justify-between px-4">
                  <span className="text-sm">
                    {g.name}
                    {data && (
                      <span className="ml-2 text-xs text-muted-foreground tabular-nums">
                        {countBy("group", g.id)}
                      </span>
                    )}
                  </span>
                  <Switch
                    checked={!p.hiddenGroups.includes(g.id)}
                    onCheckedChange={() => prefs.toggleGroup(g.id)}
                  />
                </label>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-sm font-semibold text-muted-foreground">Läden</h2>
          <ul className="divide-y rounded-xl border">
            {STORES.map((s) => {
              const st = data?.stores[s.id];
              return (
                <li key={s.id}>
                  <label className="flex h-14 items-center justify-between px-4">
                    <span className="flex items-center gap-3">
                      <span className="h-6 w-1.5 rounded-full" style={{ background: s.color }} />
                      <span>
                        <span className="block text-sm">{s.name}</span>
                        {st && (
                          <span
                            className={`block text-xs ${st.ok ? "text-muted-foreground" : "text-[#E3000F]"}`}
                          >
                            {st.ok
                              ? `${countBy("store", s.id)} Angebote`
                              : st.stale
                                ? "Abruf fehlgeschlagen, ältere Daten"
                                : "Abruf fehlgeschlagen"}
                          </span>
                        )}
                      </span>
                    </span>
                    <Switch
                      checked={!p.hiddenStores.includes(s.id)}
                      onCheckedChange={() => prefs.toggleStore(s.id)}
                    />
                  </label>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="space-y-1 text-xs text-muted-foreground">
          {data && <p>Daten vom {stamp(data.generatedAt)}. Aktualisierung täglich am Morgen.</p>}
          <p>
            Migros: Angebote der Region Zürich. Coop, Denner, Lidl und Aldi: Angebote für die ganze
            Schweiz.
          </p>
          <p>
            Umrandete Rabatte sind berechnet (vor allem Lidl und Aldi, die keinen Normalpreis
            nennen): Vergleich mit dem zuletzt erfassten Preis.
          </p>
          <p>Merkliste, Alarme und Einstellungen sind nur auf diesem Gerät gespeichert.</p>
        </section>

        <button
          type="button"
          onClick={() => {
            if (window.confirm("Merkliste, Alarme und Einstellungen löschen?")) prefs.reset();
          }}
          className="h-11 w-full rounded-lg border text-sm font-semibold text-[#E3000F]"
        >
          Alles zurücksetzen
        </button>
      </div>
    </AppShell>
  );
}
