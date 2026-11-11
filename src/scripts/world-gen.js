// site-to-map world generator.
// Builds the geography a map needs from a seed: coastlines, bays, lakes, mountain ranges,
// rivers, roads, town positions, fields, farms, forests, boats and label anchors.
// `classic` reproduces the hand-made yahaha.net continent exactly.
//
// Everything here is plain data plus a few height/sea functions. The engine supplies the
// noise primitives so terrain detail stays consistent with the rest of the scene.

const TAU = Math.PI * 2;
const clamp01 = t => Math.min(1, Math.max(0, t));
const smooth = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const angDiff = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));

export function strSeed(s) { let h = 2166136261; for (const ch of String(s)) { h ^= ch.codePointAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
// Silhouettes group landmarks by what is visible from the overview camera. They are
// separate from semantic kind: two different kinds can still look like the same house.
export const LANDMARK_SILHOUETTES = {
  quad: 'tower', spire: 'tower', dome: 'round', kiosk: 'house', radio: 'mast', grid: 'tower',
  face: 'round', vault: 'object', twin: 'tower', silo: 'round', library: 'house', crane: 'open',
  tanks: 'object', shed: 'house', chimney: 'house', pagoda: 'tiered', booth: 'round', theater: 'low',
  inn: 'house', teahouse: 'tiered', cattower: 'tower', dovecote: 'mast', camera: 'object', pavilion: 'open',
  elfhall: 'house', stupa: 'round', tent: 'low', school: 'house', smithy: 'house', scriptorium: 'tower',
  warehouse: 'house', watermill: 'house', kiln: 'round', mansion: 'house', hobbit: 'low', mine: 'low', still: 'object',
};
// Fill only unspecified kinds. Automatic choices balance silhouettes and reserve all
// explicit kinds, but do not infer an item's meaning or rewrite an owner's choices.
export function assignLandmarkKinds(items, cityId, propKinds) {
  const buildings = ['quad', 'spire', 'dome', 'kiosk', 'radio', 'grid', 'vault', 'twin', 'library', 'crane', 'chimney', 'pavilion', 'school', 'scriptorium', 'watermill', 'mansion', 'hobbit', 'theater', 'inn', 'teahouse'];
  const props = ['signpost', 'oak', 'flowerbed', 'rock', 'birch', 'bench', 'lamp', 'stall'];
  const explicit = items.map(item => item.kind).filter(kind => kind && !propKinds.has(kind));
  const used = new Set(explicit), silhouettes = new Map();
  for (const kind of explicit) {
    const family = LANDMARK_SILHOUETTES[kind];
    if (family) silhouettes.set(family, (silhouettes.get(family) || 0) + 1);
  }
  let buildingCount = 0, offset = strSeed(cityId) % buildings.length, extra = 0;
  return items.map(item => {
    const copy = { ...item };
    if (!copy.kind) {
      if (buildingCount < 9) {
        let chosen = -1, least = Infinity;
        for (let i = 0; i < buildings.length; i++) {
          const index = (offset + i) % buildings.length, kind = buildings[index];
          const count = silhouettes.get(LANDMARK_SILHOUETTES[kind]) || 0;
          if (!used.has(kind) && count < least) { chosen = index; least = count; }
        }
        if (chosen >= 0) {
          copy.kind = buildings[chosen]; used.add(copy.kind); offset = (chosen + 1) % buildings.length;
          const family = LANDMARK_SILHOUETTES[copy.kind]; silhouettes.set(family, (silhouettes.get(family) || 0) + 1);
        }
      } else copy.kind = props[extra++ % props.length];
    }
    if (!propKinds.has(copy.kind)) buildingCount++;
    return copy;
  });
}
export function mulberry(a) {
  return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
function segDist(pts, x, z) {
  let best = 1e9;
  for (let i = 1; i < pts.length; i++) {
    const [ax, az] = pts[i - 1], [bx, bz] = pts[i], dx = bx - ax, dz = bz - az, L = dx * dx + dz * dz || 1;
    const t = clamp01(((x - ax) * dx + (z - az) * dz) / L), ex = ax + dx * t - x, ez = az + dz * t - z;
    best = Math.min(best, Math.hypot(ex, ez));
  }
  return best;
}

// Route a river around the entire town footprint, not only its control points.
// A visibility graph of padded circles provides safe detours; rounded corners are
// accepted only after checking every resulting segment against the same footprints.
export function routeRiverAroundTowns(points, towns, width) {
  const circles = towns.map(t => ({ x: t.cx, z: t.cz, r: Math.max(t.rx, t.rz) * 1.25 + width + 1.2 }));
  const distanceToSegment = (a, b, c) => {
    const dx = b[0] - a[0], dz = b[1] - a[1], len = dx * dx + dz * dz;
    const t = len ? clamp01(((c.x - a[0]) * dx + (c.z - a[1]) * dz) / len) : 0;
    return Math.hypot(a[0] + dx * t - c.x, a[1] + dz * t - c.z);
  };
  const outside = p => circles.every(c => Math.hypot(p[0] - c.x, p[1] - c.z) >= c.r + .02);
  const clear = (a, b) => circles.every(c => distanceToSegment(a, b, c) >= c.r + .01);
  const safePath = path => path.every((p, i) => !i || clear(path[i - 1], p));
  function moveEndpoint(point) {
    let p = point.slice();
    for (let pass = 0; pass < 48 && !outside(p); pass++) for (const c of circles) {
      let dx = p[0] - c.x, dz = p[1] - c.z, d = Math.hypot(dx, dz);
      if (d < c.r + .25) { if (d < 1e-8) { dx = 1; dz = 0; d = 1; } const scale = (c.r + .3) / d; p = [c.x + dx * scale, c.z + dz * scale]; }
    }
    if (outside(p)) return p;
    for (let radius = 1; radius <= 120; radius++) for (let i = 0; i < 48; i++) {
      const angle = i * Math.PI / 24, q = [point[0] + radius * Math.cos(angle), point[1] + radius * Math.sin(angle)];
      if (outside(q)) return q;
    }
    throw new Error('Could not place river endpoint outside towns');
  }
  const start = moveEndpoint(points[0]), end = moveEndpoint(points.at(-1));
  let path = [start, ...points.slice(1, -1).map(p => p.slice()), end];
  if (!safePath(path)) {
    const nodes = [start, end];
    for (const c of circles) for (let i = 0; i < 24; i++) {
      const a = i * Math.PI / 12, r = c.r + 1;
      const point = [c.x + Math.cos(a) * r, c.z + Math.sin(a) * r];
      if (outside(point)) nodes.push(point);
    }
    const distances = nodes.map(() => Infinity), prev = nodes.map(() => -1), visited = nodes.map(() => false);
    distances[0] = 0;
    for (let step = 0; step < nodes.length; step++) {
      let current = -1;
      for (let i = 0; i < nodes.length; i++) if (!visited[i] && (current < 0 || distances[i] < distances[current])) current = i;
      if (current < 0 || !Number.isFinite(distances[current]) || current === 1) break;
      visited[current] = true;
      for (let j = 0; j < nodes.length; j++) if (!visited[j] && clear(nodes[current], nodes[j])) {
        const candidate = distances[current] + Math.hypot(nodes[current][0] - nodes[j][0], nodes[current][1] - nodes[j][1]);
        if (candidate < distances[j]) { distances[j] = candidate; prev[j] = current; }
      }
    }
    if (!Number.isFinite(distances[1])) throw new Error('Could not route river around towns');
    path = []; for (let i = 1; i >= 0; i = prev[i]) { path.push(nodes[i]); if (i === 0) break; } path.reverse();
  }
  const rounded = [path[0]];
  for (let i = 1; i < path.length - 1; i++) {
    const a = path[i - 1], b = path[i], c = path[i + 1];
    const enter = [b[0] * .8 + a[0] * .2, b[1] * .8 + a[1] * .2], exit = [b[0] * .8 + c[0] * .2, b[1] * .8 + c[1] * .2];
    rounded.push(enter);
    for (let j = 1; j <= 6; j++) { const t = j / 6, u = 1 - t; rounded.push([u * u * enter[0] + 2 * u * t * b[0] + t * t * exit[0], u * u * enter[1] + 2 * u * t * b[1] + t * t * exit[1]]); }
  }
  rounded.push(path.at(-1));
  return safePath(rounded) ? rounded : path;
}

export const WORLD_TYPES = ['coast', 'twoCoasts', 'island', 'gulf', 'lakeland'];

// towns: [{ slot, rx, rz }] in site order. noise: { vnoise, fbm, ridge }.
export function makeWorld(cfg, towns, noise) {
  // classic only has the five hand-placed spots; more towns need a generated world
  if (cfg.layout === 'classic' && towns.length <= 5 && towns.every(t => t.slot !== 'town')) return classicWorld(towns, noise);
  // more than five towns: generate the land at the usual size with towns shrunk, then stretch
  // it so towns keep their real size and the continent grows around them
  const S = Math.max(1, 1 + (towns.length - 5) * .2); // 6 towns ×1.2 … 9 towns ×1.8
  if (S === 1) return autoWorld(cfg, towns, noise);
  return scaleWorld(autoWorld(cfg, towns.map(t => ({ ...t, rx: t.rx / S, rz: t.rz / S })), noise), S);
}

function scaleWorld(w, S) {
  const P = ([x, z, ...rest]) => [x * S, z * S, ...rest];
  const sea = w.sea, natural = w.natural, farness = w.farness, dens = w.forestDens, pine = w.pineZone;
  return {
    ...w,
    townPos: w.townPos.map(p => ({ ...p, cx: p.cx * S, cz: p.cz * S })),
    roadsSpec: w.roadsSpec.map(r => ({ ...r, end: r.end && P(r.end) })),
    rivers: w.rivers.map(r => ({ ...r, pts: r.pts.map(P) })),
    fields: w.fields.map(f => ({ ...f, x: f.x * S, z: f.z * S })),
    farms: w.farms.map(P), windmill: w.windmill && P(w.windmill), sheep: w.sheep.map(P),
    sea: (x, z) => sea(x / S, z / S) * S, natural: (x, z) => natural(x / S, z / S), farness: (x, z) => farness(x / S, z / S),
    forestDens: (x, z) => dens(x / S, z / S), pineZone: (x, z, h) => pine(x / S, z / S, h),
    peaks: w.peaks.map(([x, z, r, h, sd]) => [x * S, z * S, r * S, h * (1 + (S - 1) * .5), sd]),
    near: w.near.map(v => v * S),
    strokes: { ...w.strokes, x0: w.strokes.x0 * S, x1: w.strokes.x1 * S, z0: w.strokes.z0 * S, z1: w.strokes.z1 * S, n: Math.round(w.strokes.n * S * S) },
    boats: w.boats.map(b => ({ ...b, cx: b.cx * S, cz: b.cz * S, a: b.a * S, b: b.b * S })),
    anchors: Object.fromEntries(Object.entries(w.anchors).map(([k, v]) => [k, v && [v[0] * S, v[1], v[2] * S]])),
    pan: { x0: w.pan.x0 * S, x1: w.pan.x1 * S, z0: w.pan.z0 * S, z1: w.pan.z1 * S },
    view: { ...w.view, x: w.view.x * S, z: w.view.z * S, dist: w.view.dist * S },
  };
}

// ------------------------------------------------------------------ classic (yahaha.net)
function classicWorld(towns, { fbm, ridge }) {
  const SLOTS = {
    center: { cx: -.5, cz: -5, y: .2 }, highland: { cx: -12.5, cz: -7, y: 1.7, gate: true },
    coast: { cx: 11.5, cz: -8, y: .2, harbor: true }, south: { cx: -2.5, cz: 7, y: .2 }, east: { cx: 11.5, cz: 5, y: .2 },
  };
  const used = new Set(towns.map(t => t.slot));
  const ROADS_ALL = [
    { a: 'center', b: 'highland', pts: [[-4.3, -5], [-7, -5.6], [-9.9, -6.6]] },
    { a: 'center', b: 'coast', pts: [[3.3, -5.5], [5.5, -6.2], [7.9, -7.6]] },
    { a: 'center', b: 'south', pts: [[-1, -1.3], [-1.4, 1.5], [-2.5, 3.3]] },
    { a: 'south', b: 'east', pts: [[1.3, 6.6], [4.5, 5.6], [7.9, 5]] },
    { a: 'coast', b: 'east', pts: [[11.5, -5.3], [11.9, -1.5], [11.5, 2.3]] },
    { a: 'highland', b: 'south', pts: [[-12.5, -4.3], [-11.3, 0], [-8.6, 4.2], [-6.2, 7]] },
    { a: 'east', b: 'east', pts: [[15.2, 5], [16.4, 6.5]] },
  ];
  const sea = (x, z) => {
    const wob = (fbm(x * .12 + 7, z * .12 + 3) - .5) * 2.6;
    const east = Math.max(17 - x, -13.5 - z) + wob;
    const bay = (Math.hypot((x - 3) / 24, (z - 27) / 12.5) - 1) * 12 + wob;
    const lakeA = (Math.hypot((x + 31) / 5.5, (z - 11) / 3.4) - 1) * 3.6 + wob * .4;
    return Math.min(east, bay, lakeA);
  };
  const natural = (x, z) => {
    let h = .35 + (fbm(x * .12, z * .12) - .5) * 1.7;
    h += 2.0 * Math.exp(-((x + 12.5) ** 2 + (z + 7) ** 2) / 34);
    h += smooth(-9, -15, z) * (1.2 + 1.8 * fbm(x * .2 + 11, z * .2));
    h += smooth(-14, -20, x) * 1.6 * fbm(x * .2, z * .2 + 5);
    h += smooth(-17, -32, z) * (2 + 6.5 * ridge(x * .085 + 2, z * .085));
    h += smooth(-25, -46, x) * (1.5 + 5.5 * ridge(x * .08 + 9, z * .08 + 4));
    const far = smooth(28, 60, Math.hypot(x + 3, z + 3)); h += far * (fbm(x * .05 + 3, z * .05) - .35) * 3.2;
    return h;
  };
  const peaks = [];
  const hashLike = (a, b) => { let h = (Math.imul(a, 374761393) + Math.imul(b, 668265263)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
  for (let i = 0; i < 15; i++) { const x = -25 + i * 3.1 + (hashLike(i, 3) - .5) * 1.6; peaks.push([x, -16.8 - hashLike(i, 4) * 2.6, 2.6 + hashLike(i, 5) * 1.8, 3.6 + hashLike(i, 6) * 3.8, i]); }
  for (let i = 0; i < 5; i++) peaks.push([-20.5 - hashLike(i, 8) * 1.5, -11 + i * 2.6, 2.2 + hashLike(i, 9), 3 + hashLike(i, 10) * 2.4, 40 + i]);
  peaks.push([-15.5, -11.5, 2.4, 4.6, 70], [-10.5, -12.8, 2.2, 3.8, 71]);
  return {
    type: 'classic', seed: 0,
    townPos: towns.map(t => SLOTS[t.slot]),
    roads: ROADS_ALL.filter(r => used.has(r.a) && used.has(r.b)).map(r => r.pts.map(p => p.slice())),
    snapRoads: true,
    rivers: [
      { w: .8, pts: [[5.2, -21], [5.5, -13], [5.6, -8], [5.3, -3.5], [4.6, .5], [4.3, 5], [4.8, 9.5], [5.8, 13], [6.6, 18]] },
      { w: .55, pts: [[-8, -20], [-7.6, -13], [-7.2, -8], [-7, -3.5], [-5.6, .5], [-2, 1.6], [1.5, 1.4], [4.6, .7]] },
    ],
    fields: [
      { x: -14.6, z: 4.4, w: 3.2, d: 2.4, rot: .15 }, { x: 13.6, z: -1.6, w: 2.3, d: 2.4, rot: 0 }, { x: -10.2, z: 9.2, w: 3, d: 2.4, rot: -.12 },
      { x: 8.6, z: 10.8, w: 2.4, d: 2, rot: .2 }, { x: -1.5, z: -11.2, w: 3.4, d: 1.8, rot: 0 },
    ],
    farms: [[-12.4, 2.6, .2], [-16.6, 6.4, -.3], [14.9, -3.6, 0], [-8.3, 10.8, .5], [10.2, 12.2, -.2], [-3.6, -12.8, .1], [1.2, -12.4, -.4], [17.4, 8.2, .6]],
    windmill: [-12.6, 6.4], sheep: [[14.2, 10.2], [-15.6, 1.6]],
    forestDens: (x, z) => fbm(x * .14 + 20, z * .14) + 1.0 * Math.exp(-((x + 18) ** 2 + (z + 1) ** 2) / 14) + .5 * Math.exp(-((x - 0) ** 2 + (z + 14) ** 2) / 30),
    pineZone: (x, z, h) => z < -10 || h > 1.8,
    near: [-28, 22, -24, 18],
    sea, natural, peaks,
    farness: (x, z) => Math.max(smooth(-12.5, -19, z), smooth(-20, -27, x), smooth(28, 38, Math.hypot(x + 3, z + 3)), smooth(17.5, 22, x)),
    strokes: { x0: -20, x1: 70, z0: -16, z1: 59, n: 1400 },
    harborAngle: 0,
    boats: [
      { cx: 11.5 + 7.4, cz: -8, a: 1.4, b: 3.2, ang: 0, sp: .25, ph: 0, sail: 0 },
      { cx: 11.5 + 7.8, cz: -7, a: 2.6, b: 4.6, ang: 0, sp: -.16, ph: 2, sail: 1 },
      { cx: 2, cz: 17.4, a: 6, b: 1.4, ang: 0, sp: .09, ph: 1, sail: 0 },
      { cx: -3, cz: 22, a: 6, b: 2, ang: 0, sp: -.07, ph: 4, sail: 1 },
      { cx: 23, cz: -4, a: 3, b: 6, ang: 0, sp: .06, ph: 5, sail: 0 },
    ],
    anchors: { north: [-4, 7.8, -18], riverA: [5.9, .4, -11.5], riverB: [-7.2, .6, -12.5], forest: [-18, 2.4, -1.5], fields: [-14.6, 1.6, 5.2],
      sea: [24, .3, 2], bay: [2, .3, 21.5], west: [-42, 8.5, -4], lake: [-31, .4, 11] },
    pan: { x0: -17, x1: 16, z0: -13, z1: 12 },
    view: { x: -1.5, z: -1.5, dist: 62, az: -.55 }, // the hand-tuned yahaha.net angle
  };
}

// ------------------------------------------------------------------ generated
function autoWorld(cfg, towns, { vnoise, fbm, ridge }) {
  const R = mulberry(cfg.seed >>> 0 || 1);
  const rr = (a, b) => a + R() * (b - a), pick = a => a[Math.floor(R() * a.length)];
  const type = WORLD_TYPES.includes(cfg.type) ? cfg.type : pick(['coast', 'coast', 'twoCoasts', 'island', 'gulf', 'lakeland']);
  const NX = rr(0, 400), NZ = rr(0, 400);
  const thS = rr(0, TAU);
  const dSea = rr(17.5, 21);
  const R0 = rr(25, 28.5);
  const seaDirs = type === 'island' || type === 'lakeland' ? [] : [thS];
  let side2 = R() < .5 ? 1 : -1;
  if (type === 'twoCoasts') seaDirs.push(thS + side2 * rr(1.3, 1.8));
  const islandPh = rr(0, TAU), islandPh2 = rr(0, TAU);
  const islandR = a => R0 * (1 + .1 * Math.sin(3 * a + islandPh) + .06 * Math.sin(5 * a + islandPh2));
  const wob = (x, z) => (vnoise(x * .12 + NX, z * .12 + NZ) * .6 + vnoise(x * .27 + NX + 9, z * .27 + NZ - 4) * .4 - .5) * 2.6;
  const waters = []; // bays and lakes: { x, z, a, b, ang, k }
  const ell = (w, x, z) => { const dx = x - w.x, dz = z - w.z, c = Math.cos(w.ang), s = Math.sin(w.ang), u = dx * c + dz * s, v = -dx * s + dz * c; return (Math.hypot(u / w.a, v / w.b) - 1) * Math.min(w.a, w.b) * w.k; };
  const coastSd = (x, z) => {
    let d = 1e9;
    for (const th of seaDirs) d = Math.min(d, dSea - (x * Math.cos(th) + z * Math.sin(th))); // straight coasts; the wobble supplies the shape
    if (type === 'island') { const r = Math.hypot(x, z); d = Math.min(d, islandR(Math.atan2(z, x)) - r); }
    if (type === 'lakeland') d = Math.min(d, 46 - Math.hypot(x, z));
    return d;
  };
  const seaSdRaw = (x, z) => { let d = coastSd(x, z); for (const w of waters) d = Math.min(d, ell(w, x, z)); return d; };

  // mountain ranges: arcs around the centre, away from the sea
  const ranges = [];
  const thM = seaDirs.length ? thS + Math.PI - side2 * rr(0, .6) : rr(0, TAU);
  const dM = type === 'island' ? R0 - 7.5 : rr(16.5, 20);
  ranges.push({ th: thM, d: dM, span: rr(.55, .95), big: true });
  if (R() < .6) {
    const th2 = thM + (R() < .5 ? 1 : -1) * rr(1.1, 1.7);
    if (!seaDirs.some(s => angDiff(s, th2) < 1.1)) ranges.push({ th: th2, d: dM + rr(-1, 2.5), span: rr(.3, .55), big: false });
  }
  for (const g of ranges) g.ph = rr(0, TAU);
  const rangeR = (g, a) => g.d + Math.sin(a * 3 + g.ph) * 1.2;
  const mountK = (x, z, off = 0) => {
    const r = Math.hypot(x, z), a = Math.atan2(z, x);
    let k = 0;
    for (const g of ranges) { const w = smooth(g.span + .45, g.span - .05, angDiff(a, g.th)); k = Math.max(k, w * smooth(rangeR(g, a) - 7 + off, rangeR(g, a) - 1 + off, r)); }
    return k;
  };
  const behindK = (x, z) => {
    const r = Math.hypot(x, z), a = Math.atan2(z, x);
    let k = 0;
    for (const g of ranges) { const w = smooth(g.span + .45, g.span - .05, angDiff(a, g.th)) * (g.big ? 1 : .8); k = Math.max(k, w * smooth(rangeR(g, a), rangeR(g, a) + 12, r)); }
    return k;
  };

  // towns
  const pos = [];
  const fits = (x, z, t, gap) => {
    const rad = Math.max(t.rx, t.rz);
    if (coastSd(x, z) < rad + 3) return false;
    if (t.slot !== 'highland' && mountK(x, z) > .15) return false;
    return pos.every((p, i) => !p || Math.hypot(p.cx - x, p.cz - z) > rad + Math.max(towns[i].rx, towns[i].rz) + gap);
  };
  const ROLE_ORDER = ['center', 'highland', 'coast', 'south', 'east', 'town'];
  const order = towns.map((t, i) => i).sort((a, b) => ROLE_ORDER.indexOf(towns[a].slot) - ROLE_ORDER.indexOf(towns[b].slot));
  for (const i of order) {
    const t = towns[i], rad = Math.max(t.rx, t.rz);
    let got = null;
    for (let tries = 0; tries < 400 && !got; tries++) {
      const gap = 3.6 - Math.floor(tries / 100) * .6;
      let x, z;
      if (t.slot === 'center') { x = rr(-2.5, 2.5); z = rr(-2.5, 2.5); }
      else if (t.slot === 'coast') {
        const th = seaDirs.length ? thS : thS, base = (type === 'island' ? islandR(th) : type === 'lakeland' ? 22 : dSea) - rad - rr(2.6, 3.4), lat = rr(-6, 6);
        x = Math.cos(th) * base - Math.sin(th) * lat; z = Math.sin(th) * base + Math.cos(th) * lat;
      } else if (t.slot === 'highland') {
        const g = ranges[0], a = g.th + rr(-g.span * .7, g.span * .7), r = rangeR(g, a) - rr(5.5, 6.8);
        x = Math.cos(a) * r; z = Math.sin(a) * r;
      } else { const a = rr(0, TAU), r = towns.length > 5 ? rr(6.5, 15) : rr(8.5, 14); x = Math.cos(a) * r; z = Math.sin(a) * r; }
      if (fits(x, z, t, gap)) got = { cx: x, cz: z };
    }
    if (!got) { // best candidate: the land point farthest from every placed town
      let best = -1;
      for (let gx = -22; gx <= 22; gx += 1) for (let gz = -22; gz <= 22; gz += 1) {
        if (coastSd(gx, gz) < rad + 2.5 || (t.slot !== 'highland' && mountK(gx, gz) > .15)) continue;
        const d = pos.reduce((m, p, j) => p ? Math.min(m, Math.hypot(p.cx - gx, p.cz - gz) - Math.max(towns[j].rx, towns[j].rz)) : m, 99) - rad - Math.hypot(gx, gz) * .02;
        if (d > best) { best = d; got = { cx: gx + rr(-.3, .3), cz: gz + rr(-.3, .3) }; }
      }
      if (!got) { const a = i / towns.length * TAU; got = { cx: Math.cos(a) * 12, cz: Math.sin(a) * 12 }; }
    }
    got.y = t.slot === 'highland' ? 1.7 : .2; got.gate = t.slot === 'highland'; got.harbor = t.slot === 'coast' && type !== 'lakeland';
    pos[i] = got;
  }
  const near = (x, z, pad) => pos.some((p, i) => Math.hypot(p.cx - x, p.cz - z) < Math.max(towns[i].rx, towns[i].rz) + pad);
  const highland = pos.find(p => p.gate);

  // bay (gulf worlds always get one, others sometimes)
  const coastTown = pos.find(p => p.harbor);
  if (seaDirs.length && (type === 'gulf' || R() < .45)) {
    for (let tries = 0; tries < 40; tries++) {
      const lat = rr(-12, 12), th = thS, a = type === 'gulf' ? rr(7, 10) : rr(4.5, 7), b = type === 'gulf' ? rr(5, 8) : rr(3, 4.5);
      const x = Math.cos(th) * (dSea - .5) - Math.sin(th) * lat, z = Math.sin(th) * (dSea - .5) + Math.cos(th) * lat;
      const w = { x, z, a, b, ang: th + Math.PI / 2, k: 1 };
      if (pos.every((p, i) => ell(w, p.cx, p.cz) > Math.max(towns[i].rx, towns[i].rz) + 2.5) && (!coastTown || Math.hypot(coastTown.cx - x, coastTown.cz - z) > a + 6)) { waters.push(w); break; }
    }
  }

  // rivers: from a range down to the sea (or a lake in landlocked worlds)
  const rivers = [];
  const nRiv = type === 'lakeland' ? 1 : R() < .65 ? 2 : 1;
  for (let k = 0; k < nRiv; k++) {
    const g = ranges[k % ranges.length], a0 = g.th + rr(-g.span * .8, g.span * .8);
    const src = [Math.cos(a0) * (rangeR(g, a0) + 2), Math.sin(a0) * (rangeR(g, a0) + 2)];
    let mouth;
    if (seaDirs.length) { const th = pick(seaDirs), lat = rr(-10, 10) * (k ? -1 : 1); mouth = [Math.cos(th) * (dSea + 5) - Math.sin(th) * lat, Math.sin(th) * (dSea + 5) + Math.cos(th) * lat]; }
    else if (type === 'island') { const th = a0 + Math.PI + rr(-.7, .7); mouth = [Math.cos(th) * (R0 + 5), Math.sin(th) * (R0 + 5)]; }
    else { const th = a0 + Math.PI + rr(-.5, .5); mouth = [Math.cos(th) * 40, Math.sin(th) * 40]; }
    const n = 9, amp = rr(1.5, 3.2), freq = rr(1.2, 2.4), ph = rr(0, TAU);
    const dx = mouth[0] - src[0], dz = mouth[1] - src[1], L = Math.hypot(dx, dz), nx = -dz / L, nz = dx / L;
    let pts = [];
    for (let i = 0; i < n; i++) { const t = i / (n - 1), m = Math.sin(t * Math.PI * freq + ph) * amp * Math.sin(t * Math.PI); pts.push([src[0] + dx * t + nx * m, src[1] + dz * t + nz * m]); }
    const width = k ? .55 : .8;
    pts = routeRiverAroundTowns(pts, pos.map((p, i) => ({ ...p, rx: towns[i].rx, rz: towns[i].rz })), width);
    rivers.push({ w: width, pts });
  }

  // roads: a spanning tree between towns, one extra link, and a lane leaving the map
  const roads = [];
  const edgeToward = (i, j) => { const a = pos[i], b = pos[j], th = Math.atan2(b.cz - a.cz, b.cx - a.cx); return th; };
  const inTree = [0], links = [];
  while (inTree.length < pos.length) {
    let best = null;
    for (const i of inTree) for (let j = 0; j < pos.length; j++) if (!inTree.includes(j)) { const d = Math.hypot(pos[i].cx - pos[j].cx, pos[i].cz - pos[j].cz); if (!best || d < best[2]) best = [i, j, d]; }
    links.push(best); inTree.push(best[1]);
  }
  if (pos.length > 2 && R() < .6) {
    let best = null;
    for (let i = 0; i < pos.length; i++) for (let j = i + 1; j < pos.length; j++) if (!links.some(l => (l[0] === i && l[1] === j) || (l[0] === j && l[1] === i))) { const d = Math.hypot(pos[i].cx - pos[j].cx, pos[i].cz - pos[j].cz); if (d < 22 && (!best || d < best[2])) best = [i, j, d]; }
    if (best) links.push(best);
  }
  for (const [i, j] of links) roads.push({ i, j, th1: edgeToward(i, j), th2: edgeToward(j, i), bend: rr(-.2, .2) });
  const lanes = 1 + (R() < .5 ? 1 : 0);
  for (let k = 0; k < lanes; k++) {
    for (let tries = 0; tries < 30; tries++) {
      const i = Math.floor(R() * pos.length), th = rr(0, TAU), p = pos[i], r = Math.max(towns[i].rx, towns[i].rz);
      const ex = p.cx + Math.cos(th) * (r + 6), ez = p.cz + Math.sin(th) * (r + 6);
      if (coastSd(ex, ez) > 4 && mountK(ex, ez) < .1 && !near(ex, ez, 1.5) && pos.every((q, j) => j === i || angDiff(th, Math.atan2(q.cz - p.cz, q.cx - p.cx)) > .7)) {
        roads.push({ i, j: -1, th1: th, end: [ex, ez], bend: rr(-.15, .15) }); break;
      }
    }
  }

  // lakes, away from towns, roads and rivers (added after roads so they never swallow one)
  const riverPolys = rivers.map(r => r.pts), roadLines = () => roads.map(r => [[pos[r.i].cx, pos[r.i].cz], r.j >= 0 ? [pos[r.j].cx, pos[r.j].cz] : r.end]);
  const nLakes = type === 'lakeland' ? 3 : type === 'island' ? (R() < .5 ? 1 : 0) : (R() < .55 ? 1 : 0) + (R() < .2 ? 1 : 0);
  for (let k = 0; k < nLakes; k++) for (let tries = 0; tries < 60; tries++) {
    const a = rr(0, TAU), r = type === 'lakeland' ? rr(9, 24) : rr(12, 26), x = Math.cos(a) * r, z = Math.sin(a) * r;
    const w = { x, z, a: rr(3, 5.5), b: rr(2.2, 3.4), ang: rr(0, Math.PI), k: .9 };
    if (coastSd(x, z) < w.a + 4 || mountK(x, z) > .05) continue;
    if (pos.some((p, i) => Math.hypot(p.cx - x, p.cz - z) < Math.max(towns[i].rx, towns[i].rz) + w.a + 2.5)) continue;
    if (roadLines().some(l => segDist(l, x, z) < w.a + 1.5) || riverPolys.some(l => segDist(l, x, z) < w.a + 1)) continue;
    if (waters.some(o => Math.hypot(o.x - x, o.z - z) < o.a + w.a + 3)) continue;
    waters.push(w); break;
  }
  const lakes = waters.filter(w => w.k < 1);

  const sea = (x, z) => seaSdRaw(x, z) + wob(x, z);
  const landish = (x, z, pad) => coastSd(x, z) > pad && waters.every(w => ell(w, x, z) > pad * .6);
  const clearOf = (x, z, pad) => !near(x, z, pad) && !roadLines().some(l => segDist(l, x, z) < pad * .7) && !riverPolys.some(l => segDist(l, x, z) < pad * .8) && mountK(x, z) < .1;

  // fields, farms, windmill, sheep
  const fields = [];
  for (let tries = 0; tries < 200 && fields.length < 5; tries++) {
    const a = rr(0, TAU), r = rr(6, 24), x = Math.cos(a) * r, z = Math.sin(a) * r;
    const f = { x, z, w: rr(2.2, 3.4), d: rr(1.8, 2.4), rot: rr(-.35, .35) };
    if (!landish(x, z, 4) || !clearOf(x, z, 3.4)) continue;
    if (fields.some(o => Math.hypot(o.x - x, o.z - z) < 5)) continue;
    fields.push(f);
  }
  const farms = [];
  for (let tries = 0; tries < 300 && farms.length < 8; tries++) {
    const base = fields.length && R() < .6 ? pick(fields) : null;
    const x = base ? base.x + rr(-3, 3) : rr(-24, 24), z = base ? base.z + rr(-3, 3) : rr(-24, 24);
    if (!landish(x, z, 2.5) || !clearOf(x, z, 1.8)) continue;
    if (fields.some(o => Math.abs(o.x - x) < o.w / 2 + .9 && Math.abs(o.z - z) < o.d / 2 + .9)) continue;
    if (farms.some(o => Math.hypot(o[0] - x, o[1] - z) < 1.6)) continue;
    farms.push([x, z, rr(-.6, .6)]);
  }
  const windmill = fields.length ? [fields[0].x + fields[0].w / 2 + 1.2, fields[0].z + 1] : null;
  const sheep = (fields.length >= 2 ? [fields[1], fields[0]] : fields).map(f => [f.x - f.w / 2 - 1.4, f.z - .6]);

  // forests: a few dense woods plus scattered trees
  const woods = [];
  for (let tries = 0; tries < 80 && woods.length < 3; tries++) {
    const a = rr(0, TAU), r = rr(9, 26), x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (!landish(x, z, 3) || near(x, z, 3) || woods.some(w => Math.hypot(w[0] - x, w[1] - z) < 8)) continue;
    woods.push([x, z, rr(10, 22), woods.length ? .55 : 1]);
  }
  const forestDens = (x, z) => fbm(x * .14 + NX + 20, z * .14 + NZ) + woods.reduce((s, [wx, wz, r2, amp]) => s + amp * Math.exp(-((x - wx) ** 2 + (z - wz) ** 2) / r2), 0);

  // heights
  const natural = (x, z) => {
    let h = .6 + (fbm(x * .12 + NX, z * .12 + NZ) - .5) * 1.5;
    if (highland) h += 2.0 * Math.exp(-((x - highland.cx) ** 2 + (z - highland.cz) ** 2) / 34);
    h += mountK(x, z) * (1.2 + 1.8 * fbm(x * .2 + NX + 11, z * .2 + NZ));
    h += behindK(x, z) * (2 + 6.5 * ridge(x * .085 + NX + 2, z * .085 + NZ));
    const far = smooth(30, 60, Math.hypot(x, z)); h += far * (fbm(x * .05 + NX + 3, z * .05 + NZ) - .35) * 3.4;
    return h;
  };
  const farness = (x, z) => Math.max(smooth(26, 38, Math.hypot(x, z)), behindK(x, z) * .9, mountK(x, z, 3) * .7);

  // peaks along each range, keeping clear of towns and river valleys
  const peaks = [];
  ranges.forEach((g, gi) => {
    const arc = g.span * 2 * g.d, n = Math.max(4, Math.round(arc / 3));
    for (let i = 0; i < n; i++) {
      const a = g.th - g.span + (i + .5) / n * g.span * 2 + rr(-.04, .04), r = rangeR(g, a) + 1.2 + R() * 2.8;
      const x = Math.cos(a) * r, z = Math.sin(a) * r, rad = g.big ? 2.6 + R() * 1.8 : 2.2 + R(), h = g.big ? 3.6 + R() * 3.8 : 3 + R() * 2.4;
      if (riverPolys.some(l => segDist(l, x, z) < rad * .75) || near(x, z, rad + .8) || coastSd(x, z) < rad) continue;
      peaks.push([x, z, rad, h, gi * 40 + i]);
    }
    if (gi === 0) for (let k = 0; k < 2; k++) {
      const a = g.th + rr(-g.span, g.span), r = rangeR(g, a) - 2.5, x = Math.cos(a) * r, z = Math.sin(a) * r, rad = 2.2 + R() * .4;
      if (!near(x, z, rad + 1) && !riverPolys.some(l => segDist(l, x, z) < rad)) peaks.push([x, z, rad, 3.8 + R() * .9, 70 + k]);
    }
  });

  // boats: around the harbour and out at sea
  const boats = [];
  const seaPoint = (lat, out) => { const th = seaDirs.length ? thS : thS, base = type === 'island' ? islandR(th) : type === 'lakeland' ? 0 : dSea; return [Math.cos(th) * (base + out) - Math.sin(th) * lat, Math.sin(th) * (base + out) + Math.cos(th) * lat]; };
  if (type !== 'lakeland') {
    if (coastTown) {
      const th = thS, off = Math.max(...towns.filter((t, i) => pos[i] === coastTown).map(t => t.rx)) + 3.2;
      boats.push({ cx: coastTown.cx + Math.cos(th) * off, cz: coastTown.cz + Math.sin(th) * off, a: 1.4, b: 3.2, ang: th, sp: .25, ph: 0, sail: 0 });
      boats.push({ cx: coastTown.cx + Math.cos(th) * (off + .6), cz: coastTown.cz + Math.sin(th) * (off + .6), a: 2.6, b: 4.6, ang: th, sp: -.16, ph: 2, sail: 1 });
    }
    for (let k = 0; k < 3; k++) { const [x, z] = seaPoint(rr(-14, 14), rr(5, 10)); boats.push({ cx: x, cz: z, a: rr(3, 6), b: rr(1.2, 2.5), ang: thS + Math.PI / 2, sp: (k % 2 ? -1 : 1) * rr(.05, .1), ph: k * 1.7, sail: k % 2 }); }
  }
  for (const l of lakes) boats.push({ cx: l.x, cz: l.z, a: l.a * .45, b: l.b * .4, ang: l.ang, sp: .08, ph: 3, sail: 1 });

  // label anchors
  const g0 = ranges[0], g1 = ranges[1];
  const at = (g, k = 2) => [Math.cos(g.th) * (rangeR(g, g.th) + k), Math.sin(g.th) * (rangeR(g, g.th) + k)];
  const mid = (r, u) => { const i = Math.min(r.pts.length - 2, Math.floor(u * (r.pts.length - 1))), t = u * (r.pts.length - 1) - i, a = r.pts[i], b = r.pts[i + 1]; return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]; };
  const bay = waters.find(w => w.k === 1);
  const anchors = {
    north: [...at(g0), 7.8], riverA: rivers[0] ? [...mid(rivers[0], .4), .4] : null, riverB: rivers[1] ? [...mid(rivers[1], .45), .6] : null,
    forest: woods[0] ? [woods[0][0], woods[0][1], 2.4] : null, fields: fields[0] ? [fields[0].x, fields[0].z + .8, 1.6] : null,
    sea: type === 'lakeland' ? null : [...seaPoint(0, 6), .3], bay: bay ? [bay.x, bay.z, .3] : type === 'lakeland' ? null : [...seaPoint(12, 5), .3],
    west: g1 ? [...at(g1, 3), 8.5] : [...at(g0, 14), 8.5], lake: lakes[0] ? [lakes[0].x, lakes[0].z, .4] : null,
  };
  for (const k of Object.keys(anchors)) if (anchors[k]) { const [x, z, y] = anchors[k]; anchors[k] = [x, y, z]; }

  // camera: look in from the sea (or from opposite the main range when there is no open
  // coast), so the shore is in front and the mountains rise behind the towns; then nudge the
  // angle until no peak stands between the camera and any town
  function bestAzimuth(tx, tz, dist) {
    const PHI = .9, base = seaDirs.length ? thS : ranges[0].th + Math.PI;
    const camY = dist * Math.cos(PHI), camR = dist * Math.sin(PHI);
    const blocked = alpha => {
      const gx = tx + Math.cos(alpha) * camR, gz = tz + Math.sin(alpha) * camR;
      let s = 0;
      pos.forEach(p => { for (let t = .08; t < .97; t += .04) {
        const x = gx + (p.cx - gx) * t, z = gz + (p.cz - gz) * t, y = camY + (p.y + .4 - camY) * t;
        for (const [px, pz, r, h] of peaks) { const d = Math.hypot(x - px, z - pz); if (d < r) { const ph = h * (1 - d / r) - .6; if (ph > y) s += ph - y; } }
        if (mountK(x, z) > .5 && t > .5) s += mountK(x, z) * .2;
      } });
      return s;
    };
    let best = base, score = Infinity;
    for (const off of [0, .3, -.3, .6, -.6, .9, -.9, 1.2, -1.2]) { const v = blocked(base + off) + Math.abs(off) * .4; if (v < score) { score = v; best = base + off; } }
    return Math.atan2(Math.cos(best), Math.sin(best)); // three.js spherical theta (from +z toward +x), in −π…π
  }

  // camera
  const cx = pos.reduce((s, p) => s + p.cx, 0) / pos.length, cz = pos.reduce((s, p) => s + p.cz, 0) / pos.length;
  const spread = Math.max(...pos.map((p, i) => Math.hypot(p.cx - cx, p.cz - cz) + Math.max(towns[i].rx, towns[i].rz)));
  return {
    type, seed: cfg.seed >>> 0, townPos: pos, minFieldY: .25,
    roadsSpec: roads, snapRoads: false, rivers, fields, farms, windmill, sheep, forestDens,
    pineZone: (x, z, h) => h > 1.8 || mountK(x, z, 4) > .3,
    near: [-30, 30, -30, 30], sea, natural, farness, peaks,
    strokes: { x0: -70, x1: 70, z0: -70, z1: 70, n: 2600 },
    harborAngle: thS, boats, anchors,
    pan: { x0: cx - spread - 2, x1: cx + spread + 2, z0: cz - spread - 2, z1: cz + spread + 2 },
    view: { x: cx, z: cz, dist: Math.max(50, spread * 3.4), az: bestAzimuth(cx, cz, Math.max(50, spread * 3.4)) },
  };
}
