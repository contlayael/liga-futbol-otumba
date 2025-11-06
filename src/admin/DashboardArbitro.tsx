import { useEffect, useState } from "react";
import { Tabs, Tab, Modal, Button, Form, Table } from "react-bootstrap";
import {
  subscribeMatchesByDateAndFuerza,
  updateMatchScore,
  type Match,
} from "../services/matches";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../services/firebaseConfig";
import type { Fuerza } from "../services/teams";
import { type Player } from "../services/players"; // No necesitamos getPlayersByTeamId aquí
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

// --- Tipo de estado de edición actualizado ---
type CardEditState = {
  yellows: 0 | 1 | 2;
  redDirect: boolean;
};

type EditRow = {
  homeScore: string;
  awayScore: string;
  noShow: "none" | "home" | "away";
  defaultWin: string;
  /**
   * Mapea un playerId a su estado de tarjetas para este partido.
   * Ejemplo: { "player-abc": { yellows: 2, redDirect: false } }
   */
  cardEdits: { [playerId: string]: CardEditState };
};
// --- Fin de tipo actualizado ---

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
  const [currentMatch, setCurrentMatch] = useState<Match | null>(null);

  const [edits, setEdits] = useState<Record<string, EditRow>>({});

  // Carga mapa id->nombre de equipos
  useEffect(() => {
    (async () => {
      const snap = await getDocs(collection(db, "teams"));
      const m = new Map<string, string>();
      snap.docs.forEach((d) => m.set(d.id, d.data()?.nombre || "Equipo"));
      setTeamsMap(m);
    })();
  }, []);

  // Carga mapa id->Player de TODOS los jugadores
  useEffect(() => {
    (async () => {
      const snap = await getDocs(collection(db, "players"));
      const m = new Map<string, Player>();
      snap.docs.forEach((d) => {
        m.set(d.id, { id: d.id, ...(d.data() as any) } as Player);
      });
      setAllPlayersMap(m);
    })();
  }, []);

  // Suscripción en tiempo real por fuerza/fecha
  useEffect(() => {
    const unsubscribers: (() => void)[] = [];
    FUERZAS.forEach((fuerza) => {
      const unsub = subscribeMatchesByDateAndFuerza(date, fuerza, (arr) => {
        setMatchesByFuerza((prev) => ({ ...prev, [fuerza]: arr }));

        // Inicializa ediciones para filas nuevas
        setEdits((prev) => {
          const next = { ...prev };
          arr.forEach((m) => {
            if (!next[m.id]) {
              // --- Lógica de inicialización de tarjetas actualizada ---
              const initialCardEdits: { [playerId: string]: CardEditState } =
                {};

              // 1. Pre-poblar desde yellowCardCount (nueva estructura)
              if (m.yellowCardCount) {
                for (const [pid, count] of Object.entries(m.yellowCardCount)) {
                  initialCardEdits[pid] = {
                    yellows: count as 0 | 1 | 2,
                    redDirect: false,
                  };
                }
              }
              // 2. Pre-poblar desde redCardReason (nueva estructura)
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
              // --- Fin de lógica ---

              next[m.id] = {
                homeScore: m.homeScore != null ? String(m.homeScore) : "",
                awayScore: m.awayScore != null ? String(m.awayScore) : "",
                noShow: m.woTeamId
                  ? m.woTeamId === m.homeTeamId
                    ? "home"
                    : "away"
                  : "none",
                defaultWin: "3",
                cardEdits: initialCardEdits, // Asignar estado inicial
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

  const openCardModal = (match: Match) => {
    setCurrentMatch(match);
    setShowCardModal(true);
  };
  const closeCardModal = () => {
    setCurrentMatch(null);
    setShowCardModal(false);
  };

  // --- Función de Guardado Actualizada ---
  async function save(match: Match) {
    const e = edits[match.id];
    if (!e) return;

    // Lógica de score y WO (sin cambios)
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
      alert("Los goles deben ser números ≥ 0.");
      return;
    }

    // --- NUEVA LÓGICA DE TARJETAS ---
    const yellowCardCount: { [playerId: string]: number } = {};
    const redCardReason: {
      [playerId: string]: "Doble Amarilla" | "Roja Directa";
    } = {};
    const playerIdsWithCards = Object.keys(e.cardEdits);

    for (const playerId of playerIdsWithCards) {
      const cardData = e.cardEdits[playerId];

      // 1. Guardar conteo de amarillas (si es > 0)
      if (cardData.yellows > 0) {
        yellowCardCount[playerId] = cardData.yellows;
      }

      // 2. Determinar motivo de roja
      if (cardData.redDirect) {
        redCardReason[playerId] = "Roja Directa";
      } else if (cardData.yellows === 2) {
        redCardReason[playerId] = "Doble Amarilla";
      }
    }
    // --- FIN LÓGICA DE TARJETAS ---

    try {
      // 1. Guardar el marcador y las listas de tarjetas en el Match
      await updateMatchScore(match.id, {
        homeScore: home,
        awayScore: away,
        status: "finished",
        woTeamId,
        yellowCardCount: yellowCardCount, // <-- Nueva estructura
        redCardReason: redCardReason, // <-- Nueva estructura
      });

      // 2. Crear sanciones para TODAS las tarjetas rojas reportadas
      const redCardPlayerIds = Object.keys(redCardReason);

      for (const playerId of redCardPlayerIds) {
        const player = allPlayersMap.get(playerId);
        if (player) {
          const existingSuspension = await getActiveSuspensionForPlayer(
            playerId
          );
          if (!existingSuspension) {
            const reason = redCardReason[playerId]; // "Roja Directa" o "Doble Amarilla"
            await createDefaultSuspension(player, match, reason);
          }
        }
      }
    } catch (err) {
      console.error(err);
      alert("No se pudo guardar el marcador o las sanciones.");
    }
  }

  // --- JSX (con botón de tarjetas actualizado) ---
  return (
    <div className="container py-4">
      <h2 className="mb-3">Panel del Árbitro</h2>
      {/* ... (Selector de fecha y Tabs de Fuerza sin cambios) ... */}
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
                            <td colSpan={10}>Cargando...</td>
                          </tr>
                        );

                      const local = teamsMap.get(m.homeTeamId) ?? "Local";
                      const visita = teamsMap.get(m.awayTeamId) ?? "Visitante";
                      const finished = m.status === "finished";

                      // Contar tarjetas desde el estado 'edits'
                      let totalYellows = 0;
                      let totalReds = 0;
                      if (ed.cardEdits) {
                        Object.values(ed.cardEdits).forEach((card) => {
                          totalYellows += card.yellows;
                          if (card.redDirect || card.yellows === 2) {
                            totalReds += 1;
                          }
                        });
                      }

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
                            <button
                              className="btn btn-success btn-sm"
                              onClick={() => save(m)}
                            >
                              Guardar
                            </button>
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

      {/* Modal para Tarjetas (con lógica actualizada) */}
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
    </div>
  );
}

// --- Componente del Modal de Tarjetas (Reescrito) ---

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

  // Función para manejar el cambio en el select o checkbox
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
      // redDirect
      newCardState = { ...currentCardState, redDirect: value as boolean };
    }

    // Si marcamos 2 amarillas, deshabilitamos la roja directa (y viceversa)
    if (newCardState.yellows === 2) newCardState.redDirect = false;
    if (newCardState.redDirect) newCardState.yellows = 0; // Opcional: regla de negocio (roja directa anula amarillas)

    onEdit({
      cardEdits: {
        ...editData.cardEdits,
        [playerId]: newCardState,
      },
    });
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
            disabled={state.redDirect} // Deshabilitar si ya tiene roja directa
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
            disabled={state.yellows === 2} // Deshabilitar si ya tiene 2 amarillas
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
            {/* Columna Equipo Local */}
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

            {/* Columna Equipo Visitante */}
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
