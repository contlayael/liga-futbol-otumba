// src/layout/Footer.tsx
import "./LayoutStyles.css";

export default function Footer() {
  return (
    <footer className="footer text-center text-white py-3">
      <p className="mb-0">
        © {new Date().getFullYear()} Liga de Fútbol Otumba · 
        Síguenos en <a href="#" className="text-white fw-bold text-decoration-underline">Facebook</a>
      </p>
    </footer>
  );
}
