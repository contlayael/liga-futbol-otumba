import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Card, Button, Modal } from "react-bootstrap";
// Importamos la función de borrar
import {
  getPlayersByTeamId,
  deletePlayer,
  type Player,
} from "../services/players";
// Importamos useAuth para saber si somos admin
import { useAuth } from "../context/AuthContext";

// Componente PlayerCard (con props para eliminar)
function PlayerCard({
  player,
  isAdmin,
  onDelete, // Función para llamar al modal de borrado
}: {
  player: Player;
  isAdmin: boolean;
  onDelete: (player: Player) => void;
}) {
  return (
    <div className="col-md-4 col-sm-6 mb-4">
      <Card className="h-100 bg-dark text-white shadow-sm rounded">
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
            target.onerror = null; // Evita bucles infinitos si el placeholder falla
            target.src = `https://placehold.co/600x400/343a40/ffffff?text=${player.nombre.charAt(
              0
            )}`;
          }}
        />
        <Card.Body className="d-flex flex-column">
          <Card.Title>{player.nombre}</Card.Title>
          <Card.Subtitle className="mb-2 text-muted">
            {player.teamName}
          </Card.Subtitle>
          <Card.Text>
            <strong>ID Registro:</strong> {player.registroId} <br />
            <strong>Edad:</strong> {player.edad} años
          </Card.Text>

          {/* Botón de eliminar solo para admin */}
          {isAdmin && (
            <Button
              variant="outline-danger"
              size="sm"
              className="mt-auto" // Alinea el botón abajo
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
  const { role } = useAuth(); // Obtenemos el rol
  const isAdmin = role === "admin"; // Verificamos si es admin

  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [teamName, setTeamName] = useState("");

  // Estados para el modal de borrado
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [playerToDelete, setPlayerToDelete] = useState<Player | null>(null);
  const [loadingDelete, setLoadingDelete] = useState(false);

  // Cargar jugadores
  useEffect(() => {
    if (!teamId) {
      setErr("No se especificó un equipo válido.");
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
          setTeamName(data[0].teamName);
        } else {
          // TODO: Si no hay jugadores, deberíamos buscar el nombre del equipo por separado
          // (requeriría una función `getTeamById` en `teams.ts`)
          setTeamName("Equipo (sin jugadores)");
        }
      } catch (e) {
        console.error("Error al cargar la plantilla:", e);
        setErr("No se pudo cargar la plantilla del equipo.");
      } finally {
        setLoading(false);
      }
    };
    fetchPlayers();
  }, [teamId]);

  // Funciones para el modal de borrado
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
      // Actualizar la UI localmente
      setPlayers((prevPlayers) =>
        prevPlayers.filter((p) => p.id !== playerToDelete.id)
      );
      closeDeleteModal();
    } catch (e) {
      // <--- ¡AQUÍ ESTABA EL ERROR "D:"! Ya está corregido.
      console.error("Error al eliminar jugador:", e);
      setErr("No se pudo eliminar al jugador. Inténtalo de nuevo.");
    } finally {
      setLoadingDelete(false);
    }
  };

  return (
    <div className="container py-4">
      <Link to="/registros" className="btn btn-outline-light mb-3 rounded">
        &larr; Volver a todos los equipos
      </Link>
      <h2 className="text-white text-center mb-4">
        Plantel: {loading ? "Cargando..." : teamName || "Equipo no encontrado"}
      </h2>
      {err && <div className="alert alert-danger rounded">{err}</div>}
      {loading && (
        <p className="text-center text-white-50">Cargando jugadores...</p>
      )}
      {!loading && players.length === 0 && !err && (
        <p className="text-center text-white-50">
          Este equipo aún no tiene jugadores registrados.
        </p>
      )}

      <div className="row">
        {players.map((player) => (
          <PlayerCard
            key={player.id}
            player={player}
            isAdmin={isAdmin} // Pasamos el prop
            onDelete={openDeleteModal} // Pasamos la función
          />
        ))}
      </div>

      {/* Modal de Confirmación de Borrado */}
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
              disabled={loadingDelete}
            ></button>
          </Modal.Header>
          <Modal.Body>
            ¿Estás seguro de que deseas eliminar al jugador{" "}
            <strong>{playerToDelete?.nombre}</strong> del equipo{" "}
            <strong>{playerToDelete?.teamName}</strong>?
            <br />
            <small className="text-muted">
              Esta acción es permanente y también borrará su foto.
            </small>
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
    </div>
  );
}
