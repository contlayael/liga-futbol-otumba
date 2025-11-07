// src/pages/TablaGeneral.tsx (Actualizado con Tabla Clara)

import { useEffect, useState } from "react";
import { Tabs, Tab, Table } from "react-bootstrap";
import { Link } from "react-router-dom";
import {
  subscribeFinishedMatchesByFuerza,
  type Match,
} from "../services/matches";
import {
  getTeamsByFuerza,
  type Fuerza,
  type Team,
  type Stats,
  type BaselineStats,
} from "../services/teams";
import "bootstrap/dist/css/bootstrap.min.css";

const FUERZAS: Fuerza[] = ["1ra", "2da", "3ra"];
type Row = { teamId: string; nombre: string; stats: Stats };
const ZERO_STATS: Stats = {
  PJ: 0,
  G: 0,
  E: 0,
  P: 0,
  GF: 0,
  GC: 0,
  DG: 0,
  Pts: 0,
};

// ... (Las funciones addStats y calculateStandings no cambian) ...
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

function calculateStandings(
  teams: (Team & { baseline?: BaselineStats })[],
  matches: Match[]
): Row[] {
  const rows: Row[] = [];
  for (const t of teams) {
    const base: Stats = t.baseline
      ? {
          ...t.baseline,
          DG: t.baseline.GF - t.baseline.GC,
          Pts: t.baseline.G * 3 + t.baseline.E,
        }
      : ZERO_STATS;
    const limitRound = t.baseline?.upToRound ?? 0;
    const teamMatches = matches.filter(
      (m) =>
        (m.homeTeamId === t.id || m.awayTeamId === t.id) && m.round > limitRound
    );
    let PJ = 0,
      G = 0,
      E = 0,
      P = 0,
      GF = 0,
      GC = 0;
    for (const m of teamMatches) {
      const isHome = m.homeTeamId === t.id;
      const gf = isHome ? m.homeScore ?? 0 : m.awayScore ?? 0;
      const gc = isHome ? m.awayScore ?? 0 : m.homeScore ?? 0;
      PJ += 1;
      GF += gf;
      GC += gc;
      if (gf > gc) G += 1;
      else if (gf === gc) E += 1;
      else P += 1;
    }
    const added: Stats = { PJ, G, E, P, GF, GC, DG: GF - GC, Pts: G * 3 + E };
    const total = addStats(base, added);
    rows.push({ teamId: t.id, nombre: t.nombre, stats: total });
  }
  rows.sort((a, b) => {
    if (b.stats.Pts !== a.stats.Pts) return b.stats.Pts - a.stats.Pts;
    if (b.stats.DG !== a.stats.DG) return b.stats.DG - a.stats.DG;
    if (b.stats.GF !== a.stats.GF) return b.stats.GF - a.stats.GF;
    return a.nombre.localeCompare(b.nombre);
  });
  return rows;
}

export default function TablaGeneral() {
  const [active, setActive] = useState<Fuerza>("1ra");
  const [tabla, setTabla] = useState<Record<Fuerza, Row[]>>({
    "1ra": [],
    "2da": [],
    "3ra": [],
  });
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string>("");

  const [teamsByFuerza, setTeamsByFuerza] = useState<Record<Fuerza, Team[]>>({
    "1ra": [],
    "2da": [],
    "3ra": [],
  });
  const [finishedMatchesByFuerza, setFinishedMatchesByFuerza] = useState<
    Record<Fuerza, Match[]>
  >({ "1ra": [], "2da": [], "3ra": [] });

  // ... (Los useEffect para cargar datos no cambian) ...
  useEffect(() => {
    setLoading(true);
    const unsubscribers: (() => void)[] = [];
    (async () => {
      try {
        const teamsPromises = FUERZAS.map((f) => getTeamsByFuerza(f));
        const [teams1ra, teams2da, teams3ra] = await Promise.all(teamsPromises);
        setTeamsByFuerza({ "1ra": teams1ra, "2da": teams2da, "3ra": teams3ra });

        FUERZAS.forEach((f) => {
          const unsub = subscribeFinishedMatchesByFuerza(f, (matches) => {
            setFinishedMatchesByFuerza((prev) => ({ ...prev, [f]: matches }));
          });
          unsubscribers.push(unsub);
        });
      } catch (e) {
        console.error("TablaGeneral error:", e);
        setErr("No fue posible cargar los datos.");
      } finally {
        setLoading(false);
      }
    })();
    return () => unsubscribers.forEach((unsub) => unsub());
  }, []);

  useEffect(() => {
    if (Object.values(teamsByFuerza).every((arr) => arr.length === 0)) return;
    const newTabla: Record<Fuerza, Row[]> = { "1ra": [], "2da": [], "3ra": [] };
    for (const f of FUERZAS) {
      newTabla[f] = calculateStandings(
        teamsByFuerza[f],
        finishedMatchesByFuerza[f]
      );
    }
    setTabla(newTabla);
  }, [teamsByFuerza, finishedMatchesByFuerza]);

  return (
    <div className="container py-4">
      <h2 className="mb-4 text-center text-white">Tabla General por Fuerza</h2>
      {err && <div className="alert alert-danger">{err}</div>}

      <Tabs
        activeKey={active}
        onSelect={(k) => setActive((k as Fuerza) ?? "1ra")}
        className="mb-3 justify-content-center"
        fill
      >
        {FUERZAS.map((f) => (
          <Tab eventKey={f} title={`${f} Fuerza`} key={f}>
            {loading && tabla[f].length === 0 ? (
              <p className="text-center my-5 text-white">Cargando…</p>
            ) : (
              // ▼▼▼ CAMBIO DE CLASES AQUÍ ▼▼▼
              <div className="table-responsive">
                {/* Quitamos 'table-dark' y 'table-borderless'
                  Añadimos 'table-light' para el fondo blanco
                  'table-professional' es nuestra nueva clase CSS
                */}
                <Table className="table-light table-striped table-hover align-middle table-professional">
                  {/* 'thead-dark' de Bootstrap da el fondo de cabecera oscuro */}
                  <thead className="thead-dark-professional">
                    <tr>
                      <th
                        scope="col"
                        className="text-center"
                        style={{ width: "5%" }}
                      >
                        #
                      </th>
                      <th scope="col" className="text-start">
                        Club
                      </th>
                      <th scope="col" className="text-center">
                        PJ
                      </th>
                      <th scope="col" className="text-center">
                        G
                      </th>
                      <th scope="col" className="text-center">
                        E
                      </th>
                      <th scope="col" className="text-center">
                        P
                      </th>
                      <th scope="col" className="text-center">
                        GF
                      </th>
                      <th scope="col" className="text-center">
                        GC
                      </th>
                      <th scope="col" className="text-center">
                        DG
                      </th>
                      <th scope="col" className="text-center">
                        Pts
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {tabla[f].length === 0 ? (
                      <tr>
                        <td colSpan={10} className="text-center text-muted">
                          Sin equipos en esta fuerza.
                        </td>
                      </tr>
                    ) : (
                      tabla[f].map((r, index) => (
                        <tr key={r.teamId}>
                          <td className="text-center fw-bold">{index + 1}</td>
                          <td className="text-start">
                            {/* El 'team-link' ahora será oscuro por CSS */}
                            <Link
                              to={`/registros/${r.teamId}`}
                              className="team-link"
                            >
                              {r.nombre}
                            </Link>
                          </td>
                          <td className="text-center">{r.stats.PJ}</td>
                          <td className="text-center">{r.stats.G}</td>
                          <td className="text-center">{r.stats.E}</td>
                          <td className="text-center">{r.stats.P}</td>
                          <td className="text-center">{r.stats.GF}</td>
                          <td className="text-center">{r.stats.GC}</td>
                          <td className="text-center">{r.stats.DG}</td>
                          <td className="text-center fw-bold fs-5 text-primary-custom">
                            {r.stats.Pts}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </Table>
              </div>
              // ▲▲▲ FIN DE CAMBIOS ▲▲▲
            )}
          </Tab>
        ))}
      </Tabs>
    </div>
  );
}
