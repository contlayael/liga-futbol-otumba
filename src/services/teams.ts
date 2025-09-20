// src/services/teams.ts
import { addDoc, collection, getDocs, query, where } from "firebase/firestore";
import { db } from "./firebaseConfig";

export type Fuerza = "1ra" | "2da" | "3ra";

export interface Team {
  id: string;
  nombre: string;
  fuerza: Fuerza;
  createdAt: number;
}

export async function addTeam(nombre: string, fuerza: Fuerza): Promise<string> {
  const ref = await addDoc(collection(db, "teams"), {
    nombre,
    fuerza,
    createdAt: Date.now(),
  });
  return ref.id;
}

export async function getTeamsByFuerza(fuerza: Fuerza): Promise<Team[]> {
  const q = query(collection(db, "teams"), where("fuerza", "==", fuerza));
  const snap = await getDocs(q);
  const arr = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Team[];
  // Ordenamos en cliente para evitar índices compuestos
  arr.sort((a, b) => a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" }));
  return arr;
}
