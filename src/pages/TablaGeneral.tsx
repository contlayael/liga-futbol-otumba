// src/pages/TablaGeneral.tsx
import { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../services/firebaseConfig";
import { Tab, Tabs } from "react-bootstrap"; // Usamos react-bootstrap para tabs bonitos
import "bootstrap/dist/css/bootstrap.min.css";

interface Team {
  id: string;
  nombre: string;
  fuerza: string; // "1ra", "2da", "3ra"
  pj?: number;
  g?: number;
  e?: number;
  p?: number;
  gf?: number;
  gc?: number;
  dg?: number;
  pts?: number;
}

const fuerzas = ["1ra", "2da", "3ra"];

export default function TablaGeneral() {
  const [equiposPorFuerza, setEquiposPorFuerza] = useState<Record<string, Team[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const obtenerEquipos = async () => {
      const datosPorFuerza: Record<string, Team[]> = {};

      for (const fuerza of fuerzas) {
        const q = query(collection(db, "teams"), where("fuerza", "==", fuerza));
        const snapshot = await getDocs(q);
        datosPorFuerza[fuerza] = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Team[];
      }

      setEquiposPorFuerza(datosPorFuerza);
      setLoading(false);
    };

    obtenerEquipos();
  }, []);

  if (loading) return <p className="text-center my-5">Cargando tabla general...</p>;

  return (
    <div className="container py-4">
      <h2 className="mb-4 text-center text-white">Tabla General por Fuerza</h2>

      <Tabs defaultActiveKey="1ra" id="fuerza-tabs" className="mb-3 justify-content-center" fill>
        {fuerzas.map((fuerza) => (
          <Tab eventKey={fuerza} title={`${fuerza} Fuerza`} key={fuerza}>
            <div className="table-responsive">
              <table className="table table-striped table-bordered text-center">
                <thead className="table-dark">
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
                <tbody>
                  {equiposPorFuerza[fuerza]?.length ? (
                    equiposPorFuerza[fuerza].map((equipo) => (
                      <tr key={equipo.id}>
                        <td>{equipo.nombre}</td>
                        <td>{equipo.pj ?? 0}</td>
                        <td>{equipo.g ?? 0}</td>
                        <td>{equipo.e ?? 0}</td>
                        <td>{equipo.p ?? 0}</td>
                        <td>{equipo.gf ?? 0}</td>
                        <td>{equipo.gc ?? 0}</td>
                        <td>{equipo.dg ?? 0}</td>
                        <td>{equipo.pts ?? 0}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={9}>No hay equipos registrados en esta fuerza.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Tab>
        ))}
      </Tabs>
    </div>
  );
}
