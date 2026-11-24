// Website preview on brandlyft.app: Brandlyft reads the visitor's website live, asks three questions while it works,
// shows example posts as a card stack with their check report and ends with the waitlist. Nothing is published.
// Talks to the Brandlyft API (window.BRANDLYFT_API from /app/config.js). The pages forbid inline styles and scripts
// (CSP), so everything here builds elements with the DOM and sets styles through the CSSOM only.
(function () {
  "use strict";
  var stage = document.getElementById("demo");
  var forms = document.querySelectorAll("[data-demo-form]");
  if (!stage || !forms.length || !window.fetch || !window.Promise) return;

  var API = String(window.BRANDLYFT_API || "").replace(/\/+$/, "");
  var LANG = document.documentElement.lang === "de" ? "de" : "en";
  var reduce = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  var T = {
    de: {
      bad: "Bitte gib eine Website ein, zum Beispiel deinshop.de.",
      network: "Die Verbindung zu Brandlyft ist abgebrochen. Bitte versuch es noch einmal.",
      typed: ["Ich schau mir ", "", " an …"],
      p: {
        start: ["Lese deine Website", "{host}"], site: ["Startseite gelesen", "{title}"],
        products: ["{n} Produkte gefunden", "für die Beispiele zählen nur vorrätige mit Foto"],
        product1: ["1 Produkt gefunden", "für die Beispiele zählen nur vorrätige mit Foto"],
        noproducts: ["Keine Produktliste gefunden", "die Beispiele entstehen aus deinen Seiten"],
        style: ["Schreibe dein Markenprofil", "Ton, Zielgruppe und Anrede"], profile: ["Markenprofil fertig", "{line}"],
        posts: ["Schreibe drei Beiträge", "im Ton von {name}"], checking: ["Prüfe jeden Beitrag", "Preise, Zahlen, Lager und Aussagen"],
        done: ["Fertig: {n} Beiträge geprüft", "bereit zum Freigeben"]
      },
      none: "nichts gefunden", noProducts: "keine Produktliste", productsN: "Produkte",
      hint: { informal: "Auf {host} duzt du. Darum ist „Du“ schon markiert.", formal: "Auf {host} siezt du. Darum ist „Sie“ schon markiert." },
      formats: { post: "Beitrag", story: "Story", reel: "Reel-Titelbild" },
      kind: { post: "Beitrag", story: "Story", reel: "Reel" },
      more: "Mehr erfahren", draft: "Entwurf", days: ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"],
      status: { now: "Jetzt", wait: "Wartet", yes: "Freigegeben", no: "Aussortiert", held: "Angehalten" },
      passed: "{n} Prüfungen bestanden", partly: "{p} von {n} Prüfungen bestanden", details: "Details", hide: "Ausblenden",
      heldLead: "Angehalten: ", heldNoYes: "Angehaltene Beiträge kannst du nicht freigeben, nur aussortieren.",
      howto: "Wischen oder tippen. Veröffentlicht wird nichts.", ready: "Deine echten Beiträge sind bereit.",
      practice: { head: "Nur noch 2 Stück!", caption: "Schnell sein: {name} ist fast weg.", reason: "„Nur noch 2 Stück“ steht nirgends in deinem Shop. Das wäre falsche Knappheit.", fallback: "dein Lieblingsstück" },
      tally: "{a} freigegeben, {b} aussortiert. ",
      freq: { "3_week": "Drei Beiträge pro Woche, jeder vorher von dir freigegeben.", daily: "Jeden Tag ein Beitrag, jeder vorher von dir freigegeben.", twice_daily: "Zweimal am Tag, jeder Beitrag vorher von dir freigegeben." },
      open: "Freie Felder füllt Brandlyft ab dem Start mit weiteren Entwürfen.",
      email: "Bitte gib eine gültige E-Mail-Adresse ein.", consent: "Bitte bestätige, dass wir dir schreiben dürfen.",
      sending: "Wird gesendet", failed: "Das hat nicht geklappt. Bitte versuch es noch einmal."
    },
    en: {
      bad: "Please enter a website, for example yourshop.com.",
      network: "The connection to Brandlyft was interrupted. Please try again.",
      typed: ["Taking a look at ", "", " …"],
      p: {
        start: ["Reading your website", "{host}"], site: ["Home page read", "{title}"],
        products: ["{n} products found", "only products in stock with a photo count for the examples"],
        product1: ["1 product found", "only products in stock with a photo count for the examples"],
        noproducts: ["No product list found", "the examples come from your pages"],
        style: ["Writing your brand profile", "tone, audience and form of address"], profile: ["Brand profile ready", "{line}"],
        posts: ["Writing three posts", "in the voice of {name}"], checking: ["Checking every post", "prices, numbers, stock and claims"],
        done: ["Done: {n} posts checked", "ready for your approval"]
      },
      none: "nothing found", noProducts: "no product list", productsN: "products",
      hint: { informal: "", formal: "" },
      formats: { post: "Post", story: "Story", reel: "Reel cover" },
      kind: { post: "Post", story: "Story", reel: "Reel" },
      more: "Learn more", draft: "Draft", days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
      status: { now: "Now", wait: "Waiting", yes: "Approved", no: "Declined", held: "Held back" },
      passed: "{n} checks passed", partly: "{p} of {n} checks passed", details: "Details", hide: "Hide",
      heldLead: "Held back: ", heldNoYes: "Held-back posts cannot be approved, only declined.",
      howto: "Swipe or tap. Nothing gets published.", ready: "Your real posts are ready.",
      practice: { head: "Only 2 left!", caption: "Be quick: {name} is almost gone.", reason: "“Only 2 left” appears nowhere in your shop. That would be false scarcity.", fallback: "your favourite piece" },
      tally: "{a} approved, {b} declined. ",
      freq: { "3_week": "Three posts a week, each approved by you first.", daily: "One post every day, each approved by you first.", twice_daily: "Twice a day, each post approved by you first." },
      open: "From launch, Brandlyft fills the open slots with more drafts.",
      email: "Please enter a valid e-mail address.", consent: "Please confirm that we may write to you.",
      sending: "Sending", failed: "That did not work. Please try again."
    }
  }[LANG];
  var BAR = { start: 8, site: 22, products: 36, product1: 36, noproducts: 36, style: 48, profile: 62, posts: 74, checking: 90, done: 100 };
  var SLOTS = {
    "3_week": [[1, "18:00"], [3, "18:00"], [5, "10:00"]],
    daily: [[0, "18:00"], [1, "18:00"], [2, "18:00"], [3, "18:00"], [4, "18:00"], [5, "10:00"], [6, "10:00"]],
    twice_daily: [[0, "08:30"], [0, "18:00"], [1, "08:30"], [1, "18:00"], [2, "08:30"], [2, "18:00"], [3, "08:30"], [3, "18:00"],
                  [4, "08:30"], [4, "18:00"], [5, "10:00"], [5, "18:00"], [6, "10:00"], [6, "18:00"]]
  };

  var html = document.documentElement;
  var S = null;          // state of the running preview
  var pushed = false;    // we added a history entry for the open preview
  var lastFocus = null;
  var timers = [];

  function $(sel, root) { return (root || stage).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || stage).querySelectorAll(sel)); }
  function fill(text, data) {
    return String(text).replace(/\{(\w+)\}/g, function (_, k) { return data && data[k] != null ? data[k] : ""; });
  }
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function later(fn, ms) { var t = setTimeout(fn, reduce ? Math.min(ms, 60) : ms); timers.push(t); return t; }
  function webUrl(u) { return typeof u === "string" && /^https:\/\/[^\s"'<>\\]+$/i.test(u) ? u : ""; }
  function hex(c) { return typeof c === "string" && /^#[0-9a-f]{6}$/i.test(c) ? c : ""; }
  function inkFor(c) {
    var n = parseInt(c.slice(1), 16), r = n >> 16 & 255, g = n >> 8 & 255, b = n & 255;
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6 ? "#1d1a24" : "#ffffff";
  }
  function hostOf(value) {
    var v = String(value || "").trim().toLowerCase().replace(/^https?:\/\//, "");
    v = v.split(/[/?#\s]/)[0];
    return /^[a-z0-9äöüß.-]+\.[a-z]{2,24}$/i.test(v) ? v : "";
  }

  // Opening and closing

  forms.forEach(function (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var input = form.querySelector("input");
      var msg = form.parentNode.querySelector("[data-demo-msg]");
      var host = hostOf(input.value);
      if (msg) msg.textContent = "";
      if (!host) {
        if (msg) msg.textContent = T.bad;
        input.focus();
        return;
      }
      lastFocus = input;
      open(input.value.trim(), host);
    });
  });

  function open(url, host) {
    reset();
    S = { url: url, host: host, demo: null, products: [], profile: null, answers: { address: null, never: [], frequency: null },
          answered: false, writing: false, result: null, error: null, step: null, practiceDone: false, index: 0, decisions: [] };
    $$("[data-host]").forEach(function (h) { h.textContent = host; });
    var pill = $("[data-host-pill]");
    pill.textContent = host;
    pill.hidden = false;
    stage.hidden = false;
    stage.classList.remove("open");
    void stage.offsetWidth;
    stage.classList.add("open");
    html.classList.add("locked");
    if (!pushed) {
      history.pushState({ brandlyftPreview: true }, "", location.pathname + location.search + "#vorschau");
      pushed = true;
    }
    show("read");
    progress("start", { host: host });
    read(url);
    later(function () { $("[data-step=read] [data-next]").disabled = false; }, 6000);
  }

  function close(fromHistory) {
    abort();
    stage.hidden = true;
    html.classList.remove("locked");
    if (pushed) {
      pushed = false;
      if (!fromHistory) history.back();
    }
    if (lastFocus) lastFocus.focus();
  }

  function abort() {
    timers.forEach(clearTimeout);
    timers = [];
    if (S && S.ctrl) S.ctrl.abort();
    if (S && S.ctrl2) S.ctrl2.abort();
  }

  function reset() {
    abort();
    $$(".find").forEach(function (f) {
      var label = f.querySelector("b").textContent;
      var wait = f.querySelector(".wait") ? f.querySelector(".wait").textContent : "";
      f.textContent = "";
      f.appendChild(el("b", "", label));
      f.appendChild(el("span", "wait pulse", wait || f.getAttribute("data-wait") || "…"));
      f.setAttribute("data-wait", wait || f.getAttribute("data-wait") || "…");
      f.classList.remove("pop");
    });
    $("[data-step=read] [data-next]").disabled = true;
    $$("[aria-pressed]").forEach(function (b) { b.setAttribute("aria-pressed", "false"); });
    var hint = $("[data-address-hint]");
    hint.hidden = true;
    $("[data-practice-deck]").textContent = "";
    $("[data-practice-done]").hidden = true;
    $("[data-practice-lead]").hidden = false;
    $("[data-practice-figure]").src = "/assets/img/figur-pruefung.webp";
    $("[data-deck]").textContent = "";
    $("[data-queue]").textContent = "";
    $("[data-week]").textContent = "";
    $("[data-confetti]").textContent = "";
    var form = $("[data-end-form]");
    form.hidden = false;
    form.reset();
    $("[data-end-msg]").textContent = "";
    $("[data-thanks]").hidden = true;
    var go = form.querySelector("button[type=submit]");
    go.disabled = false;
    if (go.getAttribute("data-label")) go.textContent = go.getAttribute("data-label");
  }

  stage.addEventListener("click", function (e) {
    if (e.target.closest("[data-close]")) close(false);
    if (e.target.closest("[data-restart]")) {
      close(false);
      var input = document.getElementById("site-url");
      if (input) {
        window.scrollTo(0, 0);
        input.select();
        input.focus();
      }
    }
  });
  window.addEventListener("popstate", function () { if (!stage.hidden) { pushed = false; close(true); } });
  if (location.hash === "#vorschau") history.replaceState(null, "", location.pathname + location.search);

  document.addEventListener("keydown", function (e) {
    if (stage.hidden) return;
    if (e.key === "Escape") { close(false); return; }
    if (S && S.step === "stack" && (e.key === "ArrowRight" || e.key === "ArrowLeft")) {
      decide(e.key === "ArrowRight" ? "yes" : "no");
      e.preventDefault();
    }
    if (e.key === "Tab") trap(e);
  });

  function trap(e) {
    var step = S && S.step ? $("[data-step=" + S.step + "]") : null;
    var items = $$(".stage-top a, .stage-top button").concat(step ? $$("a[href], button:not([disabled]), input, [tabindex='0']", step) : [])
      .filter(function (x) { return x.offsetParent !== null; });
    if (!items.length) return;
    var first = items[0], last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { last.focus(); e.preventDefault(); }
    else if (!e.shiftKey && document.activeElement === last) { first.focus(); e.preventDefault(); }
    else if (!stage.contains(document.activeElement)) { first.focus(); e.preventDefault(); }
  }

  // Steps

  function show(name) {
    if (!S) return;
    S.step = name;
    stage.setAttribute("data-step", name);
    $$(".step").forEach(function (s) { s.hidden = s.getAttribute("data-step") !== name; });
    var step = $("[data-step=" + name + "]");
    step.scrollTop = 0;
    var waiting = ["read", "q1", "q2", "q3", "kjell", "practice", "wait"].indexOf(name) >= 0;
    $("[data-progress]").hidden = !waiting;
    var head = step.querySelector("[tabindex='-1']");
    if (head) head.focus({ preventScroll: true });
    var typed = step.querySelector("[data-type]");
    if (typed) type(typed, name === "read" ? [T.typed[0], { em: S.host }, T.typed[2]] : [typed.getAttribute("data-text") || typed.textContent]);
  }

  function type(target, parts) {
    if (!target.getAttribute("data-text")) target.setAttribute("data-text", target.textContent);
    clearInterval(target._timer);
    target.textContent = "";
    var chars = [];
    parts.forEach(function (part) {
      var box = target;
      var text = part;
      if (part && typeof part === "object") {
        box = target.appendChild(el("em"));
        text = part.em;
      }
      Array.prototype.forEach.call(String(text), function (c) { chars.push(box.appendChild(el("span", "ch", c))); });
    });
    if (reduce) { chars.forEach(function (c) { c.classList.add("on"); }); return; }
    var i = 0;
    target._timer = setInterval(function () {
      if (i >= chars.length) { clearInterval(target._timer); return; }
      chars[i++].classList.add("on");
    }, 32);
  }

  function progress(key, data) {
    var p = T.p[key];
    if (!p) return;
    $("[data-p-title]").textContent = fill(p[0], data);
    $("[data-p-sub]").textContent = fill(p[1], data);
    $("[data-p-bar]").style.width = BAR[key] + "%";
  }

  function fail(code, message) {
    if (!S || S.failed) return;
    S.failed = true;
    abort();
    $("[data-error-text]").textContent = message || T.network;
    show("error");
  }

  // Reading the website, one event per line

  function read(url) {
    var ctrl = window.AbortController ? new AbortController() : null;
    S.ctrl = ctrl;
    var run = S;
    fetch(API + "/api/demo/read", {
      method: "POST", headers: { "Content-Type": "application/json" }, signal: ctrl ? ctrl.signal : undefined,
      body: JSON.stringify({ url: url, lang: LANG })
    }).then(function (r) {
      var type = r.headers.get("content-type") || "";
      if (!r.ok || type.indexOf("ndjson") < 0) {
        return r.json().catch(function () { return {}; }).then(function (d) { throw { code: d.code || "failed", message: d.error || T.network }; });
      }
      return lines(r, function (ev) { if (S === run) onEvent(ev); });
    }).then(function () {
      if (S === run && !run.demo && !run.failed) fail("failed", T.network);
    }).catch(function (e) {
      if (S !== run || (e && e.name === "AbortError")) return;
      fail(e && e.code, e && e.message && e.code ? e.message : T.network);
    });
  }

  function lines(r, cb) {
    function one(line) {
      line = line.trim();
      if (!line) return;
      var ev;
      try { ev = JSON.parse(line); } catch (e) { return; }
      cb(ev);
    }
    if (!r.body || !r.body.getReader || !window.TextDecoder) {
      return r.text().then(function (t) { t.split("\n").forEach(one); });
    }
    var reader = r.body.getReader(), dec = new TextDecoder(), buf = "";
    function pump() {
      return reader.read().then(function (res) {
        if (res.done) { one(buf); return; }
        buf += dec.decode(res.value, { stream: true });
        var parts = buf.split("\n");
        buf = parts.pop();
        parts.forEach(one);
        return pump();
      });
    }
    return pump();
  }

  function find(name) {
    var f = $("[data-find=" + name + "]");
    var label = f.querySelector("b").textContent;
    f.textContent = "";
    f.appendChild(el("b", "", label));
    f.classList.remove("pop");
    void f.offsetWidth;
    f.classList.add("pop");
    return f;
  }

  function onEvent(ev) {
    if (ev.t === "site") {
      var f = find("site");
      f.appendChild(el("span", "title", ev.title || ev.site || S.host));
      progress("site", { title: ev.title || S.host });
    } else if (ev.t === "products") {
      S.products = (ev.items || []).filter(function (p) { return webUrl(p.image); });
      var box = find("products");
      var row = box.appendChild(el("div", "thumbs"));
      row.appendChild(el("span", "n", String(ev.count || 0)));
      if (!ev.count) row.appendChild(el("span", "wait", T.noProducts));
      S.products.slice(0, 3).forEach(function (p) {
        var img = row.appendChild(el("img"));
        img.alt = p.name || "";
        img.src = p.image;
        img.loading = "lazy";
        img.onerror = function () { img.remove(); };
      });
      progress(ev.count ? (ev.count === 1 ? "product1" : "products") : "noproducts", { n: ev.count });
    } else if (ev.t === "style") {
      var colors = (ev.colors || []).map(hex).filter(Boolean).slice(0, 5);
      var c = find("colors");
      if (colors.length) {
        var sw = c.appendChild(el("div", "swatches"));
        colors.forEach(function (h) { var i = sw.appendChild(el("i")); i.style.background = h; i.title = h; });
      } else c.appendChild(el("span", "wait", T.none));
      var fonts = (ev.fonts || []).filter(function (x) { return typeof x === "string"; }).slice(0, 2);
      find("fonts").appendChild(el("span", "fonts", fonts.length ? fonts.join(" · ") : T.none));
      progress("style");
      var next = $("[data-step=read] [data-next]");
      next.disabled = false;
      later(function () { if (S && S.step === "read") show("q1"); }, 3200);
    } else if (ev.t === "profile") {
      S.profile = ev.profile || {};
      var tone = find("tone");
      var chips = tone.appendChild(el("div", "chips"));
      String(S.profile.tone || "").split(/,|;| und | and /).map(function (x) { return x.trim(); }).filter(Boolean).slice(0, 3)
        .forEach(function (x) { chips.appendChild(el("span", "chip", x)); });
      if (S.profile.address) chips.appendChild(el("span", "chip", S.profile.address));
      progress("profile", { line: S.profile.one_liner || S.profile.name || S.host });
      suggestAddress();
    } else if (ev.t === "ready") {
      S.demo = ev.demo;
      write();
    } else if (ev.t === "error") {
      fail(ev.code, ev.message);
    }
  }

  // Questions

  function suggestAddress() {
    if (!S.profile || S.answers.address) return;
    var a = String(S.profile.address || "").trim().toLowerCase();
    var pick = a === "sie" ? "formal" : a === "du" ? "informal" : null;
    if (!pick || String(S.profile.language || LANG).slice(0, 2) !== "de" || !T.hint[pick]) return;
    $$("[data-address]").forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-address") === pick)); });
    var hint = $("[data-address-hint]");
    hint.textContent = fill(T.hint[pick], { host: S.host });
    hint.hidden = false;
  }

  $("[data-step=read] [data-next]").addEventListener("click", function () { show("q1"); });
  $$("[data-address]").forEach(function (b) {
    b.addEventListener("click", function () {
      S.answers.address = b.getAttribute("data-address");
      $$("[data-address]").forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); });
      later(function () { show("q2"); }, 280);
    });
  });
  $$("[data-never]").forEach(function (b) {
    b.addEventListener("click", function () { b.setAttribute("aria-pressed", String(b.getAttribute("aria-pressed") !== "true")); });
  });
  $("[data-step=q2] [data-next]").addEventListener("click", function () {
    S.answers.never = $$("[data-never]").filter(function (b) { return b.getAttribute("aria-pressed") === "true"; })
      .map(function (b) { return b.getAttribute("data-never"); });
    show("q3");
  });
  $$("[data-frequency]").forEach(function (b) {
    b.addEventListener("click", function () {
      S.answers.frequency = b.getAttribute("data-frequency");
      $$("[data-frequency]").forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); });
      if (!S.answers.address) S.answers.address = $$("[data-address]").filter(function (x) { return x.getAttribute("aria-pressed") === "true"; })
        .map(function (x) { return x.getAttribute("data-address"); })[0] || null;
      S.answered = true;
      write();
      later(function () { show("kjell"); }, 320);
    });
  });
  $("[data-step=kjell] [data-next]").addEventListener("click", function () { practice(); });

  // Writing the posts, once the website is read and the questions are answered

  function write() {
    if (!S || !S.demo || !S.answered || S.writing || S.result) return;
    S.writing = true;
    var run = S;
    var ctrl = window.AbortController ? new AbortController() : null;
    S.ctrl2 = ctrl;
    progress("posts", { name: (S.profile && S.profile.name) || S.host });
    var answers = { never: S.answers.never, frequency: S.answers.frequency };
    if (S.answers.address) answers.address = S.answers.address;
    fetch(API + "/api/demo/posts", {
      method: "POST", headers: { "Content-Type": "application/json" }, signal: ctrl ? ctrl.signal : undefined,
      body: JSON.stringify({ demo: S.demo, answers: answers, lang: LANG })
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (d) {
        if (!r.ok) throw { code: d.code || "failed", message: d.error || T.network };
        if (!d.posts || !d.posts.length) throw { code: "failed", message: T.network };
        return d;
      });
    }).then(function (d) {
      if (S !== run) return;
      progress("checking");
      later(function () {
        if (S !== run) return;
        run.result = d;
        progress("done", { n: d.posts.length });
        if (run.step === "wait") stack();
      }, 900);
    }).catch(function (e) {
      if (S !== run || (e && e.name === "AbortError")) return;
      run.error = e && e.code ? e : { code: "network", message: T.network };
      if (run.step === "wait" || run.practiceDone) fail(run.error.code, run.error.message);
    });
  }

  // Post cards

  function brandOf(card) {
    var colors = S.result && S.result.brand ? S.result.brand.colors || [] : [];
    var c = hex(colors[0]) || "";
    if (c) {
      card.style.setProperty("--brand", c);
      card.style.setProperty("--brand-ink", inkFor(c));
    }
  }

  function tick(ok) {
    var ns = "http://www.w3.org/2000/svg";
    var svg = document.createElementNS(ns, "svg");
    svg.setAttribute("viewBox", "0 0 20 20");
    svg.setAttribute("aria-hidden", "true");
    var path = document.createElementNS(ns, "path");
    path.setAttribute("d", ok ? "M4.5 10.5l3.6 3.6L15.5 6.5" : "M5.5 5.5l9 9M14.5 5.5l-9 9");
    path.setAttribute("stroke", "currentColor");
    path.setAttribute("stroke-width", "2.8");
    path.setAttribute("fill", "none");
    path.setAttribute("stroke-linecap", "round");
    path.setAttribute("stroke-linejoin", "round");
    svg.appendChild(path);
    return svg;
  }

  function playIcon() {
    var ns = "http://www.w3.org/2000/svg";
    var svg = document.createElementNS(ns, "svg");
    svg.setAttribute("viewBox", "0 0 20 20");
    svg.setAttribute("width", "20");
    svg.setAttribute("height", "20");
    svg.setAttribute("aria-hidden", "true");
    var tri = svg.appendChild(document.createElementNS(ns, "path"));
    tri.setAttribute("d", "M7 5l8 5-8 5z");
    tri.setAttribute("fill", "#fff");
    return svg;
  }

  function visual(post, name) {
    var v = el("div", "visual");
    var image = webUrl(post.image);
    function noImage() {
      v.className = "visual";
      v.textContent = "";
      v.appendChild(el("div", "noimg", post.headline || name));
      v.appendChild(el("span", "kind", T.kind[post.format] || T.kind.post));
    }
    if (!image) { noImage(); return v; }
    if (post.format === "story" || post.format === "reel") {
      v.className = "visual tall";
      var blur = v.appendChild(el("img", "blur"));
      blur.alt = "";
      blur.src = image;
      var screen = v.appendChild(el("div", "screen"));
      var img = screen.appendChild(el("img"));
      img.alt = post.product && post.product.name ? post.product.name : "";
      img.src = image;
      img.onerror = noImage;
      if (post.headline) screen.appendChild(el("div", "over", post.headline));
      if (post.format === "story") screen.appendChild(el("span", "sticker", T.more));
      else screen.appendChild(el("span", "play")).appendChild(playIcon());
    } else {
      var pic = v.appendChild(el("img"));
      pic.alt = post.product && post.product.name ? post.product.name : "";
      pic.src = image;
      pic.onerror = noImage;
      if (post.headline) v.appendChild(el("div", "band", post.headline));
    }
    v.appendChild(el("span", "kind", T.kind[post.format] || T.kind.post));
    return v;
  }

  function card(post, slot, opts) {
    opts = opts || {};
    var brand = (S.result && S.result.brand && S.result.brand.name) || (S.profile && S.profile.name) || S.host;
    var c = el("article", "post");
    brandOf(c);
    var head = c.appendChild(el("div", "post-head"));
    head.appendChild(el("span", "av", String(brand).trim().charAt(0).toUpperCase() || "B"));
    head.appendChild(el("span", "", brand));
    head.appendChild(el("span", "meta", "· " + (T.formats[post.format] || T.formats.post) + (slot ? " · " + slot : "")));
    var yes = c.appendChild(el("span", "stamp yes", T.status.yes));
    var no = c.appendChild(el("span", "stamp no", T.status.no));
    yes.setAttribute("aria-hidden", "true");
    no.setAttribute("aria-hidden", "true");
    c.appendChild(visual(post, brand));
    if (post.status === "held") {
      var held = c.appendChild(el("div", "held"));
      held.appendChild(tick(false));
      held.appendChild(el("span", "", T.heldLead + (post.reason || "")));
    }
    var cap = c.appendChild(el("p", "caption", post.caption || ""));
    if (post.hashtags && post.hashtags.length) {
      cap.appendChild(document.createTextNode("\n"));
      cap.appendChild(el("span", "tags", post.hashtags.map(function (t) { return "#" + t; }).join(" ")));
    }
    cap.addEventListener("click", function () { cap.classList.toggle("full"); });
    if (post.checks && post.checks.length) {
      var rep = c.appendChild(el("div", "report"));
      var passed = post.checks.filter(function (x) { return x.ok; }).length;
      var btn = rep.appendChild(el("button", "report-head"));
      btn.type = "button";
      btn.appendChild(el("span", "", passed === post.checks.length ? fill(T.passed, { n: passed }) : fill(T.partly, { p: passed, n: post.checks.length })));
      var more = btn.appendChild(el("span", "more"));
      var list = rep.appendChild(el("ul"));
      post.checks.forEach(function (x) {
        var li = list.appendChild(el("li", x.ok ? "" : "bad"));
        li.appendChild(tick(x.ok));
        li.appendChild(el("span", "", x.label));
      });
      list.hidden = !(post.status === "held" || opts.open);
      more.textContent = list.hidden ? T.details : T.hide;
      btn.setAttribute("aria-expanded", String(!list.hidden));
      btn.addEventListener("click", function () {
        list.hidden = !list.hidden;
        more.textContent = list.hidden ? T.details : T.hide;
        btn.setAttribute("aria-expanded", String(!list.hidden));
      });
    }
    return c;
  }

  function drag(c, can, done) {
    var start = 0, dx = 0, id = null, active = false;
    var yes = c.querySelector(".stamp.yes"), no = c.querySelector(".stamp.no");
    c.addEventListener("pointerdown", function (e) {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      if (e.target.closest("button, a")) return;
      active = true; id = e.pointerId; start = e.clientX; dx = 0;
      try { c.setPointerCapture(id); } catch (err) {}
      c.classList.add("dragging");
    });
    c.addEventListener("pointermove", function (e) {
      if (!active || e.pointerId !== id) return;
      dx = e.clientX - start;
      c.style.transform = "translateX(" + dx + "px) rotate(" + (dx / 20).toFixed(2) + "deg)";
      if (yes) yes.style.opacity = can.yes && dx > 0 ? Math.min(1, dx / 90) : 0;
      if (no) no.style.opacity = can.no && dx < 0 ? Math.min(1, -dx / 90) : 0;
    });
    function end(e) {
      if (!active || (e && e.pointerId !== id)) return;
      active = false;
      c.classList.remove("dragging");
      if (yes) yes.style.opacity = 0;
      if (no) no.style.opacity = 0;
      if (dx > 100 && can.yes) done("yes");
      else if (dx < -100 && can.no) done("no");
      else {
        c.style.transform = "";
        if (dx > 100 && !can.yes) { c.classList.remove("shake"); void c.offsetWidth; c.classList.add("shake"); }
      }
    }
    c.addEventListener("pointerup", end);
    c.addEventListener("pointercancel", end);
  }

  function fly(c, way, then) {
    c.style.transform = "";
    c.classList.add(way === "yes" ? "out-right" : way === "blow" ? "blown" : "out-left");
    later(then, way === "blow" ? 680 : 380);
  }

  // Practice: a draft the check held back

  function practice() {
    show("practice");
    var deck = $("[data-practice-deck]");
    deck.textContent = "";
    var p = S.products[0] || {};
    var name = p.name || T.practice.fallback;
    var post = { format: "story", status: "held", image: webUrl(p.image), headline: T.practice.head,
                 caption: fill(T.practice.caption, { name: name }), hashtags: [], reason: T.practice.reason, checks: [],
                 product: { name: name } };
    var c = deck.appendChild(card(post, T.draft));
    c.classList.add("front");
    var row = deck.appendChild(el("div", "decide"));
    var no = row.appendChild(el("button", "round no"));
    no.type = "button";
    no.setAttribute("aria-label", T.status.no);
    no.appendChild(tick(false));
    var yes = row.appendChild(el("button", "round yes"));
    yes.type = "button";
    yes.disabled = true;
    yes.setAttribute("aria-label", T.heldNoYes);
    yes.title = T.heldNoYes;
    yes.appendChild(tick(true));
    function gone() {
      if (S.practiceDone) return;
      S.practiceDone = true;
      no.disabled = true;
      $("[data-practice-figure]").src = "/assets/img/figur-wegpusten.webp";
      fly(c, "blow", function () {
        c.remove();
        row.remove();
        $("[data-practice-lead]").hidden = true;
        var em = $("[data-done-em]");
        if (!em.getAttribute("data-text")) em.setAttribute("data-text", em.textContent);
        em.textContent = S.result ? T.ready : em.getAttribute("data-text");
        $("[data-practice-done]").hidden = false;
        if (S.error) fail(S.error.code, S.error.message);
      });
    }
    no.addEventListener("click", gone);
    drag(c, { yes: false, no: true }, gone);
  }
  $("[data-to-stack]").addEventListener("click", function () {
    if (S.error) fail(S.error.code, S.error.message);
    else if (S.result) stack();
    else show("wait");
  });

  // The stack of real posts

  function slots() { return SLOTS[S.answers.frequency] || SLOTS.daily; }
  function slotLabel(i) {
    var s = slots()[i % slots().length];
    return T.days[s[0]] + " " + s[1];
  }

  function stack() {
    S.index = 0;
    S.decisions = [];
    show("stack");
    render();
  }

  function render() {
    var posts = S.result.posts;
    var deck = $("[data-deck]");
    deck.textContent = "";
    for (var i = Math.min(posts.length - 1, S.index + 2); i >= S.index; i--) {
      var c = deck.appendChild(card(posts[i], slotLabel(i)));
      if (i === S.index) {
        c.classList.add("front");
        drag(c, { yes: posts[i].status !== "held", no: true }, decide);
      } else {
        c.classList.add("behind", i === S.index + 1 ? "b1" : "b2");
        c.setAttribute("aria-hidden", "true");
      }
    }
    side(posts[S.index]);
    var held = posts[S.index] && posts[S.index].status === "held";
    var yes = $("[data-decide=yes]");
    yes.disabled = !!held;
    yes.title = held ? T.heldNoYes : "";
    $("[data-decide=no]").disabled = false;
    $(".howto").textContent = held ? T.heldNoYes : T.howto;
    queue();
  }

  function side(post) {
    var list = $("[data-side-list]");
    list.textContent = "";
    if (!post) return;
    (post.checks || []).forEach(function (x) {
      var li = list.appendChild(el("li", x.ok ? "" : "bad"));
      li.appendChild(el("span", "tick")).appendChild(tick(x.ok));
      li.appendChild(el("span", "", x.label));
    });
  }

  function queue() {
    var box = $("[data-queue]");
    box.textContent = "";
    S.result.posts.forEach(function (p, i) {
      var row = box.appendChild(el("div", "row"));
      brandOf(row);
      var src = webUrl(p.image);
      if (src) { var img = row.appendChild(el("img")); img.alt = ""; img.src = src; img.onerror = function () { img.className = "ph"; img.removeAttribute("src"); }; }
      else row.appendChild(el("span", "ph"));
      var t = row.appendChild(el("div", "t", T.formats[p.format] || T.formats.post));
      t.appendChild(el("small", "", slotLabel(i)));
      var d = S.decisions[i];
      var st = d === "yes" ? "yes" : d === "no" ? "no" : i === S.index ? (p.status === "held" ? "held" : "now") : (p.status === "held" ? "held" : "wait");
      row.appendChild(el("span", "status " + (st === "held" ? "no" : st), T.status[st]));
    });
  }

  function decide(way) {
    if (!S || S.step !== "stack" || S.busy || !S.result) return;
    var post = S.result.posts[S.index];
    if (!post) return;
    if (way === "yes" && post.status === "held") {
      var f = $("[data-deck] .front");
      if (f) { f.classList.remove("shake"); void f.offsetWidth; f.classList.add("shake"); }
      return;
    }
    S.busy = true;
    S.decisions[S.index] = way;
    queue();
    fly($("[data-deck] .front"), way, function () {
      S.busy = false;
      S.index += 1;
      if (S.index >= S.result.posts.length) week();
      else render();
    });
  }
  $$("[data-decide]").forEach(function (b) { b.addEventListener("click", function () { decide(b.getAttribute("data-decide")); }); });

  // The week and the waitlist

  function week() {
    show("week");
    var box = $("[data-week]");
    box.textContent = "";
    var approved = S.result.posts.filter(function (p, i) { return S.decisions[i] === "yes"; });
    var days = [[], [], [], [], [], [], []];
    slots().forEach(function (s, i) { days[s[0]].push(i); });
    var n = 0;
    days.forEach(function (list, d) {
      var day = box.appendChild(el("div", "day"));
      day.appendChild(el("b", "", T.days[d]));
      list.forEach(function () {
        var p = approved[n++];
        var slot = day.appendChild(el("div", p ? "slot" : "slot open"));
        if (p) {
          brandOf(slot);
          var src = webUrl(p.image);
          if (src) { var img = slot.appendChild(el("img")); img.alt = ""; img.src = src; img.onerror = function () { img.remove(); }; }
        }
      });
    });
    var yes = S.decisions.filter(function (x) { return x === "yes"; }).length;
    var no = S.decisions.length - yes;
    $("[data-tally]").textContent = fill(T.tally, { a: yes, b: no }) + (T.freq[S.answers.frequency] || T.freq.daily) + " " + T.open;
    confetti();
  }

  function confetti() {
    var box = $("[data-confetti]");
    box.textContent = "";
    if (reduce) return;
    var colors = ["#5b45d6", "#a597ff", "#e9b44c", "#f3d27a", "#ffffff", "#7fc8a9"];
    for (var i = 0; i < 70; i++) {
      var s = box.appendChild(el("span"));
      s.style.left = (Math.random() * 100).toFixed(1) + "%";
      s.style.background = colors[i % colors.length];
      s.style.animationDelay = (Math.random() * 1.4).toFixed(2) + "s";
      s.style.animationDuration = (2.6 + Math.random() * 1.8).toFixed(2) + "s";
    }
    later(function () { box.textContent = ""; }, 5600);
  }

  var endForm = $("[data-end-form]");
  endForm.addEventListener("submit", function (e) {
    e.preventDefault();
    var msg = $("[data-end-msg]");
    var input = endForm.querySelector("input[type=email]");
    var go = endForm.querySelector("button[type=submit]");
    msg.textContent = "";
    var email = input.value.trim();
    if (!email || !input.checkValidity()) { msg.textContent = T.email; input.focus(); return; }
    if (!endForm.querySelector("[data-consent]").checked) { msg.textContent = T.consent; return; }
    if (!go.getAttribute("data-label")) go.setAttribute("data-label", go.textContent);
    go.disabled = true;
    go.textContent = T.sending;
    fetch(API + "/api/waitlist", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email, consent: true, website: S.host, demo: S.demo || "", lang: LANG,
                             firma: endForm.querySelector("[data-hp]").value })
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (d) {
        if (!r.ok) throw new Error(d.detail || d.error || T.failed);
      });
    }).then(function () {
      endForm.hidden = true;
      $("[data-thanks]").hidden = false;
    }).catch(function (err) {
      msg.textContent = err.message || T.failed;
      go.disabled = false;
      go.textContent = go.getAttribute("data-label");
    });
  });
})();
