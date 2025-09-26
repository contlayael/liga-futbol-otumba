import { useEffect, useState } from "react";
import { Tabs, Tab } from "react-bootstrap";
import { subscribeFinishedMatchesByFuerza } from "../services/matches";
import { getTeamsByFuerza, type Fuerza, type Team, type Stats, type BaselineStats } from "../services/teams";
import "bootstrap/dist/css/bootstrap.min.css";

// Las constantes y funciones de ayuda se mantienen igual
const FUERZAS: Fuerza[] = ["1ra", "2da", "3ra"];
type Row = { teamId: string; nombre: string; stats: Stats };
const ZERO_STATS: Stats = { PJ: 0, G: 0, E: 0, P: 0, GF: 0, GC: 0, DG: 0, Pts: 0 };

function addStats(a: Stats, b: Stats): Stats {
  const GF = a.GF + b.GF;
  const GC = a.GC + b.GC;
  return {
    PJ: a.PJ + b.PJ, G: a.G + b.G, E: a.E + b.E, P: a.P + b.P,
    GF, GC, DG: GF - GC, Pts: a.Pts + b.Pts,
  };
}

// Esta función ahora solo calcula, ya no busca datos en Firestore
function calculateStandings(teams: (Team & { baseline?: BaselineStats })[], matches: any[]): Row[] {
  const rows: Row[] = [];

  for (const t of teams) {
    const base: Stats = t.baseline
      ? { ...t.baseline, DG: t.baseline.GF - t.baseline.GC, Pts: t.baseline.G * 3 + t.baseline.E }
      : ZERO_STATS;
    
    const limitRound = t.baseline?.upToRound ?? 0;
    
    // Filtramos los partidos relevantes para este equipo que son posteriores a su baseline
    const teamMatches = matches.filter(m => 
      (m.homeTeamId === t.id || m.awayTeamId === t.id) && m.round > limitRound
    );

    let PJ = 0, G = 0, E = 0, P = 0, GF = 0, GC = 0;
    for (const m of teamMatches) {
      const isHome = m.homeTeamId === t.id;
      const gf = isHome ? (m.homeScore ?? 0) : (m.awayScore ?? 0);
      const gc = isHome ? (m.awayScore ?? 0) : (m.homeScore ?? 0);
      PJ += 1; GF += gf; GC += gc;
      if (gf > gc) G += 1; else if (gf === gc) E += 1; else P += 1;
    }
    
    const added: Stats = { PJ, G, E, P, GF, GC, DG: GF - GC, Pts: G * 3 + E };
    const total = addStats(base, added);

    rows.push({ teamId: t.id, nombre: t.nombre, stats: total });
  }

  // Ordenamiento (sin cambios)
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
  const [tabla, setTabla] = useState<Record<Fuerza, Row[]>>({ "1ra": [], "2da": [], "3ra": [] });
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string>("");

  // Nuevos estados para manejar los datos en tiempo real
  const [teamsByFuerza, setTeamsByFuerza] = useState<Record<Fuerza, Team[]>>({ "1ra": [], "2da": [], "3ra": [] });
  const [finishedMatchesByFuerza, setFinishedMatchesByFuerza] = useState<Record<Fuerza, any[]>>({ "1ra": [], "2da": [], "3ra": [] });

  // 1. useEffect para CARGAR DATOS y establecer SUSCRIPCIONES
  useEffect(() => {
    setLoading(true);
    // Arreglo para guardar las funciones que cancelan las suscripciones
    const unsubscribers: (() => void)[] = [];

    (async () => {
      try {
        // Cargar todos los equipos una vez al inicio
        const teamsPromises = FUERZAS.map(f => getTeamsByFuerza(f));
        const [teams1ra, teams2da, teams3ra] = await Promise.all(teamsPromises);
        setTeamsByFuerza({ "1ra": teams1ra, "2da": teams2da, "3ra": teams3ra });

        // Crear una suscripción a partidos finalizados para CADA fuerza
        FUERZAS.forEach(f => {
          const unsub = subscribeFinishedMatchesByFuerza(f, (matches) => {
            setFinishedMatchesByFuerza(prev => ({ ...prev, [f]: matches }));
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
    
    // Función de limpieza para cancelar todas las suscripciones al desmontar el componente
    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, []); // Se ejecuta solo una vez al montar el componente

  // 2. useEffect para RECALCULAR la tabla cuando los datos cambien
  useEffect(() => {
    // Si no hay equipos, no hacemos nada
    if (Object.values(teamsByFuerza).every(arr => arr.length === 0)) return;

    const newTabla: Record<Fuerza, Row[]> = { "1ra": [], "2da": [], "3ra": [] };
    for (const f of FUERZAS) {
      const teams = teamsByFuerza[f];
      const matches = finishedMatchesByFuerza[f];
      newTabla[f] = calculateStandings(teams, matches);
    }
    setTabla(newTabla);
  }, [teamsByFuerza, finishedMatchesByFuerza]); // Se ejecuta cada vez que los equipos o partidos cambien

  return (
    <div className="container py-4">
      {/* ... El JSX para renderizar la tabla no necesita cambios ... */}
      <h2 className="mb-4 text-center text-white">Tabla General por Fuerza</h2>
      {err && <div className="alert alert-danger">{err}</div>}
      <Tabs activeKey={active} onSelect={(k) => setActive((k as Fuerza) ?? "1ra")} className="mb-3 justify-content-center" fill>
        {FUERZAS.map((f) => (
          <Tab eventKey={f} title={`${f} Fuerza`} key={f}>
            {(loading && tabla[f].length === 0) ? (
              <p className="text-center my-5 text-white">Cargando…</p>
            ) : (
              <div className="table-responsive">
                <table className="table table-striped table-bordered text-center align-middle">
                  <thead className="table-dark">
                    <tr>
                      <th>Club</th><th>PJ</th><th>G</th><th>E</th><th>P</th>
                      <th>GF</th><th>GC</th><th>DG</th><th>Pts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tabla[f].length === 0 ? (
                      <tr><td colSpan={9} className="text-center text-muted">Sin equipos en esta fuerza.</td></tr>
                    ) : (
                      tabla[f].map((r) => (
                        <tr key={r.teamId}>
                          <td className="text-start">{r.nombre}</td><td>{r.stats.PJ}</td>
                          <td>{r.stats.G}</td><td>{r.stats.E}</td><td>{r.stats.P}</td>
                          <td>{r.stats.GF}</td><td>{r.stats.GC}</td><td>{r.stats.DG}</td>
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