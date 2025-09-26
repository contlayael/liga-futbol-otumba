// src/pages/RolDeJuego.tsx
import { useEffect, useMemo, useState } from "react";
import { Tabs, Tab } from "react-bootstrap";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../services/firebaseConfig";
import { subscribeMatchesByDateAndFuerza, type Match } from "../services/matches";
import type { Fuerza } from "../services/teams";

const FUERZAS: Fuerza[] = ["1ra", "2da", "3ra"];

function toYMD(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function nextSunday(): string {
  const d = new Date();
  const diff = (7 - d.getDay()) % 7; // 0=domingo
  d.setDate(d.getDate() + diff);
  return toYMD(d);
}

export default function RolDeJuego() {
  const [date, setDate] = useState<string>(nextSunday());
  const [active, setActive] = useState<Fuerza>("1ra");

  const [teamsMap, setTeamsMap] = useState<Map<string, string>>(new Map());
  const [matchesByFuerza, setMatchesByFuerza] = useState<Record<Fuerza, Match[]>>({
    "1ra": [],
    "2da": [],
    "3ra": [],
  });

  // Traemos todos los equipos una vez (map id->nombre)
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

  // Suscripción en tiempo real para la fuerza activa y fecha
  useEffect(() => {
    const unsub = subscribeMatchesByDateAndFuerza(date, active, (arr) => {
      setMatchesByFuerza((prev) => ({ ...prev, [active]: arr }));
    });
    return () => unsub();
  }, [date, active]);

  const list = matchesByFuerza[active];

  const titleDate = useMemo(() => {
    const d = new Date(date + "T00:00:00");
    return d.toLocaleDateString("es-MX", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }, [date]);

  return (
    <div className="container py-4">
      <h2 className="mb-3 text-center text-white">Rol de Juego</h2>

      <div className="d-flex flex-column flex-md-row align-items-center justify-content-center gap-3 mb-3">
        <div>
          <label className="form-label mb-1 text-white">Fecha</label>
          <input type="date" className="form-control" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
      </div>

      <p className="text-center mb-4 text-white">{titleDate}</p>

      <Tabs activeKey={active} onSelect={(k) => setActive((k as Fuerza) ?? "1ra")} className="mb-3 justify-content-center" fill>
        {FUERZAS.map((f) => (
          <Tab eventKey={f} title={`${f} Fuerza`} key={f}>
            {list.length === 0 ? (
              <p className="text-center my-4 text-white">No hay partidos programados.</p>
            ) : (
              <div className="table-responsive">
                <table className="table table-striped table-bordered align-middle text-center">
                  <thead className="table-dark">
                    <tr>
                      <th>Hora</th>
                      <th>Cancha</th>
                      <th>Local</th>
                      <th></th>
                      <th>Visitante</th>
                      <th>Estatus</th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.map((m) => {
                      const local = teamsMap.get(m.homeTeamId) ?? "Local";
                      const visita = teamsMap.get(m.awayTeamId) ?? "Visitante";
                      const status =
                        m.status === "finished" && typeof m.homeScore === "number" && typeof m.awayScore === "number"
                          ? `Final ${m.homeScore}-${m.awayScore}`
                          : "Pendiente";
                      return (
                        <tr key={m.id}>
                          <td>{m.time}</td>
                          <td>{m.field}</td>
                          <td className="text-end">{local}</td>
                          <td className="fw-bold">vs</td>
                          <td className="text-start">{visita}</td>
                          <td>{status}</td>
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
