import { BrowserRouter, Routes, Route } from "react-router-dom";
import Inicio from "./pages/Inicio"; // <-- Importamos la nueva página de Inicio
import TablaGeneral from "./pages/TablaGeneral";
import RolDeJuego from "./pages/RolDeJuego";
import TablaGoleo from "./pages/TablaGoleo";
import Avisos from "./pages/Avisos";
import Patrocinadores from "./pages/Patrocinadores";
import Login from "./admin/Login";
import DashboardAdmin from "./admin/DashboardAdmin";
import DashboardArbitro from "./admin/DashboardArbitro";
import ProtectedRoute from "./router/ProtectedRoute";
import { AuthProvider } from "./context/AuthContext";
import Header from "./layout/Header";
import Footer from "./layout/Footer";
import Registros from "./pages/Registros";
import PlantelEquipo from "./pages/PlantelEquipo";
import AdminSanciones from "./admin/AdminSanciones";
import AdminAvisos from "./admin/AdminAvisos";
import Contacto from "./pages/Contacto";
import AdminContacto from "./admin/AdminContacto";
import Galeria from "./pages/Galeria";
import "./theme.css";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Header />
        <Routes>
          {/* --- Rutas Públicas --- */}
          {/* La ruta raíz ahora muestra Inicio */}
          <Route path="/" element={<Inicio />} />
          {/* Nueva ruta para la Tabla General */}
          <Route path="/tabla-general" element={<TablaGeneral />} />
          <Route path="/rol-juego" element={<RolDeJuego />} />
          <Route path="/goleo" element={<TablaGoleo />} />
          <Route path="/avisos" element={<Avisos />} />
          <Route path="/patrocinadores" element={<Patrocinadores />} />
          <Route path="/registros" element={<Registros />} />
          <Route path="/registros/:teamId" element={<PlantelEquipo />} />
          <Route path="/contacto" element={<Contacto />} />
          <Route path="/galeria" element={<Galeria />} />

          {/* --- Login --- */}
          <Route path="/login" element={<Login />} />

          {/* --- Rutas Privadas (Admin/Árbitro) --- */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <DashboardAdmin />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/sanciones"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AdminSanciones />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/avisos"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AdminAvisos />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/contacto"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AdminContacto />
              </ProtectedRoute>
            }
          />
          <Route
            path="/arbitro"
            element={
              <ProtectedRoute allowedRoles={["arbitro"]}>
                <DashboardArbitro />
              </ProtectedRoute>
            }
          />
        </Routes>
        <Footer />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
