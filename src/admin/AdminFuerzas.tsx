// src/admin/AdminFuerzas.tsx (Corregido)

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Tabs, Tab, Modal, Form, Button } from "react-bootstrap";
import {
  addTeam,
  deleteTeam,
  getTeamsByFuerza,
  updateTeamBaseline,
  updateTeamName,
  updateTeamPenaltyPoints,
  type Fuerza,
  type Team,
} from "../services/teams";
import {
  addMatchesBulk,
  deleteMatchById,
  listMatchesByDateAndFuerza,
  type Match,
} from "../services/matches";
import {
  addPlayer,
  uploadPlayerPhoto,
  checkPlayerExists,
  type NewPlayer,
} from "../services/players";

type Row = {
  id: string;
  homeTeamId: string;
  awayTeamId: string;
  field: string;
  time: string;
};

const FUERZAS: Fuerza[] = ["1ra", "2da", "3ra"];

function toYMD(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
const TODAY_DATE = toYMD(new Date());

const LIGA_LAST_JORNADA_KEY = "liga_admin_last_jornada";

const getInitialRoundState = (): number => {
  const savedJornada = localStorage.getItem(LIGA_LAST_JORNADA_KEY);
  return savedJornada ? parseInt(savedJornada, 10) : 1;
};

const genId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export default function AdminFuerzas() {
  const [activeKey, setActiveKey] = useState<Fuerza>("1ra");
  const [subActiveKey, setSubActiveKey] = useState<
    Record<Fuerza, "equipos" | "partidos" | "jugadores">
  >({
    "1ra": "equipos",
    "2da": "equipos",
    "3ra": "equipos",
  });

  const [equipos, setEquipos] = useState<Record<Fuerza, Team[]>>({
    "1ra": [],
    "2da": [],
    "3ra": [],
  });

  const [nuevoNombre, setNuevoNombre] = useState<Record<Fuerza, string>>({
    "1ra": "",
    "2da": "",
    "3ra": "",
  });

  const [matchDate, setMatchDate] = useState<Record<Fuerza, string>>({
    "1ra": TODAY_DATE,
    "2da": TODAY_DATE,
    "3ra": TODAY_DATE,
  });

  const [round, setRound] = useState<number>(getInitialRoundState());

  const [rows, setRows] = useState<Record<Fuerza, Row[]>>({
    "1ra": [
      { id: genId(), homeTeamId: "", awayTeamId: "", field: "", time: "" },
    ],
    "2da": [
      { id: genId(), homeTeamId: "", awayTeamId: "", field: "", time: "" },
    ],
    "3ra": [
      { id: genId(), homeTeamId: "", awayTeamId: "", field: "", time: "" },
    ],
  });

  const [programados, setProgramados] = useState<Record<Fuerza, Match[]>>({
    "1ra": [],
    "2da": [],
    "3ra": [],
  });

  const [loading, setLoading] = useState(false);
  const [info, setInfo] = useState<string>("");
  const [err, setErr] = useState<string>("");

  // Estados de Modales
  const [showBaseline, setShowBaseline] = useState(false);
  const [teamBL, setTeamBL] = useState<Team | null>(null);
  const [bRound, setBRound] = useState(6);
  const [bPJ, setBPJ] = useState(0);
  const [bG, setBG] = useState(0);
  const [bE, setBE] = useState(0);
  const [bP, setBP] = useState(0);
  const [bGF, setBGF] = useState(0);
  const [bGC, setBGC] = useState(0);
  const bDG = bGF - bGC;
  const bPts = bG * 3 + bE;
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [teamToEdit, setTeamToEdit] = useState<Team | null>(null);
  const [teamToDelete, setTeamToDelete] = useState<Team | null>(null);
  const [editedName, setEditedName] = useState("");
  const [showPenaltyModal, setShowPenaltyModal] = useState(false);
  const [teamToPenalize, setTeamToPenalize] = useState<Team | null>(null);
  const [penaltyPoints, setPenaltyPoints] = useState(0);
  const [playerTeamId, setPlayerTeamId] = useState<Record<Fuerza, string>>({
    "1ra": "",
    "2da": "",
    "3ra": "",
  });
  const [playerName, setPlayerName] = useState("");
  const [playerAge, setPlayerAge] = useState("");
  const [playerRegistroId, setPlayerRegistroId] = useState("");
  const [playerPhoto, setPlayerPhoto] = useState<File | null>(null);

  // Funciones de Modales
  function openEditModal(team: Team) {
    setTeamToEdit(team);
    setEditedName(team.nombre);
    setShowEdit(true);
  }
  function openDeleteModal(team: Team) {
    setTeamToDelete(team);
    setShowDelete(true);
  }
  async function handleEdit() {
    if (!teamToEdit || !editedName.trim()) return;
    setLoading(true);
    try {
      await updateTeamName(teamToEdit.id, editedName.trim());
      const data = await getTeamsByFuerza(teamToEdit.fuerza);
      setEquipos((prev) => ({ ...prev, [teamToEdit.fuerza]: data }));
      setInfo("Nombre actualizado.");
      setShowEdit(false);
    } catch (e) {
      console.error(e);
      setErr("No se pudo actualizar el equipo.");
    } finally {
      setLoading(false);
    }
  }
  async function handleDelete() {
    if (!teamToDelete) return;
    setLoading(true);
    try {
      await deleteTeam(teamToDelete.id);
      const data = await getTeamsByFuerza(teamToDelete.fuerza);
      setEquipos((prev) => ({ ...prev, [teamToDelete.fuerza]: data }));
      setInfo("Equipo eliminado.");
      setShowDelete(false);
    } catch (e) {
      console.error(e);
      setErr("No se pudo eliminar el equipo.");
    } finally {
      setLoading(false);
    }
  }
  function openBaseline(t: Team) {
    setTeamBL(t);
    if (t.baseline) {
      setBRound(t.baseline.upToRound);
      setBPJ(t.baseline.PJ);
      setBG(t.baseline.G);
      setBE(t.baseline.E);
      setBP(t.baseline.P);
      setBGF(t.baseline.GF);
      setBGC(t.baseline.GC);
    } else {
      setBRound(6);
      setBPJ(0);
      setBG(0);
      setBE(0);
      setBP(0);
      setBGF(0);
      setBGC(0);
    }
    setShowBaseline(true);
  }
  async function saveBaseline() {
    if (!teamBL) return;
    if (bPJ !== bG + bE + bP) {
      setErr("La suma G + E + P debe ser igual a PJ.");
      return;
    }
    setLoading(true);
    setErr("");
    setInfo("");
    try {
      await updateTeamBaseline(teamBL.id, {
        upToRound: bRound,
        PJ: bPJ,
        G: bG,
        E: bE,
        P: bP,
        GF: bGF,
        GC: bGC,
      });
      const data = await getTeamsByFuerza(teamBL.fuerza);
      setEquipos((prev) => ({ ...prev, [teamBL.fuerza]: data }));
      setInfo(`Baseline guardada para ${teamBL.nombre}.`);
      setShowBaseline(false);
    } catch (e) {
      console.error(e);
      setErr("No se pudo guardar la baseline.");
    } finally {
      setLoading(false);
    }
  }

  function openPenaltyModal(team: Team) {
    setTeamToPenalize(team);
    setPenaltyPoints(team.puntosMenos || 0);
    setShowPenaltyModal(true);
  }
  function closePenaltyModal() {
    setTeamToPenalize(null);
    setShowPenaltyModal(false);
  }
  async function handleSavePenalty() {
    if (!teamToPenalize) return;
    setLoading(true);
    setErr("");
    setInfo("");
    try {
      await updateTeamPenaltyPoints(teamToPenalize.id, penaltyPoints);
      const data = await getTeamsByFuerza(teamToPenalize.fuerza);
      setEquipos((prev) => ({ ...prev, [teamToPenalize.fuerza]: data }));
      setInfo(
        `Sanción de ${penaltyPoints} puntos guardada para ${teamToPenalize.nombre}.`
      );
      closePenaltyModal();
    } catch (e) {
      console.error(e);
      setErr("No se pudo guardar la sanción de puntos.");
    } finally {
      setLoading(false);
    }
  }

  // useEffect para guardar la jornada
  useEffect(() => {
    if (round > 0) {
      localStorage.setItem(LIGA_LAST_JORNADA_KEY, String(round));
    }
  }, [round]);

  // useEffect Cargar Equipos
  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr("");
      setInfo("");
      try {
        const data = await getTeamsByFuerza(activeKey);
        setEquipos((prev) => ({ ...prev, [activeKey]: data }));
      } catch (e) {
        console.error(e);
        setErr("No se pudieron cargar los equipos.");
      } finally {
        setLoading(false);
      }
    })();
  }, [activeKey]);

  // useEffect Cargar Partidos
  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr("");
      setInfo("");
      try {
        const data = await listMatchesByDateAndFuerza(
          matchDate[activeKey],
          activeKey
        );
        setProgramados((prev) => ({ ...prev, [activeKey]: data }));
      } catch (e) {
        console.error(e);
        setErr("No se pudo cargar el rol programado.");
      } finally {
        setLoading(false);
      }
    })();
  }, [activeKey, matchDate[activeKey]]);

  const nameById = useMemo(() => {
    const m = new Map<string, string>();
    FUERZAS.forEach((f) => {
      equipos[f].forEach((t) => m.set(t.id, t.nombre));
    });
    return m;
  }, [equipos]);

  async function handleAddTeam(fuerza: Fuerza) {
    const name = (nuevoNombre[fuerza] || "").trim();
    if (!name) {
      setErr("Escribe un nombre de equipo.");
      return;
    }
    setLoading(true);
    setErr("");
    setInfo("");
    try {
      await addTeam(name, fuerza);
      setNuevoNombre((prev) => ({ ...prev, [fuerza]: "" }));
      const data = await getTeamsByFuerza(fuerza);
      setEquipos((prev) => ({ ...prev, [fuerza]: data }));
      setInfo("Equipo agregado correctamente.");
    } catch (e: any) {
      console.error("addTeam error:", e?.code || e);
      setErr("No se pudo agregar el equipo.");
    } finally {
      setLoading(false);
    }
  }

  function addRow(fuerza: Fuerza) {
    setRows((prev) => ({
      ...prev,
      [fuerza]: [
        ...prev[fuerza],
        { id: genId(), homeTeamId: "", awayTeamId: "", field: "", time: "" },
      ],
    }));
  }
  function removeRow(fuerza: Fuerza, id: string) {
    setRows((prev) => ({
      ...prev,
      [fuerza]: prev[fuerza].filter((r) => r.id !== id),
    }));
  }
  function updateRow(fuerza: Fuerza, id: string, patch: Partial<Row>) {
    setRows((prev) => ({
      ...prev,
      [fuerza]: prev[fuerza].map((r) => (r.id === id ? { ...r, ...patch } : r)),
    }));
  }

  async function saveSchedule(fuerza: Fuerza) {
    if (equipos[fuerza].length === 0) {
      setErr("Primero agrega equipos en esta fuerza.");
      return;
    }
    const date = matchDate[fuerza];
    const jornada = round;
    const toSave = rows[fuerza]
      .map((r) => ({
        fuerza,
        round: jornada,
        matchDate: date,
        time: r.time.trim(),
        field: r.field.trim(),
        homeTeamId: r.homeTeamId,
        awayTeamId: r.awayTeamId,
        status: "scheduled" as const,
      }))
      .filter(
        (m) =>
          m.field &&
          m.time &&
          m.homeTeamId &&
          m.awayTeamId &&
          m.homeTeamId !== m.awayTeamId
      );
    if (toSave.length === 0) {
      setErr(
        "Agrega al menos un partido válido (equipos distintos, hora y cancha)."
      );
      return;
    }
    setLoading(true);
    setErr("");
    setInfo("");
    try {
      await addMatchesBulk(toSave);
      setRows((prev) => ({
        ...prev,
        [fuerza]: [
          { id: genId(), homeTeamId: "", awayTeamId: "", field: "", time: "" },
        ],
      }));
      const data = await listMatchesByDateAndFuerza(date, fuerza);
      setProgramados((prev) => ({ ...prev, [fuerza]: data }));
      setInfo("Rol de juego guardado correctamente.");
    } catch (e) {
      console.error(e);
      setErr("No se pudo guardar el rol de juego.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteMatch(fuerza: Fuerza, matchId: string) {
    setLoading(true);
    setErr("");
    setInfo("");
    try {
      await deleteMatchById(matchId);
      const data = await listMatchesByDateAndFuerza(matchDate[fuerza], fuerza);
      setProgramados((prev) => ({ ...prev, [fuerza]: data }));
      setInfo("Partido eliminado.");
    } catch (e) {
      console.error(e);
      setErr("No se pudo eliminar el partido.");
    } finally {
      setLoading(false);
    }
  }
  async function handleRegisterPlayer(fuerza: Fuerza) {
    const teamId = playerTeamId[fuerza];
    const team = equipos[fuerza].find((t) => t.id === teamId);
    const age = parseInt(playerAge, 10);
    const registroId = playerRegistroId.trim().toUpperCase();
    if (!teamId || !team) {
      setErr("Debes seleccionar un equipo válido.");
      return;
    }
    if (!playerName.trim()) {
      setErr("El nombre del jugador no puede estar vacío.");
      return;
    }
    if (!registroId) {
      setErr("El ID de Registro (CURP, etc.) no puede estar vacío.");
      return;
    }
    if (isNaN(age) || age <= 0) {
      setErr("La edad debe ser un número válido.");
      return;
    }
    if (!playerPhoto) {
      setErr("Debes seleccionar una foto para el jugador.");
      return;
    }
    setLoading(true);
    setErr("");
    setInfo("");
    try {
      const playerExists = await checkPlayerExists(registroId);
      if (playerExists) {
        setErr(
          "Error: Ya existe un jugador con ese ID de Registro en la liga."
        );
        setLoading(false);
        return;
      }
      const { url, path } = await uploadPlayerPhoto(playerPhoto, teamId);
      const newPlayer: NewPlayer = {
        nombre: playerName.trim(),
        edad: age,
        registroId: registroId,
        fuerza: fuerza,
        teamId: team.id,
        teamName: team.nombre,
        photoURL: url,
        storagePath: path,
      };
      await addPlayer(newPlayer);
      setInfo(`¡Jugador ${playerName} registrado en ${team.nombre}!`);
      setPlayerName("");
      setPlayerAge("");
      setPlayerPhoto(null);
      setPlayerRegistroId("");
      const fileInput = document.getElementById(
        `file-input-${fuerza}`
      ) as HTMLInputElement;
      if (fileInput) fileInput.value = "";
    } catch (e) {
      console.error(e);
      setErr("No se pudo registrar al jugador. Revisa la consola.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {err && <div className="alert alert-danger">{err}</div>}
      {info && <div className="alert alert-info">{info}</div>}
      {loading && <p className="text-muted">Procesando…</p>}

      <div className="d-flex justify-content-end gap-2 mb-3">
        <Link to="/admin/sanciones" className="btn btn-warning">
          Gestionar Sanciones
        </Link>
        <Link to="/admin/avisos" className="btn btn-info">
          Publicar Avisos
        </Link>
        <Link to="/admin/contacto" className="btn btn-success">
          Bandeja de Contacto
        </Link>
      </div>

      <Tabs
        activeKey={activeKey}
        onSelect={(k) => setActiveKey((k as Fuerza) ?? "1ra")}
        className="mb-4"
      >
        {FUERZAS.map((fuerza) => (
          <Tab eventKey={fuerza} title={`${fuerza} Fuerza`} key={fuerza}>
            <Tabs
              activeKey={subActiveKey[fuerza]}
              onSelect={(k) =>
                setSubActiveKey((prev) => ({
                  ...prev,
                  [fuerza]:
                    (k as "equipos" | "partidos" | "jugadores") ?? "equipos",
                }))
              }
              variant="pills"
              fill
              className="mb-4"
            >
              {/* --- Sub-pestaña 1: Equipos --- */}
              <Tab eventKey="equipos" title="Administrar Equipos">
                <div className="card card-theme mb-4">
                  <div className="card-body">
                    <div className="row g-2 align-items-end">
                      <div className="col-sm-8 col-md-6">
                        <input
                          className="form-control"
                          value={nuevoNombre[fuerza]}
                          onChange={(e) =>
                            setNuevoNombre((prev) => ({
                              ...prev,
                              [fuerza]: e.target.value,
                            }))
                          }
                          placeholder="Ej. Estudiantes"
                        />
                      </div>
                      <div className="col-auto">
                        <button
                          className="btn btn-success"
                          onClick={() => handleAddTeam(fuerza)}
                          disabled={loading}
                        >
                          {loading ? "Guardando..." : "Agregar equipo"}
                        </button>
                      </div>
                    </div>
                    <div className="mt-3">
                      <strong>Equipos en {fuerza}:</strong>
                      <div className="mt-2">
                        {equipos[fuerza].length === 0 ? (
                          <span className="text-muted">
                            No hay equipos aún.
                          </span>
                        ) : (
                          <ul className="mb-0 list-unstyled">
                            {equipos[fuerza].map((t) => (
                              <li
                                key={t.id}
                                className="d-flex justify-content-between align-items-center py-1"
                              >
                                <span>
                                  {t.nombre}{" "}
                                  {t.baseline && (
                                    <span className="badge bg-success ms-2">
                                      BL J{t.baseline.upToRound}
                                    </span>
                                  )}
                                  {/* ▼▼▼ CORRECCIÓN DE ERROR ts(18048) ▼▼▼ */}
                                  {t.puntosMenos && t.puntosMenos > 0 && (
                                    <span className="badge bg-danger ms-2">
                                      -{t.puntosMenos} Pts
                                    </span>
                                  )}
                                  {/* ▲▲▲ FIN DE CORRECCIÓN ▲▲▲ */}
                                </span>

                                <div className="d-flex gap-2">
                                  <button
                                    className="btn btn-outline-info btn-sm"
                                    onClick={() => openEditModal(t)}
                                  >
                                    Editar
                                  </button>
                                  <button
                                    className="btn btn-outline-danger btn-sm"
                                    onClick={() => openDeleteModal(t)}
                                  >
                                    Eliminar
                                  </button>
                                  <button
                                    className="btn btn-outline-light btn-sm"
                                    onClick={() => openBaseline(t)}
                                  >
                                    Baseline
                                  </button>
                                  <button
                                    className="btn btn-outline-warning btn-sm"
                                    onClick={() => openPenaltyModal(t)}
                                  >
                                    Sancionar (PM)
                                  </button>
                                </div>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </Tab>

              {/* --- Sub-pestaña 2: Partidos --- */}
              <Tab eventKey="partidos" title="Programar Partidos">
                <div className="card card-theme mb-4">
                  <div className="card-body">
                    <div className="row g-3">
                      <div className="col-sm-4 col-md-3">
                        <label className="form-label">Fecha</label>
                        <input
                          type="date"
                          className="form-control"
                          value={matchDate[fuerza]}
                          onChange={(e) =>
                            setMatchDate((prev) => ({
                              ...prev,
                              [fuerza]: e.target.value,
                            }))
                          }
                        />
                        <small>Ej: 2025-09-21 (domingo)</small>
                      </div>

                      <div className="col-sm-4 col-md-2">
                        <label className="form-label">Jornada</label>
                        <input
                          type="number"
                          className="form-control"
                          min={1}
                          value={round}
                          onChange={(e) =>
                            setRound(parseInt(e.target.value || "1", 10))
                          }
                        />
                      </div>
                    </div>
                    <hr style={{ borderColor: "var(--color-border)" }} />
                    <h6 className="mb-2">Agregar partidos</h6>
                    {rows[fuerza].map((r) => (
                      <div className="row g-2 align-items-end mb-2" key={r.id}>
                        <div className="col-lg-3">
                          <label className="form-label">Local</label>
                          <select
                            className="form-select"
                            value={r.homeTeamId}
                            onChange={(e) =>
                              updateRow(fuerza, r.id, {
                                homeTeamId: e.target.value,
                              })
                            }
                          >
                            <option className="text-black" value="">
                              Selecciona equipo
                            </option>
                            {equipos[fuerza].map((t) => (
                              <option
                                value={t.id}
                                key={t.id}
                                className="text-black"
                              >
                                {t.nombre}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="col-lg-3">
                          <label className="form-label">Visitante</label>
                          <select
                            className="form-select"
                            value={r.awayTeamId}
                            onChange={(e) =>
                              updateRow(fuerza, r.id, {
                                awayTeamId: e.target.value,
                              })
                            }
                          >
                            <option className="text-black" value="">
                              Selecciona equipo
                            </option>
                            {equipos[fuerza].map((t) => (
                              <option
                                value={t.id}
                                key={t.id}
                                className="text-black"
                              >
                                {t.nombre}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="col-lg-2 col-sm-6">
                          <label className="form-label">Cancha</label>
                          <input
                            className="form-control"
                            placeholder="Cancha 1"
                            value={r.field}
                            onChange={(e) =>
                              updateRow(fuerza, r.id, { field: e.target.value })
                            }
                          />
                        </div>
                        <div className="col-lg-2 col-sm-6">
                          <label className="form-label">Hora</label>
                          <input
                            type="time"
                            className="form-control"
                            value={r.time}
                            onChange={(e) =>
                              updateRow(fuerza, r.id, { time: e.target.value })
                            }
                          />
                        </div>
                        <div className="col-lg-2 col-sm-12">
                          <button
                            type="button"
                            className="btn btn-outline-danger w-100"
                            onClick={() => removeRow(fuerza, r.id)}
                            disabled={rows[fuerza].length === 1}
                          >
                            Eliminar
                          </button>
                        </div>
                      </div>
                    ))}
                    <div className="d-flex gap-2 mt-2">
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => addRow(fuerza)}
                      >
                        + Agregar partido
                      </button>
                      <button
                        type="button"
                        className="btn btn-success"
                        onClick={() => saveSchedule(fuerza)}
                        disabled={loading}
                      >
                        {loading ? "Guardando..." : "Guardar rol de juego"}
                      </button>
                    </div>
                    <hr style={{ borderColor: "var(--color-border)" }} />
                    <h6 className="mb-2">
                      Programados para {matchDate[fuerza]}
                    </h6>
                    <div className="table-responsive">
                      <table className="table table-sm table-striped align-middle">
                        <thead className="table-dark">
                          <tr>
                            <th>Jornada</th>
                            <th>Hora</th>
                            <th>Cancha</th>
                            <th>Local</th>
                            <th>Visitante</th>
                            <th></th>
                          </tr>
                        </thead>
                        <tbody>
                          {programados[fuerza].length === 0 ? (
                            <tr>
                              <td
                                colSpan={6}
                                className="text-center text-muted"
                              >
                                Sin partidos programados.
                              </td>
                            </tr>
                          ) : (
                            programados[fuerza].map((m) => (
                              <tr key={m.id}>
                                <td>{m.round}</td>
                                <td>{m.time}</td>
                                <td>{m.field}</td>
                                <td>{nameById.get(m.homeTeamId) ?? "—"}</td>
                                <td>{nameById.get(m.awayTeamId) ?? "—"}</td>
                                <td className="text-end">
                                  <button
                                    className="btn btn-outline-danger btn-sm"
                                    onClick={() =>
                                      handleDeleteMatch(fuerza, m.id)
                                    }
                                  >
                                    Eliminar
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </Tab>

              {/* --- Sub-pestaña 3: Jugadores --- */}
              <Tab eventKey="jugadores" title="Registrar Jugadores">
                <div className="card card-theme mb-4">
                  <div className="card-body">
                    <h5 className="mb-3">
                      Registrar Jugadores en {fuerza} Fuerza
                    </h5>
                    <div className="row g-3">
                      <div className="col-md-4">
                        <label className="form-label">Equipo</label>
                        <select
                          className="form-select"
                          value={playerTeamId[fuerza]}
                          onChange={(e) =>
                            setPlayerTeamId((prev) => ({
                              ...prev,
                              [fuerza]: e.target.value,
                            }))
                          }
                        >
                          <option value="" className="text-black">
                            Selecciona un equipo
                          </option>
                          {equipos[fuerza].map((t) => (
                            <option
                              key={t.id}
                              value={t.id}
                              className="text-black"
                            >
                              {t.nombre}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="col-md-5">
                        <label className="form-label">Nombre del Jugador</label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Ej. Cristiano Ronaldo"
                          value={playerName}
                          onChange={(e) => setPlayerName(e.target.value)}
                        />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label">
                          ID de Registro (Ej. CURP)
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="ID Único del Jugador"
                          value={playerRegistroId}
                          onChange={(e) => setPlayerRegistroId(e.target.value)}
                        />
                      </div>
                      <div className="col-md-3">
                        <label className="form-label">Edad</label>
                        <input
                          type="number"
                          className="form-control"
                          placeholder="Ej. 25"
                          value={playerAge}
                          onChange={(e) => setPlayerAge(e.target.value)}
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">Foto del Jugador</label>
                        <input
                          type="file"
                          className="form-control"
                          id={`file-input-${fuerza}`}
                          accept="image/png, image/jpeg"
                          onChange={(e) => {
                            if (e.target.files && e.target.files.length > 0) {
                              setPlayerPhoto(e.target.files[0]);
                            } else {
                              setPlayerPhoto(null);
                            }
                          }}
                        />
                      </div>
                      <div className="col-md-4 d-flex align-items-end">
                        <button
                          className="btn btn-primary w-100"
                          onClick={() => handleRegisterPlayer(fuerza)}
                          disabled={loading}
                        >
                          {loading ? "Registrando..." : "Registrar Jugador"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </Tab>
            </Tabs>
          </Tab>
        ))}
      </Tabs>

      {/* --- Modales --- */}

      {/* Baseline Modal */}
      <Modal show={showBaseline} onHide={() => setShowBaseline(false)} centered>
        <div className="modal-content p-2">
          <div className="modal-header">
            <h5 className="modal-title">
              Baseline · {teamBL?.nombre} ({teamBL?.fuerza} fuerza)
            </h5>
            <button
              type="button"
              className="btn-close"
              onClick={() => setShowBaseline(false)}
            />
          </div>
          <div className="modal-body">
            <div className="row g-2">
              <div className="col-6 col-md-3">
                <label className="form-label">Jornada incluida</label>
                <input
                  type="number"
                  className="form-control"
                  value={bRound}
                  min={0}
                  onChange={(e) =>
                    setBRound(parseInt(e.target.value || "0", 10))
                  }
                />
              </div>
              <div className="col-6 col-md-3">
                <label className="form-label">PJ</label>
                <input
                  type="number"
                  className="form-control"
                  value={bPJ}
                  min={0}
                  onChange={(e) => setBPJ(parseInt(e.target.value || "0", 10))}
                />
              </div>
              <div className="col-6 col-md-3">
                <label className="form-label">G</label>
                <input
                  type="number"
                  className="form-control"
                  value={bG}
                  min={0}
                  onChange={(e) => setBG(parseInt(e.target.value || "0", 10))}
                />
              </div>
              <div className="col-6 col-md-3">
                <label className="form-label">E</label>
                <input
                  type="number"
                  className="form-control"
                  value={bE}
                  min={0}
                  onChange={(e) => setBE(parseInt(e.target.value || "0", 10))}
                />
              </div>
              <div className="col-6 col-md-3">
                <label className="form-label">P</label>
                <input
                  type="number"
                  className="form-control"
                  value={bP}
                  min={0}
                  onChange={(e) => setBP(parseInt(e.target.value || "0", 10))}
                />
              </div>
              <div className="col-6 col-md-3">
                <label className="form-label">GF</label>
                <input
                  type="number"
                  className="form-control"
                  value={bGF}
                  min={0}
                  onChange={(e) => setBGF(parseInt(e.target.value || "0", 10))}
                />
              </div>
              <div className="col-6 col-md-3">
                <label className="form-label">GC</label>
                <input
                  type="number"
                  className="form-control"
                  value={bGC}
                  min={0}
                  onChange={(e) => setBGC(parseInt(e.target.value || "0", 10))}
                />
              </div>
              <div className="col-6 col-md-3">
                <label className="form-label">DG</label>
                <input className="form-control" value={bDG} disabled />
              </div>
              <div className="col-6 col-md-3">
                <label className="form-label">Pts</label>
                <input className="form-control" value={bPts} disabled />
              </div>
            </div>
            <small className="text-white d-block mt-2">
              La baseline aplica hasta la jornada indicada...
            </small>
          </div>
          <div className="modal-footer">
            <button
              className="btn btn-secondary"
              onClick={() => setShowBaseline(false)}
            >
              Cancelar
            </button>
            <button
              className="btn btn-success"
              onClick={saveBaseline}
              disabled={loading}
            >
              {loading ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal editar */}
      <Modal show={showEdit} onHide={() => setShowEdit(false)} centered>
        <div className="modal-content p-3">
          <div className="modal-header">
            <h5 className="modal-title">Editar nombre de equipo</h5>
            <button
              type="button"
              className="btn-close"
              onClick={() => setShowEdit(false)}
            />
          </div>
          <div className="modal-body">
            <input
              className="form-control"
              value={editedName}
              onChange={(e) => setEditedName(e.target.value)}
              placeholder="Nuevo nombre"
            />
          </div>
          <div className="modal-footer">
            <button
              className="btn btn-secondary"
              onClick={() => setShowEdit(false)}
            >
              Cancelar
            </button>
            <button className="btn btn-primary" onClick={handleEdit}>
              Guardar
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal eliminar */}
      <Modal show={showDelete} onHide={() => setShowDelete(false)} centered>
        <div className="modal-content p-3">
          <div className="modal-header">
            <h5 className="modal-title text-danger">¿Eliminar equipo?</h5>
            <button
              type="button"
              className="btn-close"
              onClick={() => setShowDelete(false)}
            />
          </div>
          <div className="modal-body">
            ¿Estás seguro que deseas eliminar el equipo{" "}
            <strong>{teamToDelete?.nombre}</strong>? Esta acción no se puede
            deshacer.
          </div>
          <div className="modal-footer">
            <button
              className="btn btn-secondary"
              onClick={() => setShowDelete(false)}
            >
              Cancelar
            </button>
            <button className="btn btn-danger" onClick={handleDelete}>
              Eliminar
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal Sanción (PM) */}
      <Modal show={showPenaltyModal} onHide={closePenaltyModal} centered>
        <div className="modal-content p-3">
          <Modal.Header>
            <Modal.Title>Sancionar (Puntos Menos)</Modal.Title>
            <button
              type="button"
              className="btn-close"
              onClick={closePenaltyModal}
            />
          </Modal.Header>
          <Modal.Body>
            <p>
              Establece el total de puntos a restar para el equipo:{" "}
              <strong>{teamToPenalize?.nombre}</strong>.
            </p>
            <Form.Group>
              <Form.Label>Total de Puntos Menos (PM)</Form.Label>
              <Form.Control
                type="number"
                min="0"
                value={penaltyPoints}
                onChange={(e) =>
                  setPenaltyPoints(parseInt(e.target.value, 10) || 0)
                }
                placeholder="0"
              />
              <Form.Text className="text-white-50">
                Este es el valor total. Si ya tiene -1 y quieres añadir -1,
                ingresa "2".
              </Form.Text>
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button
              variant="secondary"
              onClick={closePenaltyModal}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={handleSavePenalty}
              disabled={loading}
            >
              {loading ? "Guardando..." : "Guardar Sanción"}
            </Button>
          </Modal.Footer>
        </div>
      </Modal>
    </>
  );
}
