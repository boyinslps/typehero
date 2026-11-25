/* 2b-3 戰鬥接上裝備（docs/SPEC-STAGE2.md §3.2、§5 的 2b-3；編號 nw14：nw11 被榜單測試用掉、nw12 是鐵匠鋪、nw13 是舊存檔）。
   用 window.__NW_GEAR__（只在 localhost 有效）直接指定 gearStats 的結果：攻擊力與屬性、生命、盔甲減傷（不含亂打反擊）、舉盾秒數、紅線提早。
   另外用真的存檔（測試者之刃、炎牙刀）確認 gearStats 接到戰鬥。 */
const { chromium } = require('playwright'); const fs = require('fs');
const path = require('path'); const M = path.join(__dirname, 'mock') + '/'; const OUT = process.argv[2] || require('os').tmpdir();
const css = require('./tw.js')(OUT);
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const ID = '五年級3班_5號';
const G0 = { atk: 100, elem: null, hp: 0, cut: 0, shield: 0, warn: 0, pw: 10 };
const seedFor = (starter, extra) => ({
  ['mg_scores/' + ID]: {
    className: '五年級3班', seat: 5, name: '小明', bestLevel: 10, bestScore: 20, scoreVer: 2, plays: 9, tutorialDone: true, talentIntroDone: true, tier: 'B', balanceVer: 3,
    nw: Object.assign({ v: 1, savedAt: 5, look: { style: 1, hair: 2, skin: 1 }, starter, quest: { done: ['1-0', '1-0a'] }, items: { potion: 3 }, zone: { grass: 5 }, dex: { coo: 1, frog: 1, shroom: 1 }, tm: { m_dodge: 1, m_defend: 1, m_attack: 1 }, hunts: 5 }, extra || {})
  }
});
async function open(browser, o = {}) {
  const p = await browser.newPage({ viewport: { width: 1200, height: 900 } });
  const errs = []; p.on('dialog', d => d.accept());
  p.on('pageerror', e => errs.push('pageerror: ' + e.message));
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push('console: ' + m.text()); });
  const { sha256Hex } = await import('../../nw-access.js');
  const hash = await sha256Hex('Test-Pass_9!x');
  await p.addInitScript(a => {window.__NW_STAGES__ = ['1']; window.__BOARD_ROT__ = false; 
    window.__FS = a.s; localStorage.clear(); localStorage.setItem('mg_nw_fast', '1'); window.__NW_CODE_HASH__ = a.hash; window.__NW_NOGIFT__ = true; window.__NW_NOINTRO__ = true; localStorage.setItem('mg_nw_code', a.hash);
    window.confetti = () => {}; window.html2canvas = async () => document.createElement('canvas');
    window.__NW_ATTACKS__ = a.attacks; if (a.gear) window.__NW_GEAR__ = a.gear; if (a.pattern) window.__NW_PATTERN__ = a.pattern;
  }, { s: seedFor(o.starter || 'staff', o.nw), hash, gear: o.gear || null, attacks: o.attacks === 'none' ? [] : Array.isArray(o.attacks) ? o.attacks : ['single', 'pair', 'slam'], pattern: o.pattern || null });
  await p.route('**/*', r => {
    const u = r.request().url();
    if (u.startsWith('http://localhost')) return r.continue();
    if (u.includes('cdn.tailwindcss.com')) return r.fulfill({ contentType: 'application/javascript', body: `const s=document.createElement('style');s.textContent=${JSON.stringify(css)};document.head.appendChild(s);` });
    const m = u.includes('firebase-app') ? 'app.js' : u.includes('firebase-auth') ? 'auth.js' : u.includes('firebase-firestore') ? 'fs.js' : null;
    if (m) return r.fulfill({ contentType: 'application/javascript', body: fs.readFileSync(M + m, 'utf8') });
    return r.abort();
  });
  await p.goto('http://localhost:8765/index.html'); await p.waitForTimeout(1300);
  await p.selectOption('#in-grade', '五年級'); await p.selectOption('#in-class', '3班');
  await p.fill('#in-seat', '5'); await p.waitForTimeout(900); await p.click('#btn-enter'); await p.waitForTimeout(1000);
  await p.click('#nw-door'); await p.waitForTimeout(900);
  p.errs = errs; return p;
}
const goHunt = async (p, region, mon, star) => {
  await p.click('.vb[data-bld="board"]'); await p.waitForSelector('#nwbd-board');
  await p.click(`.qs[data-q="${region}:${mon}:${star || 1}"]`);
  await p.click('[data-go]'); await p.waitForSelector('[data-view="room"]');
  await p.click('[data-act="startroom"]'); await p.waitForTimeout(80);
};
const lane = p => p.$eval('#nwb-root', e => +e.dataset.lane);
const hp = p => p.$eval('#nwb-hpt', e => +e.textContent.split('/')[0]);
const hpMax = p => p.$eval('#nwb-hpt', e => +e.textContent.split('/')[1]);
const waitDanger = p => p.waitForFunction(() => document.getElementById('nwb-root').dataset.danger, null, { timeout: 40000, polling: 40 });
const waitEnd = p => p.waitForFunction(() => document.getElementById('nwb-cast').style.display === 'none', null, { timeout: 25000, polling: 50 });
const goTo = async (p, n) => { for (let i = 0; i < 3 && await lane(p) !== n; i++) { await p.keyboard.press(await lane(p) > n ? 'ControlLeft' : 'ControlRight'); await p.waitForTimeout(60); } };
const qText = p => p.$$eval('#nwb-q .zy-han', els => els.map(e => e.textContent).join(''));
async function answer(p, text, wait = 480) {
  await p.fill('#nwb-in', text !== undefined ? text : await qText(p));
  await p.waitForTimeout(wait); await p.press('#nwb-in', 'Enter'); await p.waitForTimeout(60);
}
/* 打一題對的，回傳這一下的傷害（浮動的白色／金色數字） */
async function hitDmg(p) {
  const before = await p.$$eval('.nwb2-float', els => els.length);
  await answer(p);
  await p.waitForTimeout(150);
  return p.$$eval('.nwb2-float', els => els.map(e => e.textContent).filter(t => /^\d+$/.test(t)).map(Number).pop());
}

(async () => {
  const D = await import('../../nw-data.js');
  const b = await chromium.launch();
  const MAX = { ...G0, atk: 130, elem: 'fire' };   // 藍炎牙刀 +5＝130（SPEC-BALANCE-V2 §9）

  /* ── 攻擊力與屬性：只放大打對的字；打錯是 0 ── */
  {
    const [p0, p1, p2] = await Promise.all([open(b, { gear: G0 }), open(b, { gear: MAX }), open(b, { gear: MAX })]);
    await Promise.all([goHunt(p0, 'grass', 'coo', 1), goHunt(p1, 'grass', 'coo', 1), goHunt(p2, 'grass', 'frog', 1)]);
    const d0 = await hitDmg(p0), d1 = await hitDmg(p1), d2 = await hitDmg(p2);
    ok(d0 === 18 && d1 === Math.round(18 * 1.365) && d2 === Math.round(18 * 1.235), `傷害：沒裝備 ${d0}、炎牙刀 +5（130）打怕火的咕咕鳥 ${d1}（×1.365）、打不怕火的泡泡蛙 ${d2}（×1.235＝1.3×0.95）`);
    await Promise.all([p0.close(), p1.close(), p2.close()]);
  }

  /* ── 測試者之刃：攻擊力 112（不能再乘一次 1.12）；炎牙刀存檔接到戰鬥 ── */
  {
    const nwT = { gw: ['testblade'], equip: 'testblade' };
    const nwF = { gearV: 1, gear: [{ id: 'g0', k: 'w_dagger', c: 'gray', p: 0, t: 0, s: 1 }, { id: 'gf', k: 'flame_dagger', c: 'blue', p: 5, t: 1 }], eq: { weapon: 'gf', helm: null, armor: null, gloves: null, boots: null }, bp: ['bp_flame_dagger'] };
    const [pt, pf] = await Promise.all([open(b, { starter: 'dagger', nw: nwT }), open(b, { starter: 'dagger', nw: nwF })]);
    await Promise.all([goHunt(pt, 'grass', 'coo', 1), goHunt(pf, 'grass', 'coo', 1)]);
    const dt = await hitDmg(pt), df = await hitDmg(pf);
    const base = Math.round(9 * 2 * 0.95 * 1.02);   // 雙刀 ×0.95、第 1 連擊 ×1.02
    ok(dt === Math.round(base * 1.12), `測試者之刃：攻擊力 112，傷害 ${dt}（雙刀基本 ${base} × 1.12，沒有重複乘）`);
    ok(df === Math.round(base * 1.365), `存檔裡的炎牙刀（藍 +5＝130，火）打咕咕鳥：傷害 ${df}（${base} × 1.365）`);
    await Promise.all([pt.close(), pf.close()]);
  }

  /* ── 生命上限 ── */
  {
    const p = await open(b, { gear: { ...G0, hp: 30 }, attacks: 'none' });
    await goHunt(p, 'grass', 'coo', 1);
    ok(await hpMax(p) === 130 && await hp(p) === 130, `頭盔生命 +30：生命 ${await hp(p)}/${await hpMax(p)}`);
    await p.close();
  }

  /* ── 盔甲：只減魔物招式，不減亂打反擊 ── */
  {
    const run = async gear => {
      const p = await open(b, { gear, pattern: 'single', attacks: ['single'] });
      await goHunt(p, 'grass', 'coo', 5);
      const full = await hp(p);
      await answer(p, 'ㄅㄅㄅㄅ'.slice(0, 1) + 'xx');   // 亂打：反擊 10，不受盔甲影響
      await p.waitForTimeout(300);
      const afterWrong = await hp(p);
      await waitDanger(p);
      const d = +(await p.$eval('#nwb-root', e => e.dataset.danger));
      await goTo(p, d);
      await waitEnd(p); await p.waitForTimeout(250);
      const afterHit = await hp(p);
      await p.close();
      return { full, wrong: full - afterWrong, hit: afterWrong - afterHit };
    };
    const [a, c] = await Promise.all([run(G0), run({ ...G0, cut: 0.5 })]);
    ok(a.wrong === 10 && c.wrong === 10, `亂打被反擊：沒裝備 −${a.wrong}、盔甲 50% 也是 −${c.wrong}（盔甲不減反擊）`);
    ok(a.hit === 12 && c.hit === 6, `咕咕鳥★5 衝刺啄：沒裝備 −${a.hit}、盔甲減傷 50% −${c.hit}`);
  }

  /* ── 重壓沒擋住：只扣一次、×1.5（SPEC-BALANCE-V2 §9；以前三條線各扣一次＝×3）；盔甲照樣減 ── */
  {
    const run = async gear => {
      const p = await open(b, { gear, pattern: 'slam', attacks: ['slam'] });
      await goHunt(p, 'grass', 'frog', 5);
      const full = await hp(p);
      await waitDanger(p);   // 整排藍色，什麼都不做＝沒擋住
      await waitEnd(p); await p.waitForTimeout(250);
      const lost = full - await hp(p);
      const errs = p.errs.slice();
      await p.close();
      return { lost, errs };
    };
    const [a, c] = await Promise.all([run(G0), run({ ...G0, cut: 0.10 })]);
    const base = D.monDmg(D.regionLv('grass', 5), D.MONSTERS.frog.attacks.find(x => x.type === 'defend').mul);
    ok(a.lost === Math.round(base * 1.5) && a.lost !== Math.round(base * 1.5) * 3 && a.lost !== base, `重壓沒擋住：泡泡蛙★5 泡泡雨（${base} 點）只扣一次 ×1.5＝−${a.lost}（以前會是 −${Math.round(base * 1.5) * 3}）`);
    ok(c.lost === D.strikeDamage(base, 1, true, 0.10) && c.lost < a.lost, `重壓＋盔甲 10%：−${c.lost}（先 ×1.5 再無條件進位地減）`);
    ok(a.errs.length === 0 && c.errs.length === 0, '重壓沒有 JS 錯誤 ' + a.errs.concat(c.errs).join(' | '));
  }

  /* ── 護手：舉盾多幾秒 ── */
  {
    const t = async gear => {
      const p = await open(b, { gear, attacks: 'none' });
      await goHunt(p, 'grass', 'coo', 1);
      await p.keyboard.press('AltLeft'); await p.waitForTimeout(80);
      const on0 = await p.$eval('#nwb-root', e => e.dataset.shield);
      await p.waitForTimeout(1900);
      const on2 = await p.$eval('#nwb-root', e => e.dataset.shield);
      await p.close();
      return [on0, on2];
    };
    const [a, c] = await Promise.all([t(G0), t({ ...G0, shield: 1 })]);
    ok(a[0] === '1' && a[1] === '0', `沒護手：舉盾 1.5 秒（0.1 秒＝${a[0]}、2.0 秒＝${a[1]}）`);
    ok(c[0] === '1' && c[1] === '1', `護手 +1 秒：舉盾 2.5 秒（2.0 秒時還舉著＝${c[1]}）`);
  }

  /* ── 護腳：紅線早 N 秒出現（出手時間不變） ── */
  {
    const t = async gear => {
      const p = await open(b, { gear, pattern: 'single', attacks: ['single'] });
      await goHunt(p, 'grass', 'coo', 1);
      await p.waitForFunction(() => document.getElementById('nwb-cast').style.display === 'block', null, { timeout: 30000, polling: 30 });
      const t0 = Date.now();
      await waitDanger(p);
      const warnAt = Date.now() - t0;
      await waitEnd(p);
      const hitAt = Date.now() - t0;
      await p.close();
      return { warnAt, hitAt };
    };
    const [a, c] = await Promise.all([t(G0), t({ ...G0, warn: 1 })]);
    const gain = a.warnAt - c.warnAt;
    ok(gain > 800 && gain < 1300 && Math.abs(a.hitAt - c.hitAt) < 400, `護腳 +1 秒：紅線早 ${gain} 毫秒出現（出手時間差 ${a.hitAt - c.hitAt} 毫秒）`);
  }

  await b.close();
  console.log(fails ? `\n${fails} 個失敗` : '\n全部通過');
  process.exit(fails ? 1 : 0);
})();
