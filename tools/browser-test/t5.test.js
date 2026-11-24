/* 教師頁「給東西」與「頒稱號」（docs/research/TEACHER-GIVE-AUDIT.md）。全程開 window.__RULES，測試資料一律用假名。
   ① 教師頁：禮物清單涵蓋資料表、清單由資料表自動產生（測試動態塞假資料）、搜尋與解鎖條件、防呆
   ② 頒稱號（人物卡、學生卡）：固定 ID、不重複寄、已擁有的標示、「給東西」帶收件人
   ③ 學生端：老師頒的稱號領得到、解鎖、通知、能戴上；每種新禮物類型領一次、重複不加、未知整封不領 */
const { chromium } = require('playwright'); const fs = require('fs');
const path = require('path'); const M = path.join(__dirname, 'mock') + '/'; const OUT = process.argv[2] || require('os').tmpdir();
const css = require('./tw.js')(OUT);
const NOTICE_ID = /export const NOTICES = \[\s*\{ id: '([^']+)'/.exec(fs.readFileSync(path.join(__dirname, '../../nw-data.js'), 'utf8'))[1];
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const NOW = Date.now(), MIN = 60000;
const C3 = '五年級3班', ID5 = C3 + '_5號', ID6 = C3 + '_6號';

const route = p => p.route('**/*', r => {
  const u = r.request().url();
  if (u.startsWith('http://localhost')) return r.continue();
  if (u.includes('cdn.tailwindcss.com')) return r.fulfill({ contentType: 'application/javascript', body: `const s=document.createElement('style');s.textContent=${JSON.stringify(css)};document.head.appendChild(s);` });
  const m = u.includes('firebase-app') ? 'app.js' : u.includes('firebase-auth') ? 'auth.js' : u.includes('firebase-firestore') ? 'fs.js' : null;
  if (m) return r.fulfill({ contentType: 'application/javascript', body: fs.readFileSync(M + m, 'utf8') });
  return r.abort();
});

/* ── 教師頁 ── */
async function teacher(browser, seed) {
  const p = await browser.newPage({ viewport: { width: 1280, height: 900 } });
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
const modalText = p => p.evaluate(() => { const ms = document.querySelectorAll('[data-modal]'); return ms[ms.length - 1].textContent.replace(/\s+/g, ' '); });
const noErr = (p, m = '沒有 JS 錯誤') => ok(p.errs.length === 0, m + ' ' + p.errs.join(' | '));
const T = (p, sel) => p.textContent(sel).then(t => t.replace(/\s+/g, ' ').trim());
const openPc = async (p, id) => { await p.click(`tr[data-id="${id}"] [data-pc]`); await p.waitForSelector('[data-pc-card]'); await p.waitForTimeout(150); };
const fsKeys = (p, pre) => p.evaluate(pre => Object.keys(window.__FS).filter(k => k.startsWith(pre)), pre);
const fsDoc = (p, k) => p.evaluate(k => JSON.parse(JSON.stringify(window.__FS[k] || null)), k);
const optVals = (p, sel) => p.$$eval(sel + ' option', o => o.map(x => x.value));

const stu = (cls, seat, name, o = {}) => [`mg_scores/${cls}_${seat}號`, Object.assign({ className: cls, seat, name, nwCls: cls, bestLevel: 10, bestScore: 20, scoreVer: 2, plays: 9, tutorialDone: true, talentIntroDone: true, tier: 'B', balanceVer: 3, punctDone: true, lastPlayedAt: { __ts: NOW } },
  o.nw === null ? {} : { nw: Object.assign({ v: 1, savedAt: NOW, look: { style: 1, hair: 2, skin: 1 }, starter: 'dagger', quest: { done: ['1-0'] }, items: {}, intro: { hub: 1, mail: 1, notice: 1 }, seenNotice: NOTICE_ID, name0: name }, o.nw || {}) })];
const tseed = () => Object.fromEntries([
  ['mg_admins/T1', { ok: true }],
  stu(C3, 5, '小明', { nw: { hr: 7, coins: 120, hunts: 10, stat: { wins: 8, fails: 2 }, gw: ['testblade'], words: ['novice', 'rookie'], title: '新手見習', titleParts: ['novice', 'rookie'],
    mats: { coo_feather: 4, wolf_fang: 1 }, bp: ['bp_coo_hat'], items: { potion: 2, renameCard: 1 } } }),
  stu(C3, 6, '小華', { nw: { hr: 3, starter: 'staff' } }),
  stu(C3, 7, '阿強', { nw: null })
]);

/* ── 學生頁（跟 nw7 一樣，登入後進新世界） ── */
async function student(browser, o = {}) {
  const p = await browser.newPage({ viewport: { width: 1200, height: 900 } });
  const errs = []; p.on('dialog', d => d.accept()); p.errs = errs;
  p.on('pageerror', e => errs.push('pageerror: ' + e.message));
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push('console: ' + m.text()); });
  const { sha256Hex } = await import('../../nw-access.js');
  const hash = await sha256Hex('Test-Pass_9!x');
  const seed = Object.assign({
    ['mg_scores/' + ID5]: { className: C3, seat: 5, name: '小明', bestLevel: 10, bestScore: 20, scoreVer: 2, plays: 9, tutorialDone: true, talentIntroDone: true, tier: 'B', balanceVer: 3,
      nw: Object.assign({ v: 1, savedAt: 5, look: { style: 1, hair: 2, skin: 1 }, starter: 'dagger', quest: { done: ['1-0', '1-0a'] }, items: { potion: 3 }, intro: { hub: 1 }, seenNotice: NOTICE_ID, name0: '小明', nameSet: 1 }, o.nw || {}) }
  }, o.seed || {});
  await p.addInitScript(a => {
    window.__FS = a.s; window.__RULES = true; localStorage.clear(); localStorage.setItem('mg_nw_fast', '1');
    window.__NW_CODE_HASH__ = a.hash; localStorage.setItem('mg_nw_code', a.hash); window.__NW_NOGIFT__ = true; window.__NW_NOINTRO__ = true;
    window.confetti = () => {}; window.html2canvas = async () => document.createElement('canvas');
  }, { s: seed, hash });
  await route(p);
  await p.goto('http://localhost:8765/index.html'); await p.waitForFunction(() => window.__NWG, null, { timeout: 15000 }); await p.waitForTimeout(500);
  await p.selectOption('#in-grade', '五年級'); await p.selectOption('#in-class', '3班'); await p.fill('#in-seat', '5'); await p.waitForTimeout(900);
  await p.click('#btn-enter'); await p.waitForTimeout(1000);
  await p.click('#nw-door'); await p.waitForTimeout(1800);
  return p;
}
const nwLocal = p => p.evaluate(() => JSON.parse(JSON.stringify(window.__NWG.nw)));
const openMail = async p => { if (await p.$('#nw-mail')) { await p.click('#nw-mail [data-close]'); await p.waitForTimeout(150); } await p.click('.vb[data-bld="mail"]'); await p.waitForSelector('#nw-mail', { timeout: 4000 }); await p.waitForFunction(() => !document.querySelector('#nw-mail [data-msg]') || !document.querySelector('#nw-mail [data-msg]').textContent.includes('讀信中'), null, { timeout: 4000 }).catch(() => {}); await p.waitForTimeout(200); };
/* 把禮物視窗一個個關掉，順便收集文字 */
const gifts = async p => { const t = []; for (let i = 0; i < 40 && await p.$('#nw-gift'); i++) { t.push((await p.textContent('#nw-gift')).replace(/\s+/g, ' ')); await p.click('#nw-gift [data-ok]'); await p.waitForTimeout(150); } return t; };
const mail = (aud, o = {}) => Object.assign({ aud, title: '信', body: '內容', items: [{ type: 'coins', n: 10 }], from: '老師', sendAt: NOW - 1000, expireAt: 0, t: NOW - 1000, src: 'manual' }, o);
const me = ['id:' + ID5];

(async () => {
  const D = await import('../../nw-data.js');
  const b = await chromium.launch();
  let teacherFs = null;

  /* ═══ ① 教師頁：禮物清單 ═══ */
  {
    const p = await teacher(b, tseed());
    await tab(p, 'mail');
    const types = await optVals(p, '[data-addgift]');
    ok(['weapon', 'coins', 'potion', 'exp', 'item', 'mat', 'bp', 'gear', 'word', 'hr', 'zone', 'dex', 'tut'].every(t => types.includes(t)), '禮物種類涵蓋所有學生端 type：' + types.join(','));
    /* 一次加 12 種各一列，index 照 types 順序 */
    const order = ['weapon', 'coins', 'potion', 'exp', 'item', 'mat', 'bp', 'word', 'hr', 'zone', 'dex', 'tut'];
    for (const t of order) await p.selectOption('[data-addgift]', t);
    const ix = t => order.indexOf(t);
    const wordVals = await optVals(p, `[data-key="${ix('word')}"]`);
    ok(D.WORDS.every(w => wordVals.includes(w.id)) && wordVals.length === D.WORDS.length, `稱號清單涵蓋 WORDS 全部 ${D.WORDS.length} 個`);
    const groups = await p.$$eval(`[data-key="${ix('word')}"] optgroup`, g => g.map(x => x.label));
    ok(JSON.stringify(groups) === JSON.stringify(D.WORD_GROUPS), '稱號依三組顯示：' + groups.join('／'));
    const wByG = await p.$$eval(`[data-key="${ix('word')}"] optgroup`, gs => gs.map(g => [...g.querySelectorAll('option')].map(o => o.value)));
    ok(D.WORD_GROUPS.every((g, i) => JSON.stringify(wByG[i]) === JSON.stringify(D.WORDS.filter(w => w.g === g).map(w => w.id))), '每一組的稱號都放對組');
    ok(JSON.stringify(await optVals(p, `[data-key="${ix('weapon')}"]`)) === JSON.stringify(Object.keys(D.GIFT_WEAPONS)), '武器清單＝GIFT_WEAPONS');
    /* 裝備（2b）：清單＝GEAR_DEFS，顏色只能選那件做得出來的，強化 +0～+5 */
    ok(types.includes('gear'), '禮物種類有「🛡 裝備」');
    await p.selectOption('[data-addgift]', 'gear');
    const gi = order.length;
    const gearVals = await optVals(p, `[data-key="${gi}"]`);
    ok(Object.keys(D.GEAR_DEFS).every(k => gearVals.includes(k)) && gearVals.length === Object.keys(D.GEAR_DEFS).length, `裝備清單涵蓋 GEAR_DEFS 全部 ${Object.keys(D.GEAR_DEFS).length} 件`);
    await p.selectOption(`[data-key="${gi}"]`, 'coo_hat'); await p.waitForTimeout(150);
    ok(JSON.stringify(await optVals(p, `[data-gc="${gi}"]`)) === JSON.stringify(['green']) && JSON.stringify(await optVals(p, `[data-gp="${gi}"]`)) === JSON.stringify(['0', '1', '2', '3', '4', '5']), '咕咕帽：顏色只有綠色、強化 +0～+5');
    await p.selectOption(`[data-gp="${gi}"]`, '3'); await p.waitForTimeout(150);
    ok((await p.textContent('[data-pv]')).includes('咕咕帽 +3'), '預覽：「🛡 咕咕帽 +3」');
    await p.selectOption(`[data-key="${gi}"]`, 'w_dagger'); await p.waitForTimeout(150);
    ok(JSON.stringify(await optVals(p, `[data-gc="${gi}"]`)) === JSON.stringify(['gray', 'green']), '換成小刀：顏色換成灰、綠（舊的強化與顏色重新對過）');
    ok(JSON.stringify(await optVals(p, `[data-key="${ix('bp')}"]`)).includes('bp_cloth_hat') && (await p.$$eval(`[data-key="${ix('bp')}"] optgroup`, g => g.map(x => x.label))).includes('鐵匠送的布裝'), '圖紙清單有布裝圖紙（放在「鐵匠送的布裝」）');
    await p.click(`[data-del="${gi}"]`); await p.waitForTimeout(150);   // 拿掉這一列，後面「寄出 12 種」的檢查不要被多的一列影響
    ok(JSON.stringify(await optVals(p, `[data-key="${ix('item')}"]`)) === JSON.stringify(Object.keys(D.ITEM_DEFS).filter(k => k !== 'potion')), '道具清單＝ITEM_DEFS（回復藥有專屬種類）');
    const dropIds = Object.values(D.MONSTERS).flatMap(m => m.drops.map(d => d[0]));
    const matVals = await optVals(p, `[data-key="${ix('mat')}"]`);
    ok(dropIds.every(i => matVals.includes(i)) && matVals.length === dropIds.length && !matVals.some(v => v.startsWith('bp_')), '材料清單＝魔物 drops，沒有混進圖紙');
    const bpIds = [...Object.values(D.MONSTERS).flatMap(m => m.rare.map(r => r[0])), ...Object.keys(D.STARTERS).map(k => 'bp_' + k), ...D.CLOTH_BPS];
    const bpVals = await optVals(p, `[data-key="${ix('bp')}"]`);
    ok(bpIds.every(i => bpVals.includes(i)) && bpVals.length === bpIds.length, '圖紙清單＝魔物 rare＋初心武器圖紙＋鐵匠送的布裝圖紙');
    const regs = Object.keys(D.REGIONS).filter(k => !D.REGIONS[k].wip);
    ok(JSON.stringify(await optVals(p, `[data-key="${ix('zone')}"]`)) === JSON.stringify(regs), '區域清單只有已開放的區域：' + regs.join(','));
    ok(JSON.stringify(await optVals(p, `[data-key="${ix('dex')}"]`)) === JSON.stringify(Object.keys(D.MONSTERS)), '圖鑑清單＝MONSTERS');
    ok(JSON.stringify(await optVals(p, `[data-key="${ix('tut')}"]`)) === JSON.stringify(['dodge', 'defend', 'attack']), '教學課清單：閃避、防禦、打字');
    /* 解鎖條件文字（選了就顯示） */
    await p.selectOption(`[data-key="${ix('word')}"]`, 'senior');
    ok((await T(p, `[data-hint="${ix('word')}"]`)).includes('解鎖條件：獵人等級 10'), '選了稱號顯示解鎖條件（how）：' + await T(p, `[data-hint="${ix('word')}"]`));
    ok((await T(p, `[data-hint="${ix('zone')}"]`)).includes('只往上不往下') && (await T(p, `[data-hint="${ix('tut')}"]`)).includes('200'), '補發類有注意事項');
    /* 搜尋：名稱與解鎖條件都找得到；只剩符合的 */
    await p.fill(`[data-gq="${ix('word')}"]`, '抓蟲');
    const found = await optVals(p, `[data-key="${ix('word')}"]`);
    ok(found.length >= 5 && found.every(v => { const w = D.WORDS.find(x => x.id === v); return (w.w + w.how + w.id).includes('抓蟲'); }) && found.includes('bug3') && !found.includes('novice'), `搜尋「抓蟲」：只剩 ${found.length} 個（${found.join(',')}）`);
    ok((await T(p, `[data-hint="${ix('word')}"]`)).includes('解鎖條件'), '搜尋後說明跟著換');
    await p.fill(`[data-gq="${ix('word')}"]`, '獵人等級 20');
    ok(JSON.stringify(await optVals(p, `[data-key="${ix('word')}"]`)) === '["ace"]' && (await p.inputValue(`[data-key="${ix('word')}"]`)) === 'ace', '用解鎖條件的字搜尋：「獵人等級 20」→ 王牌，並且自動選到它');
    await p.fill(`[data-gq="${ix('word')}"]`, '');
    ok((await optVals(p, `[data-key="${ix('word')}"]`)).length === D.WORDS.length, '清掉搜尋字又回到全部');

    /* 摘要與標籤跟學生端同樣的字 */
    await p.fill(`[data-n="${ix('hr')}"]`, '8'); await p.fill(`[data-n="${ix('zone')}"]`, '3');
    await p.selectOption(`[data-key="${ix('zone')}"]`, 'grass'); await p.selectOption(`[data-key="${ix('dex')}"]`, 'frog'); await p.selectOption(`[data-key="${ix('tut')}"]`, 'attack');
    await p.selectOption(`[data-key="${ix('bp')}"]`, 'bp_coo_hat'); await p.selectOption(`[data-key="${ix('word')}"]`, 'staff2');
    await p.check('input[name="mode"][value="stu"]'); await p.fill('[data-q]', '小明'); await p.click(`[data-add="${ID5}"]`);
    await p.fill('[data-title]', '全部種類');
    const chips = await p.$$eval('[data-preview-card] .chip', c => c.map(x => x.textContent.trim()));
    ok(chips.includes('📜 圖紙「咕咕帽圖紙」') && chips.includes('⭐ 獵人等級升到 8') && chips.includes('🗺 新芽草原 ★3 以下都算過關') && chips.includes('📖 圖鑑：泡泡蛙（防禦測試）') && chips.includes('🏫 教學大樓：打字課學會了') && chips.includes('🏅 稱號詞條「賢者」'), '預覽的禮物標籤（學生看到的字）：' + chips.join('｜'));

    /* 防呆：區域星數超出範圍、等級太高要再確認 */
    await p.fill(`[data-n="${ix('zone')}"]`, '6'); await p.click('[data-submit]');
    ok((await T(p, '[data-err]')).includes('數量要是 1～5') && await modalOpen(p) === 0, '區域 ★6：擋下來「數量要是 1～5」');
    await p.fill(`[data-n="${ix('zone')}"]`, '3'); await p.fill(`[data-n="${ix('hr')}"]`, '1'); await p.click('[data-submit]');
    ok((await T(p, '[data-err]')).includes('數量要是 2～50'), '獵人等級 1：擋下來「數量要是 2～50」（不會往下）');
    await p.fill(`[data-n="${ix('hr')}"]`, '20'); await p.click('[data-submit]'); await p.waitForSelector('[data-modal]');
    ok((await modalText(p)).includes('數量比平常多很多') && (await modalText(p)).includes('獵人等級升到 20'), '獵人等級直接升到 20：跳「數量比平常多很多」');
    await clickModal(p, 'no'); await p.waitForTimeout(100);
    ok((await fsKeys(p, 'mg_mail/')).length === 0, '回去改：沒有寄出');
    await p.fill(`[data-n="${ix('hr')}"]`, '8'); await p.fill(`[data-n="${ix('zone')}"]`, '5'); await p.click('[data-submit]'); await p.waitForSelector('[data-modal]');
    ok((await modalText(p)).includes('數量比平常多很多') && (await modalText(p)).includes('★5'), '區域打贏到 ★5（會開放下一區）：也要再確認');
    await clickModal(p, 'no'); await p.waitForTimeout(100);

    /* 寄出：每種的欄位 */
    await p.fill(`[data-n="${ix('zone')}"]`, '3'); await p.click('[data-submit]'); await p.waitForSelector('[data-modal]'); await clickModal(p, 'ok'); await p.waitForTimeout(300);
    if (await modalOpen(p)) await clickModal(p, 'ok');
    await p.waitForTimeout(500);
    const ms = (await fsKeys(p, 'mg_mail/')).map(k => k);
    const sent = ms.length ? await fsDoc(p, ms[0]) : null;
    const it = t => (sent && sent.items.find(x => x.type === t)) || {};
    ok(sent && sent.items.length === 12 && it('hr').n === 8 && it('zone').key === 'grass' && it('zone').n === 3 && it('dex').key === 'frog' && it('tut').key === 'attack' && it('bp').key === 'bp_coo_hat' && it('word').key === 'staff2', '寄出：12 種禮物的欄位都對 ' + JSON.stringify(sent && sent.items.slice(6)));
    ok(sent && JSON.stringify(sent.aud) === JSON.stringify(me), '收件人是小明一個人');
    noErr(p); await p.close();
  }

  /* ═══ ② 清單由資料表自動產生：動態塞假資料 ═══ */
  {
    const p = await teacher(b, tseed());
    await tab(p, 'mail');
    await p.evaluate(async () => {
      const D = await import('/nw-data.js');
      D.WORDS.push({ id: 'zz_fake', w: '假稱號', g: '成就', how: '測試用的條件', test: () => false });
      D.WORDS.push({ id: 'zz_fake2', w: '假等級稱號', g: '等級', how: '另一個測試條件', test: () => false });
      D.ITEM_DEFS.zzCard = { name: '假道具卡', desc: '測試' };
      D.GIFT_WEAPONS.zzblade = { name: '假之刃', kind: '黑刃', fam: '測試', base: 'dagger', desc: '測試' };
      D.MAT_INFO.zz_ore = ['假礦石', 'blue']; D.MAT_INFO.bp_zz = ['假圖紙', 'green'];
    });
    for (const t of ['word', 'item', 'weapon', 'mat', 'bp']) await p.selectOption('[data-addgift]', t);
    const w = await optVals(p, '[data-key="0"]');
    ok(w.includes('zz_fake') && w.includes('zz_fake2'), '新增稱號詞條到資料表：清單自動出現（教師頁沒改）');
    const wg = await p.$$eval('[data-key="0"] optgroup', gs => gs.map(g => [g.label, [...g.querySelectorAll('option')].map(o => o.value)]));
    ok(wg.find(g => g[0] === '成就')[1].includes('zz_fake') && wg.find(g => g[0] === '等級')[1].includes('zz_fake2'), '新稱號出現在自己那一組');
    await p.selectOption('[data-key="0"]', 'zz_fake');
    ok((await T(p, '[data-hint="0"]')).includes('測試用的條件'), '新稱號的解鎖條件也會顯示');
    ok((await optVals(p, '[data-key="1"]')).includes('zzCard'), '新增道具：清單自動出現');
    ok((await optVals(p, '[data-key="2"]')).includes('zzblade'), '新增禮物武器：清單自動出現');
    ok((await optVals(p, '[data-key="3"]')).includes('zz_ore') && !(await optVals(p, '[data-key="3"]')).includes('bp_zz'), '新增材料：出現在材料清單，圖紙不會混進來');
    ok((await optVals(p, '[data-key="4"]')).includes('bp_zz'), '新增圖紙：出現在圖紙清單');
    await p.selectOption('[data-key="3"]', 'zz_ore'); await p.selectOption('[data-key="1"]', 'zzCard');
    ok((await p.$$eval('[data-gifts] .gift-row', r => r.length)) === 5, '五列都在');
    await p.check('input[name="mode"][value="all"]');
    const chips = await p.$$eval('[data-preview-card] .chip', c => c.map(x => x.textContent.trim()));
    ok(chips.includes('📦 假礦石 ×1') && chips.includes('🎴 假道具卡 ×1') && chips.includes('🏅 稱號詞條「假稱號」'), '預覽顯示新東西的名字：' + chips.join('｜'));
    /* 活動獎勵的禮物列（gift-ui）也是同一份資料表 */
    await tab(p, 'events');
    await p.evaluate(async () => { const D = await import('/nw-data.js'); D.WORDS.push({ id: 'zz_fake3', w: '活動假稱號', g: '成就', how: '測試', test: () => false }); });
    noErr(p); await p.close();
  }

  /* ═══ ③ 頒稱號（人物卡、學生卡）、給東西 ═══ */
  {
    const p = await teacher(b, tseed());
    await tab(p, 'students');
    await openPc(p, ID5);
    ok(await p.$('[data-pc-act="title"]') !== null && await p.$('[data-pc-act="gift"]') !== null, '人物卡有「🏷 頒稱號」「🎁 給東西」');
    const own = k => T(p, `[data-pc-own="${k}"]`);
    ok((await own('words')).includes('等級：新手、見習') && !(await own('words')).includes('成就') && (await T(p, '[data-pc-ownbox]')).includes('稱號詞條 2'), '人物卡：已有稱號詞條（依組別）：' + await own('words'));
    ok((await own('mats')).includes('咕咕羽毛×4') && (await own('mats')).includes('炎牙×1') && (await own('bps')).includes('咕咕帽圖紙') && (await own('items')).includes('改名卡×1') && (await own('items')).includes('回復藥×2') && (await own('weapons')).includes('鐵製小刀') && (await own('weapons')).includes('測試者之刃'),
      '人物卡：材料、圖紙、道具、武器：' + (await T(p, '[data-pc-ownbox]')));
    await p.click('[data-pc-act="title"]'); await p.waitForSelector('[data-tlist]');
    ok((await modalText(p)).includes('頒稱號：503・5號 小明') && await p.$('[data-tpick]') !== null, '頒稱號視窗開啟（寫著是誰）');
    const total = await p.$$eval('[data-tpick]', e => e.length);
    ok(total === D.WORDS.length, `列出全部 ${D.WORDS.length} 個稱號詞條`);
    ok(await p.$eval('[data-tpick="novice"]', e => e.disabled) && await p.$eval('[data-tpick="rookie"]', e => e.disabled) && (await T(p, '[data-tpick="novice"]')).includes('已擁有') && !(await T(p, '[data-tpick="ace"]')).includes('已擁有'), '已經擁有的標「已擁有」且不能選');
    { const mt = await modalText(p); ok(['等級詞條', '武器詞條', '成就詞條'].every(x => mt.includes(x)), '依三組（等級、武器、成就）分類顯示'); }
    ok((await T(p, '[data-tpick="senior"]')).includes('獵人等級 10'), '每個稱號旁邊顯示解鎖條件');
    await p.fill('[data-tq]', '抓蟲'); await p.waitForTimeout(100);
    const sh = await p.$$eval('[data-tpick]', e => e.map(x => x.dataset.tpick));
    ok(sh.includes('bug3') && !sh.includes('novice') && sh.length < 10, '可以搜尋：' + sh.join(','));
    ok(await p.$eval('[data-btn="ok"]', e => e.disabled), '還沒選稱號，不能寄出');
    await p.click('[data-tpick="bugking"]');
    ok((await T(p, '[data-tpv]')).includes('新的稱號詞條：職業除錯師') && (await T(p, '[data-tpv]')).includes('稱號詞條「職業除錯師」') && !(await p.$eval('[data-btn="ok"]', e => e.disabled)), '預覽：學生會看到的信（標題、禮物標籤）');
    await p.fill('[data-tq]', ''); await p.click('[data-tpick="ace"]');
    await clickModal(p, 'ok'); await p.waitForTimeout(500);
    const id = `title_ace_${ID5}`;
    const m1 = await fsDoc(p, 'mg_mail/' + id);
    ok(m1 && JSON.stringify(m1.aud) === JSON.stringify(me) && JSON.stringify(m1.items) === '[{"type":"word","key":"ace"}]' && m1.src === 'award' && m1.from === '老師' && m1.expireAt === 0 && m1.sendAt <= Date.now() && m1.title === '新的稱號詞條：王牌', '寄出一封信：固定 ID title_{詞條}_{學生}，只有他、禮物是 word ace、來源「頒獎」');
    ok((await fsKeys(p, 'mg_admin_log/')).length === 1 && (await fsDoc(p, (await fsKeys(p, 'mg_admin_log/'))[0])).act === '頒稱號', '寫了操作紀錄「頒稱號」');
    ok(await modalOpen(p) === 1, '回到人物卡');
    /* 同一個稱號不會重複寄 */
    await p.click('[data-pc-act="title"]'); await p.waitForSelector('[data-tlist]');
    ok(await p.$eval('[data-tpick="ace"]', e => e.disabled) && (await T(p, '[data-tpick="ace"]')).includes('已寄出'), '同一個稱號：標「已寄出，還沒領」且不能再選');
    await p.evaluate(() => document.querySelector('[data-tpick="ace"]').disabled = false);
    await p.click('[data-tpick="ace"]'); await clickModal(p, 'ok'); await p.waitForTimeout(500);
    ok((await fsKeys(p, 'mg_mail/title_ace_')).length === 1 && (await fsKeys(p, 'mg_admin_log/')).length === 1, '硬按也不會重複寄（寄出前再問一次這個固定 ID），沒有多寫操作紀錄');
    if (await p.$('[data-tlist]')) await clickModal(p, 'no');
    await p.waitForTimeout(100);
    /* 給東西：收件人預填、停在加禮物 */
    await p.click('[data-pc-act="gift"]'); await ready(p);
    ok(await p.isChecked('input[name="mode"][value="stu"]') && (await p.$$('[data-chosen] .chip')).length === 1 && (await T(p, '[data-chosen]')).includes('小明') && await modalOpen(p) === 0, '人物卡「給東西」：跳到信箱、收件人小明已選');
    ok(await p.evaluate(() => document.activeElement && document.activeElement.hasAttribute('data-addgift')), '游標停在「加一個禮物」');
    /* 學生卡 */
    await tab(p, 'students');
    await p.click(`tr[data-id="${ID5}"] td:nth-child(2)`); await p.waitForSelector('[data-modal]'); await p.waitForTimeout(300);
    ok(await p.$('[data-modal] [data-act="title"]') !== null && await p.$('[data-modal] [data-act="gift"]') !== null, '學生卡也有「🏷 頒稱號」「🎁 給東西」');
    const o2 = k => T(p, `[data-modal] [data-own="${k}"]`);
    ok((await o2('words')).includes('等級：新手、見習') && (await o2('words')).includes('武器：—') && (await o2('words')).includes('成就：—') && (await o2('bps')).includes('咕咕帽圖紙') && (await o2('mats')).includes('咕咕羽毛×4') && (await o2('items')).includes('回復藥×2') && (await o2('weapons')).includes('測試者之刃'),
      '學生卡：稱號詞條（三組）、圖紙、材料、道具、武器：' + (await o2('words')));
    await p.click('[data-modal] [data-act="title"]'); await p.waitForSelector('[data-tlist]');
    ok(await p.$eval('[data-tpick="ace"]', e => e.disabled), '學生卡的頒稱號：王牌已寄出');
    await p.click('[data-tpick="legend"]'); await clickModal(p, 'ok'); await p.waitForTimeout(500);
    ok((await fsKeys(p, 'mg_mail/title_legend_')).length === 1, '學生卡頒稱號：寄出「傳說」');
    await p.click('[data-modal] [data-act="gift"]'); await ready(p);
    ok(await p.isChecked('input[name="mode"][value="stu"]') && (await p.$$('[data-chosen] .chip')).length === 1, '學生卡「給東西」：收件人預填');
    teacherFs = await p.evaluate(() => JSON.parse(JSON.stringify(window.__FS)));
    noErr(p); await p.close();
  }

  /* ═══ ④ 頒稱號：學生端領取、解鎖、戴上 ═══ */
  {
    const seed = {}; Object.keys(teacherFs).filter(k => k.startsWith('mg_mail/title_')).forEach(k => { seed[k] = teacherFs[k]; });
    const p = await student(b, { seed });
    const n0 = await nwLocal(p);
    ok(!n0.words.includes('ace') && !n0.words.includes('legend'), '領之前沒有「王牌」「傳說」');
    await openMail(p);
    const txt = await p.textContent('#nw-mail');
    ok(txt.includes('新的稱號詞條：王牌') && txt.includes('稱號詞條「王牌」') && txt.includes('背包點名字下面的稱號'), '信箱：標題、內容、禮物標籤；說明去背包戴上');
    await p.click('#nw-mail [data-claim="title_ace_' + ID5 + '"]'); await p.waitForSelector('#nw-gift', { timeout: 4000 });
    const g = await gifts(p);
    ok(g.some(t => t.includes('新的稱號詞條：王牌') && t.includes('背包點名字下面的稱號，就能把它戴上')), '通知：「新的稱號詞條：王牌」＋戴上的提示：' + g.join(' ／ ').replace(/@keyframes.*?\}\}\s*(?=🎁)/, '').slice(0, 160));
    const n1 = await nwLocal(p);
    ok(n1.words.includes('ace') && n1.awards.ace === 1 && n1.words.filter(w => w === 'ace').length === 1 && n1.mail['title_ace_' + ID5], '詞條解鎖：words、awards 都寫進去、信標已領');
    const cloud = (await p.evaluate(id => window.__FS['mg_scores/' + id].nw, ID5));
    ok(cloud.words.includes('ace') && cloud.mail['title_ace_' + ID5], '領完立刻存到雲端');
    /* 重複領不會重複加 */
    await openMail(p);
    ok(await p.$(`#nw-mail [data-mail="title_ace_${ID5}"] [data-claim]`) === null && (await p.textContent(`#nw-mail [data-mail="title_ace_${ID5}"]`)).includes('已領'), '領過的信沒有「領取」鈕');
    /* 戴上 */
    await p.click('#nw-mail [data-close]'); await p.waitForTimeout(150);
    await p.click('[data-act="bagopen"]'); await p.waitForTimeout(500);
    await p.click('[data-title-edit]'); await p.waitForSelector('#nw-title');
    ok(!(await p.$eval('#nw-title [data-add="ace"]', e => e.disabled)) && !(await p.$eval('#nw-title [data-add="novice"]', e => e.disabled)), '背包稱號編輯器：新詞條是亮的、可以點');
    await p.click('#nw-title [data-add="ace"]'); await p.click('#nw-title [data-add="novice"]');
    ok((await p.textContent('#nw-title')).includes('王牌新手'), '拚成「王牌新手」');
    await p.click('#nw-title [data-ok]'); await p.waitForTimeout(1300);
    const n2 = await nwLocal(p);
    ok(n2.title === '王牌新手' && JSON.stringify(n2.titleParts) === '["ace","novice"]', '稱號戴上了：' + n2.title);
    noErr(p); await p.close();
  }

  /* ═══ ⑤ 學生端：每種新類型領一次、重複不加、未知不壞 ═══ */
  {
    const seedMail = {
      'mg_mail/w1': mail(me, { title: 'w1', items: [{ type: 'word', key: 'staff2' }, { type: 'word', key: 'bug3' }] }),
      'mg_mail/bp1': mail(me, { title: 'bp1', items: [{ type: 'bp', key: 'bp_coo_hat' }, { type: 'bp', key: 'bp_staff' }] }),
      'mg_mail/hr1': mail(me, { title: 'hr1', items: [{ type: 'hr', n: 5 }] }),
      'mg_mail/zone1': mail(me, { title: 'zone1', items: [{ type: 'zone', key: 'grass', n: 3 }] }),
      'mg_mail/dex1': mail(me, { title: 'dex1', items: [{ type: 'dex', key: 'frog' }, { type: 'dex', key: 'coo' }] }),
      'mg_mail/tut1': mail(me, { title: 'tut1', items: [{ type: 'tut', key: 'dodge' }, { type: 'tut', key: 'defend' }, { type: 'tut', key: 'attack' }] }),
      'mg_mail/mat1': mail(me, { title: 'mat1', items: [{ type: 'mat', key: 'wolf_fang', n: 2 }] }),
      /* 不認得的：整封都不領（連裡面認得的也不給） */
      'mg_mail/u1': mail(me, { title: 'u1', items: [{ type: 'zone', key: 'coast', n: 2 }] }),
      'mg_mail/u2': mail(me, { title: 'u2', items: [{ type: 'bp', key: 'bp_nope' }] }),
      'mg_mail/u3': mail(me, { title: 'u3', items: [{ type: 'mat', key: 'nope', n: 1 }] }),
      'mg_mail/u4': mail(me, { title: 'u4', items: [{ type: 'gear', key: 'coo_hat', p: 1 }] }),
      'mg_mail/u5': mail(me, { title: 'u5', items: [{ type: 'hr', n: 99 }] }),
      'mg_mail/u6': mail(me, { title: 'u6', items: [{ type: 'tut', key: 'fly' }] }),
      'mg_mail/u7': mail(me, { title: 'u7', items: [{ type: 'word', key: 'nope' }] }),
      'mg_mail/u8': mail(me, { title: 'u8', items: [{ type: 'potion', n: 99 }, { type: 'bp', key: 'bp_nope' }] }),
      'mg_mail/u9': mail(me, { title: 'u9', items: [{ type: 'zone', key: 'constructor', n: 1 }, { type: 'dex', key: 'toString' }] }),
      'mg_mail/u10': mail(me, { title: 'u10', items: [{ type: 'hr', n: '5' }, { type: 'zone', key: 'grass', n: 2.5 }] })
    };
    const p = await student(b, { seed: seedMail, nw: { quest: { done: ['1-0'] } } });
    const n0 = await nwLocal(p);
    await openMail(p);
    const unk = ['u1', 'u2', 'u3', 'u4', 'u5', 'u6', 'u7', 'u8', 'u9', 'u10'];
    ok((await Promise.all(unk.map(async u => await p.$(`#nw-mail [data-mail="${u}"]:not(:has([data-claim]))`) !== null && (await p.textContent(`#nw-mail [data-mail="${u}"]`)).includes('請按 F5 重新整理再來領')))).every(Boolean), '不認得的 10 封：沒有「領取」鈕、寫「請按 F5 重新整理再來領」（含欄位不合理、key 是 constructor、數字是字串、星數 2.5）');
    ok((await p.textContent('#nw-mail')).includes('圖紙「咕咕帽圖紙」') && (await p.textContent('#nw-mail')).includes('獵人等級升到 5') && (await p.textContent('#nw-mail')).includes('新芽草原 ★3 以下都算過關') && (await p.textContent('#nw-mail')).includes('圖鑑：泡泡蛙') && (await p.textContent('#nw-mail')).includes('教學大樓：閃避課學會了'), '信箱上的禮物標籤（新種類）');
    await p.click('#nw-mail [data-all]'); await p.waitForSelector('#nw-gift', { timeout: 4000 });
    const g = (await gifts(p)).join(' ／ ');
    const n1 = await nwLocal(p);
    ok(['w1', 'bp1', 'hr1', 'zone1', 'dex1', 'tut1', 'mat1'].every(k => n1.mail[k]) && unk.every(k => !n1.mail[k]), '認得的 7 封都標已領；不認得的 10 封都沒有');
    ok(n1.words.includes('staff2') && n1.words.includes('bug3') && n1.awards.staff2 === 1 && g.includes('新的稱號詞條：賢者') && g.includes('新的稱號詞條：抓蟲隊長'), '稱號（武器組、成就組）：解鎖，通知有名字');
    ok(n1.bp.includes('bp_coo_hat') && n1.bp.includes('bp_staff') && g.includes('圖紙「咕咕帽圖紙」'), '圖紙 bp：學會了，通知寫圖紙名');
    ok(n1.hr >= 5 && n1.stars >= 4 && g.includes('獵人等級升到 5'), `獵人等級 hr：升到 ${n1.hr}（星星 ${n1.stars}，每級一顆）`);
    ok(n1.zone.grass === 3 && n1.zone.forest === 0 && g.includes('新芽草原 ★3 以下都算過關'), '區域 zone：草原打贏到 ★3');
    ok(n1.dex.frog === 1 && n1.dex.coo === 1 && !n1.dex.shroom, '圖鑑 dex：泡泡蛙、咕咕鳥標成打過（次數 1）');
    ok(n1.tut.dodge === 1 && n1.tut.defend === 1 && n1.tut.attack === 1, '教學課 tut：三堂都標學會');
    ok(n1.mats.wolf_fang === 2, '材料：炎牙 ×2');
    ok(n1.quest.done.includes('1-0a') && n1.quest.done.includes('1-1') && n1.quest.done.includes('1-2') && g.includes('任務完成：到教學大樓學會三堂課'), '狀態類禮物領完立刻重算主線任務（1-0a、1-1、1-2 完成），任務完成通知也有：' + n1.quest.done.join(','));
    ok(n1.tm.m_dodge && n1.tm.m_defend && n1.tm.m_school && n1.words.includes('grad') && n1.words.includes('skilled'), '測試員任務蓋章、「畢業生」「熟練」詞條跟著解鎖');
    ok(n1.coins > n0.coins, '任務與測試員任務的字元都給了：' + n0.coins + ' → ' + n1.coins);
    ok(n1.items.potion === 3, '含不認得東西的 u8（回復藥 99＋壞圖紙）：整封不領，回復藥還是 3');
    const cloud = await p.evaluate(id => window.__FS['mg_scores/' + id].nw, ID5);
    ok(['w1', 'bp1', 'hr1', 'zone1', 'dex1', 'tut1', 'mat1'].every(k => cloud.mail[k]) && cloud.zone.grass === 3 && cloud.bp.length === 2, '領完立刻存到雲端');
    /* 重複領：同一封不能再領；另一封（不同 ID）給一樣的東西，不會重複加 */
    const before = await nwLocal(p);
    await openMail(p);
    ok((await p.$$('#nw-mail [data-claim]')).length === 0 && await p.$eval('#nw-mail [data-all]', e => e.disabled), '重開信箱：沒有「領取」鈕，「全部領取」是灰的');
    await p.evaluate(({ id, now }) => {
      const m = (t, items) => ({ aud: ['id:' + id], title: t, body: '', items, from: '老師', sendAt: now - 500, expireAt: 0, t: now - 500, src: 'manual' });
      window.__FS['mg_mail/d1'] = m('d1', [{ type: 'bp', key: 'bp_coo_hat' }, { type: 'hr', n: 3 }, { type: 'zone', key: 'grass', n: 2 }, { type: 'dex', key: 'frog' }, { type: 'tut', key: 'dodge' }, { type: 'word', key: 'staff2' }]);
    }, { id: ID5, now: NOW });
    await openMail(p);
    await p.click('#nw-mail [data-claim="d1"]'); await p.waitForSelector('#nw-gift', { timeout: 4000 });
    const g2 = (await gifts(p)).join(' ／ ');
    const after = await nwLocal(p);
    ok(after.bp.length === before.bp.length && after.hr === before.hr && after.zone.grass === 3 && after.dex.frog === 1 && after.words.filter(w => w === 'staff2').length === 1 && after.mail.d1, '另一封信送一樣的東西：圖紙不重複、等級不往下、區域不往下、圖鑑次數不變、詞條不重複');
    ok(g2.includes('已經會了') && g2.includes('已經比這個高了') && g2.includes('走得比這裡更遠') && g2.includes('本來就打倒過') && g2.includes('已經學會了') && g2.includes('本來就有了'), '通知寫「已經會了／已經比這個高了／走得更遠／本來就打倒過／已經學會了／本來就有了」');
    ok(after.coins === before.coins + D.BP_DUP_COINS, `重複的圖紙換成 ${D.BP_DUP_COINS} 字元（GDD §12.5），其他重複的都不多給字元`);
    /* 背包看得到 */
    await p.click('#nw-mail [data-close]').catch(() => {}); await p.waitForTimeout(100);
    await p.click('[data-act="bagopen"]'); await p.waitForTimeout(400);
    await p.click('#nw-bag [data-bag-tab="bp"]'); await p.waitForTimeout(200);
    ok((await p.textContent('#nw-bag')).includes('咕咕帽圖紙') && (await p.textContent('#nw-bag')).includes('學徒木杖圖紙'), '背包「圖紙」分頁看得到');
    ok(!(await p.evaluate(() => window.__WRITES.some(w => w.path.startsWith('mg_mail')))), '學生端沒有寫過 mg_mail');
    noErr(p); await p.close();
  }

  await b.close();
  console.log(fails ? `\n${fails} 項失敗` : '\n全部通過');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
