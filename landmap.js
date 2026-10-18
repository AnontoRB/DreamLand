/* ==========================================================================
   Dreamland – landmap.js  (Land Maps page)
   A real map of Bangladesh (OpenStreetMap + satellite, via Leaflet).
   Search a UniqueID and the plot is found, highlighted and measured.
   Needs leaflet.js, geoid.js and land.js loaded first.
   ========================================================================== */
(function () {
  "use strict";
  var box = document.getElementById("leafMap");
  if (!box) return;
  if (!window.L || !window.Land) { box.innerHTML = '<p class="err" style="padding:1rem">The map could not load. Check your internet connection and refresh.</p>'; return; }

  var Land = window.Land, G = window.GeoID, info = document.getElementById("plotInfo");
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var BD = [[20.6, 88.0], [26.65, 92.7]];

  var street = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxNativeZoom: 19, maxZoom: 20, attribution: "&copy; OpenStreetMap contributors" });
  var sat = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", { maxNativeZoom: 18, maxZoom: 20, attribution: "Imagery &copy; Esri, Maxar, Earthstar Geographics" });
  var map = L.map(box, { layers: [street], minZoom: 6, maxBounds: [[19.5, 87], [27.5, 93.8]], maxBoundsViscosity: 0.8 });
  L.control.layers({ "Street map": street, "Satellite": sat }, null, { collapsed: true }).addTo(map);
  map.fitBounds(BD);
  var shape = null;

  function corners(p) {                       // plot rectangle in lat/lng from centre, size and direction
    var b = p.rot * Math.PI / 180, mLat = 1 / 111320, mLng = 1 / (111320 * Math.cos(p.lat * Math.PI / 180));
    var u = [Math.sin(b), Math.cos(b)], v = [Math.cos(b), -Math.sin(b)];   // [east, north] unit vectors
    return [[1, 1], [1, -1], [-1, -1], [-1, 1]].map(function (s) {
      var e = s[0] * p.len / 2 * u[0] + s[1] * p.wid / 2 * v[0], n = s[0] * p.len / 2 * u[1] + s[1] * p.wid / 2 * v[1];
      return [p.lat + n * mLat, p.lng + e * mLng];
    });
  }

  function show(raw) {
    var r = Land.lookup(raw);
    if (r.status !== "ok") { info.innerHTML = Land.problemHTML(r); return; }
    var p = r.p, a = Land.analyze(p);
    if (shape) map.removeLayer(shape);
    shape = L.polygon(corners(p), { color: "#d4213a", weight: 3, fillColor: "#d4213a", fillOpacity: 0.35 }).addTo(map);
    shape.bindTooltip(G.format(r.code) + " · " + p.len + " m × " + p.wid + " m", { permanent: true, direction: "top", offset: [0, -4] });
    var target = shape.getBounds().pad(1.5);
    if (reduce) map.fitBounds(target, { maxZoom: 19 }); else map.flyToBounds(target, { maxZoom: 19, duration: 1.4 });
    var ft = function (m) { return (m * 3.28084).toFixed(0) + " ft"; };
    info.innerHTML = "<h3>" + G.format(r.code) + ' <span class="pill ' + a.risk.cls + '">' + a.risk.label + "</span></h3>" +
      Land.kv({ "Length": p.len + " m (" + ft(p.len) + ")", "Width": p.wid + " m (" + ft(p.wid) + ")",
        "Area": Math.round(a.sqm) + " sq m", "Area (decimal)": a.dec.toFixed(1), "Land type": p.type, "Zone": p.zone,
        "Place": p.place, "Centre": p.lat.toFixed(6) + ", " + p.lng.toFixed(6) }) +
      '<p class="rlinks"><a href="tax.html?id=' + r.code + '">Tax details</a></p>';
  }

  var form = document.getElementById("mapIdForm");
  form.addEventListener("submit", function (e) { e.preventDefault(); show(document.getElementById("mapIdIn").value); });
  document.getElementById("mapReset").addEventListener("click", function () {
    if (shape) { map.removeLayer(shape); shape = null; }
    map.fitBounds(BD); info.textContent = "Enter a UniqueID to find the plot, see its size and view its details.";
  });
  var qid = new URLSearchParams(location.search).get("id");
  if (qid) { document.getElementById("mapIdIn").value = qid; show(qid); }
})();
