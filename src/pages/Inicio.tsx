import { Carousel, Container } from "react-bootstrap";

export default function Inicio() {
  return (
    <div className="inicio-page">
      {/* Carrusel Principal */}
      <Carousel className="mb-5">
        <Carousel.Item style={{ height: "500px" }}>
          <img
            className="d-block w-100 h-100"
            src="https://placehold.co/1920x600/0f172a/ffffff?text=Bienvenidos+a+la+Liga+de+Otumba"
            alt="Bienvenidos"
            style={{ objectFit: "cover", opacity: 0.8 }}
          />
          <Carousel.Caption className="bg-dark bg-opacity-50 p-3 rounded">
            <h3>Gran Inicio de Temporada</h3>
            <p>Sigue de cerca a tu equipo favorito en este nuevo torneo.</p>
          </Carousel.Caption>
        </Carousel.Item>
        <Carousel.Item style={{ height: "500px" }}>
          <img
            className="d-block w-100 h-100"
            src="https://placehold.co/1920x600/1e293b/ffffff?text=Juego+Limpio"
            alt="Juego Limpio"
            style={{ objectFit: "cover", opacity: 0.8 }}
          />
          <Carousel.Caption className="bg-dark bg-opacity-50 p-3 rounded">
            <h3>Juego Limpio</h3>
            <p>
              Promovemos el respeto y la deportividad dentro y fuera de la
              cancha.
            </p>
          </Carousel.Caption>
        </Carousel.Item>
        <Carousel.Item style={{ height: "500px" }}>
          <img
            className="d-block w-100 h-100"
            src="https://placehold.co/1920x600/334155/ffffff?text=Inscripciones+Abiertas"
            alt="Inscripciones"
            style={{ objectFit: "cover", opacity: 0.8 }}
          />
          <Carousel.Caption className="bg-dark bg-opacity-50 p-3 rounded">
            <h3>¿Quieres participar?</h3>
            <p>
              Consulta las bases para inscribir a tu equipo en el próximo
              torneo.
            </p>
          </Carousel.Caption>
        </Carousel.Item>
      </Carousel>

      <Container className="text-center text-white mb-5">
        <h1 className="display-4 fw-bold">Liga de Fútbol Otumba</h1>
        <p className="lead text-white-50">
          Pasión, competitividad y comunidad en cada partido.
        </p>
        <hr className="my-4 border-secondary" />
        <p>
          Explora la tabla general, revisa el rol de juegos y conoce a nuestros
          equipos.
        </p>
      </Container>
    </div>
  );
}
