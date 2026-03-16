import { NextRequest, NextResponse } from 'next/server';
import { createToken, AUTH_COOKIE_NAME, AUTH_COOKIE_OPTIONS } from '@/lib/auth';

/**
 * POST /api/auth - Login
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { password } = body;

    const sitePassword = process.env.SITE_PASSWORD;
    const authSecret = process.env.AUTH_SECRET;

    if (!sitePassword || !authSecret) {
      console.error('AUTH_SECRET oder SITE_PASSWORD nicht konfiguriert');
      return NextResponse.json(
        { error: 'Server-Konfigurationsfehler' },
        { status: 500 }
      );
    }

    if (password !== sitePassword) {
      return NextResponse.json(
        { error: 'Falsches Passwort' },
        { status: 401 }
      );
    }

    // Erstelle Token und setze Cookie
    const token = createToken(authSecret);
    const response = NextResponse.json({ success: true });

    response.cookies.set(AUTH_COOKIE_NAME, token, AUTH_COOKIE_OPTIONS);

    return response;
  } catch (error) {
    console.error('Login-Fehler:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
    return NextResponse.json(
      { error: `Ein Fehler ist aufgetreten: ${errorMessage}` },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/auth - Logout
 */
export async function DELETE() {
  const response = NextResponse.json({ success: true });

  // Cookie löschen durch Setzen mit maxAge: 0
  response.cookies.set(AUTH_COOKIE_NAME, '', {
    ...AUTH_COOKIE_OPTIONS,
    maxAge: 0,
  });

  return response;
}
