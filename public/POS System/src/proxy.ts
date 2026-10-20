import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/constants";

const PUBLIC_PATHS = ["/login", "/api/auth/login", "/api/auth/logout"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  if (!isPublic) {
    if (!token) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.search = "";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  if (pathname === "/login" && token) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Runs on everything except static files and Next.js internals
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|icons/|logo.svg).*)",
  ],
};