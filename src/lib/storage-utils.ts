type StorageKind = "localStorage" | "sessionStorage";

function getStorage(kind: StorageKind) {
  if (typeof window === "undefined") {
    return null;
  }

  return kind === "localStorage" ? window.localStorage : window.sessionStorage;
}

export function readStorage<T>(key: string, fallback: T, kind: StorageKind = "localStorage"): T {
  const storage = getStorage(kind);
  if (!storage) return fallback;

  try {
    const raw = storage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    storage.removeItem(key);
    return fallback;
  }
}

export function writeStorage<T>(key: string, value: T, kind: StorageKind = "localStorage") {
  const storage = getStorage(kind);
  if (!storage) return false;

  try {
    storage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function removeStorage(key: string, kind: StorageKind = "localStorage") {
  const storage = getStorage(kind);
  if (!storage) return;

  try {
    storage.removeItem(key);
  } catch {
    // Ignore storage cleanup failures.
  }
}

export function clearStorageKeys(keys: string[], kind: StorageKind = "localStorage") {
  keys.forEach((key) => removeStorage(key, kind));
}

export function estimateStorageUsage(keys: string[], kind: StorageKind = "localStorage") {
  const storage = getStorage(kind);
  if (!storage) return 0;

  return keys.reduce((sum, key) => sum + (storage.getItem(key)?.length ?? 0), 0);
}
