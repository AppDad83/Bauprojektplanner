import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken, AUTH_COOKIE_NAME } from '@/lib/auth';

export function middleware(request: NextRequest) {
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const authSecret = process.env.AUTH_SECRET;

  // Wenn AUTH_SECRET nicht konfiguriert ist, Auth überspringen (für Entwicklung)
  if (!authSecret) {
    console.warn('AUTH_SECRET nicht konfiguriert - Auth deaktiviert');
    return NextResponse.next();
  }

  // Prüfe Token
  const isValidToken = token && verifyToken(token, authSecret);

  if (!isValidToken) {
    // Redirect zu Login
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api/auth (login/logout endpoint)
     * - login (login page)
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, icon.svg, manifest.json (static assets)
     */
    '/((?!api/auth|login|_next/static|_next/image|favicon.ico|icon.svg|manifest.json|beispiel-projekt.json).*)',
  ],
};
