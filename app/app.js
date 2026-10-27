(function () {
  "use strict";
  var API = window.BRANDLYFT_API;
  var $ = function (id) { return document.getElementById(id); };
  var state = { me: null, videos: [], creator: null, video: null };

  function session() { try { return localStorage.getItem("bl_session"); } catch (e) { return null; } }
  function setSession(v) { try { v ? localStorage.setItem("bl_session", v) : localStorage.removeItem("bl_session"); } catch (e) {} }

  function api(method, path, body) {
    var headers = { "Content-Type": "application/json" };
    if (session()) headers.Authorization = "Bearer " + session();
    return fetch(API + path, { method: method, headers: headers, body: body ? JSON.stringify(body) : undefined })
      .then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (data) {
          if (r.status === 401) { setSession(null); show("signin"); }
          if (!r.ok) throw new Error(data.error || data.detail || ("Request failed (" + r.status + ")"));
          return data;
        });
      });
  }

  function el(tag, attrs, children) {
    var n = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === "text") n.textContent = attrs[k];
      else if (k.slice(0, 2) === "on") n.addEventListener(k.slice(2), attrs[k]);
      else n.setAttribute(k, attrs[k]);
    });
    (children || []).forEach(function (c) { if (c) n.appendChild(typeof c === "string" ? document.createTextNode(c) : c); });
    return n;
  }

  function num(n) { return n == null ? "–" : Number(n).toLocaleString("en"); }

  function show(view) {
    $("signin").hidden = view !== "signin";
    $("dash").hidden = view !== "dash";
    $("nav").hidden = view !== "dash";
  }

  function connect(provider) {
    api("POST", "/api/auth/" + provider + "/start").then(function (r) { location.href = r.url; })
      .catch(function (e) { alert(e.message); });
  }

  document.querySelectorAll("[data-connect]").forEach(function (b) {
    b.addEventListener("click", function () { connect(b.getAttribute("data-connect")); });
  });

  $("signout").addEventListener("click", function (ev) {
    ev.preventDefault();
    api("POST", "/api/logout").finally(function () { setSession(null); location.href = "/app/"; });
  });

  $("delete-account").addEventListener("click", function () {
    if (!confirm("Delete your Brandlyft workspace? All connections and stored videos are removed immediately. This cannot be undone.")) return;
    api("DELETE", "/api/account").then(function () { setSession(null); location.href = "/"; })
      .catch(function (e) { alert(e.message); });
  });

  // Channels

  function renderChannels() {
    var acc = state.me.accounts, box = $("channels");
    box.innerHTML = "";
    $("who").textContent = state.me.name || "";

    var tt = acc.tiktok;
    if (tt) {
      var s = tt.stats || {};
      box.appendChild(el("div", { class: "card channel" }, [
        el("div", { class: "head" }, [
          el("img", { class: "avatar", src: tt.avatar || "/app/tiktok.svg", alt: "" }),
          el("div", {}, [el("div", { class: "name", text: tt.display_name || "TikTok" }), el("div", { class: "meta", text: "TikTok · @" + (tt.username || "") })])
        ]),
        el("div", { class: "stats" }, [
          el("span", {}, [el("b", { text: num(s.follower_count) }), "Followers"]),
          el("span", {}, [el("b", { text: num(s.likes_count) }), "Likes"]),
          el("span", {}, [el("b", { text: num(s.video_count) }), "Videos"])
        ]),
        el("button", { class: "linkbtn", text: "Disconnect TikTok", onclick: function () { disconnect("tiktok"); } })
      ]));
    } else {
      box.appendChild(el("div", { class: "card channel" }, [
        el("div", { class: "name", text: "TikTok" }),
        el("p", { text: "Publish videos to your TikTok account and see how they perform." }),
        el("button", { class: "btn small", onclick: function () { connect("tiktok"); } }, [el("img", { src: "/app/tiktok.svg", alt: "", width: 18, height: 18 }), "Connect TikTok"])
      ]));
    }

    var m = acc.meta;
    if (m) {
      var pages = m.pages.map(function (p) {
        return el("div", { class: "head" }, [
          el("img", { class: "avatar", src: (p.instagram && p.instagram.picture) || p.picture || "/app/meta.svg", alt: "" }),
          el("div", {}, [el("div", { class: "name", text: p.name }),
            el("div", { class: "meta", text: "Facebook Page" + (p.instagram ? " · Instagram @" + p.instagram.username : " · no Instagram linked") })])
        ]);
      });
      box.appendChild(el("div", { class: "card channel" }, pages.concat([
        m.pages.length ? null : el("p", { text: "No Facebook Page was shared with Brandlyft. Connect again and select your Page." }),
        el("button", { class: "linkbtn", text: "Disconnect Facebook and Instagram", onclick: function () { disconnect("meta"); } })
      ])));
    } else {
      box.appendChild(el("div", { class: "card channel" }, [
        el("div", { class: "name", text: "Instagram and Facebook" }),
        el("p", { text: "Publish Reels to your Instagram professional account and your Facebook Page." }),
        el("button", { class: "btn small ghost", onclick: function () { connect("meta"); } }, [el("img", { src: "/app/meta.svg", alt: "", width: 18, height: 18 }), "Connect with Facebook"])
      ]));
    }
  }

  function disconnect(provider) {
    if (!confirm("Disconnect this channel? Brandlyft will no longer be able to post to it.")) return;
    api("POST", "/api/accounts/" + provider + "/disconnect").then(load).catch(function (e) { alert(e.message); });
  }

  // Content library

  function renderVideos() {
    var box = $("videos");
    box.innerHTML = "";
    if (!state.videos.length) {
      box.appendChild(el("p", { class: "note", text: "No videos yet. Upload one or wait for the next video Brandlyft creates for you." }));
      return;
    }
    state.videos.forEach(function (v) {
      var posts = (v.posts || []).map(function (p) {
        var label = p.platform === "tiktok" ? (p.mode === "draft" ? "Sent to TikTok drafts" : "Posted to TikTok") : "Posted to Instagram/Facebook";
        return el("span", { class: "badge", text: label });
      });
      box.appendChild(el("div", { class: "card vcard" }, [
        el("video", { src: v.url, controls: "", playsinline: "", preload: "metadata" }),
        el("div", { class: "title", text: v.title || "Untitled video" }),
        el("div", { class: "small", text: (v.source === "brandlyft" ? "Created by Brandlyft" : "Uploaded") + " · " + new Date(v.created * 1000).toLocaleDateString("en-GB") + (v.duration ? " · " + Math.round(v.duration) + " s" : "") }),
        posts.length ? el("div", {}, posts) : null,
        el("button", { class: "btn", onclick: function () { openTikTok(v); } }, ["Post to TikTok"]),
        el("button", { class: "btn ghost", onclick: function () { openMeta(v); } }, ["Post to Instagram / Facebook"]),
        el("button", { class: "linkbtn", text: "Delete video", onclick: function () {
          if (confirm("Delete this video from Brandlyft?")) api("DELETE", "/api/videos/" + v.id).then(loadVideos);
        } })
      ]));
    });
  }

  function loadVideos() {
    return api("GET", "/api/videos").then(function (list) { state.videos = list; renderVideos(); });
  }

  function loadTikTokVideos() {
    if (!state.me.accounts.tiktok) { $("tt-section").hidden = true; return; }
    api("GET", "/api/tiktok/videos").then(function (list) {
      var box = $("tt-videos");
      box.innerHTML = "";
      $("tt-section").hidden = false;
      if (!list.length) { box.appendChild(el("p", { class: "note", text: "No public videos yet." })); return; }
      list.forEach(function (v) {
        box.appendChild(el("a", { class: "card vcard", href: v.share_url, target: "_blank", rel: "noopener", style: "text-decoration:none;color:inherit" }, [
          el("img", { class: "cover", src: v.cover_image_url, alt: "" }),
          el("div", { class: "title", text: v.title || "TikTok video" }),
          el("div", { class: "stats" }, [
            el("span", {}, [el("b", { text: num(v.view_count) }), "Views"]),
            el("span", {}, [el("b", { text: num(v.like_count) }), "Likes"]),
            el("span", {}, [el("b", { text: num(v.comment_count) }), "Comments"])
          ])
        ]));
      });
    }).catch(function () { $("tt-section").hidden = true; });
  }

  $("file").addEventListener("change", function () {
    var f = this.files[0], status = $("upload-status");
    this.value = "";
    if (!f) return;
    status.hidden = false;
    status.textContent = "Preparing upload…";
    var duration = 0, probe = document.createElement("video");
    probe.preload = "metadata";
    probe.onloadedmetadata = function () { duration = probe.duration; };
    probe.src = URL.createObjectURL(f);
    api("POST", "/api/videos/upload", { content_type: f.type || "video/mp4", size: f.size, title: f.name.replace(/\.[^.]+$/, "") })
      .then(function (r) {
        return new Promise(function (resolve, reject) {
          var x = new XMLHttpRequest();
          x.open("PUT", r.upload_url);
          x.setRequestHeader("Content-Type", f.type || "video/mp4");
          x.upload.onprogress = function (e) { if (e.lengthComputable) status.textContent = "Uploading… " + Math.round(e.loaded / e.total * 100) + " %"; };
          x.onload = function () { x.status < 300 ? resolve(r.id) : reject(new Error("Upload failed (" + x.status + ")")); };
          x.onerror = function () { reject(new Error("Upload failed, please check your connection")); };
          x.send(f);
        });
      })
      .then(function (id) { return api("POST", "/api/videos/" + id + "/ready", { duration: duration }); })
      .then(function () { status.textContent = "Upload complete."; return loadVideos(); })
      .catch(function (e) { status.textContent = e.message; });
  });

  // Post to TikTok, following TikTok's content sharing guidelines

  var PRIVACY = { PUBLIC_TO_EVERYONE: "Everyone", MUTUAL_FOLLOW_FRIENDS: "Friends", FOLLOWER_OF_CREATOR: "Followers", SELF_ONLY: "Only me" };
  var MUC = '<a href="https://www.tiktok.com/legal/page/global/music-usage-confirmation/en" target="_blank" rel="noopener">Music Usage Confirmation</a>';
  var BCP = '<a href="https://www.tiktok.com/legal/page/global/bc-policy/en" target="_blank" rel="noopener">Branded Content Policy</a>';

  function ttError(msg) { var e = $("tt-error"); e.hidden = !msg; e.textContent = msg || ""; }

  function updateTikTokForm() {
    var c = state.creator || {};
    var disclose = $("tt-disclose").checked, yours = $("tt-yourbrand").checked, branded = $("tt-branded").checked;
    $("tt-disclose-box").hidden = !disclose;
    $("tt-count").textContent = $("tt-title").value.length;

    var only = $("tt-privacy").querySelector('option[value="SELF_ONLY"]');
    if (only) {
      only.disabled = disclose && branded;
      only.textContent = only.disabled ? "Only me (branded content visibility cannot be set to private)" : "Only me";
      if (only.disabled && $("tt-privacy").value === "SELF_ONLY") $("tt-privacy").value = "";
    }

    var note = $("tt-label-note");
    note.hidden = !(disclose && (yours || branded));
    note.textContent = branded ? "Your video will be labeled as \"Paid partnership\"." : "Your video will be labeled as \"Promotional content\".";
    $("tt-declare").innerHTML = "By posting, you agree to TikTok's " + (disclose && branded ? BCP + " and " : "") + MUC + ".";

    var hint = "", ok = true;
    if (!state.creator) { ok = false; }
    else if (!$("tt-privacy").value) { ok = false; hint = "Choose who can view this video."; }
    else if (disclose && !yours && !branded) { ok = false; hint = "You need to indicate if your content promotes yourself, a third party, or both."; }
    var max = c.max_video_post_duration_sec, dur = state.video && state.video.duration;
    if (max && dur && dur > max) { ok = false; hint = "This video is " + Math.round(dur) + " s long. Your account can post videos up to " + max + " s."; }
    $("tt-publish").disabled = !ok;
    $("tt-publish-hint").textContent = hint;
  }

  ["tt-title", "tt-privacy", "tt-disclose", "tt-yourbrand", "tt-branded"].forEach(function (id) {
    $(id).addEventListener("input", updateTikTokForm);
    $(id).addEventListener("change", updateTikTokForm);
  });

  function openTikTok(v) {
    if (!state.me.accounts.tiktok) { if (confirm("Connect your TikTok account first?")) connect("tiktok"); return; }
    state.video = v;
    state.creator = null;
    $("tt-preview").src = v.url;
    $("tt-title").value = v.caption || "";
    ["tt-comment", "tt-duet", "tt-stitch", "tt-disclose", "tt-yourbrand", "tt-branded"].forEach(function (id) { $(id).checked = false; $(id).disabled = false; });
    var sel = $("tt-privacy");
    sel.innerHTML = '<option value="" disabled selected>Select who can view</option>';
    $("tt-creator").textContent = "Loading your TikTok account…";
    $("tt-result").hidden = true;
    $("tt-interaction-hint").textContent = "";
    $("tt-duration").textContent = "";
    ttError("");
    $("tt-draft").disabled = false;
    updateTikTokForm();
    $("tt-dialog").showModal();

    api("GET", "/api/tiktok/creator").then(function (c) {
      state.creator = c;
      $("tt-creator").innerHTML = "";
      $("tt-creator").appendChild(el("img", { src: c.creator_avatar_url || "/app/tiktok.svg", alt: "" }));
      $("tt-creator").appendChild(el("span", { text: "Posting to " + (c.creator_nickname || "") + " (@" + (c.creator_username || "") + ")" }));
      (c.privacy_level_options || []).forEach(function (p) { sel.appendChild(el("option", { value: p, text: PRIVACY[p] || p })); });
      var off = [];
      if (c.comment_disabled) { $("tt-comment").disabled = true; off.push("comments"); }
      if (c.duet_disabled) { $("tt-duet").disabled = true; off.push("duets"); }
      if (c.stitch_disabled) { $("tt-stitch").disabled = true; off.push("stitches"); }
      if (off.length) $("tt-interaction-hint").textContent = "Turned off in your TikTok privacy settings: " + off.join(", ") + ".";
      if (c.max_video_post_duration_sec) $("tt-duration").textContent = "Your account can post videos up to " + c.max_video_post_duration_sec + " seconds.";
      updateTikTokForm();
    }).catch(function (e) {
      $("tt-creator").textContent = "";
      ttError(e.message + " You cannot post to TikTok right now. Please try again later.");
      $("tt-draft").disabled = true;
    });
  }

  function pollStatus(publishId, mode) {
    var box = $("tt-result"), tries = 0;
    box.hidden = false;
    box.textContent = mode === "draft"
      ? "Sending your video to TikTok…"
      : "Your video is being uploaded to TikTok. It can take a few minutes until it appears on your profile.";
    (function tick() {
      api("GET", "/api/tiktok/status/" + encodeURIComponent(publishId)).then(function (s) {
        if (mode === "draft" && s.status === "SEND_TO_USER_INBOX") { box.textContent = "Sent. Open the TikTok app and check your inbox notifications to finish and post the video."; return; }
        if (s.status === "PUBLISH_COMPLETE") { box.textContent = "Published to TikTok. It may take a moment until it shows on your profile."; loadVideos(); loadTikTokVideos(); return; }
        if (s.status === "FAILED") { box.textContent = "TikTok could not publish the video (" + (s.fail_reason || "unknown reason") + ")."; return; }
        box.textContent = "TikTok is processing your video… It can take a few minutes until it appears on your profile.";
        if (++tries < 40) setTimeout(tick, 5000);
      }).catch(function () { if (++tries < 40) setTimeout(tick, 5000); });
    })();
  }

  $("tt-publish").addEventListener("click", function () {
    var b = this;
    b.disabled = true;
    ttError("");
    $("tt-result").hidden = false;
    $("tt-result").textContent = "Uploading to TikTok…";
    api("POST", "/api/tiktok/publish", {
      video_id: state.video.id, mode: "direct", title: $("tt-title").value, privacy_level: $("tt-privacy").value,
      allow_comment: $("tt-comment").checked, allow_duet: $("tt-duet").checked, allow_stitch: $("tt-stitch").checked,
      disclose: $("tt-disclose").checked, your_brand: $("tt-yourbrand").checked, branded: $("tt-branded").checked
    }).then(function (r) { pollStatus(r.publish_id, "direct"); })
      .catch(function (e) { $("tt-result").hidden = true; ttError(e.message); b.disabled = false; });
  });

  $("tt-draft").addEventListener("click", function () {
    var b = this;
    b.disabled = true;
    ttError("");
    $("tt-result").hidden = false;
    $("tt-result").textContent = "Sending to your TikTok drafts…";
    api("POST", "/api/tiktok/publish", { video_id: state.video.id, mode: "draft" })
      .then(function (r) { pollStatus(r.publish_id, "draft"); loadVideos(); })
      .catch(function (e) { $("tt-result").hidden = true; ttError(e.message); b.disabled = false; });
  });

  $("tt-dialog").addEventListener("close", function () { $("tt-preview").pause(); });

  // Post to Instagram and Facebook

  function openMeta(v) {
    var m = state.me.accounts.meta;
    if (!m) { if (confirm("Connect Facebook and Instagram first?")) connect("meta"); return; }
    state.video = v;
    $("meta-preview").src = v.url;
    $("meta-caption").value = v.caption || "";
    var sel = $("meta-page");
    sel.innerHTML = "";
    m.pages.forEach(function (p) { sel.appendChild(el("option", { value: p.id, text: p.name })); });
    function syncIg() {
      var p = m.pages.filter(function (x) { return x.id === sel.value; })[0];
      var ig = p && p.instagram;
      $("meta-ig").disabled = !ig;
      $("meta-ig").checked = false;
      $("meta-ig-label").textContent = ig ? "Instagram @" + ig.username : "Instagram (not linked to this Page)";
    }
    sel.onchange = syncIg;
    syncIg();
    $("meta-fb").checked = false;
    $("meta-result").hidden = true;
    $("meta-error").hidden = true;
    $("meta-publish").disabled = !m.pages.length;
    $("meta-dialog").showModal();
  }

  $("meta-publish").addEventListener("click", function () {
    var b = this, err = $("meta-error"), res = $("meta-result");
    err.hidden = true;
    if (!$("meta-ig").checked && !$("meta-fb").checked) { err.hidden = false; err.textContent = "Choose Instagram, Facebook or both."; return; }
    b.disabled = true;
    res.hidden = false;
    res.textContent = "Publishing… Instagram needs up to a few minutes to process a Reel.";
    api("POST", "/api/meta/publish", {
      video_id: state.video.id, page_id: $("meta-page").value, caption: $("meta-caption").value,
      instagram: $("meta-ig").checked, facebook: $("meta-fb").checked
    }).then(function (r) {
      res.innerHTML = "";
      res.appendChild(el("div", { text: "Published." }));
      if (r.instagram) res.appendChild(el("div", {}, [el("a", { href: r.instagram, target: "_blank", rel: "noopener", text: "View on Instagram" })]));
      if (r.facebook) res.appendChild(el("div", {}, [el("a", { href: r.facebook, target: "_blank", rel: "noopener", text: "View on Facebook" })]));
      loadVideos();
    }).catch(function (e) { res.hidden = true; err.hidden = false; err.textContent = e.message; b.disabled = false; });
  });

  $("meta-dialog").addEventListener("close", function () { $("meta-preview").pause(); });

  // Start

  function load() {
    return api("GET", "/api/me").then(function (me) {
      state.me = me;
      show("dash");
      renderChannels();
      loadVideos();
      loadTikTokVideos();
    });
  }

  if (!API) { document.body.textContent = "Brandlyft is being set up. Please try again in a few minutes."; return; }
  if (session()) load().catch(function () { show("signin"); });
  else show("signin");
})();
