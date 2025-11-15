// src/pages/TablaGoleo.tsx (Actualizado con Borrado de Admin)

import { useEffect, useMemo, useState } from "react";
// ▼▼▼ Importaciones añadidas ▼▼▼
import { Tabs, Tab, Table, Button, Modal } from "react-bootstrap";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
// ▲▲▲ Fin ▲▲▲
import { collection, getDocs } from "firebase/firestore";
import { db } from "../services/firebaseConfig";
import {
  subscribeFinishedMatchesByFuerza,
  type Match,
} from "../services/matches";
// ▼▼▼ Importaciones añadidas ▼▼▼
import { type Player, getPlayerById, deletePlayer } from "../services/players";
// ▲▲▲ Fin ▲▲▲
import { type Fuerza } from "../services/teams";

const FUERZAS: Fuerza[] = ["1ra", "2da", "3ra"];

interface ScorerRank {
  playerId: string;
  playerName: string;
  teamId: string;
  teamName: string;
  fuerza: Fuerza;
  goals: number;
}

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

  // ▼▼▼ ESTADOS AÑADIDOS para Admin y Modal ▼▼▼
  const { role } = useAuth();
  const isAdmin = role === "admin";
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [playerToDelete, setPlayerToDelete] = useState<Player | null>(null);
  const [loadingDelete, setLoadingDelete] = useState(false);
  // ▲▲▲ FIN ▲▲▲

  // Cargar TODOS los jugadores
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

  // Suscribirse a los partidos
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
            if (!player) continue; // Si el jugador fue borrado, no aparece

            goalMap[playerId] = {
              playerId: player.id,
              playerName: player.nombre,
              teamId: player.teamId,
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

  // ▼▼▼ FUNCIONES AÑADIDAS PARA MODAL DE BORRADO ▼▼▼
  const openDeleteModal = async (scorer: ScorerRank) => {
    // Necesitamos el objeto 'Player' completo para borrar la foto
    const fullPlayer = allPlayersMap.get(scorer.playerId);
    if (!fullPlayer) {
      // Si no está en el mapa, (extraño, pero por si acaso) búscalo en la DB
      const playerFromDB = await getPlayerById(scorer.playerId);
      if (playerFromDB) {
        setPlayerToDelete(playerFromDB);
        setShowDeleteModal(true);
      } else {
        setError(`Error: No se encontró al jugador con ID ${scorer.playerId}.`);
      }
    } else {
      setPlayerToDelete(fullPlayer);
      setShowDeleteModal(true);
    }
  };

  const closeDeleteModal = () => {
    if (loadingDelete) return;
    setPlayerToDelete(null);
    setShowDeleteModal(false);
  };

  const handleDeletePlayer = async () => {
    if (!playerToDelete) return;

    setLoadingDelete(true);
    setError("");
    try {
      await deletePlayer(playerToDelete);
      // Forzamos la actualización de la UI
      // 1. Borramos al jugador del 'allPlayersMap' local
      setAllPlayersMap((prev) => {
        const next = new Map(prev);
        next.delete(playerToDelete.id);
        return next;
      });
      // 2. Cerramos el modal
      closeDeleteModal();
    } catch (e) {
      console.error("Error al eliminar jugador:", e);
      setError("No se pudo eliminar al jugador.");
    } finally {
      setLoadingDelete(false);
    }
  };
  // ▲▲▲ FIN ▲▲▲

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
            <div className="table-responsive">
              <Table className="table-light table-striped table-hover align-middle table-professional">
                <thead className="thead-dark-professional">
                  <tr>
                    <th className="text-center" style={{ width: "5%" }}>
                      #
                    </th>
                    <th className="text-start">Jugador</th>
                    <th className="text-start">Equipo</th>
                    <th className="text-center">Goles</th>
                    {/* ▼▼▼ Columna de Admin Añadida ▼▼▼ */}
                    {isAdmin && <th className="text-center">Acción</th>}
                    {/* ▲▲▲ Fin ▲▲▲ */}
                  </tr>
                </thead>
                <tbody>
                  {ranking[fuerza].length === 0 ? (
                    <tr>
                      <td
                        colSpan={isAdmin ? 5 : 4}
                        className="text-center text-muted"
                      >
                        Aún no hay goles registrados en esta fuerza.
                      </td>
                    </tr>
                  ) : (
                    ranking[fuerza].map((scorer, index) => (
                      <tr key={scorer.playerId}>
                        <td className="text-center fw-bold">{index + 1}</td>
                        <td className="text-start">{scorer.playerName}</td>
                        <td className="text-start">
                          <Link
                            to={`/registros/${scorer.teamId}`}
                            className="team-link"
                          >
                            {scorer.teamName}
                          </Link>
                        </td>
                        <td className="text-center fw-bold fs-5 text-primary-custom">
                          {scorer.goals}
                        </td>
                        {/* ▼▼▼ Celda de Admin Añadida ▼▼▼ */}
                        {isAdmin && (
                          <td className="text-center">
                            <Button
                              variant="outline-danger"
                              size="sm"
                              onClick={() => openDeleteModal(scorer)}
                            >
                              Eliminar
                            </Button>
                          </td>
                        )}
                        {/* ▲▲▲ Fin ▲▲▲ */}
                      </tr>
                    ))
                  )}
                </tbody>
              </Table>
            </div>
          </Tab>
        ))}
      </Tabs>

      {/* ▼▼▼ Modal de Confirmación de Borrado ▼▼▼ */}
      {playerToDelete && (
        <Modal show={showDeleteModal} onHide={closeDeleteModal} centered>
          <div className="modal-content bg-dark text-white">
            <Modal.Header>
              <Modal.Title className="text-danger">
                Confirmar Eliminación de Jugador
              </Modal.Title>
              <button
                type="button"
                className="btn-close btn-close-white"
                onClick={closeDeleteModal}
                aria-label="Close"
              ></button>
            </Modal.Header>
            <Modal.Body>
              <p>
                ¿Estás seguro de que deseas eliminar a{" "}
                <strong>{playerToDelete.nombre}</strong>?
              </p>
              <p className="text-danger-emphasis">
                Esta acción es irreversible. El jugador será eliminado
                permanentemente de la colección de <strong>jugadores</strong>,
                borrará su foto y desaparecerá de esta tabla de goleo.
              </p>
            </Modal.Body>
            <Modal.Footer>
              <Button
                variant="secondary"
                onClick={closeDeleteModal}
                disabled={loadingDelete}
              >
                Cancelar
              </Button>
              <Button
                variant="danger"
                onClick={handleDeletePlayer}
                disabled={loadingDelete}
              >
                {loadingDelete ? "Eliminando..." : "Eliminar"}
              </Button>
            </Modal.Footer>
          </div>
        </Modal>
      )}
      {/* ▲▲▲ Fin ▲▲▲ */}
    </div>
  );
}
