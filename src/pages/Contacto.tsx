// src/pages/Contacto.tsx (Actualizado)
import { useState } from "react";
import {
  Container,
  Form,
  Button,
  Card,
  Alert,
  Row,
  Col,
} from "react-bootstrap";
import { addContactSubmission, type ContactTipo } from "../services/contact";

export default function Contacto() {
  const [nombre, setNombre] = useState("");
  const [celular, setCelular] = useState("");
  const [equipo, setEquipo] = useState("");
  const [tipo, setTipo] = useState<ContactTipo>("Jugador");
  // ▼▼▼ ESTADO AÑADIDO ▼▼▼
  const [comentario, setComentario] = useState("");
  // ▲▲▲ FIN ▲▲▲

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!nombre || !celular || !equipo) {
      setError(
        "Los campos principales (nombre, celular, equipo) son obligatorios."
      );
      return;
    }

    setLoading(true);
    try {
      // ▼▼▼ 'comentario' AÑADIDO AL OBJETO ▼▼▼
      await addContactSubmission({
        nombre,
        celular,
        equipo,
        tipo,
        comentario: comentario.trim() || "", // Enviar solo si no está vacío
      });
      // ▲▲▲ FIN ▲▲▲

      setSuccess(
        "¡Gracias por tu mensaje! Nos pondremos en contacto contigo pronto."
      );
      // Limpiar formulario
      setNombre("");
      setCelular("");
      setEquipo("");
      setTipo("Jugador");
      setComentario(""); // <-- Limpiar también el comentario
    } catch (e) {
      console.error(e);
      setError("Hubo un error al enviar tu mensaje. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container className="py-5">
      <Row className="justify-content-center">
        <Col md={8}>
          <div className="text-center mb-4">
            <h1 className="text-white">Contáctanos</h1>
            <p className="lead text-white-50">
              ¡Tu opinión es importante para la liga! Si tienes dudas,
              sugerencias o quieres inscribir a tu equipo, déjanos un mensaje.
            </p>
          </div>

          <Card className="card-theme">
            <Card.Body>
              {error && <Alert variant="danger">{error}</Alert>}
              {success && <Alert variant="success">{success}</Alert>}

              <Form onSubmit={handleSubmit}>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3" controlId="formNombre">
                      <Form.Label>Nombre completo</Form.Label>
                      <Form.Control
                        type="text"
                        placeholder="Ingresa tu nombre"
                        value={nombre}
                        onChange={(e) => setNombre(e.target.value)}
                        required
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3" controlId="formCelular">
                      <Form.Label>Número de celular</Form.Label>
                      <Form.Control
                        type="tel"
                        placeholder="Ej. 5512345678"
                        value={celular}
                        onChange={(e) => setCelular(e.target.value)}
                        required
                      />
                    </Form.Group>
                  </Col>
                </Row>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3" controlId="formEquipo">
                      <Form.Label>Nombre de tu Equipo</Form.Label>
                      <Form.Control
                        type="text"
                        placeholder="Ej. Real Madrid Otumba"
                        value={equipo}
                        onChange={(e) => setEquipo(e.target.value)}
                        required
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3" controlId="formTipo">
                      <Form.Label>Soy un...</Form.Label>
                      <Form.Select
                        value={tipo}
                        onChange={(e) => setTipo(e.target.value as ContactTipo)}
                        required
                      >
                        <option value="Jugador">Jugador</option>
                        <option value="Delegado">Delegado</option>
                        <option value="Otro">Otro</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                </Row>

                {/* ▼▼▼ CAMPO AÑADIDO ▼▼▼ */}
                <Form.Group className="mb-3" controlId="formComentario">
                  <Form.Label>Comentario (Opcional)</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    placeholder="Escribe aquí tu duda o sugerencia..."
                    value={comentario}
                    onChange={(e) => setComentario(e.target.value)}
                  />
                </Form.Group>
                {/* ▲▲▲ FIN ▲▲▲ */}

                <div className="text-end">
                  <Button
                    variant="primary"
                    type="submit"
                    disabled={loading}
                    className="px-4"
                  >
                    {loading ? "Enviando..." : "Enviar Mensaje"}
                  </Button>
                </div>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}
