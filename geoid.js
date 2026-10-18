/* ==========================================================================
   Dreamland – geoid.js
   Land UniqueID: turns a latitude/longitude into an 8-character code
   (A-Z, 0-9, case-insensitive) and back again.

   36^8 = 2,821,109,907,456 possible codes.

   How it works
     1. The service area (BOUNDS below) is cut into a fine grid of square-ish
        cells. There are as many cells as will fit inside 36^8 codes.
     2. A point falls in exactly one cell -> cell number (0 ... cells-1).
     3. The number is scrambled with a reversible formula so neighbouring
        plots do not get look-alike codes.
     4. The result is written in base 36 as 8 characters, e.g. 7K2M-Q9XD.
   Decoding runs the same steps backwards and returns the cell centre.

   Same cell = same code. With the default Bangladesh bounds one cell is
   about 0.35 m wide, so two points closer than that share a code.
   Edit BOUNDS to change the area (e.g. the whole world: -90,90,-180,180).
   ========================================================================== */
(function () {
  "use strict";

  /* ---------------- 1. SETTINGS ---------------- */
  var BOUNDS = { minLat: 20.5, maxLat: 26.7, minLng: 88.0, maxLng: 92.8 }; // Bangladesh + margin
  var SCRAMBLE_MUL = 6364136223846793007n; // must share no factor with 36^8 (i.e. odd, not a multiple of 3)
  var SCRAMBLE_ADD = 1442695040888963407n;

  /* ---------------- 2. MATH ---------------- */
  var BASE = 36n, LEN = 8;
  var TOTAL = BASE ** BigInt(LEN);                    // 2,821,109,907,456
  var latSpan = BOUNDS.maxLat - BOUNDS.minLat, lngSpan = BOUNDS.maxLng - BOUNDS.minLng;
  var N_LAT = BigInt(Math.floor(Math.sqrt(Number(TOTAL) * latSpan / lngSpan)));
  var N_LNG = TOTAL / N_LAT;                          // N_LAT * N_LNG <= TOTAL
  var CELLS = N_LAT * N_LNG;
  var DIGITS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

  function egcdInv(a, m) {                            // modular inverse (BigInt)
    var r0 = m, r1 = ((a % m) + m) % m, t0 = 0n, t1 = 1n;
    while (r1 !== 0n) {
      var q = r0 / r1, r2 = r0 - q * r1, t2 = t0 - q * t1;
      r0 = r1; r1 = r2; t0 = t1; t1 = t2;
    }
    if (r0 !== 1n) throw new Error("SCRAMBLE_MUL must be coprime with 36^8");
    return ((t0 % m) + m) % m;
  }
  var INV_MUL = egcdInv(SCRAMBLE_MUL, TOTAL);

  function mod(n) { return ((n % TOTAL) + TOTAL) % TOTAL; }
  function toBase36(n) {
    var s = "";
    for (var i = 0; i < LEN; i++) { s = DIGITS[Number(n % BASE)] + s; n /= BASE; }
    return s;
  }
  function fromBase36(s) {
    var n = 0n;
    for (var i = 0; i < s.length; i++) n = n * BASE + BigInt(DIGITS.indexOf(s[i]));
    return n;
  }

  /* ---------------- 3. PUBLIC API ---------------- */
  function encode(lat, lng) {
    lat = Number(lat); lng = Number(lng);
    if (!isFinite(lat) || !isFinite(lng)) throw new Error("Enter numbers for latitude and longitude.");
    if (lat < BOUNDS.minLat || lat > BOUNDS.maxLat || lng < BOUNDS.minLng || lng > BOUNDS.maxLng)
      throw new Error("This point is outside the supported area (lat " + BOUNDS.minLat + " to " + BOUNDS.maxLat + ", lng " + BOUNDS.minLng + " to " + BOUNDS.maxLng + ").");
    var r = Math.min(Number(N_LAT) - 1, Math.floor((lat - BOUNDS.minLat) / latSpan * Number(N_LAT)));
    var c = Math.min(Number(N_LNG) - 1, Math.floor((lng - BOUNDS.minLng) / lngSpan * Number(N_LNG)));
    var cell = BigInt(r) * N_LNG + BigInt(c);
    return toBase36(mod(cell * SCRAMBLE_MUL + SCRAMBLE_ADD));
  }

  function clean(code) { return String(code || "").toUpperCase().replace(/[\s-]/g, ""); }

  function isValid(code) {
    code = clean(code);
    if (!/^[A-Z0-9]{8}$/.test(code)) return false;
    return mod((fromBase36(code) - SCRAMBLE_ADD) * INV_MUL) < CELLS;
  }

  function decode(code) {
    code = clean(code);
    if (!/^[A-Z0-9]{8}$/.test(code)) throw new Error("A UniqueID has 8 letters or digits (A-Z, 0-9).");
    var cell = mod((fromBase36(code) - SCRAMBLE_ADD) * INV_MUL);
    if (cell >= CELLS) throw new Error("This code does not match any location.");
    var r = Number(cell / N_LNG), c = Number(cell % N_LNG);
    var dLat = latSpan / Number(N_LAT), dLng = lngSpan / Number(N_LNG);
    var south = BOUNDS.minLat + r * dLat, west = BOUNDS.minLng + c * dLng;
    return { code: code, lat: south + dLat / 2, lng: west + dLng / 2,
      bounds: { south: south, north: south + dLat, west: west, east: west + dLng } };
  }

  function format(code) { code = clean(code); return code.slice(0, 4) + "-" + code.slice(4); }

  function cellSizeMeters(lat) {
    var dLat = latSpan / Number(N_LAT), dLng = lngSpan / Number(N_LNG);
    return { north_south: dLat * 111320, east_west: dLng * 111320 * Math.cos((lat || 0) * Math.PI / 180) };
  }

  window.GeoID = { encode: encode, decode: decode, isValid: isValid, format: format,
    total: TOTAL.toString(), cells: CELLS.toString(), cellSizeMeters: cellSizeMeters, bounds: BOUNDS };

  /* ---------------- 4. PAGE UI (only on pages with #geoForm) ---------------- */
  var form = document.getElementById("geoForm");
  if (!form) return;

  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function $(id) { return document.getElementById(id); }
  function kv(o) { return '<dl class="kv">' + Object.keys(o).map(function (k) { return "<div><dt>" + esc(k) + "</dt><dd>" + esc(o[k]) + "</dd></div>"; }).join("") + "</dl>"; }
  function mapLink(lat, lng) { return "https://www.openstreetmap.org/?mlat=" + lat + "&mlon=" + lng + "#map=19/" + lat + "/" + lng; }

  // Pasting "23.8476, 90.2567" into the latitude box fills both fields.
  $("geoLat").addEventListener("input", function () {
    var m = this.value.match(/^\s*(-?\d+(?:\.\d+)?)\s*[,;\s]\s*(-?\d+(?:\.\d+)?)\s*$/);
    if (m) { this.value = m[1]; $("geoLng").value = m[2]; }
  });

  $("geoEx").addEventListener("click", function () {
    $("geoLat").value = "23.84760823781365"; $("geoLng").value = "90.25676245983189";
    form.requestSubmit ? form.requestSubmit() : form.dispatchEvent(new Event("submit", { cancelable: true }));
  });

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var out = $("geoRes");
    try {
      var lat = parseFloat($("geoLat").value), lng = parseFloat($("geoLng").value);
      var code = encode(lat, lng), d = decode(code), sz = cellSizeMeters(lat);
      out.innerHTML = '<div class="success"><h3>Your Land UniqueID</h3><p class="total"><b class="code" id="geoCode">' + format(code) + '</b> <button type="button" class="ex" id="geoCopy">Copy</button></p>' +
        kv({ "Plot centre": d.lat.toFixed(7) + ", " + d.lng.toFixed(7), "Precision": "about " + sz.north_south.toFixed(2) + " m × " + sz.east_west.toFixed(2) + " m" }) +
        '<p class="note"><a href="' + mapLink(d.lat, d.lng) + '" target="_blank" rel="noopener noreferrer">View on map</a></p></div>';
      $("geoCopy").addEventListener("click", function () {
        var b = this, done = function () { b.textContent = "Copied"; setTimeout(function () { b.textContent = "Copy"; }, 1500); };
        if (navigator.clipboard) navigator.clipboard.writeText(code).then(done, done); else done();
      });
    } catch (err) { out.innerHTML = '<p class="err">' + esc(err.message) + "</p>"; }
  });

  $("geoLocate").addEventListener("click", function () {
    var out = $("geoRes");
    if (!navigator.geolocation) { out.innerHTML = '<p class="err">Location is not available in this browser.</p>'; return; }
    navigator.geolocation.getCurrentPosition(function (p) {
      $("geoLat").value = p.coords.latitude.toFixed(7); $("geoLng").value = p.coords.longitude.toFixed(7);
      form.requestSubmit ? form.requestSubmit() : form.dispatchEvent(new Event("submit", { cancelable: true }));
    }, function () { out.innerHTML = '<p class="err">Could not get your location. Allow location access or type the coordinates.</p>'; }, { enableHighAccuracy: true, timeout: 10000 });
  });

  $("geoDecodeForm").addEventListener("submit", function (e) {
    e.preventDefault();
    var out = $("geoDecRes");
    try {
      var d = decode($("geoCodeIn").value), sz = cellSizeMeters(d.lat);
      out.innerHTML = "<h3>" + format(d.code) + "</h3>" + kv({ Latitude: d.lat.toFixed(7), Longitude: d.lng.toFixed(7),
        "Plot size": sz.north_south.toFixed(2) + " m × " + sz.east_west.toFixed(2) + " m" }) +
        '<p class="note"><a href="' + mapLink(d.lat, d.lng) + '" target="_blank" rel="noopener noreferrer">View on map</a></p>';
    } catch (err) { out.innerHTML = '<p class="err">' + esc(err.message) + "</p>"; }
  });
})();
