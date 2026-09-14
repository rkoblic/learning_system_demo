const STORAGE_KEY = 'learning-system-demo:configuration:v1';

export function loadConfiguration(storage = globalThis.localStorage) {
  try {
    const stored = storage?.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

export function saveConfiguration(configuration, storage = globalThis.localStorage) {
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify(configuration));
  } catch {
    // Persistence is a convenience only; keep the app usable if storage is unavailable.
  }
}

export function clearConfiguration(storage = globalThis.localStorage) {
  try {
    storage?.removeItem(STORAGE_KEY);
  } catch {
    // Persistence is a convenience only; keep the app usable if storage is unavailable.
  }
}
