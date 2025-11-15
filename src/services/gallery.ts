// src/services/gallery.ts
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
import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytes,
} from "firebase/storage";
import { db, storage } from "./firebaseConfig";

// Define la estructura de un álbum en Firestore
export interface Album {
  id: string;
  title: string;
  description: string;
  imageUrls: string[];
  storagePaths: string[]; // Para poder borrar las fotos
  createdAt: Timestamp;
}

/**
 * Sube múltiples archivos a Firebase Storage.
 * @param files Lista de archivos a subir.
 * @returns Array de objetos con las URLs y rutas de las imágenes subidas.
 */
async function uploadGalleryImages(
  files: FileList
): Promise<{ url: string; path: string }[]> {
  
  const uploadPromises: Promise<{ url: string; path: string }>[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const fileExtension = file.name.split(".").pop();
    const storagePath = `gallery/${crypto.randomUUID()}.${fileExtension}`;
    const storageRef = ref(storage, storagePath);

    // Creamos una promesa para cada subida
    const uploadPromise = uploadBytes(storageRef, file).then(async (snapshot) => {
      const url = await getDownloadURL(snapshot.ref);
      return { url, path: storagePath };
    });
    
    uploadPromises.push(uploadPromise);
  }

  // Esperamos a que TODAS las imágenes se suban
  return Promise.all(uploadPromises);
}

/**
 * Crea un nuevo documento de álbum en Firestore.
 * @param title Título del álbum.
 * @param description Descripción del álbum.
 * @param files Lista de archivos de imagen.
 */
export async function addAlbum(
  title: string,
  description: string,
  files: FileList
) {
  if (!title || files.length === 0) {
    throw new Error("El título y al menos una imagen son requeridos.");
  }
  if (files.length > 10) {
    throw new Error("No puedes subir más de 10 imágenes a la vez.");
  }

  // 1. Subir todas las imágenes a Storage
  const images = await uploadGalleryImages(files);

  // 2. Preparar los datos para Firestore
  const albumData = {
    title: title,
    description: description,
    imageUrls: images.map(img => img.url),
    storagePaths: images.map(img => img.path),
    createdAt: serverTimestamp(),
  };

  // 3. Crear el documento en Firestore
  await addDoc(collection(db, "albums"), albumData);
}

/**
 * Se suscribe a todos los álbumes, ordenados por fecha (más nuevos primero).
 */
export function subscribeToAlbums(
  cb: (albums: Album[]) => void
): () => void {
  const q = query(collection(db, "albums"), orderBy("createdAt", "desc"));

  const unsub = onSnapshot(q, (snap) => {
    const albums = snap.docs.map(
      (d) => ({ id: d.id, ...(d.data() as any) } as Album)
    );
    cb(albums);
  });
  return unsub;
}

/**
 * Elimina un álbum completo (documento de Firestore y fotos de Storage).
 */
export async function deleteAlbum(album: Album) {
  // 1. Borrar todas las imágenes de Storage
  const deletePromises = album.storagePaths.map(path => {
    const photoRef = ref(storage, path);
    return deleteObject(photoRef);
  });
  
  try {
    await Promise.all(deletePromises);
  } catch (error) {
    console.warn("Error al borrar una o más imágenes de Storage, pero se continuará borrando el álbum.", error);
  }
  
  // 2. Borrar el documento de Firestore
  await deleteDoc(doc(db, "albums", album.id));
}