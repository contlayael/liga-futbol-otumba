// src/pages/Galeria.tsx (Corregido)
import { useEffect, useState } from "react";
import {
  Container,
  Card,
  Carousel,
  Button,
  Form,
  Alert,
  Modal,
} from "react-bootstrap";
import { useAuth } from "../context/AuthContext";
import {
  subscribeToAlbums,
  addAlbum,
  deleteAlbum,
  type Album,
} from "../services/gallery";
import type { Timestamp } from "firebase/firestore";

// --- Formulario de Admin (Componente Interno) ---
function AdminGalleryForm({
  onUploadSuccess,
}: {
  onUploadSuccess: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<FileList | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!files || files.length === 0) {
      setError("Debes seleccionar al menos una imagen.");
      return;
    }
    if (files.length > 10) {
      setError("No puedes subir más de 10 imágenes a la vez.");
      return;
    }
    if (!title) {
      setError("El título es obligatorio.");
      return;
    }

    setLoading(true);
    setError("");
    setInfo("");
    try {
      await addAlbum(title, description, files);
      setInfo("¡Álbum subido con éxito!");
      // Limpiar formulario
      setTitle("");
      setDescription("");
      setFiles(null);
      // Resetear el input de archivo
      const fileInput = document.getElementById(
        "gallery-file-input"
      ) as HTMLInputElement;
      if (fileInput) fileInput.value = "";

      onUploadSuccess();
    } catch (e: any) {
      setError(e.message || "Error al subir el álbum.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="card-theme mb-5">
      <Card.Body>
        <h3 className="text-white mb-3">Subir Nuevo Álbum de Fotos</h3>
        {error && <Alert variant="danger">{error}</Alert>}
        {info && <Alert variant="success">{info}</Alert>}
        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Label>Título del Álbum (ej. Jornada 15)</Form.Label>
            <Form.Control
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Título (obligatorio)"
              required
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Descripción (Opcional)</Form.Label>
            <Form.Control
              as="textarea"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descripción breve del álbum..."
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Fotos (máximo 10)</Form.Label>
            <Form.Control
              type="file"
              id="gallery-file-input"
              multiple // Permite seleccionar múltiples archivos
              accept="image/png, image/jpeg, image/webp"
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setFiles(e.target.files)
              }
              required
            />
          </Form.Group>
          <Button variant="primary" type="submit" disabled={loading}>
            {loading ? "Subiendo..." : "Publicar Álbum"}
          </Button>
        </Form>
      </Card.Body>
    </Card>
  );
}

// --- Componente Principal de la Página ---
export default function Galeria() {
  const { role } = useAuth();
  const isAdmin = role === "admin";
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Estados del modal de borrado
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [albumToDelete, setAlbumToDelete] = useState<Album | null>(null);
  const [loadingDelete, setLoadingDelete] = useState(false);

  // Suscribirse a los álbumes
  useEffect(() => {
    setLoading(true);
    try {
      const unsub = subscribeToAlbums((data) => {
        setAlbums(data);
        setLoading(false);
      });
      return () => unsub();
    } catch (e) {
      setError("Error al cargar la galería.");
      setLoading(false);
    }
  }, []);

  // Función para formatear la fecha
  const formatAlbumDate = (timestamp: Timestamp) => {
    // ▼▼▼ CORRECCIÓN AQUÍ ▼▼▼
    // Si el timestamp aún es nulo (sincronizando), mostramos un texto temporal.
    if (!timestamp) {
      return "Publicando...";
    }
    // ▲▲▲ FIN DE CORRECCIÓN ▲▲▲
    return timestamp.toDate().toLocaleString("es-MX", {
      month: "long",
      year: "numeric",
    });
  };

  // Funciones para el modal de borrado
  const openDeleteModal = (album: Album) => {
    setAlbumToDelete(album);
    setShowDeleteModal(true);
  };
  const closeDeleteModal = () => setAlbumToDelete(null);

  const handleDelete = async () => {
    if (!albumToDelete) return;

    setLoadingDelete(true);
    try {
      await deleteAlbum(albumToDelete);
      closeDeleteModal();
    } catch (e) {
      console.error(e);
      setError("No se pudo eliminar el álbum.");
    } finally {
      setLoadingDelete(false);
    }
  };

  return (
    <Container className="py-4">
      <h2 className="mb-4 text-center text-white">Galería</h2>

      {isAdmin && <AdminGalleryForm onUploadSuccess={() => {}} />}

      {error && <Alert variant="danger">{error}</Alert>}
      {loading && (
        <p className="text-white-50 text-center">Cargando galería...</p>
      )}

      {!loading && albums.length === 0 && (
        <div className="card card-theme">
          <div className="card-body text-center text-white p-5">
            Aún no hay álbumes de fotos publicados.
          </div>
        </div>
      )}

      {albums.map((album) => (
        <Card className="card-theme mb-5" key={album.id}>
          <Card.Body>
            <div className="d-flex justify-content-between align-items-start">
              <div>
                <Card.Title as="h4">{album.title}</Card.Title>
                <Card.Subtitle className="mb-2 text-white-50">
                  {formatAlbumDate(album.createdAt)}
                </Card.Subtitle>
                {album.description && (
                  <p className="text-white-50 fst-italic">
                    "{album.description}"
                  </p>
                )}
              </div>
              {isAdmin && (
                <Button
                  variant="outline-danger"
                  size="sm"
                  onClick={() => openDeleteModal(album)}
                >
                  Eliminar
                </Button>
              )}
            </div>

            <Carousel className="mt-3">
              {album.imageUrls.map((url, index) => (
                <Carousel.Item
                  key={index}
                  className="carousel-item-responsive" // Reusamos la clase CSS
                >
                  <img
                    className="d-block w-100 h-100 carousel-img-responsive"
                    src={url}
                    alt={`${album.title} - Foto ${index + 1}`}
                  />
                </Carousel.Item>
              ))}
            </Carousel>
          </Card.Body>
        </Card>
      ))}

      {/* Modal de Confirmación de Borrado */}
      {albumToDelete && (
        <Modal show={showDeleteModal} onHide={closeDeleteModal} centered>
          <div className="modal-content bg-dark text-white">
            <Modal.Header>
              <Modal.Title className="text-danger">
                Confirmar Eliminación
              </Modal.Title>
              <button
                type="button"
                className="btn-close btn-close-white"
                onClick={closeDeleteModal}
                aria-label="Close"
              ></button>
            </Modal.Header>
            <Modal.Body>
              <p>
                ¿Estás seguro de que deseas eliminar el álbum:{" "}
                <strong>{albumToDelete.title}</strong>?
              </p>
              <p className="text-danger">
                Esta acción es irreversible y borrará las{" "}
                {albumToDelete.imageUrls.length} fotos asociadas.
              </p>
            </Modal.Body>
            <Modal.Footer>
              <Button
                variant="secondary"
                onClick={closeDeleteModal}
                disabled={loadingDelete}
              >
                Cancelar
              </Button>
              <Button
                variant="danger"
                onClick={handleDelete}
                disabled={loadingDelete}
              >
                {loadingDelete ? "Eliminando..." : "Eliminar"}
              </Button>
            </Modal.Footer>
          </div>
        </Modal>
      )}
    </Container>
  );
}
