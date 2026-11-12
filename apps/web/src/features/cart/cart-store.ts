import type { Region } from '@rewire/contracts';
import { z } from 'zod';

import type { SafeStorage } from '../../app/storage.ts';

/** The most courses one order can hold. */
export const CART_LIMIT = 10;

export const CART_KEY = 'rewire.cart';

/** The ids of the courses in the cart, per region, in the order they were added. */
export type CartContents = Readonly<Record<Region, readonly string[]>>;

const EMPTY: CartContents = { eu: [], us: [], uk: [] };

const storedIds = z.array(z.string().min(1).max(80)).catch([]);
const storedCart = z.record(z.string(), z.unknown()).catch({});

/** Each id once, in its first place, up to the limit. */
function tidy(ids: readonly string[]): readonly string[] {
  return [...new Set(ids)].slice(0, CART_LIMIT);
}

/** Reads a stored cart, keeping only what is still valid. */
export function parseCart(stored: string | null): CartContents {
  if (stored === null) {
    return EMPTY;
  }
  let json: unknown;
  try {
    json = JSON.parse(stored);
  } catch {
    return EMPTY;
  }
  const record = storedCart.parse(json);
  const read = (region: Region) => tidy(storedIds.parse(record[region]));
  return { eu: read('eu'), us: read('us'), uk: read('uk') };
}

/** The cart with one more course, unless it is already there or the cart is full. */
export function withCourse(ids: readonly string[], courseId: string): readonly string[] {
  if (ids.includes(courseId) || ids.length >= CART_LIMIT) {
    return ids;
  }
  return [...ids, courseId];
}

/** The cart without the given courses. */
export function withoutCourses(
  ids: readonly string[],
  removed: readonly string[],
): readonly string[] {
  return ids.filter((id) => !removed.includes(id));
}

export interface CartStore {
  readonly read: () => CartContents;
  readonly subscribe: (listener: () => void) => () => void;
  readonly add: (region: Region, courseId: string) => void;
  readonly remove: (region: Region, courseIds: readonly string[]) => void;
}

/**
 * The cart, kept in the given storage when there is one. With the storage refused, the cart
 * still works for the visit, in memory.
 */
export function createCartStore(storage: SafeStorage | null): CartStore {
  let contents = parseCart(storage?.getItem(CART_KEY) ?? null);
  const listeners = new Set<() => void>();
  const change = (region: Region, ids: readonly string[]) => {
    if (ids === contents[region]) {
      return;
    }
    contents = { ...contents, [region]: ids };
    storage?.setItem(CART_KEY, JSON.stringify(contents));
    listeners.forEach((listener) => {
      listener();
    });
  };
  return {
    read: () => contents,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    add: (region, courseId) => {
      change(region, withCourse(contents[region], courseId));
    },
    remove: (region, courseIds) => {
      const left = withoutCourses(contents[region], courseIds);
      change(region, left.length === contents[region].length ? contents[region] : left);
    },
  };
}
