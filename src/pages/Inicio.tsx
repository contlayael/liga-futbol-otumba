// src/pages/Inicio.tsx (Actualizado con imágenes locales)

import { Carousel, Container } from "react-bootstrap";

export default function Inicio() {
  return (
    <div className="inicio-page">
      {/* Carrusel Principal */}
      <Carousel className="mb-5">
        {/* --- Item 1 (Otompa) --- */}
        <Carousel.Item className="carousel-item-responsive">
          <img
            className="d-block w-100 h-100 carousel-img-responsive"
            // ▼▼▼ CAMBIO AQUÍ ▼▼▼
            src="/images/otompa.jpeg"
            alt="Vista de Otumba"
            // ▲▲▲ FIN ▲▲▲
          />
          <Carousel.Caption className="carousel-caption-responsive">
            <h3>Bienvenidos a la Liga de Otumba</h3>
            <p className="d-none d-sm-block">
              Gran Inicio de Temporada. Sigue de cerca a tu equipo favorito.
            </p>
          </Carousel.Caption>
        </Carousel.Item>

        {/* --- Item 2 (Arbitros) --- */}
        <Carousel.Item className="carousel-item-responsive">
          <img
            className="d-block w-100 h-100 carousel-img-responsive"
            // ▼▼▼ CAMBIO AQUÍ ▼▼▼
            src="/images/arbitros.jpeg"
            alt="Árbitros del torneo"
            // ▲▲▲ FIN ▲▲▲
          />
          <Carousel.Caption className="carousel-caption-responsive">
            <h3>Juego Limpio</h3>
            <p className="d-none d-sm-block">
              Promovemos el respeto y la deportividad dentro y fuera de la
              cancha.
            </p>
          </Carousel.Caption>
        </Carousel.Item>

        {/* --- Item 3 (Holanda) --- */}
        <Carousel.Item className="carousel-item-responsive">
          <img
            className="d-block w-100 h-100 carousel-img-responsive"
            // ▼▼▼ CAMBIO AQUÍ ▼▼▼
            src="/images/holanda.jpeg"
            alt="Equipo de la liga"
            // ▲▲▲ FIN ▲▲▲
          />
          <Carousel.Caption className="carousel-caption-responsive">
            <h3>Inscripciones Abiertas</h3>
            <p className="d-none d-sm-block">
              ¿Quieres participar? Consulta las bases para inscribir a tu
              equipo.
            </p>
          </Carousel.Caption>
        </Carousel.Item>
      </Carousel>

      {/* Contenido inferior (sin cambios) */}
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
