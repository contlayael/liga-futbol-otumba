// src/pages/TablaGeneral.tsx
import { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { Tabs, Tab } from "react-bootstrap";
import { db } from "../services/firebaseConfig";
import type { Fuerza, Team, Stats, BaselineStats } from "../services/teams";
import "bootstrap/dist/css/bootstrap.min.css";

const FUERZAS: Fuerza[] = ["1ra", "2da", "3ra"];

type Row = { teamId: string; nombre: string; stats: Stats };

const ZERO: Stats = { PJ: 0, G: 0, E: 0, P: 0, GF: 0, GC: 0, DG: 0, Pts: 0 };

// Normaliza valores heterogéneos de fuerza a "1ra" | "2da" | "3ra"
function normalizeFuerza(raw: any): Fuerza | undefined {
  if (!raw) return undefined;
  const v = String(raw).toLowerCase().replace(/\s+/g, "");
  if (v.startsWith("1") || v.includes("primera")) return "1ra";
  if (v.startsWith("2") || v.includes("segunda")) return "2da";
  if (v.startsWith("3") || v.includes("tercera")) return "3ra";
  return undefined;
}

function addStats(a: Stats, b: Stats): Stats {
  const GF = a.GF + b.GF;
  const GC = a.GC + b.GC;
  return {
    PJ: a.PJ + b.PJ,
    G: a.G + b.G,
    E: a.E + b.E,
    P: a.P + b.P,
    GF,
    GC,
    DG: GF - GC,
    Pts: a.Pts + b.Pts,
  };
}

function computeFromMatches(matches: any[], teamId: string): Stats {
  let PJ = 0, G = 0, E = 0, P = 0, GF = 0, GC = 0;
  for (const m of matches) {
    if (m.status !== "finished") continue;
    const isHome = m.homeTeamId === teamId;
    const gf = isHome ? (m.homeScore ?? 0) : (m.awayScore ?? 0);
    const gc = isHome ? (m.awayScore ?? 0) : (m.homeScore ?? 0);
    PJ += 1; GF += gf; GC += gc;
    if (gf > gc) G += 1; else if (gf === gc) E += 1; else P += 1;
  }
  const DG = GF - GC;
  const Pts = G * 3 + E;
  return { PJ, G, E, P, GF, GC, DG, Pts };
}

export default function TablaGeneral() {
  const [active, setActive] = useState<Fuerza>("1ra");
  const [tabla, setTabla] = useState<Record<Fuerza, Row[]>>({ "1ra": [], "2da": [], "3ra": [] });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string>("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr("");
      try {
        // Traemos TODOS los equipos y luego filtramos por fuerza normalizada
        const teamsSnap = await getDocs(collection(db, "teams"));
        const allTeams = teamsSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as (Team & { baseline?: BaselineStats })[];

        for (const f of FUERZAS) {
          const teams = allTeams.filter((t) => normalizeFuerza(t.fuerza) === f);
          const rows = await loadStandingsForTeams(teams);
          setTabla((prev) => ({ ...prev, [f]: rows }));
        }
      } catch (e: any) {
        console.error("TablaGeneral error:", e);
        setErr("No fue posible cargar la tabla general.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="container py-4">
      <h2 className="mb-4 text-center">Tabla General por Fuerza</h2>
      {err && <div className="alert alert-danger">{err}</div>}

      <Tabs activeKey={active} onSelect={(k) => setActive((k as Fuerza) ?? "1ra")} className="mb-3 justify-content-center" fill>
        {FUERZAS.map((f) => (
          <Tab eventKey={f} title={`${f} Fuerza`} key={f}>
            {loading && tabla[f].length === 0 ? (
              <p className="text-center my-5 text-white">Cargando…</p>
            ) : (
              <div className="table-responsive">
                <table className="table table-striped table-bordered text-center align-middle">
                  <thead className="table-dark">
                    <tr>
                      <th>Club</th>
                      <th>PJ</th>
                      <th>G</th>
                      <th>E</th>
                      <th>P</th>
                      <th>GF</th>
                      <th>GC</th>
                      <th>DG</th>
                      <th>Pts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tabla[f].length === 0 ? (
                      <tr><td colSpan={9} className="text-center text-muted">Sin equipos en esta fuerza.</td></tr>
                    ) : (
                      tabla[f].map((r) => (
                        <tr key={r.teamId}>
                          <td className="text-start">{r.nombre}</td>
                          <td>{r.stats.PJ}</td>
                          <td>{r.stats.G}</td>
                          <td>{r.stats.E}</td>
                          <td>{r.stats.P}</td>
                          <td>{r.stats.GF}</td>
                          <td>{r.stats.GC}</td>
                          <td>{r.stats.DG}</td>
                          <td className="fw-bold">{r.stats.Pts}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </Tab>
        ))}
      </Tabs>
    </div>
  );
}

async function loadStandingsForTeams(teams: (Team & { baseline?: BaselineStats })[]): Promise<Row[]> {
  const rows: Row[] = [];

  for (const t of teams) {
    const base: Stats = t.baseline
      ? { PJ: t.baseline.PJ, G: t.baseline.G, E: t.baseline.E, P: t.baseline.P, GF: t.baseline.GF, GC: t.baseline.GC, DG: t.baseline.DG, Pts: t.baseline.Pts }
      : ZERO;

    const limitRound = t.baseline?.upToRound ?? 0;

    // Sumar partidos finished posteriores a la baseline (si hay índices, ok; si no, seguimos con baseline)
    let matches: any[] = [];
    try {
      const qHome = query(
        collection(db, "matches"),
        where("status", "==", "finished"),
        where("homeTeamId", "==", t.id),
        where("round", ">", limitRound)
      );
      const qAway = query(
        collection(db, "matches"),
        where("status", "==", "finished"),
        where("awayTeamId", "==", t.id),
        where("round", ">", limitRound)
      );
      const [homeSnap, awaySnap] = await Promise.all([getDocs(qHome), getDocs(qAway)]);
      matches = [
        ...homeSnap.docs.map((d) => d.data()),
        ...awaySnap.docs.map((d) => d.data()),
      ] as any[];
    } catch (e) {
      // Si falta un índice compuesto, no bloqueamos el render: usamos solo baseline.
      console.warn("Matches query fallback (solo baseline):", e);
      matches = [];
    }

    const added = computeFromMatches(matches, t.id);
    const total = addStats(base, added);

    rows.push({ teamId: t.id, nombre: t.nombre, stats: total });
  }

  // Orden: Pts desc, DG desc, GF desc, nombre asc
  rows.sort((a, b) => {
    if (b.stats.Pts !== a.stats.Pts) return b.stats.Pts - a.stats.Pts;
    if (b.stats.DG !== a.stats.DG) return b.stats.DG - a.stats.DG;
    if (b.stats.GF !== a.stats.GF) return b.stats.GF - a.stats.GF;
    return a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" });
  });

  return rows;
}
