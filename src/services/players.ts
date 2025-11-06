import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
  limit,
} from "firebase/firestore";
import { db, storage } from "./firebaseConfig";
import type { Fuerza } from "./teams";

export interface NewPlayer {
  nombre: string;
  edad: number;
  registroId: string; // <-- AÑADIDO: ID de registro único (CURP, N° de liga, etc.)
  fuerza: Fuerza;
  teamId: string;
  teamName: string;
  photoURL: string;
  storagePath: string;
}

export interface Player extends NewPlayer {
  id: string; // ID del documento de Firestore
}

/**
 * Sube la foto de un jugador a Firebase Storage.
 */
export async function uploadPlayerPhoto(
  file: File,
  teamId: string
): Promise<{ url: string; path: string }> {
  const uniqueId = crypto.randomUUID();
  const fileExtension = file.name.split(".").pop();
  const storagePath = `players/${teamId}/${uniqueId}.${fileExtension}`;
  const storageRef = ref(storage, storagePath);

  const snapshot = await uploadBytes(storageRef, file);
  const url = await getDownloadURL(snapshot.ref);

  return { url, path: storagePath };
}

/**
 * Agrega un nuevo registro de jugador a Firestore.
 */
export async function addPlayer(playerData: NewPlayer): Promise<string> {
  const ref = await addDoc(collection(db, "players"), playerData);
  return ref.id;
}

/**
 * VERIFICA si un jugador ya existe basado en su ID de Registro.
 * @param registroId - El ID único del jugador (CURP, etc.)
 * @returns true si el jugador ya existe, false si no.
 */
export async function checkPlayerExists(registroId: string): Promise<boolean> {
  if (!registroId) return false;
  const q = query(
    collection(db, "players"),
    where("registroId", "==", registroId),
    limit(1)
  );
  const snap = await getDocs(q);
  return !snap.empty;
}

/**
 * Obtiene todos los jugadores de un equipo específico.
 */
export async function getPlayersByTeamId(teamId: string): Promise<Player[]> {
  const q = query(collection(db, "players"), where("teamId", "==", teamId));
  const snap = await getDocs(q);
  const players = snap.docs.map(
    (d) => ({ id: d.id, ...(d.data() as NewPlayer) })
  );
  players.sort((a, b) => a.nombre.localeCompare(b.nombre));
  return players;
}

/**
 * BUSCA jugadores por su ID de Registro.
 * @param registroId - El ID único del jugador (CURP, etc.)
 * @returns Una lista de jugadores (debería ser 0 o 1).
 */
export async function searchPlayersByRegistroId(
  registroId: string
): Promise<Player[]> {
  const q = query(
    collection(db, "players"),
    where("registroId", "==", registroId)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as NewPlayer) }));
}

/**
 * BUSCA jugadores por nombre (sensible a mayúsculas/minúsculas).
 * @param name - El término de búsqueda para el nombre.
 * @returns Una lista de jugadores que coinciden.
 */
export async function searchPlayersByName(name: string): Promise<Player[]> {
  const q = query(
    collection(db, "players"),
    where("nombre", ">=", name),
    where("nombre", "<=", name + "\uf8ff") // \uf8ff es un truco para "empieza con"
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as NewPlayer) }));
}

/**
 * Elimina un jugador y su foto de Firebase.
 */
export async function deletePlayer(player: Player): Promise<void> {
  try {
    const photoRef = ref(storage, player.storagePath);
    await deleteObject(photoRef);
  } catch (error: any) {
    if (error.code !== "storage/object-not-found") {
      console.warn("No se pudo borrar la foto (quizás ya estaba borrada):", error);
    }
  }
  await deleteDoc(doc(db, "players", player.id));
}