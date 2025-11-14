// src/admin/AdminContacto.tsx (Actualizado)
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Table, Button, Badge, Alert } from "react-bootstrap";
import {
  getContactsPaginated,
  updateContactStatus,
  type ContactSubmission,
  type ContactStatus,
} from "../services/contact";
import type { QueryDocumentSnapshot } from "firebase/firestore";

const PAGE_SIZE = 10;

export default function AdminContacto() {
  const [contacts, setContacts] = useState<ContactSubmission[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [firstVisible, setFirstVisible] =
    useState<QueryDocumentSnapshot<unknown> | null>(null);
  const [lastVisible, setLastVisible] =
    useState<QueryDocumentSnapshot<unknown> | null>(null);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(true);
  const [hasPrev, setHasPrev] = useState(false);

  const loadContacts = async (
    direction: "next" | "prev" | "start" = "start"
  ) => {
    setLoading(true);
    setError("");

    let options: any = { pageSize: PAGE_SIZE };
    if (direction === "next" && lastVisible) {
      options.startAfterDoc = lastVisible;
    } else if (direction === "prev" && firstVisible) {
      options.endBeforeDoc = firstVisible;
    }

    try {
      const {
        contacts: newContacts,
        firstVisible: newFirst,
        lastVisible: newLast,
        docCount,
      } = await getContactsPaginated(options);

      if (newContacts.length > 0) {
        setContacts(newContacts);
        setFirstVisible(newFirst);
        setLastVisible(newLast);

        if (direction === "next") {
          setPage((p) => p + 1);
          setHasPrev(true);
        }
        if (direction === "prev") {
          setPage((p) => p - 1);
        }
        if (direction === "start") {
          setPage(1);
          setHasPrev(false);
        }

        setHasNext(docCount === PAGE_SIZE);
      } else {
        if (direction === "next") setHasNext(false);
        if (direction === "prev") setHasPrev(page > 1);
      }
    } catch (e) {
      console.error(e);
      setError("No se pudieron cargar los mensajes.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadContacts("start");
  }, []);

  useEffect(() => {
    setHasPrev(page > 1);
  }, [page]);

  const handleToggleStatus = async (contact: ContactSubmission) => {
    // ... (sin cambios)
    const newStatus: ContactStatus =
      contact.status === "Nuevo" ? "Leído" : "Nuevo";
    try {
      await updateContactStatus(contact.id, newStatus);
      setContacts((prev) =>
        prev.map((c) => (c.id === contact.id ? { ...c, status: newStatus } : c))
      );
    } catch (e) {
      setError("No se pudo actualizar el estado.");
    }
  };

  return (
    <div className="container py-4">
      <nav aria-label="breadcrumb">
        <ol className="breadcrumb">
          <li className="breadcrumb-item">
            <Link to="/admin">Admin</Link>
          </li>
          <li className="breadcrumb-item active" aria-current="page">
            Bandeja de Contacto
          </li>
        </ol>
      </nav>

      <h2 className="text-white mb-4">Bandeja de Contacto</h2>
      {error && <Alert variant="danger">{error}</Alert>}

      <div className="card card-theme">
        <div className="card-body">
          <div className="table-responsive">
            <Table className="table-light table-striped table-hover align-middle table-professional">
              <thead className="thead-dark-professional">
                <tr>
                  <th className="text-start">Fecha</th>
                  <th className="text-start">Nombre y Comentario</th>
                  <th className="text-start">Equipo</th>
                  <th className="text-center">Celular</th>
                  <th className="text-center">Tipo</th>
                  <th className="text-center">Estado</th>
                  <th className="text-center">Acción</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="text-center text-muted">
                      Cargando...
                    </td>
                  </tr>
                ) : contacts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center text-muted">
                      No hay mensajes.
                    </td>
                  </tr>
                ) : (
                  contacts.map((c) => (
                    <tr key={c.id}>
                      <td className="text-start" style={{ minWidth: "120px" }}>
                        {c.createdAt
                          ? new Date(c.createdAt.toDate()).toLocaleString(
                              "es-MX"
                            )
                          : "N/A"}
                      </td>
                      {/* ▼▼▼ CAMBIO: Se añade el comentario debajo del nombre ▼▼▼ */}
                      <td className="text-start">
                        <span className="fw-bold">{c.nombre}</span>
                        {/* Mostramos el comentario si existe */}
                        {c.comentario && (
                          <small
                            className="d-block text-muted fst-italic mt-1"
                            style={{ whiteSpace: "pre-wrap" }}
                          >
                            "{c.comentario}"
                          </small>
                        )}
                      </td>
                      {/* ▲▲▲ FIN ▲▲▲ */}
                      <td className="text-start">{c.equipo}</td>
                      <td className="text-center">{c.celular}</td>
                      <td className="text-center">{c.tipo}</td>
                      <td className="text-center">
                        <Badge
                          bg={c.status === "Nuevo" ? "warning" : "success"}
                        >
                          {c.status}
                        </Badge>
                      </td>
                      <td className="text-center">
                        <Button
                          variant={
                            c.status === "Nuevo"
                              ? "outline-success"
                              : "outline-secondary"
                          }
                          size="sm"
                          onClick={() => handleToggleStatus(c)}
                        >
                          {c.status === "Nuevo"
                            ? "Marcar Leído"
                            : "Marcar Nuevo"}
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          </div>

          {/* Paginación (sin cambios) */}
          <div className="d-flex justify-content-between align-items-center mt-3">
            <Button
              variant="secondary"
              onClick={() => loadContacts("prev")}
              disabled={loading || !hasPrev}
            >
              Anterior
            </Button>
            <span className="text-white-50">Página {page}</span>
            <Button
              variant="secondary"
              onClick={() => loadContacts("next")}
              disabled={loading || !hasNext}
            >
              Siguiente
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
