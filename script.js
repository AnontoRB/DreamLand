/* ==========================================================================
   Dreamland – script.js
   Sections:
     1. Settings (edit scroll targets here; Login now opens the login window, see site.js)
     2. Spotlight carousel + today's date
     3. Features list, filter chips and cards
     4. Reveal on scroll
     5. Click-to-scroll (buttons move you to a section)
   ========================================================================== */
(function () {
  "use strict";

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ------------------------------------------------------------------
     1. SETTINGS
     Which section each kind of button scrolls to. Change the ids freely,
     or set a value to "" to turn that button's scrolling off.
     You can also add data-scroll-to="#some-id" to ANY element in the HTML.
     ------------------------------------------------------------------ */
  var SCROLL = {
    chip: "#projects"    // the filter chips (All / Services / Records / ...)
  };

  /* ------------------------------------------------------------------
     2. SPOTLIGHT CAROUSEL + DATE
     ------------------------------------------------------------------ */
  var slides = [].slice.call(document.querySelectorAll(".slide")),
    dotsBox = document.getElementById("dots"),
    i = 0,
    timer,
    dots = [];

  slides.forEach(function (_, n) {
    var b = document.createElement("button");
    b.type = "button";
    b.setAttribute("aria-label", "Go to slide " + (n + 1));
    b.addEventListener("click", function () { go(n); });
    dotsBox.appendChild(b);
    dots.push(b);
  });

  function go(n) {
    i = (n + slides.length) % slides.length;
    slides.forEach(function (s, k) {
      s.classList.toggle("on", k === i);
      dots[k].classList.toggle("on", k === i);
    });
  }
  function play() {
    if (reduce) return;
    stop();
    timer = setInterval(function () { go(i + 1); }, 6000);
  }
  function stop() { clearInterval(timer); }

  var spot = document.getElementById("spot");
  spot.addEventListener("mouseenter", stop);
  spot.addEventListener("mouseleave", play);
  spot.addEventListener("focusin", stop);
  spot.addEventListener("focusout", play);
  go(0);
  play();

  var dEl = document.getElementById("today"),
    now = new Date();
  dEl.textContent = now.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  dEl.setAttribute(
    "datetime",
    now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0") + "-" + String(now.getDate()).padStart(2, "0")
  );

  /* ------------------------------------------------------------------
     3. FEATURES (edit this list to add / change cards)
     ------------------------------------------------------------------ */
  var projects = [
    { t: "Apply for UniqueID", d: "Apply for your unique ID.", tag: "Services", h: 355, href: "unique-id.html", hot: true },
    { t: "Lease & Settlement", d: "Details of leased and settled land.", tag: "Services", h: 355, href: "lease.html" },
    { t: "Land Tax", d: "Check land tax details and dues.", tag: "Services", h: 350, href: "tax.html" },
    { t: "Land Maps", d: "View plot locations and boundaries.", tag: "Records", h: 358, href: "maps.html" },
    { t: "Land Cases", d: "Check court cases linked to a plot.", tag: "Legal & Help", h: 164, href: "cases.html" },
    { t: "FAQ", d: "Answers to common questions.", tag: "Legal & Help", h: 160, href: "faq.html" }
  ];

  var tags = ["All"],
    state = { tag: "All", q: "" };
  projects.forEach(function (p) {
    if (tags.indexOf(p.tag) < 0) tags.push(p.tag);
  });

  var chips = document.getElementById("chips"),
    grid = document.getElementById("grid"),
    empty = document.getElementById("empty");

  tags.forEach(function (t) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = "chip";
    b.textContent = t;
    b.setAttribute("aria-pressed", t === "All");
    if (SCROLL.chip) b.setAttribute("data-scroll-to", SCROLL.chip);
    b.addEventListener("click", function () {
      state.tag = t;
      [].forEach.call(chips.children, function (c) { c.setAttribute("aria-pressed", c === b); });
      draw();
    });
    chips.appendChild(b);
  });

  var NS = "http://www.w3.org/2000/svg";
  var ICONS = {
    "Lease & Settlement": ["M12 15a4 4 0 1 1-8 0 4 4 0 0 1 8 0z", "M11 12l9-9M16 7l3 3M14 9l2 2"],
    "Land Tax": ["M19 5L5 19", "M7.5 9a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z", "M16.5 18a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z"],
    "Land Maps": ["M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3z", "M9 3v15M15 6v15"],
    "Land Cases": ["M12 3v18M7 21h10M5 7h14", "M5 7l-3 7a3 3 0 0 0 6 0L5 7z", "M19 7l-3 7a3 3 0 0 0 6 0l-3-7z"],
    "Apply for UniqueID": ["M3 6h18v12H3z", "M7.5 11a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z", "M5.5 16c.5-2 4.5-2 5 0", "M13 10h5M13 14h5"],
    "FAQ": ["M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z", "M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 .9-1 1.7", "M12 17h.01"]
  };

  function icon(name) {
    var s = document.createElementNS(NS, "svg");
    s.setAttribute("viewBox", "0 0 24 24");
    s.setAttribute("class", "ico");
    s.setAttribute("aria-hidden", "true");
    (ICONS[name] || []).forEach(function (d) {
      var q = document.createElementNS(NS, "path");
      q.setAttribute("d", d);
      s.appendChild(q);
    });
    return s;
  }

  function draw() {
    grid.textContent = "";
    var n = 0;
    projects.forEach(function (p) {
      if (state.tag !== "All" && p.tag !== state.tag) return;
      if (state.q && (p.t + " " + p.d + " " + p.tag).toLowerCase().indexOf(state.q) < 0) return;
      var c = document.createElement(p.href ? "a" : "article");
      if (p.href) c.href = p.href;
      c.style.setProperty("--i", n);
      c.className = "card";
      if (p.hot) c.className += " hot";
      c.tabIndex = 0;
      c.style.setProperty("--h", p.h);
      var g = document.createElement("span");
      g.className = "tag";
      g.textContent = p.tag;
      var h = document.createElement("h3");
      h.textContent = p.t;
      var d = document.createElement("p");
      d.textContent = p.d;
      c.appendChild(h);
      c.appendChild(d);
      c.appendChild(g);
      c.appendChild(icon(p.t));
      grid.appendChild(c);
      n++;
    });
    empty.hidden = n > 0;
  }
  draw();

  /* ------------------------------------------------------------------
     4. REVEAL ON SCROLL
     ------------------------------------------------------------------ */
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (!e.isIntersecting) return;
      var el = e.target;
      el.classList.add("in");
      io.unobserve(el);
    });
  }, { threshold: 0.2 });
  [].forEach.call(document.querySelectorAll(".reveal"), function (el) { io.observe(el); });

  /* ------------------------------------------------------------------
     5. CLICK-TO-SCROLL
     Any element with data-scroll-to="#id" smoothly scrolls to that
     element when clicked. The sticky header offset is handled in CSS
     (scroll-padding-top), so the target is never hidden under it.
     ------------------------------------------------------------------ */
  var loginBtn = document.querySelector(".login");
  if (loginBtn && SCROLL.login) loginBtn.setAttribute("data-scroll-to", SCROLL.login);

  function scrollToTarget(selector) {
    var target = document.querySelector(selector);
    if (!target) return;
    target.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  }

  document.addEventListener("click", function (e) {
    var trigger = e.target.closest && e.target.closest("[data-scroll-to]");
    if (!trigger) return;
    scrollToTarget(trigger.getAttribute("data-scroll-to"));
  });
})();
