import { randomBytes } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const LOCAL_SECRET_FILE = fileURLToPath(new URL('../../var/session-secret', import.meta.url));

/**
 * The secret that signs session cookies.
 *
 * Production must configure one. Elsewhere, a random secret is created on first start and
 * kept in a local file outside version control, so sessions survive a restart without any
 * set-up.
 */
export async function resolveSessionSecret(configured: string | undefined): Promise<string> {
  if (configured !== undefined) {
    return configured;
  }
  try {
    return await readFile(LOCAL_SECRET_FILE, 'utf8');
  } catch {
    const secret = randomBytes(32).toString('hex');
    await mkdir(path.dirname(LOCAL_SECRET_FILE), { recursive: true });
    await writeFile(LOCAL_SECRET_FILE, secret, { mode: 0o600 });
    return secret;
  }
}
