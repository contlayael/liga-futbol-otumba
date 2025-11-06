import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { signOut } from "firebase/auth";
import { auth } from "../services/firebaseConfig";
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
    <header className="header-navbar py-3">
      <div className="container d-flex flex-wrap justify-content-between align-items-center">
        {/* Logo y título */}
        <div className="d-flex align-items-center gap-3 mb-2 mb-sm-0">
          <img
            src="/images/TorneoLiga.png"
            alt="Logo Torneo de Liga"
            style={{ width: "50px", height: "50px", objectFit: "contain" }}
          />
          <h1 className="h5 mb-0">Liga de Fútbol Otumba</h1>
          {user && (
            <span className="badge bg-secondary ms-2">
              {role === "admin" ? "Administrador" : "Árbitro"}
            </span>
          )}
        </div>

        {/* Navegación */}
        <nav className="d-flex flex-wrap align-items-center gap-3">
          <ul className="nav gap-2 mb-0">
            <li className="nav-item">
              {/* Enlace a Inicio */}
              <NavLink to="/" className="nav-link" end>
                Inicio
              </NavLink>
            </li>
            <li className="nav-item">
              {/* Enlace actualizado a Tabla General */}
              <NavLink to="/tabla-general" className="nav-link">
                Tabla General
              </NavLink>
            </li>
            <li className="nav-item">
              <NavLink to="/registros" className="nav-link">
                Registros
              </NavLink>
            </li>
            <li className="nav-item">
              <NavLink to="/rol-juego" className="nav-link">
                Rol de juego
              </NavLink>
            </li>
            <li className="nav-item">
              <NavLink to="/goleo" className="nav-link">
                Tabla de Goleo
              </NavLink>
            </li>
            <li className="nav-item">
              <NavLink to="/avisos" className="nav-link">
                Avisos
              </NavLink>
            </li>
            {/*<li className="nav-item">
              <NavLink to="/patrocinadores" className="nav-link">
                Patrocinadores
              </NavLink>
            </li>*/}
          </ul>

          <div className="d-flex gap-2">
            <button
              className="btn btn-outline-light btn-sm"
              onClick={handleAccessClick}
            >
              {user ? "Ir al Panel" : "Iniciar Sesión"}
            </button>
            {user && (
              <button
                className="btn btn-light btn-sm"
                onClick={() => signOut(auth)}
              >
                Cerrar sesión
              </button>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}
