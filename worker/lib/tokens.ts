// Utility condivise per token opachi (sessioni, inviti): generazione casuale e
// hashing SHA-256 tramite Web Crypto.

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Token opaco casuale (256 bit) in esadecimale. */
export function generateToken(): string {
  return toHex(crypto.getRandomValues(new Uint8Array(32)));
}

/** Hash SHA-256 (esadecimale) del token: è ciò che viene memorizzato nel DB. */
export async function hashToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(token),
  );
  return toHex(new Uint8Array(digest));
}
