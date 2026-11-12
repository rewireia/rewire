import { createVerify } from 'node:crypto';
import { crc32 } from 'node:zlib';

/** PayPal serves its signing certificates only from these hosts. */
const CERTIFICATE_HOSTS = new Set(['api.paypal.com', 'api.sandbox.paypal.com']);

/** Downloads a certificate. Passed in so the verifier can be tested without the network. */
export type CertificateLoader = (url: string) => Promise<string>;

/** The headers PayPal signs a webhook with. */
export interface WebhookSignature {
  readonly transmissionId: string;
  readonly transmissionTime: string;
  readonly certificateUrl: string;
  /** The signature, in base64. */
  readonly signature: string;
}

/** Reads the signature headers of a webhook, or `undefined` if any is missing. */
export function signatureOf(headers: Headers): WebhookSignature | undefined {
  const transmissionId = headers.get('paypal-transmission-id');
  const transmissionTime = headers.get('paypal-transmission-time');
  const certificateUrl = headers.get('paypal-cert-url');
  const signature = headers.get('paypal-transmission-sig');
  return transmissionId === null ||
    transmissionTime === null ||
    certificateUrl === null ||
    signature === null
    ? undefined
    : { transmissionId, transmissionTime, certificateUrl, signature };
}

/**
 * Checks that a webhook was signed by PayPal for our subscription.
 *
 * PayPal signs `transmissionId|transmissionTime|webhookId|crc32(body)` with the key of a
 * certificate it publishes. The body must be the bytes received: parsing and writing the
 * JSON again would change them and break the signature.
 */
export async function isSignedByPayPal(
  body: Uint8Array,
  signature: WebhookSignature,
  webhookId: string,
  loadCertificate: CertificateLoader,
): Promise<boolean> {
  if (!isPayPalCertificateUrl(signature.certificateUrl)) {
    return false;
  }
  const message = [
    signature.transmissionId,
    signature.transmissionTime,
    webhookId,
    crc32(body),
  ].join('|');
  try {
    const certificate = await loadCertificate(signature.certificateUrl);
    return createVerify('SHA256')
      .update(message)
      .verify(certificate, signature.signature, 'base64');
  } catch {
    // An unreadable certificate or a malformed signature is a failed verification.
    return false;
  }
}

function isPayPalCertificateUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && CERTIFICATE_HOSTS.has(parsed.hostname);
  } catch {
    return false;
  }
}

/** A loader that fetches each certificate once and keeps it for the life of the process. */
export function createCertificateLoader(): CertificateLoader {
  const certificates = new Map<string, Promise<string>>();
  return (url) => {
    let certificate = certificates.get(url);
    if (certificate === undefined) {
      certificate = fetch(url, { signal: AbortSignal.timeout(10_000) }).then((response) => {
        if (!response.ok) {
          throw new Error(`certificate request answered ${response.status}`);
        }
        return response.text();
      });
      certificates.set(url, certificate);
      // A failed download must not be remembered as the certificate.
      certificate.catch(() => certificates.delete(url));
    }
    return certificate;
  };
}
