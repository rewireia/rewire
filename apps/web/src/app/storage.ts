/** The two storages of the browser the site uses. */
type StorageName = 'localStorage' | 'sessionStorage';

/** A storage that never throws: refused reads give `null` and refused writes `false`. */
export interface SafeStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): boolean;
  removeItem(key: string): boolean;
}

/** Wraps a storage so that a browser refusing a read or a write never breaks the page. */
export function guardStorage(storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>) {
  const safe: SafeStorage = {
    getItem: (key) => {
      try {
        return storage.getItem(key);
      } catch {
        return null;
      }
    },
    setItem: (key, value) => {
      try {
        storage.setItem(key, value);
        return true;
      } catch {
        return false;
      }
    },
    removeItem: (key) => {
      try {
        storage.removeItem(key);
        return true;
      } catch {
        return false;
      }
    },
  };
  return safe;
}

/**
 * The only way the site reaches the browser's storage. Some browsers throw on the mere access to
 * the property (private modes, blocked cookies, sandboxed frames): then there is no storage, and
 * whoever asked keeps its state in memory for the visit.
 */
export function safeStorage(name: StorageName): SafeStorage | null {
  try {
    return name in globalThis ? guardStorage(globalThis[name]) : null;
  } catch {
    return null;
  }
}
