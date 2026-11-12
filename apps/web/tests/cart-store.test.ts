import { describe, expect, it } from 'vitest';

import { guardStorage } from '../src/app/storage.ts';
import {
  CART_KEY,
  CART_LIMIT,
  createCartStore,
  parseCart,
  withCourse,
  withoutCourses,
} from '../src/features/cart/cart-store.ts';

function memoryStorage(refuse = false) {
  const values = new Map<string, string>();
  const denied = () => {
    throw new DOMException('The operation is insecure.', 'SecurityError');
  };
  return {
    values,
    storage: guardStorage({
      getItem: (key) => (refuse ? denied() : (values.get(key) ?? null)),
      setItem: (key, value) => {
        if (refuse) denied();
        values.set(key, value);
      },
      removeItem: (key) => {
        if (refuse) denied();
        values.delete(key);
      },
    }),
  };
}

const ids = (count: number) => Array.from({ length: count }, (_, index) => `course-${index}`);

describe('parseCart', () => {
  it('reads an empty cart from nothing or from unreadable text', () => {
    expect(parseCart(null)).toEqual({ eu: [], us: [], uk: [] });
    expect(parseCart('{not json')).toEqual({ eu: [], us: [], uk: [] });
    expect(parseCart('"a string"')).toEqual({ eu: [], us: [], uk: [] });
  });

  it('keeps valid ids once each, up to the limit, and drops what is not valid', () => {
    const stored = JSON.stringify({ eu: ['a', 'a', 'b', 7, ''], us: 'x', uk: ids(14) });
    const cart = parseCart(stored);
    expect(cart.eu).toEqual([]);
    expect(cart.us).toEqual([]);
    expect(cart.uk).toHaveLength(CART_LIMIT);
    expect(parseCart(JSON.stringify({ eu: ['a', 'a', 'b'] })).eu).toEqual(['a', 'b']);
  });
});

describe('withCourse and withoutCourses', () => {
  it('adds a course once and never beyond the limit', () => {
    expect(withCourse(['a'], 'b')).toEqual(['a', 'b']);
    const same = ['a'];
    expect(withCourse(same, 'a')).toBe(same);
    const full = ids(CART_LIMIT);
    expect(withCourse(full, 'one-more')).toBe(full);
  });

  it('removes only the given courses', () => {
    expect(withoutCourses(['a', 'b', 'c'], ['a', 'c'])).toEqual(['b']);
  });
});

describe('createCartStore', () => {
  it('keeps each region apart and saves every change', () => {
    const { storage, values } = memoryStorage();
    const store = createCartStore(storage);
    let changes = 0;
    store.subscribe(() => {
      changes += 1;
    });
    store.add('us', 'a');
    store.add('us', 'b');
    store.add('eu', 'c');
    store.add('us', 'a');
    expect(store.read()).toEqual({ eu: ['c'], us: ['a', 'b'], uk: [] });
    expect(changes).toBe(3);
    store.remove('us', ['a']);
    expect(store.read().us).toEqual(['b']);
    store.remove('us', ['missing']);
    expect(changes).toBe(4);
    expect(parseCart(values.get(CART_KEY) ?? null)).toEqual(store.read());
    expect(createCartStore(storage).read()).toEqual(store.read());
  });

  it('works for the visit when the storage is refused or missing', () => {
    for (const storage of [memoryStorage(true).storage, null]) {
      const store = createCartStore(storage);
      store.add('uk', 'a');
      expect(store.read().uk).toEqual(['a']);
    }
  });
});
