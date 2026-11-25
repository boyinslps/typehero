/* 平衡 V2 第 9 步：流派（SPEC-BALANCE-V2 §3、§7 第 9 步；編號 nw23）。守護流（擋下／真的躲開 → 反擊魔物最大血量 5%）、藤蔓流（全對種藤蔓、每根每 10 秒 0.5%）、
   §3.4 防掛機（最近 40 秒內逐字打對才有效、流派傷害 ≤ 打字傷害、逃走時流派只算一半）、出發前選打法、教學大樓第 4 堂、結算提示、人物卡。旗標關（__NW_V2__=false）一律不生效。
   假時鐘：把 performance.now 加上 window.__tOff（毫秒）。戰鬥狀態用 localhost 專用的 window.__NWB。 */
const { chromium } = require('playwright'); const fs = require('fs');
const path = require('path'); const M = path.join(__dirname, 'mock') + '/'; const OUT = process.argv[2] || require('os').tmpdir();
const css = require('./tw.js')(OUT);
const NOTICE_ID = /export const NOTICES = \[\s*\{ id: '([^']+)'/.exec(fs.readFileSync(path.join(__dirname, '../../nw-data.js'), 'utf8'))[1];
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const ID = '五年級3班_5號', CLS = '五年級3班';

async function open(browser, o = {}) {
  const p = await browser.newPage({ viewport: { width: 1200, height: 900 } });
  const errs = []; p.on('dialog', d => d.accept());
  p.on('pageerror', e => errs.push('pageerror: ' + e.message));
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push('console: ' + m.text()); });
  const { sha256Hex } = await import('../../nw-access.js');
  const hash = await sha256Hex('Test-Pass_9!x');
  const seed = { ['mg_scores/' + ID]: { className: CLS, seat: 5, name: '小明', bestLevel: 10, bestScore: 20, scoreVer: 2, plays: 9, tutorialDone: true, talentIntroDone: true, tier: o.tier || 'B', balanceVer: 3, punctDone: true,
    nw: Object.assign({ v: 1, savedAt: 5, look: { style: 1, hair: 2, skin: 1 }, starter: 'dagger', hunts: 5, quest: { done: ['1-0', '1-0a'] }, zone: { grass: 5 }, dex: { coo: 1, frog: 1, shroom: 1 }, tm: { m_dodge: 1, m_defend: 1, m_attack: 1 }, intro: { hub: 1, notice: 1 }, seenNotice: NOTICE_ID, nameSet: 1 }, o.nw || {}) } };
  await p.addInitScript(a => {window.__NW_STAGES__ = ['1']; window.__BOARD_ROT__ = false; 
    window.__FS = a.s; window.__RULES = true; localStorage.clear(); localStorage.setItem('mg_nw_fast', '1');
    window.__NW_CODE_HASH__ = a.hash; localStorage.setItem('mg_nw_code', a.hash); window.__NW_NOGIFT__ = true; window.__NW_NOINTRO__ = true;
    window.confetti = () => {}; window.html2canvas = async () => document.createElement('canvas');
    window.__NW_STAGES__ = ['1', '2b']; if (typeof a.v2 === 'boolean') window.__NW_V2__ = a.v2;
    if (a.pattern) window.__NW_PATTERN__ = a.pattern;
    window.__NW_ATTACKS__ = []; window.__tOff = 0; const _n = performance.now.bind(performance); performance.now = () => _n() + window.__tOff;
  }, { s: seed, hash, v2: o.v2, pattern: o.pattern || null });
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
  await p.click('#nw-door'); await p.waitForFunction(() => window.__NWV, null, { timeout: 12000 }); await p.waitForTimeout(500);
  return p;
}

const goHunt = async (p, region, mon, star) => {
  await p.click('.vb[data-bld="board"]'); await p.waitForSelector('#nwbd-board');
  await p.click(`.qs[data-q="${region}:${mon}:${star || 1}"]`);
  await p.click('[data-go]'); await p.waitForSelector('[data-view="room"]');
  await p.click('[data-act="startroom"]'); await p.waitForTimeout(80);
};
const qText = p => p.$$eval('#nwb-q .zy-han', els => els.map(e => e.textContent).join(''));
async function answer(p, n = 1) { for (let i = 0; i < n; i++) { await p.fill('#nwb-in', await qText(p)); await p.waitForTimeout(480); await p.press('#nwb-in', 'Enter'); await p.waitForTimeout(80); } }
const jump = (p, sec) => p.evaluate(s => { window.__tOff = s * 1000; }, sec);
const runsOf = p => p.evaluate(() => Object.entries(window.__FS).filter(([k]) => k.startsWith('mg_nw_runs/')).map(([k, v]) => v));
const coins = p => p.evaluate(() => window.__NWG.nw.coins);
const exp = p => p.evaluate(() => window.__NWG.nw.hrExp + (window.__NWG.nw.hr - 1) * 1000);
const fails0 = p => p.evaluate(() => window.__NWG.nw.stat.fails);
/* 出發：這個版本的 goHunt 在按「出發」之前先設好出招（__NW_ATTACKS__／__NW_PATTERN__），而且不自己出招（nextCast 推到很遠），由測試手動排 */
const room = async (p, region, mon, star) => {
  await p.click('.vb[data-bld="board"]'); await p.waitForSelector('#nwbd-board');
  await p.click(`.qs[data-q="${region}:${mon}:${star || 1}"]`);
  await p.click('[data-go]'); await p.waitForSelector('[data-view="room"]');
};
const start = async (p, attacks) => {
  await p.evaluate(a => { window.__NW_ATTACKS__ = a; window.__NW_PATTERN__ = a.length ? a[0] : null; }, attacks || []);
  await p.click('[data-act="startroom"]'); await p.waitForFunction(() => window.__NWB, null, { timeout: 8000 }); await p.waitForTimeout(150);
  await p.evaluate(() => { window.__NWB.S.nextCast = 1e9; });   // 魔物不自己出招
};
const S = (p, f) => p.evaluate(`(() => { const S = window.__NWB.S; return (${f})(S); })()`);
/* 排一招：kind＝'slam'／'single'；lane＝單線打在哪一條（預設不是我站的那條）。回傳之前先讓它進入預警 */
const cast = async (p, kind, laneMode) => {
  await p.evaluate(k => { window.__NW_PATTERN__ = k; const S = window.__NWB.S; S.nextCast = 0; }, kind);
  await p.waitForFunction(() => window.__NWB.S.cast, null, { timeout: 5000 });
  await p.evaluate(m => { const S = window.__NWB.S; S.nextCast = 1e9; if (S.cast.strikes.length === 1 && !S.cast.strikes[0].slam) S.cast.strikes[0].lane = m === 'same' ? S.lane : (S.lane + 1) % 3; }, laneMode || 'other');
};
const nowOff = (p, to) => p.evaluate(t => { window.__tOff += (t - performance.now() / 1000) * 1000; }, to);
const toWarn = p => p.evaluate(() => { const c = window.__NWB.S.cast, w = Math.min(...c.strikes.map(x => x.warn)); window.__tOff += (w - performance.now() / 1000 + 0.15) * 1000; });
const toHit = p => p.evaluate(() => { const c = window.__NWB.S.cast; window.__tOff += (c.hitAt - performance.now() / 1000 + 0.2) * 1000; });
const settle = async p => { await p.waitForFunction(() => !window.__NWB.S.cast, null, { timeout: 5000 }); await p.waitForTimeout(100); };
const near = p => p.evaluate(() => { const c = window.__NWB.S.cast; window.__tOff += (c.hitAt - 0.5 - performance.now() / 1000) * 1000; });
/* 預警 → 出手前 0.5 秒（舉盾要在這時按，盾才罩得到出手）→ 出手。how＝'alt' 就按一下 Alt（盾 1.5 秒，守護流 2.0 秒） */
const block = async (p, how) => { await toWarn(p); await p.waitForTimeout(150); await near(p); await p.waitForTimeout(100); if (how === 'alt') { await p.keyboard.down('Alt'); await p.keyboard.up('Alt'); } await toHit(p); await settle(p); };
/* 打 n 題，每題打完把魔物補滿血（長題的詠唱會一下打死，結束了就不能繼續測）；傷害統計照記 */
const ans = async (p, n = 1) => { for (let i = 0; i < n; i++) { await answer(p, 1); await p.evaluate(() => { const S = window.__NWB.S; if (!S.over) S.mon.hp = S.mon.max; }); } };
const snap = p => S(p, 'S => ({ g: S.guards, f: S.dmgFlow, t: S.dmgType, v: S.vineN, hp: S.mon.hp, max: S.mon.max, over: S.over })');

(async () => {
  const D = await import('../../nw-data.js');
  const b = await chromium.launch();

  /* ── 純函式與常數：跟 tools/nw-sim/rules-v2.mjs 同名同值 ── */
  ok(D.FLOWS.guard.rho === 0.05 && D.FLOWS.guard.typeMul === 0.85 && D.FLOWS.guard.shield === 0.5 && D.FLOWS.vine.rho === 0.005 && D.FLOWS.vine.n === 4 && D.FLOWS.vine.every === 10 && D.FLOWS.vine.typeMul === 0.85, 'FLOWS 與規格同名同值（守護 5%／×0.85／盾 +0.5；藤蔓 0.5%／4 根／10 秒／×0.85）');
  const sim = await import('../nw-sim/rules-v2.mjs');
  ok(JSON.stringify(sim.FLOWS) === JSON.stringify(D.FLOWS), '模擬器 rules-v2.mjs 讀到的 FLOWS 就是遊戲端這一份');
  ok(D.flowOf({ flow: 'vine' }, true) === 'vine' && D.flowOf({ flow: 'vine' }, false) === '' && D.flowOf({ flow: 'x' }, true) === '' && D.flowOf({}, true) === '', 'flowOf：V2 沒開／沒選／亂寫都是空字串（一般打法）');
  ok(D.normalizeNw({ flow: 'bad', esc: [] }).flow === '' && D.normalizeNw({ flow: 'guard' }).flow === 'guard' && Object.keys(D.normalizeNw({ esc: [] }).esc).length === 0, 'normalizeNw：flow 只收 guard／vine，esc 一定是物件');

  /* ── 出發前選打法：入口 ── */
  {
    const p = await open(b, { v2: true });
    await room(p, 'grass', 'frog', 1);
    const btns = await p.$$eval('[data-flows] [data-flow]', els => els.map(e => e.dataset.flow));
    ok(JSON.stringify(btns) === JSON.stringify(['', 'guard', 'vine']), '出發前畫面有三個選項：一般打法、守護流、藤蔓流');
    const txt = await p.textContent('[data-flows]');
    ok(txt.includes('一般打法') && txt.includes('適合想練防禦的人') && txt.includes('適合不想被打斷的人') && !txt.includes('打字慢') && !txt.includes('弱'), '說明寫「適合想練防禦／不想被打斷」，不寫「打字慢」');
    ok(await p.$eval('[data-flow=""]', e => e.classList.contains('gold')), '沒選＝一般打法亮著');
    await p.click('[data-flow="guard"]');
    ok(await p.evaluate(() => window.__NWG.nw.flow) === 'guard' && await p.$eval('[data-flow="guard"]', e => e.classList.contains('gold')) && !(await p.$eval('[data-flow=""]', e => e.classList.contains('gold'))), '點守護流：記起來（NW.flow）、守護流亮起來');
    await p.click('[data-flow=""]');
    ok(await p.evaluate(() => window.__NWG.nw.flow) === '', '可以換回一般打法（隨時換）');
    await p.click('[data-flow="vine"]');
    await start(p, []);
    await p.waitForTimeout(200);
    ok(await p.$eval('#nwb-root', e => e.dataset.flow) === 'vine' && (await p.textContent('#nwb-flow')).includes('藤蔓'), '出發後戰鬥畫面寫著「藤蔓流」');
    ok(await S(p, 'S => S.vineN') === 0, '一開始 0 根');
    await answer(p, 3);
    await p.evaluate(() => { window.__tOff = 700000; }); await p.waitForSelector('#nw-result', { timeout: 8000 }); await p.waitForTimeout(800);
    const r = (await runsOf(p))[0];
    ok(r && r.flow === 'vine' && r.vines === 3, `mg_nw_runs 的 flow＝vine、vines＝3（${r && r.flow}／${r && r.vines}）`);
    ok(p.errs.length === 0, '沒有 JS 錯誤 ' + p.errs.join('|'));
    await p.close();
  }
  /* 不選：flow＝normal；旗標關：整個入口不見、戰鬥不受影響 */
  {
    const p = await open(b, { v2: true });
    await room(p, 'grass', 'coo', 1); await start(p, []);
    ok(!(await p.$eval('#nwb-root', e => e.dataset.flow)) && (await p.$eval('#nwb-flow', e => e.style.display)) === 'none', '沒選：戰鬥畫面沒有流派那一行');
    await answer(p, 3);
    await p.evaluate(() => { window.__tOff = 700000; }); await p.waitForSelector('#nw-result', { timeout: 8000 }); await p.waitForTimeout(800);
    const r = (await runsOf(p))[0];
    ok(r && r.flow === 'normal' && r.guards === 0 && r.vines === 0, 'mg_nw_runs 的 flow＝normal（沒選）');
    await p.close();
  }
  {
    const p = await open(b, { v2: false, nw: { flow: 'guard' } });
    ok(await p.evaluate(() => window.__NWG.nw.flow) === 'guard', '（旗標關）存檔裡有舊的 flow');
    await room(p, 'grass', 'coo', 1);
    ok(!(await p.$('[data-flows]')), '旗標關：出發前畫面沒有選打法');
    await start(p, []);
    ok(!(await p.$eval('#nwb-root', e => e.dataset.flow)) && (await p.$eval('#nwb-flow', e => e.style.display)) === 'none', '旗標關：存檔有 flow 也不生效，戰鬥照舊');
    await answer(p, 2);
    ok(await S(p, 'S => S.vineN + S.guards') === 0, '旗標關：沒有藤蔓也沒有反擊');
    await p.close();
  }

  /* ── 守護流 ── */
  {
    const p = await open(b, { v2: true, nw: { flow: 'guard' } });
    await room(p, 'grass', 'frog', 1); await start(p, ['slam', 'single']);
    ok(await p.$eval('#nwb-root', e => e.dataset.flow) === 'guard', '守護流：戰鬥開始');
    /* 站著不動、剛好沒被打到：不算 */
    await ans(p, 1);    // 先打過字，證明「沒反擊」不是因為沒在打字
    const s0 = await snap(p);
    await cast(p, 'single', 'other'); await block(p, '');
    const s1 = await snap(p);
    ok(s1.g === 0 && s1.f === 0 && s1.hp === s0.hp, `站著不動、沒被打到：沒反擊（guards ${s1.g}、流派傷害 ${s1.f}）`);
    /* 按住 Alt 不打字：反擊 0（另開一場，完全沒打過字） */
    const p2 = await open(b, { v2: true, nw: { flow: 'guard' } });
    await room(p2, 'grass', 'frog', 1); await start(p2, ['slam', 'single']);
    for (let i = 0; i < 3; i++) { await cast(p2, 'slam'); await block(p2, 'alt'); }
    const q1 = await snap(p2), noHurt = await S(p2, 'S => S.me.hp === S.me.max');
    ok(noHurt && q1.g === 0 && q1.f === 0, `按住 Alt 完全不打字：重壓都擋下了（沒掉血），但反擊 0（guards ${q1.g}、流派傷害 ${q1.f}）`);
    ok(await p2.evaluate(() => window.__NWB.S.afkHinted), '第一次擋下卻沒反擊：提示「要一直打字才會反擊」');
    await p2.close();
    /* 有在打字：擋下重壓 → 反擊 */
    await ans(p, 1);
    const s2 = await snap(p);
    await cast(p, 'slam'); await block(p, 'alt');
    const s3 = await snap(p);
    ok(s3.g === 1 && s3.f > 0 && s3.f <= s3.t, `打過字、舉盾擋下重壓：反擊 1 次，傷害 ${s3.f}、不超過打字傷害 ${s3.t}`);
    ok(Math.abs(s3.f - Math.round(s3.max * 0.05)) <= Math.max(2, Math.round(s3.max * 0.05 * 0.5)), `反擊傷害≈魔物最大血量 ${s3.max} 的 5%（${s3.f} vs ${Math.round(s3.max * 0.05)}；裝備攻擊力倍率在內）`);
    ok(s3.hp === s2.hp - s3.f, '魔物的血確實少了反擊那一份');
    /* 40 秒沒打對字：不反擊；打對字恢復 */
    await p.evaluate(() => { window.__tOff += 41000; });
    await cast(p, 'slam'); await block(p, 'alt');
    const s4 = await snap(p);
    ok(s4.g === 1 && s4.f === s3.f, `最近 40 秒沒有打對字：擋下了也不反擊（guards ${s4.g}）`);
    await ans(p, 1);
    await cast(p, 'slam'); await block(p, 'alt');
    const s5 = await snap(p);
    ok(s5.g === 2 && s5.f > s4.f, '打對字之後又會反擊');
    /* 線上攻擊時舉著盾（擋一半）也算 */
    await cast(p, 'single', 'same'); await block(p, 'alt');
    const s6 = await snap(p);
    ok(s6.g === 3, `單線攻擊打在我這一線、舉著盾（擋一半）：算守護成功（guards ${s6.g}）`);
    /* 真的躲開：預警時站在那條線、出手前換走 */
    await ans(p, 1);
    await cast(p, 'single', 'same'); await toWarn(p); await p.waitForTimeout(150);
    await p.keyboard.press(await S(p, 'S => S.lane') > 0 ? 'ControlLeft' : 'ControlRight'); await p.waitForTimeout(100);
    await toHit(p); await settle(p);
    const s7 = await snap(p);
    ok(s7.g === 4 && (await S(p, 'S => S.dodgeReal')) >= 1, `預警時站在紅線上、出手前換線躲開：算守護成功（guards ${s7.g}）`);
    /* 流派傷害不超過打字傷害 */
    await S(p, 'S => { S.dmgType = 3; S.dmgFlow = 0; }');
    for (let i = 0; i < 3; i++) { await ans(p, 1); await S(p, 'S => { S.dmgType = 3; }'); await cast(p, 'slam'); await block(p, 'alt'); }
    const s8 = await snap(p);
    ok(s8.f === 3 && s8.f <= s8.t, `一場的流派傷害 ≤ 打字傷害：打字傷害只有 3 時，反擊再多次也只加到 3（${s8.f}）`);
    /* 逃走時，流派打掉的血只算一半 */
    const c0 = await S(p, 'S => ({ t: S.dmgType, f: S.dmgFlow, max: S.mon.max })');
    await p.evaluate(() => { window.__tOff = 700000; }); await p.waitForSelector('#nw-result', { timeout: 8000 }); await p.waitForTimeout(800);
    const r = (await runsOf(p))[0], live = r.secs - r.idle;
    const fEff = (c0.t + 0.5 * c0.f) / c0.max, want = Math.round(D.rewardRatio(false, live, r.secs, fEff) * 100), full = Math.round(D.rewardRatio(false, live, r.secs, (c0.t + c0.f) / c0.max) * 100);
    const shown = +(/所以拿到 (\d+)%/.exec(await p.textContent('#nw-result')) || [])[1];
    ok(r.res === 'escape' && r.flow === 'guard' && r.guards >= 4, `逃走：res＝escape、flow＝guard、guards＝${r.guards}`);
    ok(shown === want, `逃走時流派打掉的血只算一半：獎勵顯示 ${shown}%（算出來 ${want}%；全算會是 ${full}%）`);
    ok(p.errs.length === 0, '沒有 JS 錯誤 ' + p.errs.join('|'));
    await p.close();
  }

  /* ── 守護流：舉盾時間 +0.5 秒、打字 ×0.85 ── */
  {
    const p = await open(b, { v2: true, nw: { flow: 'guard' } });
    await room(p, 'grass', 'coo', 1); await start(p, []);
    await p.keyboard.down('Alt'); await p.keyboard.up('Alt');
    const gl = await S(p, 'S => S.shieldUntil - performance.now() / 1000');
    ok(gl > 1.9 && gl <= 2.0, `守護流舉盾一次 ≈ 2.0 秒（1.5 ＋ 0.5；實際 ${gl.toFixed(2)}）`);
    await p.close();
    const q = await open(b, { v2: true });
    await room(q, 'grass', 'coo', 1); await start(q, []);
    await q.keyboard.down('Alt'); await q.keyboard.up('Alt');
    const nl = await S(q, 'S => S.shieldUntil - performance.now() / 1000');
    ok(nl > 1.4 && nl <= 1.5, `一般打法舉盾 ≈ 1.5 秒（${nl.toFixed(2)}）`);
    await q.close();
  }
  {
    const dmgOf = async flow => {
      const p = await open(b, { v2: true, nw: { flow } });
      await room(p, 'grass', 'coo', 1); await start(p, []);
      await p.evaluate(() => { window.__NWB.S.q.t = '天'; });
      const out = [];
      for (let i = 0; i < 2; i++) {
        const t = await qText(p), n = [...t].length;
        const h0 = await S(p, 'S => S.mon.hp');
        await p.fill('#nwb-in', t); await p.waitForTimeout(480); await p.press('#nwb-in', 'Enter'); await p.waitForTimeout(100);
        out.push({ n, d: h0 - await S(p, 'S => S.mon.hp'), sp: await S(p, 'S => 0') });
      }
      await p.close(); return out;
    };
    const a = await dmgOf('guard'), z = await dmgOf('');
    /* 同一場的兩題不同字數：用「每字傷害」比較（連擊、題長會有 ±些微差） */
    const per = o => o[0].d / o[0].n;
    ok(per(a) > 0 && per(z) > 0 && per(a) / per(z) > 0.7 && per(a) / per(z) < 1.0, `守護流打字傷害比一般少約 15%（每字 ${per(a).toFixed(1)} vs ${per(z).toFixed(1)}，比 ${(per(a) / per(z)).toFixed(2)}）`);
  }

  /* ── 藤蔓流 ── */
  {
    const p = await open(b, { v2: true, nw: { flow: 'vine' } });
    await room(p, 'grass', 'shroom', 1); await start(p, []);
    await ans(p, 1);
    ok(await S(p, 'S => S.vineN') === 1, '全對 1 題：種 1 根藤蔓');
    /* 打錯一題：不種 */
    const t = await qText(p);
    await p.fill('#nwb-in', [...t].map((ch, i) => i === 0 ? '啊' : ch).join('')); await p.waitForTimeout(480); await p.press('#nwb-in', 'Enter'); await p.waitForTimeout(100);
    const afterWrong = await S(p, 'S => S.vineN');
    ok(afterWrong === 1, `有字打錯：不種藤蔓（還是 ${afterWrong} 根）`);
    await ans(p, 4);
    ok(await S(p, 'S => S.vineN') === 4, '最多 4 根（打了 5 個全對，還是 4 根）');
    ok((await p.$eval('#nwb-root', e => e.dataset.vines)) === '4' && (await p.textContent('#nwb-flow')).includes('藤蔓 4 根'), '畫面顯示「藤蔓 4 根」');
    /* 藤蔓持續扣血：隔 20 秒（還在 40 秒內）*/
    const v0 = await snap(p);
    await p.evaluate(() => { window.__tOff += 20000; }); await p.waitForTimeout(300);
    const v1 = await snap(p);
    const per = 4 * v1.max * D.FLOWS.vine.rho / D.FLOWS.vine.every * 20;
    ok(v1.f - v0.f >= Math.floor(per * 0.6) - 1 && v1.f - v0.f <= Math.ceil(per * 1.5) + 1 && v1.hp === v0.hp - (v1.f - v0.f), `藤蔓 4 根、20 秒扣了 ${v1.f - v0.f} 點（理論 ${per.toFixed(1)}，≈魔物血量 ${v1.max} × 0.5% × 4 ÷ 10 × 20）`);
    ok(v1.f <= v1.t, `流派傷害 ${v1.f} ≤ 打字傷害 ${v1.t}`);
    /* 40 秒不打字：藤蔓停（枯掉），打對字恢復 */
    await p.evaluate(() => { window.__tOff += 300000; }); await p.waitForTimeout(300);
    const w0 = await snap(p);
    ok(await p.$eval('#nwb-root', e => e.dataset.wilt) === '1' && (await p.textContent('#nwb-flow')).includes('枯'), '很久沒打字：畫面寫「藤蔓枯了」');
    await p.evaluate(() => { window.__tOff += 60000; }); await p.waitForTimeout(300);
    const w1 = await snap(p);
    ok(w1.f === w0.f && w1.hp === w0.hp, `枯掉以後藤蔓不再扣血（${w0.f} → ${w1.f}）`);
    ok(w0.f - v1.f <= Math.ceil(4 * w0.max * D.FLOWS.vine.rho / D.FLOWS.vine.every * 22) + 1, `枯掉前最多只多算到「最後一次打字後 40 秒」那一段（+${w0.f - v1.f}）`);
    await ans(p, 1);
    await p.evaluate(() => { window.__tOff += 15000; }); await p.waitForTimeout(300);
    const w2 = await snap(p);
    ok(w2.f > w1.f && await p.$eval('#nwb-root', e => e.dataset.wilt) === '0', `打對字之後藤蔓恢復，又開始扣血（${w1.f} → ${w2.f}）`);
    ok(w2.f <= w2.t, `流派傷害 ${w2.f} ≤ 打字傷害 ${w2.t}`);
    /* 逃走：一半 */
    const c0 = await S(p, 'S => ({ t: S.dmgType, f: S.dmgFlow, max: S.mon.max })');
    await p.evaluate(() => { window.__tOff = 700000; }); await p.waitForSelector('#nw-result', { timeout: 8000 }); await p.waitForTimeout(800);
    const r = (await runsOf(p))[0], live = r.secs - r.idle;
    const want = Math.round(D.rewardRatio(false, live, r.secs, (c0.t + 0.5 * c0.f) / c0.max) * 100);
    const shown = +(/所以拿到 (\d+)%/.exec(await p.textContent('#nw-result')) || [])[1];
    ok(r.res === 'escape' && r.flow === 'vine' && shown === want, `藤蔓逃走：獎勵 ${shown}%＝流派只算一半（算出來 ${want}%）`);
    await p.close();
  }
  /* 每 40 秒打 1 個字、從不送出：120 秒後藤蔓也停 */
  {
    const p = await open(b, { v2: true, nw: { flow: 'vine' } });
    await room(p, 'grass', 'shroom', 1); await start(p, []);
    await ans(p, 2);
    for (let i = 0; i < 4; i++) {   // 每 30 秒打 1 個對的字、不按 Enter
      await p.evaluate(() => { window.__tOff += 30000; });
      const t = await qText(p); await p.fill('#nwb-in', ''); await p.fill('#nwb-in', [...t][0]); await p.waitForTimeout(150);
    }
    const a0 = await snap(p);
    await p.evaluate(() => { window.__tOff += 30000; });
    const t = await qText(p); await p.fill('#nwb-in', ''); await p.fill('#nwb-in', [...t][0]); await p.waitForTimeout(300);
    const a1 = await snap(p);
    ok(a1.f === a0.f, `超過 120 秒沒送出題目：就算一直打對字，藤蔓也停（${a0.f} → ${a1.f}）`);
    await p.close();
  }

  /* ── 教學大樓第 4 堂 ── */
  {
    const p = await open(b, { v2: false, nw: { hunts: 1 } });
    await p.click('.vb[data-bld="academy"]'); await p.waitForSelector('#nw-acad');
    ok((await p.$$('#nw-acad [data-l]')).length === 4 && !(await p.$('#nw-acad [data-l="flow"]')), '旗標關：教學大樓還是 4 堂，沒有「找到你的打法」');
    await p.close();
  }
  {
    const p = await open(b, { v2: true, nw: { hunts: 1 } });
    await p.click('.vb[data-bld="academy"]'); await p.waitForSelector('#nw-acad');
    ok((await p.$$('#nw-acad [data-l]')).length === 5 && (await p.textContent('#nw-acad [data-l="flow"]')).includes('找到你的打法'), '旗標開：多一堂「找到你的打法」');
    const grad = await p.evaluate(() => window.__NWG.nw.tut);
    const c0 = await coins(p);
    await p.click('#nw-acad [data-l="flow"]'); await p.waitForSelector('#nw-acad [data-go]', { timeout: 15000 });
    ok((await p.textContent('#nw-acad [data-say]')).includes('守護流') && (await p.textContent('#nw-acad [data-stat]')).includes('反擊 ×'), '先示範守護：畫面上寫「反擊 ×N」');
    await p.waitForFunction(() => document.querySelector('#nw-acad [data-stat]').textContent.includes('反擊 ×1'), null, { timeout: 12000 });
    await p.click('#nw-acad [data-go]');
    /* 守護挑戰：故意不舉盾，30 秒內擋不到 3 次就會重來；這裡直接做對 */
    const press = async () => { await p.evaluate(() => { const d = window.__acScene.danger; if (d.length && d[0].left < 1.3) window.__acScene.press('Alt'); }); };
    const t0 = Date.now();
    while (Date.now() - t0 < 40000 && !(await p.textContent('#nw-acad [data-say]')).includes('藤蔓流：看示範')) { await press(); await p.waitForTimeout(80); }
    ok((await p.textContent('#nw-acad [data-say]')).includes('藤蔓流：看示範'), '守護挑戰做對 3 次，進到藤蔓示範');
    ok((await p.textContent('#nw-acad [data-stat]')).includes('藤蔓'), '藤蔓示範：畫面寫「藤蔓 N 根」');
    await p.waitForFunction(() => document.querySelector('#nw-acad [data-go]'), null, { timeout: 25000 });
    ok((await p.textContent('#nw-acad [data-stat]')).includes('藤蔓 3 根'), '示範種了 3 根藤蔓');
    await p.click('#nw-acad [data-go]');
    await p.waitForFunction(() => document.querySelector('#nw-acad [data-say]').textContent.includes('枯掉'), null, { timeout: 5000 });
    await p.waitForFunction(() => document.querySelector('#nw-acad [data-stat]').textContent.includes('枯了'), null, { timeout: 12000 });
    ok(true, '示範「停下來不打字，藤蔓會枯掉」：畫面寫「藤蔓枯了」');
    await p.waitForFunction(() => document.querySelector('#nw-acad [data-go]'), null, { timeout: 15000 });
    await p.click('#nw-acad [data-go]');
    await p.waitForSelector('#nw-acad [data-in]', { timeout: 10000 });
    ok((await p.textContent('#nw-acad [data-stat]')).includes('藤蔓 0 根'), '換學生做：從 0 根開始');
    await p.fill('#nw-acad [data-in]', 'x'); await p.press('#nw-acad [data-in]', 'Enter'); await p.waitForTimeout(1600);
    ok((await p.textContent('#nw-acad [data-stat]')).includes('藤蔓 0 根') && (await p.textContent('#nw-acad [data-stat]')).includes('沒種到'), '打錯：沒種到藤蔓，要再打一個');
    for (let k = 0; k < 3; k++) {
      await p.waitForSelector('#nw-acad [data-in]', { timeout: 10000 });
      const w = await p.textContent('#nw-acad .ac-word');
      await p.fill('#nw-acad [data-in]', w); await p.press('#nw-acad [data-in]', 'Enter'); await p.waitForTimeout(300);
    }
    await p.waitForFunction(() => document.querySelector('#nw-acad [data-say]') && document.querySelector('#nw-acad [data-say]').textContent.includes('學會了'), null, { timeout: 10000 }).catch(() => {});
    await p.waitForTimeout(1500);
    const tut = await p.evaluate(() => window.__NWG.nw.tut), c1 = await coins(p);
    ok(tut.flow === 1 && !grad.flow, '做完第 4 堂：記成學會了（NW.tut.flow）');
    ok(c1 - c0 === D.LESSON_COINS_FLOW && D.LESSON_COINS_FLOW === 30 && D.lessonCoins('dodge') === D.LESSON_COINS, `第 4 堂給 30 字元，其他三堂照舊 ${D.LESSON_COINS}（實得 +${c1 - c0}）`);
    ok(!tut.dodge && !tut.attack, '第 4 堂不影響「教學大樓畢業」的三堂');
    await p.close();
  }

  /* ── 人物卡 ── */
  {
    const p = await open(b, { v2: true, nw: { flow: 'guard' } });
    await p.keyboard.press('b'); await p.waitForSelector('#nw-bag');
    ok((await p.textContent('[data-bag-flow]')).includes('守護流'), '人物卡顯示「打法：🛡 守護流」');
    await p.close();
    const q = await open(b, { v2: true });
    await q.keyboard.press('b'); await q.waitForSelector('#nw-bag');
    ok(!(await q.$('[data-bag-flow]')), '沒選打法：人物卡不顯示');
    await q.close();
    const r = await open(b, { v2: false, nw: { flow: 'vine' } });
    await r.keyboard.press('b'); await r.waitForSelector('#nw-bag');
    ok(!(await r.$('[data-bag-flow]')), '旗標關：人物卡不顯示');
    const ft = await r.evaluate(async () => { const m = await import('/nw-card.js'); window.__NW_V2__ = true; const a = m.flowText({ flow: 'vine' }), c = m.flowText({}); window.__NW_V2__ = false; return [a, c, m.flowText({ flow: 'vine' })]; });
    ok(ft[0] === '🌿 藤蔓流' && ft[1] === '' && ft[2] === '', 'flowText（教師頁人物卡也用）：開＝🌿 藤蔓流、沒選／旗標關＝空');
    await r.close();
    const tp = await open(b, { v2: true });
    const ok2 = await tp.evaluate(async () => { try { const m = await import('/teacher/pc.js'); return typeof m === 'object'; } catch (e) { return String(e); } });
    ok(ok2 === true, '教師頁 teacher/pc.js 照常載得進來（import nw-card.js 沒壞）：' + ok2);
    await tp.close();
  }

  /* ── 出口提示：同一星逃走 2 次，結算建議藤蔓流 ── */
  {
    const p = await open(b, { v2: true });
    const fake = o => Object.assign({ rk: 'grass', mk: 'coo', star: 3, lv: 6, qb: '6:0', result: 'escape', secs: 600, accuracy: 0.9, answered: 6, ans: 6, cor: 12, typ: 14, keys: 40, nokey: 0, act: 100, cpm: 7,
      dodgeOk: 0, dodgeAll: 0, defOk: 0, defAll: 0, maxCombo: 1, flags: { fast: 0, paste: 0, wrong: 0 }, tier: 'B', weapon: 'dagger', wk: 'dagger', atk: 105, pw: 40, valid: true, lvAcc: true,
      live: 300, idle: 300, frac: 0.4, fEff: 0.4, flow: 'normal', guards: 0, vines: 0, dodgeReal: 0, react: [], t0: Date.now() }, o || {});
    const sum = r => p.evaluate(x => JSON.parse(JSON.stringify(window.__NWG.finishHunt(x))), r);
    const s1 = await sum(fake());
    ok(!s1.flowHint, '第 1 次逃走：還不提示');
    const s2 = await sum(fake());
    ok(s2.flowHint === 'vine' && (await p.evaluate(() => window.__NWG.nw.esc['coo:3'])) === 2, '同一星第 2 次逃走：建議藤蔓流');
    const s3 = await sum(fake({ flow: 'vine' }));
    ok(!s3.flowHint, '已經在用藤蔓流：不再提示');
    const s4 = await sum(fake({ star: 4 }));
    ok(!s4.flowHint, '換一星重算：不提示');
    await sum(fake({ result: 'win', secs: 100, frac: 1, fEff: 1, live: 90, idle: 10 }));
    ok(await p.evaluate(() => window.__NWG.nw.esc['coo:3']) === undefined, '打贏就清掉逃走次數');
    await sum(fake()); const s5 = await sum(fake());
    await p.evaluate(x => window.__NWG.afterHunt(x), fake());
    await p.waitForSelector('#nw-result');
    const hint = await p.textContent('[data-flowhint]').catch(() => '');
    ok(hint.includes('藤蔓流') && hint.includes('不想試也可以') && !hint.includes('打字慢') && !hint.includes('失敗'), '結算畫面的提示：白話、不責備、可以不理 → ' + hint.slice(0, 60));
    await p.close();
    const q = await open(b, { v2: false });
    const fk = o => ({ rk: 'grass', mk: 'coo', star: 3, lv: 6, qb: '6:0', result: 'escape', secs: 300, accuracy: 0.9, answered: 6, valid: true, lvAcc: true, live: 100, idle: 100, frac: 0.4, fEff: 0.4, flags: {}, dodgeOk: 0, dodgeAll: 0, defOk: 0, defAll: 0 });
    const t1 = await q.evaluate(x => { window.__NWG.finishHunt(x); return JSON.parse(JSON.stringify(window.__NWG.finishHunt(x))); }, fk());
    ok(!t1.flowHint && !Object.keys(await q.evaluate(() => window.__NWG.nw.esc)).length, '旗標關：沒有提示，也不記逃走次數');
    await q.close();
  }

  /* ── 手機寬度 390：不橫向捲動 ── */
  {
    const p = await open(b, { v2: true });
    await p.setViewportSize({ width: 390, height: 800 });
    await room(p, 'grass', 'frog', 1);
    const ov = async () => p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1 && [...document.querySelectorAll('#nw-root, #nw-root *')].every(e => { const r = e.getBoundingClientRect(); return !r.width || r.right <= innerWidth + 1 || getComputedStyle(e).position === 'fixed' || e.closest('canvas'); }));
    ok(await ov(), '手機 390 寬：出發前選打法的畫面不橫向捲動');
    ok((await p.evaluate(() => document.querySelector('[data-flows]').getBoundingClientRect().right)) <= 390, '三個選項都在畫面內');
    await p.click('[data-flow="vine"]'); await start(p, []);
    await p.waitForTimeout(300);
    ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), '手機 390 寬：戰鬥畫面（多一行流派）不橫向捲動');
    await p.evaluate(() => { window.__tOff = 700000; }); await p.waitForTimeout(2500);
    await p.close();
    const q = await open(b, { v2: true, nw: { hunts: 1 } });
    await q.setViewportSize({ width: 390, height: 800 });
    await q.click('.vb[data-bld="academy"]'); await q.waitForSelector('#nw-acad');
    await q.click('#nw-acad [data-l="flow"]'); await q.waitForSelector('#nw-acad [data-go]', { timeout: 15000 });
    ok(await q.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1 && document.getElementById('nw-acad').scrollWidth <= innerWidth + 1), '手機 390 寬：第 4 堂教學畫面不橫向捲動');
    await q.close();
  }

  await b.close();
  console.log(fails ? `\n${fails} 個失敗` : '\n全部通過'); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
