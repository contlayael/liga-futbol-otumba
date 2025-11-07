// src/pages/TablaGoleo.tsx (Actualizado con Tabla Clara)

import { useEffect, useMemo, useState } from "react";
// ▼▼▼ Importar Link ▼▼▼
import { Tabs, Tab, Table } from "react-bootstrap";
import { Link } from "react-router-dom";
// ▲▲▲ Fin ▲▲▲
import { collection, getDocs } from "firebase/firestore";
import { db } from "../services/firebaseConfig";
import {
  subscribeFinishedMatchesByFuerza,
  type Match,
} from "../services/matches";
import { type Player } from "../services/players";
import { type Fuerza } from "../services/teams";

const FUERZAS: Fuerza[] = ["1ra", "2da", "3ra"];

// ▼▼▼ Interfaz actualizada para incluir teamId para el enlace ▼▼▼
interface ScorerRank {
  playerId: string;
  playerName: string;
  teamId: string; // <-- AÑADIDO
  teamName: string;
  fuerza: Fuerza;
  goals: number;
}
// ▲▲▲ Fin ▲▲▲

export default function TablaGoleo() {
  const [activeTab, setActiveTab] = useState<Fuerza>("1ra");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [allPlayersMap, setAllPlayersMap] = useState<Map<string, Player>>(
    new Map()
  );
  const [matches, setMatches] = useState<Record<Fuerza, Match[]>>({
    "1ra": [],
    "2da": [],
    "3ra": [],
  });

  // Cargar TODOS los jugadores (sin cambios)
  useEffect(() => {
    setLoading(true);
    (async () => {
      try {
        const snap = await getDocs(collection(db, "players"));
        const m = new Map<string, Player>();
        snap.docs.forEach((d) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          m.set(d.id, { id: d.id, ...(d.data() as any) } as Player);
        });
        setAllPlayersMap(m);
      } catch (e) {
        console.error(e);
        setError("No se pudieron cargar los jugadores.");
      }
    })();
  }, []);

  // Suscribirse a los partidos (sin cambios)
  useEffect(() => {
    if (allPlayersMap.size === 0) return;

    setLoading(true);
    try {
      const unsubscribers = FUERZAS.map((f) =>
        subscribeFinishedMatchesByFuerza(f, (finishedMatches) => {
          setMatches((prev) => ({ ...prev, [f]: finishedMatches }));
        })
      );
      setLoading(false);
      return () => unsubscribers.forEach((unsub) => unsub());
    } catch (e) {
      console.error(e);
      setError("No se pudieron cargar los partidos.");
      setLoading(false);
    }
  }, [allPlayersMap]);

  // Calcular el ranking (actualizado para incluir teamId)
  const ranking = useMemo(() => {
    const allScorers: Record<Fuerza, ScorerRank[]> = {
      "1ra": [],
      "2da": [],
      "3ra": [],
    };
    const goalMap: { [playerId: string]: ScorerRank } = {};

    for (const f of FUERZAS) {
      for (const match of matches[f]) {
        if (!match.scorers) continue;

        for (const [playerId, goals] of Object.entries(match.scorers)) {
          if (goals === 0) continue;

          if (!goalMap[playerId]) {
            const player = allPlayersMap.get(playerId);
            if (!player) continue;

            goalMap[playerId] = {
              playerId: player.id,
              playerName: player.nombre,
              teamId: player.teamId, // <-- AÑADIDO
              teamName: player.teamName,
              fuerza: player.fuerza,
              goals: 0,
            };
          }
          goalMap[playerId].goals += goals;
        }
      }
    }

    for (const scorer of Object.values(goalMap)) {
      if (allScorers[scorer.fuerza]) {
        allScorers[scorer.fuerza].push(scorer);
      }
    }

    for (const f of FUERZAS) {
      allScorers[f].sort((a, b) => b.goals - a.goals);
    }

    return allScorers;
  }, [matches, allPlayersMap]);

  return (
    <div className="container py-4">
      <h2 className="mb-4 text-center text-white">Tabla de Goleo Individual</h2>
      {error && <div className="alert alert-danger">{error}</div>}
      {loading && <p className="text-center text-white-50">Cargando...</p>}

      <Tabs
        activeKey={activeTab}
        onSelect={(k) => setActiveTab((k as Fuerza) ?? "1ra")}
        className="mb-3 justify-content-center"
        fill
      >
        {FUERZAS.map((fuerza) => (
          <Tab eventKey={fuerza} title={`${fuerza} Fuerza`} key={fuerza}>
            {/* ▼▼▼ SE ELIMINA EL DIV .card .card-theme ▼▼▼ */}
            <div className="table-responsive">
              <Table className="table-light table-striped table-hover align-middle table-professional">
                <thead className="thead-dark-professional">
                  {/* ▼▼▼ CABECERA ACTUALIZADA ▼▼▼ */}
                  <tr>
                    <th className="text-center" style={{ width: "5%" }}>
                      #
                    </th>
                    <th className="text-start">Jugador</th>
                    <th className="text-start">Equipo</th>
                    <th className="text-center">Goles</th>
                  </tr>
                  {/* ▲▲▲ FIN ▲▲▲ */}
                </thead>
                <tbody>
                  {ranking[fuerza].length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center text-muted">
                        Aún no hay goles registrados en esta fuerza.
                      </td>
                    </tr>
                  ) : (
                    ranking[fuerza].map((scorer, index) => (
                      <tr key={scorer.playerId}>
                        <td className="text-center fw-bold">{index + 1}</td>
                        <td className="text-start">{scorer.playerName}</td>
                        {/* ▼▼▼ EQUIPO CON ENLACE ▼▼▼ */}
                        <td className="text-start">
                          <Link
                            to={`/registros/${scorer.teamId}`}
                            className="team-link"
                          >
                            {scorer.teamName}
                          </Link>
                        </td>
                        {/* ▲▲▲ FIN ▲▲▲ */}
                        <td className="text-center fw-bold fs-5 text-primary-custom">
                          {scorer.goals}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </Table>
            </div>
            {/* ▲▲▲ FIN DE CAMBIOS ▲▲▲ */}
          </Tab>
        ))}
      </Tabs>
    </div>
  );
}
