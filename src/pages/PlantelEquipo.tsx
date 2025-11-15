import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Button, Card, Modal } from "react-bootstrap";
import { useAuth } from "../context/AuthContext";
import {
  getPlayersByTeamId,
  deletePlayer,
  type Player,
} from "../services/players";
import {
  type Match,
  subscribeFinishedMatchesByFuerza,
} from "../services/matches";
import {
  getActiveSuspensionForPlayer,
  type Suspension,
} from "../services/suspensions";
import type { Fuerza } from "../services/teams";

// Componente PlayerCard (Actualizado para recibir CONTEO DE ROJAS)
function PlayerCard({
  player,
  isAdmin,
  onDelete,
  yellowCardCount,
  redCardCount, // <-- AÑADIDO
  activeSuspension,
}: {
  player: Player;
  isAdmin: boolean;
  onDelete: (player: Player) => void;
  yellowCardCount: number;
  redCardCount: number; // <-- AÑADIDO
  activeSuspension: Suspension | null;
}) {
  const isSuspended = !!activeSuspension;

  return (
    <div className="col-md-4 col-sm-6 mb-4">
      <Card className="h-100 card-theme shadow-sm rounded">
        <Card.Img
          variant="top"
          src={player.photoURL}
          alt={`Foto de ${player.nombre}`}
          style={{
            height: "300px",
            objectFit: "cover",
            borderTopLeftRadius: "0.375rem",
            borderTopRightRadius: "0.375rem",
          }}
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.onerror = null;
            target.src = `https://placehold.co/600x400/343a40/ffffff?text=${player.nombre.charAt(
              0
            )}`;
          }}
        />
        <Card.Body className="d-flex flex-column">
          <Card.Title>{player.nombre}</Card.Title>
          <Card.Subtitle className="mb-2 text-white">
            {player.teamName} ({player.fuerza} Fuerza)
          </Card.Subtitle>
          <Card.Text className="text-white">
            <strong>ID Registro:</strong> {player.registroId} <br />
            <strong>Edad:</strong> {player.edad} años
          </Card.Text>

          {/* Mostrar conteo de tarjetas */}
          <div className="d-flex gap-3 mb-2">
            {yellowCardCount > 0 && (
              <span className="badge bg-warning text-dark fs-6">
                🟨 {yellowCardCount}
              </span>
            )}
            {/* ▼▼▼ AÑADIDO: CONTEO DE TARJETAS ROJAS ▼▼▼ */}
            {redCardCount > 0 && (
              <span className="badge bg-danger fs-6">🟥 {redCardCount}</span>
            )}
            {/* ▲▲▲ FIN DE CONTEO ▲▲▲ */}
          </div>

          {/* Mostrar estado de suspensión (solo si está ACTIVA) */}
          {isSuspended && (
            <div
              className="badge bg-danger text-white fs-6 p-2 mb-2"
              title={`Sancionado en Jornada ${activeSuspension.jornadaOfOffense} por ${activeSuspension.gamesSuspended} partido(s)`}
            >
              SUSPENDIDO
              <br />
              <small>Regresa en Jornada {activeSuspension.returnJornada}</small>
            </div>
          )}

          {isAdmin && (
            <Button
              variant="outline-danger"
              size="sm"
              className="mt-auto"
              onClick={() => onDelete(player)}
            >
              Eliminar Jugador
            </Button>
          )}
        </Card.Body>
      </Card>
    </div>
  );
}

// Componente principal de la página
export default function PlantelEquipo() {
  const { teamId } = useParams<{ teamId: string }>();
  const { role } = useAuth();
  const isAdmin = role === "admin";

  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [teamName, setTeamName] = useState("");
  const [fuerza, setFuerza] = useState<Fuerza | null>(null);

  const [finishedMatches, setFinishedMatches] = useState<Match[]>([]);
  const [activeSuspensions, setActiveSuspensions] = useState<
    Map<string, Suspension>
  >(new Map());

  // Estados para el modal de borrado
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [playerToDelete, setPlayerToDelete] = useState<Player | null>(null);
  const [loadingDelete, setLoadingDelete] = useState(false);

  // Cargar jugadores y obtener fuerza del equipo (sin cambios)
  useEffect(() => {
    if (!teamId) {
      setErr("No se especificó un ID de equipo.");
      setLoading(false);
      return;
    }
    const fetchPlayers = async () => {
      setLoading(true);
      setErr("");
      try {
        const data = await getPlayersByTeamId(teamId);
        setPlayers(data);
        if (data.length > 0) {
          const playerFuerza = data[0].fuerza;
          setTeamName(data[0].teamName);
          setFuerza(playerFuerza);
          const suspensionPromises = data.map((p) =>
            getActiveSuspensionForPlayer(p.id)
          );
          const suspensions = await Promise.all(suspensionPromises);
          const suspensionMap = new Map<string, Suspension>();
          suspensions.forEach((s) => {
            if (s) {
              suspensionMap.set(s.playerId, s);
            }
          });
          setActiveSuspensions(suspensionMap);
        } else {
          setTeamName("Equipo no encontrado");
        }
      } catch (e) {
        console.error(e);
        setErr("No se pudieron cargar los jugadores.");
      } finally {
        setLoading(false);
      }
    };
    fetchPlayers();
  }, [teamId]);

  // Suscribirse a los partidos finalizados (sin cambios)
  useEffect(() => {
    if (!fuerza) return;
    const unsub = subscribeFinishedMatchesByFuerza(fuerza, (matches) => {
      setFinishedMatches(matches);
    });
    return () => unsub();
  }, [fuerza]);

  // Funciones para el modal de borrado (sin cambios)
  const openDeleteModal = (player: Player) => {
    setPlayerToDelete(player);
    setShowDeleteModal(true);
  };
  const closeDeleteModal = () => {
    if (loadingDelete) return;
    setPlayerToDelete(null);
    setShowDeleteModal(false);
  };
  const handleDeletePlayer = async () => {
    if (!playerToDelete) return;
    setLoadingDelete(true);
    setErr("");
    try {
      await deletePlayer(playerToDelete);
      setPlayers(players.filter((p) => p.id !== playerToDelete.id));
      closeDeleteModal();
    } catch (e) {
      console.error("Error al eliminar jugador:", e);
      setErr("No se pudo eliminar al jugador. Inténtalo de nuevo.");
    } finally {
      setLoadingDelete(false);
    }
  };

  if (loading) {
    return (
      <p className="container text-center text-white-50 py-5">
        Cargando plantel...
      </p>
    );
  }

  return (
    <div className="container py-4">
      {/* Breadcrumb y Título (sin cambios) */}
      <nav aria-label="breadcrumb">
        <ol className="breadcrumb">
          <li className="breadcrumb-item">
            <Link to="/registros">Registros</Link>
          </li>
          <li className="breadcrumb-item active" aria-current="page">
            {teamName}
          </li>
        </ol>
      </nav>
      <h2 className="mb-4 text-white">Plantel: {teamName}</h2>
      {err && <div className="alert alert-danger">{err}</div>}

      <div className="row">
        {players.length === 0 ? (
          <p className="text-white-50">
            No hay jugadores registrados para este equipo.
          </p>
        ) : (
          players.map((player) => {
            // ▼▼▼ CÁLCULO DE TARJETAS ROJAS TOTALES AÑADIDO ▼▼▼

            let totalYellows = 0;
            let totalReds = 0; // <-- AÑADIDO

            for (const match of finishedMatches) {
              // Sumar amarillas
              if (match.yellowCardCount && match.yellowCardCount[player.id]) {
                totalYellows += match.yellowCardCount[player.id];
              }
              // Contar rojas (buscando en la nueva estructura)
              if (match.redCardReason && match.redCardReason[player.id]) {
                totalReds += 1; // <-- AÑADIDO
              }
            }

            // La suspensión activa sigue igual
            const activeSuspension = activeSuspensions.get(player.id) || null;
            // ▲▲▲ FIN DE CÁLCULOS ▲▲▲

            return (
              <PlayerCard
                key={player.id}
                player={player}
                isAdmin={isAdmin}
                onDelete={openDeleteModal}
                yellowCardCount={totalYellows}
                redCardCount={totalReds} // <-- PASAMOS EL CONTEO
                activeSuspension={activeSuspension}
              />
            );
          })
        )}
      </div>

      {/* Modal de Confirmación de Borrado (sin cambios) */}
      {playerToDelete && (
        <Modal show={showDeleteModal} onHide={closeDeleteModal} centered>
          <div className="modal-content bg-dark text-white">
            <Modal.Header>
              <Modal.Title className="text-danger">
                Confirmar Eliminación
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
                <strong>{playerToDelete.nombre}</strong> del equipo{" "}
                <strong>{playerToDelete.teamName}</strong>?
              </p>
              <p className="text-danger">
                Esta acción es irreversible y también borrará su foto.
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
    </div>
  );
}
