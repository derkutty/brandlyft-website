// Finishes the sign-in with TikTok or Facebook: sends code and state to the API and keeps the session.
// Shared by /auth/meta/callback/ and /auth/tiktok/callback/ (the page names the provider in data-provider).
(function () {
  "use strict";
  var provider = document.currentScript && document.currentScript.getAttribute("data-provider");
  var status = document.getElementById("status");
  var q = new URLSearchParams(location.search);
  // Remove the code from the address bar right away
  history.replaceState(null, "", location.pathname);
  // Never finish a sign-in inside another site's frame (GitHub Pages cannot send frame-ancestors)
  if (window.top !== window.self) {
    status.textContent = "For your security, Brandlyft cannot finish a sign-in inside another page. Please open brandlyft.app directly.";
    return;
  }
  if (provider !== "meta" && provider !== "tiktok") {
    status.textContent = "This sign-in link is not valid.";
    return;
  }
  if (q.get("error") || !q.get("code")) {
    status.textContent = "The connection was cancelled or failed" + (q.get("error_description") ? " (" + q.get("error_description") + ")" : "") + ". You can go back and try again.";
    return;
  }
  fetch(window.BRANDLYFT_API + "/api/auth/" + provider + "/finish", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code: q.get("code"), state: q.get("state") })
  }).then(function (r) {
    return r.json().then(function (d) { if (!r.ok) throw new Error(d.error || d.detail || "Connection failed"); return d; });
  }).then(function (d) {
    try { localStorage.setItem("bl_session", d.session); } catch (e) {}
    status.textContent = "Connected. Taking you to Brandlyft…";
    location.replace("/app/");
  }).catch(function (e) { status.textContent = e.message; });
})();
