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
     lat/lng = centre of the plot (its UniqueID is made from this).
     len/wid = plot size in metres, rot = direction of the length side (degrees from north).
     monthsBehind = months of land tax not yet paid (0 = paid up).
     water = nearest river/sea {km, name}; flood / erosion = known hazards.
     news = recent events and how much each may move the price (%). */
  var DECIMAL_SQM = 40.4686;
  var RATES = { Residential: { Urban: 30, Rural: 15 }, Agricultural: { Urban: 10, Rural: 5 }, Commercial: { Urban: 80, Rural: 40 } };
  var RAW = [
    { lat: 23.84760823781365, lng: 90.25676245983189, place: "Savar, Dhaka", type: "Residential", zone: "Urban", len: 22.5, wid: 18, rot: 20, ppd: 700000, monthsBehind: 0,
      water: { km: 0.4, name: "Bangshi River" }, flood: false, erosion: true,
      cases: [{ id: "C-2023-201", court: "Savar Assistant Judge Court", status: "Closed", next: "None" }],
      lease: { id: "L-1001", lessee: "Rahim Uddin", term: "30 years (2015 to 2045)", status: "Active" },
      news: [{ t: "A new link road is planned close to this area", pct: 8 }] },
    { lat: 23.8759, lng: 90.3795, place: "Uttara, Dhaka", type: "Commercial", zone: "Urban", len: 30, wid: 20, rot: 0, ppd: 2500000, monthsBehind: 0,
      water: { km: 4.5, name: "Turag River" }, flood: false, erosion: false, cases: [],
      news: [{ t: "Strong demand for shop and office space", pct: 5 }] },
    { lat: 24.0023, lng: 90.4264, place: "Gazipur", type: "Agricultural", zone: "Rural", len: 40, wid: 30, rot: 35, ppd: 350000, monthsBehind: 14,
      water: { km: 1.6, name: "Turag River" }, flood: false, erosion: false, cases: [{ id: "C-2024-017", court: "Dhaka Land Survey Tribunal", status: "Hearing scheduled", next: "12 Nov 2026" },
               { id: "C-2025-044", court: "Dhaka Land Survey Tribunal", status: "Under review", next: "To be announced" }],
      news: [{ t: "Expressway interchange proposed about 3 km away", pct: 10 }, { t: "Court dispute may delay any sale", pct: -5 }] },
    { lat: 24.8949, lng: 91.8687, place: "Sylhet", type: "Residential", zone: "Urban", len: 20.2, wid: 16, rot: 70, ppd: 900000, monthsBehind: 3,
      water: { km: 0.9, name: "Surma River" }, flood: true, erosion: false, cases: [],
      lease: { id: "L-1002", lessee: "Nasrin Akter", term: "10 years (2010 to 2020)", status: "Expired" },
      news: [{ t: "Drainage upgrade planned for the neighbourhood", pct: 3 }] },
    { lat: 21.4272, lng: 92.0058, place: "Cox’s Bazar", type: "Residential", zone: "Urban", len: 24, wid: 20, rot: 0, ppd: 1800000, monthsBehind: 7,
      water: { km: 3, name: "Bay of Bengal" }, flood: true, erosion: true, cases: [],
      news: [{ t: "Tourism growth is lifting demand", pct: 8 }] },
    { lat: 22.3569, lng: 91.7832, place: "Chattogram", type: "Commercial", zone: "Urban", len: 40.4, wid: 25, rot: 90, ppd: 3000000, monthsBehind: 0,
      water: { km: 2.4, name: "Karnaphuli River" }, flood: false, erosion: false, cases: [],
      lease: { id: "L-1003", lessee: "Karim Traders", term: "20 years (2022 to 2042)", status: "Active" },
      news: [{ t: "Road widening near the port area", pct: 7 }, { t: "Traffic limits on the main road", pct: -2 }] }
  ];
  var PARCELS = {};
  RAW.forEach(function (p) { p.id = G.encode(p.lat, p.lng); PARCELS[p.id] = p; });

  function lookup(raw) {
    var code = String(raw || "").toUpperCase().replace(/[\s-]/g, "");
    if (!/^[A-Z0-9]{8}$/.test(code) || !G.isValid(code)) return { status: "bad", code: code };
    return PARCELS[code] ? { status: "ok", code: code, p: PARCELS[code] } : { status: "none", code: code };
  }

  /* ---------- 2. ANALYSIS ---------- */
  function analyze(p) {
    var sqm = p.len * p.wid, dec = sqm / DECIMAL_SQM, value = dec * p.ppd;
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
