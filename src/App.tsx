// src/App.tsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
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

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Header />
        <Routes>
          {/* Público */}
          <Route path="/" element={<TablaGeneral />} />
          <Route path="/rol-juego" element={<RolDeJuego />} />
          <Route path="/goleo" element={<TablaGoleo />} />
          <Route path="/avisos" element={<Avisos />} />
          <Route path="/patrocinadores" element={<Patrocinadores />} />

          {/* Login */}
          <Route path="/login" element={<Login />} />

          {/* Rutas protegidas por rol */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <DashboardAdmin />
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
