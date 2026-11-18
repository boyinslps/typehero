/* 第 6 步：村莊延伸地圖（32×22 格）、兩個方向捲動的鏡頭、小地圖傳送、posV 存檔位置、熱區不重疊。
   版面與座標的檢查都在瀏覽器裡跑（VILLAGE.blocked 是畫地圖時才算出來的）。 */
const { chromium } = require('playwright'); const fs = require('fs');
const path = require('path'); const M = path.join(__dirname, 'mock') + '/'; const OUT = process.argv[2] || require('os').tmpdir();
const css = require('./tw.js')(OUT);
/* 最新一則改版公告的 id：發新公告時不用回來改測試（「已讀」的種子資料要等於它，不然會跳公告、冒「！」） */
const NOTICE_ID = /export const NOTICES = \[\s*\{ id: '([^']+)'/.exec(fs.readFileSync(path.join(__dirname, '../../nw-data.js'), 'utf8'))[1];
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const ID = '五年級3班_5號';

async function open(browser, o = {}) {
  const p = await browser.newPage({ viewport: o.vp || { width: 1200, height: 900 } });
  const errs = []; p.on('dialog', d => d.accept());
  p.on('pageerror', e => errs.push('pageerror: ' + e.message));
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push('console: ' + m.text()); });
  const { sha256Hex } = await import('../../nw-access.js');
  const hash = await sha256Hex('Test-Pass_9!x');
  const seed = {
    ['mg_scores/' + ID]: { className: '五年級3班', seat: 5, name: '小明', bestLevel: 10, bestScore: 20, scoreVer: 2, plays: 9, tutorialDone: true, talentIntroDone: true, tier: 'B', balanceVer: 3, punctDone: true,
      nw: Object.assign({ v: 1, savedAt: 5, look: { style: 1, hair: 2, skin: 1 }, starter: 'dagger', quest: { done: ['1-0', '1-0a'] }, items: { potion: 3 }, intro: { hub: 1 }, seenNotice: NOTICE_ID, nick: ['a_flash', 'b_coo'] }, o.nw || {}) }
  };
  await p.addInitScript(a => {
    window.__FS = a.s; window.__RULES = true; localStorage.clear(); localStorage.setItem('mg_nw_fast', '1');
    window.__NW_CODE_HASH__ = a.hash; localStorage.setItem('mg_nw_code', a.hash); window.__NW_NOGIFT__ = true; window.__NW_NOINTRO__ = true;
    window.confetti = () => {}; window.html2canvas = async () => document.createElement('canvas');
  }, { s: seed, hash });
  await p.route('**/*', r => {
    const u = r.request().url();
    if (u.startsWith('http://localhost')) return r.continue();
    if (u.includes('cdn.tailwindcss.com')) return r.fulfill({ contentType: 'application/javascript', body: `const s=document.createElement('style');s.textContent=${JSON.stringify(css)};document.head.appendChild(s);` });
    const m = u.includes('firebase-app') ? 'app.js' : u.includes('firebase-auth') ? 'auth.js' : u.includes('firebase-firestore') ? 'fs.js' : null;
    if (m) return r.fulfill({ contentType: 'application/javascript', body: fs.readFileSync(M + m, 'utf8') });
    return r.abort();
  });
  await p.goto('http://localhost:8765/index.html'); await p.waitForFunction(() => window.__NWG, null, { timeout: 15000 }); await p.waitForTimeout(500);
  await p.selectOption('#in-grade', '五年級'); await p.selectOption('#in-class', '3班'); await p.fill('#in-seat', '5'); await p.waitForTimeout(900);
  await p.click('#btn-enter'); await p.waitForTimeout(1000);
  p.errs = errs;
  await p.click('#nw-door'); await p.waitForFunction(() => window.__NWV, null, { timeout: 8000 }); await p.waitForTimeout(500);
  return p;
}
const pos = p => p.evaluate(() => window.__NWV.pos());
const same = (a, b) => a[0] === b[0] && a[1] === b[1];
/* 小地圖上第 (tx,ty) 格中心的螢幕座標 */
const miniXY = (p, tx, ty) => p.evaluate(([tx, ty]) => { const c = document.querySelector('#nw-minimap'), r = c.getBoundingClientRect(), s = +c.dataset.s; return [r.left + tx * s, r.top + ty * s]; }, [tx, ty]);
const rectsOverlap = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;

(async () => {
  const D = await import('../../nw-data.js');
  const b = await chromium.launch();

  /* ── 純函式：舊座標處理 ── */
  ok(D.normalizeNw({ pos: [3, 3] }).pos === undefined && D.normalizeNw({ pos: [3, 3], posV: 1 }).pos === undefined, 'normalizeNw：沒有 posV 或 posV 不是 2 的座標丟掉');
  ok(JSON.stringify(D.normalizeNw({ pos: [3, 3], posV: 2 }).pos) === '[3,3]' && D.normalizeNw({ pos: 'x', posV: 2 }).pos === undefined, 'normalizeNw：posV 是 2 的座標留著、壞掉的丟掉');

  /* ── 桌機 1200×900 ── */
  {
    const p = await open(b);
    const V = D.VILLAGE;
    ok(V.cols === 32 && V.rows === 22, '地圖 32×22 格');
    ok((await p.$$('.vb')).length === 12, '10 棟建築＋傳送門＋郵筒都有熱區');

    /* 地圖資料：走得到、不重疊、出生點三步內 */
    const geo = await p.evaluate(async () => {
      const D = await import('./nw-data.js'), V = D.VILLAGE, bl = V.blocked, key = (x, y) => x + ',' + y;
      const walk = (x, y) => x >= 0 && y >= 0 && x < V.cols && y < V.rows && !bl.has(key(x, y));
      const dist = new Map([[key(...V.start), 0]]), q = [V.start];
      for (let i = 0; i < q.length; i++) { const [x, y] = q[i]; for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) { const nx = x + dx, ny = y + dy; if (walk(nx, ny) && !dist.has(key(nx, ny))) { dist.set(key(nx, ny), dist.get(key(x, y)) + 1); q.push([nx, ny]); } } }
      const mb = V.decor.find(d => d.k === 'mailbox');
      const out = { door: {}, startWalk: walk(...V.start), gate: dist.get(key(...V.gate.approach)), mail: dist.get(key(mb.x, mb.y + 1)), npc: V.npcs.map(n => [n.id, walk(n.x, n.y)]), overlap: [], doorBlocked: [] };
      V.buildings.forEach(b => { const d = D.doorTile(b); out.door[b.id] = dist.get(key(d[0], d[1])); if (bl.has(key(d[0], d[1]))) out.doorBlocked.push(b.id); });
      /* 建築 3×3 腳印、門口格、郵筒、傳送門擋住的格，兩兩不能重疊 */
      const boxes = V.buildings.map(b => ({ id: b.id, x0: b.x, y0: b.y, x1: b.x + 2, y1: b.y + 2 }));
      const gb = V.gateBlock; boxes.push({ id: 'gate', x0: gb.x0, y0: gb.y0, x1: gb.x1, y1: gb.y1 });
      boxes.push({ id: 'mail', x0: mb.x, y0: mb.y, x1: mb.x, y1: mb.y });
      const doors = V.buildings.map(b => { const d = D.doorTile(b); return { id: 'door:' + b.id, x0: d[0], y0: d[1], x1: d[0], y1: d[1] }; });
      doors.push({ id: 'door:mail', x0: mb.x, y0: mb.y + 1, x1: mb.x, y1: mb.y + 1 });
      const all = boxes.concat(doors);
      for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) { const a = all[i], c = all[j]; if (a.id.startsWith('door:') && c.id.startsWith('door:')) continue; if (a.x0 <= c.x1 && a.x1 >= c.x0 && a.y0 <= c.y1 && a.y1 >= c.y0) out.overlap.push(a.id + '×' + c.id); }
      return out;
    });
    ok(geo.startWalk, '出生點站得到');
    ok(Object.values(geo.door).every(v => v !== undefined) && !geo.doorBlocked.length, '每棟建築（含還沒開的）門口都走得到：' + JSON.stringify(geo.door));
    ok(geo.gate !== undefined && geo.mail !== undefined && geo.npc.every(n => n[1]), '傳送門前、郵筒前走得到，村民站的格不是障礙');
    ok(geo.door.board <= 3 && geo.door.notice <= 3, `出生點走到委託板 ${geo.door.board} 步、佈告欄 ${geo.door.notice} 步（不超過 3）`);
    ok(!geo.overlap.length, '建築、門口、郵筒、傳送門互不重疊：' + geo.overlap.join(','));
    const zoneOk = await p.evaluate(async () => { const V = (await import('./nw-data.js')).VILLAGE; const zs = Object.fromEntries(V.zones.map(z => [z.id, z])); const inZ = (b, z) => b.x >= z.x0 && b.x + 2 <= z.x1 && b.y >= z.y0 && b.y + 2 <= z.y1; const g = id => V.buildings.find(b => b.id === id);
      return inZ(g('rooms'), zs.plateau) && inZ(g('star'), zs.plateau) && inZ(g('rank'), zs.plateau) && inZ(g('academy'), zs.learn) && ['shop', 'armor', 'forge', 'storage'].every(i => inZ(g(i), zs.market)) && V.start[1] > V.plaza.y && V.gate.approach[1] > V.start[1]; });
    ok(zoneOk, '分區：高台（星圖台、榮譽碑、組隊酒館）、學習區（教學大樓）、市集（四家店）、出生點在廣場偏南、傳送門在更南');

    /* 熱區標籤彼此不重疊、也沒壓到別的熱區 */
    const labelCheck = async tag => {
      const r = await p.evaluate(() => {
        const hots = [...document.querySelectorAll('.vb')].map(h => ({ id: h.dataset.bld, r: h.getBoundingClientRect() }));
        const labels = [...document.querySelectorAll('.vb')].map(h => ({ id: h.dataset.bld, el: h.querySelector(':scope > span.px-text') })).filter(l => l.el && getComputedStyle(l.el).display !== 'none')
          .map(l => ({ id: l.id, r: l.el.getBoundingClientRect() }));
        const extra = [...document.querySelectorAll('[data-notice-bang]')].filter(e => getComputedStyle(e).display !== 'none').map(e => ({ id: 'bang', r: e.getBoundingClientRect() }));
        const bad = [], O = (a, c) => a.left < c.right && a.right > c.left && a.top < c.bottom && a.bottom > c.top;
        labels.concat(extra).forEach((a, i, arr) => {
          arr.slice(i + 1).forEach(c => { if (O(a.r, c.r)) bad.push(a.id + '標籤×' + c.id + '標籤'); });
          hots.forEach(h => { if (h.id !== a.id && !(a.id === 'bang' && h.id === 'notice') && O(a.r, h.r)) bad.push(a.id + '標籤×' + h.id + '熱區'); });
        });
        return { n: labels.length, bad };
      });
      ok(r.n === 12 && !r.bad.length, `${tag}：${r.n} 個名牌互不重疊、沒壓到別的熱區 ${r.bad.join(',')}`);
    };
    await labelCheck('桌機（倍率 4）');

    /* 鏡頭：兩個方向都能捲，不出界 */
    const cam = () => p.evaluate(() => { const h = document.querySelector('#vmap'); return { l: h.scrollLeft, t: h.scrollTop, mw: h.scrollWidth - h.clientWidth, mh: h.scrollHeight - h.clientHeight, cw: h.clientWidth, ch: h.clientHeight, sw: h.scrollWidth, sh: h.scrollHeight }; });
    let c0 = await cam();
    const sc = await p.evaluate(() => Math.round(document.querySelector('#vmap canvas').getBoundingClientRect().width / 512));
    ok(sc === 4, '桌機倍率是整數 4：' + sc);
    ok(c0.mw > 0 && c0.mh > 0, `地圖容器橫向、直向都能捲（可捲 ${c0.mw}×${c0.mh}）`);
    ok(c0.ch < c0.sh && c0.cw < c0.sw, '地圖沒有被縮成一個畫面');
    ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), '頁面沒有橫向捲動');
    await p.screenshot({ path: OUT + '/nw10-desktop.png' });
    await p.keyboard.down('d'); await p.waitForTimeout(500); await p.keyboard.up('d'); await p.waitForTimeout(700);
    let c1 = await cam();
    ok(c1.l > c0.l + 20, `往右走：鏡頭橫向跟著動（${c0.l} → ${c1.l}）`);
    await p.keyboard.down('w'); await p.waitForTimeout(350); await p.keyboard.up('w'); await p.waitForTimeout(700);
    let c2 = await cam();
    ok(c2.t < c1.t - 20, `往上走：鏡頭直向跟著動（${c1.t} → ${c2.t}）`);
    ok([c0, c1, c2].every(c => c.l >= 0 && c.t >= 0 && c.l <= c.mw + 1 && c.t <= c.mh + 1), '鏡頭沒有出界');

    /* 小地圖 */
    const mm = await p.evaluate(() => { const r = document.querySelector('#nw-minimap').getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height, s: +document.querySelector('#nw-minimap').dataset.s }; });
    ok(mm.w === 32 * mm.s && mm.h === 22 * mm.s && 1200 - mm.r < 20 && 900 - mm.b < 20, `小地圖在右下角（${mm.w}×${mm.h}，倍率 ${mm.s}）`);
    ok(await p.evaluate(() => getComputedStyle(document.querySelector('#nw-minimap-wrap')).position) === 'fixed', '小地圖是固定的（不跟著捲）');
    const tpOk = [];
    for (const bd of V.buildings) {
      const [x, y] = await miniXY(p, bd.x + 1.5, bd.y + 1.5);
      await p.mouse.click(x, y); await p.waitForTimeout(150);
      const d = D.doorTile(bd), ps = await pos(p);
      if (!same(ps, d)) tpOk.push(`${bd.id}:${ps}≠${d}`);
    }
    ok(!tpOk.length, '點小地圖上每一棟建築都傳送到它的門口：' + tpOk.join(' '));
    ok(!(await p.$('#nw-acad, #nw-bag, #nw-notice, #nw-intro, .nw-sheet')), '傳送後停在門口，不會自動打開');
    ok((await p.evaluate(() => [...document.querySelectorAll('#vmap .px-panel')].map(e => e.textContent).join('|'))).includes('進入「'), '停在門口時，旁邊的提示寫著 Enter：進入…');
    /* 傳送後鏡頭跟過去、不出界；左上、右下的建築碰到邊緣就停 */
    const [ax, ay] = await miniXY(p, 4.5, 13.5); await p.mouse.click(ax, ay); await p.waitForTimeout(200);
    let ce = await cam();
    ok(ce.l === 0, `傳送到最左邊的教學大樓：鏡頭碰到左邊就停（scrollLeft ${ce.l}）`);
    const [rx, ry] = await miniXY(p, 26.5, 3.5); await p.mouse.click(rx, ry); await p.waitForTimeout(200);
    ce = await cam();
    ok(Math.abs(ce.l - ce.mw) <= 1 && ce.t < ce.mh, `傳送到右上角的榮譽碑：鏡頭停在右緣（${ce.l}/${ce.mw}）`);
    await p.keyboard.down('d'); await p.waitForTimeout(110); await p.keyboard.up('d');
    await p.keyboard.down('w'); await p.waitForTimeout(900); await p.keyboard.up('w'); await p.waitForTimeout(700);
    ce = await cam();
    ok(ce.t === 0, `往北走到高台最上面：鏡頭碰到上緣就停（scrollTop ${ce.t}）`);
    const [sx, sy] = await miniXY(p, 29.5, 17.5); await p.mouse.click(sx, sy); await p.waitForTimeout(200);
    ce = await cam();
    ok(Math.abs(ce.l - ce.mw) <= 1 && Math.abs(ce.t - ce.mh) <= 1, `傳送到右下角的倉庫：鏡頭停在右下緣（${ce.l}/${ce.mw}，${ce.t}/${ce.mh}）`);
    /* 點空地、傳送門：不動 */
    const before = await pos(p);
    for (const [tx, ty] of [[2, 1], [20, 9], [16, 20.5], [12, 11.5]]) { const [x, y] = await miniXY(p, tx, ty); await p.mouse.click(x, y); await p.waitForTimeout(100); }
    ok(same(before, await pos(p)), '點小地圖的空地、傳送門、郵筒：角色不動');

    /* 捲動後點地面，角色走到那一格 */
    await p.evaluate(() => window.__NWV.teleport('board')); await p.waitForTimeout(300);
    const clickTile = async (tx, ty) => { const r = await p.evaluate(() => { const c = document.querySelector('#vmap canvas').getBoundingClientRect(); return [c.left, c.top]; }); await p.mouse.click(r[0] + (tx * 16 + 8) * 4, r[1] + (ty * 16 + 8) * 4); };
    const pickTile = (dx, dy) => p.evaluate(async ([dx, dy]) => {
      const V = (await import('./nw-data.js')).VILLAGE, [px, py] = window.__NWV.pos(), h = document.querySelector('#vmap'), c = document.querySelector('#vmap canvas').getBoundingClientRect(), hr = h.getBoundingClientRect();
      const far = (x, y) => V.buildings.every(b => x < b.x - 2 || x > b.x + 4 || y < b.y - 2 || y > b.y + 4) && Math.hypot(x - V.plaza.x, y - V.plaza.y) > 3 && Math.hypot(x - V.gate.x, y - 19) > 3;
      const mb = V.decor.find(d => d.k === 'mailbox');
      for (let r = 1; r < 8; r++) for (const [sx, sy] of [[dx, dy], [-dx, dy], [dx, -dy], [-dx, -dy]]) {
        const x = px + sx * r, y = py + sy * r, sxp = c.left + (x * 16 + 8) * 4, syp = c.top + (y * 16 + 8) * 4;
        if (x < 0 || y < 0 || x >= V.cols || y >= V.rows || V.blocked.has(x + ',' + y) || !far(x, y) || Math.abs(x - mb.x) < 2 && Math.abs(y - mb.y) < 3) continue;
        if (sxp > hr.left + 20 && sxp < hr.right - 20 && syp > hr.top + 20 && syp < hr.bottom - 20) return [x, y];
      }
      return null;
    }, [dx, dy]);
    for (const [label, dx, dy] of [['出生點附近', 2, 0], ['往下', 0, 2]]) {
      const t = await pickTile(dx, dy);
      if (!t) { ok(false, label + '找不到可以點的格子'); continue; }
      await clickTile(t[0], t[1]); await p.waitForTimeout(1200);
      ok(same(await pos(p), t), `捲動後點地面（${label}）：角色走到點的那一格 ${t}`);
    }
    await p.evaluate(() => window.__NWV.teleport('rank')); await p.waitForTimeout(300);
    {
      const t = await pickTile(0, 2) || await pickTile(2, 0);
      if (!t) ok(false, '高台找不到可以點的格子');
      else { await clickTile(t[0], t[1]); await p.waitForTimeout(1200); ok(same(await pos(p), t), `鏡頭停在右上緣時點地面：角色走到 ${t}`); }
    }

    /* 站在郵筒、傳送門前：Enter 提示不壓到郵筒與別的熱區 */
    const mb = V.decor.find(d => d.k === 'mailbox');
    const promptCheck = async (tag, tile) => {
      await p.evaluate(t => window.__NWV.walkTo(t), tile); await p.waitForTimeout(2200);
      const r = await p.evaluate(() => {
        const pr = [...document.querySelectorAll('#vmap .px-panel')].find(e => e.textContent.startsWith('Enter：') && getComputedStyle(e).display !== 'none');
        if (!pr) return { none: true };
        const a = pr.getBoundingClientRect(), O = c => a.left < c.right && a.right > c.left && a.top < c.bottom && a.bottom > c.top, bad = [];
        document.querySelectorAll('.vb').forEach(h => { if (O(h.getBoundingClientRect())) bad.push(h.dataset.bld); const l = h.querySelector(':scope > span.px-text'); if (l && getComputedStyle(l).display !== 'none' && O(l.getBoundingClientRect())) bad.push(h.dataset.bld + '標籤'); });
        return { text: pr.textContent, bad };
      });
      ok(!r.none && !r.bad.length, `${tag}：「${r.text}」沒壓到熱區與名牌 ${(r.bad || []).join(',')}`);
    };
    await promptCheck('站在郵筒前', [mb.x, mb.y + 1]);
    await promptCheck('站在傳送門前', V.gate.approach);
    const badDoors = [];
    for (const bd of V.buildings) {
      await p.evaluate(id => window.__NWV.teleport(id), bd.id); await p.waitForTimeout(120);
      const r = await p.evaluate(() => {
        const pr = [...document.querySelectorAll('#vmap .px-panel')].find(e => e.textContent.startsWith('Enter：') && getComputedStyle(e).display !== 'none');
        if (!pr) return ['沒有提示'];
        const a = pr.getBoundingClientRect(), O = c => a.left < c.right && a.right > c.left && a.top < c.bottom && a.bottom > c.top, bad = [];
        document.querySelectorAll('.vb').forEach(h => { if (O(h.getBoundingClientRect())) bad.push(h.dataset.bld); });
        return bad;
      });
      if (r.length) badDoors.push(bd.id + ':' + r.join('/'));
    }
    ok(!badDoors.length, '站在每棟建築門口：Enter 提示不壓到任何熱區 ' + badDoors.join(' '));

    /* 有視窗蓋著時，小地圖不能點（用程式送 click，避免被視窗擋住而點不到） */
    await p.evaluate(() => window.__NWV.teleport('board'));
    await p.click('[data-act="bagopen"]'); await p.waitForSelector('#nw-bag'); await p.waitForTimeout(300);
    const posBag = await pos(p);
    const tgt = V.buildings.find(x => x.id === 'academy'), [qx, qy] = await miniXY(p, tgt.x + 1.5, tgt.y + 1.5);
    await p.evaluate(([x, y]) => document.querySelector('#nw-minimap').dispatchEvent(new MouseEvent('click', { clientX: x, clientY: y, bubbles: true })), [qx, qy]);
    await p.waitForTimeout(200);
    ok(same(posBag, await pos(p)), '背包開著：點小地圖不會傳送');
    await p.evaluate(() => document.querySelector('[data-bag-close]').click()); await p.waitForTimeout(300);
    await p.mouse.click(qx, qy); await p.waitForTimeout(200);
    ok(same(await pos(p), D.doorTile(tgt)), '關掉背包後小地圖又能傳送');
    for (const sel of ['[data-act="notice"]']) {
      await p.evaluate(() => window.__NWV.teleport('board'));
      await p.click(sel); await p.waitForSelector('#nw-notice'); await p.waitForTimeout(300);
      const pp = await pos(p);
      await p.evaluate(([x, y]) => document.querySelector('#nw-minimap').dispatchEvent(new MouseEvent('click', { clientX: x, clientY: y, bubbles: true })), [qx, qy]);
      await p.waitForTimeout(200);
      ok(same(pp, await pos(p)), '佈告欄視窗開著：點小地圖不會傳送');
      await p.click('#nw-notice [data-close]'); await p.waitForTimeout(300);
    }

    /* 存檔位置 */
    await p.evaluate(() => window.__NWV.teleport('board'));
    await p.click('.vb[data-bld="board"]'); await p.waitForSelector('#nwbd-board', { timeout: 6000 }); await p.waitForTimeout(300);
    const nw = await p.evaluate(() => JSON.parse(JSON.stringify(window.__NWG.nw)));
    ok(nw.posV === 2 && same(nw.pos, [12, 17]), '進委託板：NW.pos 存門口前一格、NW.posV = 2：' + JSON.stringify([nw.pos, nw.posV]));
    ok(!p.errs.length, '桌機沒有 JS 錯誤 ' + p.errs.join(' | '));
    await p.close();
  }

  /* ── 全地圖拍一張，看配置 ── */
  {
    const p = await open(b);
    const data = await p.evaluate(() => document.querySelector('#vmap canvas').toDataURL('image/png').split(',')[1]);
    fs.writeFileSync(OUT + '/nw10-map.png', Buffer.from(data, 'base64'));
    await p.close();
  }

  /* ── 舊座標回出生點 ── */
  for (const [label, nw, expect] of [
    ['沒有 posV 的舊座標 [5,5]', { pos: [5, 5] }, D.VILLAGE.start],
    ['posV 是 1 的舊座標 [3,12]', { pos: [3, 12], posV: 1 }, D.VILLAGE.start],
    ['posV 是 2 的新座標 [12,17]', { pos: [12, 17], posV: 2 }, [12, 17]]
  ]) {
    const p = await open(b, { nw });
    ok(same(await pos(p), expect), `${label}：站在 ${expect}`);
    await p.close();
  }

  /* ── 地板箭頭：目標很遠也要指得對 ── */
  {
    const p = await open(b, { nw: { quest: { done: ['1-0'] } } });
    await p.waitForTimeout(600);
    const g = await p.evaluate(async () => { const D = await import('./nw-data.js'), a = D.VILLAGE.buildings.find(x => x.id === 'academy'), path = window.__NWV.guidePath(), d = D.doorTile(a), [px, py] = window.__NWV.pos(); return { n: path.length, last: path[path.length - 1], d, first: path[0], p: [px, py], bl: path.some(c => D.VILLAGE.blocked.has(c[0] + ',' + c[1])) }; });
    ok(g.n >= 10 && same(g.last, g.d) && Math.abs(g.first[0] - g.p[0]) + Math.abs(g.first[1] - g.p[1]) === 1 && !g.bl, `地板箭頭：教學大樓在 ${g.n} 步外，路一格一格接到門口、不穿牆`);
    await p.evaluate(() => window.__NWV.teleport('rank')); await p.waitForTimeout(700);
    const g2 = await p.evaluate(async () => { const D = await import('./nw-data.js'), path = window.__NWV.guidePath(); return { n: path.length, last: path[path.length - 1], d: D.doorTile(D.VILLAGE.buildings.find(x => x.id === 'academy')) }; });
    ok(g2.n >= 30 && same(g2.last, g2.d), `從最遠的角落也算得出路（${g2.n} 步）`);
    await p.close();
  }

  /* ── 手機 390×844 ── */
  {
    const p = await open(b, { vp: { width: 390, height: 844 } });
    const sc = await p.evaluate(() => Math.round(document.querySelector('#vmap canvas').getBoundingClientRect().width / 512));
    ok(sc === 2, '手機倍率是整數 2：' + sc);
    ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.body.scrollWidth <= innerWidth && document.querySelector('#nw-root').scrollWidth <= document.querySelector('#nw-root').clientWidth), '手機：頁面沒有橫向捲到畫面外');
    const h = await p.evaluate(() => { const e = document.querySelector('#vmap'); return [e.scrollWidth > e.clientWidth, e.scrollHeight > e.clientHeight]; });
    ok(h[0] && h[1], '手機：地圖容器兩個方向都能捲');
    const r = await p.evaluate(() => {
      const m = document.querySelector('#nw-minimap').getBoundingClientRect(), O = c => m.left < c.right && m.right > c.left && m.top < c.bottom && m.bottom > c.top;
      const btns = [...document.querySelectorAll('#nw-root [data-act]')].filter(e => e.getBoundingClientRect().width > 0);
      return { in: m.left >= 0 && m.right <= innerWidth && m.top >= 0 && m.bottom <= innerHeight, hit: btns.filter(e => O(e.getBoundingClientRect())).map(e => e.dataset.act), n: btns.length, w: m.width, h: m.height };
    });
    ok(r.in && !r.hit.length && r.n >= 6, `手機：小地圖（${r.w}×${r.h}）在畫面內，沒擋住上方 ${r.n} 個按鈕 ${r.hit.join(',')}`);
    /* 小地圖不蓋住人物所在的畫面中央：出生點在地圖容器中央，離小地圖有一段 */
    const lab = await p.evaluate(() => {
      const hots = [...document.querySelectorAll('.vb')], O = (a, c) => a.left < c.right && a.right > c.left && a.top < c.bottom && a.bottom > c.top, bad = [];
      const labels = hots.map(h => ({ id: h.dataset.bld, r: h.querySelector(':scope > span.px-text').getBoundingClientRect() }));
      labels.forEach((a, i) => { labels.slice(i + 1).forEach(c => { if (O(a.r, c.r)) bad.push(a.id + '×' + c.id); }); hots.forEach(h => { if (h.dataset.bld !== a.id && O(a.r, h.getBoundingClientRect())) bad.push(a.id + '標籤×' + h.dataset.bld); }); });
      return bad;
    });
    ok(!lab.length, '手機（倍率 2）：名牌互不重疊、沒壓到別的熱區 ' + lab.join(','));
    const [x, y] = await miniXY(p, 4.5, 13.5); await p.mouse.click(x, y); await p.waitForTimeout(200);
    ok(same(await pos(p), D.doorTile(D.VILLAGE.buildings.find(q => q.id === 'academy'))), '手機：點小地圖的教學大樓，傳送到門口');
    await p.screenshot({ path: OUT + '/nw10-mobile.png' });
    ok(!p.errs.length, '手機沒有 JS 錯誤 ' + p.errs.join(' | '));
    await p.close();
  }

  await b.close();
  console.log(fails ? `\n${fails} 項失敗` : '\n全部通過');
  process.exit(fails ? 1 : 0);
})();
