// src/services/matches.ts
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "./firebaseConfig";
import type { Fuerza } from "./teams";

export type MatchStatus = "scheduled" | "finished";

export interface NewMatch {
  fuerza: Fuerza;
  round: number; // jornada
  matchDate: string; // "YYYY-MM-DD"
  time: string; // "HH:MM"
  field: string;
  homeTeamId: string;
  awayTeamId: string;
  status: MatchStatus; // "scheduled" al crear
  homeScore?: number;
  awayScore?: number;
  woTeamId?: string | null;
  yellowCardCount?: { [playerId: string]: number };
  redCardReason?: { [playerId: string]: "Doble Amarilla" | "Roja Directa" };

  // ▼▼▼ CAMPO AÑADIDO ▼▼▼
  /**
   * Objeto que mapea un playerId al NÚMERO de goles que anotó en este partido.
   * Ejemplo: { "player-abc": 3, "player-xyz": 1 }
   */
  scorers?: { [playerId: string]: number };
  // ▲▲▲ FIN ▲▲▲
}

export interface Match extends NewMatch {
  id: string;
}

export async function addMatch(m: NewMatch): Promise<string> {
  const ref = await addDoc(collection(db, "matches"), m);
  return ref.id;
}

export async function addMatchesBulk(matches: NewMatch[]): Promise<void> {
  const valid = matches.filter(
    (m) =>
      m.fuerza &&
      m.round >= 0 &&
      m.matchDate &&
      m.time &&
      m.field.trim().length > 0 &&
      m.homeTeamId &&
      m.awayTeamId &&
      m.homeTeamId !== m.awayTeamId
  );
  await Promise.all(valid.map(addMatch));
}

export async function listMatchesByDateAndFuerza(
  matchDate: string,
  fuerza: Fuerza
): Promise<Match[]> {
  const q = query(
    collection(db, "matches"),
    where("fuerza", "==", fuerza),
    where("matchDate", "==", matchDate)
  );
  const snap = await getDocs(q);
  const arr =
    snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Match[];
  arr.sort((a, b) => (a.time || "").localeCompare(b.time || ""));
  return arr;
}

// 🔴 Suscripción en tiempo real al rol por fecha + fuerza
export function subscribeMatchesByDateAndFuerza(
  matchDate: string,
  fuerza: Fuerza,
  cb: (matches: Match[]) => void
): () => void {
  const q = query(
    collection(db, "matches"),
    where("fuerza", "==", fuerza),
    where("matchDate", "==", matchDate)
  );
  const unsub = onSnapshot(q, (snap) => {
    const arr =
      snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Match[];
    arr.sort((a, b) => (a.time || "").localeCompare(b.time || ""));
    cb(arr);
  });
  return unsub;
}

// 🔴 Suscripción a partidos FINALIZADOS por fuerza (para tabla general en tiempo real)
export function subscribeFinishedMatchesByFuerza(
  fuerza: Fuerza,
  cb: (matches: Match[]) => void
): () => void {
  const q = query(
    collection(db, "matches"),
    where("fuerza", "==", fuerza),
    where("status", "==", "finished")
  );
  const unsub = onSnapshot(q, (snap) => {
    const arr =
      snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Match[];
    cb(arr);
  });
  return unsub;
}

// 🔧 Actualizar marcador (normal o W.O.)
export async function updateMatchScore(
  matchId: string,
  payload: {
    homeScore: number;
    awayScore: number;
    status?: MatchStatus;
    woTeamId?: string | null;
    yellowCardCount?: { [playerId: string]: number };
    redCardReason?: { [playerId: string]: "Doble Amarilla" | "Roja Directa" };
    // ▼▼▼ CAMPO AÑADIDO ▼▼▼
    scorers?: { [playerId: string]: number };
    // ▲▲▲ FIN ▲▲▲
  }
) {
  const ref = doc(db, "matches", matchId);
  await updateDoc(ref, {
    homeScore: payload.homeScore,
    awayScore: payload.awayScore,
    status: payload.status ?? "finished",
    woTeamId: payload.woTeamId ?? null,
    yellowCardCount: payload.yellowCardCount ?? {},
    redCardReason: payload.redCardReason ?? {},
    // ▼▼▼ LÍNEA AÑADIDA ▼▼▼
    scorers: payload.scorers ?? {},
    // ▲▲▲ FIN ▲▲▲
  });
}

export async function deleteMatchById(matchId: string): Promise<void> {
  await deleteDoc(doc(db, "matches", matchId));
}