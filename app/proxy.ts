import { NextResponse, type NextRequest } from "next/server";

// Same default as app/docs/FRONTEND_POSTMAN_SIMULATION_GUIDE.md.
const SESSION_COOKIE = process.env.SESSION_COOKIE_NAME || "city_defense_session";

/**
 * Sends players without a session cookie from /play to /login. The home screen (/) stays open and
 * shows a Play button instead. This is only an optimistic check: it can't tell
 * a revoked or expired session apart, so the API routes still verify every request, and a stale
 * cookie means the page's first API call answers 401 and sends the player to /login.
 *
 * /login and /register deliberately don't redirect logged-in players away: with a stale cookie
 * that would bounce between /login and / forever.
 */
export function proxy(request: NextRequest) {
  if (!request.cookies.has(SESSION_COOKIE)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  // Pages that need a player. Not / (public home), /api (it answers 401 itself), /login, /register or static files.
  matcher: ["/play/:path*"],
};
