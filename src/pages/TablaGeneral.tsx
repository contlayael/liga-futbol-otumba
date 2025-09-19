// src/pages/TablaGeneral.tsx
import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  QuerySnapshot,
  type DocumentData,
} from "firebase/firestore";
import { db } from "../services/firebaseConfig";

interface Equipo {
  id: string;
  nombre: string;
  pj: number;
  g: number;
  e: number;
  p: number;
  gf: number;
  gc: number;
  dg: number;
  pts: number;
}

export default function TablaGeneral() {
  const [equipos, setEquipos] = useState<Equipo[]>([]);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "equipos"),
      (snapshot: QuerySnapshot<DocumentData>) => {
        const data: Equipo[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Equipo[];
        // Opcional: ordenar por puntos
        const ordenados = data.sort((a, b) => b.pts - a.pts);
        console.log("Equipos desde Firestore:", ordenados); // 👈
        setEquipos(ordenados);
      }
    );

    return () => unsubscribe();
  }, []);

  return (
    <div className="container py-5 text-white">
      <h2 className="mb-4">Tabla General</h2>

      <div className="table-responsive">
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
            {equipos.map((equipo) => (
              <tr key={equipo.id}>
                <td className="text-start">{equipo.nombre}</td>
                <td>{equipo.pj}</td>
                <td>{equipo.g}</td>
                <td>{equipo.e}</td>
                <td>{equipo.p}</td>
                <td>{equipo.gf}</td>
                <td>{equipo.gc}</td>
                <td>{equipo.dg}</td>
                <td className="fw-bold">{equipo.pts}</td>
              </tr>
            ))}
            {equipos.length === 0 && (
              <tr>
                <td colSpan={9} className="text-center py-4 text-muted">
                  No hay equipos registrados aún.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
