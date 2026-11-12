/**
 * Orders two codes by their UTF-16 code units. Unlike `localeCompare`, the result does not
 * depend on the language of the machine, so every machine sorts codes the same way.
 */
// Copied in the engine on purpose: the engine imports no code from `data`.
export function compareCodes(a: string, b: string): number {
  if (a < b) {
    return -1;
  }
  return a > b ? 1 : 0;
}
