// Waitlist form and confirmation page in German and English (taken from <html lang>).
// Talks to the Brandlyft API (window.BRANDLYFT_API from /app/config.js).
(function () {
  var api = window.BRANDLYFT_API;
  var lang = document.documentElement.lang === "de" ? "de" : "en";
  var T = {
    de: { failed: "Das hat nicht geklappt. Bitte versuch es noch einmal.", email: "Bitte gib eine gültige E-Mail-Adresse ein.",
          consent: "Bitte bestätige, dass wir dir schreiben dürfen.", sending: "Wird gesendet", submit: "Eintragen",
          noToken: ["Link unvollständig", "Bitte öffne den Link direkt aus der Mail."],
          ok: ["Du stehst auf der Warteliste", "Danke! Wir melden uns, sobald dein Platz frei ist, und schreiben dir zwischendurch kurz, wie es vorangeht."],
          error: "Das hat nicht geklappt" },
    en: { failed: "That did not work. Please try again.", email: "Please enter a valid e-mail address.",
          consent: "Please confirm that we may write to you.", sending: "Sending", submit: "Join",
          noToken: ["Link incomplete", "Please open the link directly from the e-mail."],
          ok: ["You are on the waitlist", "Thank you! We will get in touch as soon as your spot is ready and let you know now and then how things are going."],
          error: "That did not work" }
  }[lang];

  function post(path, body) {
    return fetch(api + path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.assign({ lang: lang }, body)) })
      .then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (data) {
          if (!r.ok) throw new Error(data.detail || data.error || T.failed);
          return data;
        });
      });
  }

  var form = document.getElementById("warteliste");
  if (form) {
    var msg = document.getElementById("msg");
    var button = form.querySelector("button");
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      msg.textContent = "";
      var email = form.email.value.trim();
      if (!form.email.checkValidity() || !email) { msg.textContent = T.email; form.email.focus(); return; }
      if (!form.consent.checked) { msg.textContent = T.consent; return; }
      button.disabled = true;
      button.textContent = T.sending;
      post("/api/waitlist", { email: email, website: form.website.value.trim(), branche: form.branche.value,
                              consent: true, firma: form.firma.value })
        .then(function () { form.hidden = true; document.getElementById("done").hidden = false; })
        .catch(function (err) { msg.textContent = err.message; button.disabled = false; button.textContent = T.submit; });
    });
  }

  var status = document.getElementById("status");
  if (status) {
    var token = location.hash.slice(1);
    history.replaceState(null, "", location.pathname);
    function show(title, text) { status.innerHTML = "<h2></h2><p></p>"; status.querySelector("h2").textContent = title; status.querySelector("p").textContent = text; }
    if (!token) { show(T.noToken[0], T.noToken[1]); return; }
    post("/api/waitlist/confirm", { token: token })
      .then(function () { show(T.ok[0], T.ok[1]); })
      .catch(function (err) { show(T.error, err.message); });
  }
})();
