// Small touches for the brandlyft.app pages: sections fade in as they scroll into view.
(function () {
  "use strict";
  var items = document.querySelectorAll(".reveal");
  if (!items.length) return;
  if (!("IntersectionObserver" in window)) {
    for (var i = 0; i < items.length; i++) items[i].classList.add("in");
    return;
  }
  var seen = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) {
        e.target.classList.add("in");
        seen.unobserve(e.target);
      }
    });
  }, { rootMargin: "0px 0px -8% 0px", threshold: 0.12 });
  for (var j = 0; j < items.length; j++) seen.observe(items[j]);
})();
