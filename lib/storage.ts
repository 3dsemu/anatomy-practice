import { PracticeSet } from '@/types';

const STORAGE_KEY = 'anatomy_practice_sets';

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
  if (index >= 0) {
    sets[index] = set;
  } else {
    sets.push(set);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sets));
}

export function deleteSet(id: string): void {
  const sets = getSets().filter((s) => s.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sets));
}

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
