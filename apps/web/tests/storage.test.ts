import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type StorageName = 'localStorage' | 'sessionStorage';

const NAMES: readonly StorageName[] = ['localStorage', 'sessionStorage'];

function denied(): never {
  throw new DOMException('The operation is insecure.', 'SecurityError');
}

/** A storage whose every read or write may throw, as some browsers do in private modes. */
function fakeStorage(refuse: { read?: boolean; write?: boolean } = {}) {
  const values = new Map<string, string>();
  return {
    values,
    getItem: (key: string) => (refuse.read === true ? denied() : (values.get(key) ?? null)),
    setItem: (key: string, value: string) => {
      if (refuse.write === true) {
        denied();
      }
      values.set(key, value);
    },
    removeItem: (key: string) => {
      if (refuse.write === true) {
        denied();
      }
      values.delete(key);
    },
  };
}

/** Puts a storage on the global object, or a property whose very getter throws. */
function install(name: StorageName, storage: ReturnType<typeof fakeStorage> | 'getter-throws') {
  Object.defineProperty(globalThis, name, {
    configurable: true,
    get: () => (storage === 'getter-throws' ? denied() : storage),
  });
}

beforeEach(() => {
  vi.resetModules();
  vi.stubGlobal('document', { documentElement: { lang: '', dataset: {} } });
});

afterEach(() => {
  vi.unstubAllGlobals();
  for (const name of NAMES) {
    Reflect.deleteProperty(globalThis, name);
  }
});

describe('the one safe way to the browser storage', () => {
  it('gives no storage where there is none, or where reaching it throws', async () => {
    const { safeStorage } = await import('../src/app/storage.ts');
    expect(safeStorage('localStorage')).toBeNull();
    install('sessionStorage', 'getter-throws');
    expect(safeStorage('sessionStorage')).toBeNull();
  });

  it('turns refused reads into nothing and refused writes into false', async () => {
    const { guardStorage } = await import('../src/app/storage.ts');
    const reading = guardStorage(fakeStorage({ read: true }));
    expect(reading.getItem('key')).toBeNull();
    const writing = guardStorage(fakeStorage({ write: true }));
    expect(writing.setItem('key', 'value')).toBe(false);
    expect(writing.removeItem('key')).toBe(false);
    const working = guardStorage(fakeStorage());
    expect(working.setItem('key', 'value')).toBe(true);
    expect(working.getItem('key')).toBe('value');
  });
});

describe('preferences without storage', () => {
  const cases = {
    'the storage property throws': 'getter-throws',
    'reading throws': fakeStorage({ read: true }),
    'writing throws': fakeStorage({ write: true }),
  } as const;

  for (const [name, storage] of Object.entries(cases)) {
    it(`load and hold for the visit when ${name}`, async () => {
      install('localStorage', storage);
      const preferences = await import('../src/app/preferences.ts');
      expect(preferences.readPreferences().regionChosen).toBe(false);
      preferences.updatePreferences({ region: 'uk', language: 'es', theme: 'dark' });
      expect(preferences.readPreferences()).toMatchObject({
        region: 'uk',
        regionChosen: true,
        language: 'es',
        theme: 'dark',
      });
      expect(document.documentElement.lang).toBe('es');
    });
  }

  it('are kept where the browser allows it', async () => {
    const storage = fakeStorage();
    install('localStorage', storage);
    const preferences = await import('../src/app/preferences.ts');
    preferences.updatePreferences({ region: 'eu' });
    expect(JSON.parse(storage.values.get('rewire.preferences') ?? '{}')).toMatchObject({
      region: 'eu',
      regionChosen: true,
    });
  });
});

describe('the opening without storage', () => {
  it('does not play when the session storage property throws', async () => {
    install('sessionStorage', 'getter-throws');
    vi.stubGlobal('window', { matchMedia: () => ({ matches: false }) });
    const opening = await import('../src/features/home/intro/once.ts');
    opening.decideOpening(true);
    expect(opening.openingPending()).toBe(false);
  });
});
