/* ==========================================================================
   Dreamland – landmap.js  (Land Maps page)
   A real map of Bangladesh (OpenStreetMap + satellite, via Leaflet).
   Every registered building is outlined on the map: red = High risk
   (open court case or active lease), green = No issues.
   Click a building, or search its UniqueID, to see its size and details.
   Needs leaflet.js, geoid.js and land.js loaded first.
   ========================================================================== */
(function () {
  "use strict";
  var box = document.getElementById("leafMap");
  if (!box) return;
  if (!window.L || !window.Land) { box.innerHTML = '<p class="err" style="padding:1rem">The map could not load. Check your internet connection and refresh.</p>'; return; }

  var Land = window.Land, G = window.GeoID, info = document.getElementById("plotInfo");
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var HINT = "Click a marked building, or enter a UniqueID, to see its details.";

  var street = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxNativeZoom: 19, maxZoom: 20, attribution: "&copy; OpenStreetMap contributors" });
  var sat = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", { maxNativeZoom: 18, maxZoom: 20, attribution: "Imagery &copy; Esri, Maxar, Earthstar Geographics" });
  var map = L.map(box, { layers: [street], minZoom: 6, maxBounds: [[19.5, 87], [27.5, 93.8]], maxBoundsViscosity: 0.8 });
  L.control.layers({ "Street map": street, "Satellite": sat }, null, { collapsed: true }).addTo(map);

  /* legend */
  var legend = L.control({ position: "bottomleft" });
  legend.onAdd = function () {
    var d = L.DomUtil.create("div", "maplegend");
    d.innerHTML = '<div><i style="background:#d4213a"></i>High risk (case or lease)</div><div><i style="background:#16845b"></i>No issues</div>';
    return d;
  };
  legend.addTo(map);

  /* one outline per registered building */
  var shapes = {}, current = null;
  function colour(p) { return Land.analyze(p).risk.cls === "bad" ? "#d4213a" : "#16845b"; }
  function style(p, on) { var c = colour(p); return { color: c, weight: on ? 4 : 2, fillColor: c, fillOpacity: on ? 0.55 : 0.3 }; }
  function hoverTip(poly, p) { poly.unbindTooltip(); poly.bindTooltip(G.format(p.id), { sticky: true }); }

  Land.list.forEach(function (p) {
    var poly = L.polygon(p.poly, style(p, false)).addTo(map);
    hoverTip(poly, p);
    poly.on("click", function () { show(p.id); });
    shapes[p.id] = poly;
  });
  var HOME = L.featureGroup(Land.list.map(function (p) { return shapes[p.id]; })).getBounds().pad(0.25);
  map.fitBounds(HOME, { maxZoom: 18 });

  function deselect() {
    if (!current) return;
    var p = Land.parcels[current];
    shapes[current].setStyle(style(p, false)); hoverTip(shapes[current], p);
    current = null;
  }

  function show(raw) {
    var r = Land.lookup(raw);
    if (r.status !== "ok") { info.innerHTML = Land.problemHTML(r); return; }
    var p = r.p, a = Land.analyze(p), poly = shapes[r.code];
    deselect();
    current = r.code;
    poly.setStyle(style(p, true)); poly.bringToFront();
    poly.unbindTooltip();
    poly.bindTooltip(G.format(r.code) + " · " + p.len + " m × " + p.wid + " m", { permanent: true, direction: "top", offset: [0, -4] });
    var target = poly.getBounds().pad(1.5);
    if (reduce) map.fitBounds(target, { maxZoom: 19 }); else map.flyToBounds(target, { maxZoom: 19, duration: 1.2 });

    var ft = function (m) { return (m * 3.28084).toFixed(0) + " ft"; };
    var cases = p.cases.length ? p.cases.map(function (c) { return c.id + " (" + c.status + ")"; }).join(", ") : "None";
    var lease = p.lease ? p.lease.id + " (" + p.lease.status + ")" : "None";
    info.innerHTML = "<h3>" + G.format(r.code) + ' <span class="pill ' + a.risk.cls + '">' + a.risk.label + "</span></h3>" +
      '<p class="note">' + Land.esc(a.verdict) + "</p>" +
      Land.kv({ "Length": p.len + " m (" + ft(p.len) + ")", "Width": p.wid + " m (" + ft(p.wid) + ")",
        "Area": Math.round(a.sqm) + " sq m", "Area (decimal)": a.dec.toFixed(1), "Land type": p.type, "Zone": p.zone,
        "Court case": cases, "Lease": lease,
        "Land tax": a.tax.months ? a.tax.months + " months unpaid" : "Paid up to date",
        "Place": p.place, "Centre": p.lat.toFixed(6) + ", " + p.lng.toFixed(6) }) +
      '<p class="rlinks"><a href="tax.html?id=' + r.code + '">Tax details</a></p>';
  }

  document.getElementById("mapIdForm").addEventListener("submit", function (e) { e.preventDefault(); show(document.getElementById("mapIdIn").value); });
  document.getElementById("mapReset").addEventListener("click", function () {
    deselect(); map.fitBounds(HOME, { maxZoom: 18 }); info.textContent = HINT;
  });
  var qid = new URLSearchParams(location.search).get("id");
  if (qid) { document.getElementById("mapIdIn").value = qid; show(qid); }
})();
