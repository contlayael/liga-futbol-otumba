// src/layout/Header.tsx (Actualizado)

import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { signOut } from "firebase/auth";
import { auth } from "../services/firebaseConfig";
// ▼▼▼ Importaciones de React-Bootstrap actualizadas ▼▼▼
import { Navbar, Nav, Container } from "react-bootstrap";
// ▲▲▲ Fin ▲▲▲
import "./LayoutStyles.css";

export default function Header() {
  const { user, role } = useAuth();
  const navigate = useNavigate();

  const handleAccessClick = () => {
    if (!user) {
      navigate("/login");
    } else if (role === "admin") {
      navigate("/admin");
    } else if (role === "arbitro") {
      navigate("/arbitro");
    }
  };

  return (
    // ▼▼▼ ESTRUCTURA REFACTORIZADA CON NAVBAR DE BOOTSTRAP ▼▼▼
    <Navbar
      collapseOnSelect
      expand="lg" // <-- 'lg' es el breakpoint. Móvil/Tablet será hamburguesa
      variant="dark"
      className="header-navbar py-3" // <-- Usamos nuestra clase CSS
    >
      <Container>
        {/* Logo y título van en el "Brand" */}
        <Navbar.Brand
          as={NavLink}
          to="/"
          className="d-flex align-items-center gap-3"
        >
          <img
            src="/images/TorneoLiga.png"
            alt="Logo Torneo de Liga"
            style={{ width: "50px", height: "50px", objectFit: "contain" }}
          />
          <div className="d-flex flex-column">
            <h1 className="h5 mb-0">Liga de Fútbol Otumba</h1>
            {user && (
              <span className="badge bg-secondary ms-0 align-self-start mt-1">
                {role === "admin" ? "Administrador" : "Árbitro"}
              </span>
            )}
          </div>
        </Navbar.Brand>

        {/* Este es el botón de hamburguesa en móvil */}
        <Navbar.Toggle aria-controls="responsive-navbar-nav" />

        {/* Este es el contenedor colapsable */}
        <Navbar.Collapse id="responsive-navbar-nav">
          {/* ms-auto empuja el menú a la derecha en escritorio */}
          <Nav className="ms-auto align-items-center">
            {/* Usamos Nav.Link "as" NavLink para que React Router 
              y React-Bootstrap trabajen juntos.
            */}
            <Nav.Link as={NavLink} to="/" end>
              Inicio
            </Nav.Link>
            <Nav.Link as={NavLink} to="/tabla-general">
              Tabla General
            </Nav.Link>
            <Nav.Link as={NavLink} to="/rol-juego">
              Rol de juego
            </Nav.Link>
            <Nav.Link as={NavLink} to="/registros">
              Registros
            </Nav.Link>
            <Nav.Link as={NavLink} to="/goleo">
              Tabla de Goleo
            </Nav.Link>
            {/*<Nav.Link as={NavLink} to="/avisos">
              Avisos
            </Nav.Link>*/}
            <Nav.Link as={NavLink} to="/contacto">
              Contacto
            </Nav.Link>
            <Nav.Link as={NavLink} to="/patrocinadores">
              Patrocinadores
            </Nav.Link>

            {/* Separador visual para los botones */}
            <hr className="d-lg-none border-secondary" />

            <div className="d-flex flex-column flex-lg-row align-items-stretch align-items-lg-center gap-2 mt-2 mt-lg-0 ms-lg-3">
              <button
                className="btn btn-primary btn-sm" // <-- Botón primario para más énfasis
                onClick={handleAccessClick}
              >
                {user ? "Ir al Panel" : "Iniciar Sesión"}
              </button>
              {user && (
                <button
                  className="btn btn-outline-light btn-sm" // <-- Botón secundario
                  onClick={() => signOut(auth)}
                >
                  Cerrar sesión
                </button>
              )}
            </div>
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
    // ▲▲▲ FIN DE ESTRUCTURA REFACTORIZADA ▲▲▲
  );
}
