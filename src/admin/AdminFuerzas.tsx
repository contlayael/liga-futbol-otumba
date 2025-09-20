// src/admin/AdminFuerzas.tsx
import { useEffect, useMemo, useState } from "react";
import { Tabs, Tab, Modal } from "react-bootstrap";
import {
  addTeam,
  getTeamsByFuerza,
  updateTeamBaseline,
  type Fuerza,
  type Team,
  type BaselineStats,
} from "../services/teams";
import {
  addMatchesBulk,
  deleteMatchById,
  listMatchesByDateAndFuerza,
  type Match,
} from "../services/matches";

type Row = {
  id: string;
  homeTeamId: string;
  awayTeamId: string;
  field: string;
  time: string;
};

const FUERZAS: Fuerza[] = ["1ra", "2da", "3ra"];
const DEFAULT_DATE = "2025-09-21"; // Ejemplo domingo
const DEFAULT_ROUND = 7;

const genId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export default function AdminFuerzas() {
  const [activeKey, setActiveKey] = useState<Fuerza>("1ra");

  const [equipos, setEquipos] = useState<Record<Fuerza, Team[]>>({
    "1ra": [],
    "2da": [],
    "3ra": [],
  });

  // 🔧 FIX: nombre por pestaña (antes era un solo estado compartido)
  const [nuevoNombre, setNuevoNombre] = useState<Record<Fuerza, string>>({
    "1ra": "",
    "2da": "",
    "3ra": "",
  });

  const [matchDate, setMatchDate] = useState<Record<Fuerza, string>>({
    "1ra": DEFAULT_DATE,
    "2da": DEFAULT_DATE,
    "3ra": DEFAULT_DATE,
  });
  const [round, setRound] = useState<Record<Fuerza, number>>({
    "1ra": DEFAULT_ROUND,
    "2da": DEFAULT_ROUND,
    "3ra": DEFAULT_ROUND,
  });

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

  // ====== Baseline modal ======
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
      // recargar equipos de la fuerza activa para reflejar baseline
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
  // ====== /Baseline modal ======

  // Cargar equipos de la fuerza activa
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

  // Cargar partidos programados por fecha/fuerza
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
      setErr("No se pudo agregar el equipo. Revisa consola para más detalles.");
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
    const jornada = round[fuerza];
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

  return (
    <>
      {err && <div className="alert alert-danger">{err}</div>}
      {info && <div className="alert alert-info">{info}</div>}
      {loading && <p className="text-muted">Procesando…</p>}

      <Tabs
        activeKey={activeKey}
        onSelect={(k) => setActiveKey((k as Fuerza) ?? "1ra")}
        className="mb-4"
      >
        {FUERZAS.map((fuerza) => (
          <Tab eventKey={fuerza} title={`${fuerza} Fuerza`} key={fuerza}>
            {/* Alta de equipos */}
            <div className="card card-body mb-4">
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
                    <span className="text-muted">No hay equipos aún.</span>
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
                          </span>
                          <button
                            className="btn btn-outline-light btn-sm"
                            onClick={() => openBaseline(t)}
                          >
                            Baseline
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>

            {/* Rol de juego */}
            <div className="card card-body">
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
                  <small className="text-white">Ej: 2025-09-21 (domingo)</small>
                </div>
                <div className="col-sm-4 col-md-2">
                  <label className="form-label">Jornada</label>
                  <input
                    type="number"
                    className="form-control"
                    min={1}
                    value={round[fuerza]}
                    onChange={(e) =>
                      setRound((prev) => ({
                        ...prev,
                        [fuerza]: parseInt(e.target.value || "1", 10),
                      }))
                    }
                  />
                </div>
              </div>

              <hr />

              <h6 className="mb-2">Agregar partidos</h6>
              {rows[fuerza].map((r) => (
                <div className="row g-2 align-items-end mb-2" key={r.id}>
                  <div className="col-lg-3">
                    <label className="form-label">Local</label>
                    <select
                      className="form-select"
                      value={r.homeTeamId}
                      onChange={(e) =>
                        updateRow(fuerza, r.id, { homeTeamId: e.target.value })
                      }
                    >
                      <option value="">Selecciona equipo</option>
                      {equipos[fuerza].map((t) => (
                        <option value={t.id} key={t.id}>
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
                        updateRow(fuerza, r.id, { awayTeamId: e.target.value })
                      }
                    >
                      <option value="">Selecciona equipo</option>
                      {equipos[fuerza].map((t) => (
                        <option value={t.id} key={t.id}>
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

              <hr />

              <h6 className="mb-2">Programados para {matchDate[fuerza]}</h6>
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
                        <td colSpan={6} className="text-center text-muted">
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
                              onClick={() => handleDeleteMatch(fuerza, m.id)}
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
          </Tab>
        ))}
      </Tabs>

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
            <small className="text-muted d-block mt-2">
              La baseline aplica hasta la jornada indicada. Desde la siguiente
              jornada, las estadísticas se suman automáticamente con los
              partidos finalizados.
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
    </>
  );
}
