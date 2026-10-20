import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/api")) {
    const response = NextResponse.next();
    response.headers.set("Access-Control-Allow-Origin", "*");
    response.headers.set("Access-Control-Allow-Methods", "GET, POST, PATCH, PUT, DELETE, OPTIONS");
    response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    if (req.method === "OPTIONS") {
      return new NextResponse(null, { status: 204, headers: response.headers });
    }
    return response;
  }

  if (pathname === "/admin/login" || pathname === "/login") return;
  if (!req.auth?.user) {
    const url = new URL("/login", req.url);
    url.searchParams.set("callbackUrl", pathname);
    return Response.redirect(url);
  }
});

export const config = {
  matcher: ["/admin/:path*", "/api/:path*"],
};
