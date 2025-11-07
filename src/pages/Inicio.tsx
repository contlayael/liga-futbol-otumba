import { Carousel, Container } from "react-bootstrap";

export default function Inicio() {
  return (
    <div className="inicio-page">
      {/* Carrusel Principal */}
      <Carousel className="mb-5">
        {/* --- Item 1 --- */}
        {/* Estilos en línea eliminados, 'className' añadido */}
        <Carousel.Item className="carousel-item-responsive">
          <img
            className="d-block w-100 h-100 carousel-img-responsive" // 'className' añadido
            src="https://placehold.co/1920x600/0f172a/ffffff?text=Bienvenidos+a+la+Liga+de+Otumba"
            alt="Bienvenidos"
            // Estilos en línea eliminados
          />
          {/* Clases de Bootstrap eliminadas, 'className' añadido */}
          <Carousel.Caption className="carousel-caption-responsive">
            <h3>Gran Inicio de Temporada</h3>
            {/* Clase de Bootstrap para ocultar en móvil pequeño */}
            <p className="d-none d-sm-block">
              Sigue de cerca a tu equipo favorito en este nuevo torneo.
            </p>
          </Carousel.Caption>
        </Carousel.Item>

        {/* --- Item 2 --- */}
        <Carousel.Item className="carousel-item-responsive">
          <img
            className="d-block w-100 h-100 carousel-img-responsive"
            src="https://placehold.co/1920x600/1e293b/ffffff?text=Juego+Limpio"
            alt="Juego Limpio"
          />
          <Carousel.Caption className="carousel-caption-responsive">
            <h3>Juego Limpio</h3>
            <p className="d-none d-sm-block">
              Promovemos el respeto y la deportividad dentro y fuera de la
              cancha.
            </p>
          </Carousel.Caption>
        </Carousel.Item>

        {/* --- Item 3 --- */}
        <Carousel.Item className="carousel-item-responsive">
          <img
            className="d-block w-100 h-100 carousel-img-responsive"
            src="https://placehold.co/1920x600/334155/ffffff?text=Inscripciones+Abiertas"
            alt="Inscripciones"
          />
          <Carousel.Caption className="carousel-caption-responsive">
            <h3>¿Quieres participar?</h3>
            <p className="d-none d-sm-block">
              Consulta las bases para inscribir a tu equipo en el próximo
              torneo.
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
