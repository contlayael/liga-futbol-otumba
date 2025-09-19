// src/layout/Header.tsx
import { NavLink } from "react-router-dom";
import "./LayoutStyles.css";

export default function Header() {
  return (
    <header className="header-navbar">
      <div className="container d-flex justify-content-between align-items-center py-3">
        <h1 className="h4 mb-0 text-white">Liga de Fútbol Otumba</h1>
        <nav>
          <ul className="nav gap-3">
            <li className="nav-item">
              <NavLink to="/" className="nav-link text-white">Tabla General</NavLink>
            </li>
            <li className="nav-item">
              <NavLink to="/goleo" className="nav-link text-white">Tabla de Goleo</NavLink>
            </li>
            <li className="nav-item">
              <NavLink to="/avisos" className="nav-link text-white">Avisos</NavLink>
            </li>
            <li className="nav-item">
              <NavLink to="/patrocinadores" className="nav-link text-white">Patrocinadores</NavLink>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}
