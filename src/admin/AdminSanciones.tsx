import { useEffect, useState } from "react";
import { Tabs, Tab, Modal, Button, Form, Table } from "react-bootstrap";
import {
  getActiveSuspensionsByFuerza,
  updateSuspensionGames,
  markSuspensionAsServed, // <-- 1. IMPORTAR FUNCIÓN
  type Suspension,
} from "../services/suspensions";
import type { Fuerza } from "../services/teams";

const FUERZAS: Fuerza[] = ["1ra", "2da", "3ra"];

export default function AdminSanciones() {
  const [activeTab, setActiveTab] = useState<Fuerza>("1ra");
  const [suspensions, setSuspensions] = useState<Record<Fuerza, Suspension[]>>({
    "1ra": [],
    "2da": [],
    "3ra": [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Estados para el Modal
  const [showModal, setShowModal] = useState(false);
  const [currentSuspension, setCurrentSuspension] = useState<Suspension | null>(
    null
  );
  const [newGamesCount, setNewGamesCount] = useState(1);
  const [loadingModal, setLoadingModal] = useState(false);

  // Carga todas las sanciones al inicio
  const fetchSuspensions = async () => {
    setLoading(true);
    setError("");
    try {
      const [s1, s2, s3] = await Promise.all([
        getActiveSuspensionsByFuerza("1ra"),
        getActiveSuspensionsByFuerza("2da"),
        getActiveSuspensionsByFuerza("3ra"),
      ]);
      setSuspensions({ "1ra": s1, "2da": s2, "3ra": s3 });
    } catch (e) {
      console.error(e);
      setError("No se pudieron cargar las sanciones.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuspensions();
  }, []);

  // Funciones del Modal (sin cambios)
  const openEditModal = (suspension: Suspension) => {
    setCurrentSuspension(suspension);
    setNewGamesCount(suspension.gamesSuspended);
    setShowModal(true);
  };

  const closeEditModal = () => {
    if (loadingModal) return;
    setCurrentSuspension(null);
    setShowModal(false);
  };

  const handleSaveSuspension = async () => {
    if (!currentSuspension || newGamesCount <= 0) {
      setError("El número de partidos debe ser 1 o más.");
      return;
    }

    setLoadingModal(true);
    setError("");
    try {
      await updateSuspensionGames(
        currentSuspension.id,
        currentSuspension.jornadaOfOffense,
        newGamesCount
      );
      // Refrescar los datos después de guardar
      await fetchSuspensions();
      closeEditModal();
    } catch (e) {
      console.error(e);
      setError("Error al actualizar la sanción.");
    } finally {
      setLoadingModal(false);
    }
  };

  // ▼▼▼ 2. NUEVA FUNCIÓN ▼▼▼
  /**
   * Marca una sanción como 'Served' (Cumplida)
   */
  const handleMarkAsServed = async (suspensionId: string) => {
    // Usamos window.confirm en lugar de un modal complejo para esta acción
    if (
      window.confirm("¿Estás seguro de que este jugador ya cumplió su sanción?")
    ) {
      setLoading(true); // Usamos el loading principal
      setError("");
      try {
        await markSuspensionAsServed(suspensionId);
        // Refrescar la lista de sanciones
        await fetchSuspensions();
      } catch (e) {
        console.error(e);
        setError("Error al marcar la sanción como cumplida.");
      } finally {
        setLoading(false);
      }
    }
  };
  // ▲▲▲ FIN DE NUEVA FUNCIÓN ▲▲▲

  return (
    <div className="container py-4">
      <h2 className="mb-4 text-white">Panel de Sanciones Activas</h2>
      {error && <div className="alert alert-danger">{error}</div>}
      {loading && <p className="text-white-50">Cargando sanciones...</p>}

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
                      <th>Jugador</th>
                      <th>Equipo</th>
                      <th>Motivo</th>
                      <th>Jornada (Falta)</th>
                      <th>Partidos (Sanción)</th>
                      <th>Regresa (Jornada)</th>
                      <th>Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {suspensions[fuerza].length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center text-muted">
                          No hay sanciones activas en esta fuerza.
                        </td>
                      </tr>
                    ) : (
                      suspensions[fuerza].map((s) => (
                        <tr key={s.id}>
                          <td>{s.playerName}</td>
                          <td>{s.teamName}</td>
                          <td>
                            <span className="badge bg-danger">{s.reason}</span>
                          </td>
                          <td>{s.jornadaOfOffense}</td>
                          <td>{s.gamesSuspended}</td>
                          <td>{s.returnJornada}</td>
                          <td>
                            {/* ▼▼▼ 3. BOTONES ACTUALIZADOS ▼▼▼ */}
                            <Button
                              variant="outline-info"
                              size="sm"
                              className="me-2"
                              onClick={() => openEditModal(s)}
                            >
                              Editar
                            </Button>
                            <Button
                              variant="outline-success"
                              size="sm"
                              onClick={() => handleMarkAsServed(s.id)}
                            >
                              Cumplida
                            </Button>
                            {/* ▲▲▲ FIN DE BOTONES ACTUALIZADOS ▲▲▲ */}
                          </td>
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

      {/* Modal para Editar Sanción (sin cambios) */}
      {currentSuspension && (
        <Modal show={showModal} onHide={closeEditModal} centered>
          <div className="modal-content bg-dark text-white">
            <Modal.Header>
              <Modal.Title>Editar Sanción</Modal.Title>
              <button
                type="button"
                className="btn-close btn-close-white"
                onClick={closeEditModal}
                aria-label="Close"
              ></button>
            </Modal.Header>
            <Modal.Body>
              <p>
                <strong>Jugador:</strong> {currentSuspension.playerName}
                <br />
                <strong>Equipo:</strong> {currentSuspension.teamName}
                <br />
                <strong>Sancionado en Jornada:</strong>{" "}
                {currentSuspension.jornadaOfOffense}
              </p>
              <Form.Group>
                <Form.Label>
                  <strong>Total Partidos de Suspensión</strong>
                </Form.Label>
                <Form.Control
                  type="number"
                  min="1"
                  value={newGamesCount}
                  onChange={(e) =>
                    setNewGamesCount(parseInt(e.target.value, 10) || 1)
                  }
                  disabled={loadingModal}
                />
              </Form.Group>
            </Modal.Body>
            <Modal.Footer>
              <Button
                variant="secondary"
                onClick={closeEditModal}
                disabled={loadingModal}
              >
                Cancelar
              </Button>
              <Button
                variant="primary"
                onClick={handleSaveSuspension}
                disabled={loadingModal}
              >
                {loadingModal ? "Guardando..." : "Guardar Cambios"}
              </Button>
            </Modal.Footer>
          </div>
        </Modal>
      )}
    </div>
  );
}
