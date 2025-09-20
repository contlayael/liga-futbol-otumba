// src/admin/DashboardAdmin.tsx
import { useState, useEffect } from "react";
import { collection, addDoc, onSnapshot } from "firebase/firestore";
import { db } from "../services/firebaseConfig";
import type { Equipo } from "../types/Equipo";
import "../assets/styles/admin.css";
import AdminFuerzas from "./AdminFuerzas";

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
    <div className="container py-5 text-dark">
      <h2 className="mb-4 text-white">Panel de Administrador</h2>
      <AdminFuerzas />
      
    </div>
  );
}
