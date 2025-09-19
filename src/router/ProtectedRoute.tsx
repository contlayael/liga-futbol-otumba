// src/router/ProtectedRoute.tsx

import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute() {
  const { user, role, loading } = useAuth();

  if (loading) return <p>Cargando...</p>;
  if (!user) return <Navigate to="/login" />;

  if (role === "admin") return <Navigate to="/admin" />;
  if (role === "arbitro") return <Navigate to="/arbitro" />;

  return <p>Rol no autorizado</p>;
}
