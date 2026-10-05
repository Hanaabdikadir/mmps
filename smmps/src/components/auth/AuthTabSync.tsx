"use client";

import { useEffect } from "react";
import {
  AUTH_TAB_BEATS_KEY,
  AUTH_TAB_COOKIE,
  AUTH_TAB_STORAGE_KEY,
  bootAuthTabClient,
  sanitizeTabSlot,
} from "@/lib/auth-tab";

function currentSlot() {
  return sanitizeTabSlot(sessionStorage.getItem(AUTH_TAB_STORAGE_KEY));
}

function stampTabCookie() {
  try {
    const slot = currentSlot();
    if (!slot) return;
    document.cookie = `${AUTH_TAB_COOKIE}=${slot};path=/;SameSite=Strict`;
  } catch {
    // private mode
  }
}

function syncTabCookie() {
  try {
    if (document.visibilityState === "hidden") return;
    stampTabCookie();
  } catch {
    // private mode
  }
}

function readBeats(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(AUTH_TAB_BEATS_KEY) || "{}") || {};
  } catch {
    return {};
  }
}

function writeBeats(beats: Record<string, number>) {
  localStorage.setItem(AUTH_TAB_BEATS_KEY, JSON.stringify(beats));
}

function beat() {
  try {
    const slot = currentSlot();
    if (!slot) return;
    syncTabCookie();
    const now = Date.now();
    const beats = readBeats();
    for (const id of Object.keys(beats)) {
      if (now - beats[id] > 20000) delete beats[id];
    }
    beats[slot] = now;
    writeBeats(beats);
  } catch {
    // private mode
  }
}

function dropThisSlotBeat() {
  try {
    const slot = currentSlot();
    if (!slot) return;
    const beats = readBeats();
    delete beats[slot];
    writeBeats(beats);
  } catch {
    // private mode
  }
}

export function AuthTabSync() {
  useEffect(() => {
    bootAuthTabClient();
    beat();
    function onPageHide(event: PageTransitionEvent) {
      stampTabCookie();
      if (!event.persisted) dropThisSlotBeat();
    }
    function onVisible() {
      if (document.visibilityState === "visible") beat();
    }
    window.addEventListener("focus", beat);
    window.addEventListener("pageshow", beat);
    window.addEventListener("pagehide", onPageHide);
    window.addEventListener("beforeunload", stampTabCookie);
    document.addEventListener("visibilitychange", onVisible);
    const id = window.setInterval(beat, 4000);
    return () => {
      window.removeEventListener("focus", beat);
      window.removeEventListener("pageshow", beat);
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("beforeunload", stampTabCookie);
      document.removeEventListener("visibilitychange", onVisible);
      window.clearInterval(id);
    };
  }, []);
  return null;
}
