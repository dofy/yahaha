// site-to-map daylight: time-of-day palettes for the sky and the interface.
// Load it as a plain <script> in <head> so the very first paint already has the right
// colours (no white flash at night). The engine imports the same file and reads
// window.SiteMapDaylight, so the tables live in one place.
(function () {
  // keyframes: hour, sky, sun colour, sun intensity, sun elevation (deg), hemi sky, hemi ground, hemi intensity, lamps 0-1, ink strength
  var DAY = [
    [0,    '#1f2838', '#8ea3cf', .55, 38, '#3b4b6b', '#20252f', .95, 1,   .55],
    [4.5,  '#2c3650', '#9aa8d0', .6,  30, '#46537a', '#2a2a33', 1.0, 1,   .6],
    [6,    '#f0b58f', '#ffaa66', 1.35, 6, '#f3c4a4', '#7d5a48', 1.25, .5,  .75],
    [7.5,  '#ece3d2', '#ffdcb0', 1.8, 22, '#f1e6d6', '#b98e64', 1.55, 0,  .82],
    [10,   '#f1eadb', '#fff3e0', 2.05, 45, '#f1eadb', '#c59c6c', 1.75, 0,  .82],
    [12.5, '#f4efe4', '#ffffff', 2.2, 68, '#f5f0e6', '#c9a576', 1.85, 0,  .82],
    [15.5, '#f0e4cf', '#ffe6bf', 2.0, 38, '#f0e4d0', '#c39462', 1.7,  0,  .82],
    [18,   '#e7a27a', '#ff9350', 1.45, 5, '#eaa989', '#6e4a44', 1.2,  .65, .75],
    [19.5, '#3d3652', '#b3a2d4', .7,  25, '#544b6c', '#2b2733', 1.0,  1,  .6],
    [24,   '#1f2838', '#8ea3cf', .55, 38, '#3b4b6b', '#20252f', .95, 1,   .55]
  ];
  // interface palette per keyframe: card, ink, soft, faint, line, hover, water text, shadow
  var NIGHT = ['#1f2637', '#eef2fa', '#c9d1e2', '#98a4ba', '#38425a', '#4c3443', '#9fc6d1', 'rgba(0, 0, 0, .35)'];
  var EVE = ['#2b2940', '#f2ebf7', '#d4cbe0', '#a9a0bb', '#46425e', '#5a3a4a', '#a9c4d6', 'rgba(10, 6, 20, .32)'];
  var DAWN = ['#fff3ea', '#45291f', '#6a4639', '#8c6656', '#efd5c6', '#ffd0c0', '#4f6f78', 'rgba(90, 50, 35, .18)'];
  var NOON = ['#fffdf8', '#3a2f25', '#5b5046', '#7d7266', '#e2d8c8', '#ffd9cf', '#5a7d86', 'rgba(58, 47, 37, .16)'];
  var DUSK = ['#fbe9dc', '#3a2219', '#63412f', '#866250', '#ebcab4', '#ffc9b4', '#4d6a73', 'rgba(90, 40, 20, .2)'];
  var UIP = [NIGHT, NIGHT, DAWN, NOON, NOON, NOON, NOON, DUSK, EVE, NIGHT];
  var UI_VARS = ['--ui-card', '--ui-ink', '--ui-soft', '--ui-faint', '--ui-line', '--ui-hot', '--ui-water'];
  var PHASE_AT = [0, 4.5, 7.5, 9.5, 11.5, 13.5, 17, 19, 24];

  var smooth = function (a, b, x) { var t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  var rgb = function (h) { return [1, 3, 5].map(function (i) { return parseInt(h.slice(i, i + 2), 16); }); };
  var hex = function (c) { return '#' + c.map(function (v) { return Math.round(v).toString(16).padStart(2, '0'); }).join(''); };
  var mix = function (a, b, t) { var x = rgb(a), y = rgb(b); return hex(x.map(function (v, i) { return v + (y[i] - v) * t; })); };
  var lum = function (h) { var c = rgb(h); return (.2126 * c[0] + .7152 * c[1] + .0722 * c[2]) / 255; };

  // ?t=18.5 in the URL, or data-daylight="10" on <html>, pins the hour
  function fixedHour() {
    var q = new URLSearchParams(location.search).get('t'), a = document.documentElement.getAttribute('data-daylight');
    var v = q !== null ? parseFloat(q) : a !== null ? parseFloat(a) : NaN;
    return isFinite(v) ? ((v % 24) + 24) % 24 : null;
  }
  function hour() { var f = fixedHour(); if (f !== null) return f; var d = new Date(); return d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600; }
  // which keyframes bracket the hour, and how far between them
  function span(h) { var i = 0; while (i < DAY.length - 2 && h >= DAY[i + 1][0]) i++; return { i: i, k: smooth(0, 1, (h - DAY[i][0]) / (DAY[i + 1][0] - DAY[i][0])) }; }
  // set --sky, --sun and every --ui-* custom property for the hour
  function paint(h) {
    var s = span(h), A = DAY[s.i], B = DAY[s.i + 1], P = UIP[s.i], Q = UIP[s.i + 1], kk = smooth(.15, .85, s.k), root = document.documentElement.style;
    // palettes of the same polarity blend; light <-> dark switches as one set at the midpoint,
    // so card and text never meet in a grey where neither can be read
    var flip = (lum(P[0]) > .5) !== (lum(Q[0]) > .5);
    UI_VARS.forEach(function (v, j) { root.setProperty(v, flip ? (kk < .5 ? P[j] : Q[j]) : mix(P[j], Q[j], kk)); });
    root.setProperty('--ui-shadow', kk < .5 ? P[7] : Q[7]);
    root.setProperty('--sky', mix(A[1], B[1], s.k));
    root.setProperty('--sun', mix(A[2], B[2], s.k));
    return s;
  }

  window.SiteMapDaylight = { DAY: DAY, UIP: UIP, UI_VARS: UI_VARS, PHASE_AT: PHASE_AT, hour: hour, fixedHour: fixedHour, span: span, paint: paint };
  paint(hour());
})();
