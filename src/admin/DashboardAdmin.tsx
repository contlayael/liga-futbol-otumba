// src/admin/DashboardAdmin.tsx

import "../assets/styles/admin.css";
import AdminFuerzas from "./AdminFuerzas";

export default function DashboardAdmin() {


  return (
    <div className="container py-5 text-dark">
      <h2 className="mb-4 text-white">Panel de Administrador</h2>
      <AdminFuerzas />
      
    </div>
  );
}
