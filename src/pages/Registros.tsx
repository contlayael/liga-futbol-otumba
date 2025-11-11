// src/pages/Registros.tsx (Corregido)

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Tabs, Tab, Card } from "react-bootstrap";
import { getTeamsByFuerza, type Fuerza, type Team } from "../services/teams";
import {
  searchPlayersByName,
  searchPlayersByRegistroId,
  type Player,
} from "../services/players";

const FUERZAS: Fuerza[] = ["1ra", "2da", "3ra"];

// Componente de tarjeta para mostrar resultados de búsqueda
function PlayerCard({ player }: { player: Player }) {
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
        <Card.Body>
          <Card.Title>{player.nombre}</Card.Title>
          <Card.Subtitle className="mb-2">
            {player.teamName} ({player.fuerza} Fuerza)
          </Card.Subtitle>
          <Card.Text className="text-white">
            <strong>ID Registro:</strong> {player.registroId} <br />
            <strong>Edad:</strong> {player.edad} años
          </Card.Text>
          <Link
            to={`/registros/${player.teamId}`}
            className="btn btn-outline-light btn-sm"
          >
            Ver Plantel Completo
          </Link>
        </Card.Body>
      </Card>
    </div>
  );
}

// ▼▼▼ 1. DEFINIMOS EL TIPO ESPECIÍFICO ▼▼▼
type SearchType = "nombre" | "registroId";

export default function Registros() {
  const [activeKey, setActiveKey] = useState<Fuerza>("1ra");
  const [equipos, setEquipos] = useState<Record<Fuerza, Team[]>>({
    "1ra": [],
    "2da": [],
    "3ra": [],
  });
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // Estados para la Búsqueda
  const [searchTerm, setSearchTerm] = useState("");
  // ▼▼▼ 2. USAMOS NUESTRO TIPO ▼▼▼
  const [searchType, setSearchType] = useState<SearchType>("nombre");
  const [searchResults, setSearchResults] = useState<Player[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [searchMessage, setSearchMessage] = useState("");

  // Cargar equipos
  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr("");
      try {
        const [teams1ra, teams2da, teams3ra] = await Promise.all([
          getTeamsByFuerza("1ra"),
          getTeamsByFuerza("2da"),
          getTeamsByFuerza("3ra"),
        ]);
        setEquipos({ "1ra": teams1ra, "2da": teams2da, "3ra": teams3ra });
      } catch (e) {
        console.error(e);
        setErr("No se pudieron cargar los equipos.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Función para manejar la búsqueda
  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      setSearchMessage("Ingresa un término de búsqueda.");
      setSearchResults([]);
      return;
    }
    setLoadingSearch(true);
    setSearchMessage("");
    setSearchResults([]);
    try {
      let results: Player[] = [];
      if (searchType === "nombre") {
        const searchTermCapitalized =
          searchTerm.charAt(0).toUpperCase() + searchTerm.slice(1);
        results = await searchPlayersByName(searchTermCapitalized);
      } else {
        results = await searchPlayersByRegistroId(
          searchTerm.trim().toUpperCase()
        );
      }
      setSearchResults(results);
      if (results.length === 0) {
        setSearchMessage("No se encontraron jugadores.");
      }
    } catch (e) {
      console.error("Error en búsqueda:", e);
      setSearchMessage("Ocurrió un error al buscar.");
    } finally {
      setLoadingSearch(false);
    }
  };

  return (
    <div className="container py-4">
      <h2 className="mb-4 text-center text-white">Registros de Jugadores</h2>
      {err && <div className="alert alert-danger">{err}</div>}

      {/* Formulario de Búsqueda */}
      <div className="card card-theme mb-4 p-4 rounded">
        <h5 className="mb-3">Buscar Jugador en la Liga</h5>
        <div className="row g-2">
          <div className="col-md-6">
            <input
              type="text"
              className="form-control"
              placeholder={
                searchType === "nombre"
                  ? "Buscar por nombre..."
                  : "Buscar por ID de Registro..."
              }
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
          </div>
          <div className="col-md-3">
            {/* ▼▼▼ 3. CORREGIMOS EL 'onChange' ▼▼▼ */}
            <select
              className="form-select"
              value={searchType}
              onChange={(e) => setSearchType(e.target.value as SearchType)}
            >
              <option value="nombre">Por Nombre</option>
              <option value="registroId">Por ID de Registro</option>
            </select>
            {/* ▲▲▲ FIN DE LA CORRECCIÓN ▲▲▲ */}
          </div>
          <div className="col-md-3">
            <button
              className="btn btn-primary w-100"
              onClick={handleSearch}
              disabled={loadingSearch}
            >
              {loadingSearch ? "Buscando..." : "Buscar"}
            </button>
          </div>
        </div>
      </div>

      {/* Vista condicional: Resultados de Búsqueda o Lista de Equipos */}
      {searchResults.length > 0 || loadingSearch || searchMessage ? (
        <div>
          <h4 className="text-white mb-3">Resultados de Búsqueda</h4>
          {loadingSearch && <p className="text-white-50">Buscando...</p>}
          {searchMessage && <p className="text-white-50">{searchMessage}</p>}
          <div className="row">
            {searchResults.map((player) => (
              <PlayerCard key={player.id} player={player} />
            ))}
          </div>
          <button
            className="btn btn-outline-light mt-3"
            onClick={() => {
              setSearchResults([]);
              setSearchTerm("");
              setSearchMessage("");
            }}
          >
            Limpiar búsqueda y ver equipos
          </button>
        </div>
      ) : (
        <>
          <h4 className="text-white mb-3">Ver Plantel por Equipo</h4>
          <Tabs
            activeKey={activeKey}
            onSelect={(k) => setActiveKey((k as Fuerza) ?? "1ra")}
            className="mb-3 justify-content-center"
            fill
          >
            {FUERZAS.map((fuerza: Fuerza) => (
              <Tab eventKey={fuerza} title={`${fuerza} Fuerza`} key={fuerza}>
                {loading ? (
                  <p className="text-center text-white">Cargando equipos...</p>
                ) : (
                  <div className="list-group list-group-professional">
                    {equipos[fuerza].length === 0 ? (
                      <p className="text-center text-muted p-3">
                        No hay equipos en esta fuerza.
                      </p>
                    ) : (
                      equipos[fuerza].map((team: Team) => (
                        <Link
                          key={team.id}
                          to={`/registros/${team.id}`}
                          className="list-group-item list-group-item-action fw-bolder"
                        >
                          {team.nombre}
                        </Link>
                      ))
                    )}
                  </div>
                )}
              </Tab>
            ))}
          </Tabs>
        </>
      )}
    </div>
  );
}
