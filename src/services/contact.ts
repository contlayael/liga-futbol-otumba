import {
  addDoc,
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  QueryDocumentSnapshot,
  serverTimestamp,
  Timestamp,
  updateDoc,
  startAfter,
  endBefore,
  limitToLast,
  type QueryConstraint, // <-- 1. IMPORTAR EL TIPO 'QueryConstraint'
} from "firebase/firestore";
import { db } from "./firebaseConfig";

export type ContactTipo = "Delegado" | "Jugador" | "Otro";
export type ContactStatus = "Nuevo" | "Leído";

export interface NewContactSubmission {
  nombre: string;
  celular: string;
  equipo: string;
  tipo: ContactTipo;
  createdAt: Timestamp;
  status: ContactStatus;
  comentario?: string;
}

export interface ContactSubmission extends NewContactSubmission {
  id: string;
}

/**
 * Guarda una nueva solicitud de contacto en Firestore.
 * @param data Datos del formulario
 */
export async function addContactSubmission(
  data: Omit<NewContactSubmission, "createdAt" | "status" | "id">
) {
  await addDoc(collection(db, "contacts"), {
    ...data,
    status: "Nuevo",
    createdAt: serverTimestamp(),
  });
}

// Opciones de paginación para el admin
interface PaginationOptions {
  startAfterDoc?: QueryDocumentSnapshot<unknown>;
  endBeforeDoc?: QueryDocumentSnapshot<unknown>;
  pageSize?: number;
}

/**
 * Obtiene una página de solicitudes de contacto para el admin.
 * @param options Opciones de paginación
 */
export async function getContactsPaginated(options: PaginationOptions = {}) {
  const pageSize = options.pageSize || 10;
  
  // ▼▼▼ 2. TIPAR EXPLÍCITAMENTE EL ARRAY ▼▼▼
  const constraints: QueryConstraint[] = [
    orderBy("createdAt", "desc"),
  ];
  // ▲▲▲ FIN DE LA CORRECCIÓN ▲▲▲

  if (options.startAfterDoc) {
    constraints.push(startAfter(options.startAfterDoc));
    constraints.push(limit(pageSize));
  } else if (options.endBeforeDoc) {
    constraints.push(endBefore(options.endBeforeDoc));
    constraints.push(limitToLast(pageSize));
  } else {
    constraints.push(limit(pageSize));
  }

  const q = query(collection(db, "contacts"), ...constraints);
  const snap = await getDocs(q);

  const contacts = snap.docs.map(
    (d) => ({ id: d.id, ...(d.data() as NewContactSubmission) } as ContactSubmission)
  );

  // Si usamos endBefore, los resultados vienen en orden inverso
  if (options.endBeforeDoc) {
    contacts.reverse();
  }

  return {
    contacts,
    firstVisible: snap.docs[0],
    lastVisible: snap.docs[snap.docs.length - 1],
    docCount: snap.docs.length
  };
}

/**
 * Marca un mensaje como "Leído".
 * @param id ID del documento de contacto
 */
export async function updateContactStatus(id: string, status: ContactStatus) {
  await updateDoc(doc(db, "contacts", id), {
    status: status,
  });
}