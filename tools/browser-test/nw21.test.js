/* 平衡 V2 第 6 步：時間（SPEC-BALANCE-V2 §1.2、§7 第 6 步；編號 nw21）。取消「時間到就輸」：倒下 3 次才輸，滿 600 秒（v2.2；v2.1 是 480）魔物逃走（res＝escape），
   獎勵 ×(0.3u＋0.7·f·min(1,2u))，u＝有在打字的秒數÷600；右上角寫「已經打了」往上數、不倒數不變紅；撤退照比例。旗標關（__NW_V2__=false）仍是 300 秒倒數、時間到＝撤退、輸／撤退一半。
   假時鐘：把 performance.now 加上 window.__tOff（毫秒），戰鬥用的 nowS() 就一下子跳到那個時間。 */
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

(async () => {
  const D = await import('../../nw-data.js');

  /* ── 純函式：獎勵比例 0.3u＋0.7·f·min(1,2u)，v2.3：u＝有在打字的秒數 ÷ max(這場秒數, 300) ── */
  const near = (x, y) => Math.abs(x - y) < 1e-9, R = (live, secs, f) => D.rewardRatio(false, live, secs, f);
  ok(D.rewardRatio(true, 0, 0, 0) === 1, '贏＝全額 1');
  ok(near(R(600, 600, 0.8), 0.86) && near(R(300, 300, 0.3), 0.51) && near(R(180, 180, 0.3), 0.3 * 0.6 + 0.7 * 0.3 * 1), '規格 6e：整場都在打 → 10 分鐘打掉 80%＝0.86；5 分鐘倒下、打掉 30%＝0.51；3 分鐘下課撤退＝' + R(180, 180, 0.3).toFixed(2) + '（不會被除以 600 罰）');
  ok(R(0, 600, 0) === 0 && R(0, 600, 0.5) === 0, '掛著不打字（u＝0）：保底和進度都是 0');
  ok(near(R(150, 300, 0.5), 0.3 * 0.5 + 0.7 * 0.5 * 1) && near(R(75, 300, 0.5), 0.3 * 0.25 + 0.7 * 0.5 * 0.5), 'u＝0.5 起進度全算（min(1,2u)＝1）；u＝0.25 進度只算一半');
  ok(R(9999, 600, 5) === 1 && R(-5, 0, -1) === 0 && R(10, 0, 0.5) < 0.1, 'u、f 超界夾在 0～1；秒數是 0 也用 300 當分母');
  ok(R(60, 600, 0.35) <= 0.3 && R(60, 600, 0.22) <= 0.3, '打 4 題後掛著到 10 分鐘（有在打字約 60 秒）：獎勵 ≤ 30%（打掉 35% 時 ' + (R(60, 600, 0.35) * 100).toFixed(0) + '%）');
  const U = (live, secs, f) => 0.3 * Math.min(1, live / Math.max(secs, 300)) + 0.7 * f * Math.min(1, 2 * Math.min(1, live / Math.max(secs, 300)));

  const b = await chromium.launch();

  /* ── V2：不會 300 秒就輸；7:00 提示；480 秒逃走，獎勵 0.3a＋0.7f ── */
  {
    const p = await open(b, { v2: true });
    await goHunt(p, 'grass', 'coo', 1);
    ok((await p.textContent('.nwb3-time')).includes('已經打了') && (await p.textContent('#nwb-time')) === '0:00' || /^0:0\d$/.test(await p.textContent('#nwb-time')), 'V2：右上角寫「已經打了」從 0:00 往上數');
    ok((await p.textContent('#nwb-std')) === '⚡ 標準 2:09', `V2：下面寫標準時間（咕咕鳥★1＝129 秒＝2:09；${await p.textContent('#nwb-std')}）`);
    await answer(p, 4);
    const c0 = await coins(p), e0 = await exp(p), f0 = await fails0(p);
    await jump(p, 310); await p.waitForTimeout(700);
    ok(!(await p.$('#nw-result')) && !(await p.$eval('#nwb-in', e => e.disabled)), 'V2：滿 300 秒（舊的時限）還在打，沒有結束');
    ok(/^5:1\d$/.test(await p.textContent('#nwb-time')), `V2：顯示 5:1x（往上數；${await p.textContent('#nwb-time')}）`);
    ok((await p.$$eval('.nwb2-banner', els => els.map(e => e.textContent))).every(t => !t.includes('逃走')), '還沒到 9:00：沒有「魔物累了」');
    await jump(p, 430); await p.waitForTimeout(600);
    ok((await p.$$eval('.nwb2-banner', els => els.map(e => e.textContent))).every(t => !t.includes('逃走')), '7:10：還沒有（v2.2 是 9:00 才提示）');
    await jump(p, 545); await p.waitForTimeout(600);
    ok((await p.$$eval('.nwb2-banner', els => els.map(e => e.textContent).join('|'))).includes('魔物累了，再 1 分鐘就會逃走'), '9:00：跳「魔物累了，再 1 分鐘就會逃走」');
    const col = await p.$eval('#nwb-time', e => getComputedStyle(e).color), col2 = await p.$eval('.nwb3-time', e => getComputedStyle(e).animationName);
    ok(col === 'rgb(255, 217, 138)' && col2 === 'none', `9:00 以後顏色不變（${col}）、沒有閃爍動畫（${col2}）`);
    await jump(p, 599.4); await p.waitForTimeout(300);
    ok(!(await p.$('#nw-result')), '599.4 秒：還沒逃走');
    await jump(p, 601); await p.waitForSelector('#nw-result', { timeout: 8000 }); await p.waitForTimeout(900);
    const r = (await runsOf(p))[0];
    ok(r && r.res === 'escape' && r.secs === 600, `600 秒 → res＝escape、secs＝600（${r && r.res}／${r && r.secs}）`);
    const live = r.secs - r.idle, ratio = U(live, r.secs, r.frac);
    const dc = (await coins(p)) - c0, de = (await exp(p)) - e0;
    ok(r.frac > 0.1 && r.frac < 0.8 && r.idle > 500, `打掉 ${Math.round(r.frac * 100)}% 的血、沒在打字 ${r.idle} 秒（u＝${(live / 600).toFixed(2)}）`);
    ok(Math.abs(dc - Math.round(D.huntCoins(1, true) * ratio)) <= 1 && Math.abs(de - Math.round(D.huntExp(1, true) * ratio)) <= 1, `獎勵＝0.3u＋0.7·f·min(1,2u)（u＝live÷max(秒數,300)）＝${(ratio * 100).toFixed(1)}%：字元 +${dc}（滿額 ${D.huntCoins(1, true)}）、經驗 +${de}（滿額 ${D.huntExp(1, true)}）`);
    ok(dc < D.huntCoins(1, true) * 0.15, '掛著不動拿不到什麼：不到舊的「輸一半」的 30%');
    ok((await fails0(p)) === f0, '逃走不記輸（stat.fails 沒增加）');
    const txt = await p.textContent('#nw-result');
    ok(txt.includes('魔物逃走了') && txt.includes('魔物累得逃走了') && txt.includes(`${Math.round(r.frac * 100)}%`) && txt.includes(`${Math.round(ratio * 100)}%`) && !txt.includes('可疑'), '結算：標題「魔物逃走了」、寫打掉幾 % 與拿到幾 % 的獎勵');
    ok(p.errs.length === 0, '沒有 JS 錯誤 ' + p.errs.join('|'));
    await p.close();
  }

  /* ── V2：「有在打字」的算法：兩次打對之間最多算 40 秒，最後一次打對後再算 40 秒 ── */
  {
    const p = await open(b, { v2: true });
    await goHunt(p, 'grass', 'coo', 1);
    await answer(p, 2);                                   // 0～3 秒
    await jump(p, 30); await p.waitForTimeout(200); await answer(p, 1);          // 隔 30 秒：算 30
    await jump(p, 100); await p.waitForTimeout(200); await answer(p, 1);         // 隔 70 秒：只算 40
    await jump(p, 601); await p.waitForSelector('#nw-result', { timeout: 8000 }); await p.waitForTimeout(800);
    const r = (await runsOf(p))[0], live = r.secs - r.idle;
    ok(r.res === 'escape' && live > 108 && live < 118, `有在打字＝約 3＋30＋40＋40＝113 秒（實際 ${live.toFixed(1)}；idle ${r.idle}）`);
    await p.close();
  }

  /* ── V2：撤退照比例（不是一半） ── */
  {
    const p = await open(b, { v2: true });
    await goHunt(p, 'grass', 'coo', 1);
    await answer(p, 3);
    const c0 = await coins(p);
    await p.click('#nwb-quit'); await p.waitForSelector('#nw-result', { timeout: 8000 }); await p.waitForTimeout(800);
    const r = (await runsOf(p))[0], live = r.secs - r.idle, ratio = U(live, r.secs, r.frac), dc = (await coins(p)) - c0;
    ok(r.res === 'retreat' && Math.abs(dc - Math.round(D.huntCoins(1, true) * ratio)) <= 1 && ratio < 0.5, `撤退：照 0.3u＋0.7·f·min(1,2u) ＝ ${(ratio * 100).toFixed(1)}%（字元 +${dc}／滿額 ${D.huntCoins(1, true)}），不是固定一半（才打幾秒就撤退，u 很小）`);
    await p.close();
  }

  /* ── v2.3：逐字判斷「有在打字」＋120 秒內要送出過 1 題 ── */
  {
    const typeSlow = async (p, gap, tOff) => {   // 一個字一個字打，每個字之間假時鐘走 gap 秒；回傳新的 tOff
      const t = await qText(p);
      for (let k = 1; k <= t.length; k++) { await p.fill('#nwb-in', t.slice(0, k)); await p.waitForTimeout(60); tOff += gap; await jump(p, tOff); await p.waitForTimeout(60); }
      return tOff;
    };
    /* p10 的速度（一題約 60 秒、每個字約 20 秒）：一直在打字，整場 idle≈0（舊規則只在送出時更新，一題 40～80 秒會被停掉） */
    const p = await open(b, { v2: true });
    await goHunt(p, 'grass', 'coo', 1);
    let t = 0;
    for (let i = 0; i < 4; i++) { t = await typeSlow(p, 20, t); await p.fill('#nwb-in', await qText(p)); await p.waitForTimeout(480); await p.press('#nwb-in', 'Enter'); await p.waitForTimeout(80); }
    t += 5; await jump(p, t); await p.waitForTimeout(100);
    await p.click('#nwb-quit'); await p.waitForSelector('#nw-result', { timeout: 8000 }); await p.waitForTimeout(700);
    const r = (await runsOf(p))[0];
    ok(r.res === 'retreat' && r.idle <= 6 && r.secs > 100, `p10 的速度（每字約 20 秒）打 ${Math.round(r.secs)} 秒：idle＝${r.idle}（逐字判斷，沒被當成掛機）`);
    await p.close();
    /* 每 40 秒打 1 個對的字、從不送出：120 秒後 live 不再增加 */
    const q = await open(b, { v2: true });
    await goHunt(q, 'grass', 'coo', 1);
    await answer(q, 3);   // 先送出 3 題（沒答到 3 題這場不算數）
    let t2 = 0; const w = await qText(q);
    for (let k = 1; k <= Math.min(w.length, 4); k++) { await q.fill('#nwb-in', w.slice(0, k)); await q.waitForTimeout(60); t2 += 40; await jump(q, t2); await q.waitForTimeout(60); }
    await jump(q, 601); await q.waitForSelector('#nw-result', { timeout: 8000 }); await q.waitForTimeout(700);
    const r2 = (await runsOf(q))[0], live2 = r2.secs - r2.idle;
    ok(r2.res === 'escape' && live2 <= 125 && live2 > 60, `每 40 秒打 1 個字、從不送出：有在打字只有 ${live2.toFixed(0)} 秒（≤ 120 秒就停，不是 ${Math.min(w.length, 4) * 40 + 40}）`);
    await q.close();
  }

  /* ── 旗標關：300 秒倒數、時間到＝撤退、輸／撤退一半，跟 V2 之前一樣 ── */
  {
    const p = await open(b, { v2: false });
    await goHunt(p, 'grass', 'coo', 1);
    ok((await p.textContent('.nwb3-time')).startsWith('時間') && /^(5:00|4:5\d)$/.test(await p.textContent('#nwb-time')) && (await p.$eval('#nwb-std', e => e.style.display)) === 'none', '旗標關：右上角「時間 5:00」倒數，沒有標準時間');
    await answer(p, 3);
    const c0 = await coins(p), f0 = await fails0(p);
    await jump(p, 299.5); await p.waitForSelector('#nw-result', { timeout: 8000 }); await p.waitForTimeout(800);
    const dc = (await coins(p)) - c0;
    ok(dc === Math.round(D.huntCoins(1, true) * 0.5) && (await fails0(p)) === f0 + 1, `旗標關：300 秒時間到＝撤退，字元一半（+${dc}），記一次失敗`);
    ok((await p.textContent('#nw-result')).includes('撤退了') && !(await p.$('[data-ratio]')), '旗標關：結算寫「撤退了」，沒有比例說明');
    await p.close();
  }

  await b.close();
  console.log(fails ? `\n${fails} 個失敗` : '\n全部通過'); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
