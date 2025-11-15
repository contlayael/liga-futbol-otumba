// src/admin/DashboardArbitro.tsx (Actualizado con Feedback en Botón)

import { useEffect, useState } from "react";
// ▼▼▼ Importar 'Alert' para los errores ▼▼▼
import { Tabs, Tab, Modal, Button, Form, Table, Alert } from "react-bootstrap";
import {
  subscribeMatchesByDateAndFuerza,
  updateMatchScore,
  type Match,
} from "../services/matches";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../services/firebaseConfig";
import type { Fuerza } from "../services/teams";
import { type Player } from "../services/players";
import {
  createDefaultSuspension,
  getActiveSuspensionForPlayer,
} from "../services/suspensions";

const FUERZAS: Fuerza[] = ["1ra", "2da", "3ra"];

function toYMD(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function todayYMD() {
  return toYMD(new Date());
}

type CardEditState = {
  yellows: 0 | 1 | 2;
  redDirect: boolean;
};

type EditRow = {
  homeScore: string;
  awayScore: string;
  noShow: "none" | "home" | "away";
  defaultWin: string;
  cardEdits: { [playerId: string]: CardEditState };
  scorerEdits: { [playerId: string]: number };
};

// ▼▼▼ TIPO AÑADIDO PARA EL ESTADO DEL BOTÓN ▼▼▼
type SaveStatus = "idle" | "saving" | "saved" | "error";

export default function DashboardArbitro() {
  const [date, setDate] = useState<string>(todayYMD());
  const [active, setActive] = useState<Fuerza>("1ra");
  const [matchesByFuerza, setMatchesByFuerza] = useState<
    Record<Fuerza, Match[]>
  >({ "1ra": [], "2da": [], "3ra": [] });

  const [teamsMap, setTeamsMap] = useState<Map<string, string>>(new Map());
  const [allPlayersMap, setAllPlayersMap] = useState<Map<string, Player>>(
    new Map()
  );
  const [showCardModal, setShowCardModal] = useState(false);
  const [showGolesModal, setShowGolesModal] = useState(false);
  const [currentMatch, setCurrentMatch] = useState<Match | null>(null);

  const [edits, setEdits] = useState<Record<string, EditRow>>({});

  // ▼▼▼ ESTADOS AÑADIDOS PARA FEEDBACK ▼▼▼
  // Almacena el estado de guardado por ID de partido
  const [saveStatus, setSaveStatus] = useState<Record<string, SaveStatus>>({});
  // Almacena el mensaje de error global
  const [globalError, setGlobalError] = useState<string>("");
  // ▲▲▲ FIN ▲▲▲

  // ... (useEffect para cargar teamsMap y allPlayersMap no cambian) ...
  useEffect(() => {
    (async () => {
      const snap = await getDocs(collection(db, "teams"));
      const m = new Map<string, string>();
      snap.docs.forEach((d) => m.set(d.id, d.data()?.nombre || "Equipo"));
      setTeamsMap(m);
    })();
  }, []);
  useEffect(() => {
    (async () => {
      const snap = await getDocs(collection(db, "players"));
      const m = new Map<string, Player>();
      snap.docs.forEach((d) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        m.set(d.id, { id: d.id, ...(d.data() as any) } as Player);
      });
      setAllPlayersMap(m);
    })();
  }, []);

  // Suscripción en tiempo real (lógica de 'edits' actualizada)
  useEffect(() => {
    const unsubscribers: (() => void)[] = [];
    FUERZAS.forEach((fuerza) => {
      const unsub = subscribeMatchesByDateAndFuerza(date, fuerza, (arr) => {
        setMatchesByFuerza((prev) => ({ ...prev, [fuerza]: arr }));
        setEdits((prev) => {
          const next = { ...prev };
          arr.forEach((m) => {
            if (!next[m.id]) {
              // Solo inicializar si es un partido nuevo
              const initialCardEdits: { [playerId: string]: CardEditState } =
                {};
              if (m.yellowCardCount) {
                for (const [pid, count] of Object.entries(m.yellowCardCount)) {
                  initialCardEdits[pid] = {
                    yellows: count as 0 | 1 | 2,
                    redDirect: false,
                  };
                }
              }
              if (m.redCardReason) {
                for (const [pid, reason] of Object.entries(m.redCardReason)) {
                  const currentState = initialCardEdits[pid] || {
                    yellows: 0,
                    redDirect: false,
                  };
                  initialCardEdits[pid] = {
                    yellows:
                      reason === "Doble Amarilla" ? 2 : currentState.yellows,
                    redDirect: reason === "Roja Directa",
                  };
                }
              }
              next[m.id] = {
                homeScore: m.homeScore != null ? String(m.homeScore) : "",
                awayScore: m.awayScore != null ? String(m.awayScore) : "",
                noShow: m.woTeamId
                  ? m.woTeamId === m.homeTeamId
                    ? "home"
                    : "away"
                  : "none",
                defaultWin: "3",
                cardEdits: initialCardEdits,
                scorerEdits: m.scorers ?? {},
              };
            }
          });
          return next;
        });
      });
      unsubscribers.push(unsub);
    });
    return () => unsubscribers.forEach((unsub) => unsub());
  }, [date]);

  const list = matchesByFuerza[active];

  function setEdit(matchId: string, patch: Partial<EditRow>) {
    setEdits((prev) => ({
      ...prev,
      [matchId]: { ...(prev[matchId] || {}), ...patch } as EditRow,
    }));
  }

  // Funciones de Modales
  const openCardModal = (match: Match) => {
    setCurrentMatch(match);
    setShowCardModal(true);
  };
  const closeCardModal = () => {
    setCurrentMatch(null);
    setShowCardModal(false);
  };
  const openGolesModal = (match: Match) => {
    setCurrentMatch(match);
    setShowGolesModal(true);
  };
  const closeGolesModal = () => {
    setCurrentMatch(null);
    setShowGolesModal(false);
  };

  // --- Función de Guardado SÚPER ACTUALIZADA ---
  async function save(match: Match) {
    const e = edits[match.id];
    if (!e) return;

    const matchId = match.id;

    // 1. Poner estado de "Guardando"
    setGlobalError(""); // Limpiar error global
    setSaveStatus((prev) => ({ ...prev, [matchId]: "saving" }));

    // Lógica de score y WO
    let home = parseInt(e.homeScore || "0", 10);
    let away = parseInt(e.awayScore || "0", 10);
    const def = Math.max(0, parseInt(e.defaultWin || "3", 10));
    let woTeamId: string | null = null;
    if (e.noShow === "home") {
      woTeamId = match.homeTeamId;
      home = 0;
      away = def;
    } else if (e.noShow === "away") {
      woTeamId = match.awayTeamId;
      home = def;
      away = 0;
    }
    if (home < 0 || away < 0 || Number.isNaN(home) || Number.isNaN(away)) {
      setGlobalError("Los goles deben ser números ≥ 0.");
      setSaveStatus((prev) => ({ ...prev, [matchId]: "error" }));
      setTimeout(
        () => setSaveStatus((prev) => ({ ...prev, [matchId]: "idle" })),
        2000
      );
      return;
    }

    // Lógica de Tarjetas
    const yellowCardCount: { [playerId: string]: number } = {};
    const redCardReason: {
      [playerId: string]: "Doble Amarilla" | "Roja Directa";
    } = {};
    const playerIdsWithCards = Object.keys(e.cardEdits);
    for (const playerId of playerIdsWithCards) {
      const cardData = e.cardEdits[playerId];
      if (cardData.yellows > 0) yellowCardCount[playerId] = cardData.yellows;
      if (cardData.redDirect) redCardReason[playerId] = "Roja Directa";
      else if (cardData.yellows === 2)
        redCardReason[playerId] = "Doble Amarilla";
    }

    // Lógica de Goles (con validación)
    const scorers = e.scorerEdits ?? {};
    let totalGoalsAssigned = 0;
    Object.values(scorers).forEach((goals) => {
      totalGoalsAssigned += goals;
    });
    const totalGoalsInScore = home + away;
    if (totalGoalsAssigned !== totalGoalsInScore && e.noShow === "none") {
      setGlobalError(
        `Error: El marcador es ${home}-${away} (Total: ${totalGoalsInScore}), pero asignaste ${totalGoalsAssigned} goles. Los totales deben coincidir.`
      );
      setSaveStatus((prev) => ({ ...prev, [matchId]: "error" }));
      setTimeout(
        () => setSaveStatus((prev) => ({ ...prev, [matchId]: "idle" })),
        2000
      );
      return;
    }

    try {
      // 2. Guardar en Firestore
      await updateMatchScore(match.id, {
        homeScore: home,
        awayScore: away,
        status: "finished",
        woTeamId,
        yellowCardCount: yellowCardCount,
        redCardReason: redCardReason,
        scorers: scorers,
      });

      // 3. Crear sanciones
      const redCardPlayerIds = Object.keys(redCardReason);
      for (const playerId of redCardPlayerIds) {
        const player = allPlayersMap.get(playerId);
        if (player) {
          const existingSuspension = await getActiveSuspensionForPlayer(
            playerId
          );
          if (!existingSuspension) {
            const reason = redCardReason[playerId];
            await createDefaultSuspension(player, match, reason);
          }
        }
      }

      // 4. ÉXITO: Poner estado "Guardado"
      setSaveStatus((prev) => ({ ...prev, [matchId]: "saved" }));
    } catch (err) {
      console.error(err);
      setGlobalError(
        "No se pudo guardar el marcador. Revisa las reglas de seguridad o la conexión."
      );
      // 5. ERROR: Poner estado "Error"
      setSaveStatus((prev) => ({ ...prev, [matchId]: "error" }));
    } finally {
      // 6. Resetear el botón después de 2 segundos (sea éxito o error)
      setTimeout(() => {
        setSaveStatus((prev) => ({ ...prev, [matchId]: "idle" }));
      }, 2000);
    }
  }
  // --- FIN DE FUNCIÓN DE GUARDADO ---

  return (
    <div className="container py-4">
      <h2 className="mb-3">Panel del Árbitro</h2>

      {/* ▼▼▼ ALERTA GLOBAL DE ERRORES ▼▼▼ */}
      {globalError && <Alert variant="danger">{globalError}</Alert>}
      {/* ▲▲▲ FIN ▲▲▲ */}

      <div className="row g-3 align-items-end mb-3">
        <div className="col-auto">
          <label className="form-label">Fecha</label>
          <input
            type="date"
            className="form-control"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
      </div>
      <Tabs
        activeKey={active}
        onSelect={(k) => setActive((k as Fuerza) ?? "1ra")}
        className="mb-3"
      >
        {FUERZAS.map((f) => (
          <Tab eventKey={f} title={`${f} Fuerza`} key={f}>
            {list.length === 0 ? (
              <p className="text-muted">No hay partidos programados...</p>
            ) : (
              <div className="table-responsive">
                <table className="table table-sm align-middle">
                  <thead className="table-dark">
                    <tr>
                      <th>Hora</th>
                      <th>Cancha</th>
                      <th className="text-end">Local</th>
                      <th className="text-center">Goles</th>
                      <th className="text-start">Visitante</th>
                      <th className="text-center">Goles</th>
                      <th>W.O.</th>
                      <th>Goles</th>
                      <th>Tarjetas</th>
                      <th>Guardar</th>
                      <th>Estatus</th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.map((m) => {
                      const ed = edits[m.id];
                      if (!ed)
                        return (
                          <tr key={m.id}>
                            <td colSpan={11}>Cargando...</td>
                          </tr>
                        );

                      const local = teamsMap.get(m.homeTeamId) ?? "Local";
                      const visita = teamsMap.get(m.awayTeamId) ?? "Visitante";
                      const finished = m.status === "finished";

                      let totalYellows = 0;
                      let totalReds = 0;
                      if (ed.cardEdits) {
                        Object.values(ed.cardEdits).forEach((card) => {
                          totalYellows += card.yellows;
                          if (card.redDirect || card.yellows === 2)
                            totalReds += 1;
                        });
                      }
                      let totalGoals = 0;
                      if (ed.scorerEdits) {
                        totalGoals = Object.values(ed.scorerEdits).reduce(
                          (sum, count) => sum + count,
                          0
                        );
                      }

                      // ▼▼▼ LÓGICA DEL ESTADO DEL BOTÓN ▼▼▼
                      const status = saveStatus[m.id] || "idle";
                      const getButtonClass = () => {
                        if (status === "saving")
                          return "btn btn-secondary btn-sm";
                        if (status === "saved") return "btn btn-success btn-sm";
                        if (status === "error") return "btn btn-danger btn-sm";
                        return "btn btn-success btn-sm"; // idle
                      };
                      const getButtonText = () => {
                        if (status === "saving") return "Guardando...";
                        if (status === "saved") return "¡Guardado! ✓";
                        if (status === "error") return "Error ❌";
                        return "Guardar";
                      };
                      // ▲▲▲ FIN ▲▲▲

                      return (
                        <tr key={m.id}>
                          <td>{m.time}</td>
                          <td>{m.field}</td>
                          <td className="text-end">{local}</td>
                          <td className="text-center" style={{ minWidth: 90 }}>
                            <input
                              type="number"
                              min={0}
                              className="form-control form-control-sm text-center"
                              value={ed.homeScore}
                              onChange={(e) =>
                                setEdit(m.id, { homeScore: e.target.value })
                              }
                              disabled={ed.noShow === "home"}
                            />
                          </td>
                          <td className="text-start">{visita}</td>
                          <td className="text-center" style={{ minWidth: 90 }}>
                            <input
                              type="number"
                              min={0}
                              className="form-control form-control-sm text-center"
                              value={ed.awayScore}
                              onChange={(e) =>
                                setEdit(m.id, { awayScore: e.target.value })
                              }
                              disabled={ed.noShow === "away"}
                            />
                          </td>
                          <td style={{ minWidth: 210 }}>
                            <div className="d-flex gap-2 align-items-center">
                              <select
                                className="form-select form-select-sm"
                                value={ed.noShow}
                                onChange={(e) =>
                                  setEdit(m.id, {
                                    noShow: e.target.value as EditRow["noShow"],
                                  })
                                }
                              >
                                <option value="none">—</option>
                                <option value="home">
                                  No se presentó LOCAL
                                </option>
                                <option value="away">
                                  No se presentó VISITANTE
                                </option>
                              </select>
                              <input
                                type="number"
                                min={0}
                                className="form-control form-control-sm"
                                style={{ width: 70 }}
                                value={ed.defaultWin}
                                onChange={(e) =>
                                  setEdit(m.id, { defaultWin: e.target.value })
                                }
                                title="Goles por default al ganador"
                                disabled={ed.noShow === "none"}
                              />
                            </div>
                          </td>
                          <td>
                            <Button
                              variant="outline-primary"
                              size="sm"
                              onClick={() => openGolesModal(m)}
                              disabled={ed.noShow !== "none"}
                            >
                              Goles ({totalGoals})
                            </Button>
                          </td>
                          <td>
                            <Button
                              variant="outline-warning"
                              size="sm"
                              onClick={() => openCardModal(m)}
                            >
                              Tarjetas (
                              <span className="text-warning">
                                🟨{totalYellows}
                              </span>
                              <span className="text-danger ms-1">
                                🟥{totalReds}
                              </span>
                              )
                            </Button>
                          </td>
                          <td>
                            {/* ▼▼▼ BOTÓN DE GUARDAR ACTUALIZADO ▼▼▼ */}
                            <button
                              className={getButtonClass()}
                              onClick={() => save(m)}
                              disabled={
                                status === "saving" || status === "saved"
                              }
                            >
                              {getButtonText()}
                            </button>
                            {/* ▲▲▲ FIN ▲▲▲ */}
                          </td>
                          <td>
                            {finished && typeof m.homeScore === "number"
                              ? `Final ${m.homeScore}-${m.awayScore}`
                              : "Pendiente"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Tab>
        ))}
      </Tabs>

      {/* Modal para Tarjetas (sin cambios) */}
      {currentMatch && (
        <TarjetasModal
          show={showCardModal}
          onHide={closeCardModal}
          match={currentMatch}
          allPlayersMap={allPlayersMap}
          editData={edits[currentMatch.id]}
          onEdit={(patch) => setEdit(currentMatch.id, patch)}
        />
      )}

      {/* Modal para Goles (sin cambios) */}
      {currentMatch && (
        <GolesModal
          show={showGolesModal}
          onHide={closeGolesModal}
          match={currentMatch}
          allPlayersMap={allPlayersMap}
          editData={edits[currentMatch.id]}
          onEdit={(patch) => setEdit(currentMatch.id, patch)}
        />
      )}
    </div>
  );
}

// ... (El componente TarjetasModal no cambia) ...
interface TarjetasModalProps {
  show: boolean;
  onHide: () => void;
  match: Match;
  allPlayersMap: Map<string, Player>;
  editData: EditRow;
  onEdit: (patch: Partial<EditRow>) => void;
}
function TarjetasModal({
  show,
  onHide,
  match,
  allPlayersMap,
  editData,
  onEdit,
}: TarjetasModalProps) {
  const [homePlayers, awayPlayers] = [
    Array.from(allPlayersMap.values()).filter(
      (p) => p.teamId === match.homeTeamId
    ),
    Array.from(allPlayersMap.values()).filter(
      (p) => p.teamId === match.awayTeamId
    ),
  ];
  const teamsMap = new Map();
  teamsMap.set(
    match.homeTeamId,
    allPlayersMap.get(homePlayers[0]?.id)?.teamName ?? "Local"
  );
  teamsMap.set(
    match.awayTeamId,
    allPlayersMap.get(awayPlayers[0]?.id)?.teamName ?? "Visitante"
  );

  const handleCardChange = (
    playerId: string,
    type: "yellows" | "redDirect",
    value: string | boolean
  ) => {
    const currentCardState = editData.cardEdits[playerId] || {
      yellows: 0,
      redDirect: false,
    };
    let newCardState: CardEditState;
    if (type === "yellows") {
      newCardState = {
        ...currentCardState,
        yellows: parseInt(value as string, 10) as 0 | 1 | 2,
      };
    } else {
      newCardState = { ...currentCardState, redDirect: value as boolean };
    }
    if (newCardState.yellows === 2) newCardState.redDirect = false;
    if (newCardState.redDirect) newCardState.yellows = 0;
    onEdit({ cardEdits: { ...editData.cardEdits, [playerId]: newCardState } });
  };

  const renderPlayerRow = (player: Player) => {
    const state = editData.cardEdits[player.id] || {
      yellows: 0,
      redDirect: false,
    };
    const getsRed = state.redDirect || state.yellows === 2;
    return (
      <tr key={player.id} className={getsRed ? "table-danger" : ""}>
        <td>{player.nombre}</td>
        <td style={{ width: "100px" }}>
          <Form.Select
            size="sm"
            value={state.yellows}
            onChange={(e) =>
              handleCardChange(player.id, "yellows", e.target.value)
            }
            disabled={state.redDirect}
          >
            <option value={0}>0</option>
            <option value={1}>1</option>
            <option value={2}>2</option>
          </Form.Select>
        </td>
        <td style={{ width: "130px" }} className="text-center">
          <Form.Check
            type="checkbox"
            id={`rd-${player.id}`}
            label="Roja Directa"
            checked={state.redDirect}
            onChange={(e) =>
              handleCardChange(player.id, "redDirect", e.target.checked)
            }
            disabled={state.yellows === 2}
          />
        </td>
      </tr>
    );
  };

  return (
    <Modal show={show} onHide={onHide} centered size="lg">
      <div className="modal-content bg-dark text-white">
        <Modal.Header>
          <Modal.Title>Registrar Tarjetas</Modal.Title>
          <button
            type="button"
            className="btn-close btn-close-white"
            onClick={onHide}
            aria-label="Close"
          ></button>
        </Modal.Header>
        <Modal.Body>
          <div className="row">
            <div className="col-md-6">
              <h5>{teamsMap.get(match.homeTeamId)} (Local)</h5>
              <Table responsive hover variant="dark" size="sm" className="mt-2">
                <thead>
                  <tr>
                    <th>Jugador</th>
                    <th>Amarillas</th>
                    <th>Roja</th>
                  </tr>
                </thead>
                <tbody>
                  {homePlayers.length > 0 ? (
                    homePlayers.map(renderPlayerRow)
                  ) : (
                    <tr>
                      <td colSpan={3} className="text-muted text-center">
                        No hay jugadores registrados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </Table>
            </div>
            <div className="col-md-6 border-start">
              <h5>{teamsMap.get(match.awayTeamId)} (Visitante)</h5>
              <Table responsive hover variant="dark" size="sm" className="mt-2">
                <thead>
                  <tr>
                    <th>Jugador</th>
                    <th>Amarillas</th>
                    <th>Roja</th>
                  </tr>
                </thead>
                <tbody>
                  {awayPlayers.length > 0 ? (
                    awayPlayers.map(renderPlayerRow)
                  ) : (
                    <tr>
                      <td colSpan={3} className="text-muted text-center">
                        No hay jugadores registrados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </Table>
            </div>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="primary" onClick={onHide}>
            Aceptar
          </Button>
        </Modal.Footer>
      </div>
    </Modal>
  );
}

// ... (El componente GolesModal no cambia) ...
interface GolesModalProps {
  show: boolean;
  onHide: () => void;
  match: Match;
  allPlayersMap: Map<string, Player>;
  editData: EditRow;
  onEdit: (patch: Partial<EditRow>) => void;
}
function GolesModal({
  show,
  onHide,
  match,
  allPlayersMap,
  editData,
  onEdit,
}: GolesModalProps) {
  const [homePlayers, awayPlayers] = [
    Array.from(allPlayersMap.values()).filter(
      (p) => p.teamId === match.homeTeamId
    ),
    Array.from(allPlayersMap.values()).filter(
      (p) => p.teamId === match.awayTeamId
    ),
  ];
  const teamsMap = new Map();
  teamsMap.set(
    match.homeTeamId,
    allPlayersMap.get(homePlayers[0]?.id)?.teamName ?? "Local"
  );
  teamsMap.set(
    match.awayTeamId,
    allPlayersMap.get(awayPlayers[0]?.id)?.teamName ?? "Visitante"
  );

  const handleGoalChange = (playerId: string, goals: string) => {
    const newCount = Math.max(0, parseInt(goals, 10) || 0);
    const newScorerEdits = { ...editData.scorerEdits };
    if (newCount === 0) {
      delete newScorerEdits[playerId];
    } else {
      newScorerEdits[playerId] = newCount;
    }
    onEdit({ scorerEdits: newScorerEdits });
  };

  const renderPlayerRow = (player: Player) => {
    const goalCount = editData.scorerEdits[player.id] || 0;
    return (
      <tr key={player.id}>
        <td>{player.nombre}</td>
        <td style={{ width: "100px" }}>
          <Form.Control
            type="number"
            size="sm"
            min={0}
            value={goalCount === 0 ? "" : goalCount}
            placeholder="0"
            onChange={(e) => handleGoalChange(player.id, e.target.value)}
          />
        </td>
      </tr>
    );
  };

  const homeGoals = parseInt(editData.homeScore, 10) || 0;
  const awayGoals = parseInt(editData.awayScore, 10) || 0;
  const totalGoals = homeGoals + awayGoals;
  const assignedGoals = Object.values(editData.scorerEdits).reduce(
    (sum, count) => sum + count,
    0
  );

  return (
    <Modal show={show} onHide={onHide} centered size="lg">
      <div className="modal-content bg-dark text-white">
        <Modal.Header>
          <Modal.Title>Registrar Goleadores</Modal.Title>
          <button
            type="button"
            className="btn-close btn-close-white"
            onClick={onHide}
            aria-label="Close"
          ></button>
        </Modal.Header>
        <Modal.Body>
          <div className="alert alert-info">
            Marcador:{" "}
            <strong>
              {homeGoals} - {awayGoals}
            </strong>{" "}
            (Total: {totalGoals} Goles)
            <br />
            Goles Asignados: <strong>{assignedGoals}</strong>
            {totalGoals !== assignedGoals && (
              <span className="text-danger d-block fw-bold">
                ¡Los goles asignados no coinciden con el marcador!
              </span>
            )}
          </div>
          <div className="row">
            <div className="col-md-6">
              <h5>{teamsMap.get(match.homeTeamId)} (Local)</h5>
              <Table responsive hover variant="dark" size="sm" className="mt-2">
                <thead>
                  <tr>
                    <th>Jugador</th>
                    <th>Goles</th>
                  </tr>
                </thead>
                <tbody>
                  {homePlayers.length > 0 ? (
                    homePlayers.map(renderPlayerRow)
                  ) : (
                    <tr>
                      <td colSpan={2} className="text-muted text-center">
                        No hay jugadores registrados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </Table>
            </div>
            <div className="col-md-6 border-start">
              <h5>{teamsMap.get(match.awayTeamId)} (Visitante)</h5>
              <Table responsive hover variant="dark" size="sm" className="mt-2">
                <thead>
                  <tr>
                    <th>Jugador</th>
                    <th>Goles</th>
                  </tr>
                </thead>
                <tbody>
                  {awayPlayers.length > 0 ? (
                    awayPlayers.map(renderPlayerRow)
                  ) : (
                    <tr>
                      <td colSpan={2} className="text-muted text-center">
                        No hay jugadores registrados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </Table>
            </div>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="primary" onClick={onHide}>
            Aceptar
          </Button>
        </Modal.Footer>
      </div>
    </Modal>
  );
}
