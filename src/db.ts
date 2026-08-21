import type { MapSummary, MindMap } from "./types";
import { validateMindMap } from "./model/validate";

const DB_NAME = "local-mind-map";
const DB_VERSION = 1;
const STORE = "maps";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB open failed."));
  });
}

function reqToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed."));
  });
}

export async function listMaps(): Promise<MapSummary[]> {
  const db = await openDb();
  try {
    const tx = db.transaction(STORE, "readonly");
    const store = tx.objectStore(STORE);
    const rows = await reqToPromise(store.getAll());
    return (rows as MindMap[])
      .map((row) => ({
        id: row.id,
        title: row.title,
        isSample: row.isSample === true,
        updatedAt: row.updatedAt,
        topicCount: Array.isArray(row.topics) ? row.topics.length : 0,
      }))
      .sort((a, b) => b.updatedAt - a.updatedAt);
  } finally {
    db.close();
  }
}

export async function getMap(id: string): Promise<MindMap | null> {
  const db = await openDb();
  try {
    const tx = db.transaction(STORE, "readonly");
    const row = await reqToPromise(tx.objectStore(STORE).get(id));
    if (!row) return null;
    const result = validateMindMap(row);
    return result.ok ? result.map : null;
  } finally {
    db.close();
  }
}

export async function saveMap(map: MindMap): Promise<void> {
  const db = await openDb();
  try {
    const tx = db.transaction(STORE, "readwrite");
    await reqToPromise(tx.objectStore(STORE).put(map));
  } finally {
    db.close();
  }
}

export async function deleteMap(id: string): Promise<void> {
  const db = await openDb();
  try {
    const tx = db.transaction(STORE, "readwrite");
    await reqToPromise(tx.objectStore(STORE).delete(id));
  } finally {
    db.close();
  }
}

export async function clearAllMaps(): Promise<void> {
  const db = await openDb();
  try {
    const tx = db.transaction(STORE, "readwrite");
    await reqToPromise(tx.objectStore(STORE).clear());
  } finally {
    db.close();
  }
}

export const dbInfo = {
  name: DB_NAME,
  store: STORE,
};
