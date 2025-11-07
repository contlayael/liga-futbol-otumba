// src/pages/TablaGoleo.tsx
import { useEffect, useMemo, useState } from "react";
import { Tabs, Tab, Table } from "react-bootstrap";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../services/firebaseConfig";
import {
  subscribeFinishedMatchesByFuerza,
  type Match,
} from "../services/matches";
import { type Player } from "../services/players";
import { type Fuerza } from "../services/teams";

const FUERZAS: Fuerza[] = ["1ra", "2da", "3ra"];

// Interface para el ranking
interface ScorerRank {
  playerId: string;
  playerName: string;
  teamName: string;
  fuerza: Fuerza;
  goals: number;
}

export default function TablaGoleo() {
  const [activeTab, setActiveTab] = useState<Fuerza>("1ra");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // 1. Un mapa con TODOS los jugadores (id -> Player)
  const [allPlayersMap, setAllPlayersMap] = useState<Map<string, Player>>(
    new Map()
  );

  // 2. Partidos finalizados, separados por fuerza
  const [matches, setMatches] = useState<Record<Fuerza, Match[]>>({
    "1ra": [],
    "2da": [],
    "3ra": [],
  });

  // Cargar TODOS los jugadores una sola vez
  useEffect(() => {
    setLoading(true);
    (async () => {
      try {
        const snap = await getDocs(collection(db, "players"));
        const m = new Map<string, Player>();
        snap.docs.forEach((d) => {
          m.set(d.id, { id: d.id, ...(d.data() as any) } as Player);
        });
        setAllPlayersMap(m);
      } catch (e) {
        console.error(e);
        setError("No se pudieron cargar los jugadores.");
      }
    })();
  }, []);

  // Suscribirse a los partidos finalizados de CADA fuerza
  useEffect(() => {
    if (allPlayersMap.size === 0) return; // Esperar a que los jugadores carguen

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
  }, [allPlayersMap]); // Depende de que allPlayersMap esté cargado

  // 3. Calcular el ranking (se recalcula si cambian los jugadores o partidos)
  const ranking = useMemo(() => {
    const allScorers: Record<Fuerza, ScorerRank[]> = {
      "1ra": [],
      "2da": [],
      "3ra": [],
    };
    const goalMap: { [playerId: string]: ScorerRank } = {};

    // Iterar por cada fuerza
    for (const f of FUERZAS) {
      // Iterar sobre cada partido de esa fuerza
      for (const match of matches[f]) {
        if (!match.scorers) continue; // Saltar si no hay goleadores

        // Iterar sobre cada goleador en el partido
        for (const [playerId, goals] of Object.entries(match.scorers)) {
          if (goals === 0) continue;

          // Si es la primera vez que vemos a este jugador
          if (!goalMap[playerId]) {
            const player = allPlayersMap.get(playerId);
            if (!player) continue; // Jugador no encontrado (raro)

            goalMap[playerId] = {
              playerId: player.id,
              playerName: player.nombre,
              teamName: player.teamName,
              fuerza: player.fuerza,
              goals: 0,
            };
          }
          // Sumar los goles
          goalMap[playerId].goals += goals;
        }
      }
    }

    // Clasificar a los jugadores en sus respectivas fuerzas
    for (const scorer of Object.values(goalMap)) {
      if (allScorers[scorer.fuerza]) {
        allScorers[scorer.fuerza].push(scorer);
      }
    }

    // Ordenar cada ranking por goles (descendente)
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
            <div className="card card-theme">
              <div className="card-body">
                <Table responsive striped hover variant="dark">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Jugador</th>
                      <th>Equipo</th>
                      <th>Goles</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ranking[fuerza].length === 0 ? (
                      <tr>
                        <td colSpan={4} className="text-center text-white">
                          Aún no hay goles registrados en esta fuerza.
                        </td>
                      </tr>
                    ) : (
                      ranking[fuerza].map((scorer, index) => (
                        <tr key={scorer.playerId}>
                          <td className="fw-bold">{index + 1}</td>
                          <td>{scorer.playerName}</td>
                          <td>{scorer.teamName}</td>
                          <td className="fw-bold fs-5">{scorer.goals}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </Table>
              </div>
            </div>
          </Tab>
        ))}
      </Tabs>
    </div>
  );
}
