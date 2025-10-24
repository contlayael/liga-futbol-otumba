import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Card } from "react-bootstrap";
import { getPlayersByTeamId, type Player } from "../services/players"; // Asegúrate que la ruta sea correcta

// Componente de tarjeta para un solo jugador
function PlayerCard({ player }: { player: Player }) {
  return (
    <div className="col-md-4 col-sm-6 mb-4">
      <Card className="h-100 bg-dark text-white shadow-sm rounded">
        {" "}
        {/* Añadido rounded */}
        <Card.Img
          variant="top"
          src={player.photoURL}
          alt={`Foto de ${player.nombre}`}
          style={{
            height: "300px",
            objectFit: "cover",
            borderTopLeftRadius: "0.375rem",
            borderTopRightRadius: "0.375rem",
          }} // Estilos para esquinas redondeadas
          // Añadimos un fallback por si la imagen no carga
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.onerror = null; // Prevenir bucles infinitos
            target.src = `https://placehold.co/600x400/343a40/ffffff?text=${player.nombre.charAt(
              0
            )}`; // Placeholder con inicial
          }}
        />
        <Card.Body>
          <Card.Title>{player.nombre}</Card.Title>
          <Card.Text>Edad: {player.edad} años</Card.Text>
        </Card.Body>
      </Card>
    </div>
  );
}

// Página principal del plantel
export default function PlantelEquipo() {
  // Obtiene el teamId de los parámetros de la URL
  const { teamId } = useParams<{ teamId: string }>();
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [teamName, setTeamName] = useState("");

  useEffect(() => {
    // Verifica si el teamId existe antes de buscar
    if (!teamId) {
      setErr("No se especificó un equipo válido.");
      setLoading(false);
      return;
    }

    // Función asíncrona para cargar los jugadores
    const fetchPlayers = async () => {
      setLoading(true);
      setErr("");
      try {
        const data = await getPlayersByTeamId(teamId);
        setPlayers(data);
        // Si hay jugadores, toma el nombre del equipo del primero
        if (data.length > 0) {
          setTeamName(data[0].teamName);
        } else {
          // Si no hay jugadores, podríamos intentar buscar el nombre del equipo por separado
          // (Esto requeriría una función getTeamById en teams.ts, por ahora lo dejamos así)
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
  }, [teamId]); // El efecto se ejecuta cada vez que cambia el teamId

  return (
    <div className="container py-4">
      {/* Botón para volver a la lista de equipos */}
      <Link to="/registros" className="btn btn-outline-light mb-3 rounded">
        {" "}
        {/* Añadido rounded */}
        &larr; Volver a todos los equipos
      </Link>
      {/* Título de la página */}
      <h2 className="text-white text-center mb-4">
        Plantel: {loading ? "Cargando..." : teamName || "Equipo no encontrado"}
      </h2>
      {/* Muestra errores si los hay */}
      {err && <div className="alert alert-danger rounded">{err}</div>}{" "}
      {/* Añadido rounded */}
      {/* Mensaje si está cargando */}
      {loading && (
        <p className="text-center text-white-50">Cargando jugadores...</p>
      )}
      {/* Mensaje si no hay jugadores y no está cargando */}
      {!loading && players.length === 0 && !err && (
        <p className="text-center text-white-50">
          Este equipo aún no tiene jugadores registrados.
        </p>
      )}
      {/* Muestra las tarjetas de los jugadores */}
      <div className="row">
        {players.map((player) => (
          <PlayerCard key={player.id} player={player} />
        ))}
      </div>
    </div>
  );
}
