"use client";

import { useEffect } from "react";
import { toast } from "sonner";

/**
 * Registers the service worker that backs PWA install + offline support.
 * `swUrl` is the app's own worker under its mount (e.g. /demo/dental/sw.js),
 * which scopes it to the demo instead of the platform's origin-wide /sw.js.
 * When a waiting service worker takes control after an update, reload once
 * so the tab runs the new build instead of a mix of old/new chunks.
 */
export function PwaRegister({ swUrl }: { swUrl: string }) {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    // Friendly message for any write operation attempted offline — the demo's
    // mutations need connectivity rather than queuing up for later.
    const onUnhandledRejection = (e: PromiseRejectionEvent) => {
      if (!navigator.onLine) {
        e.preventDefault();
        toast.error("لا يوجد اتصال — هذه العملية تحتاج إنترنت وستتاح عند عودته");
      }
    };
    window.addEventListener("unhandledrejection", onUnhandledRejection);

    const hadController = !!navigator.serviceWorker.controller;
    let reloaded = false;

    const onControllerChange = () => {
      if (hadController && !reloaded) {
        reloaded = true;
        window.location.reload();
      }
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);
    navigator.serviceWorker.register(swUrl).then((reg) => {
      reg.update().catch(() => {});
    }).catch(() => {});

    return () => {
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
    };
  }, [swUrl]);
  return null;
}
