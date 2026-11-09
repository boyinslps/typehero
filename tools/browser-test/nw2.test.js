const { chromium } = require('playwright'); const fs = require('fs');
const path = require('path'); const M = path.join(__dirname, 'mock') + '/'; const OUT = process.argv[2] || require('os').tmpdir();
const css = fs.existsSync(OUT + '/tw.css') ? fs.readFileSync(OUT + '/tw.css', 'utf8') : '';
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const ID = '五年級3班_5號';
const seedFor = (starter, extra) => ({
  ['mg_scores/' + ID]: {
    className: '五年級3班', seat: 5, name: '小明', bestLevel: 10, bestScore: 20, scoreVer: 2, plays: 9, tutorialDone: true, talentIntroDone: true, tier: 'B', balanceVer: 3,
    nw: Object.assign({ v: 1, savedAt: 5, look: { style: 1, hair: 2, skin: 1 }, starter, quest: { done: ['1-0'] }, items: { potion: 3 } }, extra || {})
  }
});
async function open(browser, starter, extra) {
  const p = await browser.newPage({ viewport: { width: 1200, height: 900 } });
  const errs = []; p.on('dialog', d => d.accept());
  p.on('pageerror', e => errs.push('pageerror: ' + e.message));
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push('console: ' + m.text()); });
  const { sha256Hex } = await import('../../nw-access.js');
  const hash = await sha256Hex('Test-Pass_9!x');
  await p.addInitScript(a => { window.__FS = a.s; localStorage.clear(); localStorage.setItem('mg_nw_fast', '1'); window.__NW_CODE_HASH__ = a.hash; localStorage.setItem('mg_nw_code', a.hash); window.confetti = () => {}; window.html2canvas = async () => document.createElement('canvas'); }, { s: seedFor(starter, extra), hash });
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
const qText = p => p.$$eval('#nwb-q .zy-han', els => els.map(e => e.textContent).join(''));
const hpPct = (p, id) => p.$eval('#' + id, e => parseFloat(e.style.width));
async function answer(p, text, wait = 480) {
  await p.fill('#nwb-in', text !== undefined ? text : await qText(p));
  await p.waitForTimeout(wait); await p.press('#nwb-in', 'Enter'); await p.waitForTimeout(60);
}
async function playUntil(p, pred, max = 80) {
  for (let i = 0; i < max; i++) {
    if (await p.isVisible('#nw-result')) return true;
    if (await pred()) return true;
    if (await p.$('#nwb-root') === null) return true;
    if (await p.isDisabled('#nwb-in')) { await p.waitForTimeout(300); continue; }
    await answer(p);
  }
  return false;
}

(async () => {
  const b = await chromium.launch();

  {
    const p = await open(b, 'staff');
    await goHunt(p, 'grass', 'coo', 1);
    ok(await p.isVisible('#nwb-root') && (await p.textContent('#nwb-mname')).includes('咕咕鳥'), '進入戰鬥畫面');
    await p.screenshot({ path: OUT + '/nw2-battle.png' });
    const full0 = await hpPct(p, 'nwb-mhp');
    await p.fill('#nwb-in', await qText(p)); await p.press('#nwb-in', 'Enter'); await p.waitForTimeout(100);
    ok(await hpPct(p, 'nwb-mhp') === full0, '不到 0.4 秒就送出：這題無效');
    await p.waitForTimeout(500);
    await answer(p);
    ok(await hpPct(p, 'nwb-mhp') < full0, '答對一題，魔物掉血');
    const hp0 = await hpPct(p, 'nwb-hp');
    const wrong = [...(await qText(p))].map(() => '錯').join('');
    await answer(p, wrong);
    ok(await hpPct(p, 'nwb-hp') < hp0, '整題亂打：被反擊扣血');

    await p.waitForFunction(() => document.getElementById('nwb-cast') && document.getElementById('nwb-cast').style.display === 'block', null, { timeout: 15000 });
    const type = (await p.getAttribute('#nwb-cast', 'class')).includes('defend') ? 'defend' : 'dodge';
    ok(true, `魔物出招：${type === 'dodge' ? '閃避型（紅）' : '防禦型（藍）'}`);
    await p.screenshot({ path: OUT + '/nw2-cast.png' });
    await p.waitForFunction(() => document.getElementById('nwb-stance').dataset.state === 'go', null, { timeout: 12000, polling: 50 });
    ok(true, '時機到了：姿態條會亮綠燈寫「現在打」');
    await p.waitForTimeout(1400);
    await p.fill('#nwb-in', type === 'dodge' ? '閃' : '防');
    await p.waitForTimeout(150);
    ok(await p.isDisabled('#nwb-in'), '打出動作詞後輸入框變灰');
    ok(['dodge', 'defend'].includes(await p.$eval('#nwb-stance', e => e.dataset.state)) && (await p.textContent('#nwb-st-name')).includes('姿態'), '輸入框上出現「閃避／防禦姿態」條');
    ok((await p.textContent('#nwb-st-hint')).includes('攻擊會落在姿態裡'), '姿態條告訴你這一下擋不擋得住');
    await p.screenshot({ path: OUT + '/nw2-action.png' });
    const hpBefore = await hpPct(p, 'nwb-hp');
    await p.waitForFunction(() => document.getElementById('nwb-cast').style.display === 'none', null, { timeout: 8000 });
    await p.waitForTimeout(300);
    ok(await hpPct(p, 'nwb-hp') >= hpBefore, '時機對了：這一下沒受傷');

    const done = await playUntil(p, async () => false, 90);
    ok(done, '打到結算');
    try { await p.waitForSelector('#nw-result', { timeout: 8000 }); } catch (e) { console.log('ERRS', p.errs.join(' | ')); throw e; }
    const txt = await p.textContent('#nw-result');
    ok(txt.includes('討伐成功'), '結算：討伐成功');
    ok(/閃避 1\/1|防禦 1\/1/.test(txt), '結算：記到 1 次成功的動作');
    await p.screenshot({ path: OUT + '/nw2-result.png' });
    await p.click('[data-close]'); await p.waitForTimeout(500);
    const nw = await p.evaluate(() => JSON.parse(localStorage.getItem('mg_nw_五年級3班_5號')));
    ok(nw.dex.coo === 1 && nw.zone.grass === 1 && nw.hunts === 1, '圖鑑、★1 進度、場數有記');
    ok(nw.hr >= 2 && nw.stars >= 1, '獵人升到 2 級、拿到星星');
    ok(!nw.quest.done.includes('1-2'), '任務照順序：還沒打 1-1 的泡泡蛙，1-2 先不算');
    ok((nw.mats.coo_feather || 0) >= 1 && nw.coins > 0, '材料與字元先存著');
    ok(p.errs.length === 0, '沒有 JS 錯誤 ' + p.errs.join(' | '));
    await p.close();
  }

  {
    const p = await open(b, 'staff', { words: ['novice', 'staff0'], stat: { wins: 9 }, hr: 5 });
    await p.keyboard.press('b'); await p.waitForTimeout(200);
    ok((await p.$$('.bp-slot')).length === 5 && await p.$('[data-hero]') !== null, '背包左側：人物＋五個裝備格');
    ok((await p.textContent('[data-card]')).includes('小明') && (await p.textContent('[data-card]')).includes('還沒有稱號'), '人物上方顯示名字與稱號');
    ok(await p.$('.bp-slot[data-slot="weapon"].on') !== null && (await p.$$('.bp-cell')).length === 16, '武器穿在武器格；右側是裝備背包格子');
    await p.click('[data-title-edit]'); await p.waitForSelector('#nw-title');
    const et = await p.textContent('#nw-title');
    ok((await p.$$('#nw-title svg')).length >= 1, '稱號圖示是 SVG 像素徽章');
    ok((await p.$$('#nw-title [data-add]')).length >= 3, '解鎖的詞條可以點');
    ok(et.includes('🔒 資深') && et.includes('獵人等級 10'), '沒解鎖的詞條灰色顯示條件');
    await p.click('#nw-title [data-add="staff0"]'); await p.click('#nw-title [data-add="novice"]');
    ok((await p.textContent('#nw-title')).includes('法師新手'), '照點的順序拚成稱號');
    await p.click('#nw-title [data-ok]'); await p.waitForTimeout(1300);
    ok((await p.textContent('[data-card]')).includes('法師新手'), '完成後人物上方顯示新稱號');
    ok((await p.textContent('#lobby-who')).includes('法師新手'), '舊世界大廳的名字旁邊也看得到');
    ok(await p.evaluate(() => window.__FS['mg_scores/五年級3班_5號'].nwTitle) === '法師新手', '存進雲端 mg_scores.nwTitle');
    await p.keyboard.press('Escape');
    await goHunt(p, 'grass', 'coo', 1);
    ok(await playUntil(p, async () => false, 90), '打一場');
    await p.waitForSelector('#nw-result', { timeout: 8000 });
    ok((await p.textContent('#nw-result')).includes('新的稱號詞條'), '第 10 場討伐成功：結算寫新的稱號詞條');
    ok(p.errs.length === 0, '稱號 沒有 JS 錯誤 ' + p.errs.join(' | '));
    await p.close();
  }

  {
    const p = await open(b, 'staff');
    await goHunt(p, 'grass', 'coo', 1);
    const lens = [];
    for (let i = 0; i < 6; i++) { if (await p.isDisabled('#nwb-in')) break; lens.push([...(await qText(p))].length); await answer(p); }
    ok(lens.length >= 5 && lens.slice(0, 4).every(n => n <= 4), '★1 的前 4 題最多 4 個字（' + lens.join(',') + '）');
    ok(lens.every(n => n <= 6), '第 5 題法杖詠唱也不超過 6 個字');
    await p.close();
  }

  for (const [wk, mon] of [['staff', 'frog'], ['bow', 'coo'], ['dagger', 'coo'], ['crossbow', 'coo']]) {
    const p = await open(b, wk);
    await goHunt(p, 'grass', mon, 1);
    const full = await hpPct(p, 'nwb-mhp');
    for (let i = 0; i < 6; i++) { if (await p.isDisabled('#nwb-in')) break; if (process.env.DBG) console.log('DBG', wk, i, JSON.stringify(await p.evaluate(() => [document.getElementById('nwb-in').disabled, document.getElementById('nwb-hpt').textContent, document.getElementById('nwb-down').style.display, [...document.querySelectorAll('.nwb2-banner')].map(e => e.textContent).join('/'), document.getElementById('nwb-mhp').style.width]))); await answer(p); if (wk === 'crossbow' && i === 3) { await p.fill('#nwb-in', ''); await p.press('#nwb-in', 'Enter'); await p.waitForTimeout(700); } }
    await p.waitForTimeout(500);
    const left = await hpPct(p, 'nwb-mhp');
    ok(left < full - 5, `${wk} 打 6 題魔物掉血（${full.toFixed(0)}% → ${left.toFixed(0)}%）`);
    if (wk === 'bow') ok((await p.textContent('#nwb-wlabel')).length > 0, '長弓有力量條');
    if (wk === 'crossbow') ok((await p.textContent('#nwb-wlabel')).includes('彈匣'), '連弩有彈匣');
    if (wk === 'staff') { const pad = (await p.$eval('#nwb-q', e => e.dataset.mode)); ok(pad === 'hanzi', '泡泡蛙也是國字題（注音只當提示，不用打注音符號）'); }
    ok(p.errs.length === 0, `${wk} 沒有 JS 錯誤 ` + p.errs.join(' | '));
    await p.close();
  }

  await b.close(); process.exit(fails ? 1 : 0);
})();
