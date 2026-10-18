/* ==========================================================================
   Dreamland – site.js (Bangla Version)
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
  function money(n) { return "৳ " + n.toLocaleString("bn-BD", { maximumFractionDigits: 2 }); }
  function onSubmit(id, fn) { var f = document.getElementById(id); if (f) f.addEventListener("submit", function (e) { e.preventDefault(); fn(f); }); }

  /* 2. HEADER EFFECTS */
  var hdr = $("header"), bar = $("#progress");
  function onScroll() {
    hdr.classList.toggle("scrolled", window.scrollY > 8);
    var m = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.width = (m > 0 ? (window.scrollY / m) * 100 : 0) + "%";
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* 3. PHONE LINKS */
  var mobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) ||
    (navigator.maxTouchPoints > 1 && window.matchMedia("(pointer:coarse)").matches);
  if (!mobile) {
    $$('a[href^="tel:"]').forEach(function (a) {
      a.removeAttribute("href");
      a.classList.add("nodial");
      a.title = "শুধুমাত্র মোবাইল ফোন থেকে কল করা যাবে";
    });
  }

  /* 3b. "COMING SOON" TOAST */
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
    var label = a.classList.contains("store") ? "মোবাইল অ্যাপটি" : (a.getAttribute("aria-label") || a.textContent.trim());
    toast(label + " শীঘ্রই আসছে।");
  });

  /* 4. LOGIN WINDOW */
  var modal = $("#loginModal"), btn = $("#loginBtn"), resetCode = "";
  var views = { login: $("#lf1"), signup: $("#lfS"), forgot: $("#lfF"), done: $("#lf3") };
  var TITLES = { login: "লগইন", signup: "নতুন একাউন্ট তৈরি করুন", forgot: "পাসওয়ার্ড রিসেট", done: "আপনি লগইন অবস্থায় আছেন" };
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
    btn.textContent = u ? ((a && a.name) || u).split(/[\s@]/)[0].slice(0, 12) : "লগইন";
  }
  function step(n) {
    Object.keys(views).forEach(function (k) { views[k].hidden = k !== n; });
    $("#lt").textContent = TITLES[n];
    $$(".err", modal).forEach(function (p) { p.textContent = ""; });
    $(FIRST[n]).focus();
  }
  function openLogin() {
    modal.hidden = false; document.body.classList.add("lock");
    if (user()) $("#lwho").textContent = user();
    $("#lmsg").textContent = ""; step(user() ? "done" : "login");
  }
  function closeLogin() { modal.hidden = true; document.body.classList.remove("lock"); btn.focus(); }
  function signedIn(email) {
    store.set("dl_user", email); paint(); $("#lwho").textContent = email; step("done");
    var u = $("#uEmail"); if (u && !u.value) u.value = email;
  }
  btn.addEventListener("click", openLogin);
  modal.addEventListener("click", function (e) {
    if (e.target === modal || e.target.hasAttribute("data-close")) closeLogin();
    var g = e.target.getAttribute && e.target.getAttribute("data-go"); if (g) step(g);
  });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !modal.hidden) closeLogin(); });

  views.login.addEventListener("submit", function (e) {
    e.preventDefault();
    var em = $("#lemail").value.trim().toLowerCase(), pw = $("#lpass").value, er = $("#lerr1");
    if (!EMAIL.test(em)) { er.textContent = "একটি সঠিক ইমেইল ঠিকানা দিন।"; return; }
    if (!pw) { er.textContent = "আপনার পাসওয়ার্ড লিখুন।"; return; }
    var a = accounts()[em];
    if (!a) { er.textContent = "ভুল ইমেইল বা পাসওয়ার্ড।"; return; }
    sha(a.salt + pw).then(function (h) {
      if (h !== a.hash) { er.textContent = "ভুল ইমেইল বা পাসওয়ার্ড।"; return; }
      er.textContent = ""; $("#lpass").value = ""; signedIn(em);
    });
  });
  views.signup.addEventListener("submit", function (e) {
    e.preventDefault();
    var nm = $("#sname").value.trim(), em = $("#semail").value.trim().toLowerCase(), p1 = $("#spass").value, p2 = $("#spass2").value, er = $("#lerrS");
    if (nm.length < 2) { er.textContent = "আপনার পূর্ণ নাম লিখুন।"; return; }
    if (!EMAIL.test(em)) { er.textContent = "একটি সঠিক ইমেইল ঠিকানা দিন।"; return; }
    if (p1.length < 8) { er.textContent = "পাসওয়ার্ড অন্তত ৮ অক্ষরের হতে হবে।"; return; }
    if (p1 !== p2) { er.textContent = "পাসওয়ার্ড দুটি মেলেনি।"; return; }
    var all = accounts();
    if (all[em]) { er.textContent = "এই ইমেইল দিয়ে ইতিমধ্যে একাউন্ট খোলা আছে। লগইন করুন।"; return; }
    var salt = String(Math.random()).slice(2);
    sha(salt + p1).then(function (h) {
      all[em] = { name: nm, salt: salt, hash: h }; saveAccounts(all);
      views.signup.reset(); signedIn(em);
    });
  });
  views.forgot.addEventListener("submit", function (e) {
    e.preventDefault();
    var em = $("#femail").value.trim().toLowerCase(), er = $("#lerrF"), rest = $("#frest");
    if (rest.hidden) {
      if (!EMAIL.test(em)) { er.textContent = "একটি সঠিক ইমেইল ঠিকানা দিন।"; return; }
      if (!accounts()[em]) { er.textContent = "এই ইমেইলে কোনো একাউন্ট পাওয়া যায়নি।"; return; }
      resetCode = String(Math.floor(100000 + Math.random() * 900000));
      $("#fhint").innerHTML = "ডেমো মোড: টেস্ট রিসেট কোড হলো <b class='code'>" + resetCode + "</b>";
      rest.hidden = false; $("#fbtn").textContent = "পাসওয়ার্ড রিসেট করুন"; er.textContent = ""; $("#fcode").focus();
      return;
    }
    var np = $("#fpass").value;
    if ($("#fcode").value.trim() !== resetCode) { er.textContent = "রিসেট কোডটি ভুল।"; return; }
    if (np.length < 8) { er.textContent = "পাসওয়ার্ড অন্তত ৮ অক্ষরের হতে হবে।"; return; }
    var all = accounts(), salt = String(Math.random()).slice(2);
    sha(salt + np).then(function (h) {
      all[em].salt = salt; all[em].hash = h; saveAccounts(all);
      views.forgot.reset(); rest.hidden = true; $("#fbtn").textContent = "কোড পাঠান";
      step("login"); $("#lmsg").textContent = "পাসওয়ার্ড পরিবর্তিত হয়েছে। লগইন করুন।";
    });
  });
  $("#llogout").addEventListener("click", function () { store.del("dl_user"); paint(); closeLogin(); });
  paint();

  /* 5. REVEAL */
  if (!$("#spot")) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
    }, { threshold: 0.12 });
    $$(".reveal").forEach(function (el) { io.observe(el); });
  }

  $$(".ex").forEach(function (b) {
    b.addEventListener("click", function () {
      var f = b.closest(".tool").querySelector("form"); f.querySelector("input").value = b.dataset.fill;
      f.dispatchEvent(new Event("submit", { cancelable: true }));
    });
  });

  /* 6. PAGE TOOLS */
  var LEASES = {
    "L-1001": { "ইজারাদার": "রহিম উদ্দিন", "প্লট": "P-101", "পরিমাণ": "৯ শতাংশ", "মেয়াদ": "৩০ বছর (২০১৫ থেকে ২০৪৫)", "অবস্থা": "সক্রিয়" },
    "L-1002": { "ইজারাদার": "নাসরিন আক্তার", "প্লট": "P-104", "পরিমাণ": "২ শতাংশ", "মেয়াদ": "১০ বছর (২০১০ থেকে ২০২০)", "অবস্থা": "মেয়াদোত্তীর্ণ" },
    "L-1003": { "ইজারাদার": "করিম ট্রেডার্স", "প্লট": "P-106", "পরিমাণ": "৩ শতাংশ", "মেয়াদ": "২০ বছর (২০২২ থেকে ২০৪২)", "অবস্থা": "সক্রিয়" }
  };
  onSubmit("leaseForm", function () {
    var id = $("#leaseId").value.trim().toUpperCase(), r = LEASES[id];
    if (window.Land && Land.isUid(id)) { $("#leaseRes").innerHTML = Land.leaseHTML(id); return; }
    $("#leaseRes").innerHTML = r
      ? "<h3>" + esc(id) + ' <span class="pill ' + (r["অবস্থা"] === "সক্রিয়" ? "ok" : "bad") + '">' + esc(r["অবস্থা"]) + "</span></h3>" + dl(r)
      : '<p class="err">“' + esc(id) + "” এর জন্য কোনো ইজারা পাওয়া যায়নি। আইডিটি পরিবর্তন করে আবার চেষ্টা করুন।</p>";
  });

  var RATES = { Residential: { Urban: 30, Rural: 15 }, Agricultural: { Urban: 10, Rural: 5 }, Commercial: { Urban: 80, Rural: 40 } };
  onSubmit("taxForm", function () {
    var a = +$("#taxArea").value, y = +$("#taxYears").value || 0, t = $("#taxType").value, z = $("#taxZone").value, o = $("#taxRes");
    if (!(a > 0)) { o.innerHTML = '<p class="err">০ এর চেয়ে বেশি শতাংশ জমির পরিমাণ দিন।</p>'; return; }
    var rate = RATES[t][z], yearly = a * rate, arrears = yearly * y, late = yearly * 0.1 * y;
    var rows = { "হার": money(rate) + " প্রতি শতাংশ", "চলতি বছরের কর": money(yearly) };
    rows["বকায়া (" + y + " বছর)"] = money(arrears); rows["বিলম্ব ফি"] = money(late);
    o.innerHTML = dl(rows) +
      '<p class="total">মোট দেয় পরিমাণ <b>' + money(yearly + arrears + late) + "</b></p>";
  });

  var PLOTS = {
    "P-101": { x: 10, y: 10, w: 150, h: 110, Area: "১২ শতাংশ", Type: "আবাসিক", Area_: "শহরাঞ্চল" },
    "P-102": { x: 170, y: 10, w: 140, h: 110, Area: "১০ শতাংশ", Type: "আবাসিক", Area_: "শহরাঞ্চল" },
    "P-103": { x: 320, y: 10, w: 150, h: 110, Area: "১৫ শতাংশ", Type: "বাণিজ্যিক", Area_: "শহরাঞ্চল" },
    "P-104": { x: 10, y: 130, w: 110, h: 120, Area: "৮ শতাংশ", Type: "কৃষি", Area_: "গ্রামাঞ্চল" },
    "P-105": { x: 130, y: 130, w: 170, h: 120, Area: "২০ শতাংশ", Type: "কৃষি", Area_: "গ্রামাঞ্চল" },
    "P-106": { x: 310, y: 130, w: 160, h: 120, Area: "২৫ শতাংশ", Type: "বাণিজ্যিক", Area_: "শহরাঞ্চল" }
  };
  var sel = $("#plotSel");
  if (sel) {
    var svg = $("#mapSvg");
    sel.innerHTML = Object.keys(PLOTS).map(function (k) { return "<option>" + k + "</option>"; }).join("");
    var pick = function (id) {
      sel.value = id;
      svg.innerHTML = Object.keys(PLOTS).map(function (k) {
        var p = PLOTS[k];
        return '<g class="plot' + (k === id ? " on" : "") + '" data-id="' + k + '" tabindex="0"><rect x="' + p.x + '" y="' + p.y + '" width="' + p.w + '" height="' + p.h + '" rx="10"/><text x="' + (p.x + p.w / 2) + '" y="' + (p.y + p.h / 2 + 5) + '" text-anchor="middle">' + k + "</text></g>";
      }).join("");
      var p = PLOTS[id];
      $("#plotInfo").innerHTML = "<h3>" + id + "</h3>" + dl({ "পরিমাণ": p.Area, "জমির ধরন": p.Type, "অঞ্চল": p.Area_ });
    };
    sel.addEventListener("change", function () { pick(sel.value); });
    svg.addEventListener("click", function (e) { var g = e.target.closest("[data-id]"); if (g) pick(g.dataset.id); });
    svg.addEventListener("keydown", function (e) { var g = e.target.closest("[data-id]"); if (g && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); pick(g.dataset.id); } });
    pick("P-101");
  }

  var CASES = {
    "C-2024-017": { Plot: "P-103", Court: "ঢাকা ল্যান্ড সার্ভে ট্রাইব্যুনাল", Status: "শুনানির তারিখ নির্ধারিত", "Next hearing": "১২ নভেম্বর ২০২৬" },
    "C-2023-201": { Plot: "P-105", Court: "সাভার সহকারী জজ আদালত", Status: "নিষ্পত্তি হয়েছে", "Next hearing": "নাই" },
    "C-2025-044": { Plot: "P-103", Court: "ঢাকা ল্যান্ড সার্ভে ট্রাইব্যুনাল", Status: "বিবেচনাধীন", "Next hearing": "পরবর্তীতে জানানো হবে" }
  };
  onSubmit("caseForm", function () {
    var q = $("#caseQ").value.trim().toUpperCase();
    if (window.Land && Land.isUid(q)) { $("#caseRes").innerHTML = Land.casesHTML(q); return; }
    var hits = Object.keys(CASES).filter(function (k) { return k === q || CASES[k].Plot === q; });
    $("#caseRes").innerHTML = hits.length
      ? hits.map(function (k) { var c = CASES[k]; return "<h3>" + k + ' <span class="pill ' + (c.Status === "নিষ্পত্তি হয়েছে" ? "ok" : "warn") + '">' + esc(c.Status) + "</span></h3>" + dl(c); }).join("")
      : '<p class="err">“' + esc(q) + "” এর জন্য কোনো মামলা পাওয়া যায়নি।</p>";
  });

  var FAQS = [
    ["কীভাবে প্লট পরীক্ষা করব?", "লগইন করুন, হোম পেজ থেকে ম্যাপ বা মামলা অনুসন্ধান খুলুন এবং আপনার প্লট নম্বর প্রদান করুন।"],
    ["ড্রিমল্যান্ড ব্যবহার করা কি সম্পূর্ণ বিনামূল্যে?", "অনুসন্ধান সার্ভিসটি নিখরচায় প্রদান করা হয়। তবে সার্টিফাইড কপির ক্ষেত্রে নির্দিষ্ট ফি প্রযোজ্য।"],
    ["কীভাবে ভূমি উন্নয়ন কর হিসাব করব?", "ল্যান্ড ট্যাক্স পেজে গিয়ে শতাংশে জমির পরিমাণ ও শ্রেণি নির্বাচন করুন। ক্যালকুলেটর সরাসরি আপনার হিসাব দেখিয়ে দেবে।"],
    ["ইউনিক আইডি (UniqueID) কী?", "ইউনিক আইডি হলো ৮ অক্ষরের একটি ডিজিটাল কোড যা ভূমির ভৌগোলিক অবস্থান ও মালিকানার পরিচয় নিশ্চিত করে।"],
    ["এই দাম এবং ঝুঁকির তথ্য কি অফিসিয়াল?", "না, এগুলো সম্ভাব্য নির্দেশক মাত্র। প্রতিটি ক্রয়ের ক্ষেত্রে সংশ্লিষ্ট উপজেলা ভূমি অফিসে তথ্য যাচাই করুন।"],
    ["ইউনিক আইডি আবেদনে কত দিন সময় লাগে?", "সাধারণত ৭ কর্মদিবসের মধ্যে অনুমোদন সম্পন্ন করা হয়।"],
    ["জমি কেনার আগে মামলা আছে কি না কীভাবে দেখব?", "মামলা সার্ভিস পেজে প্লট আইডি লিখে অনুসন্ধান করলেই সম্পর্কিত মামলার তথ্য পেয়ে যাবেন।"],
    ["যেকোনো প্রয়োজনে কার সাথে যোগাযোগ করব?", "ফুটারের প্রদত্ত ইমেইল বা হেল্পলাইন নম্বরে সরাসরি যোগাযোগ করতে পারেন।"]
  ];
  var fl = $("#faqList");
  if (fl) {
    var drawFaq = function () {
      var q = $("#faqQ").value.trim().toLowerCase(), n = 0;
      fl.innerHTML = FAQS.filter(function (f) { return !q || (f[0] + " " + f[1]).toLowerCase().indexOf(q) > -1; })
        .map(function (f) { n++; return '<details class="qa"><summary>' + esc(f[0]) + "</summary><p>" + esc(f[1]) + "</p></details>"; }).join("");
      $("#faqEmpty").hidden = n > 0;
    };
    $("#faqQ").addEventListener("input", drawFaq); drawFaq();
  }

  var uemail = $("#uEmail"); if (uemail && user()) uemail.value = user();
  function apps() { try { return JSON.parse(store.get("dl_apps") || "{}"); } catch (e) { return {}; } }
  onSubmit("uidForm", function (f) {
    var d = { name: $("#uName").value.trim(), email: $("#uEmail").value.trim(), phone: $("#uPhone").value.replace(/[\s-]/g, ""), nid: $("#uNid").value.trim(), dob: $("#uDob").value }, er = [];
    var b = new Date(d.dob);
    if (d.name.length < 3) er.push("আপনার পূর্ণ নাম প্রদান করুন।");
    if (!EMAIL.test(d.email)) er.push("একটি সঠিক ইমেইল ঠিকানা দিন।");
    if (!/^(?:\+?88)?01[3-9]\d{8}$/.test(d.phone)) er.push("সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন (যেমন: 01712345678)।");
    if (!/^(\d{10}|\d{13}|\d{17})$/.test(d.nid)) er.push("এনআইডি নম্বর ১০, ১৩ অথবা ১৭ ডিজিটের হতে হবে।");
    if (!d.dob || isNaN(b) || (Date.now() - b) / 31557600000 < 18) er.push("আবেদনকারীর বয়স অন্তত ১৮ বছর হতে হবে।");
    $("#uidErr").innerHTML = er.map(function (m) { return "<li>" + esc(m) + "</li>"; }).join("");
    if (er.length) return;
    var now = new Date(), ref = "UID-" + now.getFullYear() + String(now.getMonth() + 1).padStart(2, "0") + String(now.getDate()).padStart(2, "0") + "-" + Math.floor(1000 + Math.random() * 9000);
    var all = apps(); all[ref] = { name: d.name, email: d.email, date: now.toLocaleDateString("bn-BD"), status: "গৃহীত হয়েছে" };
    store.set("dl_apps", JSON.stringify(all)); f.reset(); if (uemail && user()) uemail.value = user();
    $("#uidRes").innerHTML = '<div class="success"><h3>আবেদন সফলভাবে সংগৃহীত হয়েছে</h3><p>আপনার ট্র্যাকিং রেফারেন্স নম্বর: <b class="code">' + ref + "</b>। আবেদন ট্র্যাক করতে এই আইডি সংরক্ষণ করুন।</p></div>";
  });
  onSubmit("trackForm", function () {
    var ref = $("#trackRef").value.trim().toUpperCase(), a = apps()[ref];
    $("#trackRes").innerHTML = a
      ? "<h3>" + esc(ref) + ' <span class="pill warn">' + esc(a.status) + "</span></h3>" + dl({ "আবেদনকারী": a.name, "ইমেইল": a.email, "আবেদনের তারিখ": a.date })
      : '<p class="err">“' + esc(ref) + "” রেফারেন্সের কোনো আবেদন পাওয়া যায়নি।</p>";
  });
})();