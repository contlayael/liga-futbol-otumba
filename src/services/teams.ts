// src/services/teams.ts
import { addDoc, collection, deleteDoc, doc, getDocs, query, setDoc, updateDoc, where } from "firebase/firestore";
import { db } from "./firebaseConfig";

export type Fuerza = "1ra" | "2da" | "3ra";

export interface Stats {
  PJ: number;
  G: number;
  E: number;
  P: number;
  GF: number;
  GC: number;
  DG: number; // GF - GC
  Pts: number; // 3*G + 1*E
}

export interface BaselineStats extends Stats {
  upToRound: number; // Jornada hasta la que aplica la baseline (incluida)
}

export interface Team {
  id: string;
  nombre: string;
  fuerza: Fuerza;
  createdAt: number;
  baseline?: BaselineStats;
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
  arr.sort((a, b) => a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" }));
  return arr;
}

export async function updateTeamBaseline(teamId: string, baseline: Omit<BaselineStats, "DG" | "Pts">) {
  const normalized: BaselineStats = {
    ...baseline,
    DG: baseline.GF - baseline.GC,
    Pts: baseline.G * 3 + baseline.E,
  };
  const teamRef = doc(db, "teams", teamId);
  await setDoc(teamRef, { baseline: normalized }, { merge: true });
}

export async function deleteTeam(teamId: string) {
  const docRef = doc(db, "teams", teamId);
  await deleteDoc(docRef);
}

export async function updateTeamName(teamId: string, newName: string) {
  const docRef = doc(db, "teams", teamId);
  await updateDoc(docRef, { nombre: newName });
}
