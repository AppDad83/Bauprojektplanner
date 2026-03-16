// Token-Gültigkeit: 24 Stunden
const TOKEN_VALIDITY_MS = 24 * 60 * 60 * 1000;

/**
 * Einfache Hash-Funktion für Token-Signierung
 * Verwendet einen simplen aber ausreichenden Ansatz für diesen Anwendungsfall
 */
function simpleHash(message: string, secret: string): string {
  let hash = 0;
  const combined = message + secret;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  // Erweitere den Hash für mehr Sicherheit
  const hash2 = Math.abs(hash).toString(16);
  const hash3 = Math.abs(hash * 31).toString(16);
  const hash4 = Math.abs(hash * 37).toString(16);
  return `${hash2}${hash3}${hash4}`.padEnd(32, '0');
}

/**
 * Erstellt ein signiertes Auth-Token
 * Format: timestamp.signature
 */
export function createToken(secret: string): string {
  const validUntil = Date.now() + TOKEN_VALIDITY_MS;
  const signature = simpleHash(validUntil.toString(), secret);
  return `${validUntil}.${signature}`;
}

/**
 * Validiert ein Auth-Token
 */
export function verifyToken(token: string, secret: string): boolean {
  try {
    const [timestampStr, signature] = token.split('.');
    if (!timestampStr || !signature) return false;

    const timestamp = parseInt(timestampStr, 10);
    if (isNaN(timestamp)) return false;

    // Prüfe ob Token abgelaufen ist
    if (Date.now() > timestamp) return false;

    // Prüfe Signatur
    const expectedSignature = simpleHash(timestampStr, secret);

    return signature === expectedSignature;
  } catch {
    return false;
  }
}

/**
 * Cookie-Optionen für Auth-Token
 */
export const AUTH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 60 * 60 * 24, // 24 Stunden in Sekunden
  path: '/',
};

export const AUTH_COOKIE_NAME = 'auth-token';
