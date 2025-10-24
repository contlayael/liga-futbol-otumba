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
} from "firebase/firestore";
import { db, storage } from "./firebaseConfig";
import type { Fuerza } from "./teams";

export interface NewPlayer {
  nombre: string;
  edad: number;
  fuerza: Fuerza;
  teamId: string; // ID del equipo al que pertenece
  teamName: string; // Nombre del equipo (para facilitar consultas)
  photoURL: string; // URL de la foto en Firebase Storage
  storagePath: string; // Ruta en Storage (para poder borrarla)
}

export interface Player extends NewPlayer {
  id: string;
}

/**
 * Sube la foto de un jugador a Firebase Storage.
 * @param file - El archivo de imagen (File object).
 * @param teamId - El ID del equipo para organizar la carpeta.
 * @returns Una promesa que se resuelve con la URL pública y la ruta de almacenamiento.
 */
export async function uploadPlayerPhoto(
  file: File,
  teamId: string
): Promise<{ url: string; path: string }> {
  // Usamos un ID único para el nombre del archivo para evitar colisiones
  const uniqueId = crypto.randomUUID();
  const fileExtension = file.name.split(".").pop();
  const storagePath = `players/${teamId}/${uniqueId}.${fileExtension}`;
  const storageRef = ref(storage, storagePath);

  // Subir el archivo
  const snapshot = await uploadBytes(storageRef, file);
  // Obtener la URL de descarga
  const url = await getDownloadURL(snapshot.ref);

  return { url, path: storagePath };
}

/**
 * Agrega un nuevo registro de jugador a Firestore.
 * @param playerData - La información del jugador (incluyendo la URL de la foto).
 * @returns El ID del nuevo documento.
 */
export async function addPlayer(playerData: NewPlayer): Promise<string> {
  const ref = await addDoc(collection(db, "players"), playerData);
  return ref.id;
}

/**
 * Obtiene todos los jugadores de un equipo específico.
 * @param teamId - El ID del equipo.
 * @returns Una lista de jugadores.
 */
export async function getPlayersByTeamId(teamId: string): Promise<Player[]> {
  const q = query(collection(db, "players"), where("teamId", "==", teamId));
  const snap = await getDocs(q);
  
  const players = snap.docs.map(
    (d) => ({ id: d.id, ...(d.data() as NewPlayer) })
  );
  
  // Ordenar alfabéticamente
  players.sort((a, b) => a.nombre.localeCompare(b.nombre));
  return players;
}

/**
 * Elimina un jugador y su foto de Firebase.
 * @param player - El objeto del jugador a eliminar.
 */
export async function deletePlayer(player: Player): Promise<void> {
  // 1. Borrar la foto de Storage
  try {
    const photoRef = ref(storage, player.storagePath);
    await deleteObject(photoRef);
  } catch (error: any) {
    // Si la foto no existe, no pasa nada, solo lo logueamos.
    if (error.code !== 'storage/object-not-found') {
      console.warn("No se pudo borrar la foto:", error);
    }
  }

  // 2. Borrar el documento de Firestore
  await deleteDoc(doc(db, "players", player.id));
}
