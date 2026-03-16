import { createHmac } from 'crypto';

// Token-Gültigkeit: 24 Stunden
const TOKEN_VALIDITY_MS = 24 * 60 * 60 * 1000;

/**
 * Erstellt ein signiertes Auth-Token
 * Format: timestamp.signature
 */
export function createToken(secret: string): string {
  const validUntil = Date.now() + TOKEN_VALIDITY_MS;
  const signature = createHmac('sha256', secret)
    .update(validUntil.toString())
    .digest('hex');
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
    const expectedSignature = createHmac('sha256', secret)
      .update(timestampStr)
      .digest('hex');

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
