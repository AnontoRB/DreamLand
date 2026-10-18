/* ==========================================================================
   Dreamland – site.js (loaded on every page)
   Sections: 1 Helpers · 2 Header effects · 3 Phone links · 4 Login window (email + password)
             5 Reveal · 6 Page tools (lease, tax, maps, cases, faq, uid)
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

  /* 2. HEADER EFFECTS: shadow when scrolled + reading progress bar */
  var hdr = $("header"), bar = $("#progress");
  function onScroll() {
    hdr.classList.toggle("scrolled", window.scrollY > 8);
    var m = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.width = (m > 0 ? (window.scrollY / m) * 100 : 0) + "%";
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* 3. PHONE LINKS: dial only on mobile phones */
  var mobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) ||
    (navigator.maxTouchPoints > 1 && window.matchMedia("(pointer:coarse)").matches);
  if (!mobile) {
    $$('a[href^="tel:"]').forEach(function (a) {
      a.removeAttribute("href");
      a.classList.add("nodial");
      a.title = "Calling works on mobile phones";
    });
  }

  /* 3b. "COMING SOON" for links that do not lead anywhere yet (href="#") */
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

  /* 4. LOGIN WINDOW (email + password, sign up, forgot password)
     Demo only: accounts live in this browser (localStorage). A real site needs a server. */
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
    btn.textContent = u ? ((a && a.name) || u).split(/[\s@]/)[0].slice(0, 12) : "Login";
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
    if (!EMAIL.test(em)) { er.textContent = "Please enter a valid email address."; return; }
    if (!pw) { er.textContent = "Please enter your password."; return; }
    var a = accounts()[em];
    if (!a) { er.textContent = "Incorrect email or password."; return; }
    sha(a.salt + pw).then(function (h) {
      if (h !== a.hash) { er.textContent = "Incorrect email or password."; return; }
      er.textContent = ""; $("#lpass").value = ""; signedIn(em);
    });
  });
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
  views.forgot.addEventListener("submit", function (e) {
    e.preventDefault();
    var em = $("#femail").value.trim().toLowerCase(), er = $("#lerrF"), rest = $("#frest");
    if (rest.hidden) {
      if (!EMAIL.test(em)) { er.textContent = "Please enter a valid email address."; return; }
      if (!accounts()[em]) { er.textContent = "No account found with this email."; return; }
      resetCode = String(Math.floor(100000 + Math.random() * 900000));
      $("#fhint").innerHTML = "Demo mode: no email is really sent yet. Your reset code is <b class='code'>" + resetCode + "</b>";
      rest.hidden = false; $("#fbtn").textContent = "Reset password"; er.textContent = ""; $("#fcode").focus();
      return;
    }
    var np = $("#fpass").value;
    if ($("#fcode").value.trim() !== resetCode) { er.textContent = "That code is not correct."; return; }
    if (np.length < 8) { er.textContent = "Password must be at least 8 characters."; return; }
    var all = accounts(), salt = String(Math.random()).slice(2);
    sha(salt + np).then(function (h) {
      all[em].salt = salt; all[em].hash = h; saveAccounts(all);
      views.forgot.reset(); rest.hidden = true; $("#fbtn").textContent = "Send reset code";
      step("login"); $("#lmsg").textContent = "Password changed. Please log in.";
    });
  });
  $("#llogout").addEventListener("click", function () { store.del("dl_user"); paint(); closeLogin(); });
  paint();

  /* 5. REVEAL (inner pages; the home page does this in script.js) */
  if (!$("#spot")) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
    }, { threshold: 0.12 });
    $$(".reveal").forEach(function (el) { io.observe(el); });
  }

  /* example buttons: fill the form and search */
  $$(".ex").forEach(function (b) {
    b.addEventListener("click", function () {
      var f = b.closest(".tool").querySelector("form"); f.querySelector("input").value = b.dataset.fill;
      f.dispatchEvent(new Event("submit", { cancelable: true }));
    });
  });

  /* 6. PAGE TOOLS */
  var LEASES = {
    "L-1001": { Lessee: "Rahim Uddin", Plot: "P-101", Area: "9 decimal", Term: "30 years (2015 to 2045)", Status: "Active" },
    "L-1002": { Lessee: "Nasrin Akter", Plot: "P-104", Area: "2 decimal", Term: "10 years (2010 to 2020)", Status: "Expired" },
    "L-1003": { Lessee: "Karim Traders", Plot: "P-106", Area: "3 decimal", Term: "20 years (2022 to 2042)", Status: "Active" }
  };
  onSubmit("leaseForm", function () {
    var id = $("#leaseId").value.trim().toUpperCase(), r = LEASES[id];
    if (window.Land && Land.isUid(id)) { $("#leaseRes").innerHTML = Land.leaseHTML(id); return; }
    $("#leaseRes").innerHTML = r
      ? "<h3>" + esc(id) + ' <span class="pill ' + (r.Status === "Active" ? "ok" : "bad") + '">' + esc(r.Status) + "</span></h3>" + dl(r)
      : '<p class="err">No lease found for “' + esc(id) + "”. Check the ID and try again.</p>";
  });

  var RATES = { Residential: { Urban: 30, Rural: 15 }, Agricultural: { Urban: 10, Rural: 5 }, Commercial: { Urban: 80, Rural: 40 } };
  onSubmit("taxForm", function () {
    var a = +$("#taxArea").value, y = +$("#taxYears").value || 0, t = $("#taxType").value, z = $("#taxZone").value, o = $("#taxRes");
    if (!(a > 0)) { o.innerHTML = '<p class="err">Enter a land area greater than 0.</p>'; return; }
    var rate = RATES[t][z], yearly = a * rate, arrears = yearly * y, late = yearly * 0.1 * y;
    var rows = { "Rate": money(rate) + " per decimal", "Tax for this year": money(yearly) };
    rows["Arrears (" + y + " yr)"] = money(arrears); rows["Late fee"] = money(late);
    o.innerHTML = dl(rows) +
      '<p class="total">Total due <b>' + money(yearly + arrears + late) + "</b></p>";
  });

  var PLOTS = {
    "P-101": { x: 10, y: 10, w: 150, h: 110, Area: "12 decimal", Type: "Residential", Area_: "Urban" },
    "P-102": { x: 170, y: 10, w: 140, h: 110, Area: "10 decimal", Type: "Residential", Area_: "Urban" },
    "P-103": { x: 320, y: 10, w: 150, h: 110, Area: "15 decimal", Type: "Commercial", Area_: "Urban" },
    "P-104": { x: 10, y: 130, w: 110, h: 120, Area: "8 decimal", Type: "Agricultural", Area_: "Rural" },
    "P-105": { x: 130, y: 130, w: 170, h: 120, Area: "20 decimal", Type: "Agricultural", Area_: "Rural" },
    "P-106": { x: 310, y: 130, w: 160, h: 120, Area: "25 decimal", Type: "Commercial", Area_: "Urban" }
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
      $("#plotInfo").innerHTML = "<h3>" + id + "</h3>" + dl({ Area: p.Area, "Land type": p.Type, Zone: p.Area_ });
    };
    sel.addEventListener("change", function () { pick(sel.value); });
    svg.addEventListener("click", function (e) { var g = e.target.closest("[data-id]"); if (g) pick(g.dataset.id); });
    svg.addEventListener("keydown", function (e) { var g = e.target.closest("[data-id]"); if (g && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); pick(g.dataset.id); } });
    pick("P-101");
  }

  var CASES = {
    "C-2024-017": { Plot: "P-103", Court: "Dhaka Land Survey Tribunal", Status: "Hearing scheduled", "Next hearing": "12 Nov 2026" },
    "C-2023-201": { Plot: "P-105", Court: "Savar Assistant Judge Court", Status: "Closed", "Next hearing": "None" },
    "C-2025-044": { Plot: "P-103", Court: "Dhaka Land Survey Tribunal", Status: "Under review", "Next hearing": "To be announced" }
  };
  onSubmit("caseForm", function () {
    var q = $("#caseQ").value.trim().toUpperCase();
    if (window.Land && Land.isUid(q)) { $("#caseRes").innerHTML = Land.casesHTML(q); return; }
    var hits = Object.keys(CASES).filter(function (k) { return k === q || CASES[k].Plot === q; });
    $("#caseRes").innerHTML = hits.length
      ? hits.map(function (k) { var c = CASES[k]; return "<h3>" + k + ' <span class="pill ' + (c.Status === "Closed" ? "ok" : "warn") + '">' + esc(c.Status) + "</span></h3>" + dl(c); }).join("")
      : '<p class="err">No case found for “' + esc(q) + "”.</p>";
  });

  var FAQS = [
    ["How do I check a plot?", "Log in, open Land Maps or Land Cases from the home page, and enter the plot or case number."],
    ["Is Dreamland free to use?", "Searching is free. Some services, such as map copies, have a small fee in Bangladeshi Taka (৳). See the Land service fee list under About."],
    ["How do I pay land tax?", "Open Land Tax, enter your land area in decimals and the land type, and the calculator shows the land development tax you owe."],
    ["What is a UniqueID?", "A UniqueID is an 8-character code (letters and numbers) that identifies one piece of land by its location. Type it in the search bar on the home page to see its price, tax status and risk."],
    ["Is the price and risk information official?", "No. The price outlook and risk level are an indicative guide only. Always confirm with your Upazila Land Office and a lawyer before you pay or sign."],
    ["How long does a UniqueID application take?", "About 7 days. Use the Track box on the Apply for UniqueID page to see your status."],
    ["Can I check a land case before buying?", "Yes. Search by plot ID on the Land Cases page to see any court case linked to the plot."],
    ["Who can I contact for help?", "Use the email or phone number in the footer. On a phone, tap the number to call. You can also visit your Upazila Land Office."]
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
    if (d.name.length < 3) er.push("Enter your full name.");
    if (!EMAIL.test(d.email)) er.push("Enter a valid email address.");
    if (!/^(?:\+?88)?01[3-9]\d{8}$/.test(d.phone)) er.push("Enter a valid Bangladesh mobile number, e.g. 01712345678.");
    if (!/^(\d{10}|\d{13}|\d{17})$/.test(d.nid)) er.push("NID number must be 10, 13 or 17 digits.");
    if (!d.dob || isNaN(b) || (Date.now() - b) / 31557600000 < 18) er.push("You must be 18 or older.");
    $("#uidErr").innerHTML = er.map(function (m) { return "<li>" + esc(m) + "</li>"; }).join("");
    if (er.length) return;
    var now = new Date(), ref = "UID-" + now.getFullYear() + String(now.getMonth() + 1).padStart(2, "0") + String(now.getDate()).padStart(2, "0") + "-" + Math.floor(1000 + Math.random() * 9000);
    var all = apps(); all[ref] = { name: d.name, email: d.email, date: now.toLocaleDateString("en-GB"), status: "Received" };
    store.set("dl_apps", JSON.stringify(all)); f.reset(); if (uemail && user()) uemail.value = user();
    $("#uidRes").innerHTML = '<div class="success"><h3>Application received</h3><p>Your reference number is <b class="code">' + ref + "</b>. Keep it to track your application.</p></div>";
  });
  onSubmit("trackForm", function () {
    var ref = $("#trackRef").value.trim().toUpperCase(), a = apps()[ref];
    $("#trackRes").innerHTML = a
      ? "<h3>" + esc(ref) + ' <span class="pill warn">' + esc(a.status) + "</span></h3>" + dl({ Name: a.name, Email: a.email, "Applied on": a.date })
      : '<p class="err">No application found for “' + esc(ref) + "” in this browser.</p>";
  });
})();
