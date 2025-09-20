// src/services/matches.ts
import { addDoc, collection, deleteDoc, doc, getDocs, query, where } from "firebase/firestore";
import { db } from "./firebaseConfig";
import type { Fuerza } from "./teams";

export type MatchStatus = "scheduled" | "finished";

export interface NewMatch {
  fuerza: Fuerza;
  round: number;
  matchDate: string;  // YYYY-MM-DD
  time: string;       // HH:MM
  field: string;
  homeTeamId: string;
  awayTeamId: string;
  status: MatchStatus;
}

export interface Match extends NewMatch { id: string; }

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

export async function listMatchesByDateAndFuerza(matchDate: string, fuerza: Fuerza): Promise<Match[]> {
  const q = query(collection(db, "matches"), where("fuerza", "==", fuerza), where("matchDate", "==", matchDate));
  const snap = await getDocs(q);
  const arr = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Match[];
  arr.sort((a, b) => (a.time || "").localeCompare(b.time || ""));
  return arr;
}

export async function deleteMatchById(matchId: string): Promise<void> {
  await deleteDoc(doc(db, "matches", matchId));
}
