/** One signed-in admin per browser tab. Cookies are shared; this slot is not. */

declare global {
  interface Window {
    __mmpsTabBooted?: boolean;
  }
}

export const AUTH_TAB_COOKIE = "mmps_tab";
export const AUTH_TAB_HEADER = "x-mmps-tab";
export const AUTH_TAB_STORAGE_KEY = "mmps_tab_slot";
export const AUTH_TAB_BEATS_KEY = "mmps_tab_beats";

export function sanitizeTabSlot(raw?: string | null): string | null {
  const slot = String(raw || "")
    .trim()
    .toLowerCase();
  if (!/^[a-z0-9]{6,16}$/.test(slot)) return null;
  return slot;
}

export function tabSessionCookieName(slot: string): string {
  return `mmps_sess_${slot}`;
}

export function tabGuestCookieName(slot: string): string {
  return `mmps_g_${slot}`;
}

/** Create or reuse this tab's slot, then mark it on the cookie. */
export function ensureTabSlot(): string {
  if (typeof window === "undefined") return "";
  try {
    let slot = sanitizeTabSlot(sessionStorage.getItem(AUTH_TAB_STORAGE_KEY));
    if (!slot) {
      slot = Math.random().toString(36).slice(2, 12);
      sessionStorage.setItem(AUTH_TAB_STORAGE_KEY, slot);
    }
    document.cookie = `${AUTH_TAB_COOKIE}=${slot};path=/;SameSite=Strict`;
    return slot;
  } catch {
    return "";
  }
}

export function markTabSignedIn(slot: string): void {
  const clean = sanitizeTabSlot(slot);
  if (!clean || typeof document === "undefined") return;
  document.cookie = `${AUTH_TAB_COOKIE}=${clean};path=/;SameSite=Strict`;
  document.cookie = `${tabGuestCookieName(clean)}=;path=/;SameSite=Strict;max-age=0`;
}

function cookieVal(name: string): string {
  const hit = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return hit ? decodeURIComponent(hit[1]) : "";
}

const TAB_UNLOAD_KEY = "mmps_tab_unload";

/** A copied tab (new tab / duplicate) must not keep the previous tab's login. */
function claimThisTabSlot(): { slot: string; created: boolean } | null {
  const unloading = sessionStorage.getItem(TAB_UNLOAD_KEY) === "1";
  sessionStorage.removeItem(TAB_UNLOAD_KEY);
  let slot = sanitizeTabSlot(sessionStorage.getItem(AUTH_TAB_STORAGE_KEY));
  const cloned = Boolean(slot) && !unloading;
  if (!slot || cloned) {
    slot = Math.random().toString(36).slice(2, 12);
    sessionStorage.setItem(AUTH_TAB_STORAGE_KEY, slot);
    sessionStorage.removeItem("mmps_tab_fresh");
    return { slot, created: true };
  }
  return { slot, created: false };
}

/** Same as the old beforeInteractive boot, without a React <script> tag. */
export function bootAuthTabClient(): void {
  if (typeof window === "undefined") return;
  try {
    if (window.__mmpsTabBooted) {
      ensureTabSlot();
      return;
    }
    window.__mmpsTabBooted = true;
    const claimed = claimThisTabSlot();
    if (!claimed) return;
    const { slot, created } = claimed;
    document.cookie = `${AUTH_TAB_COOKIE}=${slot};path=/;SameSite=Strict`;
    window.addEventListener("pagehide", () => {
      try {
        sessionStorage.setItem(TAB_UNLOAD_KEY, "1");
      } catch {
        // private mode
      }
    });
    const now = Date.now();
    let beats: Record<string, number> = {};
    try {
      beats = JSON.parse(localStorage.getItem(AUTH_TAB_BEATS_KEY) || "{}") || {};
    } catch {
      beats = {};
    }
    for (const id of Object.keys(beats)) {
      if (now - beats[id] > 20000) delete beats[id];
    }
    beats[slot] = now;
    localStorage.setItem(AUTH_TAB_BEATS_KEY, JSON.stringify(beats));
    if (!created && cookieVal(`mmps_sess_${slot}`)) return;
    if (!created) return;
    document.cookie = `${tabGuestCookieName(slot)}=1;path=/;SameSite=Strict;max-age=604800`;
    const path = location.pathname;
    if (/^\/(super-admin|admin|broker|dashboard|account)(\/|$)/.test(path)) {
      location.replace("/login");
      return;
    }
    const signedInElsewhere = /(?:^|; )mmps_(?:token(?:_super|_admin|_broker)?|sess_)/.test(
      document.cookie
    );
    if (signedInElsewhere && sessionStorage.getItem("mmps_tab_fresh") !== "1") {
      sessionStorage.setItem("mmps_tab_fresh", "1");
      location.reload();
    }
  } catch {
    // private mode
  }
}

export const AUTH_TAB_BOOT_SCRIPT = [
  "(function(){try{",
  "if(window.__mmpsTabBooted)return;window.__mmpsTabBooted=1;",
  'var k="mmps_tab_slot";var bk="mmps_tab_beats";var uk="mmps_tab_unload";',
  "function cookieVal(n){var m=document.cookie.match(new RegExp(\"(?:^|; )\"+n+\"=([^;]*)\"));return m?decodeURIComponent(m[1]):\"\";}",
  'var unloading=sessionStorage.getItem(uk)==="1";sessionStorage.removeItem(uk);',
  "var slot=sessionStorage.getItem(k);var cloned=!!slot&&!unloading;var created=!slot||cloned;",
  "if(!slot||cloned){slot=Math.random().toString(36).slice(2,12);sessionStorage.setItem(k,slot);sessionStorage.removeItem(\"mmps_tab_fresh\");}",
  'document.cookie="mmps_tab="+slot+";path=/;SameSite=Strict";',
  'window.addEventListener("pagehide",function(){try{sessionStorage.setItem(uk,"1");}catch(e){}});',
  "var now=Date.now();var beats={};",
  'try{beats=JSON.parse(localStorage.getItem(bk)||"{}")||{};}catch(e){beats={};}',
  "Object.keys(beats).forEach(function(id){if(now-beats[id]>20000)delete beats[id];});",
  "beats[slot]=now;localStorage.setItem(bk,JSON.stringify(beats));",
  'if(!created&&cookieVal("mmps_sess_"+slot))return;',
  "if(!created)return;",
  'document.cookie="mmps_g_"+slot+"=1;path=/;SameSite=Strict;max-age=604800";',
  "var p=location.pathname;",
  "if(/^\\/(super-admin|admin|broker|dashboard|account)(\\/|$)/.test(p)){location.replace(\"/login\");return;}",
  'var signed=/(?:^|; )mmps_(?:token(?:_super|_admin|_broker)?|sess_)/.test(document.cookie);',
  'if(signed&&sessionStorage.getItem("mmps_tab_fresh")!=="1"){sessionStorage.setItem("mmps_tab_fresh","1");location.reload();}',
  "}catch(e){}})();",
].join("");
