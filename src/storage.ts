// Simple storage placeholder
export async function storagePut(key: string, value: any): Promise<void> {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn('[Storage] Failed to save:', e);
  }
}

export async function storageGet<T>(key: string): Promise<T | null> {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : null;
  } catch (e) {
    console.warn('[Storage] Failed to load:', e);
    return null;
  }
}

export async function storageDelete(key: string): Promise<void> {
  try {
    localStorage.removeItem(key);
  } catch (e) {
    console.warn('[Storage] Failed to delete:', e);
  }
}
