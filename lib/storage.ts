import { PracticeSet, Group, ExportData } from '@/types';

const STORAGE_KEY = 'anatomy_practice_sets';
const GROUPS_KEY = 'anatomy_practice_groups';

// ─── Sets ────────────────────────────────────────────────────────────────────

export function getSets(): PracticeSet[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function getSet(id: string): PracticeSet | null {
  return getSets().find((s) => s.id === id) ?? null;
}

export function saveSet(set: PracticeSet): void {
  const sets = getSets();
  const index = sets.findIndex((s) => s.id === set.id);
  // Strip the image field before writing to localStorage to avoid QuotaExceededError.
  // Images are stored separately in IndexedDB via saveImage().
  const setToStore: PracticeSet = { ...set, image: '' };
  if (index >= 0) {
    sets[index] = setToStore;
  } else {
    sets.push(setToStore);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sets));
}

export function deleteSet(id: string): void {
  const sets = getSets().filter((s) => s.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sets));
  // Also remove this set from all groups
  const groups = getGroups();
  groups.forEach((g) => {
    if (g.setIds.includes(id)) {
      g.setIds = g.setIds.filter((sid) => sid !== id);
    }
  });
  localStorage.setItem(GROUPS_KEY, JSON.stringify(groups));
}

// ─── Groups ──────────────────────────────────────────────────────────────────

export function getGroups(): Group[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(GROUPS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function getGroup(id: string): Group | null {
  return getGroups().find((g) => g.id === id) ?? null;
}

export function saveGroup(group: Group): void {
  const groups = getGroups();
  const index = groups.findIndex((g) => g.id === group.id);
  if (index >= 0) {
    groups[index] = group;
  } else {
    groups.push(group);
  }
  localStorage.setItem(GROUPS_KEY, JSON.stringify(groups));
}

export function deleteGroup(id: string): void {
  const groups = getGroups().filter((g) => g.id !== id);
  localStorage.setItem(GROUPS_KEY, JSON.stringify(groups));
}

// ─── IndexedDB Image Storage ─────────────────────────────────────────────────

const IMAGE_DB_NAME = 'anatomy-images';
const IMAGE_STORE_NAME = 'images';
const IMAGE_DB_VERSION = 1;

function openImageDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not available'));
      return;
    }
    const request = indexedDB.open(IMAGE_DB_NAME, IMAGE_DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(IMAGE_STORE_NAME)) {
        db.createObjectStore(IMAGE_STORE_NAME);
      }
    };
    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };
    request.onerror = (event) => {
      reject((event.target as IDBOpenDBRequest).error);
    };
  });
}

/** Stores an image Blob in IndexedDB, keyed by set ID. */
export async function saveImage(id: string, blob: Blob): Promise<void> {
  try {
    const db = await openImageDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(IMAGE_STORE_NAME, 'readwrite');
      const store = tx.objectStore(IMAGE_STORE_NAME);
      const request = store.put(blob, id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
      tx.oncomplete = () => db.close();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('Failed to save image to IndexedDB:', err);
    throw err;
  }
}

/** Retrieves the image for a set from IndexedDB and returns it as a data URL, or null. */
export async function getImage(id: string): Promise<string | null> {
  try {
    const db = await openImageDB();
    const blob: Blob | undefined = await new Promise((resolve, reject) => {
      const tx = db.transaction(IMAGE_STORE_NAME, 'readonly');
      const store = tx.objectStore(IMAGE_STORE_NAME);
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      tx.oncomplete = () => db.close();
    });
    if (!blob) return null;
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/** Removes the image for a set from IndexedDB. */
export async function deleteImage(id: string): Promise<void> {
  try {
    const db = await openImageDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(IMAGE_STORE_NAME, 'readwrite');
      const store = tx.objectStore(IMAGE_STORE_NAME);
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
      tx.oncomplete = () => db.close();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('Failed to delete image from IndexedDB:', err);
  }
}

// ─── Export / Import ─────────────────────────────────────────────────────────

export async function exportData(): Promise<ExportData> {
  const sets = getSets();
  const setsWithImages = await Promise.all(
    sets.map(async (set) => {
      // Prefer in-memory image (legacy localStorage sets still have it),
      // then fall back to IndexedDB.
      const image = set.image || (await getImage(set.id)) || '';
      return { ...set, image };
    })
  );
  return {
    version: 1,
    exportedAt: Date.now(),
    sets: setsWithImages,
    groups: getGroups(),
  };
}

export async function importData(
  data: ExportData,
  mode: 'merge' | 'replace' = 'merge'
): Promise<void> {
  const incomingSets = Array.isArray(data.sets) ? data.sets : [];
  const incomingGroups = Array.isArray(data.groups) ? data.groups : [];

  // Save images to IndexedDB and strip them from sets before writing to localStorage.
  const setsToStore: PracticeSet[] = await Promise.all(
    incomingSets.map(async (set) => {
      if (set.image) {
        try {
          const blob = await fetch(set.image).then((r) => r.blob());
          await saveImage(set.id, blob);
        } catch (err) {
          console.warn(`Failed to import image for set ${set.id}:`, err);
        }
      }
      return { ...set, image: '' };
    })
  );

  if (mode === 'replace') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(setsToStore));
    localStorage.setItem(GROUPS_KEY, JSON.stringify(incomingGroups));
    return;
  }

  // Merge: upsert by id
  const mergedSets = getSets();
  for (const set of setsToStore) {
    const idx = mergedSets.findIndex((s) => s.id === set.id);
    if (idx >= 0) {
      mergedSets[idx] = set;
    } else {
      mergedSets.push(set);
    }
  }

  const mergedGroups = getGroups();
  for (const group of incomingGroups) {
    const idx = mergedGroups.findIndex((g) => g.id === group.id);
    if (idx >= 0) {
      mergedGroups[idx] = group;
    } else {
      mergedGroups.push(group);
    }
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(mergedSets));
  localStorage.setItem(GROUPS_KEY, JSON.stringify(mergedGroups));
}

// ─── Utilities ───────────────────────────────────────────────────────────────

export function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function shuffleArray<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
