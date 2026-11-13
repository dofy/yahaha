// site-to-map engine: a folded-paper 3D map drawn with three.js.
// Everything site-specific comes from a site.json object (see references/site-schema.md):
// categories become towns on five fixed slots, links become landmark buildings or props.
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { assignLandmarkKinds, makeWorld, strSeed } from './world-gen.js';
import './daylight.js'; // also loaded in <head>; sets window.SiteMapDaylight

export async function mountMap(SITE) {
// ---------------- data from site.json ----------------
const CENTER = { x: 4, z: 8.5 };
const COLS = 'ABC';
const WL = -0.3; // water level
// five town roles; the world generator decides where each one sits
const SLOTS = { center: {}, highland: {}, coast: {}, south: {}, east: {}, town: {} }; // town: any extra, repeatable
const SLOT_ORDER = ['center', 'south', 'coast', 'east', 'highland'];
const PROP_KINDS = new Set(['oak', 'pine', 'birch', 'rock', 'boulders', 'signpost', 'flowerbed', 'statue', 'well', 'lamp', 'bench', 'stall']);
// text fields are a string or { <lang>: string, … } with any language codes
const loc = (v, lang) => v == null ? '' : typeof v === 'string' ? v : (v[lang] ?? v.en ?? Object.values(v)[0] ?? '');
const CITIES = [];
{
  const taken = new Set((SITE.cities || []).map(c => c.slot).filter(s => SLOTS[s]));
  const free = SLOT_ORDER.filter(s => !taken.has(s));
  for (const src of (SITE.cities || []).slice(0, 9)) {
    const slot = SLOTS[src.slot] ? src.slot : free.shift() || 'town';
    const all = assignLandmarkKinds(src.items || [], src.id, PROP_KINDS);
    const builds = all.filter(it => !PROP_KINDS.has(it.kind)).slice(0, 9);
    const props = all.filter(it => !builds.includes(it));
    const n = builds.length, [cols, rows] = n <= 2 ? [2, 1] : n <= 4 ? [2, 2] : n <= 6 ? [3, 2] : [3, 3];
    const f = src.features || {};
    const c = {
      id: src.id, slot, en: loc(src.name, 'en'), name: loc(src.name, 'en'), nameRaw: src.name,
      roleRaw: src.role, blurbRaw: src.blurb, key: (src.key || '').toLowerCase(),
      cols, rows, y: .2, gate: false, harbor: false,
      walls: !!f.walls, hedge: !!f.hedge, lamps: f.lamps !== false, centerpiece: f.centerpiece || (slot === 'east' ? 'fountain' : slot === 'coast' ? 'statue' : 'pond'),
      roof: (src.style && src.style.roofs && src.style.roofs[0]) || 'terra',
      style: { walls: ['paper', 'road', 'wallRose', 'wallSage'], roofs: ['terra', 'mustard', 'olive', 'roofSlate'], annex: ['tree', 'lantern', 'hut', 'barrels'], ...(src.style || {}) },
      items: [...builds, ...props], nBuild: n, suburbs: f.suburbs ?? (slot === 'highland' ? 3 : 7),
    };
    c.W = cols * 2 + 1; c.H = rows * 2 + 1;
    CITIES.push(c);
  }
}
// ---------------- world: classic continent or a generated one ----------------
const WCFG = { ...(SITE.world || {}) };
{ const q = new URLSearchParams(location.search); if (q.get('seed')) WCFG.seed = strSeed(q.get('seed')); if (q.get('world')) { WCFG.type = q.get('world'); if (WCFG.layout === 'classic') WCFG.layout = 'auto'; } if (q.get('seed') && WCFG.layout === 'classic') WCFG.layout = 'auto'; }
// "{domain}" in the seed becomes the domain this page is served on (matched against
// site.domains, www. stripped); hosts not in the list (localhost, preview deploys) use site.brand
const SEED_DOMAIN = (() => { const h = location.hostname.replace(/^www\./, '').toLowerCase(), list = SITE.site?.domains || [];
  return (list.find(d => d.toLowerCase() === h) || SITE.site?.brand || h || 'map').toLowerCase(); })();
if (WCFG.seed == null) WCFG.seed = strSeed((SITE.site?.brand || '') + '|' + CITIES.map(c => c.id).join(','));
else if (typeof WCFG.seed === 'string') WCFG.seed = strSeed(WCFG.seed.replaceAll('{domain}', SEED_DOMAIN));
// townSize "fixed" (default): lay towns out as if each held nine buildings, so adding or
// removing buildings never moves the land; "fit": use each town's real size (tighter, but the
// layout shifts when a town crosses 2/4/6/9 buildings). classic ignores it.
const FIXED_SIZE = WCFG.layout !== 'classic' && WCFG.townSize !== 'fit';
const WORLD = makeWorld(WCFG, CITIES.map(c => FIXED_SIZE ? { slot: c.slot, rx: 7 / 2 + .95, rz: 7 / 2 + .95 } : { slot: c.slot, rx: c.W / 2 + .95, rz: c.H / 2 + .95 }), { vnoise, fbm: (x, y) => fbm(x, y), ridge: (x, z) => ridge(x, z) });
CITIES.forEach((c, i) => { const P = WORLD.townPos[i]; c.cx = P.cx; c.cz = P.cz; c.y = P.y; c.gate = !!P.gate; c.harbor = !!P.harbor;
  c.ox = c.cx + CENTER.x - c.W / 2; c.oy = c.cz + CENTER.z - c.H / 2; });
const SP = 2.15;
for (const c of CITIES) {
  { const sx = FIXED_SIZE ? Math.round(c.cx * 10) : c.ox, sz = FIXED_SIZE ? Math.round(c.cz * 10) : c.oy; c.ph = hash(sx + 40, sz + 40) * 6.28; c.ang = (hash(sz + 9, sx + 9) - .5) * .7; }
  c.rx = c.W / 2 + .95; c.rz = c.H / 2 + .95; c.slots = [];
  const ca = Math.cos(c.ang), sa = Math.sin(c.ang);
  for (let k = 0; k < c.cols * c.rows; k++) {
    const col = k % c.cols, row = Math.floor(k / c.cols);
    const x = (col - (c.cols - 1) / 2) * SP + (hash(k, c.ox + 3) - .5) * .6, z = (row - (c.rows - 1) / 2) * SP + (hash(k, c.oy + 5) - .5) * .6;
    c.slots.push([x * ca - z * sa, x * sa + z * ca]);
  }
}
function blobR(c, th) { return 1 + .12 * Math.sin(3 * th + c.ph) + .07 * Math.sin(5 * th + c.ph * 2.3) + .05 * Math.sin(2 * th + c.ph * .7); }
function blobSd(c, x, z) { const dx = (x - c.cx) / c.rx, dz = (z - c.cz) / c.rz; return (Math.hypot(dx, dz) - blobR(c, Math.atan2(dz, dx))) * Math.min(c.rx, c.rz); }
function blobPt(c, th, k = 1) { const r = blobR(c, th) * k; return [Math.cos(th) * c.rx * r, Math.sin(th) * c.rz * r]; }
const RIVERS = WORLD.rivers.map(r => ({ ...r, pts: r.pts.map(p => p.slice()) }));
// classic roads come as fixed polylines; generated ones as town-to-town links shaped here
const ROADS = (WORLD.snapRoads ? WORLD.roads : WORLD.roadsSpec.map(r => {
  const A = CITIES[r.i], [ax, az] = blobPt(A, r.th1, .88), a = [A.cx + ax, A.cz + az];
  let b;
  if (r.j >= 0) { const B = CITIES[r.j], [bx, bz] = blobPt(B, r.th2, .88); b = [B.cx + bx, B.cz + bz]; } else b = r.end;
  const dx = b[0] - a[0], dz = b[1] - a[1], m = [(a[0] + b[0]) / 2 - dz * r.bend, (a[1] + b[1]) / 2 + dx * r.bend];
  return [a, m, b];
})).map(pts => {
  if (WORLD.snapRoads) for (const end of [pts[0], pts[pts.length - 1]]) {
    const c = CITIES.slice().sort((p, q) => Math.hypot(p.cx - end[0], p.cz - end[1]) - Math.hypot(q.cx - end[0], q.cz - end[1]))[0];
    if (c && blobSd(c, end[0], end[1]) > .8) { const th = Math.atan2((end[1] - c.cz) / c.rz, (end[0] - c.cx) / c.rx), [bx, bz] = blobPt(c, th, .96); end[0] = c.cx + bx; end[1] = c.cz + bz; }
  }
  return pts;
});
const FIELDS = WORLD.fields.map(f => ({ ...f }));

// ---------------- language, domain, theme preference ----------------
const SITEINFO = SITE.site || {};
const DOMAINS = SITEINFO.domains || [SITEINFO.brand || location.hostname || 'localhost'];
const host = location.hostname.replace(/^www\./, '').toLowerCase();
const DOMAIN = DOMAINS.find(d => d.toLowerCase() === host) || SITEINFO.brand || DOMAINS[DOMAINS.length - 1];
const STORE_KEY = (SITEINFO.storageKey || 'site-map') + '-lang';
// optional interface features (site.json "ui"); see references/site-schema.md
const UI = { languageSwitch: false, shortcuts: false, tour: true, views: true, clock: true, compass: true,
  daylight: 'auto', intro: true, motion: true, blur: true, infoOpen: true, ...(SITE.ui || {}) };
const store = { get: k => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* storage may be disabled */ } } };
// languages: site.languages, or every language code used in the content
const LANGS = (() => {
  if (Array.isArray(SITEINFO.languages) && SITEINFO.languages.length) return SITEINFO.languages;
  const seen = new Set(), add = v => { if (v && typeof v === 'object') Object.keys(v).forEach(k => seen.add(k)); };
  for (const c of SITE.cities || []) { add(c.name); add(c.role); add(c.blurb); (c.items || []).forEach(it => { add(it.name); add(it.desc); }); }
  return [...seen];
})();
const ZH_HANT = /^zh-(hant|tw|hk|mo)\b/i, ZH_HANS = /^zh-(hans|cn|sg|my)\b/i;
const matchLang = b => { const p = b.toLowerCase();
  return LANGS.find(l => l.toLowerCase() === p)
    || (ZH_HANT.test(p) && LANGS.find(l => /^zh-(hant|tw|hk)/i.test(l))) || (ZH_HANS.test(p) && LANGS.find(l => /^zh(-(hans|cn))?$/i.test(l)))
    || LANGS.find(l => p.startsWith(l.toLowerCase() + '-') && !(/^zh$/i.test(l) && ZH_HANT.test(p))) || null; };
const browserLang = () => { for (const b of navigator.languages || [navigator.language || 'en']) { const hit = matchLang(b); if (hit) return hit; } return null; };
let LANG = (UI.languageSwitch && LANGS.includes(store.get(STORE_KEY)) ? store.get(STORE_KEY) : null)
  || (SITEINFO.lang && SITEINFO.lang !== 'auto' ? SITEINFO.lang : null)
  || browserLang() || (LANGS.includes('en') ? 'en' : LANGS[0])
  || ((navigator.language || 'en').toLowerCase().startsWith('zh') ? 'zh' : 'en');
const T = {
  zh: { cities: '城市', worldName: '全图', homeTip: '回到全图，恢复默认视角', townCount: '{n} 座城', map: '全图', tour: '导览', spin: '环绕', top: '俯视', hide: '收起', show: '展开', info: '说明', where: '位置', view: '视角',
    hintW: '拖拽旋转 · Shift/空格+拖拽平移 · 滚轮缩放', hintC: '点建筑看详情 · Esc 返回', title: '地图', sub: '{n} 座城，一片大陆',
    intro: '每座城是一个分类，城里每座建筑是一个工具或链接。道路和桥把它们连在一起。点城名飞进去，或者按“导览”。',
    plots: '{n} 处', plot: '区', open: '进入', about: '关于我', fold: '正在折这片地图', prep: '准备纸张…', titleSuffix: '地图',
    steps: ['铺开地形', '折起山脉', '修路架桥', '开垦农田', '盖起城镇', '种一片森林', '放出行人和船'],
    phases: ['深夜', '日出', '早晨', '上午', '正午', '下午', '傍晚', '夜晚'], langName: '简体中文', langShort: '简',
    keysT: '快捷键', keysClose: '按 ? 或 Esc 关闭', keysHint: '按 ? 看快捷键',
    keys: [[`1–${Math.min(9, CITIES.length)}`, '按列表顺序飞到对应的城'], ['KEYS', '按城名首字母飞过去'], ['0 / H', '回到全图，恢复默认视角'], ['↑ ↓', '上一个 / 下一个城'], ['← →', '上一个 / 下一个建筑'], ['Enter', '打开选中的建筑'], ['Esc', '返回上一级'], ['+ −', '拉近 / 拉远'], ['Shift 空格', '按住再拖拽可平移'], ['T', '开始或停止导览'], ['O', '开关环绕'], ['V', '开关俯视'], ['L', '切换语言'], ['I', '收起或展开信息卡']],
    nowebgl: '这个浏览器没法创建 WebGL，3D 地图无法显示。右下角列表仍然可以导航。' },
  en: { cities: 'Cities', worldName: 'Map', homeTip: 'Back to the whole map at the default angle', townCount: '{n} towns', map: 'Map', tour: 'Tour', spin: 'Orbit', top: 'Top', hide: 'Hide', show: 'Show', info: 'About this map', where: 'Location', view: 'View',
    hintW: 'Drag to orbit · Shift/Space + drag to pan · Scroll to zoom', hintC: 'Click a building for details · Esc to go back', title: 'Map', sub: '{n} towns, one continent',
    intro: 'Each town is a category and each building in it is a tool or a link. Roads and bridges join them up. Click a town name to fly in, or press Tour.',
    plots: '{n} places', plot: 'Plot', open: 'Open', about: 'About me', fold: 'Folding the map', prep: 'Preparing paper…', titleSuffix: 'map',
    steps: ['Laying out the land', 'Folding the mountains', 'Building roads and bridges', 'Ploughing the fields', 'Raising the towns', 'Planting a forest', 'Sending out travellers and boats'],
    phases: ['Late night', 'Sunrise', 'Morning', 'Forenoon', 'Noon', 'Afternoon', 'Dusk', 'Evening'], langName: 'English', langShort: 'EN',
    keysT: 'Keyboard shortcuts', keysClose: 'Press ? or Esc to close', keysHint: 'Press ? for shortcuts',
    keys: [[`1–${Math.min(9, CITIES.length)}`, 'Fly to a town in list order'], ['KEYS', 'Fly to a town by its initial'], ['0 / H', 'Back to the whole map, default angle'], ['↑ ↓', 'Previous / next town'], ['← →', 'Previous / next building'], ['Enter', 'Open the selected building'], ['Esc', 'Go back one level'], ['+ −', 'Zoom in / out'], ['Shift Space', 'Hold and drag to pan'], ['T', 'Start or stop the tour'], ['O', 'Toggle orbit'], ['V', 'Toggle top view'], ['L', 'Switch language'], ['I', 'Hide or show the info card']],
    nowebgl: 'This browser could not create WebGL, so the 3D map cannot be shown. The list in the corner still works.' },
  'zh-Hant': { cities: '城市', worldName: '全圖', homeTip: '回到全圖，恢復預設視角', townCount: '{n} 座城', map: '全圖', tour: '導覽', spin: '環繞', top: '俯視', hide: '收起', show: '展開', info: '說明', where: '位置', view: '視角',
    hintW: '拖曳旋轉 · Shift/空白鍵+拖曳平移 · 滾輪縮放', hintC: '點建築看詳情 · Esc 返回', title: '地圖', sub: '{n} 座城，一片大陸',
    intro: '每座城是一個分類，城裡每座建築是一個工具或連結。道路和橋把它們連在一起。點城名飛進去，或者按「導覽」。',
    plots: '{n} 處', plot: '區', open: '進入', about: '關於我', fold: '正在摺這片地圖', prep: '準備紙張…', titleSuffix: '地圖',
    steps: ['鋪開地形', '摺起山脈', '修路架橋', '開墾農田', '蓋起城鎮', '種一片森林', '放出行人和船'],
    phases: ['深夜', '日出', '清晨', '上午', '正午', '下午', '傍晚', '夜晚'], langName: '繁體中文', langShort: '繁',
    keysT: '快捷鍵', keysClose: '按 ? 或 Esc 關閉', keysHint: '按 ? 看快捷鍵',
    keys: [[`1–${Math.min(9, CITIES.length)}`, '依列表順序飛到對應的城'], ['KEYS', '按城名首字母飛過去'], ['0 / H', '回到全圖，恢復預設視角'], ['↑ ↓', '上一個 / 下一個城'], ['← →', '上一個 / 下一個建築'], ['Enter', '開啟選中的建築'], ['Esc', '返回上一層'], ['+ −', '拉近 / 拉遠'], ['Shift 空白鍵', '按住再拖曳可平移'], ['T', '開始或停止導覽'], ['O', '開關環繞'], ['V', '開關俯視'], ['L', '切換語言'], ['I', '收起或展開資訊卡']],
    nowebgl: '這個瀏覽器無法建立 WebGL，3D 地圖無法顯示。右下角的列表仍然可以導覽。' },
  ja: { cities: '町', worldName: '全体図', homeTip: '全体図に戻り、視点を元に戻す', townCount: '{n} つの町', map: '全体図', tour: 'ツアー', spin: '回転', top: '真上', hide: '閉じる', show: '開く', info: 'この地図について', where: '現在地', view: '視点',
    hintW: 'ドラッグで回転 · Shift/スペース+ドラッグで移動 · ホイールでズーム', hintC: '建物をクリックで詳細 · Esc で戻る', title: '地図', sub: '{n} つの町、ひとつの大陸',
    intro: '町はひとつのカテゴリ、町の建物はひとつのツールやリンクです。町どうしは道と橋でつながっています。町の名前をクリックすると飛んでいきます。「ツアー」で一巡りもできます。',
    plots: '{n} か所', plot: '区画', open: '開く', about: '自己紹介', fold: '地図を折っています', prep: '紙を用意しています…', titleSuffix: '地図',
    steps: ['大地を広げる', '山を折る', '道と橋をつくる', '畑を耕す', '町を建てる', '森を植える', '旅人と船を送り出す'],
    phases: ['深夜', '日の出', '朝', '午前', '正午', '午後', '夕暮れ', '夜'], langName: '日本語', langShort: '日',
    keysT: 'キーボードショートカット', keysClose: '? か Esc で閉じる', keysHint: '? でショートカット一覧',
    keys: [[`1–${Math.min(9, CITIES.length)}`, '一覧の順に町へ飛ぶ'], ['KEYS', '町の頭文字で飛ぶ'], ['0 / H', '全体図と元の視点に戻る'], ['↑ ↓', '前 / 次の町'], ['← →', '前 / 次の建物'], ['Enter', '選んだ建物を開く'], ['Esc', 'ひとつ前に戻る'], ['+ −', 'ズームイン / アウト'], ['Shift スペース', '押したままドラッグで移動'], ['T', 'ツアーの開始 / 停止'], ['O', '回転のオン / オフ'], ['V', '真上視点のオン / オフ'], ['L', '言語を切り替える'], ['I', '情報カードを開く / 閉じる']],
    nowebgl: 'このブラウザでは WebGL を作れないため、3D 地図を表示できません。右下の一覧からは移動できます。' },
};
// site text overrides (SITE.text.zh / SITE.text.en)
// interface strings: built-in zh, zh-Hant, ja and en; any other language starts from English; site.text
// overrides. Old key names (me, five) are still read as worldName and townCount.
const OLD_KEYS = { me: 'worldName', five: 'townCount' };
for (const v of Object.values(SITE.text || {})) for (const [o, n] of Object.entries(OLD_KEYS)) if (v && o in v && !(n in v)) v[n] = v[o];
for (const lg of new Set([...LANGS, LANG, ...Object.keys(SITE.text || {})])) { const own = T[lg]; T[lg] = { ...T.en, ...(own || {}), ...((SITE.text || {})[lg] || {}) }; if (!own && !(SITE.text || {})[lg]?.langName) { delete T[lg].langName; delete T[lg].langShort; } }
const KEY_LIST = CITIES.filter(c => c.key).map(c => c.key.toUpperCase()).join(' ');
for (const lg of Object.keys(T)) T[lg].keys = T[lg].keys.filter(k => k[0] !== 'KEYS' || KEY_LIST).filter(k => !(k[0] === 'L' && !UI.languageSwitch) && !(k[0] === 'T' && !UI.tour) && !(['O', 'V'].includes(k[0]) && !UI.views)).map(k => k[0] === 'KEYS' ? [KEY_LIST, k[1]] : k);
function setLangData() { for (const c of CITIES) { c.name = loc(c.nameRaw, LANG); c.role = loc(c.roleRaw, LANG); c.blurb = loc(c.blurbRaw, LANG); for (const it of c.items) { it.desc = loc(it.descRaw, LANG); it.name = loc(it.nameRaw, LANG); } } }
for (const c of CITIES) for (const it of c.items) { it.descRaw = it.desc; it.nameRaw = it.name; }
setLangData();
const L = () => T[LANG];
const withN = (v, n) => typeof v === 'function' ? v(n) : String(v ?? '').replaceAll('{n}', n);
const langLabel = l => T[l]?.langName || (() => { try { return new Intl.DisplayNames([l], { type: 'language' }).of(l); } catch { return l.toUpperCase(); } })();
const langMenu = document.createElement('div'); langMenu.className = 'lang-menu'; langMenu.setAttribute('role', 'menu'); langMenu.hidden = true;
document.querySelector('.tools')?.append(langMenu);
const cityBtn = document.getElementById('b-cities');
const cityMenu = document.createElement('div'); cityMenu.id = 'city-menu'; cityMenu.className = 'city-menu'; cityMenu.setAttribute('role', 'menu'); cityMenu.hidden = true;
document.querySelector('.tools')?.append(cityMenu);
const EXT_ICON = '<svg class="ext" viewBox="0 0 16 16" width="12" height="12" aria-hidden="true"><path d="M5.5 3.5h7v7M12.5 3.5 4 12" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>';
document.documentElement.lang = LANG === 'zh' ? 'zh-CN' : LANG;
{ const hide = (sel, off) => { if (off) document.querySelectorAll(sel).forEach(el => { el.hidden = true; }); };
  hide('#b-lang', !UI.languageSwitch); hide('#b-keys', !UI.shortcuts); hide('.tools .sep', !UI.languageSwitch && !UI.shortcuts);
  hide('#b-tour', !UI.tour); hide('#b-spin, #b-top', !UI.views); hide('#clock', !UI.clock); hide('.compass', !UI.compass); }
document.getElementById('site').textContent = DOMAIN; document.getElementById('site').href = SITEINFO.home || 'https://' + DOMAIN.toLowerCase();
// site-level links beside the brand: site.links = [{ name, url, icon }]; site.about is the old single form
// same-site links open in this tab; other sites get a new one
const isLocal = u => { try { return new URL(u, location.href).origin === location.origin; } catch { return false; } };
const newTab = u => isLocal(u) ? '' : ' target="_blank" rel="noopener"';
const SITE_LINKS = Array.isArray(SITEINFO.links) ? SITEINFO.links.filter(l => l && l.url) : SITEINFO.about?.url ? [{ name: SITEINFO.about.label || T.en.about, url: SITEINFO.about.url, icon: SITEINFO.about.icon }] : [];
const LINK_ICONS = {
  github: '<path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z" fill="currentColor"/>',
  x: '<path d="M2.5 2h3.3l2.9 4 3.4-4h1.5L9.4 6.8 13.8 14h-3.3L7.4 9.8 3.9 14H2.4l4.3-5L2.5 2z" fill="currentColor"/>',
  mail: '<path d="M2 4h12v8H2zM2.4 4.4 8 8.8l5.6-4.4" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>',
  rss: '<path d="M3 3a10 10 0 0 1 10 10M3 7a6 6 0 0 1 6 6" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><circle cx="3.6" cy="12.4" r="1.3" fill="currentColor"/>',
  home: '<path d="M2.5 7.5 8 2.5l5.5 5V13h-3.5V9.5h-4V13H2.5z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>',
  user: '<circle cx="8" cy="5.5" r="2.8" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M2.5 14c.6-3 2.8-4.5 5.5-4.5s4.9 1.5 5.5 4.5" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>',
  book: '<path d="M2.5 3h4c1 0 1.5.6 1.5 1.5V13c0-.8-.6-1.3-1.5-1.3h-4zM13.5 3h-4C8.5 3 8 3.6 8 4.5V13c0-.8.6-1.3 1.5-1.3h4z" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/>',
  link: '<path d="M6.6 9.4 9.4 6.6M7 4.5l1-1a2.8 2.8 0 0 1 4 4l-1 1M9 11.5l-1 1a2.8 2.8 0 0 1-4-4l1-1" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>',
};
const EXT_SVG = '<svg class="ext" viewBox="0 0 16 16" aria-hidden="true"><path d="M5.5 3.5h7v7M12.5 3.5 4 12" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
// icon: a built-in name above, an inline <svg …>, or an image URL
const linkIcon = icon => !icon ? '' : LINK_ICONS[icon] ? `<svg class="ic" viewBox="0 0 16 16" aria-hidden="true">${LINK_ICONS[icon]}</svg>`
  : /^\s*<svg[\s>]/i.test(icon) ? icon.replace(/<svg/i, '<svg class="ic" aria-hidden="true"') : `<img class="ic" src="${String(icon).replace(/"/g, '&quot;')}" alt="">`;
function renderLinks() {
  const nav = document.getElementById('site-links'); if (!nav) return;
  nav.innerHTML = SITE_LINKS.map(l => { const name = loc(l.name, LANG) || l.url, ext = !/^mailto:/i.test(l.url) && !isLocal(l.url);
    return `<a href="${String(l.url).replace(/"/g, '&quot;')}"${ext ? ' target="_blank" rel="noopener"' : ''} aria-label="${name.replace(/"/g, '&quot;')}" title="${name.replace(/"/g, '&quot;')}">${linkIcon(l.icon)}<span class="t">${name.replace(/</g, '&lt;')}</span>${l.icon ? '' : EXT_SVG}</a>`; }).join('');
}
{ const cp = document.querySelector('.foot .copy'), co = SITEINFO.copyright || {}; if (cp && co.owner) cp.innerHTML = `&copy; ${co.since ? co.since + '&ndash;' : ''}<span id="year"></span> ${co.owner}`; else if (cp && !co.owner) cp.remove(); }
if (!document.getElementById('map').dataset.version && SITEINFO.version) document.getElementById('map').dataset.version = SITEINFO.version;
{ const y = document.getElementById('year'); if (y) y.textContent = new Date().getFullYear(); }
{ const v = document.getElementById('version'); if (v && document.getElementById('map').dataset.version) { const ver = document.getElementById('map').dataset.version; v.textContent = 'v' + ver; v.href = SITEINFO.releaseUrl ? SITEINFO.releaseUrl.replace('{version}', ver) : '#'; if (!SITEINFO.releaseUrl) v.removeAttribute('href'); } }
document.getElementById('ld-title').textContent = L().fold; document.getElementById('ld-step').textContent = L().prep;
document.title = `${DOMAIN} · ${L().titleSuffix}`;

// ---------------- loader ----------------
const loadStart = performance.now();
const ldStep = document.getElementById('ld-step'), ldBar = document.getElementById('ld-bar');
async function step(i, label) { ldStep.textContent = label + '…'; ldBar.style.transform = `scaleX(${(i + 1) / 8})`; await new Promise(r => requestAnimationFrame(() => setTimeout(r, 0))); }

// ---------------- noise ----------------
function hash(x, y) { let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; }
function vnoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
const fbm = (x, y) => (vnoise(x, y) * .55 + vnoise(x * 2.03 + 17, y * 2.03 + 9) * .3 + vnoise(x * 4.1 + 3, y * 4.1 + 31) * .15);
const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;
const sdBox = (x, z, cx, cz, hx, hz, r) => { const qx = Math.abs(x - cx) - hx + r, qz = Math.abs(z - cz) - hz + r; return Math.hypot(Math.max(qx, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qz), 0) - r; };
let rs = 11; const rand = () => (rs = (rs * 16807) % 2147483647) / 2147483647;

// ---------------- three setup ----------------
const mapEl = document.getElementById('map');
let renderer;
try { renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' }); }
catch { document.getElementById('loader').classList.add('done'); mapEl.insertAdjacentHTML('beforeend', `<div class="fallback">${L().nowebgl}</div>`); }
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(30, 1, 0.5, 420);
const LINES = 1;
if (renderer) {
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.shadowMap.autoUpdate = false;
  mapEl.prepend(renderer.domElement);
}
const labelRenderer = new CSS2DRenderer({ element: document.getElementById('labels') });

// ---------------- materials ----------------
const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const TOK = { paper: '--paper', road: '--road', kraft: '--kraft', kraftDeep: '--kraft-deep', stone: '--stone', slate: '--slate', snow: '--snow',
  grass: '--grass', meadow: '--meadow', olive: '--olive', pine: '--pine', mustard: '--mustard', terra: '--terra', roofSlate: '--roof-slate', wallRose: '--wall-rose', wallSage: '--wall-sage', wallSky: '--wall-sky',
  water: '--water', coral: '--coral', ink: '--ink', hot: '--coral-wash' };
const M = {};
for (const k of Object.keys(TOK)) M[k] = new THREE.MeshLambertMaterial({ flatShading: true });
M.water.flatShading = false;
const vcol = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
M.glass = new THREE.MeshLambertMaterial({ flatShading: true }); M.glassN = new THREE.MeshLambertMaterial({ flatShading: true }); M.lamp = new THREE.MeshLambertMaterial({ flatShading: true });
const halos = [];
const haloTex = (() => { const cv = document.createElement('canvas'); cv.width = cv.height = 64; const x = cv.getContext('2d'), gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,220,150,1)'); gr.addColorStop(.35, 'rgba(255,190,90,.45)'); gr.addColorStop(1, 'rgba(255,170,60,0)'); x.fillStyle = gr; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(cv); })();
const haloMat = new THREE.SpriteMaterial({ map: haloTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true });
function halo(parent, x, y, z, s = .7) { const h = onLines(new THREE.Sprite(haloMat)); h.position.set(x, y, z); h.scale.setScalar(s); h.visible = false; parent.add(h); halos.push(h); return h; }

const white = new THREE.MeshLambertMaterial({ flatShading: true });
const stroke = new THREE.LineBasicMaterial({ transparent: true, opacity: .4 });
const strokeHard = new THREE.LineBasicMaterial({ transparent: true, opacity: .85 });
const waveMat = new THREE.LineBasicMaterial({ transparent: true, opacity: .5 });
const glow = new THREE.MeshBasicMaterial({ transparent: true, opacity: .8, depthWrite: false });
const beamMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: .12, depthWrite: false, side: THREE.DoubleSide });
const FOG_FAR = 200;
const fog = new THREE.Fog(0xffffff, 70, FOG_FAR);
const recolorers = [];

const post = new THREE.ShaderMaterial({
  uniforms: { tColor: { value: null }, tNormal: { value: null }, tDepth: { value: null }, res: { value: new THREE.Vector2() },
    ink: { value: new THREE.Color() }, near: { value: camera.near }, far: { value: camera.far }, thick: { value: 1 }, fogFar: { value: FOG_FAR }, focus: { value: 60 }, blurMax: { value: 6 }, edgeK: { value: .82 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }`,
  fragmentShader: `
    varying vec2 vUv;
    uniform sampler2D tColor, tNormal, tDepth; uniform vec2 res; uniform vec3 ink; uniform float near, far, thick, fogFar, focus, blurMax, edgeK;
    float lin(float d){ float z = d * 2. - 1.; return (2. * near * far) / (far + near - z * (far - near)); }
    void main(){
      vec2 px = thick / res;
      float z0 = lin(texture2D(tDepth, vUv).x), w0 = 1. / z0;
      vec3 n0 = texture2D(tNormal, vUv).xyz * 2. - 1.;
      float lap = -4. * w0, ne = 0.;
      vec2 o[4]; o[0] = vec2(px.x, 0.); o[1] = vec2(-px.x, 0.); o[2] = vec2(0., px.y); o[3] = vec2(0., -px.y);
      for (int i = 0; i < 4; i++) {
        lap += 1. / lin(texture2D(tDepth, vUv + o[i]).x);
        vec3 n = texture2D(tNormal, vUv + o[i]).xyz * 2. - 1.;
        ne += 1. - clamp(dot(n0, n), 0., 1.);
      }
      float depthEdge = smoothstep(.012, .03, abs(lap) / w0);
      float foldEdge = smoothstep(.12, .3, ne);
      float e = max(depthEdge, foldEdge * .7);
      e *= 1. - smoothstep(fogFar * .3, fogFar * .8, z0);
      float coc = max(smoothstep(focus * 1.0, focus * 1.5, z0), smoothstep(.3, .5, abs(vUv.y - .5)) * .8);
      vec3 c = texture2D(tColor, vUv).rgb;
      if (coc > .01 && blurMax > 0.) {
        vec3 acc = c;
        for (int i = 0; i < 16; i++) { float a = float(i) * 2.39996, r = sqrt((float(i) + .5) / 16.);
          acc += texture2D(tColor, vUv + vec2(cos(a), sin(a)) * r * coc * blurMax / res).rgb; }
        c = acc / 17.;
      }
      e *= 1. - coc * .9 * step(.001, blurMax);
      gl_FragColor = linearToOutputTexel(vec4(mix(c, ink, e * edgeK), 1.));
    }`,
  depthTest: false, depthWrite: false,
});
const postScene = new THREE.Scene();
postScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), post));
const postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const normalMat = new THREE.MeshNormalMaterial();
let colorRT, normalRT;
const C = {}; // resolved THREE.Color per token

function applyTheme() {
  for (const [k, t] of Object.entries(TOK)) { C[k] = new THREE.Color(css(t)); M[k].color.copy(C[k]); }
  for (const m of [stroke, strokeHard, waveMat]) m.color.copy(C.ink);
  glow.color.copy(C.coral); beamMat.color.set(css('--mustard'));
  post.uniforms.ink.value.copy(C.ink);
  for (const f of recolorers) f();
}

// ---------------- lights ----------------
const hemi = new THREE.HemisphereLight(0xffffff, 0xc59c6c, 1.75);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff6e6, 2.1);
sun.position.set(-20, 32, 14); sun.castShadow = true;
sun.shadow.mapSize.set(3072, 3072);
Object.assign(sun.shadow.camera, { left: -36, right: 36, top: 36, bottom: -36, near: 1, far: 100 });
sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.04;
scene.add(sun);
scene.fog = fog;

// ---------------- helpers ----------------
const anims = [];
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const onLines = o => { o.layers.set(LINES); return o; };
const lineSeg = (points, mat = stroke) => onLines(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(points), mat));
const poly = (points, mat = stroke) => onLines(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), mat));
function windows(w, h, d, y0, floors, cols) {
  const p = [], e = .006, hx = w / 2 + e, hz = d / 2 + e;
  for (let i = 1; i <= floors; i++) { const y = y0 + h * i / (floors + 1);
    p.push(V(-hx, y, hz), V(hx, y, hz), V(-hx, y, -hz), V(hx, y, -hz), V(hx, y, -hz), V(hx, y, hz), V(-hx, y, -hz), V(-hx, y, hz)); }
  for (let i = 1; i <= cols; i++) { const k = i / (cols + 1), x = -w / 2 + w * k, z = -d / 2 + d * k;
    p.push(V(x, y0, hz), V(x, y0 + h, hz), V(x, y0, -hz), V(x, y0 + h, -hz), V(hx, y0, z), V(hx, y0 + h, z), V(-hx, y0, z), V(-hx, y0 + h, z)); }
  return lineSeg(p);
}
function rings(r, y0, h, n) {
  const p = [];
  for (let i = 1; i <= n; i++) { const y = y0 + h * i / (n + 1);
    for (let a = 0; a < 24; a++) { const t0 = a / 24 * Math.PI * 2, t1 = (a + 1) / 24 * Math.PI * 2, R = r + .01;
      p.push(V(Math.cos(t0) * R, y, Math.sin(t0) * R), V(Math.cos(t1) * R, y, Math.sin(t1) * R)); } }
  return lineSeg(p);
}
function roofPrism(w, d, r) { // ridge along x, overhang
  const s = new THREE.Shape(); s.moveTo(-d / 2 - .06, 0); s.lineTo(d / 2 + .06, 0); s.lineTo(0, r); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: w + .1, bevelEnabled: false }); g.translate(0, 0, -(w + .1) / 2); g.rotateY(Math.PI / 2); return g;
}

// ---------------- buildings ----------------

const pickS = (arr, s) => arr[Math.floor(hash(s, 99) * arr.length) % arr.length];
// lit and dark window panes on the two camera-facing walls and their opposites
function panes(target, w, h, d, y0, floors, cols, seed) {
  for (let f = 0; f < floors; f++) for (let i = 0; i < cols; i++) for (const face of [0, 1, 2, 3]) {
    const hv = hash(seed + f * 7 + i * 3, face);
    const pw = (face < 2 ? w : d) / cols * .42, ph = h / floors * .45;
    const m = new THREE.Mesh(new THREE.BoxGeometry(face < 2 ? pw : .016, ph, face < 2 ? .016 : pw), hv < .3 ? M.glass : hv < .7 ? M.glassN : M.kraftDeep);
    const u = -.5 + (i + .5) / cols, yy = y0 + (f + .55) * h / floors;
    if (face === 0) m.position.set(u * w, yy, d / 2 + .008); if (face === 1) m.position.set(u * w, yy, -d / 2 - .008);
    if (face === 2) m.position.set(w / 2 + .008, yy, u * d); if (face === 3) m.position.set(-w / 2 - .008, yy, u * d);
    target.add(m);
  }
}
function timber(w, h, d, y0) {
  const p = [], e = .007, hx = w / 2 + e, hz = d / 2 + e, ym = y0 + h * .5;
  for (const s of [1, -1]) {
    p.push(V(-hx, ym, s * hz), V(hx, ym, s * hz), V(-hx, y0, s * hz), V(0, ym, s * hz), V(hx, y0, s * hz), V(0, ym, s * hz), V(0, y0, s * hz), V(0, y0 + h, s * hz));
    p.push(V(s * hx, ym, -hz), V(s * hx, ym, hz), V(s * hx, y0, -hz), V(s * hx, ym, 0), V(s * hx, y0, hz), V(s * hx, ym, 0));
  }
  return lineSeg(p, strokeHard);
}
function annex(kind, ROOF, WALL, seed) {
  const g = new THREE.Group();
  const add = (geo, mat, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); g.add(m); return m; };
  switch (kind) {
    case 'hut': { add(new THREE.BoxGeometry(.32, .24, .28), WALL, 0, .12, 0); add(roofPrism(.32, .28, .17), ROOF, 0, .24, 0); add(new THREE.BoxGeometry(.08, .13, .012), M.kraftDeep, 0, .065, .145); break; }
    case 'tower': { add(new THREE.CylinderGeometry(.1, .12, .6, 7), WALL, 0, .3, 0); add(new THREE.ConeGeometry(.15, .26, 7), ROOF, 0, .73, 0); add(new THREE.BoxGeometry(.04, .07, .012), M.glassN, 0, .42, .11); break; }
    case 'banner': { add(new THREE.CylinderGeometry(.012, .012, .7, 5), M.ink, 0, .35, 0); const f = add(new THREE.BoxGeometry(.012, .3, .14), M.coral, 0, .52, .07); anims.push(t => { f.rotation.y = Math.sin(t * 1.8 + seed) * .25; }); break; }
    case 'stall': {
      add(new THREE.BoxGeometry(.34, .15, .2), M.kraft, 0, .075, 0);
      for (const x of [-.16, .16]) add(new THREE.CylinderGeometry(.012, .012, .34, 4), M.kraftDeep, x, .17, .1);
      const aw = add(new THREE.BoxGeometry(.4, .02, .28), hash(seed, 2) < .5 ? M.coral : M.mustard, 0, .33, .04); aw.rotation.x = .35;
      for (let i = 0; i < 3; i++) add(new THREE.IcosahedronGeometry(.035, 0), [M.mustard, M.olive, M.terra][i], -.1 + i * .1, .18, 0);
      break;
    }
    case 'barrels': { for (let i = 0; i < 2 + (seed % 2); i++) { const b = add(new THREE.CylinderGeometry(.06, .06, .14, 8), M.kraft, (i % 2) * .13 - .06, .07 + Math.floor(i / 2) * .14, Math.floor(i / 2) ? 0 : (i % 2 ? .05 : -.04)); b.add(rings(.06, -.07, .14, 2)); } break; }
    case 'crates': { add(new THREE.BoxGeometry(.16, .16, .16), M.kraft, 0, .08, 0).rotation.y = .3; add(new THREE.BoxGeometry(.12, .12, .12), M.kraft, .1, .06, .12).rotation.y = -.2; add(new THREE.BoxGeometry(.12, .12, .12), M.road, .02, .22, .02).rotation.y = .8; break; }
    case 'tree': {
      add(new THREE.CylinderGeometry(.02, .03, .2, 5), M.kraftDeep, 0, .1, 0);
      const k = hash(seed, 5);
      if (k < .5) for (let i = 0; i < 3; i++) add(new THREE.ConeGeometry(.13 - i * .02, .24, 5), M.mustard, 0, .25 + i * .14, 0).rotation.y = i * .7;
      else add(new THREE.IcosahedronGeometry(.18, 0), k < .8 ? M.olive : M.pine, 0, .34, 0);
      break;
    }
    case 'lantern': { add(new THREE.CylinderGeometry(.015, .02, .45, 5), M.ink, 0, .22, 0); add(new THREE.OctahedronGeometry(.06, 0), M.lamp, 0, .48, 0); halo(g, 0, .48, 0, .55); break; }
    case 'well': {
      add(new THREE.CylinderGeometry(.14, .15, .14, 8), M.stone, 0, .07, 0); add(new THREE.CylinderGeometry(.1, .1, .02, 8), M.water, 0, .14, 0);
      for (const x of [-.12, .12]) add(new THREE.BoxGeometry(.025, .3, .025), M.kraftDeep, x, .22, 0);
      add(new THREE.ConeGeometry(.2, .14, 4), ROOF, 0, .43, 0).rotation.y = Math.PI / 4; break;
    }
    case 'stairs': { for (let i = 0; i < 4; i++) add(new THREE.BoxGeometry(.32, .06 * (i + 1), .1), M.stone, 0, .03 * (i + 1), .15 - i * .1); break; }
    case 'bench': { add(new THREE.BoxGeometry(.34, .05, .1), M.kraft, 0, .1, 0); for (const x of [-.13, .13]) add(new THREE.BoxGeometry(.03, .09, .08), M.kraftDeep, x, .045, 0); break; }
    case 'anvil': {
      add(new THREE.BoxGeometry(.14, .1, .08), M.stone, 0, .05, 0); add(new THREE.BoxGeometry(.22, .06, .1), M.ink, 0, .13, 0);
      const ember = add(new THREE.IcosahedronGeometry(.05, 0), M.coral, .16, .06, .08); anims.push(t => { ember.scale.setScalar(.8 + Math.abs(Math.sin(t * 4 + seed)) * .5); }); break;
    }
    case 'cart': {
      add(new THREE.BoxGeometry(.3, .08, .18), M.kraft, 0, .1, 0);
      for (const z of [-.1, .1]) { const w = add(new THREE.CylinderGeometry(.06, .06, .02, 8), M.kraftDeep, 0, .06, z); w.rotation.x = Math.PI / 2; }
      add(new THREE.IcosahedronGeometry(.07, 0), M.stone, -.04, .18, 0); add(new THREE.IcosahedronGeometry(.06, 0), M.stone, .07, .17, .03); break;
    }
  }
  return g;
}
function makeBuilding(it, c, seed, k = 0) {
  const S = c.style, wl = S.walls.length, rl = S.roofs.length;
  const WALL = M[S.walls[k % wl]], WALL2 = M[S.walls[(k + 1) % wl]], ROOF = M[S.roofs[k % rl]], ROOF2 = M[S.roofs[(k + 1) % rl]];
  it.roof = S.roofs[k % rl];
  const root = new THREE.Group(), g = new THREE.Group(); root.add(g);
  const add = (geo, mat, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); g.add(m); return m; };
  const box = (w, h, d, x = 0, y = 0, z = 0, mat = WALL) => add(new THREE.BoxGeometry(w, h, d), mat, x, y + h / 2, z);
  const cyl = (r, h, x = 0, y = 0, z = 0, mat = WALL, r2 = r, seg = 14) => add(new THREE.CylinderGeometry(r2, r, h, seg), mat, x, y + h / 2, z);
  const cone = (r, h, x = 0, y = 0, z = 0, mat = ROOF, seg = 10) => add(new THREE.ConeGeometry(r, h, seg), mat, x, y + h / 2, z);
  const pyr = (w, h, x = 0, y = 0, z = 0, mat = ROOF) => { const m = add(new THREE.ConeGeometry(w / Math.SQRT2, h, 4), mat, x, y + h / 2, z); m.rotation.y = Math.PI / 4; return m; };
  const gable = (w, h, d, r, x = 0, z = 0, rot = 0, roofMat = ROOF, y0 = 0) => {
    const grp = new THREE.Group(); grp.position.set(x, y0, z); grp.rotation.y = rot; g.add(grp);
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), WALL); b.position.y = h / 2; grp.add(b);
    const rf = new THREE.Mesh(roofPrism(w, d, r), roofMat); rf.position.y = h; grp.add(rf);
    if (S.timber) grp.add(timber(w, h, d, 0)); else grp.add(windows(w, h, d, 0, 0, 0));
    panes(grp, w, h, d, 0, Math.max(1, Math.round(h / .45)), Math.max(1, Math.round(w / .35)), seed + x * 10);
    const door = new THREE.Mesh(new THREE.BoxGeometry(.15, .26, .02), M.kraftDeep); door.position.set(w * .2, .13, d / 2 + .012); grp.add(door);
    if (hash(seed, 8) < .6) { const ch = new THREE.Mesh(new THREE.BoxGeometry(.09, .3, .09), M.stone); ch.position.set(-w * .28, h + r * .55, -d * .18); grp.add(ch); }
    return grp;
  };
  const flag = (x, y, z) => { cyl(.012, .35, x, y, z, M.ink, .012, 5); const f = add(new THREE.BoxGeometry(.18, .1, .01), M.coral, x + .09, y + .3, z); anims.push(t => { f.rotation.y = Math.sin(t * 2 + x * 9) * .3; }); };
  const r = k => hash(seed, k);
  let top = 1;
  switch (it.kind) {
    case 'quad': {
      const hs = [.75, 1.35, 1.05, 1.75].map((h, i) => h * (.8 + r(10 + i) * .4)), o = [[-.3, -.26], [.27, -.3], [-.26, .3], [.3, .27]];
      o.forEach(([x, z], i) => { const w = .44 + r(20 + i) * .14; const m = box(w, hs[i], w, x, 0, z); m.rotation.y = (r(30 + i) - .5) * .4;
        (i % 2 ? pyr : (ww, hh, xx, yy, zz) => box(ww, .06, ww, xx, yy, zz, ROOF2))(w + .08, .3, x, hs[i], z); panes(m, w, hs[i], w, -hs[i] / 2, Math.round(hs[i] * 2.4), 1, seed + i); });
      top = Math.max(...hs) + .3; break;
    }
    case 'spire': {
      cyl(.38, 1.6, 0, 0, 0, WALL, .32); g.add(rings(.36, 0, 1.6, 4)); cyl(.42, .08, 0, 1.6, 0, ROOF2); cone(.44, 1.15, 0, 1.68);
      cyl(.18, .9, .42, 0, .1, WALL); cone(.22, .45, .42, .9, .1, ROOF2, 8);
      const star = add(new THREE.OctahedronGeometry(.17), M.mustard, 0, 3.1, 0);
      anims.push(t => { star.rotation.y = t * 1.2; star.position.y = 3.1 + Math.sin(t * 2) * .05; });
      top = 3.25; break;
    }
    case 'dome': {
      cyl(.6, .5); add(new THREE.SphereGeometry(.6, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), ROOF, 0, .5, 0);
      for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; box(.08, .5, .08, Math.cos(a) * .62, 0, Math.sin(a) * .62, M.stone); }
      cyl(.02, .35, 0, 1.08, 0, M.ink, .02, 5); add(new THREE.SphereGeometry(.05, 8, 6), M.coral, 0, 1.46, 0);
      top = 1.5; break;
    }
    case 'kiosk': {
      const h = .55 + r(11) * .35; box(.9, h, .9); panes(g, .9, h, .9, 0, 1, 2, seed); pyr(1.15, .55 + r(12) * .3, 0, h);
      box(.5, .3, .35, .5, 0, .2, WALL).rotation.y = .1; pyr(.6, .25, .5, .3, .2, ROOF2); flag(0, h + .62, 0); top = h + .95; break;
    }
    case 'radio': {
      box(1.1, .45, 1.1); panes(g, 1.1, .45, 1.1, 0, 1, 3, seed); box(1.16, .05, 1.16, 0, .45, 0, ROOF);
      add(new THREE.CylinderGeometry(.04, .22, 2, 4, 4, true), WALL, 0, 1.5, 0);
      add(new THREE.SphereGeometry(.07, 8, 6), M.coral, 0, 2.55, 0);
      const rs2 = [0, 1, 2].map(() => { const rr = onLines(new THREE.Mesh(new THREE.TorusGeometry(.3, .012, 6, 40), glow.clone())); rr.rotation.x = Math.PI / 2; rr.position.y = 2.55; g.add(rr); return rr; });
      anims.push(t => rs2.forEach((rr, i) => { const p = (t * .5 + i / 3) % 1; rr.scale.setScalar(.4 + p * 2.6); rr.material.opacity = (1 - p) * .9; }));
      top = 2.65; break;
    }
    case 'grid': {
      const h1 = 1.2 + r(13) * .5, h2 = .5 + r(14) * .4;
      box(1, h1, .8, 0, 0, -.1); panes(g, 1, h1, .8, 0, Math.round(h1 / .3), 3, seed); g.children.at(-1);
      box(.7, h2, .6, -.1, h1, -.15, WALL); panes(g, .7, h2, .6, h1, 2, 2, seed + 3);
      pyr(.85, .4, -.1, h1 + h2, -.15, ROOF); box(1.04, .05, .84, 0, h1, -.1, ROOF2);
      box(.5, .5, .4, .32, 0, .5, WALL); pyr(.6, .25, .32, .5, .5, ROOF2);
      top = h1 + h2 + .5; break;
    }
    case 'face': {
      cyl(.56, 1.05); cyl(.6, .08, 0, 1.05, 0, ROOF); cone(.5, .35, 0, 1.13, 0, ROOF2, 12); const e = new THREE.SphereGeometry(.05, 8, 6);
      const fx = Math.SQRT1_2 * .55;
      add(e, M.ink, fx + .1, .68, fx - .18); add(e, M.ink, fx - .18, .68, fx + .1);
      const smile = add(new THREE.TorusGeometry(.17, .022, 6, 16, Math.PI), M.ink, fx + .02, .48, fx + .02);
      smile.rotation.set(0, Math.PI / 4, Math.PI);
      top = 1.6; break;
    }
    case 'vault': {
      box(1.2, .95, 1); box(1.28, .08, 1.08, 0, .95, 0, ROOF); box(.8, .3, .7, -.1, 1.03, -.1, WALL); box(.86, .05, .76, -.1, 1.33, -.1, ROOF2);
      const door = add(new THREE.CylinderGeometry(.3, .3, .05, 16), M.mustard, .1, .45, .52); door.rotation.x = Math.PI / 2;
      add(new THREE.CylinderGeometry(.06, .06, .06, 10), M.ink, .1, .5, .55).rotation.x = Math.PI / 2;
      add(new THREE.BoxGeometry(.05, .12, .06), M.ink, .1, .4, .55);
      top = 1.5; break;
    }
    case 'twin': {
      const ha = 1.5 + r(15) * .5, hb = 1.2 + r(16) * .5;
      box(.45, ha, .45, -.32, 0, -.32); box(.45, hb, .45, .32, 0, .32);
      pyr(.55, .4, -.32, ha, -.32); pyr(.55, .3, .32, hb, .32, ROOF2);
      { const q = new THREE.Group(); q.position.set(-.32, 0, -.32); g.add(q); panes(q, .45, ha, .45, 0, 5, 1, seed); }
      { const q = new THREE.Group(); q.position.set(.32, 0, .32); g.add(q); panes(q, .45, hb, .45, 0, 4, 1, seed + 1); }
      const br = box(.5, .14, .16, 0, 1.02, 0); br.rotation.y = -Math.PI / 4;
      const pk = add(new THREE.BoxGeometry(.08, .08, .08), M.coral, 0, 1.2, 0);
      anims.push(t => { const s = Math.sin(t * 1.6) * .3; pk.position.set(s, 1.2, s); });
      top = Math.max(ha, hb) + .45; break;
    }
    case 'silo': {
      cyl(.45, 1.5); g.add(rings(.45, 0, 1.5, 4)); add(new THREE.SphereGeometry(.45, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), ROOF, 0, 1.5, 0);
      cyl(.28, .9, .5, 0, .45, WALL); cone(.31, .25, .5, .9, .45, ROOF2, 10); box(.12, 1.5, .08, -.4, 0, .25, M.kraft); top = 2.05; break;
    }
    case 'library': { gable(1.2, .8, .7, .5, 0, -.15); gable(.5, .55, .6, .35, .25, .4, Math.PI / 2, ROOF2); top = 1.4; break; }
    case 'crane': {
      gable(.9, .5, .9, .3, -.1, -.1, 0); box(.12, 1.8, .12, .35, 0, .35, M.mustard);
      const jib = new THREE.Group(); jib.position.set(.35, 1.9, .35); g.add(jib);
      const j = new THREE.Mesh(new THREE.BoxGeometry(1.7, .1, .1), M.mustard); j.position.x = -.45; jib.add(j);
      const cw = new THREE.Mesh(new THREE.BoxGeometry(.25, .2, .2), M.stone); cw.position.set(.35, -.05, 0); jib.add(cw);
      const hook = new THREE.Mesh(new THREE.BoxGeometry(.14, .14, .14), M.coral); hook.position.set(-1.1, -.9, 0); jib.add(hook);
      jib.add(poly([V(-1.1, 0, 0), V(-1.1, -.84, 0)], strokeHard));
      anims.push(t => { jib.rotation.y = Math.sin(t * .35) * 1.1; });
      top = 2.1; break;
    }
    case 'tanks': {
      const a = .8 + r(17) * .5, b = .5 + r(18) * .5;
      cyl(.32, a, -.25, 0, -.25); cone(.34, .2, -.25, a, -.25, ROOF); { const q = rings(.32, 0, a, 2); q.position.set(-.25, 0, -.25); g.add(q); }
      cyl(.3, b, .3, 0, .28); cone(.32, .2, .3, b, .28, ROOF2); { const q = rings(.3, 0, b, 1); q.position.set(.3, 0, .28); g.add(q); }
      cyl(.16, .4, .35, 0, -.4, M.stone); const pipe = add(new THREE.CylinderGeometry(.04, .04, .65, 6), M.kraftDeep, .05, a * .7, 0); pipe.rotation.z = Math.PI / 2; pipe.rotation.y = Math.PI / 4;
      top = Math.max(a, b) + .3; break;
    }
    case 'shed': {
      const h = (it.h || .7) * (.85 + r(19) * .3);
      gable(.75, h, 1.2, .38 + r(20) * .2, -.1, 0, Math.PI / 2);
      gable(.45, h * .7, .5, .25, .45, .38, 0, ROOF2);
      top = h + .6; break;
    }
    case 'chimney': {
      gable(1.1, .7, .8, .4, -.05, 0, 0); cyl(.1, 1.2, -.38, .4, -.2, M.kraftDeep, .13, 8); cyl(.07, .8, .1, .5, -.25, M.stone, .09, 8);
      smoke(g, -.38, 1.65, -.2); box(.4, .35, .3, .4, 0, .45, M.stone); top = 1.8; break;
    }
    case 'pagoda': {
      let y = 0, w = 1.0;
      for (let i = 0; i < it.t; i++) {
        box(w, .42, w, 0, y); panes(g, w, .42, w, y, 1, 2, seed + i); y += .42;
        const e = pyr(w + .5, .16, 0, y, 0, i % 2 ? ROOF2 : ROOF); e.rotation.y = Math.PI / 4 + (i % 2) * .08; y += .1; w -= .17;
      }
      pyr(w + .25, .55, 0, y); cyl(.015, .3, 0, y + .5, 0, M.ink, .015, 5);
      add(new THREE.SphereGeometry(.045, 8, 6), M.coral, 0, y + .82, 0);
      top = y + .9; break;
    }
    case 'booth': {
      const h = .45 + r(21) * .3; cyl(.38, h, 0, 0, 0, WALL, .36, 9); cone(.58, .5, 0, h, 0, ROOF, 9); flag(0, h + .47, 0);
      gable(.42, .35, .36, .22, .5, -.3, .6, ROOF2); top = h + .9; break;
    }
    // ---- one-off landmarks, one per tool ----
    case 'theater': { // Emoticon
      box(1.1, .7, .45, 0, 0, .25); add(new THREE.CylinderGeometry(.55, .55, .7, 12, 1, false, Math.PI / 2, Math.PI), WALL, 0, .35, 0);
      add(new THREE.SphereGeometry(.55, 12, 6, Math.PI / 2, Math.PI, 0, Math.PI / 2), ROOF, 0, .7, 0); box(1.16, .08, .5, 0, .7, .25, ROOF2);
      for (const [x, m] of [[-.22, M.mustard], [.22, M.coral]]) { const d = add(new THREE.CylinderGeometry(.14, .14, .03, 12), m, x, .42, .49); d.rotation.x = Math.PI / 2;
        for (const ex of [-.05, .05]) add(new THREE.SphereGeometry(.022, 6, 4), M.ink, x + ex, .46, .51); }
      box(.3, .3, .02, 0, 0, .49, M.kraftDeep); top = 1.3; break;
    }
    case 'inn': { // Plurk — the Prancing Pony
      box(1.05, .42, .7, 0, 0, 0); panes(g, 1.05, .42, .7, 0, 1, 3, seed);
      gable(1.2, .4, .82, .45, 0, 0, 0, ROOF, .42);
      box(.35, .3, .5, -.68, 0, .05, WALL2); pyr(.5, .25, -.68, .3, .05, ROOF2);
      box(.04, .55, .04, .62, 0, .45, M.kraftDeep); box(.3, .03, .03, .5, .55, .45, M.kraftDeep);
      const sign = add(new THREE.BoxGeometry(.22, .16, .02), M.mustard, .45, .44, .45); anims.push(t => { sign.rotation.x = Math.sin(t * 1.4 + seed) * .15; });
      top = 1.4; break;
    }
    case 'teahouse': { // 豆瓣
      box(.9, .45, .9); panes(g, .9, .45, .9, 0, 1, 3, seed); pyr(1.35, .25, 0, .45);
      box(.55, .3, .55, 0, .62, 0, WALL2); pyr(.95, .35, 0, .92, 0, ROOF2);
      add(new THREE.SphereGeometry(.09, 8, 6), M.olive, 0, 1.33, 0).scale.set(1, .75, 1.3);
      [M.coral, M.mustard, M.roofSlate, M.olive].forEach((m, i) => box(.24, .05, .16, .6, i * .05, .5, m).rotation.y = i * .25);
      top = 1.45; break;
    }
    case 'cattower': { // GitHub
      cyl(.42, 1.1, 0, 0, 0, WALL, .38, 8); g.add(rings(.4, 0, 1.1, 2)); cone(.5, .5, 0, 1.1, 0, ROOF, 8);
      for (const s of [-1, 1]) { const ear = add(new THREE.ConeGeometry(.12, .3, 4), ROOF2, s * .24, 1.55, -.05); ear.rotation.z = -s * .3; }
      for (const s of [-1, 1]) add(new THREE.SphereGeometry(.05, 6, 4), M.mustard, .3 + s * .1, .78, .3 - s * .1);
      for (let i = 0; i < 5; i++) { const a = Math.PI * .1 + i / 5 * Math.PI * .8, tt = add(new THREE.CylinderGeometry(.04, .06, .3, 5), WALL2, Math.cos(a) * .48, .1, Math.sin(a) * .48); tt.rotation.z = Math.cos(a) * .5; tt.rotation.x = -Math.sin(a) * .5; }
      top = 1.85; break;
    }
    case 'dovecote': { // Twitter
      box(.5, .3, .5, 0, 0, 0, WALL2); cyl(.06, 1.3, 0, .3, 0, M.kraftDeep, .06, 6);
      box(.5, .36, .5, 0, 1.55, 0); pyr(.72, .34, 0, 1.91);
      for (const [x, z] of [[0, .26], [.26, 0]]) add(new THREE.CylinderGeometry(.06, .06, .02, 8), M.ink, x, 1.73, z).rotation.set(z ? Math.PI / 2 : 0, 0, x ? Math.PI / 2 : 0);
      const flock = [0, 1, 2].map(() => { const ge = new THREE.BufferGeometry(); ge.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(9), 3)); const l = onLines(new THREE.Line(ge, strokeHard)); g.add(l); return l; });
      anims.push(t => flock.forEach((l, i) => { const a = t * (.9 + i * .2) + i * 2, x = Math.cos(a) * .6, z = Math.sin(a) * .6, y = 2.4 + i * .15, f = Math.sin(t * 9 + i) * .05, p = l.geometry.attributes.position;
        p.setXYZ(0, x - .08, y + f, z); p.setXYZ(1, x, y, z); p.setXYZ(2, x + .08, y + f, z); p.needsUpdate = true; }));
      top = 2.4; break;
    }
    case 'camera': { // Instagram
      box(1, .7, .8, 0, 0, 0); box(1.04, .06, .84, 0, .7, 0, ROOF);
      const lens = add(new THREE.CylinderGeometry(.27, .3, .18, 14), M.ink, .05, .36, .48); lens.rotation.x = Math.PI / 2;
      const glass = add(new THREE.CylinderGeometry(.18, .18, .02, 14), M.water, .05, .36, .58); glass.rotation.x = Math.PI / 2;
      [M.coral, M.mustard, M.olive, M.roofSlate].forEach((m, i) => box(.05, .6, .01, -.43 + i * .06, .05, .405, m));
      box(.3, .14, .2, -.2, .76, -.1, WALL2); box(.14, .1, .1, .32, .76, .15, M.mustard); top = 1.15; break;
    }
    case 'pavilion': { // 心經
      cyl(.62, .12, 0, 0, 0, M.stone, .65, 6);
      for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; cyl(.04, .6, Math.cos(a) * .5, .12, Math.sin(a) * .5, M.coral, .04, 6); }
      cone(.8, .28, 0, .72, 0, ROOF, 6); cone(.5, .38, 0, .92, 0, ROOF2, 6); cyl(.015, .25, 0, 1.28, 0, M.ink, .015, 4);
      add(new THREE.SphereGeometry(.04, 6, 4), M.mustard, 0, 1.55, 0); box(.3, .25, .3, 0, .12, 0, WALL); top = 1.7; break;
    }
    case 'elfhall': { // Heart (English)
      gable(1.2, .55, .55, .7, 0, -.1, 0); cyl(.14, 1.5, .5, 0, .35, WALL2, .12, 8); cone(.17, .55, .5, 1.5, .35, ROOF2, 8);
      for (const x of [-.35, 0, .35]) box(.1, .3, .015, x, .1, .18, M.kraftDeep);
      const arc = add(new THREE.TorusGeometry(.32, .03, 6, 12, Math.PI), M.stone, -.4, .02, .45); arc.rotation.y = .3;
      top = 2.1; break;
    }
    case 'stupa': { // Sanskrit
      box(1.05, .22, 1.05, 0, 0, 0, M.stone); box(.85, .16, .85, 0, .22, 0, WALL);
      add(new THREE.SphereGeometry(.42, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), WALL2, 0, .38, 0); box(.24, .14, .24, 0, .78, 0, ROOF);
      for (let i = 0; i < 5; i++) cyl(.13 - i * .022, .08, 0, .92 + i * .1, 0, M.mustard, .13 - i * .022, 8);
      const top0 = V(0, 1.42, 0), fp = [], cols = [M.coral, M.mustard, M.olive, M.roofSlate, M.paper];
      for (const [x, z] of [[.52, .52], [-.52, .52], [.52, -.52], [-.52, -.52]]) { fp.push(top0, V(x, .24, z)); for (let k = 1; k < 5; k++) { const p = top0.clone().lerp(V(x, .24, z), k / 5); add(new THREE.BoxGeometry(.06, .07, .01), cols[(k + x * 9 | 0) % 5 + 0 > 4 ? 0 : (k + (x > 0 ? 1 : 3)) % 5], p.x, p.y - .04, p.z).lookAt(0, p.y, 0); } }
      g.add(lineSeg(fp, strokeHard)); top = 1.6; break;
    }
    case 'tent': { // Tsudoi app
      cyl(.5, .45, 0, 0, 0, WALL, .5, 10); cone(.62, .6, 0, .45, 0, M.coral, 10);
      for (let i = 0; i < 10; i += 2) { const a = i / 10 * Math.PI * 2 + .3; g.add(lineSeg([V(0, 1.05, 0), V(Math.cos(a) * .62, .45, Math.sin(a) * .62)], strokeHard)); }
      const top0 = V(0, 1.05, 0); flag(0, 1.03, 0);
      for (const [x, z] of [[.85, .4], [-.6, .75]]) { cyl(.015, .6, x, 0, z, M.kraftDeep, .015, 4); g.add(lineSeg([top0, V(x, .6, z)], stroke));
        for (let k = 1; k < 4; k++) { const p = top0.clone().lerp(V(x, .6, z), k / 4); add(new THREE.ConeGeometry(.035, .07, 3), k % 2 ? M.mustard : M.olive, p.x, p.y - .05, p.z).rotation.x = Math.PI; } }
      top = 1.45; break;
    }
    case 'school': { // Learning Vim app
      gable(1.1, .55, .7, .4, -.05, 0, 0); box(.3, .55, .3, .45, .55, -.05, WALL2); pyr(.42, .35, .45, 1.1, -.05);
      add(new THREE.SphereGeometry(.07, 8, 6), M.mustard, .45, .88, .1); box(.5, .03, .25, -.05, .02, .55, M.stone);
      flag(.45, 1.42, -.05); top = 1.8; break;
    }
    case 'smithy': { // 7th Vim
      gable(1, .45, .75, .3, -.1, 0, 0); box(.32, 1.25, .32, .4, 0, -.15, M.stone); box(.36, .06, .36, .4, 1.25, -.15, M.kraftDeep);
      box(.3, .22, .05, -.1, 0, .4, M.ink); const glow2 = add(new THREE.BoxGeometry(.22, .1, .02), M.coral, -.1, .06, .43);
      anims.push(t => { glow2.scale.y = .7 + Math.abs(Math.sin(t * 5 + seed)) * .6; }); smoke(g, .4, 1.35, -.15); top = 1.6; break;
    }
    case 'scriptorium': { // Learn Vim
      box(.55, 1.55, .55, .1, 0, -.1); panes(g, .55, 1.55, .55, 0, 4, 1, seed); pyr(.75, .7, .1, 1.55, -.1);
      const clock = add(new THREE.CylinderGeometry(.16, .16, .03, 14), M.paper, .1, 1.25, .2); clock.rotation.x = Math.PI / 2;
      const hand = add(new THREE.BoxGeometry(.02, .13, .01), M.ink, .1, 1.29, .22); anims.push(t => { hand.rotation.z = -t * .3; });
      gable(.6, .45, .55, .3, -.38, .25, Math.PI / 2, ROOF2); top = 2.35; break;
    }
    case 'warehouse': { // Emoji Database
      box(1.3, .5, .75, 0, 0, 0); panes(g, 1.3, .5, .75, 0, 1, 4, seed);
      const s2 = new THREE.Shape(); s2.moveTo(0, 0); s2.lineTo(.43, 0); s2.lineTo(.43, .3); s2.closePath();
      for (let i = 0; i < 3; i++) { const tg = new THREE.ExtrudeGeometry(s2, { depth: .75, bevelEnabled: false }); add(tg, i % 2 ? ROOF2 : ROOF, -.65 + i * .433, .5, -.375); }
      box(.35, .35, .02, .3, 0, .385, M.kraftDeep); top = 1; break;
    }
    case 'watermill': { // Apple Emoji Dict
      gable(.9, .6, .7, .4, -.1, 0, 0);
      const wheel = new THREE.Group(); wheel.position.set(.45, .38, .1); g.add(wheel);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(.33, .035, 5, 14), M.kraftDeep); rim.rotation.y = Math.PI / 2; wheel.add(rim);
      for (let i = 0; i < 8; i++) { const sp = new THREE.Mesh(new THREE.BoxGeometry(.12, .66, .04), M.kraft); sp.rotation.x = i / 8 * Math.PI; wheel.add(sp); }
      anims.push(t => { wheel.rotation.x = t * .8; }); box(.16, .04, 1.2, .45, 0, .1, M.water); top = 1.2; break;
    }
    case 'kiln': { // PopClip
      const pts = [[.0, 0], [.46, 0], [.5, .25], [.42, .7], [.2, 1.15], [.16, 1.4], [.0, 1.4]].map(([x, y]) => new THREE.Vector2(x, y));
      add(new THREE.LatheGeometry(pts, 10), WALL2); g.add(rings(.47, 0, .5, 1));
      gable(.5, .35, .45, .22, .55, .25, Math.PI / 2, ROOF); smoke(g, 0, 1.5, 0);
      for (let i = 0; i < 3; i++) add(new THREE.SphereGeometry(.06, 6, 4), [M.coral, M.mustard, M.roofSlate][i], -.5 + i * .12, .06, .45);
      top = 1.6; break;
    }
    case 'mansion': { // Alfred
      box(1.1, .6, .8); panes(g, 1.1, .6, .8, 0, 2, 4, seed);
      const mans = add(new THREE.CylinderGeometry(.45, .78, .4, 4), ROOF, 0, .8, 0); mans.rotation.y = Math.PI / 4;
      for (const x of [-.25, .25]) { box(.16, .14, .1, x, .66, .32, WALL2); pyr(.2, .1, x, .8, .32); }
      for (const x of [-.18, .18]) cyl(.035, .5, x, 0, .55, M.paper, .035, 6); box(.5, .06, .3, 0, .5, .5, ROOF2);
      cyl(.08, .15, .3, 1, -.15, M.ink, .08, 8); cyl(.13, .02, .3, 1, -.15, M.ink, .13, 8);
      top = 1.3; break;
    }
    case 'hobbit': { // Tsudoi source
      add(new THREE.SphereGeometry(.65, 10, 5, 0, Math.PI * 2, 0, Math.PI / 2), M.grass, 0, 0, 0).scale.set(1, .7, 1);
      const door = add(new THREE.CylinderGeometry(.18, .18, .04, 12), M.mustard, .25, .18, .5); door.rotation.set(Math.PI / 2, 0, -.45); door.rotation.order = 'YXZ'; door.rotation.y = .45;
      const win = add(new THREE.CylinderGeometry(.09, .09, .03, 10), M.paper, -.3, .22, .53); win.rotation.set(Math.PI / 2, 0, 0); win.rotation.order = 'YXZ'; win.rotation.y = -.5;
      cyl(.06, .35, -.15, .35, -.2, M.stone, .07, 6); smoke(g, -.15, .75, -.2);
      for (let i = 0; i < 5; i++) add(new THREE.IcosahedronGeometry(.06, 0), [M.coral, M.mustard, M.paper][i % 3], -.5 + i * .25, .08, .7);
      top = .9; break;
    }
    case 'mine': { // Learning Vim source
      const rock = add(new THREE.IcosahedronGeometry(.7, 0), M.stone, 0, .15, -.2); rock.scale.set(1.1, .8, .9); rock.rotation.y = seed;
      box(.08, .5, .08, -.2, 0, .45, M.kraftDeep); box(.08, .5, .08, .2, 0, .45, M.kraftDeep); box(.55, .08, .1, 0, .5, .45, M.kraftDeep);
      box(.32, .42, .05, 0, 0, .4, M.ink);
      g.add(lineSeg([V(-.08, .01, .45), V(-.08, .01, .95), V(.08, .01, .45), V(.08, .01, .95)], strokeHard));
      const cart = new THREE.Group(); g.add(cart); const cb = new THREE.Mesh(new THREE.BoxGeometry(.2, .1, .14), M.kraft); cb.position.y = .08; cart.add(cb);
      const ore = new THREE.Mesh(new THREE.IcosahedronGeometry(.07, 0), M.mustard); ore.position.y = .16; cart.add(ore);
      anims.push(t => { cart.position.set(0, 0, .55 + Math.sin(t * .6 + seed) * .25); cart.rotation.y = Math.PI / 2; });
      top = 1.15; break;
    }
    case 'still': { // Brew Graph source
      add(new THREE.SphereGeometry(.4, 10, 7), M.mustard, -.1, .45, 0).scale.set(1, .9, 1); cyl(.12, .35, -.1, .75, 0, M.mustard, .06, 8);
      const coil = add(new THREE.TorusGeometry(.18, .03, 5, 14), M.kraftDeep, .4, .4, .1); coil.rotation.x = Math.PI / 2;
      cyl(.22, .55, .4, 0, .1, WALL2, .22, 10); g.add(poly([V(-.1, 1.1, 0), V(.2, 1.05, .05), V(.4, .6, .1)], strokeHard));
      box(.3, .2, .3, -.45, 0, .4, M.kraft); top = 1.25; break;
    }
    default: box(1, 1, 1);
  }
  // break the grid: turn, nudge and resize every main building a little
  g.rotation.y = (r(1) - .5) * .7; g.position.set((r(2) - .5) * .2, 0, (r(3) - .5) * .2);
  const s = .9 + r(4) * .18, sy = .9 + r(5) * .25; g.scale.set(s, sy, s); top *= sy;
  // small neighbours in the plot corners
  const slots = [[.7, .7], [-.7, .7], [.7, -.7], [-.7, -.7], [0, .78], [.78, 0], [-.78, 0]].sort((a, b) => hash(seed, a[0] * 10 + a[1] * 3 + 9) - hash(seed, b[0] * 10 + b[1] * 3 + 9));
  const n = 1 + Math.floor(r(6) * 3);
  for (let i = 0; i < n; i++) { const a = annex(pickS(S.annex, seed + i * 17), ROOF2, WALL, seed + i); a.position.set(slots[i][0], 0, slots[i][1]); a.rotation.y = r(40 + i) * 6.28; root.add(a); }
  return { g: root, top };
}

function smoke(parent, x, y, z) {
  const puffs = [0, 1, 2, 3, 4].map(() => { const m = new THREE.Mesh(new THREE.IcosahedronGeometry(.12, 0), M.paper); parent.add(m); return m; });
  anims.push(t => puffs.forEach((m, i) => {
    const p = (t * .22 + i / 5) % 1;
    m.position.set(x + p * .5, y + p * 1.3, z - p * .2); m.rotation.set(p * 3, p * 2, 0);
    m.scale.setScalar(Math.sin(p * Math.PI) * 1.4 + .01);
  }));
}

// ---------------- terrain model ----------------
const sampleCurve = (pts, n) => new THREE.CatmullRomCurve3(pts.map(([x, z]) => V(x, 0, z))).getPoints(n);
for (const r of RIVERS) r.path = WORLD.snapRoads ? sampleCurve(r.pts, 90) : r.pts.map(([x, z]) => V(x, 0, z));
const roadPaths = ROADS.map(p => sampleCurve(p, Math.max(12, Math.round(p.reduce((s, q, i) => i ? s + Math.hypot(q[0] - p[i - 1][0], q[1] - p[i - 1][1]) : 0, 0) * 3))));
function distPath(path, x, z, pad = 3) {
  const bb = path.bb || (path.bb = path.reduce((b, p) => [Math.min(b[0], p.x), Math.max(b[1], p.x), Math.min(b[2], p.z), Math.max(b[3], p.z)], [1e9, -1e9, 1e9, -1e9]));
  if (x < bb[0] - pad || x > bb[1] + pad || z < bb[2] - pad || z > bb[3] + pad) return [9, 0];
  let best = 1e9, bu = 0;
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1], b = path[i], dx = b.x - a.x, dz = b.z - a.z, L = dx * dx + dz * dz;
    let t = ((x - a.x) * dx + (z - a.z) * dz) / L; t = Math.max(0, Math.min(1, t));
    const ex = a.x + dx * t - x, ez = a.z + dz * t - z, d = ex * ex + ez * ez;
    if (d < best) { best = d; bu = i - 1 + t; }
  }
  return [Math.sqrt(best), bu];
}
const flats = CITIES.map(c => ({ sd: (x, z) => blobSd(c, x, z), y: c.y - .04, m: 2.2, city: c }));
const terraceStep = .3;
const farness = WORLD.farness;
const terrace = h => { const k = h / terraceStep, f = Math.floor(k), t = k - f; return (f + sstep(.6, .9, t)) * terraceStep; };
const seaSd = WORLD.sea; // > 0 on land
function landMask(x, z) { return sstep(-1.2, 1.4, seaSd(x, z)); }
const ridge = (x, z) => { const n = 1 - Math.abs(2 * vnoise(x, z) - 1); return n * n * .7 + (1 - Math.abs(2 * vnoise(x * 2.1 + 5, z * 2.1) - 1)) * .3; };
const natural = WORLD.natural;
function flatten(h, x, z, list) {
  for (const f of list) { const d = f.sd(x, z); if (d < f.m) h = lerp(h, f.y, sstep(f.m, 0, d)); }
  return h;
}
// fields sit on terrace of their natural height
for (const f of FIELDS) f.y = Math.max(terrace(flatten(natural(f.x, f.z), f.x, f.z, flats)) + .02, WORLD.minFieldY ?? -9);
const fieldFlats = FIELDS.map(f => ({ sd: (x, z) => sdBox(x, z, f.x, f.z, f.w / 2 + .2, f.d / 2 + .2, .5), y: f.y, m: 1.2 }));
const allFlats = [...flats, ...fieldFlats];
function smoothH(x, z) { return flatten(natural(x, z), x, z, flats); } // continuous, roads follow it
function H(x, z) {
  const h0 = smoothH(x, z);
  const farK = farness(x, z);
  let h = flatten(lerp(terrace(h0), h0, farK), x, z, allFlats);
  let rd = 9; for (const p of roadPaths) rd = Math.min(rd, distPath(p, x, z)[0]);
  if (rd < 1.2) h = lerp(h, h0 - .02, sstep(1.2, .5, rd));
  for (const r of RIVERS) { const [d] = distPath(r.path, x, z); if (d < r.w + 1.2) h = lerp(h, -.85, sstep(r.w + 1.2, r.w * .5, d)); }
  return lerp(-1.6, h, landMask(x, z));
}

await step(0, L().steps[0]);
// ---------------- terrain mesh ----------------
const world = new THREE.Group(); scene.add(world);
const TCX = -3, TCZ = -3;
const tgeo0 = new THREE.PlaneGeometry(2, 2, 240, 216); tgeo0.rotateX(-Math.PI / 2);
{ const p = tgeo0.attributes.position; for (let i = 0; i < p.count; i++) { const u = p.getX(i), v = p.getZ(i), x = TCX + 48 * u + 62 * u * u * u, z = TCZ + 43 * v + 57 * v * v * v; p.setXYZ(i, x, H(x, z), z); } }
const tgeo = tgeo0.toNonIndexed(); tgeo.computeVertexNormals();
const tClass = [], tJit = [];
{
  const p = tgeo.attributes.position, n = tgeo.attributes.normal;
  for (let f = 0; f < p.count / 3; f++) {
    const i = f * 3, cy = (p.getY(i) + p.getY(i + 1) + p.getY(i + 2)) / 3, cx = (p.getX(i) + p.getX(i + 1) + p.getX(i + 2)) / 3, cz = (p.getZ(i) + p.getZ(i + 1) + p.getZ(i + 2)) / 3;
    const slope = 1 - n.getY(i);
    let k;
    if (cy < WL + .02) k = 'sandWet';
    else if (cy < WL + .2) k = 'sand';
    else if (slope > .3 && farness(cx, cz) < .5) k = 'cut';
    else if (slope > .3) k = cy > 3 ? 'slate' : 'stone';
    else if (cy > 5.2) k = vnoise(cx * .07 + 19, cz * .07 - 10) > .6 ? 'snow' : slope > .15 ? 'slate' : 'stone';
    else if (cy > 3.6) k = slope > .12 ? 'slate' : 'stone';
    else if (cy > 2.6) k = 'stone';
    else { const v = vnoise(cx * .32 + 40, cz * .32); k = v > .64 ? 'meadow' : v < .26 ? 'olivegrass' : 'grass'; }
    tClass.push(k); tJit.push(.93 + hash(f, 7) * .12);
  }
}
tgeo.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(tgeo.attributes.position.count * 3), 3));
const terrain = new THREE.Mesh(tgeo, vcol); terrain.receiveShadow = true; world.add(terrain);
const mixC = (a, b, t) => a.clone().lerp(b, t);
recolorers.push(() => {
  const pal = { sandWet: mixC(C.road, C.water, .35), sand: C.road, cut: C.kraft, stone: C.stone, snow: C.snow, slate: C.slate, meadow: C.meadow, grass: C.grass, olivegrass: mixC(C.grass, C.olive, .45) };
  const col = tgeo.attributes.color;
  for (let f = 0; f < tClass.length; f++) { const c = pal[tClass[f]], j = tJit[f]; for (let v = 0; v < 3; v++) col.setXYZ(f * 3 + v, c.r * j, c.g * j, c.b * j); }
  col.needsUpdate = true;
});
// terrain skirt so the continent reads as a thick paper model from low angles
const sea = new THREE.Mesh(new THREE.PlaneGeometry(700, 700), M.water); sea.rotation.x = -Math.PI / 2; sea.position.y = WL; sea.receiveShadow = true; world.add(sea);

await step(1, L().steps[1]);
// ---------------- mountains ----------------
function mountain(x, z, r, h, seed) {
  const g = new THREE.ConeGeometry(r, h, 7, 4); const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i); if (y > h / 2 - 1e-3) continue;
    const k = 1 - (y + h / 2) / h, j = (hash(i + seed * 31, seed) - .5) * r * .35 * k;
    p.setX(i, p.getX(i) * (1 + (hash(i, seed + 5) - .5) * .3) + j); p.setZ(i, p.getZ(i) * (1 + (hash(i + 9, seed) - .5) * .3) - j);
    p.setY(i, y + (hash(i, seed + 2) - .5) * h * .08);
  }
  const ng = g.toNonIndexed(); ng.computeVertexNormals(); ng.translate(x, h / 2 - .6, z);
  return { geo: ng, h, base: -.6, seed };
}
const peaks = WORLD.peaks.map(([x, z, r, h, sd]) => mountain(x, z, r, h, sd));
const mgeo = mergeGeometries(peaks.map(p => p.geo));
const mClass = [];
{
  for (const peak of peaks) {
    const p = peak.geo.attributes.position, n = peak.geo.attributes.normal;
    const snowy = peak.h > 5 && hash(peak.seed, 851) > .42;
    const snowline = Math.max(3.4, peak.h * .68);
    for (let f = 0; f < p.count / 3; f++) {
      const i = f * 3, cy = Math.max(p.getY(i), p.getY(i + 1), p.getY(i + 2));
      mClass.push(snowy && cy > snowline ? 'snow' : cy > 2.7 ? 'slate' : cy > 1.3 ? (n.getY(i) > .45 ? 'olive' : 'stone') : 'grass');
    }
  }
}
mgeo.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(mgeo.attributes.position.count * 3), 3));
const mountains = new THREE.Mesh(mgeo, vcol); mountains.castShadow = mountains.receiveShadow = true; world.add(mountains);
recolorers.push(() => {
  const pal = { snow: C.snow, slate: C.slate, stone: C.stone, olive: C.olive, grass: C.grass }, col = mgeo.attributes.color;
  for (let f = 0; f < mClass.length; f++) { const c = pal[mClass[f]], j = .9 + hash(f, 13) * .16; for (let v = 0; v < 3; v++) col.setXYZ(f * 3 + v, Math.min(1, c.r * j), Math.min(1, c.g * j), Math.min(1, c.b * j)); }
  col.needsUpdate = true;
});
const inMountain = (x, z) => peaks.some(p => { const b = p.geo.boundingBox || (p.geo.computeBoundingBox(), p.geo.boundingBox); return x > b.min.x - .3 && x < b.max.x + .3 && z > b.min.z - .3 && z < b.max.z + .3; });

await step(2, L().steps[2]);
// ---------------- roads + bridges ----------------
const walkPaths = [];
for (const path of roadPaths) {
  const pts = path.map(p => V(p.x, smoothH(p.x, p.z) + .07, p.z));
  for (let k = 0; k < 3; k++) for (let i = 1; i < pts.length - 1; i++) pts[i].y = (pts[i - 1].y + pts[i].y * 2 + pts[i + 1].y) / 4;
  // Ease the road surface into the matching town street instead of ending as a raised slab.
  for (const reverse of [false, true]) {
    const end = reverse ? pts.at(-1) : pts[0];
    const city = CITIES.filter(c => blobSd(c, end.x, end.z) < 1.4).sort((a, b) => Math.hypot(a.cx - end.x, a.cz - end.z) - Math.hypot(b.cx - end.x, b.cz - end.z))[0];
    if (!city) continue;
    let distance = 0;
    for (let j = 0; j < pts.length; j++) {
      const i = reverse ? pts.length - 1 - j : j;
      if (j) distance += pts[i].distanceTo(pts[reverse ? i + 1 : i - 1]);
      if (distance > 1.4) break;
      pts[i].y = lerp(city.y - .02, pts[i].y, sstep(0, 1.4, distance));
    }
  }
  const top = [], side = [], half = .42;
  const edgeL = [], edgeR = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    const t = V(b.x - a.x, 0, b.z - a.z).normalize(), n = V(-t.z, 0, t.x);
    edgeL.push(pts[i].clone().addScaledVector(n, half)); edgeR.push(pts[i].clone().addScaledVector(n, -half));
  }
  for (let i = 1; i < pts.length; i++) {
    const L0 = edgeL[i - 1], L1 = edgeL[i], R0 = edgeR[i - 1], R1 = edgeR[i];
    top.push(L0, R0, L1, L1, R0, R1);
    for (const [A, B] of [[L0, L1], [R1, R0]]) { const A2 = A.clone(), B2 = B.clone(); A2.y -= .22; B2.y -= .22; side.push(A, A2, B, B, A2, B2); }
  }
  const mk = (arr, mat) => { const g = new THREE.BufferGeometry().setFromPoints(arr); g.computeVertexNormals(); const m = new THREE.Mesh(g, mat); m.receiveShadow = true; m.material.side = THREE.DoubleSide; world.add(m); return m; };
  mk(top, M.road); mk(side, M.kraft);
  // Rounded ends overlap the city streets, hiding sharp cutoffs at the joins.
  for (const end of [pts[0], pts.at(-1)]) {
    const cap = new THREE.Mesh(new THREE.CircleGeometry(half, 24).rotateX(-Math.PI / 2), M.road);
    cap.position.copy(end); cap.position.y += .005; cap.receiveShadow = true; world.add(cap);
  }
  // bridges where the carved ground drops under water
  let span = [];
  const flush = () => {
    if (span.length < 2) { span = []; return; }
    for (const i of span) for (const e of [edgeL[i], edgeR[i]]) { const post = new THREE.Mesh(new THREE.BoxGeometry(.06, .28, .06), M.kraftDeep); post.position.copy(e).add(V(0, .14, 0)); world.add(post); }
    world.add(poly(span.map(i => edgeL[i].clone().add(V(0, .27, 0))), strokeHard));
    world.add(poly(span.map(i => edgeR[i].clone().add(V(0, .27, 0))), strokeHard));
    for (let k = 1; k < span.length - 1; k += 2) { const p = pts[span[k]]; const pier = new THREE.Mesh(new THREE.BoxGeometry(.5, p.y + 1, .5), M.stone); pier.position.set(p.x, (p.y - 1) / 2, p.z); world.add(pier); }
    span = [];
  };
  pts.forEach((p, i) => { if (H(p.x, p.z) < WL + .15) span.push(i); else flush(); }); flush();
  walkPaths.push(edgeL.map((e, i) => e.clone().lerp(pts[i], .55)), edgeR.map((e, i) => e.clone().lerp(pts[i], .55)));
  // roadside milestones
  for (let i = 4; i < pts.length - 4; i += 9) { const s = new THREE.Mesh(new THREE.BoxGeometry(.1, .18, .06), M.stone); s.position.copy(edgeL[i]).add(V(0, .05, 0)); world.add(s); }
}

// ---------------- rivers: flow strokes ----------------
const flowMarks = [];
for (const r of RIVERS) {
  const curve = new THREE.CatmullRomCurve3(r.path);
  for (let i = 0; i < 34; i++) flowMarks.push({ curve, u: hash(i, r.w * 100), off: (hash(i, 3) - .5) * r.w * .9, sp: .008 + hash(i, 5) * .006 });
}
const flowGeo = new THREE.BufferGeometry(); flowGeo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(flowMarks.length * 6), 3));
const flowLines = onLines(new THREE.LineSegments(flowGeo, waveMat)); world.add(flowLines);
anims.push((t, dt) => {
  const p = flowGeo.attributes.position;
  flowMarks.forEach((m, i) => {
    m.u = (m.u + m.sp * dt * 6) % .985;
    const a = m.curve.getPointAt(m.u), b = m.curve.getPointAt(Math.min(1, m.u + .012)), n = V(-(b.z - a.z), 0, b.x - a.x).normalize().multiplyScalar(m.off);
    p.setXYZ(i * 2, a.x + n.x, WL + .02, a.z + n.z); p.setXYZ(i * 2 + 1, b.x + n.x, WL + .02, b.z + n.z);
  });
  p.needsUpdate = true;
});
// sea strokes
{
  const wp = [];
  const ST = WORLD.strokes;
  for (let i = 0; i < ST.n; i++) {
    const x = ST.x0 + rand() * (ST.x1 - ST.x0), z = ST.z0 + rand() * (ST.z1 - ST.z0);
    if (landMask(x, z) > .02) continue;
    const w = .35 + rand() * .4;
    for (let s = 0; s < 6; s++) { const a = s / 6, b = (s + 1) / 6; wp.push(V(x + a * w, WL + .01, z + Math.sin(a * 6.28) * .05), V(x + b * w, WL + .01, z + Math.sin(b * 6.28) * .05)); }
  }
  const waves = lineSeg(wp, waveMat); world.add(waves);
  anims.push(t => { waves.position.x = Math.sin(t * .4) * .14; waveMat.opacity = .36 + Math.sin(t * .9) * .08; });
}

await step(3, L().steps[3]);
// ---------------- fields, farms, windmill, sheep ----------------
for (const f of FIELDS) {
  const g = new THREE.Group(); g.position.set(f.x, f.y, f.z); g.rotation.y = f.rot; world.add(g);
  const rows = Math.round(f.d / .3), cols = [M.mustard, M.olive, M.meadow, M.mustard, M.kraft];
  const ci = Math.floor(hash(Math.round(f.x * 10), 1) * cols.length);
  const fur = [];
  for (let r = 0; r < rows; r++) {
    const mat = r % 2 ? cols[ci] : cols[(ci + 2) % cols.length];
    const s = new THREE.Mesh(new THREE.BoxGeometry(f.w, .05 + (r % 2) * .04, f.d / rows * .96), mat);
    s.position.set(0, .025, -f.d / 2 + (r + .5) * f.d / rows); s.receiveShadow = true; g.add(s);
    const z = -f.d / 2 + (r + .5) * f.d / rows; fur.push(V(-f.w / 2, .1, z), V(f.w / 2, .1, z));
  }
  g.add(lineSeg(fur, stroke));
  // fence posts
  const fp = [];
  for (const [ax, az, bx, bz] of [[-1, -1, 1, -1], [1, -1, 1, 1], [1, 1, -1, 1], [-1, 1, -1, -1]]) {
    const n = 8; for (let i = 0; i <= n; i++) { const t = i / n, x = lerp(ax, bx, t) * (f.w / 2 + .12), z = lerp(az, bz, t) * (f.d / 2 + .12);
      const p = new THREE.Mesh(new THREE.BoxGeometry(.04, .18, .04), M.kraftDeep); p.position.set(x, .09, z); g.add(p); if (i) fp.push(fp.at(-1)?.clone?.() ?? V(x, .15, z)); fp.push(V(x, .15, z)); }
  }
  for (let i = 0; i + 1 < fp.length; i += 2) { /* pairs */ }
  const rail = []; for (const [ax, az, bx, bz] of [[-1, -1, 1, -1], [1, -1, 1, 1], [1, 1, -1, 1], [-1, 1, -1, -1]]) rail.push(V(ax * (f.w / 2 + .12), .15, az * (f.d / 2 + .12)), V(bx * (f.w / 2 + .12), .15, bz * (f.d / 2 + .12)));
  g.add(lineSeg(rail, strokeHard));
}
const occupied = [];
function farmhouse(x, z, rot, roof = M.terra, seed = 1) {
  const y = H(x, z), g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = rot; world.add(g); occupied.push([x, z, .7]);
  const v = hash(seed, 3), w = .5 + hash(seed, 4) * .4, d = .4 + hash(seed, 5) * .2, h = .3 + hash(seed, 6) * .2;
  const wall = v < .25 ? M.kraft : v < .5 ? M.road : M.paper;
  const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wall); b.position.y = h / 2; g.add(b);
  const r = new THREE.Mesh(roofPrism(w, d, .2 + hash(seed, 7) * .2), roof); r.position.y = h; g.add(r);
  if (hash(seed, 8) < .7) { const ch = new THREE.Mesh(new THREE.BoxGeometry(.07, .22, .07), M.stone); ch.position.set(w * .3, h + .16, -d * .2); g.add(ch); }
  const dr = new THREE.Mesh(new THREE.BoxGeometry(.11, .18, .02), M.kraftDeep); dr.position.set(-w * .2, .09, d / 2 + .01); g.add(dr);
  panes(g, w, h, d, 0, 1, Math.max(1, Math.round(w / .3)), seed);
  if (v > .55) { const a = new THREE.Group(); a.position.set(w / 2 + .14, 0, .05); g.add(a);
    const ab = new THREE.Mesh(new THREE.BoxGeometry(.28, h * .75, d * .8), wall); ab.position.y = h * .375; a.add(ab);
    const ar = new THREE.Mesh(roofPrism(.28, d * .8, .14), M.kraftDeep); ar.position.y = h * .75; a.add(ar); }
  if (v < .2) { const silo = new THREE.Mesh(new THREE.CylinderGeometry(.11, .11, .55, 8), M.stone); silo.position.set(-w / 2 - .16, .27, 0); g.add(silo);
    const sc = new THREE.Mesh(new THREE.ConeGeometry(.13, .14, 8), roof); sc.position.set(-w / 2 - .16, .62, 0); g.add(sc); }
  if (hash(seed, 9) < .5) { const tr = annex('tree', roof, wall, seed); tr.position.set(-w / 2 - .3, 0, d / 2 + .2); g.add(tr); }
}
WORLD.farms.forEach(([x, z, r], i) => farmhouse(x, z, r, [M.terra, M.roofSlate, M.mustard, M.kraftDeep][i % 4], i + 3));
// windmill
{
  if (WORLD.windmill) {
  const [x, z] = WORLD.windmill, y = H(x, z), g = new THREE.Group(); g.position.set(x, y, z); world.add(g); occupied.push([x, z, .8]);
  const tw = new THREE.Mesh(new THREE.CylinderGeometry(.22, .36, 1.5, 8), M.paper); tw.position.y = .75; g.add(tw);
  g.add(rings(.3, 0, 1.5, 2));
  const cap = new THREE.Mesh(new THREE.ConeGeometry(.3, .35, 8), M.terra); cap.position.y = 1.67; g.add(cap);
  const hub = new THREE.Group(); hub.position.set(0, 1.45, .3); g.add(hub);
  for (let i = 0; i < 4; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(.12, .85, .02), M.road); b.position.y = .45; const arm = new THREE.Group(); arm.rotation.z = i * Math.PI / 2; arm.add(b); hub.add(arm);
    const lat = lineSeg([V(-.06, .1, .012), V(.06, .1, .012), V(-.06, .35, .012), V(.06, .35, .012), V(-.06, .6, .012), V(.06, .6, .012)], strokeHard); arm.add(lat); }
  anims.push(t => { hub.rotation.z = t * .9; });
  }
}
// sheep near Bree and the Shire field
const sheep = [];
for (let i = 0; i < 7 * WORLD.sheep.length; i++) {
  const home = WORLD.sheep[Math.floor(i / 7)];
  const s = new THREE.Group(); world.add(s);
  const body = new THREE.Mesh(new THREE.IcosahedronGeometry(.13, 0), M.snow); body.scale.set(1.3, 1, 1); body.position.y = .14; s.add(body);
  const head = new THREE.Mesh(new THREE.BoxGeometry(.07, .07, .07), M.ink); head.position.set(.16, .17, 0); s.add(head);
  s.userData = { home, a: hash(i, 21) * 6.28, r: .4 + hash(i, 22) * 1.1, sp: .05 + hash(i, 23) * .08 };
  sheep.push(s);
}
anims.push(t => sheep.forEach(s => { const d = s.userData, a = d.a + t * d.sp, x = d.home[0] + Math.cos(a) * d.r, z = d.home[1] + Math.sin(a * 1.3) * d.r * .7;
  s.position.set(x, H(x, z) + Math.abs(Math.sin(t * 3 + d.a)) * .02, z); s.rotation.y = -a - Math.PI / 2; }));

await step(4, L().steps[4]);
// ---------------- cities ----------------
const cityTagHTML = c => `<span class="en">${c.en}</span><span class="zh">${c.name !== c.en ? c.name + ' · ' : ''}${c.role} · ${c.items.length}</span>`;
const cityData = {}, pickables = [], districts = {}, buildOrder = [], cityOcc = [], streetPaths = [];
function ribbon(pts, w, mat, y) {
  const L = [], R = [];
  pts.forEach((p, i) => { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)], t = V(b.x - a.x, 0, b.z - a.z).normalize(), n = V(-t.z, 0, t.x).multiplyScalar(w / 2);
    L.push(V(p.x + n.x, y, p.z + n.z)); R.push(V(p.x - n.x, y, p.z - n.z)); });
  const tri = []; for (let i = 1; i < pts.length; i++) tri.push(L[i - 1], R[i - 1], L[i], L[i], R[i - 1], R[i]);
  const g = new THREE.BufferGeometry().setFromPoints(tri); g.computeVertexNormals();
  const m = new THREE.Mesh(g, mat); m.receiveShadow = true; return m;
}
const bend = (a, b, s) => { const m = a.clone().lerp(b, .5), d = b.clone().sub(a), n = V(-d.z, 0, d.x).normalize().multiplyScalar((hash(s, 4) - .5) * d.length() * .22); return new THREE.CatmullRomCurve3([a, m.add(n), b]).getPoints(18); };
function irregular(n, r0, r1, seed) { const s = new THREE.Shape(); for (let i = 0; i <= n; i++) { const a = i / n * Math.PI * 2, r = r0 + hash(i % n, seed) * (r1 - r0); if (i) s.lineTo(Math.cos(a) * r, Math.sin(a) * r); else s.moveTo(Math.cos(a) * r, Math.sin(a) * r); } return s; }
const flatShape = (shape, depth) => { const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false }); g.rotateX(-Math.PI / 2); return g; };

for (const c of CITIES) {
  const ROOF = M[c.roof];
  const grp = new THREE.Group(); grp.position.set(c.cx, 0, c.cz); world.add(grp);
  const Gy = c.y - .04, y = c.y, pave = [];
  const toLocal = p => V(p.x - c.cx, 0, p.z - c.cz), toWorld = (x, yy, z) => V(x + c.cx, yy, z + c.cz);
  // invisible footprint for picking the whole town
  { const s = new THREE.Shape(); for (let i = 0; i <= 48; i++) { const [x, z] = blobPt(c, i / 48 * Math.PI * 2); if (i) s.lineTo(x, -z); else s.moveTo(x, -z); }
    const hit = new THREE.Mesh(new THREE.ShapeGeometry(s).rotateX(-Math.PI / 2), M.road); hit.position.y = Gy + .3; hit.visible = false; hit.userData = { city: c.id }; grp.add(hit); pickables.push(hit); }
  // square
  const sq = new THREE.Mesh(flatShape(irregular(10, .95, 1.3, c.ox + 77), .03), M.road); sq.position.y = Gy; grp.add(sq); pave.push(sq);
  cityOcc.push([c.cx, c.cz, 1.35]);
  // streets: square → every building, square → every road that reaches town
  const center = V(0, 0, 0), entries = [];
  for (const p of roadPaths) for (const e of [p[0], p.at(-1)]) if (blobSd(c, e.x, e.z) < 1.4) entries.push(toLocal(e));
  const streets = [];
  c.slots.forEach(([x, z], k) => { if (k >= c.nBuild) return; const b = V(x, 0, z), d = b.length(); if (d < 1.1) return;
    streets.push({ pts: bend(center, b.clone().multiplyScalar((d - .7) / d), k + c.oy), w: .4 }); });
  entries.forEach((e, i) => streets.push({ pts: bend(center, e, i * 7 + c.ox), w: .56 }));
  streets.forEach((s, i) => { const m = ribbon(s.pts, s.w, M.road, Gy + .02 + i * .0015); grp.add(m); pave.push(m);
    for (const end of [s.pts[0], s.pts.at(-1)]) {
      const cap = new THREE.Mesh(new THREE.CircleGeometry(s.w / 2, 24).rotateX(-Math.PI / 2), M.road);
      cap.position.set(end.x, Gy + .025 + i * .0015, end.z); cap.receiveShadow = true; grp.add(cap); pave.push(cap);
    }
    const wp = s.pts.map(p => toWorld(p.x, Gy + .03, p.z)); streetPaths.push(wp); walkPaths.push(wp);
    if (c.lamps && i % 2 === 0) { const p = s.pts[5], q = s.pts[6], n = V(-(q.z - p.z), 0, q.x - p.x).normalize().multiplyScalar(s.w / 2 + .1);
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(.025, .03, .7, 5), M.ink); pole.position.set(p.x + n.x, Gy + .35, p.z + n.z); grp.add(pole);
      const lamp = new THREE.Mesh(new THREE.OctahedronGeometry(.08, 0), M.lamp); lamp.position.set(p.x + n.x, Gy + .76, p.z + n.z); grp.add(lamp); halo(grp, p.x + n.x, Gy + .76, p.z + n.z, .8); } });
  // town wall (Minas Tirith) or hedge (Bree) along the irregular outline, open where streets leave
  if (c.walls || c.hedge) {
    const N = 46, P = []; for (let i = 0; i <= N; i++) { const [x, z] = blobPt(c, i / N * Math.PI * 2, .98); P.push(V(x, 0, z)); }
    for (let i = 1; i <= N; i++) {
      const a = P[i - 1], b = P[i], m = a.clone().lerp(b, .5);
      if (entries.some(e => e.distanceTo(m) < .85)) continue;
      const len = a.distanceTo(b) * 1.04, ht = c.hedge ? .3 : .45;
      const seg = new THREE.Mesh(new THREE.BoxGeometry(len, ht, c.hedge ? .24 : .15), c.hedge ? M.olive : M.paper);
      seg.position.set(m.x, Gy + ht / 2, m.z); seg.rotation.y = -Math.atan2(b.z - a.z, b.x - a.x); grp.add(seg);
      if (!c.hedge && i % 2 === 0) { const cr = new THREE.Mesh(new THREE.BoxGeometry(.14, .1, .17), M.paper); cr.position.set(m.x, Gy + .5, m.z); cr.rotation.y = seg.rotation.y; grp.add(cr); }
      if (!c.hedge && i % 7 === 0) { const tw = new THREE.Mesh(new THREE.CylinderGeometry(.24, .28, .85, 8), M.paper); tw.position.set(a.x, Gy + .42, a.z); grp.add(tw);
        const cap = new THREE.Mesh(new THREE.ConeGeometry(.3, .42, 8), ROOF); cap.position.set(a.x, Gy + 1.06, a.z); grp.add(cap); }
    }
  }
  if (c.gate) {
    const e = entries.sort((a, b) => b.x - a.x)[0] || V(c.rx, 0, 0);
    const gate = new THREE.Group(); gate.position.set(e.x * .92, Gy, e.z * .92); gate.rotation.y = -Math.atan2(e.z, e.x) + Math.PI / 2; grp.add(gate);
    for (const xx of [-.45, .45]) { const p = new THREE.Mesh(new THREE.BoxGeometry(.08, .9, .08), M.coral); p.position.set(xx, .45, 0); gate.add(p); }
    const beam = new THREE.Mesh(new THREE.BoxGeometry(1.25, .08, .12), M.coral); beam.position.y = .92; gate.add(beam);
    const [wx, wz] = blobPt(c, Math.PI * .95, 1.15);
    const fall = new THREE.Mesh(new THREE.BoxGeometry(.5, 1.9, .05), M.water); fall.position.set(wx, Gy - .9, wz); fall.rotation.y = Math.PI / 2; grp.add(fall);
  }
  // centrepiece on an empty square
  if (c.centerpiece !== 'none' && !c.slots.some(([x, z], k) => k < c.nBuild && Math.hypot(x, z) < 1.1)) {
    const f = new THREE.Group(); f.position.set(0, Gy + .03, 0); grp.add(f);
    const a = (geo, mat, yy) => { const m = new THREE.Mesh(geo, mat); m.position.y = yy; f.add(m); return m; };
    if (c.centerpiece === 'fountain') {
      a(new THREE.CylinderGeometry(.62, .66, .18, 14), M.stone, .09); a(new THREE.CylinderGeometry(.54, .54, .05, 14), M.water, .18);
      a(new THREE.CylinderGeometry(.1, .14, .55, 8), M.paper, .42); a(new THREE.CylinderGeometry(.28, .24, .06, 12), M.paper, .72);
      const jet = a(new THREE.IcosahedronGeometry(.08, 0), M.water, .88);
      const ripple = onLines(new THREE.Mesh(new THREE.TorusGeometry(.3, .01, 6, 40), new THREE.MeshBasicMaterial({ color: css('--water-ink'), transparent: true })));
      ripple.rotation.x = Math.PI / 2; ripple.position.y = .22; f.add(ripple);
      anims.push(t => { jet.position.y = .88 + Math.abs(Math.sin(t * 3)) * .12; const p = (t * .6) % 1; ripple.scale.setScalar(.6 + p * .9); ripple.material.opacity = 1 - p; });
    } else if (c.centerpiece === 'statue') {
      a(new THREE.BoxGeometry(.5, .2, .5), M.stone, .1); a(new THREE.CylinderGeometry(.05, .1, 1.1, 4), M.paper, .75).rotation.y = Math.PI / 4;
      a(new THREE.TorusGeometry(.18, .03, 5, 12, Math.PI), M.slate, .45).rotation.z = Math.PI;
    } else {
      a(new THREE.CylinderGeometry(.55, .6, .08, 12), M.stone, .04); a(new THREE.CylinderGeometry(.48, .48, .04, 12), M.water, .08);
      for (let i = 0; i < 4; i++) { const l = a(new THREE.CylinderGeometry(.07, .07, .015, 7), M.olive, .11); l.position.x = Math.cos(i * 1.7) * .28; l.position.z = Math.sin(i * 1.7) * .28; }
    }
  }
  // buildings on loose plots
  for (let k = 0; k < c.cols * c.rows; k++) {
    const it = c.items[k]; if (!it || k >= c.nBuild) continue;
    const col = k % c.cols, row = Math.floor(k / c.cols), [x, z] = c.slots[k];
    it.code = COLS[col] + (row + 1);
    const { g, top } = makeBuilding(it, c, k * 131 + c.id.charCodeAt(0) * 7, k);
    const id = `${c.id}-${k}`, Y = Gy + .04;
    g.position.set(x, Y, z); grp.add(g);
    const plot = new THREE.Mesh(flatShape(irregular(7, .7, .92, k * 3 + c.oy), .04), hash(k, 61) < .5 ? M.paper : M.road); plot.position.set(x, Gy, z); plot.rotation.y = hash(k, 62) * 6; grp.add(plot);
    cityOcc.push([c.cx + x, c.cz + z, 1.0]);
    buildOrder.push({ g, delay: CITIES.indexOf(c) * .35 + k * .09 });
    g.traverse(o => { if (o.isMesh && o.layers.mask === 1) { o.userData.district = id; pickables.push(o); } });
    plot.userData.district = id; pickables.push(plot);
    const el = document.createElement('div');
    el.className = 'd-tag'; el.innerHTML = `<b>${it.code}</b>${it.name}`; el.dataset.id = id;
    const lab = new CSS2DObject(el); lab.position.set(x, Y + top + .3, z); lab.visible = false; grp.add(lab);
    districts[id] = { id, city: c.id, k, it, g, plot, lab, el, world: () => grp.localToWorld(V(x, Y + top + .7, z)) };
  }
  // links beyond the buildings: props in a loose ring just outside town, clear of the roads
  { const props = c.items.slice(c.nBuild), np = props.length, th0 = c.ph;
    props.forEach((it, i) => {
      const k = c.nBuild + i; let th = th0 + (i + .5) / Math.max(np, 1) * Math.PI * 2;
      for (let tr = 0; tr < 8 && entries.some(e => { const [px, pz] = blobPt(c, th, 1.18); return Math.hypot(e.x - px, e.z - pz) < 1.1; }); tr++) th += .28;
      const [x, z] = blobPt(c, th, 1.12 + hash(k, 71) * .14), wy = H(c.cx + x, c.cz + z);
      it.code = '+' + (i + 1);
      const { g, top } = makeProp(it, k * 97 + c.oy);
      const id = `${c.id}-${k}`; g.position.set(x, wy, z); g.rotation.y = hash(k, 72) * 6; grp.add(g);
      const plot = new THREE.Mesh(new THREE.CylinderGeometry(.55, .55, .02, 10), M.road); plot.visible = false; plot.position.set(x, wy + .02, z); grp.add(plot);
      cityOcc.push([c.cx + x, c.cz + z, .7]);
      buildOrder.push({ g, delay: CITIES.indexOf(c) * .35 + k * .09 });
      g.traverse(o => { if (o.isMesh && o.layers.mask === 1) { o.userData.district = id; pickables.push(o); } });
      plot.userData.district = id; pickables.push(plot);
      const el = document.createElement('div'); el.className = 'd-tag prop'; el.innerHTML = `<b>${it.code}</b>${it.name}`; el.dataset.id = id;
      const lab = new CSS2DObject(el); lab.position.set(x, wy + top + .25, z); lab.visible = false; grp.add(lab);
      districts[id] = { id, city: c.id, k, it, g, plot, lab, el, world: () => grp.localToWorld(V(x, wy + top + .6, z)) };
    }); }
  if (c.harbor) {
    const hb = new THREE.Group(); hb.rotation.y = -WORLD.harborAngle; grp.add(hb);
    const ex = blobPt(c, 0)[0];
    for (let p = 0; p < 3; p++) {
      const pz = -1.7 + p * 1.7, x0 = blobPt(c, Math.atan2(pz / c.rz, 1))[0] - .3;
      const deck = new THREE.Mesh(new THREE.BoxGeometry(2.4, .07, .36), M.kraft); deck.position.set(x0 + 1.2, WL + .28, pz); hb.add(deck);
      for (const px of [.6, 1.3, 2]) for (const s of [-.15, .15]) { const post = new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, .7, 5), M.kraftDeep); post.position.set(x0 + px, WL, pz + s); hb.add(post); }
    }
    const [lx, lz] = blobPt(c, -.75, .86);
    const lh = new THREE.Group(); lh.position.set(lx, Gy, lz); hb.add(lh);
    const a = (geo, mat, yy) => { const m = new THREE.Mesh(geo, mat); m.position.y = yy; lh.add(m); return m; };
    a(new THREE.CylinderGeometry(.2, .3, 1.6, 10), M.paper, .8); a(new THREE.CylinderGeometry(.205, .23, .18, 10), M.coral, 1.0); a(new THREE.CylinderGeometry(.215, .25, .14, 10), M.coral, .5);
    a(new THREE.CylinderGeometry(.26, .26, .05, 10), M.slate, 1.62); a(new THREE.CylinderGeometry(.15, .15, .25, 8), M.lamp, 1.77); halo(lh, 0, 1.77, 0, 1.6);
    a(new THREE.ConeGeometry(.2, .22, 8), M.slate, 2.0);
    const beam = onLines(new THREE.Mesh(new THREE.ConeGeometry(.35, 2.6, 16, 1, true), beamMat));
    beam.geometry.translate(0, -1.3, 0); beam.rotation.z = Math.PI / 2; const piv = new THREE.Group(); piv.position.y = 1.77; piv.add(beam); lh.add(piv);
    anims.push(t => { piv.rotation.y = t * .8; });
    { const ca = Math.cos(WORLD.harborAngle), sa = Math.sin(WORLD.harborAngle); cityOcc.push([c.cx + lx * ca - lz * sa, c.cz + lx * sa + lz * ca, .5]); } void ex;
  }
  const el = document.createElement('button');
  el.type = 'button'; el.className = 'c-tag'; el.dataset.city = c.id; el.style.setProperty('--d', `${520 + CITIES.indexOf(c) * 110}ms`);
  el.innerHTML = cityTagHTML(c);
  const lab = new CSS2DObject(el); lab.position.set(0, y + 3.9, 0); grp.add(lab);
  cityData[c.id] = { c, grp, pave, lab, el, W: c.rx * 2, H: c.rz * 2, center: V(c.cx, y, c.cz) };
}

// ---------------- props: trees, rocks and signs for links beyond the buildings ----------------
function makeProp(it, seed) {
  const g = new THREE.Group();
  const add = (geo, mat, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); g.add(m); return m; };
  const r = k => hash(seed, k);
  let top;
  switch (it.kind) {
    case 'oak': add(new THREE.CylinderGeometry(.05, .08, .5, 6), M.kraftDeep, 0, .25, 0); add(new THREE.IcosahedronGeometry(.42, 0), M.olive, 0, .78, 0).rotation.y = r(1) * 6; add(new THREE.IcosahedronGeometry(.3, 0), M.grass, .22, .62, .14); top = 1.2; break;
    case 'pine': add(new THREE.CylinderGeometry(.04, .06, .3, 5), M.kraftDeep, 0, .15, 0); for (let i = 0; i < 3; i++) add(new THREE.ConeGeometry(.42 - i * .1, .55, 6), i % 2 ? M.olive : M.pine, 0, .45 + i * .3, 0); top = 1.4; break;
    case 'birch': add(new THREE.CylinderGeometry(.03, .045, .4, 5), M.paper, 0, .2, 0); for (let i = 0; i < 4; i++) add(new THREE.ConeGeometry(.24 - i * .03, .45, 5), M.mustard, 0, .45 + i * .26, 0).rotation.y = i * .6; top = 1.5; break;
    case 'rock': { const m = add(new THREE.IcosahedronGeometry(.4, 0), M.stone, 0, .2, 0); m.scale.set(1.2, .7, 1); m.rotation.y = r(2) * 6; top = .55; break; }
    case 'boulders': for (let i = 0; i < 3; i++) { const m = add(new THREE.IcosahedronGeometry(.26 + r(i) * .14, 0), i ? M.stone : M.slate, (i - 1) * .3, .15, (r(i + 4) - .5) * .3); m.scale.y = .75; } top = .55; break;
    case 'signpost': add(new THREE.BoxGeometry(.06, .9, .06), M.kraftDeep, 0, .45, 0); add(new THREE.BoxGeometry(.5, .14, .03), M.kraft, .18, .78, 0); add(new THREE.BoxGeometry(.42, .12, .03), M.road, -.14, .58, .02).rotation.y = .5; top = 1; break;
    case 'flowerbed': add(new THREE.CylinderGeometry(.45, .48, .12, 9), M.stone, 0, .06, 0); add(new THREE.CylinderGeometry(.4, .4, .06, 9), M.olive, 0, .13, 0);
      for (let i = 0; i < 9; i++) { const a = i / 9 * 6.28 + r(3); add(new THREE.IcosahedronGeometry(.06, 0), [M.coral, M.mustard, M.paper][i % 3], Math.cos(a) * .25, .2, Math.sin(a) * .25); } top = .45; break;
    case 'statue': add(new THREE.BoxGeometry(.4, .3, .4), M.stone, 0, .15, 0); add(new THREE.ConeGeometry(.14, .5, 6), M.paper, 0, .55, 0); add(new THREE.IcosahedronGeometry(.09, 0), M.paper, 0, .88, 0); top = 1.05; break;
    case 'lamp': add(new THREE.CylinderGeometry(.025, .035, .9, 5), M.ink, 0, .45, 0); add(new THREE.OctahedronGeometry(.1, 0), M.lamp, 0, .95, 0); halo(g, 0, .95, 0, .9); top = 1.15; break;
    default: { const a = annex(it.kind === 'well' || it.kind === 'bench' || it.kind === 'stall' ? it.kind : 'tree', M.terra, M.paper, seed); a.scale.setScalar(1.7); g.add(a); top = .9; }
  }
  return { g, top };
}

// ---------------- suburbs: loose houses outside each city ----------------
for (const c of CITIES) {
  const S = c.style; let placed = 0;
  for (let tries = 0; tries < 60 && placed < c.suburbs; tries++) {
    const a = hash(tries, c.ox + 50) * Math.PI * 2, [bx, bz] = blobPt(c, a, 1.05 + hash(tries, c.oy + 60) * .45);
    const x = c.cx + bx, z = c.cz + bz, h = H(x, z);
    if (h < WL + .25 || h > 2.6) continue;
    if (blobSd(c, x, z) < .2 || fieldFlats.some(f => f.sd(x, z) < .4) || cityOcc.some(([ox, oz, or]) => Math.hypot(ox - x, oz - z) < or)) continue;
    if (roadPaths.some(p => distPath(p, x, z)[0] < .7) || RIVERS.some(r => distPath(r.path, x, z)[0] < r.w + .5)) continue;
    if (occupied.some(([ox, oz, or]) => Math.hypot(ox - x, oz - z) < or + .5)) continue;
    farmhouse(x, z, hash(tries, 7) * 6.28, M[pickS(S.roofs, tries * 3 + c.ox)], tries * 13 + c.oy); placed++;
  }
}

await step(5, L().steps[5]);
// ---------------- forests ----------------
function treeGeo(kind) {
  const parts = [];
  if (kind === 'pine') {
    for (let i = 0; i < 3; i++) { const g = new THREE.ConeGeometry(.36 - i * .09, .5, 6); g.translate(0, .32 + i * .26, 0); parts.push(g); }
  } else if (kind === 'poplar') {
    for (let i = 0; i < 4; i++) { const g = new THREE.ConeGeometry(.2 - i * .025, .42, 5); g.rotateY(i * .6); g.translate(0, .3 + i * .24, 0); parts.push(g); }
  } else if (kind === 'cedar') {
    const g = new THREE.ConeGeometry(.31, .85, 7, 2); g.translate(0, .62, 0); parts.push(g);
  } else if (kind === 'broadleaf') {
    for (const [x, y, z, radius] of [[0, .55, 0, .31], [-.19, .47, .02, .23], [.19, .49, -.04, .24]]) {
      const g = new THREE.IcosahedronGeometry(radius, 0); g.scale(1, .82, 1); g.translate(x, y, z); parts.push(g);
    }
  } else { const g = new THREE.IcosahedronGeometry(.3, 0); g.scale(1, 1.15, 1); g.translate(0, .45, 0); parts.push(g); }
  return mergeGeometries(parts.map(p => p.index ? p.toNonIndexed() : p));
}
const trunkGeo = new THREE.CylinderGeometry(.03, .045, .3, 5); trunkGeo.translate(0, .15, 0);
const treeKinds = { pine: [], cedar: [], poplar: [], round: [], broadleaf: [] };
const blocked = (x, z) => {
  if (fieldFlats.some(f => f.sd(x, z) < .5)) return true;
  if (cityOcc.some(([ox, oz, or]) => Math.hypot(ox - x, oz - z) < or)) return true;
  if (streetPaths.some(p => distPath(p, x, z, 1)[0] < .4)) return true;
  if (CITIES.some(c => c.walls && Math.abs(blobSd(c, x, z) + .1) < .35)) return true;
  if (roadPaths.some(p => distPath(p, x, z)[0] < .75)) return true;
  if (RIVERS.some(r => distPath(r.path, x, z)[0] < r.w + .45)) return true;
  if (occupied.some(([ox, oz, or]) => Math.hypot(ox - x, oz - z) < or)) return true;
  return false;
};
const [NX0, NX1, NZ0, NZ1] = WORLD.near;
for (let gx2 = NX0; gx2 < NX1; gx2 += .55) for (let gz2 = NZ0; gz2 < NZ1; gz2 += .55) {
  const x = gx2 + (hash(gx2 * 100 | 0, gz2 * 100 | 0) - .5) * .5, z = gz2 + (hash(gz2 * 100 | 0, gx2 * 100 | 0) - .5) * .5;
  const h = H(x, z);
  if (h < WL + .25 || h > 3) continue;
  const dens = WORLD.forestDens(x, z);
  const keep = dens > .56 ? .8 : .05;
  if (hash(Math.round(x * 37), Math.round(z * 53)) > keep) continue;
  if (inMountain(x, z) && h < 1) continue;
  if (blocked(x, z)) continue;
  const r = hash(Math.round(x * 71), Math.round(z * 13));
  const kind = WORLD.pineZone(x, z, h) ? (r < .55 ? 'pine' : r < .75 ? 'cedar' : r < .9 ? 'poplar' : 'round') : r < .25 ? 'pine' : r < .4 ? 'cedar' : r < .6 ? 'poplar' : r < .8 ? 'round' : 'broadleaf';
  treeKinds[kind].push({ x, y: h, z, s: .75 + hash(Math.round(x * 13), Math.round(z * 7)) * .6, rot: r * 6.28, tone: hash(Math.round(x * 5), Math.round(z * 91)) });
}
for (let gx2 = -75; gx2 < 70; gx2 += 1.25) for (let gz2 = -70; gz2 < 65; gz2 += 1.25) {
  if (gx2 > NX0 && gx2 < NX1 && gz2 > NZ0 && gz2 < NZ1) continue;
  const x = gx2 + (hash(gx2 * 10 | 0, gz2 * 10 | 0) - .5) * 1.1, z = gz2 + (hash(gz2 * 10 | 0, gx2 * 10 | 0) - .5) * 1.1, h = H(x, z);
  if (h < WL + .3 || h > 3.4) continue;
  if (fbm(x * .07 + 30, z * .07) < .5 || hash(Math.round(x * 17), Math.round(z * 29)) > .7) continue;
  const r = hash(Math.round(x * 71), Math.round(z * 13)), kind = h > 1.8 ? (r < .7 ? 'pine' : 'cedar') : r < .25 ? 'pine' : r < .4 ? 'cedar' : r < .6 ? 'poplar' : r < .8 ? 'round' : 'broadleaf';
  treeKinds[kind].push({ x, y: h, z, s: 1 + hash(Math.round(x * 13), Math.round(z * 7)) * .8, rot: r * 6.28, tone: hash(Math.round(x * 5), Math.round(z * 91)) });
}
const treeMeshes = [];
const dummy = new THREE.Object3D();
for (const [kind, list] of Object.entries(treeKinds)) {
  if (!list.length) continue;
  const crowns = new THREE.InstancedMesh(treeGeo(kind), white, list.length);
  const trunks = new THREE.InstancedMesh(trunkGeo, M.kraftDeep, list.length);
  list.forEach((t, i) => { dummy.position.set(t.x, t.y - .02, t.z); dummy.rotation.set(0, t.rot, 0); dummy.scale.setScalar(t.s); dummy.updateMatrix(); crowns.setMatrixAt(i, dummy.matrix); trunks.setMatrixAt(i, dummy.matrix); });
  crowns.castShadow = trunks.castShadow = true; crowns.receiveShadow = true;
  world.add(crowns, trunks); treeMeshes.push({ kind, list, crowns });
}
recolorers.push(() => {
  for (const { kind, list, crowns } of treeMeshes) list.forEach((t, i) => {
    const c = kind === 'pine' || kind === 'cedar' ? (t.tone < .55 ? C.pine : C.olive) : kind === 'poplar' ? (t.tone < .62 ? C.mustard : t.tone < .85 ? mixC(C.mustard, C.terra, .35) : C.olive) : kind === 'broadleaf' ? (t.tone < .4 ? C.mustard : t.tone < .7 ? C.olive : C.grass) : (t.tone < .5 ? C.olive : C.grass);
    crowns.setColorAt(i, c.clone().multiplyScalar(.94 + t.tone * .12));
  });
  for (const { crowns } of treeMeshes) if (crowns.instanceColor) crowns.instanceColor.needsUpdate = true;
});

await step(6, L().steps[6]);
// ---------------- travellers ----------------
function walkerMesh(i) {
  const g = new THREE.Group();
  const clothes = [M.coral, M.mustard, M.roofSlate, M.olive, M.terra, M.paper][i % 6];
  const body = new THREE.Mesh(new THREE.ConeGeometry(.075, .24, 5), clothes); body.position.y = .12; g.add(body);
  const head = new THREE.Mesh(new THREE.IcosahedronGeometry(.05, 0), M.road); head.position.y = .28; g.add(head);
  if (i % 4 === 0) { const hat = new THREE.Mesh(new THREE.ConeGeometry(.06, .1, 5), M.slate); hat.position.y = .35; g.add(hat); }
  return g;
}
const pathLen = p => { let s = 0; for (let i = 1; i < p.length; i++) s += p[i].distanceTo(p[i - 1]); return s; };
function along(p, d) {
  for (let i = 1; i < p.length; i++) { const L = p[i].distanceTo(p[i - 1]); if (d <= L) return [p[i - 1].clone().lerp(p[i], d / L), p[i].clone().sub(p[i - 1])]; d -= L; }
  return [p.at(-1).clone(), p.at(-1).clone().sub(p.at(-2))];
}
const walkers = [];
walkPaths.forEach((p, pi) => {
  const L = pathLen(p), n = Math.max(1, Math.round(L / 4.5));
  for (let k = 0; k < n; k++) { const m = walkerMesh(walkers.length); world.add(m); walkers.push({ m, p, L, d: hash(pi, k) * L, sp: (.25 + hash(k, pi) * .25) * (hash(pi + k, 3) < .5 ? 1 : -1) }); }
});
// wagons on the long roads
function wagonMesh() {
  const g = new THREE.Group();
  const bed = new THREE.Mesh(new THREE.BoxGeometry(.5, .12, .28), M.kraft); bed.position.y = .16; g.add(bed);
  const cover = new THREE.Mesh(new THREE.CylinderGeometry(.15, .15, .46, 8, 1, false, 0, Math.PI), M.paper); cover.rotation.set(0, 0, Math.PI / 2); cover.rotation.order = 'ZYX'; cover.rotation.y = Math.PI / 2; cover.position.y = .22; g.add(cover);
  for (const [x, z] of [[.17, .15], [-.17, .15], [.17, -.15], [-.17, -.15]]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(.08, .08, .03, 8), M.kraftDeep); w.rotation.x = Math.PI / 2; w.position.set(x, .08, z); g.add(w); }
  const pony = new THREE.Group(); pony.position.x = .45; g.add(pony);
  const pb = new THREE.Mesh(new THREE.BoxGeometry(.24, .12, .1), M.kraftDeep); pb.position.y = .2; pony.add(pb);
  const ph = new THREE.Mesh(new THREE.BoxGeometry(.08, .12, .07), M.kraftDeep); ph.position.set(.13, .29, 0); pony.add(ph);
  for (const [x, z] of [[.09, .04], [-.09, .04], [.09, -.04], [-.09, -.04]]) { const l = new THREE.Mesh(new THREE.BoxGeometry(.03, .14, .03), M.kraftDeep); l.position.set(x, .07, z); pony.add(l); }
  return g;
}
for (let i = 0; i < 6; i++) { const p = walkPaths[(i * 2) % (ROADS.length * 2)]; const m = wagonMesh(); world.add(m); walkers.push({ m, p, L: pathLen(p), d: hash(i, 77) * pathLen(p), sp: .35 * (i % 2 ? 1 : -1), wagon: true }); }
anims.push((t, dt) => walkers.forEach(w => {
  w.d += w.sp * dt; if (w.d > w.L) { w.d = w.L; w.sp *= -1; } if (w.d < 0) { w.d = 0; w.sp *= -1; }
  const [pos, dir] = along(w.p, w.d);
  w.m.position.set(pos.x, pos.y + (w.wagon ? 0 : Math.abs(Math.sin(t * 9 + w.L)) * .025), pos.z);
  w.m.rotation.y = Math.atan2(-dir.z * Math.sign(w.sp), dir.x * Math.sign(w.sp));
}));

// ---------------- boats, birds, clouds ----------------
function boat(path, speed, phase, sailMat) {
  const b = new THREE.Group(); world.add(b);
  const s = new THREE.Shape(); s.moveTo(-.42, .14); s.lineTo(.5, .16); s.lineTo(.28, -.06); s.lineTo(-.3, -.06); s.closePath();
  const hull = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: .26, bevelEnabled: false }), M.kraft); hull.position.z = -.13; b.add(hull);
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(.015, .015, .75, 5), M.kraftDeep); mast.position.set(.02, .5, 0); b.add(mast);
  const ss = new THREE.Shape(); ss.moveTo(0, 0); ss.lineTo(0, .62); ss.lineTo(-.34, 0); ss.closePath();
  const sail = new THREE.Mesh(new THREE.ShapeGeometry(ss), sailMat); sail.position.set(0, .2, 0); b.add(sail);
  const fl = new THREE.Mesh(new THREE.BoxGeometry(.12, .07, .01), M.coral); fl.position.set(.08, .85, 0); b.add(fl);
  b.add(poly([V(-.5, -.03, -.1), V(-.9, -.03, -.18), V(-1.3, -.03, -.1)], waveMat), poly([V(-.5, -.03, .1), V(-.9, -.03, .18), V(-1.3, -.03, .1)], waveMat));
  anims.push(t => {
    const u = t * speed + phase, p = path(u), q = path(u + .01 * Math.sign(speed || 1));
    b.position.set(p.x, WL + .04 + Math.sin(t * 2 + phase) * .02, p.z);
    b.rotation.y = Math.atan2(-(q.z - p.z), q.x - p.x); b.rotation.z = Math.sin(t * 1.7 + phase) * .05;
  });
}
const sailA = new THREE.MeshLambertMaterial({ side: THREE.DoubleSide }), sailB = new THREE.MeshLambertMaterial({ side: THREE.DoubleSide });
recolorers.push(() => { sailA.color.copy(C.paper); sailB.color.copy(C.mustard); });
for (const B of WORLD.boats) { const ca = Math.cos(B.ang), sa = Math.sin(B.ang);
  boat(u => { const lx = Math.cos(u) * B.a, lz = Math.sin(u) * B.b; return V(B.cx + lx * ca - lz * sa, 0, B.cz + lx * sa + lz * ca); }, B.sp, B.ph, B.sail ? sailB : sailA); }
// river raft on the Anduin
{
  const curve = new THREE.CatmullRomCurve3(RIVERS[0].path);
  const raft = new THREE.Group(); world.add(raft);
  const deck = new THREE.Mesh(new THREE.BoxGeometry(.5, .06, .3), M.kraft); raft.add(deck);
  const rider = walkerMesh(1); rider.position.y = .03; raft.add(rider);
  anims.push(t => { const u = .2 + ((t * .012) % .6), p = curve.getPointAt(u), q = curve.getPointAt(u + .005); raft.position.set(p.x, WL + .05, p.z); raft.rotation.y = Math.atan2(-(q.z - p.z), q.x - p.x); });
}
const birds = [];
for (let i = 0; i < 9; i++) {
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(9), 3));
  const l = onLines(new THREE.Line(geo, strokeHard)); world.add(l);
  const town = CITIES[i % CITIES.length];
  birds.push({ l, cx: town.cx + (hash(i, 1) - .5) * 4, cz: town.cz + (hash(i, 2) - .5) * 4, r: 2 + hash(i, 3) * 3, y: 5.5 + hash(i, 4) * 2.5, sp: .2 + hash(i, 5) * .2, ph: hash(i, 6) * 6 });
}
const moveBirds = t => birds.forEach(b => {
  const a = t * b.sp + b.ph, x = b.cx + Math.cos(a) * b.r, z = b.cz + Math.sin(a) * b.r, f = Math.sin(t * 8 + b.ph) * .1;
  const tx = -Math.sin(a), tz = Math.cos(a), nx = -tz * .24, nz = tx * .24, p = b.l.geometry.attributes.position;
  p.setXYZ(0, x + nx - tx * .08, b.y + f, z + nz - tz * .08); p.setXYZ(1, x, b.y, z); p.setXYZ(2, x - nx - tx * .08, b.y + f, z - nz - tz * .08); p.needsUpdate = true;
});
moveBirds(0); anims.push(moveBirds);
// Small schools near open water add life without placing animals on land or in roads.
const schools = [];
for (let attempt = 0; attempt < 160 && schools.length < 6; attempt++) {
  const x = NX0 + hash(attempt, 610) * (NX1 - NX0), z = NZ0 + hash(attempt, 611) * (NZ1 - NZ0);
  if (WORLD.sea(x, z) > -2.5 || H(x, z) > WL - .25 || schools.some(s => Math.hypot(s.x - x, s.z - z) < 4)) continue;
  const fish = [];
  for (let j = 0; j < 3; j++) {
    const fx = (j - 1) * .48, fz = (j % 2) * .28;
    fish.push(V(fx - .2, 0, fz), V(fx + .16, 0, fz + .1), V(fx + .16, 0, fz + .1), V(fx + .16, 0, fz - .1), V(fx + .16, 0, fz - .1), V(fx - .2, 0, fz), V(fx - .2, 0, fz), V(fx - .3, 0, fz + .1));
  }
  const school = lineSeg(fish, strokeHard); school.position.set(x, WL + .04, z); school.rotation.y = hash(attempt, 612) * Math.PI * 2;
  world.add(school); schools.push({ x, z });
  const base = school.rotation.y; anims.push(t => { school.rotation.y = base + Math.sin(t * .5 + attempt) * .12; });
}
const clouds = [];
for (let i = 0; i < 14; i++) {
  const cl = new THREE.Group();
  const n = 3 + Math.floor(rand() * 3);
  for (let j = 0; j < n; j++) { const p = new THREE.Mesh(new THREE.IcosahedronGeometry(.4 + rand() * .35, 0), M.snow); p.position.set(j * .6 - n * .3, rand() * .25, (rand() - .5) * .5); p.scale.y = .65; p.castShadow = true; cl.add(p); }
  cl.position.set((rand() - .5) * 90, 7 + rand() * 3, (rand() - .5) * 70); cl.userData.v = .25 + rand() * .3;
  world.add(cl); clouds.push(cl);
}
anims.push((t, dt) => clouds.forEach(c => { c.position.x += c.userData.v * dt; if (c.position.x > 50) c.position.x = -50; }));

// ---------------- place names ----------------
const placeLabels = [];
function place(text, zh, x, y, z, cls = '', raw = null) {
  const el = document.createElement('div'); el.className = 'place ' + cls; el.style.setProperty('--d', `${1100 + placeLabels.length * 90}ms`); el.innerHTML = `${text}<small>${zh}</small>`;
  const o = new CSS2DObject(el); o.position.set(x, y, z); o.userData.raw = raw ?? text; world.add(o); placeLabels.push(o);
}
const ANCHORS = WORLD.anchors;
const WATERY = new Set(['riverA', 'riverB', 'sea', 'bay', 'lake']);
for (const p of SITE.places || []) { const at = ANCHORS[p.at] || (Array.isArray(p.at) ? p.at : null); if (Array.isArray(at)) place(loc(p.name, 'en'), '', at[0], at[1], at[2], WATERY.has(p.at) ? 'water' : '', p.name); }

// selection pin
const pin = new THREE.Group(); pin.visible = false; scene.add(pin);
{ const hd = new THREE.Mesh(new THREE.SphereGeometry(.22, 10, 8), M.coral); hd.position.y = .55; pin.add(hd);
  const tip = new THREE.Mesh(new THREE.ConeGeometry(.17, .5, 10), M.coral); tip.rotation.x = Math.PI; tip.position.y = .25; pin.add(tip);
  const dot = new THREE.Mesh(new THREE.SphereGeometry(.08, 8, 6), M.paper); dot.position.set(0, .58, .17); pin.add(dot); }
const pinBase = { y: 0 };
anims.push(t => { pin.position.y = pinBase.y + Math.sin(t * 2.4) * .08; pin.rotation.y = t * .9; });

scene.traverse(o => { if (o.isMesh && o.layers.mask === 1 && o !== sea) { o.castShadow = true; o.receiveShadow = true; } });
terrain.castShadow = true;

// ---------------- camera + controls ----------------
let controls, tween = null, topDown = false;
const PAN = WORLD.pan;
if (renderer) {
  controls = new OrbitControls(camera, renderer.domElement);
  Object.assign(controls, { enableDamping: true, dampingFactor: .08, minDistance: 5, maxDistance: 110, maxPolarAngle: 1.3, minPolarAngle: .12,
    screenSpacePanning: false, rotateSpeed: .6, zoomSpeed: .9, autoRotateSpeed: .5 });
  controls.addEventListener('change', () => {
    // keep the view over the continent: shift the camera with the target so panning stops at the edge
    const t0 = controls.target, cx = THREE.MathUtils.clamp(t0.x, PAN.x0, PAN.x1), cz = THREE.MathUtils.clamp(t0.z, PAN.z0, PAN.z1);
    if (cx !== t0.x || cz !== t0.z) { camera.position.x += cx - t0.x; camera.position.z += cz - t0.z; t0.x = cx; t0.z = cz; }
  });
  controls.addEventListener('start', () => { tween = null; stopTour(); });
  // Shift + drag already pans in OrbitControls; hold Space for the same
  let space = false;
  const setPanMode = on => { space = on; controls.mouseButtons.LEFT = on ? THREE.MOUSE.PAN : THREE.MOUSE.ROTATE; mapEl.classList.toggle('panning', on); };
  addEventListener('keydown', e => { if (e.code === 'Space' && !e.target.closest?.('button, a, input, textarea')) { e.preventDefault(); if (!space) setPanMode(true); } if (e.key === 'Shift') mapEl.classList.add('panning'); });
  addEventListener('keyup', e => { if (e.code === 'Space') setPanMode(false); if (e.key === 'Shift') mapEl.classList.remove('panning'); });
  addEventListener('blur', () => { setPanMode(false); mapEl.classList.remove('panning'); });
}
function viewFor(id, az) {
  const d = id ? cityData[id] : null;
  const target = d ? d.center.clone() : V(WORLD.view.x, 0, WORLD.view.z);
  const dist = d ? Math.max(d.W, d.H) * 2.6 + 8 : WORLD.view.dist;
  const phi = topDown ? .14 : (d ? .95 : .9);
  const theta = az ?? (controls ? controls.getAzimuthalAngle() : WORLD.view.az);
  return { pos: target.clone().add(new THREE.Vector3().setFromSphericalCoords(dist, phi, theta)), target };
}
// camera flights orbit the moving target instead of cutting a straight line: distance blends
// on a log scale, the bearing turns the short way round, and long hops rise a little mid-way
const sph = (pos, target) => new THREE.Spherical().setFromVector3(pos.clone().sub(target));
function flyTo(v, dur) {
  if (!controls) return;
  if (reduce || dur === 0) { camera.position.copy(v.pos); controls.target.copy(v.target); controls.update(); return; }
  const t0 = controls.target.clone(), a = sph(camera.position, t0), b = sph(v.pos, v.target);
  let dth = b.theta - a.theta; dth = Math.atan2(Math.sin(dth), Math.cos(dth));
  const hop = t0.distanceTo(v.target), zoom = Math.abs(Math.log(b.radius / a.radius));
  dur = dur ?? THREE.MathUtils.clamp(850 + hop * 22 + zoom * 380 + Math.abs(dth) * 260, 900, 1800);
  const lift = hop > 10 ? Math.min(.45, hop / 60) : 0; // zoom out a bit on long hops, like a map app
  // Interrupted flights share one ceiling, so their temporary lifts cannot compound.
  const baseRadius = tween ? Math.max(tween.baseRadius, b.radius) : Math.max(a.radius, b.radius);
  const peakLift = Math.max(tween?.peakLift || 0, lift);
  const peakRadius = Math.max(a.radius, baseRadius * (1 + peakLift));
  tween = { t0, v, a, b, dth, lift, baseRadius, peakLift, peakRadius, start: performance.now(), dur };
}

// ---------------- state + panel ----------------
const state = { city: null, sel: null, hover: null, hoverCity: null };
const panel = document.getElementById('panel'), crumb = document.getElementById('crumb'), hint = document.getElementById('hint');
const info = document.getElementById('info'), fold = document.getElementById('fold'), eyebrow = document.getElementById('info-eyebrow');
const mobileBubble = document.getElementById('mobile-bubble');
const bubbleLayout = matchMedia('(max-width: 1024px), (max-width: 1366px) and (pointer: coarse)');
const esc = s => String(s).replace(/[&<>"]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));
function paint(id, on) {
  const d = districts[id]; if (!d) return;
  d.g.traverse(o => { if (!o.isMesh || o.layers.mask !== 1) return;
    if (on) { if (!o.userData.base) o.userData.base = o.material; o.material = M.hot; }
    else if (o.userData.base) { o.material = o.userData.base; delete o.userData.base; } });
  if (on) { d.plot.userData.base = d.plot.material; d.plot.material = M.hot; }
  else if (d.plot.userData.base) { d.plot.material = d.plot.userData.base; delete d.plot.userData.base; }
}
let painted = new Set();
function refresh() {
  const want = new Set([state.sel, state.hover].filter(Boolean));
  for (const id of painted) if (!want.has(id)) paint(id, false);
  for (const id of want) if (!painted.has(id)) paint(id, true);
  painted = want;
  // labels that appear fade in near the end of the flight instead of popping up at its start
  const showAt = tween ? tween.dur * .55 : 0;
  const reveal = (lab, on) => { if (on && !lab.visible) { lab.element.classList.add('fade'); clearTimeout(lab.userData.fadeT); lab.userData.fadeT = setTimeout(() => lab.element.classList.remove('fade'), showAt); } lab.visible = on; };
  for (const [id, d] of Object.entries(cityData)) {
    for (const m of d.pave) m.material = (!state.city && state.hoverCity === id) ? M.hot : M.road;
    d.el.classList.toggle('hot', state.hoverCity === id);
    reveal(d.lab, !state.city);
  }
  for (const d of Object.values(districts)) {
    reveal(d.lab, state.city === d.city);
    d.el.classList.toggle('sel', d.id === state.sel); d.el.classList.toggle('hot', d.id === state.hover);
  }
  mapEl.classList.toggle('in-city', !!state.city);
  if (state.sel) { const p = districts[state.sel].world(); pin.position.set(p.x, p.y, p.z); pinBase.y = p.y; pin.visible = true; } else pin.visible = false;
  mapEl.classList.toggle('pointing', !!(state.hover || state.hoverCity));
}
function renderPanel() {
  const c = state.city && cityData[state.city].c, t = L();
  cityBtn.setAttribute('aria-label', t.cities); cityBtn.title = t.cities; cityBtn.querySelector('.t').textContent = t.cities;
  cityMenu.innerHTML = CITIES.map(city => `<button type="button" role="menuitem" data-city-nav="${esc(city.id)}"${city.id === state.city ? ' aria-current="location"' : ''}>${esc(city.name)}</button>`).join('');
  crumb.innerHTML = c ? `<button type="button" data-go="world">${t.worldName}</button><span class="sep">/</span><span class="here">${c.en}</span>` : `<span class="here">${t.worldName} · ${withN(t.townCount, CITIES.length)}</span>`;
  hint.innerHTML = `${c ? t.hintC : t.hintW}${UI.shortcuts ? ' · ' + t.keysHint.replace('?', '<kbd>?</kbd>') : ''}`;
  const selected = state.sel && districts[state.sel]?.it;
  if (mobileBubble) {
    const title = selected ? selected.name : c?.name;
    const description = selected ? selected.desc : c?.blurb;
    mobileBubble.innerHTML = c ? `<div class="bubble-copy"><strong>${esc(title)}</strong>${description ? `<p>${esc(description)}</p>` : ''}</div>${selected ? `<a class="bubble-open" href="${esc(selected.url)}"${newTab(selected.url)} aria-label="${esc(t.open + ' ' + selected.name)}" title="${esc(t.open)}">${EXT_ICON}</a>` : ''}<button class="bubble-close" type="button" aria-label="${esc(t.hide)}" title="${esc(t.hide)}">×</button>` : '';
  }
  if (!c) {
    eyebrow.textContent = `${DOMAIN} · ${t.map}`;
    panel.innerHTML = `<h2>${t.title}<small>${withN(t.sub, CITIES.length)}</small></h2><p>${t.intro}</p>
      <ul class="list">${CITIES.slice().sort((a, b) => b.items.length - a.items.length).map(x => `<li><button type="button" data-city="${x.id}"><span class="emblem" style="--c: var(${TOK[x.style.roofs[0]] || '--terra'})" aria-hidden="true">${x.en[0]}</span><span class="nm"><i>${x.en}</i> ${x.name !== x.en ? x.name : ''}<em>${esc(x.blurb)}</em></span><span class="meta">${x.role} · ${x.items.length}</span></button></li>`).join('')}</ul>`;
    return;
  }
  eyebrow.textContent = `${DOMAIN} · ${c.role}`;
  panel.innerHTML = `<h2>${c.en}<small>${c.name !== c.en ? c.name + ' · ' : ''}${c.role} · ${withN(t.plots, c.items.length)}</small></h2><p>${esc(c.blurb)}</p>
    <ul class="list">${c.items.map((x, i) => `<li><button type="button" data-sel="${c.id}-${i}" aria-current="${state.sel === c.id + '-' + i}"><span class="swatch" style="--c: var(${TOK[x.roof] || '--kraft'})" aria-hidden="true"></span><span class="nm">${esc(x.name)}<em>${esc(x.desc)}</em></span><span class="grid-ref">${x.code}</span></button><a class="go" href="${esc(x.url)}"${newTab(x.url)} aria-label="${esc(t.open + ' ' + x.name)}">${t.open}${EXT_ICON}</a></li>`).join('')}</ul>`;
}
function applyLang() {
  const t = L();
  document.documentElement.lang = LANG === 'zh' ? 'zh-CN' : LANG;
  mapEl.classList.toggle('lang-en', false);
  for (const o of placeLabels) { const r = o.userData.raw, big = loc(r, 'en'), small = loc(r, LANG); o.element.innerHTML = `${big}<small>${small !== big ? small : ''}</small>`; }
  document.title = `${DOMAIN} · ${L().titleSuffix}`;
  for (const [id, k] of [['b-home', 'map'], ['b-tour', 'tour'], ['b-spin', 'spin'], ['b-top', 'top']]) { const b = document.getElementById(id), lbl = b.querySelector('.t'); if (lbl) lbl.textContent = t[k]; else b.textContent = t[k]; b.setAttribute('aria-label', t[k]); if (id !== 'b-home') b.title = t[k]; }
  document.getElementById('b-home').title = t.homeTip;
  { const lb = document.getElementById('b-lang');
    if (LANGS.length < 2) lb.hidden = true;
    else if (LANGS.length === 2) { const next = LANGS[(LANGS.indexOf(LANG) + 1) % 2]; (lb.querySelector('.t') || lb).textContent = next === 'en' ? 'EN' : langLabel(next); lb.lang = next; lb.removeAttribute('aria-haspopup'); }
    else { (lb.querySelector('.t') || lb).textContent = (T[LANG]?.langShort || LANG.toUpperCase()) + ' ▾'; lb.lang = LANG; lb.setAttribute('aria-haspopup', 'menu'); lb.setAttribute('aria-label', langLabel(LANG));
      langMenu.innerHTML = LANGS.map(l => `<button type="button" role="menuitemradio" aria-checked="${l === LANG}" lang="${l}" data-lang="${l}">${langLabel(l)}</button>`).join(''); } }
  renderLinks();
  fold.textContent = info.classList.contains('folded') ? t.show : t.hide;
  info.setAttribute('aria-label', t.info); crumb.setAttribute('aria-label', t.where); document.querySelector('.tools').setAttribute('aria-label', t.view);
  for (const d of Object.values(cityData)) d.el.innerHTML = cityTagHTML(d.c);
  for (const d of Object.values(districts)) d.el.innerHTML = `<b>${d.it.code}</b>${esc(d.it.name)}`;
  updateClock();
  renderPanel();
  document.getElementById('keys-title').textContent = t.keysT;
  document.getElementById('keys-close').textContent = t.keysClose;
  document.getElementById('keys-list').innerHTML = t.keys.map(([k, d]) => `<dt>${k.split(' ').map(x => x === '/' ? '<span class="or">/</span>' : `<kbd>${x}</kbd>`).join('')}</dt><dd>${d}</dd>`).join('');
  document.getElementById('b-keys').setAttribute('aria-label', t.keysT);
}
function go(city, sel = null, fly = true) {
  const changed = city !== state.city;
  state.city = city; state.sel = sel; state.hoverCity = null; info.classList.remove('bubble-closed');
  if (changed && fly) flyTo(viewFor(city));
  try { history.replaceState(null, '', city ? '#' + city : location.pathname + location.search); } catch { /* file:// pages refuse replaceState */ }
  refresh(); renderPanel();
  if (sel && info.classList.contains('folded') && !bubbleLayout.matches) setFold(false);
}

// ---------------- tour ----------------
const tourBtn = document.getElementById('b-tour');
let tourTimer = null;
const TOUR = [...CITIES.map(c => c.id), null];
function stopTour() { if (tourTimer) { clearTimeout(tourTimer); tourTimer = null; tourBtn.setAttribute('aria-pressed', 'false'); } }
function tourStep(i) {
  const id = TOUR[i % TOUR.length];
  flyTo(viewFor(id), 2400); go(id, null, false);
  tourTimer = setTimeout(() => tourStep(i + 1), id ? 5200 : 4200);
}
tourBtn.addEventListener('click', () => { if (tourTimer) return stopTour(); tourBtn.setAttribute('aria-pressed', 'true'); tourStep(0); });

// ---------------- picking ----------------
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
function pick(e) {
  const r = renderer.domElement.getBoundingClientRect();
  ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  const hit = ray.intersectObjects(pickables, false)[0];
  if (!hit) return {};
  const o = hit.object;
  if (o.userData.district) return { district: o.userData.district, city: districts[o.userData.district].city };
  return { city: o.userData.city };
}
// Labels remain HTML for sharp, accessible text, but pointer events pass through
// to OrbitControls. Resolve a click or hover against the visible label rectangles.
function labelAt(x, y) {
  const entries = state.city ? Object.values(districts).filter(d => d.city === state.city) : Object.values(cityData);
  let result = null, top = -Infinity;
  for (const d of entries) {
    const el = d.el;
    if (!d.lab.visible || el.classList.contains('fade') || el.style.display === 'none' || el.style.opacity === '0') continue;
    const r = el.getBoundingClientRect(), z = Number(el.style.zIndex) || 0;
    if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom && z >= top) {
      top = z;
      result = state.city ? { city: d.city, district: d.id } : { city: d.c.id };
    }
  }
  return result;
}
if (renderer) {
  const cv = renderer.domElement; let down = null;
  cv.addEventListener('pointerdown', e => {
    if (!e.isPrimary || (e.pointerType === 'mouse' && e.button !== 0)) { down = null; return; }
    down = { id: e.pointerId, x: e.clientX, y: e.clientY, label: labelAt(e.clientX, e.clientY), moved: false };
  });
  cv.addEventListener('pointermove', e => {
    if (down && e.pointerId === down.id && Math.hypot(e.clientX - down.x, e.clientY - down.y) > 5) down.moved = true;
    if (e.buttons) return;
    const h = labelAt(e.clientX, e.clientY) || pick(e);
    const hover = state.city && h.city === state.city ? h.district || null : null;
    const hc = h.city && h.city !== state.city ? h.city : null;
    if (hover !== state.hover || hc !== state.hoverCity) { state.hover = hover; state.hoverCity = hc; refresh(); }
  });
  cv.addEventListener('pointerleave', () => { state.hover = state.hoverCity = null; refresh(); });
  cv.addEventListener('pointercancel', () => { down = null; });
  cv.addEventListener('pointerup', e => {
    if (!down || down.id !== e.pointerId) return;
    const start = down; down = null;
    if (start.moved || Math.hypot(e.clientX - start.x, e.clientY - start.y) > 5) return;
    const h = start.label || pick(e); if (!h.city) return;
    stopTour();
    if (h.city !== state.city) go(h.city); else if (h.district) go(state.city, h.district);
  });
}
document.addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.go === 'world') { stopTour(); go(null); }
  else if (b.classList.contains('c-tag') || (b.dataset.city && b.closest('#panel'))) { stopTour(); go(b.dataset.city); }
  else if (b.dataset.sel) { stopTour(); go(state.city, b.dataset.sel); }
});
document.getElementById('labels').addEventListener('click', e => { const t = e.target.closest('.d-tag'); if (t) { stopTour(); go(state.city, t.dataset.id); } });
// one "home" action: back to the overview at the default angle, tilt and zoom, with orbit,
// top view and tour switched off. Esc still steps back one level and keeps your angle.
function resetView() {
  stopTour();
  if (controls?.autoRotate) { controls.autoRotate = false; spinBtn.setAttribute('aria-pressed', 'false'); }
  if (topDown) { topDown = false; topBtn.setAttribute('aria-pressed', 'false'); }
  flyTo(viewFor(null, WORLD.view.az)); go(null, null, false);
}
document.getElementById('b-home').addEventListener('click', resetView);
const spinBtn = document.getElementById('b-spin');
spinBtn.addEventListener('click', () => { if (!controls) return; controls.autoRotate = !controls.autoRotate; spinBtn.setAttribute('aria-pressed', controls.autoRotate); });
const topBtn = document.getElementById('b-top');
topBtn.addEventListener('click', () => { topDown = !topDown; topBtn.setAttribute('aria-pressed', topDown); flyTo(viewFor(state.city), 900); });
// fold/unfold the info card with a height animation; the map eases its offset in frame()
let foldAnim = null;
function setFold(f) {
  const set = () => { info.classList.toggle('folded', f); fold.setAttribute('aria-expanded', !f); fold.textContent = f ? L().show : L().hide; };
  if (reduce || !UI.motion || info.classList.contains('folded') === f) { set(); updateSide(); return; }
  if (foldAnim) foldAnim();
  const h0 = info.getBoundingClientRect().height;
  info.classList.toggle('folded', f); const h1 = info.getBoundingClientRect().height; info.classList.toggle('folded', !f);
  if (!f) set(); // unfolding: show the content now and let the box grow over it
  info.classList.add('folding'); info.style.height = h0 + 'px';
  info.getBoundingClientRect();
  info.style.height = h1 + 'px';
  let done = false;
  const end = () => { if (done) return; done = true; info.classList.remove('folding'); info.style.height = ''; if (f) set(); foldAnim = null; updateSide(); };
  foldAnim = end; info.addEventListener('transitionend', e => { if (e.propertyName === 'height') end(); }, { once: true }); setTimeout(end, 520);
  updateSide(f);
}
fold.addEventListener('click', () => setFold(!info.classList.contains('folded')));
mobileBubble?.addEventListener('click', e => { if (e.target.closest('.bubble-close')) info.classList.add('bubble-closed'); });
const keysEl = document.getElementById('keys');
const toggleKeys = (open = keysEl.hidden) => { keysEl.hidden = !open; document.getElementById('b-keys').setAttribute('aria-expanded', open); };
document.getElementById('b-keys').addEventListener('click', () => toggleKeys());
const LIST_ORDER = () => CITIES.slice().sort((a, b) => b.items.length - a.items.length).map(c => c.id);
function zoom(f) {
  if (!controls) return; tween = null;
  const off = camera.position.clone().sub(controls.target), d = THREE.MathUtils.clamp(off.length() * f, controls.minDistance, controls.maxDistance);
  flyTo({ pos: controls.target.clone().add(off.setLength(d)), target: controls.target.clone() }, 350);
}
function stepCity(dir) {
  const ids = LIST_ORDER(), i = ids.indexOf(state.city || state.hoverCity);
  if (!ids.length) return;
  go(ids[i < 0 ? (dir > 0 ? 0 : ids.length - 1) : (i + dir + ids.length) % ids.length]);
}
function stepBuilding(dir) {
  if (!state.city) return;
  const ids = Object.values(districts).filter(d => d.city === state.city).map(d => d.id), i = ids.indexOf(state.sel);
  if (ids.length) go(state.city, ids[i < 0 ? (dir > 0 ? 0 : ids.length - 1) : (i + dir + ids.length) % ids.length]);
}
document.addEventListener('keydown', e => {
  if (e.metaKey || e.ctrlKey || e.altKey || e.target.closest?.('input, textarea, select, [contenteditable]')) return;
  const k = e.key;
  if (k === 'Escape' && (!cityMenu.hidden || !langMenu.hidden)) { const focus = cityMenu.hidden ? document.getElementById('b-lang') : cityBtn; cityMenu.hidden = langMenu.hidden = true; cityBtn.setAttribute('aria-expanded', 'false'); document.getElementById('b-lang').setAttribute('aria-expanded', 'false'); focus.focus(); return; }
  if (k === 'Escape') { if (!keysEl.hidden) return toggleKeys(false); stopTour(); if (state.sel) go(state.city, null); else go(null); return; }
  if (!UI.shortcuts) return; // Esc stays; everything below is the optional shortcut set
  if (!keysEl.hidden && k.startsWith('Arrow')) return; // let the help panel scroll
  if (k === '?' || (k === '/' && e.shiftKey)) { e.preventDefault(); return toggleKeys(); }
  const btnFocused = e.target.closest?.('button, a');
  if (k === 'Enter' && btnFocused) return;
  const act = {
    '0': () => resetView(), h: () => act['0'](), H: () => act['0'](), Home: () => act['0'](),
    ArrowRight: () => { if (state.city) { stopTour(); stepBuilding(1); } }, ArrowLeft: () => { if (state.city) { stopTour(); stepBuilding(-1); } },
    ArrowDown: () => { stopTour(); stepCity(1); }, ArrowUp: () => { stopTour(); stepCity(-1); },
    Enter: () => { const d = state.sel && districts[state.sel]; if (!d) return; if (isLocal(d.it.url)) location.assign(d.it.url); else window.open(d.it.url, '_blank', 'noopener'); },
    '+': () => zoom(.78), '=': () => zoom(.78), '-': () => zoom(1.28), '_': () => zoom(1.28),
    t: () => { if (UI.tour) tourBtn.click(); }, o: () => { if (UI.views) spinBtn.click(); }, v: () => { if (UI.views) topBtn.click(); }, l: () => { if (UI.languageSwitch && LANGS.length > 1) setLang(LANGS[(LANGS.indexOf(LANG) + 1) % LANGS.length]); }, i: () => fold.click(),
  };
  const initial = CITIES.find(c => c.key && c.key === k.toLowerCase?.())?.id;
  if (initial) { e.preventDefault(); stopTour(); go(initial); return; }
  const n = parseInt(k, 10);
  if (n >= 1 && n <= Math.min(9, CITIES.length)) { e.preventDefault(); stopTour(); go(LIST_ORDER()[n - 1]); return; }
  const f = act[k] || act[k.toLowerCase?.()];
  if (f) { e.preventDefault(); f(); }
});
addEventListener('hashchange', () => { const h = location.hash.slice(1); if (cityData[h] && h !== state.city) go(h); });

// ---------------- city navigation ----------------
function positionCityMenu() {
  const toolbar = document.querySelector('.tools').getBoundingClientRect();
  cityMenu.style.setProperty('--city-menu-x', `${Math.max(0, Math.min(cityBtn.offsetLeft, innerWidth - toolbar.left - 168))}px`);
}
function updateCityMenuLayout() {
  if (cityMenu.hidden) return;
  if (!bubbleLayout.matches || getComputedStyle(cityBtn).display === 'none') { cityMenu.hidden = true; cityBtn.setAttribute('aria-expanded', 'false'); }
  else positionCityMenu();
}
addEventListener('resize', updateCityMenuLayout);
bubbleLayout.addEventListener('change', updateCityMenuLayout);
cityBtn.addEventListener('click', e => {
  e.stopPropagation(); langMenu.hidden = true; document.getElementById('b-lang').setAttribute('aria-expanded', 'false');
  cityMenu.hidden = !cityMenu.hidden; cityBtn.setAttribute('aria-expanded', String(!cityMenu.hidden));
  if (!cityMenu.hidden) positionCityMenu();
});
cityMenu.addEventListener('click', e => {
  const b = e.target.closest('[data-city-nav]'); if (!b) return;
  e.stopPropagation(); cityMenu.hidden = true; cityBtn.setAttribute('aria-expanded', 'false'); stopTour(); go(b.dataset.cityNav);
});
// ---------------- language control ----------------
const setLang = l => { if (!l || l === LANG) return; LANG = l; store.set(STORE_KEY, LANG); setLangData(); applyLang(); };
document.getElementById('b-lang').addEventListener('click', e => {
  if (LANGS.length > 2) { e.stopPropagation(); cityMenu.hidden = true; cityBtn.setAttribute('aria-expanded', 'false'); langMenu.hidden = !langMenu.hidden; document.getElementById('b-lang').setAttribute('aria-expanded', !langMenu.hidden);
    // open upward when the toolbar sits low (phones put it near the bottom edge)
    if (!langMenu.hidden) { langMenu.classList.remove('up'); const r = langMenu.getBoundingClientRect(), t = document.querySelector('.tools').getBoundingClientRect();
      if (r.bottom > innerHeight - 8 && t.top > r.height + 16) langMenu.classList.add('up'); }
    return; }
  setLang(LANGS[(LANGS.indexOf(LANG) + 1) % LANGS.length]);
});
langMenu.addEventListener('click', e => { const b = e.target.closest('[data-lang]'); if (!b) return; e.stopPropagation(); langMenu.hidden = true; document.getElementById('b-lang').setAttribute('aria-expanded', 'false'); setLang(b.dataset.lang); });
document.addEventListener('click', () => { langMenu.hidden = cityMenu.hidden = true; cityBtn.setAttribute('aria-expanded', 'false'); document.getElementById('b-lang').setAttribute('aria-expanded', 'false'); });

// ---------------- daylight: local time drives sky, sun and lamps ----------------
const DL = window.SiteMapDaylight, { DAY, PHASE_AT } = DL;
const fixedHour = (() => { const q = new URLSearchParams(location.search).get('t'); const v = q === null ? NaN : parseFloat(q); return Number.isFinite(v) ? ((v % 24) + 24) % 24 : typeof UI.daylight === 'number' ? ((UI.daylight % 24) + 24) % 24 : DL.fixedHour(); })();
const nowHour = () => { if (fixedHour !== null) return fixedHour; const d = new Date(); return d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600; };
const stars = (() => { const pts = []; for (let i = 0; i < 700; i++) { const a = hash(i, 1) * Math.PI * 2, e = .08 + hash(i, 2) * 1.2, r = 190; pts.push(V(Math.cos(a) * Math.cos(e) * r, Math.sin(e) * r, Math.sin(a) * Math.cos(e) * r)); }
  const m = new THREE.PointsMaterial({ color: 0xfff6dd, size: 1.4, sizeAttenuation: false, transparent: true, opacity: 0, depthWrite: false, fog: false });
  const o = onLines(new THREE.Points(new THREE.BufferGeometry().setFromPoints(pts), m)); scene.add(o); return o; })();
let lampK = 0;
function applyDaylight(h) {
  let i = 0; while (i < DAY.length - 2 && h >= DAY[i + 1][0]) i++;
  const A = DAY[i], B = DAY[i + 1], k = sstep(0, 1, (h - A[0]) / (B[0] - A[0]));
  const col = j => new THREE.Color(A[j]).lerp(new THREE.Color(B[j]), k), num = j => lerp(A[j], B[j], k);
  const sky = col(1);
  DL.paint(h); // interface colours, --sky and --sun
  scene.background = sky; fog.color.copy(sky);
  sun.color.copy(col(2)); sun.intensity = num(3);
  hemi.color.copy(col(5)); hemi.groundColor.copy(col(6)); hemi.intensity = num(7);
  // sun travels east (+x) → south → west; at night the moon hangs high in the south-west
  const day = h > 5.5 && h < 18.8, el = THREE.MathUtils.degToRad(num(4));
  const az = day ? Math.PI * (h - 6) / 12 : Math.PI * .75;
  const dist = 40; sun.position.set(Math.cos(az) * Math.cos(el) * dist, Math.sin(el) * dist + 2, Math.sin(az) * Math.cos(el) * dist * .6 + 10);
  lampK = num(8);
  const warm = new THREE.Color('#ffb84d');
  M.glassN.color.copy(C.kraftDeep.clone().lerp(C.mustard, lampK));
  for (const m of [M.glass, M.glassN, M.lamp]) { m.emissive.copy(warm); m.emissiveIntensity = lampK * (m === M.lamp ? 1.3 : .9); }
  haloMat.opacity = lampK; for (const s2 of halos) s2.visible = lampK > .03;
  beamMat.opacity = .1 + .22 * lampK; beamMat.color.copy(new THREE.Color(css('--mustard')).lerp(new THREE.Color('#ffd27a'), lampK));
  stars.material.opacity = sstep(.6, 1, lampK) * .9;
  post.uniforms.edgeK.value = num(9);
  post.uniforms.ink.value.copy(C.ink.clone().lerp(new THREE.Color('#0d1220'), 1 - sstep(.55, .82, num(9))));
  updateClock();
}
const clockEl = document.getElementById('clock');
function updateClock() {
  if (!clockEl || !C.ink) return;
  const h = nowHour(); let i = 0; while (i < PHASE_AT.length - 2 && h >= PHASE_AT[i + 1]) i++;
  const hh = Math.floor(h), mm = Math.floor((h - hh) * 60);
  clockEl.textContent = `${L().phases[i]} · ${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}
applyTheme();
applyDaylight(nowHour());
setInterval(() => applyDaylight(nowHour()), 20000);

// ---------------- size + loop ----------------
// the map shifts left while the info card is open on wide screens; the shift eases in frame()
let sideTarget = 0, sideNow = 0;
function updateSide(folded = info.classList.contains('folded')) { sideTarget = !bubbleLayout.matches && !folded ? (info.offsetWidth + 14) / 2 : 0; }
function applySide() {
  const w = mapEl.clientWidth, h = mapEl.clientHeight;
  if (Math.abs(sideNow) > .5) camera.setViewOffset(w, h, sideNow, 0, w, h); else camera.clearViewOffset();
  camera.updateProjectionMatrix();
}
function resize() {
  if (!renderer) return;
  const w = mapEl.clientWidth, h = mapEl.clientHeight;
  renderer.setSize(w, h, false); labelRenderer.setSize(w, h);
  camera.aspect = w / h;
  updateSide(); sideNow = sideTarget; applySide();
  const pr = renderer.getPixelRatio(), W = Math.floor(w * pr), H2 = Math.floor(h * pr);
  colorRT?.dispose(); normalRT?.dispose();
  colorRT = new THREE.WebGLRenderTarget(W, H2, { samples: 4, type: THREE.HalfFloatType });
  normalRT = new THREE.WebGLRenderTarget(W, H2, { depthTexture: new THREE.DepthTexture(W, H2) });
  post.uniforms.tColor.value = colorRT.texture; post.uniforms.tNormal.value = normalRT.texture; post.uniforms.tDepth.value = normalRT.depthTexture;
  post.uniforms.res.value.set(W, H2); post.uniforms.thick.value = Math.max(1, pr * .65); post.uniforms.blurMax.value = UI.blur ? 7 * pr : 0;
}
if (bubbleLayout.matches || !UI.infoOpen) { info.classList.add('folded'); fold.setAttribute('aria-expanded', 'false'); fold.textContent = L().show; }
new ResizeObserver(resize).observe(mapEl);
resize();

let dcl = 0;
function declutter() {
  if (!state.city || ++dcl % 6) return;
  const tags = Object.values(districts).filter(d => d.city === state.city).map(d => ({ d, r: d.el.getBoundingClientRect(), z: camera.position.distanceTo(d.world()) }));
  tags.sort((a, b) => (b.d.id === state.sel) - (a.d.id === state.sel) || (b.d.id === state.hover) - (a.d.id === state.hover) || a.z - b.z);
  const kept = [];
  for (const t of tags) {
    let { r } = t; const hit = kept.some(k => !(r.right < k.left || r.left > k.right || r.bottom < k.top || r.top > k.bottom));
    t.d.el.style.opacity = hit ? '0' : ''; t.d.el.style.pointerEvents = hit ? 'none' : '';
    if (!hit) kept.push(r);
  }
}
const needle = document.getElementById('needle');
const clock = new THREE.Clock(); let t = 0;
const normalBg = new THREE.Color(.5, .5, 1);
function frame() {
  const dt = Math.min(clock.getDelta(), .05);
  if (!reduce && UI.motion) { t += dt; for (const a of anims) a(t, dt); }
  if (tween) {
    const p = Math.min(1, (performance.now() - tween.start) / tween.dur), e = p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
    const { a, b } = tween, et = 1 - Math.pow(1 - p, 3); // target leads slightly so the view settles on it
    controls.target.lerpVectors(tween.t0, tween.v.target, Math.min(1, et * .35 + e * .65));
    const r = Math.min(tween.peakRadius, Math.exp(lerp(Math.log(a.radius), Math.log(b.radius), e)) * (1 + tween.lift * Math.sin(Math.PI * p)));
    const phi = lerp(a.phi, b.phi, e) - tween.lift * .25 * Math.sin(Math.PI * p);
    camera.position.copy(controls.target).add(new THREE.Vector3().setFromSphericalCoords(r, Math.max(.05, phi), a.theta + tween.dth * e));
    if (p >= 1) { camera.position.copy(tween.v.pos); controls.target.copy(tween.v.target); }
    if (p >= 1) tween = null;
  }
  controls.update();
  if (Math.abs(sideTarget - sideNow) > .3) { sideNow += (sideTarget - sideNow) * Math.min(1, dt * 7); if (Math.abs(sideTarget - sideNow) <= .3) sideNow = sideTarget; applySide(); }
  post.uniforms.focus.value = camera.position.distanceTo(controls.target);
  // haze scales with the view so a bigger world (more towns, wider overview) is not washed out
  { const d = post.uniforms.focus.value; fog.near = Math.max(70, d * 1.15); fog.far = Math.max(FOG_FAR, d * 3.2); post.uniforms.fogFar.value = fog.far; }
  { const far = camera.position.distanceTo(controls.target) > 36; for (const c of clouds) c.visible = far; }
  needle.setAttribute('transform', `rotate(${(controls.getAzimuthalAngle() * 180 / Math.PI).toFixed(1)})`);
  camera.layers.enableAll();
  renderer.shadowMap.needsUpdate = true;
  renderer.setRenderTarget(colorRT); renderer.render(scene, camera);
  camera.layers.set(0);
  const bg = scene.background; scene.background = normalBg; scene.fog = null; scene.overrideMaterial = normalMat;
  renderer.setRenderTarget(normalRT); renderer.render(scene, camera);
  scene.overrideMaterial = null; scene.background = bg; scene.fog = fog; camera.layers.enableAll();
  renderer.setRenderTarget(null); renderer.render(postScene, postCam);
  labelRenderer.render(scene, camera);
  declutter();
  requestAnimationFrame(frame);
}

await new Promise(r => setTimeout(r, Math.max(0, 1400 - (performance.now() - loadStart))));
const start = location.hash.slice(1);
state.city = cityData[start] ? start : null;
refresh(); applyLang();
if (renderer) {
  const v = viewFor(state.city, WORLD.view.az);
  camera.position.copy(v.target.clone().add(new THREE.Vector3().setFromSphericalCoords(reduce || !UI.intro ? v.pos.distanceTo(v.target) : 140, reduce || !UI.intro ? .9 : .35, WORLD.view.az)));
  controls.target.copy(v.target); controls.update();
  flyTo(viewFor(state.city, WORLD.view.az), 2600);
  // interface enters in layers once the town is built; panel content only animates this once
  function reveal() { mapEl.classList.remove('intro'); mapEl.classList.add('revealing'); setTimeout(() => mapEl.classList.remove('revealing'), 2800); }
  // pop-up-book intro: land unfolds, then buildings rise city by city
  if (!reduce && UI.intro) {
    world.scale.y = .01; buildOrder.forEach(b => b.g.scale.set(1, .001, 1));
    const t0 = performance.now();
    const back = x => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
    const intro = () => {
      const e = (performance.now() - t0) / 1000;
      world.scale.y = .01 + .99 * back(Math.min(1, e / 1.1));
      let done = e > 1.1;
      for (const b of buildOrder) { const k = Math.min(1, Math.max(0, (e - .9 - b.delay) / .55)); b.g.scale.set(1, Math.max(.001, back(k)), 1); if (k < 1) done = false; }
      if (!done) requestAnimationFrame(intro); else reveal();
    };
    requestAnimationFrame(intro);
  } else reveal();
  frame();
}
document.getElementById('loader').classList.add('done');
}
