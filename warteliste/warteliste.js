// Waitlist form and confirmation page. Talks to the Brandlyft API (window.BRANDLYFT_API from /app/config.js).
(function () {
  var api = window.BRANDLYFT_API;

  function post(path, body) {
    return fetch(api + path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      .then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (data) {
          if (!r.ok) throw new Error(data.detail || data.error || "Das hat nicht geklappt. Bitte versuch es noch einmal.");
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
      if (!form.email.checkValidity() || !email) { msg.textContent = "Bitte gib eine gültige E-Mail-Adresse ein."; form.email.focus(); return; }
      if (!form.consent.checked) { msg.textContent = "Bitte bestätige, dass wir dir schreiben dürfen."; return; }
      button.disabled = true;
      button.textContent = "Wird gesendet";
      post("/api/waitlist", { email: email, website: form.website.value.trim(), branche: form.branche.value,
                              consent: true, firma: form.firma.value })
        .then(function () { form.hidden = true; document.getElementById("done").hidden = false; })
        .catch(function (err) { msg.textContent = err.message; button.disabled = false; button.textContent = "Eintragen"; });
    });
  }

  var status = document.getElementById("status");
  if (status) {
    var token = location.hash.slice(1);
    history.replaceState(null, "", location.pathname);
    function show(title, text) { status.innerHTML = "<h2></h2><p></p>"; status.querySelector("h2").textContent = title; status.querySelector("p").textContent = text; }
    if (!token) { show("Link unvollständig", "Bitte öffne den Link direkt aus der Mail."); return; }
    post("/api/waitlist/confirm", { token: token })
      .then(function () { show("Du stehst auf der Warteliste", "Danke! Wir melden uns, sobald dein Platz frei ist, und schreiben dir zwischendurch kurz, wie es vorangeht."); })
      .catch(function (err) { show("Das hat nicht geklappt", err.message); });
  }
})();
