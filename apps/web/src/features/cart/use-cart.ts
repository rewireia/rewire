import type { Region } from '@rewire/contracts';
import { useSyncExternalStore } from 'react';

import { safeStorage } from '../../app/storage.ts';

import { CART_LIMIT, createCartStore } from './cart-store.ts';

const store = createCartStore(safeStorage('localStorage'));

/** The cart of a region, shared by the catalogue, the header and the cart page. */
export function useCart(region: Region) {
  const ids = useSyncExternalStore(store.subscribe, store.read)[region];
  return {
    ids,
    full: ids.length >= CART_LIMIT,
    has: (courseId: string) => ids.includes(courseId),
    add: (courseId: string) => {
      store.add(region, courseId);
    },
    remove: (courseIds: readonly string[]) => {
      store.remove(region, courseIds);
    },
  };
}
