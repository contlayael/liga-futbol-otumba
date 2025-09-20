// src/router/ProtectedRoute.tsx
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

interface ProtectedRouteProps {
  allowedRoles: Array<"admin" | "arbitro">;
  children: React.ReactNode;
}

export default function ProtectedRoute({ allowedRoles, children }: ProtectedRouteProps) {
  const { user, role, loading } = useAuth();
  const location = useLocation();

  if (loading) return <p>Cargando...</p>;

  if (!user) {
    // No autenticado → manda al login y recuerda ruta anterior
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!role || !allowedRoles.includes(role as "admin" | "arbitro")) {
    // Autenticado pero no autorizado → home
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
// Si está autenticado y autorizado, renderiza el componente