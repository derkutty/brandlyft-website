// Sends German-speaking visitors to the German page and everyone else to the English one.
// Runs in <head> before the page paints. The DE/EN switch links carry ?lang=, which wins over the browser
// language and is remembered on this device.
(function () {
  var PAIRS = [["/", "/de/"], ["/waitlist/", "/warteliste/"], ["/privacy.html", "/datenschutz.html"]];
  var here = location.pathname.replace(/index\.html$/, "");
  var lang = document.documentElement.lang === "de" ? "de" : "en";

  function counterpart(path) {
    for (var i = 0; i < PAIRS.length; i++) {
      if (PAIRS[i][0] === path) return { de: PAIRS[i][1] };
      if (PAIRS[i][1] === path) return { en: PAIRS[i][0] };
    }
    return {};
  }

  var asked = /[?&]lang=(de|en)\b/.exec(location.search);
  var wanted = asked && asked[1];
  try {
    if (wanted) localStorage.setItem("lang", wanted);
    else wanted = localStorage.getItem("lang");
  } catch (e) {}
  if (wanted !== "de" && wanted !== "en") {
    var langs = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || ""];
    wanted = /^de\b/i.test(langs[0] || "") ? "de" : "en";
  }
  var target = counterpart(here)[wanted];
  if (wanted !== lang && target) {
    location.replace(target + location.search + location.hash);
  }
})();
