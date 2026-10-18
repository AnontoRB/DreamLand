/* ==========================================================================
   Dreamland – site.js (loaded on every page)
   ========================================================================== */
(function () {
  "use strict";
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };
  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
    del: function (k) { try { localStorage.removeItem(k); } catch (e) {} }
  };
  var EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function dl(o) { return '<dl class="kv">' + Object.keys(o).map(function (k) { return "<div><dt>" + esc(k) + "</dt><dd>" + esc(o[k]) + "</dd></div>"; }).join("") + "</dl>"; }
  function money(n) { return "৳ " + n.toLocaleString("en-BD", { maximumFractionDigits: 2 }); }
  function onSubmit(id, fn) { var f = document.getElementById(id); if (f) f.addEventListener("submit", function (e) { e.preventDefault(); fn(f); }); }

  /* ------------------------------------------------------------------
     HEADER EFFECTS & SPOTLIGHT CAROUSEL
     ------------------------------------------------------------------ */
  var hdr = $("header"), bar = $("#progress");
  function onScroll() {
    hdr.classList.toggle("scrolled", window.scrollY > 8);
    var m = document.documentElement.scrollHeight - window.innerHeight;
    if (bar) bar.style.width = (m > 0 ? (window.scrollY / m) * 100 : 0) + "%";
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  var spot = $("#spot");
  if (spot) {
    var slides = $$(".slide", spot), dotsWrap = $("#dots"), currentSlide = 0, slideTimer;
    if (dotsWrap && slides.length) {
      dotsWrap.innerHTML = slides.map(function (_, i) {
        return '<button type="button" aria-label="Slide ' + (i + 1) + '"' + (i === 0 ? ' class="on"' : "") + "></button>";
      }).join("");
      var dotBtns = $$("button", dotsWrap);
      var showSlide = function (idx) {
        slides[currentSlide].classList.remove("on");
        dotBtns[currentSlide].classList.remove("on");
        currentSlide = (idx + slides.length) % slides.length;
        slides[currentSlide].classList.add("on");
        dotBtns[currentSlide].classList.add("on");
      };
      var nextSlide = function () { showSlide(currentSlide + 1); };
      slideTimer = setInterval(nextSlide, 5000);
      spot.addEventListener("mouseenter", function () { clearInterval(slideTimer); });
      spot.addEventListener("mouseleave", function () { slideTimer = setInterval(nextSlide, 5000); });
      dotBtns.forEach(function (btn, idx) {
        btn.addEventListener("click", function () { showSlide(idx); });
      });
    }

    var todayEl = $("#today");
    if (todayEl) {
      var d = new Date();
      todayEl.textContent = d.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "short", day: "numeric" });
    }

    var sbarInput = $(".sbar input", spot);
    if (sbarInput) {
      sbarInput.addEventListener("keydown", function (e) {
        if (e.key === "Enter") {
          var val = sbarInput.value.trim().toUpperCase();
          if (val) {
            window.location.href = "maps.html?uid=" + encodeURIComponent(val);
          }
        }
      });
    }
  }

  /* ------------------------------------------------------------------
     PHONE LINKS & TOASTS
     ------------------------------------------------------------------ */
  var mobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) ||
    (navigator.maxTouchPoints > 1 && window.matchMedia("(pointer:coarse)").matches);
  if (!mobile) {
    $$('a[href^="tel:"]').forEach(function (a) {
      a.removeAttribute("href");
      a.classList.add("nodial");
      a.title = "Calling works on mobile phones";
    });
  }

  var toastEl = document.createElement("div"), toastTimer;
  toastEl.className = "toast"; toastEl.setAttribute("role", "status"); toastEl.setAttribute("aria-live", "polite");
  document.body.appendChild(toastEl);
  function toast(msg) {
    toastEl.textContent = msg; toastEl.classList.add("show");
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { toastEl.classList.remove("show"); }, 2600);
  }
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest('a[href="#"]');
    if (!a) return;
    e.preventDefault();
    var label = a.classList.contains("store") ? "The mobile app" : (a.getAttribute("aria-label") || a.textContent.trim());
    toast(label + " is coming soon.");
  });

  /* ------------------------------------------------------------------
     LOGIN MODAL
     ------------------------------------------------------------------ */
  var modal = $("#loginModal"), btn = $("#loginBtn"), resetCode = "";
  var views = { login: $("#lf1"), signup: $("#lfS"), forgot: $("#lfF"), done: $("#lf3") };
  var TITLES = { login: "Login", signup: "Create your account", forgot: "Reset your password", done: "You are logged in" };
  var FIRST = { login: "#lemail", signup: "#sname", forgot: "#femail", done: "#llogout" };
  function sha(s) {
    if (window.crypto && crypto.subtle && window.TextEncoder) {
      return crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)).then(function (b) {
        return [].map.call(new Uint8Array(b), function (x) { return x.toString(16).padStart(2, "0"); }).join("");
      });
    }
    var h = 5381; for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
    return Promise.resolve("x" + (h >>> 0).toString(16));
  }
  function accounts() { try { return JSON.parse(store.get("dl_accounts") || "{}"); } catch (e) { return {}; } }
  function saveAccounts(a) { store.set("dl_accounts", JSON.stringify(a)); }
  function user() { return store.get("dl_user"); }
  function paint() {
    var u = user(), a = u && accounts()[u];
    if (btn) btn.textContent = u ? ((a && a.name) || u).split(/[\s@]/)[0].slice(0, 12) : (store.get("dl_lang") === "bn" ? "লগইন" : "Login");
  }
  function step(n) {
    Object.keys(views).forEach(function (k) { if (views[k]) views[k].hidden = k !== n; });
    var ltEl = $("#lt"); if (ltEl) ltEl.textContent = TITLES[n];
    if (modal) $$(".err", modal).forEach(function (p) { p.textContent = ""; });
    var firstEl = $(FIRST[n]); if (firstEl) firstEl.focus();
  }
  function openLogin() {
    if (!modal) return;
    modal.hidden = false; document.body.classList.add("lock");
    var lwhoEl = $("#lwho"); if (user() && lwhoEl) lwhoEl.textContent = user();
    var lmsgEl = $("#lmsg"); if (lmsgEl) lmsgEl.textContent = "";
    step(user() ? "done" : "login");
  }
  function closeLogin() {
    if (!modal) return;
    modal.hidden = true; document.body.classList.remove("lock"); if (btn) btn.focus();
  }
  function signedIn(email) {
    store.set("dl_user", email); paint();
    var lwhoEl = $("#lwho"); if (lwhoEl) lwhoEl.textContent = email;
    step("done");
    var u = $("#uEmail"); if (u && !u.value) u.value = email;
  }
  if (btn) btn.addEventListener("click", openLogin);
  if (modal) {
    modal.addEventListener("click", function (e) {
      if (e.target === modal || e.target.hasAttribute("data-close")) closeLogin();
      var g = e.target.getAttribute && e.target.getAttribute("data-go"); if (g) step(g);
    });
  }
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && modal && !modal.hidden) closeLogin(); });

  if (views.login) {
    views.login.addEventListener("submit", function (e) {
      e.preventDefault();
      var em = $("#lemail").value.trim().toLowerCase(), pw = $("#lpass").value, er = $("#lerr1");
      if (!EMAIL.test(em)) { er.textContent = "Please enter a valid email address."; return; }
      if (!pw) { er.textContent = "Please enter your password."; return; }
      var a = accounts()[em];
      if (!a) { er.textContent = "Incorrect email or password."; return; }
      sha(a.salt + pw).then(function (h) {
        if (h !== a.hash) { er.textContent = "Incorrect email or password."; return; }
        er.textContent = ""; $("#lpass").value = ""; signedIn(em);
      });
    });
  }
  if (views.signup) {
    views.signup.addEventListener("submit", function (e) {
      e.preventDefault();
      var nm = $("#sname").value.trim(), em = $("#semail").value.trim().toLowerCase(), p1 = $("#spass").value, p2 = $("#spass2").value, er = $("#lerrS");
      if (nm.length < 2) { er.textContent = "Please enter your full name."; return; }
      if (!EMAIL.test(em)) { er.textContent = "Please enter a valid email address."; return; }
      if (p1.length < 8) { er.textContent = "Password must be at least 8 characters."; return; }
      if (p1 !== p2) { er.textContent = "The two passwords do not match."; return; }
      var all = accounts();
      if (all[em]) { er.textContent = "An account with this email already exists. Please log in."; return; }
      var salt = String(Math.random()).slice(2);
      sha(salt + p1).then(function (h) {
        all[em] = { name: nm, salt: salt, hash: h }; saveAccounts(all);
        views.signup.reset(); signedIn(em);
      });
    });
  }
  if (views.forgot) {
    views.forgot.addEventListener("submit", function (e) {
      e.preventDefault();
      var em = $("#femail").value.trim().toLowerCase(), er = $("#lerrF"), rest = $("#frest");
      if (rest.hidden) {
        if (!EMAIL.test(em)) { er.textContent = "Please enter a valid email address."; return; }
        if (!accounts()[em]) { er.textContent = "No account found with this email."; return; }
        resetCode = String(Math.floor(100000 + Math.random() * 900000));
        var fhintEl = $("#fhint"); if (fhintEl) fhintEl.innerHTML = "Demo mode: no email is really sent yet. Your reset code is <b class='code'>" + resetCode + "</b>";
        rest.hidden = false; var fbtnEl = $("#fbtn"); if (fbtnEl) fbtnEl.textContent = "Reset password"; er.textContent = ""; var fcodeEl = $("#fcode"); if (fcodeEl) fcodeEl.focus();
        return;
      }
      var np = $("#fpass").value;
      var fcodeEl2 = $("#fcode");
      if (fcodeEl2 && fcodeEl2.value.trim() !== resetCode) { er.textContent = "That code is not correct."; return; }
      if (np.length < 8) { er.textContent = "Password must be at least 8 characters."; return; }
      var all = accounts(), salt = String(Math.random()).slice(2);
      sha(salt + np).then(function (h) {
        all[em].salt = salt; all[em].hash = h; saveAccounts(all);
        views.forgot.reset(); rest.hidden = true; var fbtnEl2 = $("#fbtn"); if (fbtnEl2) fbtnEl2.textContent = "Send reset code";
        step("login"); var lmsgEl = $("#lmsg"); if (lmsgEl) lmsgEl.textContent = "Password changed. Please log in.";
      });
    });
  }
  var logoutBtn = $("#llogout");
  if (logoutBtn) logoutBtn.addEventListener("click", function () { store.del("dl_user"); paint(); closeLogin(); });
  paint();

  /* ------------------------------------------------------------------
     FEATURE CARDS GRID & RENDERING
     ------------------------------------------------------------------ */
  if (!$("#spot")) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
    }, { threshold: 0.12 });
    $$(".reveal").forEach(function (el) { io.observe(el); });
  }

  var FEATURES_DATA = [
    { key: "card1", id: "unique-id", rawTag: "Services", link: "unique-id.html" },
    { key: "card2", id: "lease", rawTag: "Services", link: "lease.html" },
    { key: "card3", id: "tax", rawTag: "Services", link: "tax.html" },
    { key: "card4", id: "maps", rawTag: "Records", link: "maps.html" },
    { key: "card5", id: "cases", rawTag: "Legal & Help", link: "cases.html" },
    { key: "card6", id: "faq", rawTag: "Legal & Help", link: "faq.html" }
  ];

  var activeCategory = "All";

  function renderHomeGrid() {
    var grid = $("#grid"), chips = $("#chips");
    if (!grid || !chips) return;
    var lang = store.get("dl_lang") || "en";
    var t = TRANSLATIONS[lang];

    var rawCategories = ["All", "Services", "Records", "Legal & Help"];
    chips.innerHTML = rawCategories.map(function (cat) {
      var label = t.categories[cat] || cat;
      return '<button type="button" class="chip' + (cat === activeCategory ? " on" : "") + '" data-cat="' + cat + '">' + esc(label) + "</button>";
    }).join("");

    $$(".chip", chips).forEach(function (btn) {
      btn.addEventListener("click", function () {
        activeCategory = btn.dataset.cat;
        renderHomeGrid();
      });
    });

    var filtered = FEATURES_DATA.filter(function (item) {
      return activeCategory === "All" || item.rawTag === activeCategory;
    });

    grid.innerHTML = filtered.map(function (item) {
      var cardInfo = t.cards[item.key] || {};
      var tagLabel = t.categories[item.rawTag] || item.rawTag;
      return '<a class="card" href="' + item.link + '">' +
             '<span class="pill">' + esc(tagLabel) + '</span>' +
             '<h3>' + esc(cardInfo.title || "") + '</h3>' +
             '<p>' + esc(cardInfo.desc || "") + '</p>' +
             '</a>';
    }).join("");

    var emptyEl = $("#empty");
    if (emptyEl) emptyEl.hidden = filtered.length > 0;
  }

  /* ------------------------------------------------------------------
     BILINGUAL TRANSLATIONS & SWITCHER
     ------------------------------------------------------------------ */
  var TRANSLATIONS = {
    en: {
      home: "Home",
      about: "About",
      objective: "Objective",
      howToUse: "How to use the website",
      benefits: "Benefits of the website",
      laws: "Laws and regulations",
      fees: "Land service fee",
      login: "Login",
      searchPlaceholder: "Search land by UniqueID",
      featuresTitle: "Features",
      emptyGroup: "No features in this group yet. Choose All to see every feature.",
      slide1: "Verify all land ownership records\nbefore you buy.",
      slide2: "Know your exact land boundaries\nand stay secure.",
      slide3: "Check active court cases instantly\nto avoid risks.",
      slide4: "Access official land tax details\nand payments.",
      slide5: "Secure property investments today\nwith UniqueIDs.",
      categories: {
        "All": "All",
        "Services": "Services",
        "Records": "Records",
        "Legal & Help": "Legal & Help"
      },
      cards: {
        card1: { title: "Apply for UniqueID", desc: "Apply for a unique property code and track its verification status." },
        card2: { title: "Lease & Settlement", desc: "Check government lease records, allotments, and settlement terms." },
        card3: { title: "Land Tax", desc: "Calculate land development tax, check arrears, and view payment rates." },
        card4: { title: "Land Maps", desc: "Browse digital Mouza maps, boundary layouts, and plot numbers." },
        card5: { title: "Land Cases", desc: "Check active land dispute cases, tribunal statuses, and hearing dates." },
        card6: { title: "FAQ", desc: "Find answers to common questions regarding land laws and verification." }
      },
      footerPlan: "In planning and implementation",
      footerTeam: "Procrastinators",
      footerDesc: "Doing it today, not tomorrow.",
      footerSupport: "Support and policy",
      footerPrivacy: "Privacy Policy",
      footerInquiries: "General inquiries",
      footerHelp: "Need help?",
      footerApp: "Download the app",
      footerSocial: "Social communication",
      footerCopy: "Developed by Team Procrastinators."
    },
    bn: {
      home: "হোম",
      about: "সম্পর্কিত",
      objective: "উদ্দেশ্য",
      howToUse: "ওয়েবসাইট কীভাবে ব্যবহার করবেন",
      benefits: "ওয়েবসাইটের সুবিধাসমূহ",
      laws: "আইন ও বিধিমালা",
      fees: "ভূমি সেবা ফি",
      login: "লগইন",
      searchPlaceholder: "ইউনিক আইডি দিয়ে জমি খুঁজুন",
      featuresTitle: "বৈশিষ্ট্যসমূহ",
      emptyGroup: "এই গ্রুপে এখনও কোনো বৈশিষ্ট্য নেই। সব দেখতে 'সব' নির্বাচন করুন।",
      slide1: "কেনার আগে সমস্ত জমি মালিকানার\nরেকর্ড যাচাই করুন।",
      slide2: "আপনার সঠিক জমির সীমানা জানুন\nএবং সুরক্ষিত থাকুন।",
      slide3: "ঝুঁকি এড়াতে তাৎক্ষণিকভাবে\nচলমান আদালতের মামলাগুলো দেখুন।",
      slide4: "অফিসিয়াল ভূমি উন্নয়ন কর\nএবং পেমেন্টের তথ্য দেখুন।",
      slide5: "ইউনিক আইডি ব্যবহার করে\nআজই সম্পত্তি বিনিয়োগ সুরক্ষিত করুন।",
      categories: {
        "All": "সব",
        "Services": "সেবাসমূহ",
        "Records": "রেকর্ডসমূহ",
        "Legal & Help": "আইন ও সহায়তা"
      },
      cards: {
        card1: { title: "ইউনিক আইডির জন্য আবেদন", desc: "অনন্য সম্পত্তি কোডের জন্য আবেদন করুন এবং এর যাচাইকরণ অবস্থা ট্র্যাক করুন।" },
        card2: { title: "লিজ ও বন্দোবস্ত", desc: "সরকারি লিজের রেকর্ড, বরাদ্দ এবং বন্দোবস্তের শর্তাবলী পরীক্ষা করুন।" },
        card3: { title: "ভূমি উন্নয়ন কর", desc: "ভূমি উন্নয়ন কর গণনা করুন, বকেয়া পরীক্ষা করুন এবং পেমেন্ট হার দেখুন।" },
        card4: { title: "জমির মানচিত্র", desc: "ডিজিটাল মৌজা মানচিত্র, সীমানা লেআউট এবং প্লট নম্বর ব্রাউজ করুন।" },
        card5: { title: "ভূমি মামলা", desc: "সক্রিয় ভূমি বিরোধ মামলা, ট্রাইব্যুনাল অবস্থা এবং শুনানির তারিখ পরীক্ষা করুন।" },
        card6: { title: "সচরাচর জিজ্ঞাসা", desc: "ভূমি আইন এবং যাচাইকরণ সম্পর্কিত সাধারণ প্রশ্নগুলির উত্তর খুঁজুন।" }
      },
      footerPlan: "পরিকল্পনা ও বাস্তবায়নে",
      footerTeam: "প্রোকাস্টিনেটরস",
      footerDesc: "আজই করুন, আগামীকাল নয়।",
      footerSupport: "সহায়তা ও নীতি",
      footerPrivacy: "গোপনীয়তা নীতি",
      footerInquiries: "সাধারণ জিজ্ঞাসা",
      footerHelp: "সহায়তা প্রয়োজন?",
      footerApp: "অ্যাপ ডাউনলোড করুন",
      footerSocial: "সামাজিক যোগাযোগ",
      footerCopy: "ডেভেলপ করেছেন টিম প্রোকাস্টিনেটরস।"
    }
  };

  function applyLanguage(lang) {
    store.set("dl_lang", lang);
    document.documentElement.setAttribute("lang", lang);
    
    $$("[data-i18n]").forEach(function(el) {
      var key = el.getAttribute("data-i18n");
      if (TRANSLATIONS[lang] && TRANSLATIONS[lang][key]) {
        var text = TRANSLATIONS[lang][key];
        if (text.indexOf("\n") > -1) {
          el.innerHTML = esc(text).replace(/\n/g, "<br>");
        } else {
          el.textContent = text;
        }
      }
    });

    var searchInput = $(".sbar input, input[type='search'], #faqQ");
    if (searchInput && TRANSLATIONS[lang].searchPlaceholder) {
      searchInput.placeholder = TRANSLATIONS[lang].searchPlaceholder;
    }

    var langBtn = $("#langBtn");
    if (langBtn) {
      langBtn.textContent = (lang === "en") ? "বাংলা" : "English";
    }

    renderHomeGrid();
    paint();
  }

  var currentLang = store.get("dl_lang") || "en";
  applyLanguage(currentLang);

  var langBtnEl = $("#langBtn");
  if (langBtnEl) {
    langBtnEl.addEventListener("click", function() {
      currentLang = (currentLang === "en") ? "bn" : "en";
      applyLanguage(currentLang);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", renderHomeGrid);
  } else {
    renderHomeGrid();
  }
})();