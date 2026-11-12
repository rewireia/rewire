import type { Certificate } from '@rewire/contracts';
import { MutationObserver, QueryClient, QueryObserver } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';

import { claimCertificateOptions } from '../src/api/learning-queries.ts';
import { certificateDestination } from '../src/features/learn/certificate-destination.ts';

const CERTIFICATE: Certificate = {
  id: 'RWR-7XPQ-6HJD',
  learnerName: 'Ada Lovelace',
  courseTitle: 'AI foundations',
  hours: 6,
  issuedOn: '2026-11-11',
  demo: true,
};

/** Lets pending promises and timers of the query client run. */
function settle(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 5));
}

/** The course's content and the session, both watched, each answering only when told to. */
function learnerQueries(client: QueryClient) {
  const answers = new Map<string, () => void>();
  let claimed = false;
  for (const key of ['content', 'session']) {
    client.setQueryData([key], { certificateId: null });
    const observer = new QueryObserver(client, {
      queryKey: [key],
      queryFn: () =>
        new Promise<{ certificateId: string | null }>((resolve) => {
          answers.set(key, () => {
            resolve({ certificateId: claimed ? CERTIFICATE.id : null });
          });
        }),
    });
    observer.subscribe(() => undefined);
  }
  return {
    answers,
    claim: vi.fn(() => {
      claimed = true;
      return Promise.resolve(CERTIFICATE);
    }),
  };
}

describe('claiming a certificate', () => {
  for (const order of [
    ['content', 'session'],
    ['session', 'content'],
  ]) {
    it(`goes to it once, when ${order.join(' then ')} come back after the claim`, async () => {
      const client = new QueryClient();
      const { answers, claim } = learnerQueries(client);
      const onClaimed = vi.fn();
      const form = new MutationObserver(client, claimCertificateOptions(client, claim, onClaimed));
      const unmount = form.subscribe(() => undefined);
      form.mutate({ learnerName: 'Ada Lovelace' }).catch(() => undefined);
      await settle();
      // The certificate exists: the learner is sent to it before anything is read again.
      expect(onClaimed).toHaveBeenCalledExactlyOnceWith(CERTIFICATE);
      expect(form.getCurrentResult().isPending).toBe(true);
      for (const key of order) {
        answers.get(key)?.();
        await settle();
        // The content now names the certificate: the course swaps the form for its link.
        if (key === 'content') {
          unmount();
        }
      }
      expect(onClaimed).toHaveBeenCalledOnce();
      expect(claim).toHaveBeenCalledOnce();
    });
  }
});

describe('where the learner goes once the certificate exists', () => {
  it('to the certificate, from the course they claimed it on', () => {
    expect(certificateDestination('RWR-1', '/learn/ai', '/learn/ai')).toBe('/certificates/RWR-1');
  });

  it('nowhere, once they moved on to another page', () => {
    expect(certificateDestination('RWR-1', '/learn/ai', '/dashboard')).toBeNull();
  });
});
