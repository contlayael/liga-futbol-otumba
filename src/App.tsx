// src/App.tsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import TablaGeneral from "./pages/TablaGeneral";
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
// 👈 el layout que hicimos

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Header />
        <Routes>
          {/* Público */}
          <Route path="/" element={<TablaGeneral />} />
          <Route path="/goleo" element={<TablaGoleo />} />
          <Route path="/avisos" element={<Avisos />} />
          <Route path="/patrocinadores" element={<Patrocinadores />} />

          {/* Login y Dashboards */}
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<ProtectedRoute />} />
          <Route path="/admin" element={<DashboardAdmin />} />
          <Route path="/arbitro" element={<DashboardArbitro />} />
        </Routes>
        <Footer />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
