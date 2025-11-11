// src/admin/AdminAvisos.tsx
import { useEffect, useState } from "react";
import {
  addAviso,
  deleteAviso,
  subscribeToAvisos,
  type Aviso,
} from "../services/avisos";
import { Button } from "react-bootstrap";
import { Link } from "react-router-dom";

export default function AdminAvisos() {
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const [newAvisoText, setNewAvisoText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  useEffect(() => {
    const unsub = subscribeToAvisos(setAvisos);
    return () => unsub();
  }, []);

  const handlePublicar = async () => {
    if (!newAvisoText.trim()) {
      setError("El texto del aviso no puede estar vacío.");
      return;
    }
    setLoading(true);
    setError("");
    setInfo("");
    try {
      await addAviso(newAvisoText);
      setNewAvisoText("");
      setInfo("Aviso publicado correctamente.");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      setError(e.message || "No se pudo publicar el aviso.");
    } finally {
      setLoading(false);
    }
  };

  // ▼▼▼ CORRECCIÓN AQUÍ ▼▼▼
  const handleDelete = async (avisoId: string) => {
    if (!window.confirm("¿Seguro que deseas eliminar este aviso?")) return;

    setLoading(true);
    setError("");
    setInfo("");
    try {
      await deleteAviso(avisoId);
      setInfo("Aviso eliminado.");
    } catch {
      // Se quita la variable (e) que no se usaba
      setError("No se pudo eliminar el aviso.");
    } finally {
      setLoading(false);
    }
  };
  // ▲▲▲ FIN DE LA CORRECCIÓN ▲▲▲

  return (
    <div className="container py-4">
      <nav aria-label="breadcrumb">
        <ol className="breadcrumb">
          <li className="breadcrumb-item">
            <Link to="/admin">Admin</Link>
          </li>
          <li className="breadcrumb-item active" aria-current="page">
            Publicar Avisos
          </li>
        </ol>
      </nav>

      <h2 className="text-white mb-4">Publicar Avisos Generales</h2>
      <p className="text-white-50 mb-4">
        Estos avisos (vetos de cancha, partidos perdidos, etc.) se mostrarán
        públicamente debajo de la Tabla General.
      </p>

      {error && <div className="alert alert-danger">{error}</div>}
      {info && <div className="alert alert-info">{info}</div>}

      {/* Formulario para nuevo aviso */}
      <div className="card card-theme mb-4">
        <div className="card-body">
          <h5 className="mb-3">Nuevo Aviso</h5>
          <textarea
            className="form-control mb-3"
            rows={4}
            value={newAvisoText}
            onChange={(e) => setNewAvisoText(e.target.value)}
            placeholder="Ej. El equipo Dvo. Tlamy tiene veto de cancha por 2 partidos."
            disabled={loading}
          />
          <Button variant="primary" onClick={handlePublicar} disabled={loading}>
            {loading ? "Publicando..." : "Publicar Aviso"}
          </Button>
        </div>
      </div>

      {/* Lista de avisos publicados */}
      <div className="card card-theme">
        <div className="card-body">
          <h5 className="mb-3">Avisos Publicados</h5>
          <div className="list-group list-group-professional">
            {avisos.length === 0 ? (
              <p className="text-center text-muted p-3">
                No hay avisos publicados.
              </p>
            ) : (
              avisos.map((aviso) => (
                <div
                  key={aviso.id}
                  className="list-group-item d-flex justify-content-between align-items-center"
                >
                  <p className="mb-0" style={{ whiteSpace: "pre-wrap" }}>
                    {aviso.text}
                  </p>
                  <Button
                    variant="outline-danger"
                    size="sm"
                    onClick={() => handleDelete(aviso.id)}
                    disabled={loading}
                  >
                    Eliminar
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
