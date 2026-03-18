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

// ─── Export / Import ─────────────────────────────────────────────────────────

export function exportData(): ExportData {
  return {
    version: 1,
    exportedAt: Date.now(),
    sets: getSets(),
    groups: getGroups(),
  };
}

export function importData(data: ExportData, mode: 'merge' | 'replace' = 'merge'): void {
  const incomingSets = Array.isArray(data.sets) ? data.sets : [];
  const incomingGroups = Array.isArray(data.groups) ? data.groups : [];

  if (mode === 'replace') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(incomingSets));
    localStorage.setItem(GROUPS_KEY, JSON.stringify(incomingGroups));
    return;
  }

  // Merge: upsert by id
  const mergedSets = getSets();
  for (const set of incomingSets) {
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
