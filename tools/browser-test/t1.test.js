/* 第 7 步（前半 A）：教師管理頁 teacher.html（SPEC §2、§3.3、§5.2、§1.8 第 4 步）。
   全程開 window.__RULES：老師要用 admin app 登入、mg_admins 有自己，才寫得進去。
   老師頁與學生頁是兩個瀏覽器分頁，各有一份假資料庫；要驗證「學生真的收得到」，
   就把老師頁寫完的 window.__FS 整份搬去當學生頁的種子資料。
   測試資料一律用假名（小明、小華…）。 */
const { chromium } = require('playwright'); const fs = require('fs');
const path = require('path'); const M = path.join(__dirname, 'mock') + '/'; const OUT = process.argv[2] || require('os').tmpdir();
const css = require('./tw.js')(OUT);
/* 最新一則改版公告的 id：發新公告時不用回來改測試（「已讀」的種子資料要等於它，不然會跳公告、冒「！」） */
const NOTICE_ID = /export const NOTICES = \[\s*\{ id: '([^']+)'/.exec(fs.readFileSync(path.join(__dirname, '../../nw-data.js'), 'utf8'))[1];
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const NOW = Date.now(), H = 3600000, D = 24 * H;
const C3 = '五年級3班', C4 = '五年級4班', ID5 = C3 + '_5號', ID6 = C3 + '_6號', ID7 = C3 + '_7號', ID41 = C4 + '_1號';

const route = p => p.route('**/*', r => {
  const u = r.request().url();
  if (u.startsWith('http://localhost')) return r.continue();
  if (u.includes('cdn.tailwindcss.com')) return r.fulfill({ contentType: 'application/javascript', body: `const s=document.createElement('style');s.textContent=${JSON.stringify(css)};document.head.appendChild(s);` });
  const m = u.includes('firebase-app') ? 'app.js' : u.includes('firebase-auth') ? 'auth.js' : u.includes('firebase-firestore') ? 'fs.js' : null;
  if (m) return r.fulfill({ contentType: 'application/javascript', body: fs.readFileSync(M + m, 'utf8') });
  return r.abort();
});

/* ── 老師頁 ── */
async function teacher(browser, seed, o = {}) {
  const p = await browser.newPage({ viewport: o.mobile ? { width: 390, height: 800 } : { width: 1280, height: 900 } });
  const errs = []; p.errs = errs;
  p.on('pageerror', e => errs.push('pageerror: ' + e.message));
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|Missing or insufficient|permission/.test(m.text())) errs.push('console: ' + m.text()); });
  await p.addInitScript(a => {
    window.__FS = a.s; window.__RULES = true; localStorage.clear();
    if (a.pre) window.__ADMIN_PRESIGNED = { uid: 'T1', email: 'teacher@example.test' };
    if (a.other) window.__MOCK_ADMIN = { email: 'other@example.test', password: 'pw-x', uid: 'X1' };
  }, { s: seed, pre: o.pre !== false && !o.login, other: !!o.other });
  await route(p);
  await p.goto('http://localhost:8765/teacher.html');
  if (!o.login) { await p.waitForSelector('#app:not(.hidden)', { timeout: 8000 }); await ready(p); }
  else await p.waitForSelector('#login:not(.hidden)', { timeout: 8000 });
  return p;
}
const ready = p => p.waitForFunction(() => { const m = document.querySelector('#main'); return m && m.textContent && !m.textContent.includes('讀取中…') && m.children.length > 0; }, null, { timeout: 8000 }).then(() => p.waitForTimeout(150));
const tab = async (p, id, again) => { await p.click(`#nav [data-tab="${id}"]`); if (again) await p.waitForTimeout(100); await ready(p); };
const FS = (p, k) => p.evaluate(k => window.__FS[k], k);
const allFS = p => p.evaluate(() => JSON.parse(JSON.stringify(window.__FS)));
const keys = (p, pre) => p.evaluate(pre => Object.keys(window.__FS).filter(k => k.startsWith(pre)), pre);
const docsOf = (p, pre) => p.evaluate(pre => Object.entries(window.__FS).filter(([k]) => k.startsWith(pre)).map(([k, v]) => Object.assign({ _id: k.slice(pre.length) }, v)), pre);
const clickModal = (p, id) => p.evaluate(id => { const ms = document.querySelectorAll('[data-modal]'); ms[ms.length - 1].querySelector(`[data-btn="${id}"]`).click(); }, id);
const modalText = p => p.evaluate(() => { const ms = document.querySelectorAll('[data-modal]'); return ms.length ? ms[ms.length - 1].textContent.replace(/\s+/g, ' ') : ''; });
const modalOpen = p => p.evaluate(() => document.querySelectorAll('[data-modal]').length);
const noErr = (p, m = '沒有 JS 錯誤') => ok(p.errs.length === 0, m + ' ' + p.errs.join(' | '));
const mainText = p => p.textContent('#main').then(t => t.replace(/\s+/g, ' '));
const logsOf = async p => (await docsOf(p, 'mg_admin_log/')).sort((a, b) => a.t - b.t);

/* ── 種子資料 ── */
const stu = (cls, seat, name, o = {}) => [`mg_scores/${cls}_${seat}號`, Object.assign({ className: cls, seat, name, nwCls: cls, bestLevel: 10, bestScore: 20, scoreVer: 2, plays: 9, tutorialDone: true, talentIntroDone: true, tier: 'B', balanceVer: 3, punctDone: true, lastPlayedAt: { __ts: o.last === undefined ? NOW : o.last } },
  o.nw === null ? {} : { nw: Object.assign({ v: 1, savedAt: o.last === undefined ? NOW : o.last, look: { style: 1, hair: 2, skin: 1 }, starter: 'dagger', quest: { done: ['1-0', '1-0a'] }, items: { potion: 3 }, intro: { hub: 1, mail: 1, notice: 1 }, seenNotice: NOTICE_ID, name0: name, nick: ['a_flash', 'b_coo'] }, o.nw || {}) }, o.top || {})];
const base = () => Object.fromEntries([
  ['mg_admins/T1', { ok: true }],
  stu(C3, 5, '小明', { nw: { hr: 7, coins: 120, hunts: 10, stat: { wins: 8, fails: 2 }, mail: { m1: NOW - 1000 }, bugsSent: 2 } }),
  stu(C3, 6, '小華', { last: NOW - 3 * D, nw: { hr: 3, coins: 5, hunts: 4, stat: { wins: 2, fails: 2 }, nick: ['a_star', 'b_slime'] } }),
  stu(C3, 7, '阿強', { nw: { hr: 5, hunts: 6, stat: { wins: 4, fails: 2 }, name0: '阿志' } }),
  stu(C4, 1, '小美', { last: NOW - 10 * D, nw: null }),
  ['mg_mail/m1', { aud: ['all'], title: '舊信', body: '', items: [], from: '老師', sendAt: NOW - 1000, expireAt: 0, t: NOW - 1000, src: 'manual' }]
]);
const ev = (o = {}) => Object.assign({ type: 'boost', mul: 2, what: 'exp', title: '加倍', desc: '', startAt: NOW - H, endAt: NOW + 3 * D, cls: [] }, o);
const flag = (id, o) => [`mg_nw_flags/${id}`, Object.assign({ type: 'bug', status: 'pending', docId: ID5, cls: C3, seat: 5, name: '小明', cat: '畫面', text: 'x', did: '做了事', what: '壞了', t: NOW - H }, o)];

/* ── 學生頁（用老師頁寫完的資料） ── */
async function student(browser, seed, o = {}) {
  const p = await browser.newPage({ viewport: { width: 1200, height: 900 } });
  const errs = []; p.errs = errs; p.on('dialog', d => d.accept());
  p.on('pageerror', e => errs.push('pageerror: ' + e.message));
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|Missing or insufficient|permission/.test(m.text())) errs.push('console: ' + m.text()); });
  const { sha256Hex } = await import('../../nw-access.js');
  const hash = await sha256Hex('Test-Pass_9!x');
  await p.addInitScript(a => {
    window.__FS = a.s; window.__RULES = true; localStorage.clear(); localStorage.setItem('mg_nw_fast', '1');
    window.__NW_CODE_HASH__ = a.hash; localStorage.setItem('mg_nw_code', a.hash); window.__NW_NOGIFT__ = true; window.__NW_NOINTRO__ = true;
    window.confetti = () => {}; window.html2canvas = async () => document.createElement('canvas');
  }, { s: seed, hash });
  await route(p);
  await p.goto('http://localhost:8765/index.html'); await p.waitForFunction(() => window.__NWG, null, { timeout: 15000 }); await p.waitForTimeout(500);
  await p.selectOption('#in-grade', '五年級'); await p.selectOption('#in-class', '3班'); await p.fill('#in-seat', '5'); await p.waitForTimeout(900);
  if (o.name) await p.fill('#in-name', o.name);
  await p.click('#btn-enter'); await p.waitForTimeout(1000);
  await p.click('#nw-door'); await p.waitForTimeout(1800);
  await dismissGifts(p);   // 抓蟲件數 > 0 的人進村會先跳「除蟲員」任務獎勵，擋住按鈕
  return p;
}
const nwLocal = p => p.evaluate(() => JSON.parse(JSON.stringify(window.__NWG.nw)));
const openMail = async p => { await p.click('.vb[data-bld="mail"]'); await p.waitForSelector('#nw-mail', { timeout: 4000 }); await p.waitForFunction(() => !document.querySelector('#nw-mail [data-msg]') || document.querySelector('#nw-mail [data-msg]').textContent !== '讀信中…', null, { timeout: 4000 }); await p.waitForTimeout(200); };
const mailIds = p => p.$$eval('#nw-mail [data-mail]', els => els.map(e => e.dataset.mail));
const dismissGifts = async p => { for (let i = 0; i < 14; i++) { if (!(await p.$('#nw-gift'))) break; await p.click('#nw-gift [data-ok]'); await p.waitForTimeout(150); } };

(async () => {
  /* ── 靜態：設定與分頁檔 ── */
  {
    const idx = fs.readFileSync(path.join(__dirname, '../../index.html'), 'utf8'), tf = fs.readFileSync(path.join(__dirname, '../../teacher/fb.js'), 'utf8');
    const cfg = t => { const m = /const firebaseConfig = (\{[\s\S]*?\});/.exec(t) || /export const firebaseConfig = (\{[\s\S]*?\});/.exec(t); return m ? m[1].replace(/\s+/g, '') : ''; };
    ok(cfg(idx) && cfg(idx) === cfg(tf), 'teacher/fb.js 的 Firebase 設定跟 index.html 一樣（抄的，要一起改）');
    ok(/initializeApp\(firebaseConfig, 'admin'\)/.test(tf) && /firebasejs\/11\.0\.1\//.test(tf), '具名 app admin、Firebase 11.0.1');
    const T = fs.readFileSync(path.join(__dirname, '../../teacher/tabs.js'), 'utf8');
    const ids = [...T.matchAll(/id: '(\w+)'.*import\('\.\/(tab-[\w-]+\.js)'\)/g)];
    ok(ids.length === 8 && ids.every(m => fs.existsSync(path.join(__dirname, '../../teacher', m[2]))), '8 個分頁、每個都有對應的 tab-*.js 檔：' + ids.map(m => m[1]).join(','));
    ok(!/UID|@gmail|@ms\./.test(fs.readFileSync(path.join(__dirname, '../../teacher/main.js'), 'utf8')), 'repo 裡沒有老師 UID／email');
  }

  /* ── 純函式：一次搬移 ── */
  {
    const { planMigration } = await import('../../teacher/migrate.js');
    const Dn = await import('../../nw-data.js');
    const f = (id, o) => Object.assign({ id, type: 'bug', status: 'approved', docId: ID5, cls: C3, seat: 5, t: 100, claimed: false }, o);
    const flags = [f('a1', { t: 100, claimed: true }), f('a2', { t: 200, sev: 2, reply: '好' }), f('a3', { t: 300 }), f('p1', { status: 'pending', t: 50 }), f('r1', { status: 'rejected' }),
      f('w1', { docId: ID6, seat: 6, t: 10 }), { id: 'aw1', type: 'award', award: 'bugking', status: 'approved', docId: ID7 }, { id: 'aw2', type: 'award', award: 'bugking', status: 'approved', docId: ID6, claimed: true }];
    const p1 = planMigration(flags, { [ID5]: { bonus: 2, hideNick: true } }, new Set(), 999);
    const b5 = p1.boards.find(b => b.id === ID5).data;
    ok(b5.score === 1 + 2 + 1 + 2 && b5.n === 3 && b5.firstAt === 300 && b5.reports.length === 3 && b5.reports[1].sev === 2 && b5.reports[1].reply === '好' && b5.reports.every(r => r.st === 'approved'),
      '搬移：沒有 sev 算 1、sev 2 照算、加上手動加分 2＝6、n=3、firstAt＝最後一則的送出時間、reports 3 筆：' + JSON.stringify(b5));
    ok(!('hideNick' in b5) && p1.boards.length === 2, '搬移：不動 hideNick（用 merge 寫，這裡只列要覆蓋的欄位）、待審與不採用的不算');
    const ids = p1.mails.map(m => m.id).sort().join();
    ok(ids === 'award_aw1,bug_a2,bug_a3,bug_w1', '搬移：只有「已確認但沒 claimed」的轉成信，固定 ID：' + ids);
    ok(p1.mails.every(m => m.data.aud.length === 1 && m.data.from === '老師' && m.data.sendAt === 999 && m.data.expireAt === 0 && ['bug', 'award'].includes(m.data.src)), '搬移：信的格式（aud 單人、from、sendAt、src）');
    const aw = p1.mails.find(m => m.id === 'award_aw1').data;
    ok(aw.items.length === 1 && aw.items[0].type === 'word' && aw.items[0].key === 'bugking' && aw.aud[0] === 'id:' + ID7, '搬移：職業除錯師寄 word bugking');
    const mc = p1.mails.find(m => m.id === 'bug_a2').data;
    ok(mc.items[0].type === 'coins' && mc.items[0].n === Dn.BUG_COINS, '搬移：字元照 BUG_COINS');
    const many = Array.from({ length: Dn.BUG_REWARD_MAX + 2 }, (_, i) => f('x' + i, { docId: ID7, seat: 7, t: 1000 + i }));
    const p2 = planMigration(many, {}, new Set(), 1);
    const coinMails = p2.mails.filter(m => m.data.items.length), thanks = p2.mails.filter(m => !m.data.items.length);
    ok(coinMails.length === Dn.BUG_REWARD_MAX && thanks.length === 2 && thanks.every(m => m.id >= 'bug_x' + Dn.BUG_REWARD_MAX), '搬移：超過 BUG_REWARD_MAX 的只寄感謝（沒有字元）');
    const p3 = planMigration(flags, { [ID5]: { bonus: 2 } }, new Set(p1.mails.map(m => m.id)), 5);
    ok(p3.mails.length === 0 && p3.stats.skipped === 4 && JSON.stringify(p3.boards) === JSON.stringify(p1.boards), '搬移：重按——信不再寄、分數一樣（不是累加）');
  }

  const browser = await chromium.launch();

  /* ── 登入 ── */
  {
    const p = await teacher(browser, base(), { login: true, other: true });
    ok(await p.isHidden('#app'), '沒登入：看不到管理頁');
    await p.fill('#l-email', 'other@example.test'); await p.fill('#l-pw', 'bad'); await p.click('#l-ok'); await p.waitForTimeout(300);
    ok((await p.textContent('#l-err')).includes('email 或密碼不對'), '密碼錯：email 或密碼不對');
    await p.fill('#l-pw', 'pw-x'); await p.click('#l-ok'); await p.waitForTimeout(600);
    ok((await p.textContent('#l-err')).includes('這個帳號不是老師帳號') && await p.isHidden('#app') && await p.isVisible('#login'), '非老師帳號（沒有 mg_admins）：顯示「這個帳號不是老師帳號」、進不去');
    ok(await p.evaluate(() => window.__AUTHS_ADMIN() === null), '非老師帳號：已登出');
    noErr(p); await p.close();
  }
  {
    const p = await teacher(browser, base(), { login: true });
    await p.fill('#l-email', 'teacher@example.test'); await p.fill('#l-pw', 'pw-ok'); await p.click('#l-ok');
    await p.waitForSelector('#app:not(.hidden)'); await ready(p);
    ok(await p.evaluate(() => window.__LAST_PERSISTENCE) === 'SESSION' && (await p.textContent('#who')).includes('teacher@example.test'), '老師登入：沒勾記住→關分頁就登出（session）；標題列顯示身分');
    ok(await p.evaluate(() => !!sessionStorage.getItem('mock_admin_user') && !localStorage.getItem('mock_admin_user')), '沒勾「記住這台電腦」只存 session');
    ok(await p.isHidden('#login') && (await p.$$('#nav [data-tab]')).length === 8, '登入後：8 個分頁');
    ok((await p.getAttribute('#back-game', 'href')) === 'index.html', '標題列有「回遊戲」');
    await p.click('#logout'); await p.waitForSelector('#login:not(.hidden)');
    ok(await p.isHidden('#app'), '登出：回到登入畫面');
    await p.check('#l-remember'); await p.fill('#l-email', 'teacher@example.test'); await p.fill('#l-pw', 'pw-ok'); await p.click('#l-ok');
    await p.waitForSelector('#app:not(.hidden)');
    ok(await p.evaluate(() => window.__LAST_PERSISTENCE) === 'LOCAL' && await p.evaluate(() => !!localStorage.getItem('mock_admin_user')), '勾「記住這台電腦」：用 local');
    noErr(p); await p.close();
  }

  /* ── 各分頁讀得到、總覽 ── */
  const seed1 = base();
  Object.assign(seed1, Object.fromEntries([
    ['mg_events/E1', ev()], ['mg_events/E2', ev({ startAt: NOW + 2 * D, endAt: NOW + 5 * D })], ['mg_events/E3', ev({ startAt: NOW - 9 * D, endAt: NOW - 2 * D })],
    flag('bug_x1', {}), flag('bug_x2', { t: NOW - 2 * H }), flag('bug_x3', { status: 'approved' }),
    flag('fb_1', { type: 'feedback', mk: 'coo', rate: 'good' }), flag('fb_2', { type: 'feedback', mk: 'coo', read: true }),
    [`mg_nw_flags/namechg_${ID7}_ab12cd34`, { type: 'namechg', status: 'pending', docId: ID7, cls: C3, seat: 7, name: '阿強', oldName: '阿志', t: NOW - H }],
    ['mg_bugboard/' + ID5, { className: C3, seat: 5, score: 3, n: 2, firstAt: NOW - 5 * D }]
  ]));
  const T = await teacher(browser, seed1);
  {
    ok((await T.textContent('#nav [aria-current="page"]')).includes('總覽'), '一進去是總覽');
    const num = k => T.textContent(`[data-card="${k}"] b`).then(t => t.replace(/\s+/g, ' ').trim());
    ok(await num('online') === '2', '總覽：今天上線 2 人（小明、阿強；小華 3 天前）：' + await num('online'));
    ok(await num('players') === '3', '總覽：新世界玩家 3 人（小美沒玩過）');
    ok((await num('events')).startsWith('1') && (await T.textContent('[data-card="events"]')).includes('排程中 1'), '總覽：進行中 1、排程中 1（結束的不算）');
    ok(await num('pending') === '2', '總覽：待審回報 2（已確認的不算）');
    ok(await num('unread') === '1', '總覽：未讀回饋 1（有 read 的不算）');
    ok(await num('warn') === '1', '總覽：⚠ 換過名字 1 人（阿強：現名 ≠ name0）');
    ok(await T.$('[data-go="mail"].px-btn') && await T.$('[data-go="events"].px-btn') && await T.$('[data-go="bugs"].px-btn'), '3 個捷徑：寄信、開活動、審回報');
    await T.click('button.px-btn[data-go="events"]'); await ready(T);
    ok(await T.$('[data-placeholder]') === null && (await T.textContent('#nav [aria-current="page"]')).includes('活動') && await T.$('[data-form]') === null && (await T.$$('[data-newtpl]')).length === 6 && await T.$('[data-new]') !== null, '「開活動」捷徑連到活動分頁：最上面直接列出 6 個範本按鈕＋自訂（不預先開表單）');
    await T.click('#nav [data-tab="overview"]'); await ready(T);
    await T.click('button.px-btn[data-go="bugs"]'); await ready(T);
    ok(await T.$('[data-placeholder]') === null && (await T.textContent('#nav [aria-current="page"]')).includes('回報') && await T.$('[data-zones]') !== null, '「審回報」捷徑連到回報分頁');
    for (const id of ['overview', 'students', 'mail', 'events', 'news', 'feedback', 'bugs', 'settings']) {
      await tab(T, id);
      ok(await T.$('[data-tab-error]') === null && (await T.$$('#main h2')).length >= 1, `分頁「${id}」讀得到、沒有錯誤`);
    }
  }

  /* ── 學生分頁 ── */
  {
    await tab(T, 'students');
    const rows = () => T.$$eval('#main tr[data-id]', r => r.map(x => x.dataset.id));
    ok((await rows()).length === 4, '學生：讀整個 mg_scores，4 列');
    const heads = await T.$$eval('#main th[data-sort]', h => h.map(x => x.textContent.replace(/[ ▲▼]/g, '')));
    ok(['班級', '座號', '姓名', '榜上名字', 'HR', '字元', '武器', '場次', '勝／敗', '最後上線'].every(c => heads.includes(c)) && heads.some(h => h.startsWith('回報')), '欄位齊全：' + heads.join(','));
    const r5 = (await T.textContent(`tr[data-id="${ID5}"]`)).replace(/\s+/g, ' ');
    ok(r5.includes('503') && r5.includes('小明') && r5.includes('鐵製小刀') && r5.includes('8／2') && r5.includes('2／2'), '一列：班級短碼、姓名（榜上名字就是登入名字）、武器、勝／敗、回報（確認／送出）：' + r5);
    await T.check('[data-f="played"]'); ok((await rows()).length === 3, '篩選：玩過新世界 → 3 人');
    await T.uncheck('[data-f="played"]');
    await T.selectOption('[data-f="cls"]', C4); ok((await rows()).join() === ID41, '篩選：班級');
    await T.selectOption('[data-f="cls"]', ''); await T.fill('[data-f="kw"]', '華'); ok((await rows()).join() === ID6, '篩選：關鍵字（姓名）');
    await T.fill('[data-f="kw"]', '阿強'); ok((await rows()).length === 1, '篩選：關鍵字（榜上名字）');
    await T.fill('[data-f="kw"]', '');
    await T.check('[data-f="warn"]'); ok((await rows()).join() === ID7, '篩選：⚠ 換過名字 → 阿強'); await T.uncheck('[data-f="warn"]');
    await T.click('th[data-sort="hr"]'); const asc = await rows(); await T.click('th[data-sort="hr"]'); const desc = await rows();
    ok(asc[0] === ID41 && desc[0] === ID5, '排序：HR 小→大、再按大→小：' + asc[0] + ' / ' + desc[0]);
    await T.click('th[data-sort="cls"]'); await T.click('th[data-sort="cls"]');

    /* 學生卡 */
    await T.click(`tr[data-id="${ID5}"] td:nth-child(2)`); await T.waitForSelector('[data-modal]'); await T.waitForTimeout(300);
    let mt = await modalText(T);
    ok(mt.includes('HR 7') && mt.includes('字元 120') && mt.includes('已領的信') && mt.includes('舊信') && mt.includes('教學') && mt.includes('區域進度') && mt.includes('圖鑑') && mt.includes('材料') && mt.includes('任務') && mt.includes('稱號'), '學生卡：稱號、區域進度、圖鑑、道具、材料、教學、任務、已領的信（信用標題顯示）');
    ok(!mt.includes('名字沒問題') && !mt.includes('換過名字'), '沒換名字的人沒有「名字沒問題」按鈕');
    await T.click('[data-modal] [data-act="hide"]'); await T.waitForTimeout(150);
    ok((await modalText(T)).includes('榜單都會顯示「神秘獵人」'), '隱藏暱稱：先問一次');
    await clickModal(T, 'ok'); await T.waitForTimeout(400);
    let bb = await FS(T, 'mg_bugboard/' + ID5);
    ok(bb.hideNick === true && bb.score === 3 && bb.className === C3, '隱藏暱稱：寫 mg_bugboard.hideNick，不動原本的分數');
    ok((await modalText(T)).includes('已隱藏') && (await T.textContent('[data-modal] [data-act="hide"]')) === '恢復暱稱', '學生卡：顯示已隱藏、按鈕變「恢復暱稱」');
    await T.click('[data-modal] [data-act="hide"]'); await T.waitForTimeout(400);
    ok((await FS(T, 'mg_bugboard/' + ID5)).hideNick === false, '恢復暱稱');
    await T.click('[data-modal] [data-act="hide"]'); await T.waitForTimeout(150); await clickModal(T, 'ok'); await T.waitForTimeout(300);   // 再隱藏一次，後面用學生榜驗證
    await clickModal(T, 'close'); await T.waitForTimeout(100);
    ok((await T.textContent(`tr[data-id="${ID5}"]`)).includes('已隱藏'), '表格那列標「已隱藏」');

    /* 阿強：⚠ 與名字沒問題 */
    await T.click(`tr[data-id="${ID7}"] td:nth-child(2)`); await T.waitForSelector('[data-modal]'); await T.waitForTimeout(300);
    mt = await modalText(T);
    ok(mt.includes('名字跟登入時不一樣') && mt.includes('阿志') && mt.includes('阿強') && mt.includes('還沒處理'), '學生卡：⚠ 名字跟登入時不一樣，列出基準、現在的名字與換名紀錄');
    await T.click('[data-modal] [data-act="nameok"]'); await T.waitForTimeout(500);
    const bb7 = await FS(T, 'mg_bugboard/' + ID7), fl = await FS(T, `mg_nw_flags/namechg_${ID7}_ab12cd34`);
    const { sha256Hex: sh } = await import('../../nw-access.js'), pv7 = await FS(T, 'mg_bugboard_private/' + ID7);
    ok(bb7 && bb7.nameOkH === await sh('阿強') && !('nameOk' in bb7) && !JSON.stringify(bb7).includes('阿強') && pv7 && pv7.nameOk === '阿強' && fl.status === 'ok', '名字沒問題：學生讀得到的 mg_bugboard 只有名字的雜湊（沒有真名）、真名在老師專用的 mg_bugboard_private，換名紀錄標「已確認」');
    ok(!(await modalText(T)).includes('名字沒問題（解鎖）') && (await modalText(T)).includes('目前已解鎖'), '按完之後卡片顯示已解鎖');
    await clickModal(T, 'close'); await T.waitForTimeout(100);
    ok(!(await T.textContent(`tr[data-id="${ID7}"]`)).includes('換過名字'), '表格的 ⚠ 消失');

    /* 勾選多人 → 寄信 */
    await T.check(`[data-sel="${ID5}"]`); await T.check(`[data-sel="${ID6}"]`);
    ok((await T.textContent('[data-mailsel]')).includes('2 人'), '勾選 2 人：按鈕寫「寄信給勾選的 2 人」');
    await T.click('[data-mailsel]'); await ready(T);
    ok(await T.isChecked('input[name="mode"][value="stu"]') && (await T.$$('[data-chosen] .chip')).length === 2, '帶到信箱：收件人＝學生、已選 2 人');
    ok((await T.textContent('[data-summary]')).includes('2 人'), '摘要寫 2 人');
    await tab(T, 'students');
    await T.click(`tr[data-id="${ID6}"] td:nth-child(2)`); await T.waitForSelector('[data-modal]'); await T.waitForTimeout(300);
    await T.click('[data-modal] [data-act="mail"]'); await ready(T);
    ok(await T.isChecked('input[name="mode"][value="stu"]') && (await T.$$('[data-chosen] .chip')).length === 1 && await modalOpen(T) === 0, '學生卡「寄信給他」：帶到信箱、收件人 1 人');
  }

  /* ── 信箱：三種收件人＋所有禮物種類＋預覽＋防呆 ── */
  {
    await tab(T, 'mail');
    const types = await T.$$eval('[data-addgift] option', o => o.map(x => x.value).filter(Boolean));
    ok(['weapon', 'coins', 'potion', 'exp', 'item', 'mat', 'word'].every(t => types.includes(t)), '禮物種類涵蓋 applyReward 的所有 type：' + types.join(','));
    /* ① 全校：只有文字 */
    await T.check('input[name="mode"][value="all"]');
    await T.fill('[data-title]', '全校通知'); await T.fill('[data-body]', '明天交作業');
    ok((await T.textContent('[data-pv]')).includes('全校通知') && (await T.textContent('[data-summary]')).includes('全校') && (await T.textContent('[data-summary]')).includes('4 人') && (await T.textContent('[data-summary]')).includes('只有文字'), '預覽：學生看到的樣子＋摘要（全校 4 人、只有文字）');
    await T.click('[data-submit]'); await T.waitForSelector('[data-modal]');
    ok((await modalText(T)).includes('學生會看到這封信') && (await modalText(T)).includes('全校通知') && (await modalText(T)).includes('明天交作業'), '送出前：跳出預覽視窗');
    await clickModal(T, 'no'); await T.waitForTimeout(100);
    ok((await keys(T, 'mg_mail/')).length === 1, '預覽按「回去改」：沒有寄出');
    await T.click('[data-submit]'); await T.waitForSelector('[data-modal]'); await clickModal(T, 'ok'); await T.waitForTimeout(500);
    let mails = await docsOf(T, 'mg_mail/'); const mAll = mails.find(m => m.title === '全校通知');
    ok(mAll && JSON.stringify(mAll.aud) === '["all"]' && mAll.src === 'manual' && mAll.from === '老師' && mAll.expireAt === 0 && mAll.items.length === 0 && mAll.sendAt <= Date.now() && mAll.t > 0 && mAll.body === '明天交作業', '寄出全校：aud:["all"]、src manual、from 老師、不過期');
    ok((await T.textContent('[data-title]')) === '' && (await T.inputValue('[data-title]')) === '', '寄完表單清空');

    /* ② 班級（多選）＋所有種類的禮物 */
    await T.check('input[name="mode"][value="cls"]'); await T.check(`[data-cls="${C3}"]`);
    await T.fill('[data-title]', '全班禮物'); await T.fill('[data-body]', '謝謝大家');
    const rowsDef = [['weapon', 'testblade', null], ['coins', null, 50], ['potion', null, 2], ['exp', null, 30], ['item', 'renameCard', 2], ['mat', 'coo_feather', 3], ['word', 'bugking', null]];
    for (let i = 0; i < rowsDef.length; i++) {
      const [t, k, n] = rowsDef[i];
      await T.selectOption('[data-addgift]', t);
      if (k) await T.selectOption(`[data-key="${i}"]`, k);
      if (n !== null) await T.fill(`[data-n="${i}"]`, String(n));
    }
    const sum = await T.textContent('[data-summary]');
    ok(sum.includes('503 全班') && sum.includes('3 人') && sum.includes('測試者之刃') && sum.includes('字元 ×50') && sum.includes('改名卡 ×2') && sum.includes('咕咕羽毛 ×3') && sum.includes('職業除錯師'), '摘要：503 全班 3 人＋每個禮物：' + sum);
    ok((await T.$$eval('[data-key="6"] option', o => o.map(x => x.value))).includes('bugking') && (await T.$$eval('[data-key="4"] option', o => o.map(x => x.value))).includes('renameCard'), '詞條下拉有 bugking、道具下拉有改名卡');
    await T.click('[data-submit]'); await T.waitForSelector('[data-modal]'); await clickModal(T, 'ok'); await T.waitForTimeout(500);
    mails = await docsOf(T, 'mg_mail/'); const mCls = mails.find(m => m.title === '全班禮物');
    ok(mCls && JSON.stringify(mCls.aud) === JSON.stringify(['cls:' + C3]) && mCls.items.length === 7 && mCls.items.some(i => i.type === 'item' && i.key === 'renameCard' && i.n === 2) && mCls.items.some(i => i.type === 'word' && i.key === 'bugking'), '寄出整班：aud:["cls:五年級3班"]、7 種禮物（含 item renameCard、word bugking）：' + JSON.stringify(mCls && mCls.items));

    /* ③ 學生（搜尋加人）＋預約＋有效期限 */
    await T.check('input[name="mode"][value="stu"]');
    await T.fill('[data-q]', '小華'); await T.click(`[data-add="${ID6}"]`);
    await T.fill('[data-q]', '小明'); await T.click(`[data-add="${ID5}"]`);
    ok((await T.$$('[data-chosen] .chip')).length === 2, '搜尋加人：2 人');
    await T.fill('[data-title]', '給兩個人'); await T.selectOption('[data-addgift]', 'coins'); await T.fill('[data-n="0"]', '77');
    const soon = new Date(NOW + 3 * H), loc = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    await T.fill('[data-send]', loc(soon)); await T.fill('[data-exp]', loc(new Date(NOW + 2 * D)));
    await T.click('[data-submit]'); await T.waitForSelector('[data-modal]');
    ok((await modalText(T)).includes('預約寄送') && (await modalText(T)).includes('有效到'), '預覽：寫出預約時間與有效期限');
    await clickModal(T, 'ok'); await T.waitForTimeout(500);
    mails = await docsOf(T, 'mg_mail/'); const mStu = mails.find(m => m.title === '給兩個人');
    ok(mStu && JSON.stringify(mStu.aud.sort()) === JSON.stringify(['id:' + ID5, 'id:' + ID6]) && Math.abs(mStu.sendAt - soon.getTime()) < 120000 && mStu.expireAt > mStu.sendAt, '寄出個人：aud:["id:…","id:…"]、預約 sendAt、expireAt');

    /* 檢查：標題、有效期限比寄出早 */
    await T.fill('[data-title]', ''); await T.click('[data-submit]'); await T.waitForTimeout(100);
    ok((await T.textContent('[data-err]')).includes('請寫標題') && await modalOpen(T) === 0, '沒寫標題：不能送出');
    await T.fill('[data-title]', 'x'); await T.fill('[data-exp]', loc(new Date(NOW - D))); await T.click('[data-submit]'); await T.waitForTimeout(100);
    ok((await T.textContent('[data-err]')).includes('有效期限要比寄送時間晚'), '有效期限比寄送時間早：不能送出');
    await T.fill('[data-exp]', ''); await T.fill('[data-send]', '');

    /* 數量防呆 */
    const before = (await keys(T, 'mg_mail/')).length;
    const tryBig = async (type, key, n, expectAsk) => {
      await T.check('input[name="mode"][value="all"]');
      while (await T.$('[data-del="0"]')) await T.click('[data-del="0"]');
      await T.fill('[data-title]', '防呆'); await T.selectOption('[data-addgift]', type);
      if (key) await T.selectOption('[data-key="0"]', key);
      await T.fill('[data-n="0"]', String(n));
      await T.click('[data-submit]'); await T.waitForSelector('[data-modal]');
      const t = await modalText(T), asked = t.includes('數量比平常多很多');
      if (asked) await clickModal(T, 'no'); else await clickModal(T, 'no');
      await T.waitForTimeout(100);
      return asked === expectAsk;
    };
    ok(await tryBig('coins', null, 5000, true) && (await keys(T, 'mg_mail/')).length === before, '防呆：字元 5000 → 要再確認；按「回去改」沒寄');
    ok(await tryBig('coins', null, 1000, false), '防呆：字元 1000（上限）不用再確認');
    ok(await tryBig('potion', null, 21, true) && await tryBig('potion', null, 20, false), '防呆：回復藥 21 要確認、20 不用');
    ok(await tryBig('item', 'renameCard', 6, true) && await tryBig('item', 'renameCard', 5, false), '防呆：改名卡 6 要確認、5 不用');
    await T.click('[data-del="0"]'); await T.selectOption('[data-addgift]', 'coins'); await T.fill('[data-n="0"]', '5000');
    await T.click('[data-submit]'); await T.waitForSelector('[data-modal]'); await clickModal(T, 'ok'); await T.waitForTimeout(150);
    ok((await modalText(T)).includes('學生會看到這封信'), '防呆確認「沒錯」後，才會到預覽');
    await clickModal(T, 'no'); await T.waitForTimeout(100);

    /* 寄出紀錄、篩選 */
    const trs = () => T.$$eval('[data-mailtable] tbody tr[data-mid]', r => r.map(x => x.dataset.mid));
    ok((await trs()).length === 4, '寄出紀錄：4 封（舊信＋剛寄的 3 封）');
    await T.selectOption('[data-src]', 'bug'); ok((await trs()).length === 0, '來源篩選：回報獎勵 0 封');
    await T.selectOption('[data-src]', 'manual'); ok((await trs()).length === 4, '來源篩選：手動寄的');
    await T.selectOption('[data-src]', '');
    const stTxt = await T.textContent(`[data-mailtable] tr[data-mid="${mStu._id}"]`);
    ok(stTxt.includes('排程中') && stTxt.includes('字元 ×77'), '紀錄：預約的寫「排程中」');

    /* 領取狀況 */
    await T.click(`[data-receipt="m1"]`); await T.waitForSelector('[data-modal]'); await T.waitForTimeout(300);
    const rs = await modalText(T);
    ok(rs.includes('已領 1 人') && rs.includes('未領 3 人') && rs.includes('還沒進過新世界'), '領取狀況：從 nw.mail 判斷（小明已領；其他未領；小美還沒進新世界）：' + rs.slice(0, 120));
    await clickModal(T, 'close'); await T.waitForTimeout(100);

    /* 收回 */
    await T.click(`[data-recall="${mStu._id}"]`); await T.waitForSelector('[data-modal]');
    ok((await modalText(T)).includes('已經領過的人不會被扣回'), '收回：寫清楚已領的不會扣回');
    await clickModal(T, 'no'); await T.waitForTimeout(100);
    ok(await FS(T, 'mg_mail/' + mStu._id) !== undefined, '收回按「先不要」：信還在');
    await T.click(`[data-recall="${mStu._id}"]`); await T.waitForSelector('[data-modal]'); await clickModal(T, 'ok'); await T.waitForTimeout(400);
    ok(await FS(T, 'mg_mail/' + mStu._id) === undefined && (await trs()).length === 3, '收回：信刪掉了');
  }

  /* ── 學生真的收得到 ── */
  {
    const fsT = await allFS(T);
    const S = await student(browser, fsT);
    await openMail(S);
    const ids = await mailIds(S); const byTitle = t => Object.entries(fsT).find(([k, v]) => k.startsWith('mg_mail/') && v.title === t)[0].slice(8);
    ok(ids.includes(byTitle('全校通知')) && ids.includes(byTitle('全班禮物')) && ids.includes('m1'), '學生（503・小明）收到：全校信、整班信、舊信');
    await S.click('#nw-mail [data-close]'); await S.waitForTimeout(150); await S.close();
    /* 預約的信（已收回）：另開一份種子，確認預約沒到時間看不到 */
    const fs2 = JSON.parse(JSON.stringify(fsT)); fs2['mg_mail/sched'] = { aud: ['id:' + ID5], title: '預約的', body: '', items: [], from: '老師', sendAt: NOW + 3 * H, expireAt: 0, t: NOW, src: 'manual' };
    fs2['mg_mail/exp'] = { aud: ['id:' + ID5], title: '過期的', body: '', items: [], from: '老師', sendAt: NOW - 3 * H, expireAt: NOW - H, t: NOW, src: 'manual' };
    const S2 = await student(browser, fs2); await openMail(S2);
    const ids2 = await mailIds(S2);
    ok(!ids2.includes('sched') && !ids2.includes('exp'), '預約還沒到、已過期的信：學生看不到');
    ok(!ids2.some(i => /^m_/.test(i) && fsT['mg_mail/' + i] && fsT['mg_mail/' + i].aud.includes('cls:' + C4)), '別班的信看不到');
    const c0 = (await nwLocal(S2)).coins;
    await S2.click('#nw-mail [data-all]'); await S2.waitForTimeout(500); await dismissGifts(S2);
    const nw = await nwLocal(S2);
    ok(nw.gw.includes('testblade') && nw.coins === c0 + 50 && nw.items.potion === 3 + 2 && nw.items.renameCard === 2 && nw.mats.coo_feather === 3 && nw.awards.bugking === 1 && nw.words.includes('bugking'), '學生按「全部領取」：武器、字元、回復藥、改名卡、材料、職業除錯師詞條都到了（沒有「還不能領」）：' + JSON.stringify({ gw: nw.gw, coins: nw.coins, items: nw.items, mats: nw.mats, aw: nw.awards }));
    ok(nw.hrExp > 0 || nw.hr > 7, '獵人經驗有加');
    noErr(S2); await S2.close();
  }

  /* ── 公告 ── */
  {
    await tab(T, 'news');
    const NOTICES = (await import('../../nw-data.js')).NOTICES;
    ok((await T.$$('[data-notices] .px-panel')).length === Math.min(3, NOTICES.length) && (await T.textContent('[data-notices]')).includes(NOTICES[0].title), '下面唯讀列出最近 3 則改版公告（NOTICES）');
    await T.fill('[data-title]', '電腦課換位子'); await T.fill('[data-body]', '下週起\n照新座位表');
    ok((await T.innerHTML('[data-pv]')).includes('電腦課換位子') && (await T.innerHTML('[data-pv]')).includes('<br>'), '預覽：學生看到的樣子（換行保留）');
    await T.check('[data-pin]'); ok((await T.textContent('[data-pv]')).includes('置頂'), '預覽：置頂');
    await T.click('[data-save]'); await T.waitForSelector('[data-modal]'); ok((await modalText(T)).includes('學生會看到這個'), '貼出前：跳出預覽');
    await clickModal(T, 'ok'); await T.waitForTimeout(500);
    let news = await docsOf(T, 'mg_news/'); const n1 = news.find(n => n.title === '電腦課換位子');
    ok(n1 && n1.pin === true && n1.body === '下週起\n照新座位表' && n1.t > 0, '新增公告：mg_news 有 title／body／pin／t');
    await T.fill('[data-title]', '第二則'); await T.fill('[data-body]', '普通公告'); await T.click('[data-save]'); await T.waitForSelector('[data-modal]'); await clickModal(T, 'ok'); await T.waitForTimeout(500);
    news = await docsOf(T, 'mg_news/'); const n2 = news.find(n => n.title === '第二則');
    ok(n2 && n2.pin === false && (await T.$$('[data-newstable] tbody tr')).length === 2, '再新增一則（不置頂）');
    const order0 = await T.$$eval('[data-newstable] tbody tr', r => r.map(x => x.dataset.nid));
    ok(order0[0] === n1._id, '列表：置頂在前');
    await T.click(`[data-pinbtn="${n1._id}"]`); await T.waitForTimeout(400);
    ok((await FS(T, 'mg_news/' + n1._id)).pin === false, '取消置頂');
    await T.click(`[data-pinbtn="${n2._id}"]`); await T.waitForTimeout(400);
    ok((await FS(T, 'mg_news/' + n2._id)).pin === true && (await T.$$eval('[data-newstable] tbody tr', r => r.map(x => x.dataset.nid)))[0] === n2._id, '置頂「第二則」：排到最前面');
    /* 編輯：不重新通知＝t 不變；重新通知＝t 更新 */
    const t0 = n1.t;
    await T.click(`[data-edit="${n1._id}"]`); await T.fill('[data-title]', '電腦課換位子（改）'); await T.click('[data-save]'); await T.waitForSelector('[data-modal]');
    ok((await modalText(T)).includes('不會再跳通知'), '編輯：預設不會再跳通知'); await clickModal(T, 'ok'); await T.waitForTimeout(400);
    const e1 = await FS(T, 'mg_news/' + n1._id);
    ok(e1.title === '電腦課換位子（改）' && e1.t === t0, '編輯：標題改了、t 沒變');
    await T.click(`[data-edit="${n1._id}"]`); await T.check('[data-renotify]'); await T.click('[data-save]'); await T.waitForSelector('[data-modal]'); await clickModal(T, 'ok'); await T.waitForTimeout(400);
    ok((await FS(T, 'mg_news/' + n1._id)).t > t0, '勾「當成新公告」：t 更新');
    /* 學生看得到、置頂在前 */
    const fsN = await allFS(T);
    const S = await student(browser, fsN);
    await S.click('[data-act="notice"]'); await S.waitForSelector('#nw-notice'); await S.waitForTimeout(500);
    const order = await S.$$eval('#nw-notice [data-news]', e => e.map(x => x.dataset.news));
    ok(order.join() === [n2._id, n1._id].join() || (order[0] === n2._id && order.includes(n1._id)), '學生佈告欄：看得到兩則，置頂的「第二則」在前：' + order.join());
    ok((await S.textContent('#nw-notice')).includes('普通公告') && (await S.textContent('#nw-notice')).includes('下週起'), '學生佈告欄：內容');
    await S.close();
    /* 刪除 */
    await T.click(`[data-del="${n1._id}"]`); await T.waitForSelector('[data-modal]'); await clickModal(T, 'ok'); await T.waitForTimeout(400);
    ok(await FS(T, 'mg_news/' + n1._id) === undefined && (await T.$$('[data-newstable] tbody tr')).length === 1, '刪除公告');
  }

  /* ── 隱藏暱稱 → 學生榜顯示「神秘獵人」 ──（小明在第一段已被隱藏） */
  {
    const fsH = await allFS(T);
    fsH['mg_scores/' + ID6].nwNick = '閃電咕咕鳥'; fsH['mg_scores/' + ID7].nwNick = '星光史萊姆';
    fsH['mg_bugboard/' + ID6] = { className: C3, seat: 6, score: 2, n: 2, firstAt: NOW - D };
    fsH['mg_bugboard/' + ID7] = Object.assign({}, fsH['mg_bugboard/' + ID7], { score: 1, n: 1, firstAt: NOW - D });
    const bugRows = async fsx => { const S = await student(browser, fsx); await S.click('[data-act="notice"]'); await S.waitForSelector('#nw-notice'); await S.click('#nw-notice [data-ntab="bug"]'); await S.waitForTimeout(700);
      const r = await S.$$eval('#nw-notice [data-bugrow]', e => e.map(x => ({ id: x.dataset.bugrow, t: x.textContent.replace(/\s+/g, ' ') }))); await S.close(); return r; };
    const rows = await bugRows(fsH);
    ok(rows.find(r => r.id === ID5).t.includes('神秘獵人') && !rows.find(r => r.id === ID5).t.includes('閃電咕咕鳥'), '小明被隱藏：榜上顯示「神秘獵人」');
    ok(rows.find(r => r.id === ID6).t.includes('閃電咕咕鳥'), '沒被隱藏的人：顯示暱稱');
    /* 老師恢復後，榜上又看得到暱稱 */
    fsH['mg_bugboard/' + ID6].hideNick = true;
    const rows2 = await bugRows(fsH);
    ok(rows2.find(r => r.id === ID6).t.includes('神秘獵人'), '老師隱藏（hideNick）後：學生榜顯示神秘獵人');
  }

  /* ── 名字沒問題 → 學生信箱解鎖 ── */
  {
    const seedL = base();
    seedL['mg_scores/' + ID7].nw.name0 = '阿強';
    seedL['mg_scores/' + ID5].nw.name0 = '小華華';          // 基準跟現在的名字（小明）不一樣
    seedL['mg_mail/lk'] = { aud: ['id:' + ID5], title: '要鎖著的信', body: '', items: [{ type: 'coins', n: 5 }], from: '老師', sendAt: NOW - 1000, expireAt: 0, t: NOW - 1000, src: 'manual' };
    seedL[`mg_nw_flags/namechg_${ID5}_aaaa1111`] = { type: 'namechg', status: 'pending', docId: ID5, cls: C3, seat: 5, name: '小明', oldName: '小華華', t: NOW };
    const S0 = await student(browser, JSON.parse(JSON.stringify(seedL)));
    await S0.click('.vb[data-bld="mail"]'); await S0.waitForSelector('#nw-mail'); await S0.waitForTimeout(500);
    ok((await S0.textContent('#nw-mail')).includes('名字跟上次不一樣'), '改名之前：學生信箱鎖著');
    await S0.close();
    const TL = await teacher(browser, seedL);
    await tab(TL, 'students'); await TL.check('[data-f="warn"]');
    ok((await TL.$$('#main tr[data-id]')).length === 1, '教師頁看得到 ⚠（小明）');
    await TL.click(`tr[data-id="${ID5}"] td:nth-child(2)`); await TL.waitForSelector('[data-modal]'); await TL.waitForTimeout(300);
    await TL.click('[data-modal] [data-act="nameok"]'); await TL.waitForTimeout(500);
    ok((await FS(TL, 'mg_bugboard/' + ID5)).nameOkH === await (await import('../../nw-access.js')).sha256Hex('小明') && (await FS(TL, 'mg_bugboard_private/' + ID5)).nameOk === '小明' && !('nameOk' in (await FS(TL, 'mg_bugboard/' + ID5))), '老師按「名字沒問題」：雜湊在 mg_bugboard、真名在 mg_bugboard_private');
    const S1 = await student(browser, await allFS(TL));
    await S1.click('.vb[data-bld="mail"]'); await S1.waitForSelector('#nw-mail'); await S1.waitForTimeout(600);
    ok(!(await S1.textContent('#nw-mail')).includes('名字跟上次不一樣') && (await mailIds(S1)).includes('lk'), '按了之後：學生信箱解鎖，看得到信');
    noErr(TL); await TL.close(); await S1.close();
  }

  /* ── v3.14.1：學生打別的名字登入（雲端 name 不變）→ 老師看得到 ⚠，按「名字沒問題」＝打的名字變新名字 ── */
  {
    const seedN = base();
    seedN['mg_mail/lk'] = { aud: ['id:' + ID5], title: '要鎖著的信', body: '', items: [{ type: 'coins', n: 5 }], from: '老師', sendAt: NOW - 1000, expireAt: 0, t: NOW - 1000, src: 'manual' };
    const S0 = await student(browser, JSON.parse(JSON.stringify(seedN)), { name: '小明大' });
    ok((await FS(S0, 'mg_scores/' + ID5)).name === '小明' && await S0.evaluate(() => window.__NWG.nameLocked()), '學生打「小明大」登入：雲端 name 仍是「小明」、新世界鎖信箱');
    const fl = await allFS(S0);
    ok(Object.entries(fl).some(([k, v]) => k.startsWith('mg_nw_flags/namechg_' + ID5) && v.name === '小明大' && v.oldName === '小明'), '寫了 namechg（name＝打的字、oldName＝基準）');
    await S0.close();
    const TN = await teacher(browser, fl);
    await tab(TN, 'students'); await TN.check('[data-f="warn"]');
    ok((await TN.$$eval('#main tr[data-id]', r => r.map(x => x.dataset.id))).includes(ID5), '教師頁：雲端 name 沒變也看得到 ⚠（看 pending 的換名紀錄）');
    await TN.click(`tr[data-id="${ID5}"] td:nth-child(2)`); await TN.waitForSelector('[data-modal]'); await TN.waitForTimeout(300);
    ok((await modalText(TN)).includes('小明大') && (await modalText(TN)).includes('小明'), '卡片列出基準「小明」與學生打的「小明大」');
    await TN.click('[data-modal] [data-act="nameok"]'); await TN.waitForTimeout(500);
    ok((await FS(TN, 'mg_bugboard_private/' + ID5)).nameOk === '小明大' && (await FS(TN, 'mg_bugboard/' + ID5)).nameOkH === await (await import('../../nw-access.js')).sha256Hex('小明大'), '名字沒問題：新基準是學生打的「小明大」');
    const S1 = await student(browser, await allFS(TN), { name: '小明大' });
    ok(!(await S1.evaluate(() => window.__NWG.nameLocked())) && (await FS(S1, 'mg_scores/' + ID5)).name === '小明大', '學生再用「小明大」登入：不鎖，雲端 name 與 name0 換成「小明大」');
    await S1.close(); await TN.close();
  }

  /* ── 一次搬移（寫入、重按不重複、學生領得到） ── */
  {
    const seedM = base(), H5 = await (await import('../../nw-access.js')).sha256Hex('小明');   // 學生端比對的是名字的雜湊，要放真的雜湊，小明才不會被鎖信箱
    Object.assign(seedM, Object.fromEntries([
      flag('mg_a', { status: 'approved', t: NOW - 5 * D, claimed: true }),                // 學生早就領過
      flag('mg_b', { status: 'approved', t: NOW - 4 * D, sev: 2, reply: '謝謝' }),
      flag('mg_c', { status: 'approved', t: NOW - 3 * D }),
      flag('mg_p', { status: 'pending', t: NOW - 2 * D }),
      flag('mg_o', { docId: ID6, seat: 6, name: '小華', status: 'approved', t: NOW - 3 * D }),
      ['mg_nw_flags/aw_1', { type: 'award', award: 'bugking', status: 'approved', docId: ID5, cls: C3, seat: 5, name: '小明', t: NOW - D }],
      ['mg_bugboard/' + ID5, { className: C3, seat: 5, hideNick: true, bonus: 1, nameOkH: H5 }],
      ['mg_bugboard_private/' + ID5, { nameOk: '小明', notes: [{ pts: 1, why: '口頭回報', t: NOW - 6 * D }] }]
    ]));
    const TM = await teacher(browser, seedM);
    await tab(TM, 'settings');
    await TM.click('[data-mig-plan]'); await TM.waitForSelector('[data-mig-stat]');
    const st = (await TM.textContent('[data-mig-stat]')).replace(/\s+/g, ' ');
    ok(st.includes('已確認回報 4 個') && st.includes('2 位學生') && st.includes('字元 3 封') && st.includes('職業除錯師 1 封') && st.includes('還沒有寫入'), '搬移預覽：4 個已確認回報、2 位學生、字元信 3 封（小明 2＋小華 1）、職業除錯師 1 封；沒寫入：' + st);
    ok((await keys(TM, 'mg_mail/')).length === 1 && (await FS(TM, 'mg_bugboard/' + ID6)) === undefined, '預覽沒有寫入任何東西');
    await TM.click('[data-mig-run]'); await TM.waitForSelector('[data-modal]'); await clickModal(TM, 'ok'); await TM.waitForSelector('[data-mig-done]'); await TM.waitForTimeout(300);
    const board5 = await FS(TM, 'mg_bugboard/' + ID5), board6 = await FS(TM, 'mg_bugboard/' + ID6);
    ok(board5.score === 1 + 2 + 1 + 1 && board5.n === 3 && board5.firstAt === NOW - 3 * D && board5.reports.length === 3 && board5.hideNick === true && board5.nameOkH === H5 && board5.bonus === 1, '搬移：小明 分數 1+2+1+手動加分 1＝5、n 3、firstAt、reports 3 筆；隱藏暱稱／名字沒問題（雜湊）／加分都還在：' + JSON.stringify(board5));
    ok(!JSON.stringify([board5, board6]).includes('小明') && !JSON.stringify([board5, board6]).includes('小華') && !('name' in board5) && !('notes' in board5) && (await FS(TM, 'mg_bugboard_private/' + ID5)).nameOk === '小明', '搬移：沒有把真名寫進 mg_bugboard（flag 上的 name 沒被帶進來）；老師專用的資料沒被動到');
    ok(board6.score === 1 && board6.n === 1 && board6.reports.length === 1, '搬移：小華 1 分');
    const mk = await keys(TM, 'mg_mail/');
    ok(mk.includes('mg_mail/bug_mg_b') && mk.includes('mg_mail/bug_mg_c') && mk.includes('mg_mail/bug_mg_o') && mk.includes('mg_mail/award_aw_1') && !mk.includes('mg_mail/bug_mg_a') && !mk.includes('mg_mail/bug_mg_p') && mk.length === 5, '搬移：只有沒領的轉成信（固定 ID）；已領的 mg_a、待審的 mg_p 沒有信：' + mk.join());
    const m1 = await docsOf(TM, 'mg_mail/');
    ok(m1.find(m => m._id === 'bug_mg_b').items[0].n === 15, '搬移：字元信 15 字元');
    const sizeAfter = mk.length, b5s = JSON.stringify(board5);
    await TM.click('[data-mig-run]'); await TM.waitForSelector('[data-modal]'); await clickModal(TM, 'ok'); await TM.waitForTimeout(600);
    ok((await keys(TM, 'mg_mail/')).length === sizeAfter && JSON.stringify(await FS(TM, 'mg_bugboard/' + ID5)) === b5s, '重按一次：沒多寄信、分數沒重複加');
    await TM.click('[data-mig-plan]'); await TM.waitForTimeout(400);
    ok((await TM.textContent('[data-mig-stat]')).includes('字元 0 封') && (await TM.textContent('[data-mig-stat]')).includes('4 封之前搬移時已經寄過'), '再看預覽：0 封新信、4 封已寄過');
    ok((await logsOf(TM)).some(l => l.act === '匯入舊回報'), '匯入舊回報寫了操作紀錄');
    /* 學生領得到 */
    const S = await student(browser, await allFS(TM)); await openMail(S);
    const mid = await mailIds(S);
    ok(mid.includes('bug_mg_b') && mid.includes('bug_mg_c') && mid.includes('award_aw_1') && !mid.includes('bug_mg_o') && !mid.includes('bug_mg_a'), '學生（小明）：收到自己的 2 封回報信與職業除錯師信；沒有別人的、也沒有已領過的');
    const c0 = (await nwLocal(S)).coins;
    await S.click('#nw-mail [data-all]'); await S.waitForTimeout(500); await dismissGifts(S);
    const nw = await nwLocal(S);
    ok(nw.coins === c0 + 30 && nw.awards.bugking === 1, '學生領：字元 +30、職業除錯師詞條');
    await S.close();
    noErr(TM); await TM.close();
  }

  /* ── 班級人數（設定） → 學生端活動讀得到 ── */
  {
    const seedS = base();
    [6, 7, 8, 9].forEach(s => { seedS[`mg_scores/${C3}_${s}號`] = { className: C3, seat: s, name: '同學' + s, nwCls: C3, nwEvDone: ['CW|' + C3], nw: { ev: {} } }; });
    seedS['mg_events/CW'] = ev({ type: 'classwar', per: 2, goalPct: 60, mk: 'coo', title: '全班打咕咕鳥', endAt: NOW + 10 * D });
    delete seedS['mg_events/E1'];
    const TS = await teacher(browser, seedS);
    await tab(TS, 'settings');
    const inp = `[data-size="${C3}"]`;
    ok(await TS.inputValue(inp) === '' && (await TS.textContent('[data-sizes]')).includes('自動算的'), '班級人數：預設空白（自動算）');
    await TS.fill(inp, '20'); await TS.click('[data-size-save]'); await TS.waitForTimeout(400);
    const cs = await FS(TS, 'mg_config/class_sizes');
    ok(cs && cs.sizes[C3] === 20 && !(C4 in cs.sizes), '儲存：mg_config/class_sizes.sizes 有五年級3班＝20');
    await TS.fill(inp, '0'); await TS.click('[data-size-save]'); await TS.waitForTimeout(200);
    ok((await FS(TS, 'mg_config/class_sizes')).sizes[C3] === 20, '填 0 不合法：不儲存');
    const S = await student(browser, await allFS(TS));
    await S.click('[data-act="notice"]'); await S.waitForSelector('#nw-notice'); await S.click('#nw-notice [data-ntab="ev"]'); await S.waitForTimeout(900);
    const cw = await S.textContent('#nw-notice [data-cwx="CW"]');
    ok(/4 \/ 20 人達標/.test(cw), '學生端：班級挑戰分母用老師填的 20：' + cw.replace(/\s+/g, ' '));
    await S.close();
    const fs0 = await allFS(TS); delete fs0['mg_config/class_sizes'];
    const S0 = await student(browser, fs0); await S0.click('[data-act="notice"]'); await S0.waitForSelector('#nw-notice'); await S0.click('#nw-notice [data-ntab="ev"]'); await S0.waitForTimeout(900);
    ok(/4 \/ [56] 人達標/.test(await S0.textContent('#nw-notice [data-cwx="CW"]')), '沒填：照舊用「進過新世界的人數」');
    await S0.close(); await TS.close();
  }

  /* ── 操作紀錄、寫入身分 ── */
  {
    const logs = await logsOf(T), acts = logs.map(l => l.act);
    ok(['寄信', '收回信件', '隱藏暱稱', '恢復暱稱', '名字沒問題', '新增公告', '置頂公告', '取消置頂公告', '修改公告', '刪除公告'].every(a => acts.includes(a)), '操作紀錄：每個寫入動作都有一筆：' + [...new Set(acts)].join('、'));
    ok(logs.every(l => typeof l.act === 'string' && typeof l.target === 'string' && l.summary !== undefined && l.t > 0), '紀錄格式 { act, target, summary, t }');
    const mailLog = logs.find(l => l.act === '寄信' && l.summary.includes('全班禮物') || l.summary.includes('503 全班'));
    ok(mailLog && mailLog.summary.includes('寄給'), '寄信紀錄的內容是摘要：' + (mailLog && mailLog.summary));
    await tab(T, 'settings');
    const shown = await T.$$eval('[data-logtable] tbody tr', r => r.length);
    ok(shown === Math.min(100, logs.length) && (await T.textContent('[data-logtable]')).includes('收回信件'), '設定：看得到操作紀錄（最近 100 筆）');
    ok(await T.evaluate(() => window.__WRITES.length > 10 && window.__WRITES.every(w => w.by === 'admin')), '老師頁所有寫入都走 admin app');
    ok((await T.getAttribute('#main a[href="index.html"]', 'href')) === 'index.html', '設定有「回遊戲」連結');
    noErr(T);
  }

  /* ── 舊控制台的連結 ── */
  {
    const idx = fs.readFileSync(path.join(__dirname, '../../index.html'), 'utf8');
    ok(/id="tc-nwfb" href="teacher\.html"/.test(idx) && /🛠 新世界管理頁/.test(idx), '舊控制台：「🛠 新世界管理頁」連到 teacher.html');
  }
  await T.close();

  /* ── 手機寬度 ── */
  {
    const seedP = base(); seedP['mg_nw_flags/bug_1'] = flag('bug_1', {})[1]; seedP['mg_events/E1'] = ev();
    const P = await teacher(browser, seedP, { mobile: true });
    for (const id of ['overview', 'students', 'mail', 'news', 'settings', 'events']) {
      await tab(P, id);
      const o = await P.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }));
      ok(o.sw <= o.iw, `手機 390 寬：「${id}」沒有橫向捲出頁面（${o.sw}/${o.iw}）`);
    }
    const box = await P.evaluate(() => { const n = document.querySelector('#nav').getBoundingClientRect(), m = document.querySelector('#main').getBoundingClientRect(); return { nb: n.bottom, mt: m.top, nw: n.width, w: window.innerWidth }; });
    ok(box.nb <= box.mt + 1 && box.nw <= box.w + 1, '手機：分頁在上方橫排、內容在下面');
    await tab(P, 'mail');
    await P.check('input[name="mode"][value="all"]'); await P.fill('[data-title]', '手機寄信'); await P.click('[data-submit]'); await P.waitForSelector('[data-modal]');
    const mw = await P.evaluate(() => { const r = document.querySelector('[data-modal] .px-panel').getBoundingClientRect(); return [r.left >= 0, r.right <= window.innerWidth]; });
    ok(mw[0] && mw[1], '手機：預覽視窗在畫面內');
    await clickModal(P, 'ok'); await P.waitForTimeout(400);
    ok(Object.values(await P.evaluate(() => window.__FS)).some(v => v && v.title === '手機寄信'), '手機：寄得出去');
    noErr(P, '手機：沒有 JS 錯誤'); await P.close();
  }

  await browser.close();
  console.log(fails ? `\n${fails} FAIL` : '\n全部通過'); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
