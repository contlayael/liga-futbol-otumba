// src/admin/DashboardAdmin.tsx
import { useState, useEffect } from "react";
import { collection, addDoc, onSnapshot } from "firebase/firestore";
import { db } from "../services/firebaseConfig";
import type { Equipo } from "../types/Equipo";

export default function DashboardAdmin() {
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [nuevoEquipo, setNuevoEquipo] = useState<Equipo>({
    nombre: "",
    pj: 0,
    g: 0,
    e: 0,
    p: 0,
    gf: 0,
    gc: 0,
    dg: 0,
    pts: 0,
  });

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "equipos"), (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Equipo[];
      setEquipos(data);
    });

    return () => unsubscribe();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNuevoEquipo({
      ...nuevoEquipo,
      [name]: name === "nombre" ? value : Number(value),
    });
  };

  const handleAgregarEquipo = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, "equipos"), nuevoEquipo);
      setNuevoEquipo({
        nombre: "",
        pj: 0,
        g: 0,
        e: 0,
        p: 0,
        gf: 0,
        gc: 0,
        dg: 0,
        pts: 0,
      });
    } catch (error) {
      console.error("Error al agregar equipo:", error);
    }
  };

  return (
    <div className="container py-5 text-white">
      <h2 className="mb-4">Panel de Administrador</h2>

      <h4 className="mb-3">Agregar nuevo equipo</h4>
      <form onSubmit={handleAgregarEquipo} className="row g-3 mb-5">
        <div className="col-md-6">
          <input
            type="text"
            className="form-control"
            name="nombre"
            value={nuevoEquipo.nombre}
            onChange={handleChange}
            placeholder="Nombre del equipo"
            required
          />
        </div>
        {["pj", "g", "e", "p", "gf", "gc", "dg", "pts"].map((campo) => (
          <div className="col-md-3" key={campo}>
            <input
              type="number"
              className="form-control"
              name={campo}
              value={(nuevoEquipo as any)[campo]}
              onChange={handleChange}
              placeholder={campo.toUpperCase()}
              required
            />
          </div>
        ))}
        <div className="col-12">
          <button type="submit" className="btn btn-success">
            Agregar equipo
          </button>
        </div>
      </form>

      <h4 className="mb-3">Equipos registrados</h4>
      <table className="table table-dark table-hover table-bordered align-middle">
        <thead className="table-success text-center">
          <tr>
            <th>Club</th>
            <th>PJ</th>
            <th>G</th>
            <th>E</th>
            <th>P</th>
            <th>GF</th>
            <th>GC</th>
            <th>DG</th>
            <th>Pts</th>
          </tr>
        </thead>
        <tbody className="text-center">
          {equipos.map((eq) => (
            <tr key={eq.id}>
              <td className="text-start">{eq.nombre}</td>
              <td>{eq.pj}</td>
              <td>{eq.g}</td>
              <td>{eq.e}</td>
              <td>{eq.p}</td>
              <td>{eq.gf}</td>
              <td>{eq.gc}</td>
              <td>{eq.dg}</td>
              <td className="fw-bold">{eq.pts}</td>
            </tr>
          ))}
          {equipos.length === 0 && (
            <tr>
              <td colSpan={9} className="text-muted text-center py-4">
                No hay equipos aún.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
