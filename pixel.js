// 像素美術：程式畫的點陣圖。PX.canvas(種類, 名字, 倍率, 生氣)；PX.hero(造型, 倍率)
export const PX = (() => {

const mk = (w, h) => ({ w, h, d: new Array(w * h).fill(null) });
const put = (s, x, y, c) => { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < s.w && y < s.h) s.d[y * s.w + x] = c; };
const get = (s, x, y) => (x >= 0 && y >= 0 && x < s.w && y < s.h) ? s.d[y * s.w + x] : null;
function rect(s, x, y, w, h, c) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) put(s, x + i, y + j, c); }
function line(s, x0, y0, x1, y1, c) {
  x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let e = dx + dy;
  for (;;) { put(s, x0, y0, c); if (x0 === x1 && y0 === y1) break; const e2 = 2 * e; if (e2 >= dy) { e += dy; x0 += sx; } if (e2 <= dx) { e += dx; y0 += sy; } }
}
const tline = (s, x0, y0, x1, y1, c1, c2) => { line(s, x0 + 1, y0, x1 + 1, y1, c2); line(s, x0, y0, x1, y1, c1); };
function disc(s, cx, cy, r, c) { for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r + r * 0.6) put(s, cx + x, cy + y, c); }
function ell(s, cx, cy, rx, ry, c) { for (let y = -ry; y <= ry; y++) for (let x = -rx; x <= rx; x++) if ((x * x) / (rx * rx + .5) + (y * y) / (ry * ry + .5) <= 1) put(s, cx + x, cy + y, c); }
function tri(s, cx, top, base, hw, c) { for (let y = top; y <= base; y++) { const w = Math.round(hw * (y - top) / Math.max(1, base - top)); rect(s, cx - w, y, 2 * w + 1, 1, c); } }
function outline(s, c) {
  const o = s.d.slice();
  for (let y = 0; y < s.h; y++) for (let x = 0; x < s.w; x++) if (!get(s, x, y)) {
    if (get(s, x - 1, y) || get(s, x + 1, y) || get(s, x, y - 1) || get(s, x, y + 1)) o[y * s.w + x] = c;
  }
  s.d = o; return s;
}
const bayer = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
const dth = (x, y) => (bayer[y & 3][x & 3] + .5) / 16;
function sky(s, cols, y0, y1) {
  for (let y = y0; y < y1; y++) for (let x = 0; x < s.w; x++) {
    const t = (y - y0) / Math.max(1, y1 - y0 - 1) * (cols.length - 1), i = Math.min(cols.length - 2, Math.floor(t)), f = t - i;
    put(s, x, y, dth(x, y) < f ? cols[i + 1] : cols[i]);
  }
}
function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const tintCache = {};
const tint = c => tintCache[c] || (tintCache[c] = (() => { const v = [1, 3, 5].map(k => parseInt(c.slice(k, k + 2), 16)); return '#' + [Math.min(255, v[0] * 1.15 + 45), v[1] * .6, v[2] * .6].map(n => Math.round(n).toString(16).padStart(2, '0')).join(''); })());
function blit(s, scale, angry) {
  const c = document.createElement('canvas'); c.width = s.w * scale; c.height = s.h * scale;
  const g = c.getContext('2d');
  for (let y = 0; y < s.h; y++) for (let x = 0; x < s.w; x++) { const v = s.d[y * s.w + x]; if (v) { g.fillStyle = angry ? tint(v) : v; g.fillRect(x * scale, y * scale, scale, scale); } }
  return c;
}
const OL = '#1a1209';

const W = {};
W.staff = () => {
  const s = mk(28, 28);
  tline(s, 5, 25, 18, 12, '#a8763c', '#74491f');
  rect(s, 16, 11, 3, 2, '#e8b64c'); put(s, 16, 13, '#c8912f'); put(s, 19, 10, '#e8b64c');
  disc(s, 21, 8, 5, '#4a2bb0'); disc(s, 21, 8, 4, '#6a42e8'); disc(s, 21, 8, 3, '#8f6bff');
  put(s, 20, 7, '#f1e8ff'); put(s, 19, 7, '#d9c8ff'); put(s, 20, 6, '#d9c8ff'); put(s, 22, 10, '#5a35c9'); put(s, 23, 9, '#5a35c9');
  outline(s, OL);
  [[26, 2], [14, 4], [26, 14]].forEach(([x, y]) => { put(s, x, y, '#e6d9ff'); put(s, x - 1, y, '#9d80ff'); put(s, x + 1, y, '#9d80ff'); put(s, x, y - 1, '#9d80ff'); put(s, x, y + 1, '#9d80ff'); });
  return s;
};
W.bow = () => {
  const s = mk(28, 28), cx = 3, cy = 14, r = 13;
  for (let a = -72; a <= 72; a += 1.5) { const t = a * Math.PI / 180, x = cx + r * Math.cos(t), y = cy + r * Math.sin(t); put(s, x, y, '#a8763c'); put(s, x + 1, y, '#74491f'); }
  const tx = cx + r * Math.cos(72 * Math.PI / 180), ty = cy - r * Math.sin(72 * Math.PI / 180);
  line(s, tx + 1, ty, tx + 1, 2 * cy - ty, '#efe6c8');
  line(s, tx + 1, 14, 25, 14, '#cfd6dc'); line(s, tx + 1, 15, 24, 15, '#8d96a0');
  tri(s, 25, 0, 0, 0, null);
  put(s, 25, 14, '#f0f4f8'); put(s, 26, 14, '#f0f4f8'); put(s, 25, 13, '#f0f4f8'); put(s, 25, 15, '#f0f4f8'); put(s, 24, 12, '#c8912f'); put(s, 24, 17, '#c8912f');
  rect(s, 10, 12, 3, 1, '#e5533c'); rect(s, 10, 17, 3, 1, '#e5533c'); put(s, 9, 13, '#e5533c'); put(s, 9, 16, '#e5533c'); rect(s, 10, 13, 3, 4, '#c0392b');
  outline(s, OL); return s;
};
function dagger(s, hx, hy, tx, ty) {
  const dx = tx - hx, dy = ty - hy, L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L, px = -uy, py = ux;
  const at = (t, o = 0) => [hx + ux * t + px * o, hy + uy * t + py * o];
  for (let t = 5; t < L; t += .5) { const w = t > L - 3 ? 0 : 1; const [x, y] = at(t); put(s, x, y, '#e3e9ef'); if (w) { const [x2, y2] = at(t, 1); put(s, x2, y2, '#8e9aa6'); } }
  for (let t = 0; t < 4.5; t += .5) { const [x, y] = at(t); put(s, x, y, '#7a4a22'); }
  for (let o = -3; o <= 3; o += .5) { const [x, y] = at(4.8, o); put(s, x, y, '#e8b64c'); }
  const [ex, ey] = at(-.8); put(s, ex, ey, '#e8b64c');
}
W.dagger = () => { const s = mk(28, 28); dagger(s, 4, 24, 23, 4); dagger(s, 24, 24, 5, 4); outline(s, OL); return s; };
W.crossbow = () => {
  const s = mk(28, 28), cx = 30, cy = 14, r = 11;
  rect(s, 2, 12, 19, 5, '#8a5a2b'); rect(s, 2, 12, 19, 1, '#b0814a'); rect(s, 2, 16, 19, 1, '#5a3a22');
  rect(s, 1, 11, 3, 7, '#6d4320'); rect(s, 9, 17, 3, 4, '#5a3a22'); rect(s, 10, 17, 1, 2, '#cfd6dc');
  rect(s, 17, 10, 4, 9, '#9aa6b2'); rect(s, 17, 10, 4, 1, '#dfe6ec');
  for (let a = 118; a <= 242; a += 1.2) { const t = a * Math.PI / 180, x = cx + r * Math.cos(t), y = cy + r * Math.sin(t); put(s, x, y, '#a8763c'); put(s, x + 1, y, '#74491f'); put(s, x - 1, y, '#a8763c'); }
  const tx = cx + r * Math.cos(118 * Math.PI / 180), ty = cy + r * Math.sin(118 * Math.PI / 180);
  line(s, tx, ty, 12, 14, '#efe6c8'); line(s, tx, 2 * cy - ty, 12, 14, '#efe6c8');
  line(s, 12, 14, 26, 14, '#e3e9ef'); line(s, 12, 15, 26, 15, '#8e9aa6'); rect(s, 12, 13, 3, 3, '#e5533c');
  put(s, 26, 14, '#f0f4f8'); put(s, 27, 14, '#f0f4f8'); put(s, 26, 13, '#e8b64c'); put(s, 26, 15, '#e8b64c');
  outline(s, OL); return s;
};
W.book = () => {
  const s = mk(28, 28);
  rect(s, 5, 3, 19, 22, '#f1e8cc'); rect(s, 4, 2, 19, 22, '#4b2c7a'); rect(s, 4, 2, 3, 22, '#35205a');
  rect(s, 7, 4, 14, 1, '#e8b64c'); rect(s, 7, 21, 14, 1, '#e8b64c'); rect(s, 7, 4, 1, 18, '#e8b64c'); rect(s, 20, 4, 1, 18, '#e8b64c');
  const gem = (x, y, a, b) => { rect(s, x, y, 3, 3, a); put(s, x, y, b); put(s, x + 1, y, b); rect(s, x - 1, y - 1, 5, 1, '#c8912f'); rect(s, x - 1, y + 3, 5, 1, '#c8912f'); put(s, x - 1, y, '#c8912f'); put(s, x - 1, y + 1, '#c8912f'); put(s, x - 1, y + 2, '#c8912f'); put(s, x + 3, y, '#c8912f'); put(s, x + 3, y + 1, '#c8912f'); put(s, x + 3, y + 2, '#c8912f'); };
  gem(10, 7, '#e5533c', '#ffb09c'); gem(10, 12, '#3f9be0', '#a9dcff'); gem(10, 17, '#4fbf5c', '#b4f2b9');
  put(s, 16, 10, '#e8b64c'); put(s, 17, 11, '#e8b64c'); put(s, 16, 12, '#e8b64c'); put(s, 15, 11, '#e8b64c');
  outline(s, OL); return s;
};
W.shield = () => {
  const s = mk(28, 28);
  rect(s, 22, 2, 3, 15, '#dfe6ec'); rect(s, 24, 2, 1, 15, '#8e9aa6'); put(s, 23, 1, '#dfe6ec'); rect(s, 20, 17, 7, 2, '#e8b64c'); rect(s, 22, 19, 3, 6, '#7a4a22'); rect(s, 22, 25, 3, 1, '#e8b64c');
  for (let y = 5; y <= 25; y++) {
    const half = y < 15 ? 9 : Math.round(9 * (25 - y) / 10);
    for (let x = -half; x <= half; x++) {
      const edge = (Math.abs(x) >= half - 1) || y <= 6 || y >= 24 - 0;
      put(s, 13 + x, y, edge ? '#e8b64c' : (x < 0 ? '#4a86c5' : '#3a6ea5'));
    }
  }
  rect(s, 12, 8, 3, 12, '#f0f4f8'); rect(s, 8, 11, 11, 3, '#f0f4f8');
  rect(s, 12, 8, 1, 12, '#cfd8e0'); rect(s, 8, 11, 11, 1, '#cfd8e0');
  outline(s, OL); return s;
};
W.fist = () => {
  const s = mk(28, 28);
  rect(s, 6, 10, 18, 11, '#c07a3e');
  for (let i = 0; i < 4; i++) { disc(s, 8 + i * 4, 9, 2, '#d88f4d'); put(s, 7 + i * 4, 8, '#f0b074'); }
  rect(s, 6, 13, 18, 1, '#a45f2a'); rect(s, 6, 17, 18, 1, '#a45f2a');
  rect(s, 5, 14, 20, 4, '#9aa6b2'); rect(s, 5, 14, 20, 1, '#dfe6ec'); rect(s, 5, 17, 20, 1, '#6f7a86');
  for (let i = 0; i < 4; i++) { put(s, 8 + i * 4, 15, '#e8b64c'); put(s, 8 + i * 4, 16, '#c8912f'); }
  rect(s, 2, 15, 4, 6, '#d88f4d'); put(s, 2, 15, '#f0b074');
  rect(s, 7, 21, 16, 5, '#5a3a22'); rect(s, 7, 21, 16, 1, '#e8b64c'); rect(s, 7, 24, 16, 1, '#3d2614');
  outline(s, OL); return s;
};
W.great = () => {
  const s = mk(28, 28);
  for (let y = 1; y <= 19; y++) { const hw = y < 4 ? y - 1 : 3; for (let x = -hw; x <= hw; x++) put(s, 14 + x, y, x < 0 ? '#eef2f6' : (x === 0 ? '#aab5c0' : '#8e9aa6')); }
  for (let y = 4; y <= 18; y++) put(s, 14, y, '#6f7a86');
  rect(s, 6, 20, 17, 2, '#e8b64c'); rect(s, 6, 20, 17, 1, '#f6d77a'); rect(s, 5, 19, 2, 4, '#c8912f'); rect(s, 22, 19, 2, 4, '#c8912f');
  rect(s, 13, 22, 3, 4, '#7a4a22'); put(s, 13, 23, '#a8763c'); put(s, 13, 25, '#a8763c');
  disc(s, 14, 26, 1, '#e8b64c'); put(s, 14, 12, '#e5533c');
  outline(s, OL); return s;
};
W.bell = () => {
  const s = mk(28, 28);
  rect(s, 12, 2, 5, 1, '#e8b64c'); rect(s, 11, 3, 1, 3, '#e8b64c'); rect(s, 17, 3, 1, 3, '#c8912f'); rect(s, 12, 5, 5, 1, '#c8912f');
  for (let y = 6; y <= 21; y++) {
    const half = Math.min(11, Math.round(4 + (y - 6) * .36 + Math.max(0, y - 17) * .9));
    for (let x = -half; x <= half; x++) put(s, 14 + x, y, x < -half + 3 ? '#f6d77a' : (x > half - 3 ? '#b8821f' : '#e8b64c'));
  }
  rect(s, 3, 21, 23, 2, '#c8912f'); rect(s, 3, 21, 23, 1, '#f6d77a'); rect(s, 3, 22, 23, 1, '#8f6416');
  disc(s, 14, 25, 2, '#c8912f'); put(s, 13, 24, '#f6d77a');
  rect(s, 12, 11, 5, 5, '#c0392b'); put(s, 14, 13, '#ffb09c');
  outline(s, OL);
  [[24, 6], [4, 9]].forEach(([x, y]) => { put(s, x, y, '#fff'); put(s, x - 1, y, '#f6d77a'); put(s, x + 1, y, '#f6d77a'); put(s, x, y - 1, '#f6d77a'); put(s, x, y + 1, '#f6d77a'); });
  return s;
};

function hunter() {
  const s = mk(26, 32);
  tline(s, 21, 29, 21, 8, '#a8763c', '#74491f'); disc(s, 22, 6, 3, '#6a42e8'); put(s, 21, 5, '#e6d9ff'); put(s, 22, 4, '#b79bff');
  for (let y = 15; y <= 27; y++) { const hw = 5 + Math.round((y - 15) * .35); rect(s, 11 - hw, y, hw * 2 + 1, 1, '#2f7a78'); rect(s, 11 - hw, y, 2, 1, '#3e9a96'); rect(s, 11 + hw - 1, y, 2, 1, '#215a58'); }
  disc(s, 11, 9, 7, '#2f7a78'); disc(s, 11, 9, 6, '#3e9a96');
  rect(s, 7, 6, 9, 7, '#2f7a78'); rect(s, 8, 7, 7, 6, '#f2c7a0'); rect(s, 8, 7, 7, 1, '#e0ae84');
  rect(s, 9, 9, 2, 2, '#2a1b10'); rect(s, 13, 9, 2, 2, '#2a1b10'); put(s, 9, 9, '#fff'); put(s, 13, 9, '#fff'); rect(s, 11, 12, 2, 1, '#c8836a');
  rect(s, 5, 20, 13, 2, '#7a4a22'); rect(s, 10, 20, 3, 2, '#e8b64c');
  rect(s, 18, 19, 4, 3, '#f2c7a0');
  rect(s, 7, 28, 4, 3, '#5a3a22'); rect(s, 13, 28, 4, 3, '#5a3a22'); rect(s, 7, 28, 4, 1, '#7a4a22'); rect(s, 13, 28, 4, 1, '#7a4a22');
  outline(s, OL); return s;
}

function portal() {
  const s = mk(80, 44), R = rng(7);
  sky(s, ['#0b0818', '#1a1038', '#2d1a5c'], 0, 36);
  for (let i = 0; i < 38; i++) { const x = Math.floor(R() * 80), y = Math.floor(R() * 24); put(s, x, y, R() < .3 ? '#fff' : '#b9a8ff'); }
  for (let x = 0; x < 80; x++) { const h = 28 + Math.round(3 * Math.sin(x * .13) + 2 * Math.sin(x * .31)); rect(s, x, h, 1, 12, '#1a1230'); }
  rect(s, 0, 36, 80, 8, '#241c36'); rect(s, 0, 36, 80, 1, '#3a2f55');
  for (let y = 38; y < 44; y += 3) rect(s, 0, y, 80, 1, '#2e2445');
  for (let x = 0; x < 80; x += 8) for (let y = 37; y < 44; y += 3) put(s, x + ((y / 3 | 0) % 2) * 4, y, '#1a1230');
  const cx = 40, cy = 22, ro = 17, ri = 12;
  const inside = (x, y) => (y <= cy ? Math.hypot(x - cx, y - cy) <= ri : (Math.abs(x - cx) <= ri && y < 36));
  const frame = (x, y) => (y <= cy ? (Math.hypot(x - cx, y - cy) <= ro && !inside(x, y)) : (Math.abs(x - cx) <= ro && Math.abs(x - cx) > ri && y < 36));
  const pur = ['#2a1068', '#4b22a8', '#7b4dff', '#a98bff', '#d9ccff'];
  for (let y = 0; y < 36; y++) for (let x = 0; x < 80; x++) {
    if (inside(x, y)) {
      const dx = x - cx, dy = y - 24, d = Math.hypot(dx, dy), a = Math.atan2(dy, dx);
      const v = Math.sin(d * .75 - a * 2 + 1.6) * .5 + .5, k = Math.min(4, Math.floor((v * .75 + (1 - Math.min(1, d / 14)) * .45) * 5));
      put(s, x, y, pur[Math.max(0, k)]);
    } else if (frame(x, y)) {
      const n = (x * 7 + y * 13) % 5; put(s, x, y, n === 0 ? '#575069' : (x < cx ? '#8a829f' : '#6b6580'));
    }
  }
  for (let a = -90; a <= 90; a += 18) { const t = a * Math.PI / 180 - Math.PI / 2; for (let r = ri + 1; r < ro; r++) put(s, cx + Math.cos(t) * r, cy + Math.sin(t) * r, '#3d3750'); }
  for (let y = 24; y < 36; y += 4) { rect(s, cx - ro, y, ro - ri, 1, '#3d3750'); rect(s, cx + ri + 1, y, ro - ri, 1, '#3d3750'); }
  rect(s, cx - ro - 1, 35, 2 * ro + 3, 2, '#575069'); rect(s, cx - ro - 1, 35, 2 * ro + 3, 1, '#8a829f');
  put(s, cx - 1, cy - ro, '#e8b64c'); put(s, cx, cy - ro, '#e8b64c'); put(s, cx + 1, cy - ro, '#e8b64c'); put(s, cx, cy - ro + 1, '#e8b64c');
  [[18, 31], [62, 31]].forEach(([x, y]) => {
    rect(s, x, y, 2, 6, '#7a4a22'); rect(s, x - 1, y, 4, 1, '#5a3a22');
    rect(s, x, y - 3, 2, 3, '#ff9f3c'); put(s, x, y - 4, '#ff6a2e'); put(s, x + 1, y - 2, '#ffe27a'); put(s, x, y - 1, '#ffe27a'); put(s, x - 1, y - 2, '#ff6a2e'); put(s, x + 2, y - 1, '#ff6a2e');
  });
  for (let i = 0; i < 16; i++) { const a = R() * 6.28, r = 17 + R() * 9; const x = cx + Math.cos(a) * r, y = 26 + Math.sin(a) * r * .8; if (y < 35) put(s, x, y, R() < .5 ? '#a98bff' : '#d9ccff'); }
  const hx = 40, hy = 28;
  rect(s, hx - 2, hy + 3, 5, 5, '#2f7a78'); rect(s, hx - 3, hy + 6, 7, 2, '#2f7a78'); disc(s, hx, hy + 1, 2, '#3e9a96'); put(s, hx + 3, hy + 2, '#8f6bff'); rect(s, hx + 3, hy + 3, 1, 5, '#a8763c'); rect(s, hx - 2, hy + 8, 2, 2, '#5a3a22'); rect(s, hx + 1, hy + 8, 2, 2, '#5a3a22');
  return s;
}

const RG = {};
RG.grass = () => {
  const s = mk(56, 28), R = rng(3);
  sky(s, ['#6ec1ee', '#a5dcf5', '#d9f2fa'], 0, 20);
  disc(s, 46, 6, 4, '#ffe9a0'); disc(s, 46, 6, 3, '#fff3c4');
  [[10, 7, 5], [28, 11, 4], [40, 4, 3]].forEach(([x, y, r]) => { ell(s, x, y, r + 3, 2, '#fff'); ell(s, x - 2, y - 1, r, 2, '#fff'); rect(s, x - r - 2, y + 2, 2 * r + 6, 1, '#d0e6f2'); });
  for (let x = 0; x < 56; x++) rect(s, x, 16 + Math.round(2 * Math.sin(x * .16)), 1, 12, '#93d46d');
  for (let x = 0; x < 56; x++) rect(s, x, 20 + Math.round(2 * Math.sin(x * .2 + 2)), 1, 8, '#62b24a');
  for (let x = 0; x < 56; x++) rect(s, x, 24 + Math.round(1 * Math.sin(x * .3)), 1, 4, '#4a9a3a');
  for (let i = 0; i < 34; i++) { const x = Math.floor(R() * 56), y = 21 + Math.floor(R() * 7); put(s, x, y, ['#fff', '#ff9ec4', '#ffe27a', '#fff'][i % 4]); put(s, x, y + 1, '#3a7d2c'); }
  for (let i = 0; i < 14; i++) { const x = Math.floor(R() * 56), y = 22 + Math.floor(R() * 6); put(s, x, y, '#85d062'); put(s, x + 1, y - 1, '#85d062'); }
  return s;
};
function pine(s, x, base, h, c1, c2) {
  rect(s, x, base - 2, 1, 3, '#5a3a22');
  for (let i = 0; i < 3; i++) { const top = base - h + i * Math.round(h / 3.4), b = top + Math.round(h / 2.2); tri(s, x, top, Math.min(base - 2, b), 2 + i + (h > 12 ? 1 : 0), c1); tri(s, x - 1, top + 1, Math.min(base - 2, b - 1), 1 + i, c2); }
}
RG.forest = () => {
  const s = mk(56, 28), R = rng(5);
  sky(s, ['#2a4a3e', '#4d7a64', '#9cc0aa'], 0, 28);
  [4, 13, 22, 31, 41, 50].forEach((x, i) => pine(s, x, 20, 11 + (i % 2) * 2, '#3a6a52', '#4a8266'));
  for (let y = 14; y < 23; y++) for (let x = 0; x < 56; x++) if (dth(x, y) < .42 * (1 - Math.abs(y - 18) / 5)) put(s, x, y, '#a9cbb7');
  [8, 26, 46].forEach((x, i) => pine(s, x, 25, 17 + i % 2 * 2, '#1f4a32', '#2a6044'));
  rect(s, 0, 24, 56, 4, '#18301f');
  for (let x = 0; x < 56; x++) if (R() < .4) put(s, x, 24, '#2a6044');
  for (let i = 0; i < 9; i++) put(s, Math.floor(R() * 56), Math.floor(R() * 26), i % 2 ? '#e0933c' : '#c8602a');
  return s;
};
RG.coast = () => {
  const s = mk(56, 28), R = rng(9);
  sky(s, ['#5ec0e8', '#a0e0f0', '#e0f6f4'], 0, 14);
  disc(s, 44, 6, 3, '#fff3c4'); ell(s, 14, 5, 7, 2, '#fff'); ell(s, 11, 4, 4, 2, '#fff');
  for (let y = 14; y < 23; y++) for (let x = 0; x < 56; x++) { const f = (y - 14) / 8; put(s, x, y, dth(x, y) < f ? '#2a86b8' : '#3ca4d4'); }
  for (let y = 15; y < 22; y += 2) for (let x = (y % 4) * 2; x < 56; x += 8) { rect(s, x, y, 3, 1, '#bfe8f6'); put(s, x + 3, y + 1, '#8fd0ea'); }
  rect(s, 0, 22, 56, 6, '#e8d29a'); for (let x = 0; x < 56; x++) { if (x % 3 === 0) put(s, x, 22, '#fff'); put(s, x, 23 + (x % 2), '#f6e6b4'); }
  for (let i = 0; i < 20; i++) put(s, Math.floor(R() * 56), 24 + Math.floor(R() * 4), '#c8b27a');
  for (let x = 0; x < 56; x += 2) put(s, x, 21, '#eaf8fb');
  tline(s, 47, 25, 49, 12, '#8a5a2b', '#5a3a22'); tline(s, 49, 12, 50, 8, '#8a5a2b', '#5a3a22');
  [[-6, 2], [-5, -3], [5, -2], [6, 3], [0, -5]].forEach(([dx, dy]) => { line(s, 51, 8, 51 + dx, 8 + dy, '#3f9a45'); line(s, 51, 9, 51 + dx, 9 + dy, '#2c7a35'); });
  disc(s, 51, 9, 1, '#6d4320');
  [[8, 18, 1], [10, 15, 1], [30, 17, 2], [6, 12, 1]].forEach(([x, y, r]) => { rect(s, x, y, 1, 1, '#e6f8ff'); });
  disc(s, 24, 25, 1, '#ff9ec4'); put(s, 24, 25, '#fff');
  return s;
};
RG.volcano = () => {
  const s = mk(56, 28), R = rng(11);
  sky(s, ['#220c12', '#661a1a', '#c4491e'], 0, 24);
  for (let i = 0; i < 26; i++) put(s, Math.floor(R() * 56), Math.floor(R() * 20), i % 3 ? '#8a7a7a' : '#ff9f3c');
  ell(s, 36, 3, 8, 2, '#4a3636'); ell(s, 30, 5, 6, 2, '#5a4444'); ell(s, 38, 6, 4, 1, '#6a5050');
  tri(s, 28, 8, 25, 21, '#3a2a2a');
  for (let y = 8; y <= 25; y++) { const w = Math.round(21 * (y - 8) / 17); rect(s, 28 + w - 4, y, 4, 1, '#2a1c1c'); rect(s, 28 - w, y, 3, 1, '#5a4040'); }
  rect(s, 24, 8, 9, 2, '#ff6a2e'); rect(s, 26, 8, 5, 1, '#ffe27a'); put(s, 23, 9, '#ff6a2e'); put(s, 33, 9, '#ff6a2e');
  for (let y = 10; y < 24; y++) { const x = 28 + Math.round(Math.sin(y * .7) * 1.5); rect(s, x, y, 2, 1, '#ff6a2e'); put(s, x, y, '#ffe27a'); }
  rect(s, 0, 24, 56, 4, '#1a0f10'); for (let x = 0; x < 56; x++) { put(s, x, 24 + (x % 3 === 0 ? 0 : 1), '#2e1b1b'); }
  for (let x = 0; x < 56; x++) { put(s, x, 26 + Math.round(Math.sin(x * .4)), '#ff6a2e'); put(s, x, 27, '#ff9f3c'); }
  for (let i = 0; i < 9; i++) put(s, Math.floor(R() * 56), 16 + Math.floor(R() * 9), '#ffb35a');
  return s;
};
RG.snow = () => {
  const s = mk(56, 28), R = rng(13);
  sky(s, ['#8e9db4', '#bcc8d8', '#e6ecf3'], 0, 20);
  [[10, 7, 14], [26, 5, 17], [44, 8, 13]].forEach(([x, t, h]) => { tri(s, x, t, t + h, h, '#8795ab'); tri(s, x, t, t + Math.round(h * .35), Math.round(h * .35), '#f4f8fc'); for (let y = t; y <= t + h; y++) put(s, x + Math.round(h * (y - t) / h) - 3, y, '#6f7d93'); });
  rect(s, 0, 20, 56, 8, '#f0f6fb'); for (let x = 0; x < 56; x++) { put(s, x, 20 + Math.round(Math.sin(x * .25)), '#dfe9f3'); rect(s, x, 23 + Math.round(Math.sin(x * .2 + 1)), 1, 5, '#cfdcea'); }
  [[8, 25], [20, 24], [38, 26], [49, 24]].forEach(([x, b], i) => { rect(s, x, b - 1, 1, 2, '#5a3a22'); for (let k = 0; k < 3; k++) { tri(s, x, b - 11 + k * 3, b - 6 + k * 3, 2 + k, '#2f6a4e'); tri(s, x, b - 11 + k * 3, b - 9 + k * 3, 1 + k, '#f4f8fc'); } });
  for (let i = 0; i < 40; i++) put(s, Math.floor(R() * 56), Math.floor(R() * 28), '#fff');
  for (let i = 0; i < 8; i++) { const x = Math.floor(R() * 54) + 1, y = Math.floor(R() * 26) + 1; put(s, x, y, '#fff'); put(s, x - 1, y, '#dfe9f3'); put(s, x + 1, y, '#dfe9f3'); put(s, x, y - 1, '#dfe9f3'); put(s, x, y + 1, '#dfe9f3'); }
  return s;
};
RG.sky = () => {
  const s = mk(56, 28), R = rng(17);
  sky(s, ['#f4c868', '#f9dc92', '#fff1cf'], 0, 28);
  for (let y = 22; y < 28; y++) for (let x = 0; x < 56; x++) if (dth(x, y) < (y - 21) / 7) put(s, x, y, '#fff8e8');
  ell(s, 8, 25, 9, 2, '#fff'); ell(s, 44, 26, 11, 2, '#fff');
  const isl = (cx, cy, rx, big) => {
    for (let y = 0; y < rx; y++) { const w = Math.round(rx * (1 - y / rx)); rect(s, cx - w, cy + 1 + y, w * 2 + 1, 1, y % 3 === 0 ? '#8a6a46' : '#a8834f'); }
    rect(s, cx - rx, cy - 1, rx * 2 + 1, 3, '#6fbf5a'); rect(s, cx - rx, cy - 1, rx * 2 + 1, 1, '#9ae07a');
    if (big) { [-6, -2, 3].forEach((dx, i) => { const h = 7 - i; rect(s, cx + dx, cy - 1 - h, 3, h, '#f1ead8'); rect(s, cx + dx, cy - 1 - h, 1, h, '#fff'); rect(s, cx + dx + 2, cy - 1 - h, 1, h, '#cfc4a8'); rect(s, cx + dx - 1, cy - 2 - h, 5, 1, '#e8b64c'); }); rect(s, cx - 7, cy - 2, 17, 1, '#cfc4a8'); }
  };
  isl(24, 17, 14, true); isl(48, 8, 5, false); isl(6, 6, 4, false);
  for (let i = 0; i < 14; i++) { const x = Math.floor(R() * 56), y = Math.floor(R() * 20); put(s, x, y, '#fff'); if (i % 3 === 0) { put(s, x - 1, y, '#ffe9a0'); put(s, x + 1, y, '#ffe9a0'); put(s, x, y - 1, '#ffe9a0'); put(s, x, y + 1, '#ffe9a0'); } }
  return s;
};
RG.abyss = () => {
  const s = mk(56, 28), R = rng(19);
  sky(s, ['#0a0516', '#26124a', '#5a2a8a'], 0, 22);
  disc(s, 44, 6, 5, '#3a2468'); disc(s, 44, 6, 4, '#d9ccff'); disc(s, 43, 5, 2, '#fff'); put(s, 45, 8, '#b79bff');
  for (let i = 0; i < 22; i++) put(s, Math.floor(R() * 56), Math.floor(R() * 14), i % 4 ? '#6a4a9a' : '#d9ccff');
  [[6, 6, 11], [17, 10, 7], [34, 5, 12], [47, 9, 8], [53, 7, 6]].forEach(([x, t, h]) => { tri(s, x, t, 22, Math.round(h / 3), '#140a26'); for (let y = t; y < 22; y += 1) put(s, x - Math.round((h / 3) * (y - t) / (22 - t)), y, '#4a2a80'); });
  rect(s, 0, 22, 56, 6, '#120a1e');
  const crack = (x0, y0, x1, y1) => { let x = x0, y = y0; while (x < x1) { const nx = x + 2 + Math.floor(R() * 3), ny = Math.max(22, Math.min(27, y + Math.floor(R() * 3) - 1)); line(s, x, y, nx, ny, '#b36bff'); x = nx; y = ny; } };
  crack(0, 24, 56, 24); crack(6, 26, 30, 26);
  for (let x = 0; x < 56; x++) for (let y = 22; y < 28; y++) if (!get(s, x, y) || get(s, x, y) === '#120a1e') { const near = [get(s, x, y - 1), get(s, x, y + 1)].some(c => c === '#b36bff'); if (near && dth(x, y) < .5) put(s, x, y, '#4a2a7a'); }
  for (let y = 18; y < 24; y++) for (let x = 0; x < 56; x++) if (dth(x, y) < .22) put(s, x, y, '#3a2a5a');
  put(s, 24, 14, '#ff4a4a'); put(s, 26, 14, '#ff4a4a');
  return s;
};

const hx2 = c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));
const rgb2 = a => '#' + a.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
const mix = (c, t, k) => { const a = hx2(c), b = hx2(t); return rgb2(a.map((v, i) => v + (b[i] - v) * k)); };
const lt = (c, k = .3) => mix(c, '#ffffff', k), dk = (c, k = .3) => mix(c, '#000000', k);
function poly(s, pts, c) {
  const ys = pts.map(p => p[1]); const y0 = Math.floor(Math.min(...ys)), y1 = Math.ceil(Math.max(...ys));
  for (let y = y0; y <= y1; y++) {
    const xs = [];
    for (let i = 0; i < pts.length; i++) { const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % pts.length]; if ((ay <= y && by > y) || (by <= y && ay > y)) xs.push(ax + (y - ay) / (by - ay) * (bx - ax)); }
    xs.sort((a, b) => a - b);
    for (let i = 0; i + 1 < xs.length; i += 2) for (let x = Math.round(xs[i]); x <= Math.round(xs[i + 1]); x++) put(s, x, y, c);
  }
}
function ring(s, cx, cy, r, c) { for (let a = 0; a < 360; a += 6) put(s, cx + r * Math.cos(a * Math.PI / 180), cy + r * Math.sin(a * Math.PI / 180), c); }
const sdisc = (s, cx, cy, r, c) => { disc(s, cx, cy, r, dk(c, .3)); disc(s, cx - 1, cy - 1, r - 1, c); if (r > 3) disc(s, cx - 2, cy - 3, Math.max(1, Math.round(r * .4)), lt(c, .22)); };
const sell = (s, cx, cy, rx, ry, c) => { ell(s, cx, cy, rx, ry, dk(c, .3)); ell(s, cx - 1, cy - 1, rx - 1, ry - 1, c); ell(s, cx - 2, cy - 3, Math.max(1, Math.round(rx * .45)), Math.max(1, Math.round(ry * .3)), lt(c, .22)); };
const spark = (s, x, y, c1, c2) => { put(s, x, y, c1); put(s, x - 1, y, c2); put(s, x + 1, y, c2); put(s, x, y - 1, c2); put(s, x, y + 1, c2); };

const M = {};
M.coo = () => {
  const s = mk(40, 32), b = '#8cc152';
  rect(s, 15, 27, 2, 3, '#f0a030'); rect(s, 23, 27, 2, 3, '#f0a030'); rect(s, 12, 29, 5, 1, '#f0a030'); rect(s, 22, 29, 5, 1, '#f0a030');
  ell(s, 9, 19, 3, 6, dk(b, .25)); ell(s, 31, 19, 3, 6, dk(b, .25));
  tri(s, 20, 3, 10, 1, '#4a9a3a'); tri(s, 16, 5, 11, 1, '#6ab04a'); tri(s, 24, 5, 11, 1, '#6ab04a');
  sdisc(s, 20, 18, 10, b);
  ell(s, 20, 23, 6, 4, '#f6f0c4'); ell(s, 19, 22, 4, 2, '#fffbe0');
  rect(s, 14, 12, 4, 5, '#fff'); rect(s, 16, 13, 2, 3, '#222'); put(s, 16, 13, '#fff');
  rect(s, 22, 12, 4, 5, '#fff'); rect(s, 22, 13, 2, 3, '#222'); put(s, 22, 13, '#fff');
  tri(s, 20, 17, 20, 2, '#f0a030'); put(s, 19, 17, '#ffd070');
  rect(s, 12, 18, 2, 1, '#f59ab0'); rect(s, 26, 18, 2, 1, '#f59ab0');
  outline(s, OL); return s;
};
M.frog = () => {
  const s = mk(40, 32), b = '#4a9ad8';
  sell(s, 8, 27, 5, 3, b); sell(s, 32, 27, 5, 3, b);
  sell(s, 20, 21, 13, 8, b);
  ell(s, 20, 25, 9, 4, '#d4ecfa');
  [[12, 18], [27, 17], [22, 15], [16, 16], [30, 21], [9, 21]].forEach(([x, y]) => disc(s, x, y, 1, dk(b, .22)));
  sell(s, 12, 11, 4, 4, b); sell(s, 28, 11, 4, 4, b);
  disc(s, 12, 10, 3, '#fff'); disc(s, 28, 10, 3, '#fff');
  rect(s, 12, 9, 2, 3, '#222'); rect(s, 28, 9, 2, 3, '#222'); put(s, 12, 9, '#fff'); put(s, 28, 9, '#fff');
  line(s, 10, 19, 30, 19, '#1d4a78'); put(s, 9, 18, '#1d4a78'); put(s, 31, 18, '#1d4a78');
  rect(s, 10, 21, 2, 2, '#f59ab0'); rect(s, 28, 21, 2, 2, '#f59ab0');
  outline(s, OL);
  [[4, 7, 3], [35, 5, 2], [36, 13, 3], [3, 17, 2], [20, 3, 2]].forEach(([x, y, r]) => { ring(s, x, y, r, '#bfe8ff'); put(s, x - 1, y - 1, '#fff'); });
  return s;
};
M.shroom = () => {
  const s = mk(40, 32);
  rect(s, 14, 17, 12, 11, '#f3e6c4'); rect(s, 14, 17, 3, 11, '#fff6dc'); rect(s, 23, 17, 3, 11, '#d6c496');
  sell(s, 15, 29, 3, 2, '#e8d5a8'); sell(s, 25, 29, 3, 2, '#e8d5a8');
  sell(s, 20, 12, 16, 9, '#c8433f');
  rect(s, 4, 17, 32, 3, '#a8302d'); rect(s, 4, 17, 32, 1, '#d8605a');
  [[11, 11, 3], [22, 7, 2], [29, 12, 3], [17, 14, 1], [8, 15, 1], [33, 15, 1]].forEach(([x, y, r]) => { disc(s, x, y, r, '#fff6dc'); });
  rect(s, 16, 21, 2, 3, '#222'); rect(s, 22, 21, 2, 3, '#222'); put(s, 16, 21, '#fff'); put(s, 22, 21, '#fff');
  rect(s, 19, 25, 2, 1, '#222'); rect(s, 14, 23, 2, 1, '#f59ab0'); rect(s, 24, 23, 2, 1, '#f59ab0');
  outline(s, OL);
  [[3, 6], [36, 4], [2, 24], [37, 22], [30, 2], [8, 3]].forEach(([x, y], i) => { put(s, x, y, i % 2 ? '#b79bff' : '#9cf08a'); put(s, x + 1, y + 1, '#6a8a5a'); });
  return s;
};
M.wolf = () => {
  const s = mk(40, 32);
  for (let i = 0; i < 9; i++) { const x = Math.round(6 + i * 3.4), top = 4 + (i % 2) * 3; tri(s, x, top, 17, 2, i % 2 ? '#ff9f3c' : '#ff6a2e'); tri(s, x, top + 3, 17, 1, '#ffe27a'); }
  tri(s, 36, 15, 27, 2, '#ff6a2e'); tri(s, 36, 19, 27, 1, '#ffe27a');
  sell(s, 20, 26, 10, 5, '#c24a22');
  rect(s, 11, 28, 5, 3, '#f0e0c8'); rect(s, 24, 28, 5, 3, '#f0e0c8'); rect(s, 14, 28, 1, 3, '#c9b89a'); rect(s, 27, 28, 1, 3, '#c9b89a');
  tri(s, 10, 3, 11, 3, '#c24a22'); tri(s, 30, 3, 11, 3, '#c24a22'); tri(s, 10, 6, 11, 1, '#f0a050'); tri(s, 30, 6, 11, 1, '#f0a050');
  sell(s, 20, 15, 11, 9, '#d8572a');
  ell(s, 20, 20, 6, 4, '#f3d7b0'); ell(s, 19, 19, 3, 2, '#fff0d8');
  rect(s, 19, 17, 3, 2, '#222'); line(s, 20, 19, 20, 21, '#222');
  line(s, 16, 23, 24, 23, '#222'); rect(s, 16, 23, 1, 2, '#fff'); rect(s, 24, 23, 1, 2, '#fff');
  rect(s, 13, 13, 4, 2, '#ffe27a'); rect(s, 24, 13, 4, 2, '#ffe27a'); put(s, 15, 14, '#222'); put(s, 25, 14, '#222');
  line(s, 11, 10, 17, 13, '#4a1a0a'); line(s, 30, 10, 24, 13, '#4a1a0a');
  outline(s, OL); return s;
};
M.lava = () => {
  const s = mk(40, 32);
  tri(s, 13, 5, 14, 2, '#7a6a62'); tri(s, 21, 3, 12, 2, '#7a6a62'); tri(s, 29, 5, 14, 2, '#7a6a62');
  rect(s, 9, 24, 6, 6, '#6b5a55'); rect(s, 27, 24, 6, 6, '#6b5a55'); rect(s, 9, 29, 6, 1, '#3a2e2c'); rect(s, 27, 29, 6, 1, '#3a2e2c');
  sell(s, 5, 21, 5, 4, '#8a7a72');
  sell(s, 21, 18, 15, 10, '#4a3c3a');
  rect(s, 6, 23, 31, 4, '#5a4a45'); rect(s, 6, 23, 31, 1, '#6b5a55');
  const lv = '#ff6a2e', hi = '#ffb35a';
  line(s, 21, 9, 21, 22, lv); line(s, 11, 13, 31, 13, lv); line(s, 8, 18, 34, 18, lv);
  line(s, 15, 9, 11, 18, lv); line(s, 27, 9, 31, 18, lv);
  [[21, 13], [21, 18], [15, 13], [27, 13], [12, 18], [30, 18]].forEach(([x, y]) => { put(s, x, y, hi); put(s, x + 1, y, hi); });
  rect(s, 3, 19, 2, 2, hi); put(s, 3, 19, '#fff'); line(s, 1, 23, 6, 23, '#222');
  rect(s, 37, 24, 3, 2, '#6b5a55');
  for (let i = 0; i < 6; i++) put(s, 10 + i * 4, 24 + (i % 2), lv);
  outline(s, OL);
  [[8, 4], [33, 3], [37, 10]].forEach(([x, y]) => { put(s, x, y, hi); put(s, x, y + 1, lv); });
  return s;
};
M.ink = () => {
  const s = mk(40, 32), b = '#2f56b0', belly = '#a9c4f2', mane = '#4ad0e0', gold = '#f6d77a';
  const way = [[14, 13, 4], [19, 15, 4], [24, 17, 4], [29, 16, 3.8], [33, 18, 3.5], [34, 22, 3], [31, 26, 2.5], [26, 28, 2], [21, 29, 1.5], [17, 28, 1]];
  const body = [];
  for (let i = 0; i < way.length - 1; i++) {
    const [ax, ay, ar] = way[i], [bx, by, br] = way[i + 1];
    for (let t = 0; t < 1; t += .2) body.push([ax + (bx - ax) * t, ay + (by - ay) * t, ar + (br - ar) * t]);
  }
  body.forEach(([x, y, r], i) => { if (i % 3 === 1) tri(s, Math.round(x), Math.round(y - r - 3), Math.round(y - r + 1), 1, mane); });
  [[22, 21], [31, 23]].forEach(([x, y]) => { rect(s, x, y, 3, 5, dk(b, .2)); rect(s, x - 1, y + 5, 5, 1, gold); put(s, x - 1, y + 6, gold); put(s, x + 1, y + 6, gold); put(s, x + 3, y + 6, gold); });
  body.forEach(([x, y, r]) => disc(s, x, y, Math.round(r), dk(b, .35)));
  body.forEach(([x, y, r]) => disc(s, x, y - .5, Math.max(1, Math.round(r) - 1), b));
  body.forEach(([x, y, r], i) => { if (r > 2) put(s, x, y + Math.round(r) - 1, belly); if (i % 4 === 0) put(s, x - 1, y - 1, lt(b, .35)); if (i % 4 === 2) put(s, x + 1, y, dk(b, .2)); });
  line(s, 12, 6, 15, 1, gold); line(s, 14, 3, 17, 3, gold); line(s, 8, 6, 8, 1, gold); line(s, 8, 3, 5, 2, gold);
  sell(s, 10, 11, 7, 5, b);
  sell(s, 4, 13, 4, 3, lt(b, .12));
  ell(s, 5, 16, 4, 2, dk(b, .1));
  line(s, 1, 15, 8, 15, '#12204a');
  put(s, 2, 16, '#fff'); put(s, 4, 16, '#fff'); put(s, 3, 14, '#fff');
  put(s, 2, 12, '#12204a'); put(s, 3, 12, '#12204a');
  rect(s, 9, 9, 3, 2, gold); put(s, 10, 9, '#222'); put(s, 10, 10, '#222');
  line(s, 8, 8, 12, 8, '#12204a');
  line(s, 3, 17, 0, 21, mane); line(s, 5, 18, 3, 24, mane);
  outline(s, OL);
  disc(s, 3, 28, 2, '#0e1638'); disc(s, 8, 30, 1, '#0e1638'); disc(s, 37, 29, 1, '#0e1638');
  return s;
};
M.crab = () => {
  const s = mk(40, 32), m = '#8a96a6', c = '#e0573a', leg = '#5a6470';
  for (let i = 0; i < 3; i++) { line(s, 12, 21 + i * 2, 4 + i, 25 + i * 2 + 1, leg); line(s, 27, 21 + i * 2, 35 - i, 25 + i * 2 + 1, leg); }
  tline(s, 11, 17, 7, 12, m, dk(m, .25)); tline(s, 28, 17, 32, 12, m, dk(m, .25));
  rect(s, 3, 8, 9, 5, c); rect(s, 3, 3, 3, 6, c); rect(s, 9, 3, 3, 6, c); rect(s, 3, 8, 9, 1, lt(c, .3)); rect(s, 3, 3, 1, 6, lt(c, .3)); rect(s, 9, 3, 1, 6, lt(c, .3));
  rect(s, 28, 8, 9, 5, c); rect(s, 28, 3, 3, 6, c); rect(s, 34, 3, 3, 6, c); rect(s, 28, 8, 9, 1, lt(c, .3)); rect(s, 28, 3, 1, 6, lt(c, .3)); rect(s, 34, 3, 1, 6, lt(c, .3));
  sell(s, 20, 21, 11, 6, m);
  rect(s, 13, 17, 14, 3, lt(m, .25)); rect(s, 16, 25, 8, 1, '#3a424c');
  line(s, 16, 16, 15, 10, leg); line(s, 24, 16, 25, 10, leg);
  disc(s, 15, 9, 2, '#222'); disc(s, 25, 9, 2, '#222'); put(s, 15, 9, '#ff4a4a'); put(s, 25, 9, '#ff4a4a'); put(s, 14, 8, '#fff'); put(s, 24, 8, '#fff');
  rect(s, 19, 21, 2, 2, '#ff4a4a');
  [[12, 20], [28, 20], [14, 24], [26, 24]].forEach(([x, y]) => put(s, x, y, '#dfe6ec'));
  outline(s, OL); return s;
};
M.octo = () => {
  const s = mk(40, 32), b = '#8a5ac8';
  for (let i = 0; i < 6; i++) {
    const sx = 11 + i * 3.6;
    for (let k = 0; k <= 14; k++) { const t = k / 14, x = sx + Math.sin(t * 5 + i * 1.3) * 3.2 * t + (i - 2.5) * t * 1.6, y = 19 + t * 11; disc(s, x, y, t > .8 ? 1 : 2 - (t > .5 ? 0 : 0), dk(b, .1)); if (k % 3 === 1) put(s, x, y + 1, '#e6d0ff'); }
  }
  sell(s, 20, 12, 11, 9, b);
  rect(s, 9, 7, 22, 4, '#d63a3a'); rect(s, 9, 7, 22, 1, '#ff6a5a'); rect(s, 9, 10, 22, 1, '#9a2020');
  tri(s, 8, 9, 15, 1, '#d63a3a'); put(s, 6, 12, '#d63a3a'); put(s, 5, 14, '#d63a3a');
  disc(s, 20, 9, 1, '#fff'); put(s, 19, 11, '#fff'); put(s, 21, 11, '#fff');
  rect(s, 13, 13, 4, 4, '#fff'); rect(s, 14, 14, 2, 3, '#222'); put(s, 14, 14, '#fff');
  rect(s, 23, 12, 6, 5, '#222'); line(s, 31, 10, 22, 12, '#222'); line(s, 11, 11, 13, 12, '#222');
  line(s, 16, 20, 24, 20, '#3a1a5a'); put(s, 25, 19, '#3a1a5a'); put(s, 15, 19, '#3a1a5a'); rect(s, 22, 21, 1, 1, '#fff');
  outline(s, OL); return s;
};
M.qilin = () => {
  const s = mk(40, 32), st = '#9a9aa2', gold = '#f6d77a';
  poly(s, [[4, 14], [9, 12], [8, 20], [3, 24], [2, 19]], gold); poly(s, [[6, 15], [8, 14], [7, 19], [4, 21]], '#e8b64c');
  rect(s, 9, 23, 3, 7, dk(st, .25)); rect(s, 14, 24, 3, 6, dk(st, .25)); rect(s, 24, 24, 3, 6, st); rect(s, 29, 23, 3, 7, st);
  [9, 14, 24, 29].forEach(x => rect(s, x, 29, 3, 2, '#e8b64c'));
  sell(s, 19, 19, 12, 6, st);
  ell(s, 28, 15, 4, 7, st);
  poly(s, [[24, 4], [28, 6], [27, 14], [23, 18], [21, 12]], gold); poly(s, [[25, 7], [27, 8], [26, 13], [23, 15]], '#e8b64c');
  sell(s, 31, 10, 5, 5, '#a8a8b0'); ell(s, 35, 12, 3, 2, '#b8b8c0'); put(s, 36, 12, '#222');
  tri(s, 31, 0, 6, 1, gold); put(s, 31, 1, '#fff');
  rect(s, 31, 8, 2, 2, '#ffe27a'); put(s, 32, 9, '#222');
  line(s, 12, 17, 15, 21, '#6a6a72'); line(s, 22, 15, 20, 19, '#6a6a72'); line(s, 20, 19, 23, 22, '#6a6a72');
  [[13, 16], [18, 19], [23, 18]].forEach(([x, y]) => { put(s, x, y, gold); put(s, x + 1, y, '#e8b64c'); });
  outline(s, OL);
  spark(s, 6, 6, '#fff', gold); spark(s, 36, 24, '#fff', gold);
  return s;
};
M.crane = () => {
  const s = mk(40, 32), w = '#f4f4f0';
  line(s, 19, 22, 19, 29, '#c8602a'); line(s, 22, 22, 22, 29, '#c8602a'); rect(s, 16, 30, 5, 1, '#c8602a'); rect(s, 21, 30, 5, 1, '#c8602a');
  poly(s, [[4, 17], [10, 15], [11, 21], [5, 22]], '#e8e8e2'); poly(s, [[2, 21], [6, 19], [7, 23]], '#222');
  sell(s, 20, 18, 10, 6, w);
  poly(s, [[8, 16], [24, 14], [26, 20], [12, 24]], '#e0e0da'); poly(s, [[8, 21], [13, 22], [10, 26], [5, 26]], '#222');
  line(s, 8, 20, 22, 17, '#c8c8c2'); line(s, 10, 22, 22, 20, '#c8c8c2');
  tline(s, 27, 15, 30, 9, w, '#d8d8d2'); tline(s, 30, 9, 29, 5, w, '#d8d8d2');
  disc(s, 29, 4, 2, w); rect(s, 28, 1, 3, 1, '#e5533c'); put(s, 29, 2, '#e5533c');
  line(s, 31, 4, 37, 6, '#f0a030'); put(s, 30, 4, '#222'); put(s, 28, 4, '#222');
  outline(s, OL);
  spark(s, 6, 6, '#fff', '#f6d77a'); spark(s, 35, 18, '#fff', '#f6d77a'); spark(s, 14, 4, '#fff', '#f6d77a');
  return s;
};
M.cat = () => {
  const s = mk(40, 32), b = '#3a2a5a', rim = '#8a6ac0';
  const tail = []; for (let i = 0; i <= 14; i++) { const t = i / 14; tail.push([28 + t * 6 + Math.sin(t * 3) * 2, 28 - t * 16]); }
  tail.forEach(([x, y]) => disc(s, x, y, 2, b));
  sell(s, 20, 23, 9, 8, b);
  rect(s, 14, 28, 4, 3, dk(b, .1)); rect(s, 22, 28, 4, 3, dk(b, .1));
  tri(s, 13, 2, 10, 3, b); tri(s, 27, 2, 10, 3, b); tri(s, 13, 5, 10, 1, '#a06ad8'); tri(s, 27, 5, 10, 1, '#a06ad8');
  sdisc(s, 20, 13, 8, '#44326a');
  rect(s, 14, 12, 4, 4, '#ffe27a'); rect(s, 22, 12, 4, 4, '#ffe27a'); rect(s, 16, 12, 1, 4, '#222'); rect(s, 23, 12, 1, 4, '#222'); put(s, 14, 12, '#fff'); put(s, 22, 12, '#fff');
  put(s, 19, 17, '#f59ab0'); put(s, 20, 17, '#f59ab0'); put(s, 20, 18, '#222');
  line(s, 9, 16, 14, 17, rim); line(s, 9, 19, 14, 18, rim); line(s, 31, 16, 26, 17, rim); line(s, 31, 19, 26, 18, rim);
  outline(s, '#7a5ab8');
  for (let i = 0; i < 26; i++) { const x = 4 + (i * 7) % 33, y = 3 + (i * 11) % 27; if (!get(s, x, y) && dth(x, y) < .4) put(s, x, y, '#5a3a90'); }
  return s;
};
M.dragon = () => {
  const s = mk(40, 32), d = '#5a3a80';
  poly(s, [[15, 15], [1, 3], [4, 12], [2, 19], [9, 18], [14, 23]], '#d8402a'); poly(s, [[3, 6], [6, 12], [4, 16]], '#ff8a3a');
  poly(s, [[25, 15], [39, 3], [36, 12], [38, 19], [31, 18], [26, 23]], '#3a7ad8'); poly(s, [[37, 6], [34, 12], [36, 16]], '#6ab4ff');
  line(s, 15, 15, 2, 3, '#2a1a40'); line(s, 15, 15, 4, 12, '#2a1a40'); line(s, 15, 16, 3, 19, '#2a1a40');
  line(s, 25, 15, 38, 3, '#2a1a40'); line(s, 25, 15, 36, 12, '#2a1a40'); line(s, 25, 16, 37, 19, '#2a1a40');
  poly(s, [[17, 26], [23, 26], [21, 31], [19, 31]], d); tri(s, 20, 28, 32, 2, '#c060ff');
  sell(s, 20, 21, 8, 8, d);
  ell(s, 20, 23, 5, 6, '#c8a0e8'); [19, 22, 25, 28].forEach(y => rect(s, 16, y, 9, 1, '#a07ac8'));
  tri(s, 15, 2, 8, 1, '#f6d77a'); tri(s, 25, 2, 8, 1, '#f6d77a');
  sdisc(s, 20, 11, 6, '#6a4a90');
  rect(s, 16, 9, 3, 3, '#ffe27a'); rect(s, 22, 9, 3, 3, '#ffe27a'); put(s, 17, 10, '#222'); put(s, 23, 10, '#222');
  ell(s, 20, 15, 3, 2, '#8a6ab0'); put(s, 19, 15, '#222'); put(s, 21, 15, '#222'); put(s, 18, 17, '#fff'); put(s, 22, 17, '#fff');
  put(s, 20, 20, '#ff4a4a'); put(s, 19, 21, '#4ad0ff'); put(s, 21, 21, '#6aff6a'); put(s, 20, 22, '#ffe27a');
  outline(s, OL); return s;
};

function hero(look) {
  const L = Object.assign({ skin: '#f2c7a0', hair: '#5a3a22', style: 'short', helm: 'none', armor: '#4a8fb8', trim: '#e8b64c', cape: null, weapon: 'staff', boots: '#5a3a22' }, look);
  const s = mk(26, 30), cx = 11, pants = dk(L.armor, .4);
  rect(s, cx - 5, 23, 4, 4, pants); rect(s, cx + 1, 23, 4, 4, pants);
  rect(s, cx - 5, 27, 4, 3, L.boots); rect(s, cx + 1, 27, 4, 3, L.boots); rect(s, cx - 5, 27, 4, 1, lt(L.boots, .25)); rect(s, cx + 1, 27, 4, 1, lt(L.boots, .25));
  rect(s, cx - 5, 13, 11, 10, L.armor); rect(s, cx - 5, 13, 3, 10, lt(L.armor, .2)); rect(s, cx + 3, 13, 3, 10, dk(L.armor, .2));
  rect(s, cx - 5, 21, 11, 1, L.trim);
  rect(s, cx - 7, 13, 3, 3, lt(L.armor, .15)); rect(s, cx + 5, 13, 3, 3, dk(L.armor, .1)); rect(s, cx - 7, 13, 3, 1, L.trim); rect(s, cx + 5, 13, 3, 1, L.trim);
  rect(s, cx - 7, 16, 2, 6, dk(L.armor, .1)); rect(s, cx + 6, 16, 2, 6, dk(L.armor, .2));
  rect(s, cx - 7, 22, 2, 2, L.skin); rect(s, cx + 6, 22, 2, 2, L.skin);
  if (L.cape) {
    rect(s, cx - 5, 14, 11, 13, L.cape); rect(s, cx - 5, 14, 2, 13, lt(L.cape, .2)); rect(s, cx + 4, 14, 2, 13, dk(L.cape, .25));
    rect(s, cx - 5, 26, 11, 1, L.trim); line(s, cx, 15, cx, 25, dk(L.cape, .2));
  }
  rect(s, cx - 1, 11, 3, 3, L.skin);
  if (L.style === 'long') rect(s, cx - 5, 9, 11, 8, L.hair);
  if (L.style === 'pony') { rect(s, cx - 1, 11, 3, 9, L.hair); rect(s, cx - 1, 11, 3, 1, L.trim); }
  sdisc(s, cx, 7, 5, L.hair);
  put(s, cx - 6, 8, L.skin); put(s, cx + 6, 8, L.skin);
  if (L.style === 'spiky') { tri(s, cx - 3, 0, 4, 1, L.hair); tri(s, cx, -1, 3, 1, L.hair); tri(s, cx + 3, 0, 4, 1, L.hair); }
  if (L.style === 'bun') sdisc(s, cx, 1, 2, L.hair);
  if (L.helm === 'hood') { sdisc(s, cx, 7, 6, L.armor); rect(s, cx - 6, 9, 13, 4, L.armor); rect(s, cx - 6, 12, 13, 1, L.trim); }
  if (L.helm === 'helm' || L.helm === 'horn') {
    sell(s, cx, 6, 6, 5, '#aeb8c4'); rect(s, cx, 1, 1, 10, L.trim); rect(s, cx - 6, 10, 13, 2, '#8e9aa6'); rect(s, cx - 6, 10, 13, 1, '#c8d0da');
  }
  if (L.helm === 'horn') { line(s, cx - 6, 6, cx - 9, 1, '#f4efe0'); line(s, cx - 6, 5, cx - 8, 1, '#d8d0bc'); line(s, cx + 6, 6, cx + 9, 1, '#f4efe0'); line(s, cx + 6, 5, cx + 8, 1, '#d8d0bc'); }
  const wood = '#a8763c', steel = '#dfe6ec';
  if (L.weapon === 'staff') { tline(s, cx + 9, 28, cx + 9, 6, wood, '#74491f'); disc(s, cx + 9, 4, 3, '#6a42e8'); put(s, cx + 8, 3, '#e6d9ff'); }
  if (L.weapon === 'bow') {
    for (let a = -62; a <= 62; a += 3) { const t = a * Math.PI / 180; put(s, cx + 3 + 11 * Math.cos(t), 17 + 11 * Math.sin(t), wood); put(s, cx + 4 + 11 * Math.cos(t), 17 + 11 * Math.sin(t), '#74491f'); }
    line(s, cx + 8, 8, cx + 8, 26, '#efe6c8');
  }
  if (L.weapon === 'dagger') { rect(s, cx + 6, 12, 2, 10, steel); rect(s, cx + 7, 12, 1, 10, '#8e9aa6'); rect(s, cx + 5, 22, 4, 1, L.trim); }
  if (L.weapon === 'sword') {
    rect(s, cx + 6, 8, 2, 14, steel); rect(s, cx + 7, 8, 1, 14, '#8e9aa6'); rect(s, cx + 5, 22, 4, 1, L.trim);
    poly(s, [[cx - 12, 16], [cx - 6, 16], [cx - 6, 22], [cx - 9, 26], [cx - 12, 22]], '#3a6ea5'); rect(s, cx - 12, 16, 7, 1, L.trim); rect(s, cx - 10, 18, 3, 1, '#f0f4f8'); rect(s, cx - 9, 17, 1, 6, '#f0f4f8');
  }
  if (L.weapon === 'crossbow') { rect(s, cx - 6, 17, 12, 2, '#8a5a2b'); rect(s, cx - 7, 13, 2, 10, wood); rect(s, cx - 6, 14, 12, 1, '#efe6c8'); }
  outline(s, OL);
  return s;
}

function stamp(s, spr, ox, oy, k, o) {
  const opt = o || {};
  for (let y = 0; y < spr.h; y++) for (let x = 0; x < spr.w; x++) {
    const v = spr.d[y * spr.w + x]; if (!v) continue;
    if (opt.ghost && ((x + y) & 1)) continue;
    const c = opt.ghost ? '#9fd8ff' : opt.angry ? tint(v) : v;
    for (let j = 0; j < k; j++) for (let i = 0; i < k; i++) put(s, ox + x * k + i, oy + y * k + j, c);
  }
}

function battle() {
  const W = 160, H = 96, s = mk(W, H), R = rng(23);
  sky(s, ['#1b0b14', '#5a1c1c', '#d0501f'], 0, 44);
  for (let i = 0; i < 40; i++) put(s, Math.floor(R() * W), Math.floor(R() * 38), i % 3 ? '#8a7a7a' : '#ff9f3c');
  tri(s, 24, 14, 44, 30, '#241216'); rect(s, 18, 14, 13, 2, '#ff6a2e'); rect(s, 21, 14, 7, 1, '#ffe27a');
  tri(s, 138, 24, 44, 22, '#2a1618'); rect(s, 133, 24, 11, 1, '#ff6a2e');
  sky(s, ['#1d1316', '#2f2226', '#46343c'], 44, H);
  for (let k = 0; k < 8; k++) { const y = Math.round(44 + (H - 44) * Math.pow(k / 7, 1.7)); line(s, 0, y, W - 1, y, '#15100f'); }
  for (let xb = -80; xb <= 240; xb += 24) line(s, 80 + (xb - 80) * .25, 44, xb, H - 1, '#15100f');
  [[8, 58, 26, 62], [128, 50, 152, 55], [140, 88, 158, 82], [2, 80, 16, 86]].forEach(([a, b, c, d]) => { line(s, a, b, c, d, '#ff6a2e'); line(s, a, b + 1, c, d + 1, '#7a2a1a'); });
  for (let y = 60; y <= 90; y++) {
    const t = (y - 60) / 30, xl = Math.round(56 - 16 * t), xr = Math.round(106 + 16 * t);
    for (let x = xl; x <= xr; x++) if (((x + y) & 1) === 0) put(s, x, y, '#d83a3a');
    put(s, xl, y, '#ff8a6a'); put(s, xr, y, '#ff8a6a');
  }
  line(s, 56, 60, 106, 60, '#ff8a6a');
  ell(s, 80, 61, 32, 4, '#120a0c');
  stamp(s, M.wolf(), 40, -2, 2);

  const mates = [
    { x: 90, y: 74, look: { armor: '#9aa6b2', helm: 'helm', weapon: 'sword', hair: '#5a3a22' } },
    { x: 22, y: 78, look: { armor: '#6a4aa8', helm: 'hood', weapon: 'staff' } },
    { x: 134, y: 80, look: { armor: '#5fae45', style: 'spiky', hair: '#e8b64c', weapon: 'bow', boots: '#3a5a2a' } },
    { x: 62, y: 88, look: { armor: '#3e9a96', helm: 'horn', cape: '#c0392b', weapon: 'dagger', hair: '#2a1b10' }, me: true }
  ];
  mates.forEach(m => ell(s, m.x, m.y, 8, 2, '#120a0c'));
  stamp(s, hero(mates[2].look), 112 - 11, 80 - 30, 1, { ghost: true });
  line(s, 114, 64, 126, 64, '#bfe8ff'); line(s, 112, 68, 124, 68, '#bfe8ff'); line(s, 114, 72, 126, 72, '#bfe8ff');
  mates.forEach(m => {
    stamp(s, hero(m.look), m.x - 11, m.y - 30, 1);
    if (m.me) {
      for (let a = 0; a < 360; a += 5) put(s, m.x + 11 * Math.cos(a * Math.PI / 180), m.y + 3 * Math.sin(a * Math.PI / 180), '#ffd24a');
      rect(s, m.x - 2, m.y - 40, 5, 1, '#ffd24a'); rect(s, m.x - 1, m.y - 39, 3, 1, '#ffd24a'); put(s, m.x, m.y - 38, '#ffd24a');
    }
  });
  for (let a = 200; a <= 340; a += 5) put(s, 90 + 14 * Math.cos(a * Math.PI / 180), 60 + 14 * Math.sin(a * Math.PI / 180), '#9fd8ff');
  [[13, 52], [30, 50], [26, 58], [10, 60], [36, 55]].forEach(([x, y], i) => spark(s, x, y, '#e6d9ff', i % 2 ? '#9d80ff' : '#6a42e8'));
  return s;
}

const GRIDS = { weapon: W, region: RG, monster: M };
const cache = {};
function grid(kind, key) {
  const id = kind + ':' + key;
  return cache[id] || (cache[id] = kind === 'portal' ? portal() : kind === 'hunter' ? hunter() : kind === 'battle' ? battle() : GRIDS[kind][key]());
}
return {
  canvas: (kind, key, scale, angry) => blit(grid(kind, key), scale, !!angry),
  hero: (look, scale) => blit(hero(look), scale, false),
  width: (kind, key) => grid(kind, key).w
};
})();
