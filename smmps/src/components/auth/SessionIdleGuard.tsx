"use client";

import { useEffect, useRef } from "react";
import {
  authPortalHeaders,
  writeTabAuthPortal,
  type AuthPortal,
} from "@/lib/auth-portal";

/** Idle timeout for Company Admin / Super Admin dashboards */
export const ADMIN_IDLE_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes
const ACTIVITY_THROTTLE_MS = 1000;
const CHECK_INTERVAL_MS = 15_000;
const TOUCH_INTERVAL_MS = 60_000;

type SessionIdleGuardProps = {
  /** Where to send the user after idle logout */
  loginHref?: string;
  /** Only this portal session is touched or signed out */
  portal?: AuthPortal;
};

/**
 * Logs out Company Admins / Super Admins after 10 minutes of no interaction.
 * Any mouse, keyboard, scroll, or touch activity resets the timer.
 * Also pings the server so the HTTPS session stays bound to this browser.
 */
export function SessionIdleGuard({
  loginHref = "/login",
  portal,
}: SessionIdleGuardProps) {
  const lastActiveRef = useRef(0);
  const lastBumpRef = useRef(0);
  const loggingOutRef = useRef(false);

  useEffect(() => {
    if (portal) writeTabAuthPortal(portal);
    lastActiveRef.current = Date.now();

    function bump() {
      const now = Date.now();
      if (now - lastBumpRef.current < ACTIVITY_THROTTLE_MS) return;
      lastBumpRef.current = now;
      lastActiveRef.current = now;
    }

    async function logoutForIdle() {
      if (loggingOutRef.current) return;
      loggingOutRef.current = true;
      try {
        await fetch("/api/auth/logout", {
          method: "POST",
          credentials: "include",
          headers: authPortalHeaders(portal),
        });
      } catch {
        // still redirect
      }
      const url = new URL(loginHref, window.location.origin);
      url.searchParams.set("reason", "idle");
      const here = `${window.location.pathname}${window.location.search}`;
      if (here.startsWith("/") && !here.startsWith("//")) {
        url.searchParams.set("next", here);
      }
      window.location.replace(url.pathname + url.search);
    }

    function checkIdle() {
      if (Date.now() - lastActiveRef.current >= ADMIN_IDLE_TIMEOUT_MS) {
        void logoutForIdle();
      }
    }

    function onVisibility() {
      if (document.visibilityState === "visible") {
        checkIdle();
        bump();
      }
    }

    async function touchServerSession() {
      if (Date.now() - lastActiveRef.current >= ADMIN_IDLE_TIMEOUT_MS) return;
      try {
        const res = await fetch("/api/auth/session/touch", {
          method: "POST",
          credentials: "include",
          headers: authPortalHeaders(portal),
        });
        if (res.status === 401) {
          if (!loginHref.includes("mode=super-admin") && !loginHref.includes("mode=admin")) {
            return;
          }
          // First paint after company-admin login can 401 once — do not bounce them.
          if (Date.now() - lastActiveRef.current < 8000) return;
          void logoutForIdle();
        }
      } catch {
        // ignore network blips
      }
    }

    const events: Array<keyof WindowEventMap> = [
      "mousedown",
      "mousemove",
      "keydown",
      "scroll",
      "touchstart",
      "click",
      "wheel",
    ];

    for (const event of events) {
      window.addEventListener(event, bump, { passive: true, capture: true });
    }
    document.addEventListener("visibilitychange", onVisibility);
    const intervalId = window.setInterval(checkIdle, CHECK_INTERVAL_MS);
    const touchId = window.setInterval(touchServerSession, TOUCH_INTERVAL_MS);
    void touchServerSession();

    return () => {
      for (const event of events) {
        window.removeEventListener(event, bump, { capture: true });
      }
      document.removeEventListener("visibilitychange", onVisibility);
      window.clearInterval(intervalId);
      window.clearInterval(touchId);
    };
  }, [loginHref, portal]);

  return null;
}
