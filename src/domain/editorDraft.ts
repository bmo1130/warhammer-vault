// Temporary recovery in this tab; confirmed records stay in IndexedDB.
const prefix = 'warhammer-vault:draft:';
export function readEditorDraft(key: string): unknown {
  try { return JSON.parse(sessionStorage.getItem(prefix + key) ?? 'null'); } catch { return null; }
}
export function writeEditorDraft(key: string, value: unknown): boolean {
  try { sessionStorage.setItem(prefix + key, JSON.stringify(value)); return true; } catch { return false; }
}
export function clearEditorDraft(key: string) {
  try { sessionStorage.removeItem(prefix + key); } catch { /* Confirmed data is already committed. */ }
}
export function clearAllEditorDrafts() {
  try {
    const keys = Array.from({ length: sessionStorage.length }, (_, index) => sessionStorage.key(index));
    for (const key of keys) if (key?.startsWith(prefix)) sessionStorage.removeItem(key);
  } catch { /* Temporary storage may be disabled. */ }
}
export function isTextRecord(value: unknown, keys: readonly string[]): value is Record<string, string> {
  return typeof value === 'object' && value !== null && !Array.isArray(value) &&
    keys.every(key => typeof (value as Record<string, unknown>)[key] === 'string');
}
