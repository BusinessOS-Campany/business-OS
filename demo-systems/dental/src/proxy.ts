import { NextResponse, type NextRequest } from "next/server";
import { decrypt, SESSION_COOKIE } from "@/lib/session";

/**
 * Answered before anyone has signed in. The browser reads the manifest to offer
 * the install and fetches the worker to enable it — both while unauthenticated,
 * so gating them here redirects to HTML and the install silently fails.
 */
const PUBLIC_PATHS = ["/login", "/manifest.webmanifest", "/sw.js"];

const isPublic = (pathname: string): boolean => PUBLIC_PATHS.includes(pathname);

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const isLogin = pathname === "/login";

  const session = await decrypt(request.cookies.get(SESSION_COOKIE)?.value);

  if (!session) {
    if (isPublic(pathname) || pathname === "/") {
      return NextResponse.next();
    }
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "";
    loginUrl.searchParams.set("next", pathname + search);
    return NextResponse.redirect(loginUrl);
  }

  if (isLogin) {
    const dashUrl = request.nextUrl.clone();
    dashUrl.pathname = "/dashboard";
    dashUrl.search = "";
    return NextResponse.redirect(dashUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:ico|png|jpg|jpeg|svg|webp|woff|woff2|ttf|otf|eot|mp4|ogg)).*)",
  ],
};