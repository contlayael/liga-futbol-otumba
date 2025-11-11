// src/services/avisos.ts
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "./firebaseConfig";

export interface Aviso {
  id: string;
  text: string;
  createdAt: Timestamp; // Para ordenar
}

/**
 * Añade un nuevo aviso a la base de datos.
 */
export async function addAviso(text: string): Promise<string> {
  if (!text.trim()) throw new Error("El aviso no puede estar vacío.");

  const docRef = await addDoc(collection(db, "avisos"), {
    text: text,
    createdAt: serverTimestamp(), // Fecha/hora del servidor
  });
  return docRef.id;
}

/**
 * Elimina un aviso por su ID.
 */
export async function deleteAviso(avisoId: string): Promise<void> {
  await deleteDoc(doc(db, "avisos", avisoId));
}

/**
 * Se suscribe a los avisos en tiempo real, ordenados por fecha (más nuevo primero).
 */
export function subscribeToAvisos(
  cb: (avisos: Aviso[]) => void
): () => void {
  const q = query(
    collection(db, "avisos"),
    orderBy("createdAt", "desc")
  );

  const unsub = onSnapshot(q, (snap) => {
    const avisos = snap.docs.map(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (d) => ({ id: d.id, ...(d.data() as any) } as Aviso)
    );
    cb(avisos);
  });
  return unsub;
}