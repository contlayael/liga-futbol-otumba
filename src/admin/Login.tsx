// src/admin/Login.tsx
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  signInWithEmailAndPassword,
  setPersistence,
  browserLocalPersistence,
} from "firebase/auth";
import { auth } from "../services/firebaseConfig";
import { useAuth } from "../context/AuthContext";
import "../assets/styles/login.css";

export default function Login() {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const { user, role, loading } = useAuth();

  // Determina a qué ruta pública regresar (whitelist para evitar /admin o /arbitro)
  const returnPath = useMemo(() => {
    const from = (location.state as any)?.from?.pathname as string | undefined;
    const publicPaths = new Set(["/", "/goleo", "/avisos", "/patrocinadores"]);
    if (from && publicPaths.has(from)) return from;
    return "/"; // fallback seguro
  }, [location.state]);

  const handleBackToSite = () => {
    navigate(returnPath);
  };

  const handleGoToPanel = () => {
    if (role === "admin") navigate("/admin");
    else if (role === "arbitro") navigate("/arbitro");
  };

  // Redirección automática si ya hay sesión (evita re-entrar a /login)
  useEffect(() => {
    if (loading) return;

    const from = (location.state as any)?.from?.pathname as string | undefined;

    if (user && role === "admin") {
      const target = from && from.startsWith("/admin") ? from : "/admin";
      navigate(target, { replace: true });
    } else if (user && role === "arbitro") {
      const target = from && from.startsWith("/arbitro") ? from : "/arbitro";
      navigate(target, { replace: true });
    }
  }, [user, role, loading, location.state, navigate]);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      // Persistencia local (respeta el dispositivo)
      await setPersistence(auth, browserLocalPersistence);
      await signInWithEmailAndPassword(auth, email, pass);
      // No navegamos aquí: el useEffect de arriba te redirige por rol.
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code ?? "";
      console.error("Error de autenticación:", code);

      if (
        code === "auth/invalid-credential" ||
        code === "auth/wrong-password" ||
        code === "auth/user-not-found" ||
        code === "auth/invalid-email"
      ) {
        setError("Correo o contraseña incorrectos.");
      } else {
        setError("Ocurrió un error inesperado.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page">
      {/* Topbar minimal para volver al sitio y (si aplica) ir al panel */}
      <div className="login-topbar">
        <button className="btn-ghost-light" onClick={handleBackToSite}>
          ← Volver al sitio
        </button>

        {/* Muestra "Ir al panel" si ya hay sesión (por si el redirect aún no corrió) */}
        {user && role && (
          <button
            className="btn btn-outline-light btn-sm"
            onClick={handleGoToPanel}
          >
            Ir al panel
          </button>
        )}
      </div>

      <div className="login-bg" />

      <main className="login-content">
        <div className="login-card">
          <svg
            className="login-icon"
            xmlns="http://www.w3.org/2000/svg"
            fill="currentColor"
            viewBox="0 0 16 16"
            aria-hidden="true"
          >
            <path d="M8 16a8 8 0 1 1 0-16 8 8 0 0 1 0 16zM4.183 4.183c.12-.393.283-.755.488-1.076a4.5 4.5 0 0 1 1.63-1.63c.32-.205.683-.368 1.076-.488C7.784 1.002 8 1 8 1s.216.002.623.069c.393.12.755.283 1.076.488a4.5 4.5 0 0 1 1.63 1.63c.205.32.368.683.488 1.076C11.998 4.216 12 4.433 12 5c0 .567-.002 1.216-.069 1.623-.12.393-.283.755-.488 1.076a4.5 4.5 0 0 1-1.63 1.63c-.32.205-.683.368-1.076.488C8.216 11.998 8 12.217 8 13c-.567 0-1.216-.002-1.623-.069-.393-.12-.755-.283-1.076-.488a4.5 4.5 0 0 1-1.63-1.63c-.205-.32-.368-.683-.488-1.076C4.002 8.216 4 8 4 8s0-.216.069-.623c.12-.393.283-.755.488-1.076A4.5 4.5 0 0 1 5.82 4.183z" />
          </svg>

          <h2 className="text-center mb-4 fw-bold">Iniciar Sesión</h2>

          {error && (
            <div className="alert alert-danger" role="alert" aria-live="polite">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} noValidate>
            <div className="mb-3">
              <label className="form-label" htmlFor="email">
                Correo electrónico
              </label>
              <input
                id="email"
                type="email"
                className="form-control"
                value={email}
                placeholder="admin"
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                disabled={isLoading}
              />
            </div>

            <div className="mb-4">
              <label className="form-label" htmlFor="password">
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                className="form-control"
                value={pass}
                placeholder="••••••••"
                onChange={(e) => setPass(e.target.value)}
                required
                autoComplete="current-password"
                disabled={isLoading}
              />
            </div>

            <button
              type="submit"
              className="btn btn-brand w-100"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <span
                    className="spinner-border spinner-border-sm me-2"
                    role="status"
                    aria-hidden="true"
                  />
                  Entrando…
                </>
              ) : (
                "Entrar"
              )}
            </button>
          </form>

          {/* Enlace de salida adicional bajo la tarjeta (accesible en móvil) */}
          <div className="text-center mt-3">
            <button
              type="button"
              className="btn-link-light"
              onClick={handleBackToSite}
            >
              ← Volver a{" "}
              {returnPath === "/" ? "Tabla General" : "la página anterior"}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
