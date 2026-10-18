/* ==========================================================================
   Dreamland – land.js
   Everything that works from a land UniqueID:
     1. Demo land records (replace with your real database)
     2. Analysis: price outlook, tax due, risk level, buying verdict
     3. Home page search bar -> report window
     4. Land Tax page: look up tax by UniqueID
   Needs geoid.js (the code engine) to be loaded first.
   ========================================================================== */
(function () {
  "use strict";
  if (!window.GeoID) return;
  var G = window.GeoID;

  /* ---------- helpers ---------- */
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function kv(o) { return '<dl class="kv">' + Object.keys(o).map(function (k) { return "<div><dt>" + esc(k) + "</dt><dd>" + esc(o[k]) + "</dd></div>"; }).join("") + "</dl>"; }
  function money(n) { return "৳ " + Math.round(n).toLocaleString("en-BD"); }
  function pct(n) { return (n > 0 ? "+" : n < 0 ? "−" : "") + Math.abs(n) + "%"; }
  function monthYear(d) { return d.toLocaleDateString("en-GB", { month: "long", year: "numeric" }); }

  /* ---------- 1. DEMO RECORDS ----------
     Six real buildings in Savar Bazar, Savar. poly = the building outline as [lat, lng] corners,
     traced from the map, so the plot is highlighted exactly on the building.
     Centre, area, length and width are worked out from the outline (see prepare below).
     monthsBehind = months of land tax not yet paid (0 = paid up).
     cases / lease = court cases and lease linked to the land. news = events that may move the price (%). */
  var DECIMAL_SQM = 40.4686;
  var RATES = { Residential: { Urban: 30, Rural: 15 }, Agricultural: { Urban: 10, Rural: 5 }, Commercial: { Urban: 80, Rural: 40 } };
  var RAW = [
    { poly: [[23.8475333,90.2565734],[23.8472487,90.2566002],[23.8472585,90.2567155],[23.8475137,90.2566941]], place: "Savar Bazar, Savar", type: "Commercial", zone: "Urban", ppd: 3500000, monthsBehind: 0, cases: [],
      lease: { id: "L-1001", lessee: "Rahim Uddin", term: "30 years (2015 to 2045)", status: "Active" },
      news: [{ t: "Savar Bazar road widening is planned", pct: 6 }] },
    { poly: [[23.8481368,90.256855],[23.8481073,90.256686],[23.8479871,90.2567102],[23.8480166,90.2568818]], place: "Savar Bazar, Savar", type: "Commercial", zone: "Urban", ppd: 3000000, monthsBehind: 14,
      cases: [{ id: "C-2024-017", court: "Dhaka Land Survey Tribunal", status: "Hearing scheduled", next: "12 Nov 2026" }],
      news: [{ t: "Strong demand for shops near the bazar", pct: 4 }, { t: "Court dispute may delay any sale", pct: -5 }] },
    { poly: [[23.8480975,90.2572815],[23.8479454,90.2572734],[23.847943,90.2573458],[23.8480975,90.2573458]], place: "Savar Bazar, Savar", type: "Commercial", zone: "Urban", ppd: 2800000, monthsBehind: 6,
      cases: [{ id: "C-2025-044", court: "Dhaka Land Survey Tribunal", status: "Under review", next: "To be announced" }],
      lease: { id: "L-1003", lessee: "Karim Traders", term: "20 years (2022 to 2042)", status: "Active" },
      news: [{ t: "Highway-side shops are in demand", pct: 5 }, { t: "A dispute and a lease may reduce buyer interest", pct: -4 }] },
    { poly: [[23.8481221,90.2561496],[23.8481073,90.256053],[23.8479602,90.2560879],[23.8479773,90.2561818]], place: "Savar Bazar, Savar", type: "Residential", zone: "Urban", ppd: 1600000, monthsBehind: 0, cases: [],
      news: [{ t: "New drainage works are planned nearby", pct: 3 }] },
    { poly: [[23.8473959,90.2570562],[23.847337,90.2570588],[23.847337,90.2571822],[23.8473984,90.2571742]], place: "Savar Bazar, Savar", type: "Commercial", zone: "Urban", ppd: 3100000, monthsBehind: 3, cases: [],
      lease: { id: "L-1002", lessee: "Nasrin Akter", term: "10 years (2010 to 2020)", status: "Expired" },
      news: [{ t: "More people are passing by the bus stand", pct: 5 }] },
    { poly: [[23.8472659,90.2572117],[23.8472634,90.2571098],[23.8471972,90.2571125],[23.8472021,90.2572171]], place: "Savar Bazar, Savar", type: "Residential", zone: "Urban", ppd: 1900000, monthsBehind: 9,
      cases: [{ id: "C-2023-201", court: "Savar Assistant Judge Court", status: "Closed", next: "None" }],
      news: [{ t: "Bus stand upgrade is planned nearby", pct: 4 }] }
  ];

  /* Work out each plot's centre, area and size from its outline (poly), then its UniqueID. */
  var M_LAT = 111319.49;
  function prepare(p) {
    var lat0 = p.poly[0][0], lng0 = p.poly[0][1], kLng = M_LAT * Math.cos(lat0 * Math.PI / 180), n = p.poly.length;
    var pts = p.poly.map(function (q) { return [(q[1] - lng0) * kLng, (q[0] - lat0) * M_LAT]; });
    var A = 0, cx = 0, cy = 0, i, j, cr;
    for (i = 0; i < n; i++) { j = (i + 1) % n; cr = pts[i][0] * pts[j][1] - pts[j][0] * pts[i][1]; A += cr; cx += (pts[i][0] + pts[j][0]) * cr; cy += (pts[i][1] + pts[j][1]) * cr; }
    A /= 2; cx /= 6 * A; cy /= 6 * A;
    p.sqm = Math.abs(A); p.lng = lng0 + cx / kLng; p.lat = lat0 + cy / M_LAT;
    var best = null;                                   // smallest rectangle around the outline = length x width
    for (i = 0; i < n; i++) {
      j = (i + 1) % n;
      var ang = Math.atan2(pts[j][1] - pts[i][1], pts[j][0] - pts[i][0]), c = Math.cos(ang), s = Math.sin(ang);
      var us = pts.map(function (q) { return q[0] * c + q[1] * s; }), vs = pts.map(function (q) { return -q[0] * s + q[1] * c; });
      var w = Math.max.apply(null, us) - Math.min.apply(null, us), h = Math.max.apply(null, vs) - Math.min.apply(null, vs);
      if (!best || w * h < best.a) best = { a: w * h, w: w, h: h };
    }
    p.len = Math.round(Math.max(best.w, best.h) * 10) / 10; p.wid = Math.round(Math.min(best.w, best.h) * 10) / 10;
  }
  var PARCELS = {};
  RAW.forEach(function (p) { prepare(p); p.id = G.encode(p.lat, p.lng); PARCELS[p.id] = p; });

  function lookup(raw) {
    var code = String(raw || "").toUpperCase().replace(/[\s-]/g, "");
    if (!/^[A-Z0-9]{8}$/.test(code) || !G.isValid(code)) return { status: "bad", code: code };
    return PARCELS[code] ? { status: "ok", code: code, p: PARCELS[code] } : { status: "none", code: code };
  }

  /* ---------- 2. ANALYSIS ---------- */
  function analyze(p) {
    var sqm = p.sqm, dec = sqm / DECIMAL_SQM, value = dec * p.ppd;
    var change = p.news.reduce(function (s, n) { return s + n.pct; }, 0);

    var m = p.monthsBehind, yearly = dec * RATES[p.type][p.zone], monthly = yearly / 12;
    var arrears = monthly * m, late = arrears * 0.1 * Math.ceil(m / 12);
    var now = new Date(), paidTo = new Date(now.getFullYear(), now.getMonth() - m, 1);

    // RISK: High only when the land has an open court case or is currently on lease.
    // Anything else (river, flood, tax, price) does not change the risk level.
    var open = p.cases.filter(function (c) { return c.status !== "Closed"; });
    var leased = !!(p.lease && p.lease.status === "Active");
    var f = [], why = [];
    if (open.length) { why.push("an open court case"); f.push(["High", "An open court case is linked to this land (" + open.map(function (c) { return c.id; }).join(", ") + "). Ownership may be disputed."]); }
    if (leased) { why.push("an active lease"); f.push(["High", "The land is currently on lease (" + p.lease.id + ", leased to " + p.lease.lessee + "). The lessee holds rights over it until the lease ends."]); }
    var score = why.length ? 100 : 0;
    var risk = why.length ? { cls: "bad", label: "High risk" } : { cls: "ok", label: "No issues" };
    if (!f.length) f.push(["Clear", "No court case and no lease is linked to this land."]);
    var verdict = why.length ? "High risk. We do not recommend this land while it has " + why.join(" and ") + "."
      : "No issues found. This land has no court case and is not on lease.";

    // Price is NOT part of the risk score. The price outlook is shown on its own.
    var outlook = change > 0 ? "Prices here may rise about " + change + "% over the next 12 months."
      : change < 0 ? "Prices here may fall about " + Math.abs(change) + "% over the next 12 months."
      : "Prices here are expected to stay flat.";

    return { sqm: sqm, dec: dec, value: value, change: change, future: value * (1 + change / 100),
      tax: { yearly: yearly, monthly: monthly, months: m, arrears: arrears, late: late, due: arrears + late, paidTo: paidTo },
      risk: risk, score: score, factors: f, verdict: verdict, outlook: outlook };
  }

  function sec(title, html) { return '<div class="rsec"><h4>' + esc(title) + "</h4>" + html + "</div>"; }
  function taxStatus(a) {
    return a.tax.months ? '<span class="pill bad">' + a.tax.months + " month" + (a.tax.months > 1 ? "s" : "") + " unpaid</span>" : '<span class="pill ok">Paid up to date</span>';
  }
  function taxRows(a) {
    return kv({ "Tax per month": money(a.tax.monthly), "Tax per year": money(a.tax.yearly),
      "Paid up to": a.tax.months ? monthYear(a.tax.paidTo) : "This month", "Months unpaid": String(a.tax.months),
      "Unpaid tax": money(a.tax.arrears), "Late fee": money(a.tax.late) }) +
      '<p class="total">Total to pay now <b>' + money(a.tax.due) + "</b></p>";
  }

  function reportHTML(code, p) {
    var a = analyze(p), ft = G.format(code);
    var drivers = '<ul class="fx">' + p.news.map(function (n) {
      return "<li><b class=\"" + (n.pct > 0 ? "up" : "down") + "\">" + (n.pct > 0 ? "▲ " : "▼ ") + pct(n.pct) + "</b> " + esc(n.t) + "</li>";
    }).join("") + "</ul>";
    var factors = '<ul class="fx">' + a.factors.map(function (x) { return "<li><b>" + x[0] + ":</b> " + esc(x[1]) + "</li>"; }).join("") + "</ul>";
    var cases = p.cases.length ? '<ul class="fx">' + p.cases.map(function (c) { return "<li><b>" + esc(c.id) + "</b> – " + esc(c.status) + " (next hearing: " + esc(c.next) + ")</li>"; }).join("") + "</ul>"
      : "<p>No court case is linked to this plot.</p>";
    return '<div class="rep"><h3>' + ft + ' <span class="pill ' + a.risk.cls + '">' + a.risk.label + "</span></h3>" +
      '<p class="note">' + esc(p.place) + " · " + esc(p.type) + " · " + a.dec.toFixed(1) + " decimal (" + p.len + " m × " + p.wid + " m)</p>" +
      '<div class="verdict ' + a.risk.cls + '">' + esc(a.verdict) + "</div>" +
      sec("Land price", kv({ "Price per decimal": money(p.ppd), "Current value": money(a.value), "Expected change (12 months)": pct(a.change), "Expected value in 12 months": money(a.future) }) +
        "<p>" + esc(a.outlook) + " What may change the price:</p>" + drivers) +
      sec("Land tax", "<p>" + taxStatus(a) + "</p>" + taxRows(a)) +
      sec("Risk check", factors) + sec("Court cases", cases) +
      sec("Lease", p.lease ? "<p>" + esc(p.lease.id) + " – " + esc(p.lease.status) + ". Leased to " + esc(p.lease.lessee) + ", " + esc(p.lease.term) + ".</p>" : "<p>No lease or settlement record is linked to this land.</p>") +
      '<p class="rlinks"><a href="maps.html?id=' + code + '">See it on the map</a> · <a href="tax.html?id=' + code + '">Tax details</a></p>' +
      '<p class="note">Demo data and an indicative guide only. It is not financial or legal advice. Confirm with your Upazila Land Office before you pay or sign.</p></div>';
  }

  function problemHTML(r) {
    var ex = RAW.slice(0, 3).map(function (p) { return G.format(p.id); }).join(", ");
    if (r.status === "bad") return '<p class="err">“' + esc(r.code) + '” is not a valid UniqueID. A UniqueID has 8 letters or digits, for example ' + G.format(RAW[0].id) + ".</p>";
    return "<h3>No record found</h3><p>No land is registered under " + esc(G.format(r.code)) + ". Check the code and try again.</p><p class=\"note\">Demo IDs to try: " + ex + "</p>";
  }

  function isUid(raw) { return /^[A-Z0-9]{4}[-\s]?[A-Z0-9]{4}$/i.test(String(raw).trim()); }
  function casesHTML(raw) {
    var r = lookup(raw);
    if (r.status !== "ok") return problemHTML(r);
    var p = r.p, ft = G.format(r.code);
    if (!p.cases.length) return "<h3>" + ft + ' <span class="pill ok">No cases</span></h3><p>No court case is linked to this plot.</p>';
    return p.cases.map(function (c) {
      return "<h3>" + esc(c.id) + ' <span class="pill ' + (c.status === "Closed" ? "ok" : "warn") + '">' + esc(c.status) + "</span></h3>" +
        kv({ Plot: ft + " (" + p.place + ")", Court: c.court, Status: c.status, "Next hearing": c.next });
    }).join("");
  }
  function leaseHTML(raw) {
    var r = lookup(raw);
    if (r.status !== "ok") return problemHTML(r);
    var p = r.p, ft = G.format(r.code), l = p.lease;
    if (!l) return "<h3>" + ft + ' <span class="pill warn">No lease record</span></h3><p>No lease or settlement record is linked to this plot.</p>';
    return "<h3>" + esc(l.id) + ' <span class="pill ' + (l.status === "Active" ? "ok" : "bad") + '">' + esc(l.status) + "</span></h3>" +
      kv({ Lessee: l.lessee, Plot: ft + " (" + p.place + ")", Area: Math.round(analyze(p).dec) + " decimal", Term: l.term, Status: l.status });
  }

  window.Land = { isUid: isUid, casesHTML: casesHTML, leaseHTML: leaseHTML, lookup: lookup, analyze: analyze, parcels: PARCELS, list: RAW, esc: esc, kv: kv, money: money, reportHTML: reportHTML, problemHTML: problemHTML, DECIMAL_SQM: DECIMAL_SQM };

  /* ---------- 3. HOME PAGE SEARCH BAR ---------- */
  var sb = document.querySelector(".sbar input");
  if (sb) {
    sb.placeholder = "Search land by UniqueID (e.g. " + G.format(RAW[0].id) + ")";
    sb.maxLength = 12;
    sb.setAttribute("aria-label", "Search land by UniqueID");

    var wrap = document.createElement("div");
    wrap.className = "modal"; wrap.hidden = true;
    wrap.innerHTML = '<div class="mbox wide" role="dialog" aria-modal="true" aria-label="Land report"><button class="x" type="button" aria-label="Close" data-idclose>&times;</button><div id="idBody"></div></div>';
    document.body.appendChild(wrap);
    var body = wrap.querySelector("#idBody");

    var close = function () { wrap.hidden = true; document.body.classList.remove("lock"); sb.focus(); };
    var run = function () {
      var q = sb.value.trim();
      if (!q) { sb.focus(); return; }
      var r = lookup(q);
      body.innerHTML = r.status === "ok" ? reportHTML(r.code, r.p) : problemHTML(r);
      wrap.hidden = false; document.body.classList.add("lock");
      wrap.querySelector(".x").focus();
    };
    sb.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); run(); } });
    var icon = sb.parentNode.querySelector("svg");
    if (icon) { icon.style.cursor = "pointer"; icon.addEventListener("click", run); }
    wrap.addEventListener("click", function (e) { if (e.target === wrap || e.target.hasAttribute("data-idclose")) close(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !wrap.hidden) close(); });
  }

  /* ---------- 4. LAND TAX PAGE: LOOK UP BY UNIQUEID ---------- */
  var tf = document.getElementById("taxIdForm");
  if (tf) {
    var out = document.getElementById("taxIdRes");
    var showTax = function (raw) {
      var r = lookup(raw);
      if (r.status !== "ok") { out.innerHTML = problemHTML(r); return; }
      var a = analyze(r.p);
      out.innerHTML = "<h3>" + G.format(r.code) + " " + taxStatus(a) + "</h3>" +
        '<p class="note">' + esc(r.p.place) + " · " + esc(r.p.type) + " · " + a.dec.toFixed(1) + " decimal</p>" + taxRows(a) +
        '<p class="note">Late fee: 10% of the unpaid tax for each year overdue (part of a year counts as a year).</p>';
    };
    tf.addEventListener("submit", function (e) { e.preventDefault(); showTax(document.getElementById("taxIdIn").value); });
    var qid = new URLSearchParams(location.search).get("id");
    if (qid) { document.getElementById("taxIdIn").value = qid; showTax(qid); }
  }
})();
