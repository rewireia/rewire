import type { Region, WalletPaymentRequest } from '@rewire/contracts';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { refreshLearnerData } from './commerce-queries.ts';
import { api } from './instance.ts';

/** The movements of the wallet, kept under the wallet's key so every refresh of it reloads them. */
export function useWalletMovements(region: Region, enabled = true) {
  return useQuery({
    queryKey: ['wallet', 'movements', region],
    queryFn: ({ signal }) => api.walletMovements(region, signal),
    enabled,
  });
}

/** Pays for courses from the balance; then everything the learner owns is read again. */
export function usePayFromWallet() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: WalletPaymentRequest) => api.payFromWallet(body),
    onSettled: () => refreshLearnerData(client),
  });
}
