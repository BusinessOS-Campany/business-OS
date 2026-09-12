import { installSerwist } from "@serwist/sw";

installSerwist({
  // @ts-expect-error __SW_MANIFEST injected by @serwist/next
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
});
