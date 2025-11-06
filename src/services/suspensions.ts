import {
  addDoc,
  collection,
  doc,
  getDocs,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "./firebaseConfig";
import type { Fuerza } from "./teams";
import type { Player } from "./players";
import type { Match } from "./matches";

/**
 * Define el estado de una sanción.
 * - Active: La sanción está en curso.
 * - Served: El jugador ya cumplió su castigo.
 */
export type SuspensionStatus = "Active" | "Served";

/**
 * Define la estructura de un documento en la colección `suspensions`.
 * Este es el "caso" de una sanción.
 */
export interface Suspension {
  id: string;
  playerId: string;
  playerName: string;
  teamId: string;
  teamName: string;
  fuerza: Fuerza;

  // Datos de la infracción
  matchIdOfOffense: string; // El partido donde ocurrió
  jornadaOfOffense: number; // Ej. 7
  reason: "Roja Directa" | "Doble Amarilla"; // Motivo

  // Datos de la sanción (Editable por Admin)
  gamesSuspended: number; // Ej. 1 (default) o 3 (editado)

  // Datos calculados (para mostrar al público)
  jornadasToMiss: number[]; // Ej. [8, 9, 10]
  returnJornada: number; // Ej. 11

  status: SuspensionStatus; // "Active" o "Served"
}

/**
 * Crea una sanción por defecto (1 partido) cuando un árbitro reporta una roja.
 * Esta es la función que llamará el DashboardArbitro.
 */
export async function createDefaultSuspension(
  player: Player,
  match: Match,
  reason: "Roja Directa" | "Doble Amarilla"
): Promise<string> {
  
  const jornada = match.round;
  const defaultGames = 1; // Por defecto, 1 partido de suspensión

  const newSuspension = {
    playerId: player.id,
    playerName: player.nombre,
    teamId: player.teamId,
    teamName: player.teamName,
    fuerza: player.fuerza,
    matchIdOfOffense: match.id,
    jornadaOfOffense: jornada,
    reason: reason,
    gamesSuspended: defaultGames,
    // Calculamos las jornadas a faltar
    jornadasToMiss: Array.from(
      { length: defaultGames },
      (_, i) => jornada + i + 1
    ),
    // Calculamos la jornada de regreso
    returnJornada: jornada + defaultGames + 1,
    status: "Active" as SuspensionStatus,
  };

  const ref = await addDoc(collection(db, "suspensions"), newSuspension);
  return ref.id;
}

/**
 * Obtiene todas las sanciones activas para una fuerza.
 * Usado por el nuevo panel de AdminSanciones.
 */
export async function getActiveSuspensionsByFuerza(
  fuerza: Fuerza
): Promise<Suspension[]> {
  const q = query(
    collection(db, "suspensions"),
    where("fuerza", "==", fuerza),
    where("status", "==", "Active")
  );
  const snap = await getDocs(q);
  const suspensions = snap.docs.map(
    (d) => ({ id: d.id, ...(d.data() as any) } as Suspension)
  );
  // Ordenar por jornada de ofensa, la más reciente primero
  suspensions.sort((a, b) => b.jornadaOfOffense - a.jornadaOfOffense);
  return suspensions;
}

/**
 * Obtiene la sanción activa (si existe) para UN jugador.
 * Usado por la vista pública (PlantelEquipo) para mostrar el estado.
 */
export async function getActiveSuspensionForPlayer(
  playerId: string
): Promise<Suspension | null> {
  const q = query(
    collection(db, "suspensions"),
    where("playerId", "==", playerId),
    where("status", "==", "Active")
  );
  const snap = await getDocs(q);
  if (snap.empty) {
    return null;
  }
  // Un jugador solo debería tener una sanción activa a la vez
  return { id: snap.docs[0].id, ...(snap.docs[0].data() as any) } as Suspension;
}

/**
 * Actualiza el número de partidos de una sanción (función del Admin).
 * Recalcula las jornadas a faltar y la jornada de regreso.
 */
export async function updateSuspensionGames(
  suspensionId: string,
  jornadaOfOffense: number,
  newGamesCount: number
) {
  const ref = doc(db, "suspensions", suspensionId);
  await updateDoc(ref, {
    gamesSuspended: newGamesCount,
    jornadasToMiss: Array.from(
      { length: newGamesCount },
      (_, i) => jornadaOfOffense + i + 1
    ),
    returnJornada: jornadaOfOffense + newGamesCount + 1,
  });
}

/**
 * Marca una sanción como "Cumplida".
 * (Esta es una función futura, por ahora la dejamos pendiente)
 */
export async function markSuspensionAsServed(suspensionId: string) {
  const ref = doc(db, "suspensions", suspensionId);
  await updateDoc(ref, {
    status: "Served",
  });
}