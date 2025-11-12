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

import { collection, query, orderBy, getDocs } from "firebase/firestore";
import { db } from "../services/firebaseConfig";
import {
  getActiveSuspensionsByFuerza,
  type Suspension,
} from "../services/suspensions";
import { type Aviso } from "../services/avisos"; // Asumo que tienes 'avisos.ts'

const FUERZAS: Fuerza[] = ["1ra", "2da", "3ra"];
type Row = {
  teamId: string;
  nombre: string;
  stats: Stats;
  penaltyPoints: number;
};
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

// ... (Las funciones addStats y calculateStandings no cambian, están correctas) ...
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
    const penalty = t.puntosMenos || 0;
    rows.push({
      teamId: t.id,
      nombre: t.nombre,
      stats: total,
      penaltyPoints: penalty,
    });
  }
  rows.sort((a, b) => {
    const ptsA = a.stats.Pts - a.penaltyPoints;
    const ptsB = b.stats.Pts - b.penaltyPoints;
    if (ptsB !== ptsA) return ptsB - ptsA;
    if (b.stats.DG !== a.stats.DG) return b.stats.DG - a.stats.DG;
    if (b.stats.GF !== a.stats.GF) return b.stats.GF - a.stats.GF;
    return a.nombre.localeCompare(b.nombre);
  });
  return rows;
}

// ... (SancionesActivas y AvisosRecientes no cambian) ...
function SancionesActivas({ fuerza }: { fuerza: Fuerza }) {
  const [sanciones, setSanciones] = useState<Suspension[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const fetchSanciones = async () => {
      setLoading(true);
      try {
        const data = await getActiveSuspensionsByFuerza(fuerza);
        setSanciones(data);
      } catch (e) {
        console.error("Error cargando sanciones (getDocs):", e);
      } finally {
        setLoading(false);
      }
    };
    fetchSanciones();
  }, [fuerza]);

  if (loading)
    return <p className="text-white-50 text-center">Cargando sanciones...</p>;
  if (sanciones.length === 0) return null;

  return (
    <div className="card card-theme mt-4">
      <div className="card-body">
        <h4 className="mb-3 text-danger">Sanciones</h4>
        <div className="table-responsive">
          <Table className="table-light table-striped align-middle table-professional">
            <thead className="thead-dark-professional">
              <tr>
                <th className="text-start">Nombre</th>
                <th className="text-start">Equipo</th>
                <th className="text-center">Jornada (Expulsado)</th>
                <th className="text-center">Sanción (Partidos)</th>
                <th className="text-center">Regresa (Jornada)</th>
              </tr>
            </thead>
            <tbody>
              {sanciones.map((s) => (
                <tr key={s.id}>
                  <td className="text-start">{s.playerName}</td>
                  <td className="text-start">{s.teamName}</td>
                  <td className="text-center">{s.jornadaOfOffense}</td>
                  <td className="text-center fw-bold">{s.gamesSuspended}</td>
                  <td className="text-center fw-bold">{s.returnJornada}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      </div>
    </div>
  );
}
function AvisosRecientes() {
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const fetchAvisos = async () => {
      setLoading(true);
      try {
        const q = query(collection(db, "avisos"), orderBy("createdAt", "desc"));
        const snap = await getDocs(q);
        const data = snap.docs.map(
          (d) => ({ id: d.id, ...(d.data() as any) } as Aviso)
        );
        setAvisos(data);
      } catch (e) {
        console.error("Error cargando avisos (getDocs):", e);
      } finally {
        setLoading(false);
      }
    };
    fetchAvisos();
  }, []);

  if (loading)
    return <p className="text-white-50 text-center">Cargando avisos...</p>;
  if (avisos.length === 0) return null;

  return (
    <div className="card card-theme mt-4">
      <div className="card-body">
        <h4 className="mb-3 text-info">Avisos Importantes</h4>
        <div className="list-group list-group-professional">
          {avisos.map((aviso) => (
            <div key={aviso.id} className="list-group-item">
              <p className="mb-0" style={{ whiteSpace: "pre-wrap" }}>
                {aviso.text}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
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

  // ... (useEffect de carga de datos no cambia) ...
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

  // ... (useEffect de cálculo de tabla no cambia) ...
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
              <div className="table-responsive">
                <Table className="table-light table-striped table-hover align-middle table-professional">
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
                        PM
                      </th>
                      <th scope="col" className="text-center">
                        Pts
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {tabla[f].length === 0 ? (
                      <tr>
                        {/* ▼▼▼ CORRECCIÓN 1: colSpan debe ser 11 ▼▼▼ */}
                        <td colSpan={11} className="text-center text-muted">
                          Sin equipos en esta fuerza.
                        </td>
                        {/* ▲▲▲ FIN ▲▲▲ */}
                      </tr>
                    ) : (
                      tabla[f].map((r, index) => (
                        <tr key={r.teamId}>
                          <td className="text-center fw-bold">{index + 1}</td>
                          <td className="text-start">
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

                          {/* ▼▼▼ CORRECCIÓN 2: Celda PM Faltante ▼▼▼ */}
                          <td className="text-center text-danger fw-bold">
                            {r.penaltyPoints > 0 ? `-${r.penaltyPoints}` : 0}
                          </td>
                          {/* ▲▲▲ FIN ▲▲▲ */}

                          {/* Pts ahora se calcula restando la penalización */}
                          <td className="text-center fw-bold fs-5 text-primary-custom">
                            {r.stats.Pts - r.penaltyPoints}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </Table>
              </div>
            )}
            <SancionesActivas fuerza={f} />
          </Tab>
        ))}
      </Tabs>
      <AvisosRecientes />
    </div>
  );
}
