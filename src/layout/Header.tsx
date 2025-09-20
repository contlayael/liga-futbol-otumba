// src/layout/Header.tsx
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
    <header className="header-navbar">
      <div className="container d-flex justify-content-between align-items-center py-3">
        <h1 className="h4 mb-0 text-white">Liga de Fútbol Otumba</h1>
        <nav className="d-flex gap-4 align-items-center">
          <ul className="nav gap-3 mb-0">
            <li className="nav-item">
              <NavLink to="/" className="nav-link text-white">
                Tabla General
              </NavLink>
            </li>
            <li className="nav-item">
              <NavLink to="/goleo" className="nav-link text-white">
                Tabla de Goleo
              </NavLink>
            </li>
            <li className="nav-item">
              <NavLink to="/avisos" className="nav-link text-white">
                Avisos
              </NavLink>
            </li>
            <li className="nav-item">
              <NavLink to="/patrocinadores" className="nav-link text-white">
                Patrocinadores
              </NavLink>
            </li>
          </ul>

          <button
            className="btn btn-outline-light btn-sm"
            onClick={handleAccessClick}
          >
            {user ? "Ir al Panel" : "Iniciar Sesión"}
          </button>
          {user && (
            <button
              className="btn btn-light btn-sm ms-2"
              onClick={() => signOut(auth)}
            >
              Cerrar sesión
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}
