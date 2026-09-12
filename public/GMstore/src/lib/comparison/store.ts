const STORAGE_KEY = "comparison";
const MAX_ITEMS = 4;

export function getComparison(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function setComparison(ids: string[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    window.dispatchEvent(new CustomEvent("comparisonUpdated"));
  } catch { /* noop */ }
}

export function addToComparison(id: string): boolean {
  const current = getComparison();
  if (current.includes(id)) return true;
  if (current.length >= MAX_ITEMS) return false;
  setComparison([...current, id]);
  return true;
}

export function removeFromComparison(id: string) {
  setComparison(getComparison().filter((i) => i !== id));
}

export function clearComparison() {
  setComparison([]);
}

export function isInComparison(id: string): boolean {
  return getComparison().includes(id);
}

export function comparisonCount(): number {
  return getComparison().length;
}
