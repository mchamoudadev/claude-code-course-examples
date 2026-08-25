/**
 * Proxy (Next 16's renamed `middleware`) — the central auth gate.
 *
 * Next 16 runs `proxy` on the Node.js runtime by default, so it can validate the
 * DB-backed session directly (`resolveSessionUser` → Mongo). It enforces auth for
 * the whole app:
 *   - Public: the landing `/`, `/sign-in`, `/sign-up`, `/api/auth/*`, and
 *     `/api/inngest` (which authenticates via its own request-signature check).
 *   - Everything else requires a valid session cookie: unauthenticated API calls
 *     get a 401; unauthenticated page loads redirect to `/sign-in?next=…`.
 *
 * Per the Next.js data-security guidance, treat this as the first line of
 * defense; the most sensitive route handlers ALSO re-check `getCurrentUser()`.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, resolveSessionUser } from "@/lib/auth/session";

const PUBLIC_PAGES = new Set<string>(["/", "/sign-in", "/sign-up"]);

function isPublicApi(pathname: string): boolean {
  return pathname.startsWith("/api/auth/") || pathname === "/api/inngest";
}

export async function proxy(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;
  const isApi = pathname.startsWith("/api/");
  const token = request.cookies.get(SESSION_COOKIE)?.value;

  // Public routes: allow, but bounce already-signed-in users off the auth screens.
  if (isApi ? isPublicApi(pathname) : PUBLIC_PAGES.has(pathname)) {
    if (pathname === "/sign-in" || pathname === "/sign-up") {
      const user = await resolveSessionUser(token);
      if (user) {
        const url = request.nextUrl.clone();
        url.pathname = "/dashboard";
        url.search = "";
        return NextResponse.redirect(url);
      }
    }
    return NextResponse.next();
  }

  // Protected routes: require a valid session.
  const user = await resolveSessionUser(token);
  if (user) return NextResponse.next();

  if (isApi) {
    return NextResponse.json(
      { error: { message: "Authentication required.", code: "unauthorized" } },
      { status: 401 },
    );
  }

  const url = request.nextUrl.clone();
  url.pathname = "/sign-in";
  url.search = `next=${encodeURIComponent(pathname)}`;
  return NextResponse.redirect(url);
}

export const config = {
  // Run on every route except Next internals and static asset files.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:png|jpe?g|gif|svg|ico|webp|avif|woff2?|ttf|css|js|map)$).*)",
  ],
};
