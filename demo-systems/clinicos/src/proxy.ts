import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  // Next prefixes this app's basePath to every matcher, so the catch-all alone
  // becomes `<basePath>/((?!api|…).*)`: it insists on a slash after the mount
  // and therefore never matched the mount root itself, which answered 404
  // instead of being rewritten to its locale (it is also the PWA start_url).
  // A matcher of exactly "/" is expanded to the index forms while keeping the
  // basePath, so the root must be listed next to the catch-all.
  matcher: ["/", "/((?!api|_next|_vercel|.*\\..*).*)"],
};