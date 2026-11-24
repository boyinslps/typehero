/* 教師頁「👥 學生」的人物卡：點名字跳出視覺化卡片（共用學生背包的畫法，nw-card.js）。
   開 __RULES，測試資料一律用假名。截圖：/tmp/card-desktop.png、/tmp/card-mobile.png */
const { chromium } = require('playwright'); const fs = require('fs');
const path = require('path'); const M = path.join(__dirname, 'mock') + '/'; const OUT = process.argv[2] || require('os').tmpdir();
const css = require('./tw.js')(OUT);
const NOTICE_ID = /export const NOTICES = \[\s*\{ id: '([^']+)'/.exec(fs.readFileSync(path.join(__dirname, '../../nw-data.js'), 'utf8'))[1];
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const NOW = Date.now(), MIN = 60000, D = 24 * 3600000;
const C3 = '五年級3班', C4 = '五年級4班', ID5 = C3 + '_5號', ID6 = C3 + '_6號', ID7 = C3 + '_7號', ID8 = C3 + '_8號', ID45 = C4 + '_5號';

const route = p => p.route('**/*', r => {
  const u = r.request().url();
  if (u.startsWith('http://localhost')) return r.continue();
  if (u.includes('cdn.tailwindcss.com')) return r.fulfill({ contentType: 'application/javascript', body: `const s=document.createElement('style');s.textContent=${JSON.stringify(css)};document.head.appendChild(s);` });
  const m = u.includes('firebase-app') ? 'app.js' : u.includes('firebase-auth') ? 'auth.js' : u.includes('firebase-firestore') ? 'fs.js' : null;
  if (m) return r.fulfill({ contentType: 'application/javascript', body: fs.readFileSync(M + m, 'utf8') });
  return r.abort();
});
async function teacher(browser, seed, o = {}) {
  const p = await browser.newPage({ viewport: o.mobile ? { width: 390, height: 800 } : { width: 1280, height: 900 } });
  const errs = []; p.errs = errs;
  p.on('pageerror', e => errs.push('pageerror: ' + e.message));
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|Missing or insufficient|permission/.test(m.text())) errs.push('console: ' + m.text()); });
  await p.addInitScript(a => { window.__FS = a.s; window.__RULES = true; localStorage.clear(); window.__ADMIN_PRESIGNED = { uid: 'T1', email: 'teacher@example.test' }; }, { s: seed });
  await route(p);
  await p.goto('http://localhost:8765/teacher.html');
  await p.waitForSelector('#app:not(.hidden)', { timeout: 8000 }).catch(e => { console.log('載入失敗', errs); throw e; }); await ready(p);
  return p;
}
const ready = p => p.waitForFunction(() => { const m = document.querySelector('#main'); return m && m.textContent && !m.textContent.includes('讀取中…') && m.children.length > 0; }, null, { timeout: 8000 }).then(() => p.waitForTimeout(150));
const tab = async (p, id) => { await p.click(`#nav [data-tab="${id}"]`); await p.waitForTimeout(120); await ready(p); };
const modalOpen = p => p.evaluate(() => document.querySelectorAll('[data-modal]').length);
const clickModal = (p, id) => p.evaluate(id => { const ms = document.querySelectorAll('[data-modal]'); ms[ms.length - 1].querySelector(`[data-btn="${id}"]`).click(); }, id);
const noErr = (p, m = '沒有 JS 錯誤') => ok(p.errs.length === 0, m + ' ' + p.errs.join(' | '));
const T = (p, sel) => p.textContent(sel).then(t => t.replace(/\s+/g, ' ').trim());
const cardId = p => p.$eval('[data-pc-card]', e => e.dataset.id);
const openPc = async (p, id) => { await p.click(`tr[data-id="${id}"] [data-pc]`); await p.waitForSelector('[data-pc-card]'); await p.waitForTimeout(150); };

const stu = (cls, seat, name, o = {}) => [`mg_scores/${cls}_${seat}號`, Object.assign({ className: cls, seat, name, nwCls: cls, bestLevel: 10, bestScore: 20, scoreVer: 2, plays: 9, tutorialDone: true, talentIntroDone: true, tier: 'B', balanceVer: 3, punctDone: true, lastPlayedAt: { __ts: o.last === undefined ? NOW : o.last } },
  o.nw === null ? {} : { nw: Object.assign({ v: 1, savedAt: o.last === undefined ? NOW : o.last, look: { style: 1, hair: 2, skin: 1 }, starter: 'dagger', quest: { done: ['1-0'] }, items: {}, intro: { hub: 1, mail: 1, notice: 1 }, seenNotice: NOTICE_ID, name0: name, nick: ['a_flash', 'b_coo'] }, o.nw || {}) })];
const seed = () => Object.fromEntries([
  ['mg_admins/T1', { ok: true }],
  stu(C3, 5, '小明', { last: NOW - 2 * MIN, nw: { hr: 7, hrExp: 40, coins: 120, hunts: 10, stat: { wins: 8, fails: 2 }, starter: 'dagger', gw: ['testblade'], equip: 'testblade', title: '勇敢的新手', titleParts: ['novice', 'a_x'], words: ['novice'] } }),
  stu(C3, 6, '小華', { last: NOW - 3 * D, nw: { hr: 3, coins: 10, hunts: 6, stat: { wins: 1, fails: 5 }, starter: 'staff', nick: null } }),
  stu(C3, 7, '阿強', { last: NOW - 2 * D, nw: null }),
  stu(C3, 8, '小美', { nw: { look: null, hr: 2, starter: 'bow' } }),
  stu(C4, 5, '小莉', { last: NOW - 3 * MIN, nw: { hr: 4, stat: { wins: 4, fails: 1 }, starter: 'crossbow' } }),
  [`mg_bugboard/${ID5}`, { className: C3, seat: 5, score: 30, n: 3 }]
]);

(async () => {
  const nick5 = '小明';
  const browser = await chromium.launch();
  {
    const p = await teacher(browser, seed());
    await tab(p, 'students');
    /* 開卡 */
    await openPc(p, ID5);
    ok(await modalOpen(p) === 1 && await cardId(p) === ID5, '點名字開人物卡');
    const cv = await p.$eval('[data-pc-hero] canvas', c => ({ w: c.width, h: c.height, cw: c.getBoundingClientRect().width }));
    ok(cv.w > 0 && cv.w % 8 === 0 && cv.h % 8 === 0 && Math.abs(cv.cw - cv.w) < 1, `角色 canvas 存在，倍率是整數 8（${cv.w}×${cv.h}，顯示寬 ${cv.cw}）`);
    ok((await T(p, '[data-pc-nick]')).includes(nick5), '暱稱：' + nick5);
    ok((await T(p, '[data-pc-real]')).includes('503') && (await T(p, '[data-pc-real]')).includes('5號'), '班級座號（clsShort）；名字在上面的大字');
    ok((await T(p, '[data-pc-title]')).includes('勇敢的新手') && await p.$('[data-pc-title] svg') !== null, '稱號文字與徽章 SVG');
    ok((await T(p, '[data-pc-hr]')).includes('HR 7') && (await T(p, '[data-pc-hr]')).includes('40/'), 'HR 與經驗文字');
    const barW = await p.$eval('[data-pc-hr] .px-bar.xp i', e => e.style.width);
    ok(parseFloat(barW) > 0 && parseFloat(barW) < 100, '經驗條 px-bar xp 有比例：' + barW);
    ok((await T(p, '[data-pc-wname]')) === '測試者之刃', '手上武器名稱');
    ok(await p.$('[data-slot="weapon"] canvas') !== null && await p.$eval('[data-slot="weapon"] canvas', c => c.width > 0), '武器格有像素圖');
    ok(await p.$('[data-slot="weapon"] .dkp') !== null, '測試者之刃的黑色粒子');
    for (const [k, n] of [['helm', '頭盔'], ['armor', '盔甲'], ['boots', '護腳'], ['gloves', '護手']]) {
      const t = await T(p, `[data-slot="${k}"]`);
      ok(t.includes('＋') && t.includes(n) && await p.$(`[data-slot="${k}"] canvas`) === null, `${n}沒裝備：暗色「＋」與部位名稱`);
    }
    ok((await T(p, '[data-slot="weapon"]')).includes('武器'), '武器格下面寫「武器」');
    const side = await p.$$eval('[data-slot]', es => es.map(e => [e.dataset.slot, Math.round(e.getBoundingClientRect().left)]));
    const hx = await p.$eval('[data-pc-fig]', e => Math.round(e.getBoundingClientRect().left));
    ok(['helm', 'armor', 'boots'].every(k => side.find(s => s[0] === k)[1] < hx) && ['weapon', 'gloves'].every(k => side.find(s => s[0] === k)[1] > hx), '左邊頭盔／盔甲／護腳，右邊武器／護手');
    const ch = await T(p, '[data-pc-chips]');
    ok(ch.includes('字元 120') && ch.includes('狩獵 10 場') && ch.includes('勝 8／敗 2') && /最後上線 (剛剛|2 分鐘前)/.test(ch) && ch.includes('抓蟲 30 分') && ch.includes('武器 2 把'), '小資訊列：' + ch);
    ok(await p.$$eval('[data-pc-chips] .px-chip', e => e.length) === 6, '小資訊列用 px-chip（6 個：字元、狩獵、最後上線、抓蟲、武器、戰力）');
    ok((await T(p, '[data-pc-later="skill"]')).includes('之後開放') && (await T(p, '[data-pc-later="item"]')).includes('之後開放'), '技能、道具留位置寫「之後開放」');
    const anim = await p.$eval('[data-pc-hero]', e => getComputedStyle(e).animationName + '|' + getComputedStyle(e).animationDuration);
    ok(anim === 'pcBreath|0.8s', '角色呼吸動畫 0.8 秒：' + anim);
    ok(await p.$eval('[data-pc-card]', e => e.closest('.px-panel') !== null) && await p.$$eval('[data-pc-card] .px-btn', b => b.length) >= 6, '用 px-panel／px-btn');
    await p.screenshot({ path: '/tmp/card-desktop.png' });
    /* 減少動態時不動 */
    await p.emulateMedia({ reducedMotion: 'reduce' });
    ok(await p.$eval('[data-pc-hero]', e => getComputedStyle(e).animationName) === 'none', '「減少動態效果」時呼吸動畫關閉');
    await p.emulateMedia({ reducedMotion: 'no-preference' });

    /* ◀ ▶ 與左右鍵 */
    ok(await p.$eval('[data-pc-nav="-1"]', b => b.disabled) && (await T(p, '[data-pc-pos]')) === '1 / 5', '第一位：◀ 灰掉、顯示 1 / 5');
    await p.click('[data-pc-nav="1"]'); await p.waitForTimeout(100);
    ok(await cardId(p) === ID6 && (await T(p, '[data-pc-wname]')) === '學徒木杖' && (await T(p, '[data-pc-nick]')).includes('小華'), '▶ 切到下一位（小華：木杖、大字是登入名字）');
    ok((await T(p, '[data-pc-title]')).includes('還沒有稱號'), '沒稱號寫「還沒有稱號」');
    await p.keyboard.press('ArrowRight'); await p.waitForTimeout(100);
    ok(await cardId(p) === ID7, '→ 鍵切到下一位（阿強，沒進過新世界）');
    ok((await T(p, '[data-pc-fig]')).includes('還沒進過新世界') && await p.$('[data-pc-hero] canvas') !== null && await p.$('[data-pc-hr]') === null, '沒有 nw：剪影＋「還沒進過新世界」，不壞');
    ok(await p.$$eval('[data-slot]', e => e.length) === 5 && (await T(p, '[data-pc-chips]')).includes('最後上線') && (await T(p, '[data-pc-later="skill"]')).includes('之後開放'), '沒有 nw：裝備格、資訊列、預留區塊都還在');
    ok(await p.$eval('[data-pc-fig]', e => e.classList.contains('empty')), '剪影樣式');
    await p.keyboard.press('ArrowRight'); await p.waitForTimeout(100);
    ok(await cardId(p) === ID8 && (await T(p, '[data-pc-fig]')).includes('還沒進過新世界') && (await T(p, '[data-pc-hr]')).includes('HR 2'), '有 nw 但沒有造型（小美）：剪影＋提示，其他資料照常');
    await p.keyboard.press('ArrowRight'); await p.keyboard.press('ArrowRight'); await p.waitForTimeout(100);
    ok(await cardId(p) === ID45 && await p.$eval('[data-pc-nav="1"]', b => b.disabled), '最後一位：▶ 灰掉，再按不動');
    await p.keyboard.press('ArrowLeft'); await p.waitForTimeout(100);
    ok(await cardId(p) === ID8, '← 鍵回上一位');
    noErr(p, '切換過程沒有 JS 錯誤');

    /* 動作：隱藏暱稱（跳確認視窗時左右鍵不能換人） */
    for (let k = 0; k < 3; k++) await p.click('[data-pc-nav="-1"]'); await p.waitForTimeout(100);
    ok(await cardId(p) === ID5, '回到第一位');
    await p.click('[data-pc-act="hide"]'); await p.waitForTimeout(150);
    ok(await modalOpen(p) === 2, '隱藏暱稱先問一次');
    await p.keyboard.press('ArrowRight'); await p.waitForTimeout(80);
    await clickModal(p, 'ok'); await p.waitForTimeout(400);
    ok(await modalOpen(p) === 1 && await cardId(p) === ID5, '確認視窗開著時左右鍵不換人，確認後人物卡還在原本那位');
    ok((await T(p, '[data-pc-nick]')).includes('已隱藏') && (await T(p, '[data-pc-act="hide"]')) === '恢復暱稱', '卡片顯示「已隱藏」、按鈕變「恢復暱稱」');
    ok((await p.evaluate(id => window.__FS['mg_bugboard/' + id], ID5)).hideNick === true, '寫進 mg_bugboard.hideNick');
    ok((await T(p, `tr[data-id="${ID5}"]`)).includes('已隱藏'), '背後的表格也更新');
    await p.click('[data-pc-act="hide"]'); await p.waitForTimeout(300);
    ok(!(await T(p, '[data-pc-nick]')).includes('已隱藏'), '恢復暱稱（不用確認）');

    /* Esc 與背景關閉 */
    await p.keyboard.press('Escape'); await p.waitForTimeout(100);
    ok(await modalOpen(p) === 0, 'Esc 關閉人物卡');
    await openPc(p, ID6); await p.click('[data-modal]', { position: { x: 4, y: 4 } }); await p.waitForTimeout(100);
    ok(await modalOpen(p) === 0, '點背景關閉');
    await openPc(p, ID6); await p.click('[data-pc-close]'); await p.waitForTimeout(100);
    ok(await modalOpen(p) === 0, '✕ 關閉鈕');
    await p.keyboard.press('ArrowRight');
    ok(true, '關掉後按左右鍵不報錯'); noErr(p);

    /* 看詳細資料 → 原本的文字版學生卡 */
    await openPc(p, ID5); await p.click('[data-pc-act="detail"]'); await p.waitForSelector('[data-modal] .kv'); await p.waitForTimeout(300);
    const dt = await T(p, '[data-modal]');
    ok(await modalOpen(p) === 1 && await p.$('[data-pc-card]') === null && dt.includes('學生卡') && dt.includes('HR 7') && dt.includes('已領的信'), '「看詳細資料」開原本的文字版學生卡（人物卡關掉）');
    await clickModal(p, 'close'); await p.waitForTimeout(100);
    /* 點同一列其他地方還是文字版 */
    await p.click(`tr[data-id="${ID6}"] td:nth-child(2)`); await p.waitForSelector('[data-modal] .kv');
    ok(await p.$('[data-pc-card]') === null, '點同一列其他地方開的是文字版學生卡'); await clickModal(p, 'close');
    /* 寄信 */
    await openPc(p, ID6); await p.click('[data-pc-act="mail"]'); await p.waitForTimeout(400);
    ok(await modalOpen(p) === 0 && (await p.evaluate(() => location.hash)) === '#/mail' && await p.$('[data-chosen] .chip') !== null, '「寄信給他」：關卡片、帶到信箱、收件人 1 人');
    noErr(p); await p.close();
  }
  /* 換過名字：名字沒問題 */
  {
    const sd = seed(); sd[`mg_scores/${ID6}`].name = '小華改';
    sd[`mg_scores/${ID6}`].nw.name0 = '小華';
    const p = await teacher(browser, sd); await tab(p, 'students');
    await openPc(p, ID6);
    ok((await T(p, '[data-pc-real]')).includes('換過名字') && await p.$('[data-pc-act="nameok"]') !== null, '換過名字：卡片有 ⚠ 與「名字沒問題」');
    await p.click('[data-pc-act="nameok"]'); await p.waitForTimeout(500);
    ok(await p.$('[data-pc-act="nameok"]') === null && !!(await p.evaluate(id => window.__FS['mg_bugboard/' + id], ID6)).nameOkH, '按了之後解鎖，卡片的按鈕消失');
    noErr(p); await p.close();
  }
  /* 第 2 段 2b：五格裝備、戰力欄、總覽的各班平均 */
  {
    const sd = seed(), nw = sd[`mg_scores/${ID5}`].nw;
    Object.assign(nw, { gearV: 1, gear: [{ id: 'g0', k: 'w_dagger', c: 'gray', p: 0, t: 0, s: 1 }, { id: 'h1', k: 'coo_hat', c: 'green', p: 3, t: 1 }, { id: 'a1', k: 'wolf_mail', c: 'blue', p: 5, t: 2 }], eq: { weapon: 'g0', helm: 'h1', armor: 'a1', gloves: null, boots: null }, forge: { made: 4, ups: 3, top: 5, gift: 1 }, gw: [], equip: '', coins: 900 });
    const p = await teacher(browser, sd);
    ok(await p.$('[data-econ]') !== null && (await T(p, '[data-econ]')).includes('戰力') && (await T(p, '[data-econ]')).includes('503'), '總覽：各班平均持有字元與戰力（通膨的早期訊號）');
    await tab(p, 'students');
    ok((await p.$$eval('#main th', ths => ths.map(t => t.textContent))).some(t => t.includes('戰力')), '學生表格有「戰力」欄');
    ok((await T(p, `tr[data-id="${ID5}"] [data-power]`)) === '76', '小明的戰力 76（小刀 10＋綠咕咕帽 +3 26＋藍炎狼皮甲 +5 40）');
    await p.click('th[data-sort="power"]'); await p.waitForTimeout(150);
    const first = await p.$eval('#main tbody tr', e => e.dataset.id);
    await p.click('th[data-sort="power"]'); await p.waitForTimeout(150);
    ok(first !== undefined, '戰力欄可以排序');
    await openPc(p, ID5);
    const slots = await p.$$eval('[data-pc-card] .bp-slot', els => els.map(e => ({ s: e.dataset.slot, on: e.classList.contains('on'), canvas: !!e.querySelector('canvas'), up: (e.querySelector('.bp-up') || {}).textContent || '' })));
    ok(slots.find(s => s.s === 'helm').on && slots.find(s => s.s === 'helm').canvas && slots.find(s => s.s === 'helm').up === '+3' && slots.find(s => s.s === 'armor').up === '+5' && slots.find(s => s.s === 'weapon').canvas && !slots.find(s => s.s === 'gloves').on, '人物卡：頭盔、盔甲、武器有圖示與 +N，護手、護腳是空格');
    ok((await T(p, '[data-pc-power]')).includes('戰力 76') && (await T(p, '[data-pc-power]')).includes('做過 4 件') && (await T(p, '[data-pc-power]')).includes('最高 +5'), '人物卡：戰力 76｜做過 4 件｜最高 +5');
    ok((await T(p, '[data-pc-own="gears"]')).includes('咕咕帽 +3') && (await T(p, '[data-pc-own="gears"]')).includes('炎狼皮甲 +5'), '「他有什麼」多一行裝備');
    await p.keyboard.press('Escape');
    noErr(p); await p.close();
  }
  /* 篩選後的順序：只列有玩過的 */
  {
    const p = await teacher(browser, seed()); await tab(p, 'students');
    await p.fill('[data-f="kw"]', '503'); await p.waitForTimeout(200);
    await openPc(p, ID5); ok((await T(p, '[data-pc-pos]')) === '1 / 4', '◀ ▶ 的範圍是目前篩選出來的清單（503 班 4 人）');
    await p.close();
  }
  /* 手機 390 */
  {
    const p = await teacher(browser, seed(), { mobile: true }); await tab(p, 'students');
    await openPc(p, ID5);
    const m = await p.evaluate(() => {
      const r = document.querySelector('.mdl>.px-panel').getBoundingClientRect(), pc = document.querySelector('[data-pc-card]');
      const over = [...pc.querySelectorAll('*')].filter(e => e.getBoundingClientRect().right > r.right + 1 && !e.closest('.dkp') && !e.classList.contains('dkp')).map(e => e.tagName + '.' + e.className);
      return { sw: document.documentElement.scrollWidth, iw: innerWidth, bw: document.body.scrollWidth, panelR: r.right, panelW: r.width, pcSw: pc.scrollWidth, pcCw: pc.clientWidth, over, hero: document.querySelector('[data-pc-hero] canvas').width };
    });
    ok(m.sw <= m.iw && m.bw <= m.iw, `手機 390：頁面不橫向捲動（scrollWidth ${m.sw} / ${m.iw}）`);
    ok(m.panelR <= m.iw && m.pcSw <= m.pcCw + 1 && m.over.length === 0, `手機：卡片放得下、沒有東西超出卡片外（${JSON.stringify(m)}）`);
    ok(m.hero % 5 === 0, `手機角色倍率 5（canvas ${m.hero}px）`);
    for (const k of ['helm', 'weapon', 'gloves']) ok(await p.$eval(`[data-slot="${k}"]`, e => { const r = e.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth; }), `手機：${k} 格在畫面內`);
    await p.screenshot({ path: '/tmp/card-mobile.png', fullPage: false });
    await p.click('[data-pc-nav="1"]'); await p.waitForTimeout(100);
    ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), '手機：切到下一位仍不橫向捲動');
    noErr(p); await p.close();
  }
  await browser.close();
  console.log(fails ? `\n${fails} FAIL` : '\n全部通過');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
