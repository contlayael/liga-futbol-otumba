// src/admin/DashboardArbitro.tsx
import { useEffect, useMemo, useState } from "react";
import { Tabs, Tab } from "react-bootstrap";
import { subscribeMatchesByDateAndFuerza, updateMatchScore, type Match } from "../services/matches";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../services/firebaseConfig";
import type { Fuerza } from "../services/teams";

const FUERZAS: Fuerza[] = ["1ra", "2da", "3ra"];

function toYMD(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function todayYMD() { return toYMD(new Date()); }

type EditRow = {
  homeScore: string;
  awayScore: string;
  noShow: "none" | "home" | "away";
  defaultWin: string; // 3 por defecto (editable)
};

export default function DashboardArbitro() {
  const [date, setDate] = useState<string>(todayYMD());
  const [active, setActive] = useState<Fuerza>("1ra");
  const [matchesByFuerza, setMatchesByFuerza] = useState<Record<Fuerza, Match[]>>({
    "1ra": [],
    "2da": [],
    "3ra": [],
  });

  const [teamsMap, setTeamsMap] = useState<Map<string, string>>(new Map());
  const [edits, setEdits] = useState<Record<string, EditRow>>({}); // matchId -> edición

  

  // Mapa id->nombre de equipos
  useEffect(() => {
    (async () => {
      const snap = await getDocs(collection(db, "teams"));
      const m = new Map<string, string>();
      snap.docs.forEach((d) => {
        const data: any = d.data();
        m.set(d.id, data?.nombre || "Equipo");
      });
      setTeamsMap(m);
    })();
  }, []);

  // Suscripción en tiempo real por fuerza/fecha
  useEffect(() => {
    const unsub = subscribeMatchesByDateAndFuerza(date, active, (arr) => {
      setMatchesByFuerza((prev) => ({ ...prev, [active]: arr }));
      // Inicializa ediciones para filas nuevas
      setEdits((prev) => {
        const next = { ...prev };
        arr.forEach((m) => {
          if (!next[m.id]) {
            next[m.id] = {
              homeScore: m.homeScore != null ? String(m.homeScore) : "",
              awayScore: m.awayScore != null ? String(m.awayScore) : "",
              noShow: m.woTeamId ? (m.woTeamId === m.homeTeamId ? "home" : "away") : "none",
              defaultWin: "3",
            };
          }
        });
        return next;
      });
    });
    return () => unsub();
  }, [date, active]);

   // ▼▼▼ PÉGALO AQUÍ ▼▼▼
  useEffect(() => {
    const intervalId = setInterval(() => {
      const hoy = todayYMD();
      setDate(fechaActual => {
        if (fechaActual !== hoy) {
          return hoy;
        }
        return fechaActual;
      });
    }, 60000);
    return () => clearInterval(intervalId);
  }, []);

  const list = matchesByFuerza[active];

  function setEdit(matchId: string, patch: Partial<EditRow>) {
    setEdits((prev) => ({ ...prev, [matchId]: { ...prev[matchId], ...patch } }));
  }

  async function save(match: Match) {
    const e = edits[match.id] || { homeScore: "", awayScore: "", noShow: "none", defaultWin: "3" };
    let home = parseInt(e.homeScore || "0", 10);
    let away = parseInt(e.awayScore || "0", 10);
    const def = Math.max(0, parseInt(e.defaultWin || "3", 10));

    // No se presentó => imponemos resultado por default
    let woTeamId: string | null = null;
    if (e.noShow === "home") {
      woTeamId = match.homeTeamId;
      home = 0;
      away = def;
    } else if (e.noShow === "away") {
      woTeamId = match.awayTeamId;
      home = def;
      away = 0;
    }

    if (home < 0 || away < 0 || Number.isNaN(home) || Number.isNaN(away)) {
      alert("Los goles deben ser números ≥ 0.");
      return;
    }

    try {
      await updateMatchScore(match.id, {
        homeScore: home,
        awayScore: away,
        status: "finished",
        woTeamId,
      });
      // La suscripción onSnapshot actualiza la UI
    } catch (err) {
      console.error(err);
      alert("No se pudo guardar el marcador.");
    }
  }

  return (
    <div className="container py-4">
      <h2 className="mb-3 text-white">Panel del Árbitro</h2>

      <div className="row g-3 align-items-end mb-3">
        <div className="col-auto">
          <label className="form-label text-white">Fecha</label>
          <input type="date" className="form-control" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
      </div>

      <Tabs activeKey={active} onSelect={(k) => setActive((k as Fuerza) ?? "1ra")} className="mb-3">
        {FUERZAS.map((f) => (
          <Tab eventKey={f} title={`${f} Fuerza`} key={f}>
            {list.length === 0 ? (
              <p className="text-white">No hay partidos programados para esta fecha.</p>
            ) : (
              <div className="table-responsive">
                <table className="table table-sm align-middle">
                  <thead className="table-dark">
                    <tr>
                      <th>Hora</th>
                      <th>Cancha</th>
                      <th className="text-end">Local</th>
                      <th className="text-center">Goles</th>
                      <th className="text-start">Visitante</th>
                      <th className="text-center">Goles</th>
                      <th>No se presentó</th>
                      <th>Guardar</th>
                      <th>Estatus</th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.map((m) => {
                      const ed = edits[m.id] || { homeScore: "", awayScore: "", noShow: "none", defaultWin: "3" };
                      const local = teamsMap.get(m.homeTeamId) ?? "Local";
                      const visita = teamsMap.get(m.awayTeamId) ?? "Visitante";
                      const finished = m.status === "finished";

                      return (
                        <tr key={m.id}>
                          <td>{m.time}</td>
                          <td>{m.field}</td>
                          <td className="text-end">{local}</td>
                          <td className="text-center" style={{ minWidth: 90 }}>
                            <input
                              type="number"
                              min={0}
                              className="form-control form-control-sm text-center"
                              value={ed.homeScore}
                              onChange={(e) => setEdit(m.id, { homeScore: e.target.value })}
                              disabled={ed.noShow === "home"}
                            />
                          </td>
                          <td className="text-start">{visita}</td>
                          <td className="text-center" style={{ minWidth: 90 }}>
                            <input
                              type="number"
                              min={0}
                              className="form-control form-control-sm text-center"
                              value={ed.awayScore}
                              onChange={(e) => setEdit(m.id, { awayScore: e.target.value })}
                              disabled={ed.noShow === "away"}
                            />
                          </td>
                          <td style={{ minWidth: 210 }}>
                            <div className="d-flex gap-2 align-items-center">
                              <select
                                className="form-select form-select-sm"
                                value={ed.noShow}
                                onChange={(e) => setEdit(m.id, { noShow: e.target.value as EditRow["noShow"] })}
                              >
                                <option value="none">—</option>
                                <option value="home">No se presentó LOCAL</option>
                                <option value="away">No se presentó VISITANTE</option>
                              </select>
                              <input
                                type="number"
                                min={0}
                                className="form-control form-control-sm"
                                style={{ width: 70 }}
                                value={ed.defaultWin}
                                onChange={(e) => setEdit(m.id, { defaultWin: e.target.value })}
                                title="Goles por default al ganador"
                                disabled={ed.noShow === 'none'}
                              />
                            </div>
                          </td>
                          <td>
                            <button
                              className="btn btn-success btn-sm"
                              onClick={() => save(m)}
                            >
                              Guardar
                            </button>
                          </td>
                          <td>
                            {finished && typeof m.homeScore === "number" && typeof m.awayScore === "number"
                              ? `Final ${m.homeScore}-${m.awayScore}`
                              : "Pendiente"}
                          </td>
                        </tr>
                      );
                    })}
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
