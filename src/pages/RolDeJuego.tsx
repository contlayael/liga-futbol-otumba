// src/pages/RolDeJuego.tsx (Actualizado con nuevo diseño)

import { useEffect, useMemo, useState } from "react";
// ▼▼▼ Importar Link y Table ▼▼▼
import { Tabs, Tab, Table } from "react-bootstrap";
import { Link } from "react-router-dom";
// ▲▲▲ Fin ▲▲▲
import { collection, getDocs } from "firebase/firestore";
import { db } from "../services/firebaseConfig";
import {
  subscribeMatchesByDateAndFuerza,
  type Match,
} from "../services/matches";
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
  const [matchesByFuerza, setMatchesByFuerza] = useState<
    Record<Fuerza, Match[]>
  >({
    "1ra": [],
    "2da": [],
    "3ra": [],
  });

  // Suscripción en tiempo real (lógica sin cambios)
  useEffect(() => {
    (async () => {
      const snap = await getDocs(collection(db, "teams"));
      const m = new Map<string, string>();
      snap.docs.forEach((d) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data: any = d.data();
        m.set(d.id, data?.nombre || "Equipo");
      });
      setTeamsMap(m);
    })();
  }, []);

  // ▼▼▼ ERROR CORREGIDO: Este useEffect estaba mal en tu código original ▼▼▼
  // Estaba escuchando solo la pestaña activa.
  // Lo corregí para que escuche a TODAS, como hicimos en DashboardArbitro.
  useEffect(() => {
    const unsubscribers: (() => void)[] = [];

    FUERZAS.forEach((fuerza) => {
      const unsub = subscribeMatchesByDateAndFuerza(date, fuerza, (arr) => {
        setMatchesByFuerza((prev) => ({ ...prev, [fuerza]: arr }));
      });
      unsubscribers.push(unsub);
    });

    return () => unsubscribers.forEach((unsub) => unsub());
  }, [date]); // Solo depende de la fecha

  const list = matchesByFuerza[active];

  const titleDate = useMemo(() => {
    const d = new Date(date + "T12:00:00Z"); // Usar T12Z para evitar errores de zona horaria
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
        {/* ▼▼▼ Corregido un div anidado inválido ▼▼▼ */}
        <div className="text-center">
          <label className="form-label mb-1 text-white text-center">
            Fecha
          </label>
          <input
            type="date"
            className="form-control" // Se estilizará por theme.css
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
      </div>

      <p className="text-center mb-4 text-white-50">{titleDate}</p>

      <Tabs
        activeKey={active}
        onSelect={(k) => setActive((k as Fuerza) ?? "1ra")}
        className="mb-3 justify-content-center"
        fill
      >
        {FUERZAS.map((f) => (
          <Tab eventKey={f} title={`${f} Fuerza`} key={f}>
            {list.length === 0 ? (
              <p className="text-center my-4 text-white-50">
                No hay partidos programados.
              </p>
            ) : (
              // ▼▼▼ ESTRUCTURA DE TABLA ACTUALIZADA ▼▼▼
              <div className="table-responsive">
                <Table className="table-light table-striped table-hover align-middle table-professional">
                  <thead className="thead-dark-professional">
                    <tr>
                      <th className="text-center">Hora</th>
                      <th className="text-center">Cancha</th>
                      <th className="text-end">Local</th>
                      <th className="text-center" style={{ width: "10%" }}></th>
                      <th className="text-start">Visitante</th>
                      <th className="text-center">Estatus</th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.map((m) => {
                      const local = teamsMap.get(m.homeTeamId) ?? "Local";
                      const visita = teamsMap.get(m.awayTeamId) ?? "Visitante";
                      const status =
                        m.status === "finished" &&
                        typeof m.homeScore === "number" &&
                        typeof m.awayScore === "number"
                          ? `Final ${m.homeScore}-${m.awayScore}`
                          : "Pendiente";
                      return (
                        <tr key={m.id}>
                          <td className="text-center fw-bold">{m.time}</td>
                          <td className="text-center">{m.field}</td>
                          {/* Equipo Local con Link */}
                          <td className="text-end">
                            <Link
                              to={`/registros/${m.homeTeamId}`}
                              className="team-link"
                            >
                              {local}
                            </Link>
                          </td>
                          <td className="fw-bold text-center text-muted">vs</td>
                          {/* Equipo Visitante con Link */}
                          <td className="text-start">
                            <Link
                              to={`/registros/${m.awayTeamId}`}
                              className="team-link"
                            >
                              {visita}
                            </Link>
                          </td>
                          {/* Estatus con color condicional */}
                          <td
                            className={`text-center fw-bold ${
                              m.status === "finished"
                                ? "text-primary-custom"
                                : "text-muted"
                            }`}
                          >
                            {status}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </Table>
              </div>
              // ▲▲▲ FIN ▲▲▲
            )}
          </Tab>
        ))}
      </Tabs>
    </div>
  );
}
