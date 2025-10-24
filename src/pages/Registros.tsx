import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Tabs, Tab } from "react-bootstrap";
import { getTeamsByFuerza, type Fuerza, type Team } from "../services/teams";

const FUERZAS: Fuerza[] = ["1ra", "2da", "3ra"];

export default function Registros() {
  const [activeKey, setActiveKey] = useState<Fuerza>("1ra");
  const [equipos, setEquipos] = useState<Record<Fuerza, Team[]>>({
    "1ra": [],
    "2da": [],
    "3ra": [],
  });
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

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
  }, []); // Carga los equipos una sola vez

  return (
    <div className="container py-4">
      <h2 className="mb-4 text-center text-white">Registros por Equipo</h2>
      {err && <div className="alert alert-danger">{err}</div>}

      <Tabs
        activeKey={activeKey}
        onSelect={(k) => setActiveKey((k as Fuerza) ?? "1ra")}
        className="mb-3 justify-content-center"
        fill
      >
        {FUERZAS.map((fuerza) => (
          <Tab eventKey={fuerza} title={`${fuerza} Fuerza`} key={fuerza}>
            {loading ? (
              <p className="text-center text-white">Cargando equipos...</p>
            ) : (
              <div className="list-group">
                {equipos[fuerza].length === 0 ? (
                  <p className="text-center text-white-50">
                    No hay equipos en esta fuerza.
                  </p>
                ) : (
                  equipos[fuerza].map((team) => (
                    <Link
                      key={team.id}
                      to={`/registros/${team.id}`}
                      className="list-group-item list-group-item-action"
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
    </div>
  );
}
