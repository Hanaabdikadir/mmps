(function () {
  try {
    var k = "mmps_tab_slot";
    var bk = "mmps_tab_beats";
    function cookieVal(n) {
      var m = document.cookie.match(new RegExp("(?:^|; )" + n + "=([^;]*)"));
      return m ? decodeURIComponent(m[1]) : "";
    }
    var slot = sessionStorage.getItem(k);
    var created = !slot;
    if (!slot) {
      slot = Math.random().toString(36).slice(2, 12);
      sessionStorage.setItem(k, slot);
    }
    document.cookie = "mmps_tab=" + slot + ";path=/;SameSite=Strict";
    var now = Date.now();
    var beats = {};
    try {
      beats = JSON.parse(localStorage.getItem(bk) || "{}") || {};
    } catch (e) {
      beats = {};
    }
    Object.keys(beats).forEach(function (id) {
      if (now - beats[id] > 20000) delete beats[id];
    });
    beats[slot] = now;
    localStorage.setItem(bk, JSON.stringify(beats));
    if (cookieVal("mmps_sess_" + slot)) return;
    if (!created) return;
    document.cookie = "mmps_g_" + slot + "=1;path=/;SameSite=Strict;max-age=604800";
    var p = location.pathname;
    if (/^\/(super-admin|admin|broker|dashboard|account)(\/|$)/.test(p)) {
      location.replace("/login");
      return;
    }
    var signed = /(?:^|; )mmps_(?:token(?:_super|_admin|_broker)?|sess_)/.test(
      document.cookie
    );
    if (signed && sessionStorage.getItem("mmps_tab_fresh") !== "1") {
      sessionStorage.setItem("mmps_tab_fresh", "1");
      location.reload();
    }
  } catch (e) {}
})();
