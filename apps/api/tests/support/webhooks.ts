import { createSign, generateKeyPairSync } from 'node:crypto';
import { crc32 } from 'node:zlib';

import type { WebhookSignature } from '../../src/modules/checkout/webhook-signature.ts';

const CERTIFICATE_URL = 'https://api.sandbox.paypal.com/v1/notifications/certs/CERT-TEST';

/**
 * A signing key that stands in for PayPal's. Node verifies with a public key as readily as
 * with a certificate, so the public key is what the fake certificate loader serves.
 */
export function createSigningKey() {
  const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const certificate = publicKey.export({ type: 'spki', format: 'pem' }).toString();
  return {
    certificate,
    /** Serves the key for PayPal's address only, as the real loader downloads it. */
    loadCertificate: (url: string) =>
      url === CERTIFICATE_URL
        ? Promise.resolve(certificate)
        : Promise.reject(new Error(`no certificate at ${url}`)),
    /** Signs a body the way PayPal does, for one webhook subscription. */
    sign(body: Uint8Array, webhookId: string): WebhookSignature {
      const transmissionId = 'transmission-1';
      const transmissionTime = '2026-11-11T09:00:00Z';
      const message = [transmissionId, transmissionTime, webhookId, crc32(body)].join('|');
      const signature = createSign('SHA256').update(message).sign(privateKey, 'base64');
      return { transmissionId, transmissionTime, certificateUrl: CERTIFICATE_URL, signature };
    },
  };
}

/** The headers PayPal sends a signature in. */
export function headersOf(signature: WebhookSignature): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'PayPal-Transmission-Id': signature.transmissionId,
    'PayPal-Transmission-Time': signature.transmissionTime,
    'PayPal-Cert-Url': signature.certificateUrl,
    'PayPal-Transmission-Sig': signature.signature,
  };
}
