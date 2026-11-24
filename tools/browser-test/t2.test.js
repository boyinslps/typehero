/* 第 7 步（後半 B）：教師管理頁的 🎪 活動、💬 回饋、🐛 回報與抓蟲榜（SPEC §4.4、§4.2b、§6、§7.4、§2.5）。
   全程開 window.__RULES。老師頁與學生頁是兩個瀏覽器分頁、各有一份假資料庫，
   要驗證「學生真的看得到、收得到」，就把老師頁寫完的 window.__FS 整份搬去當學生頁的種子資料。
   測試資料一律用假名，座號不是真實班級的座號。 */
const { chromium } = require('playwright'); const fs = require('fs');
const path = require('path'); const M = path.join(__dirname, 'mock') + '/'; const OUT = process.argv[2] || require('os').tmpdir();
const css = require('./tw.js')(OUT);
/* 最新一則改版公告的 id：發新公告時不用回來改測試（「已讀」的種子資料要等於它，不然會跳公告、冒「！」） */
const NOTICE_ID = /export const NOTICES = \[\s*\{ id: '([^']+)'/.exec(fs.readFileSync(path.join(__dirname, '../../nw-data.js'), 'utf8'))[1];
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const NOW = Date.now(), H = 3600000, D = 24 * H;
const C3 = '五年級3班', C4 = '五年級4班', ID5 = C3 + '_5號', ID6 = C3 + '_6號', ID7 = C3 + '_7號', ID11 = C4 + '_11號', ID12 = C4 + '_12號', ID13 = C4 + '_13號', ID14 = C4 + '_14號';
const p2 = n => String(n).padStart(2, '0');
const inp = ms => { const d = new Date(ms); return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}T${p2(d.getHours())}:${p2(d.getMinutes())}`; };

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
  await p.waitForSelector('#app:not(.hidden)', { timeout: 8000 }); await ready(p);
  return p;
}
const ready = p => p.waitForFunction(() => { const m = document.querySelector('#main'); return m && m.textContent && !m.textContent.includes('讀取中…') && m.children.length > 0; }, null, { timeout: 8000 }).then(() => p.waitForTimeout(150));
const tab = async (p, id) => { await p.click(`#nav [data-tab="${id}"]`); await p.waitForTimeout(120); await ready(p); };
const FS = (p, k) => p.evaluate(k => window.__FS[k], k);
const allFS = p => p.evaluate(() => JSON.parse(JSON.stringify(window.__FS)));
const keys = (p, pre) => p.evaluate(pre => Object.keys(window.__FS).filter(k => k.startsWith(pre)), pre);
const docsOf = (p, pre) => p.evaluate(pre => Object.entries(window.__FS).filter(([k]) => k.startsWith(pre)).map(([k, v]) => Object.assign({ _id: k.slice(pre.length) }, v)), pre);
const clickModal = (p, id) => p.evaluate(id => { const ms = document.querySelectorAll('[data-modal]'); ms[ms.length - 1].querySelector(`[data-btn="${id}"]`).click(); }, id);
const modalText = p => p.evaluate(() => { const ms = document.querySelectorAll('[data-modal]'); return ms.length ? ms[ms.length - 1].textContent.replace(/\s+/g, ' ') : ''; });
const modalOpen = p => p.evaluate(() => document.querySelectorAll('[data-modal]').length);
const waitModal = p => p.waitForSelector('[data-modal]', { timeout: 4000 });
const noErr = (p, m = '沒有 JS 錯誤') => ok(p.errs.length === 0, m + ' ' + p.errs.join(' | '));
const mainText = p => p.textContent('#main').then(t => t.replace(/\s+/g, ' '));
const evMails = async (p, pre) => (await docsOf(p, 'mg_mail/')).filter(m => m._id.startsWith(pre));
const logsOf = async p => (await docsOf(p, 'mg_admin_log/')).sort((a, b) => a.t - b.t);
const num = (p, k) => p.textContent(`[data-card="${k}"] b`).then(t => t.replace(/\s+/g, ' ').trim());

const stu = (cls, seat, name, o = {}) => [`mg_scores/${cls}_${seat}號`, Object.assign({ className: cls, seat, name, nwCls: cls, bestLevel: 10, bestScore: 20, scoreVer: 2, plays: 9, tutorialDone: true, talentIntroDone: true, tier: 'B', balanceVer: 3, punctDone: true, lastPlayedAt: { __ts: NOW } },
  o.nw === null ? {} : { nw: Object.assign({ v: 1, savedAt: NOW, look: { style: 1, hair: 2, skin: 1 }, starter: 'dagger', quest: { done: ['1-0', '1-0a'] }, items: { potion: 3 }, intro: { hub: 1, mail: 1, notice: 1 }, seenNotice: NOTICE_ID, name0: name, nick: ['a_flash', 'b_coo'] }, o.nw || {}) }, o.top || {})];
const ev = (o = {}) => Object.assign({ type: 'boost', mul: 2, what: 'exp', title: '加倍', desc: '', startAt: NOW - H, endAt: NOW + 3 * D, cls: [] }, o);
const flag = (id, o) => [`mg_nw_flags/${id}`, Object.assign({ type: 'bug', status: 'pending', docId: ID5, cls: C3, seat: 5, name: '小明', cat: '畫面', did: '做了事', what: '壞了', t: NOW - H }, o)];
const evst = (s, n, extra) => Object.assign({ s, n, runs: n, e: NOW - D }, extra || {});

function seed() {
  const o = Object.fromEntries([
    ['mg_admins/T1', { ok: true }],
    stu(C3, 5, '小明', { nw: { hr: 7, coins: 120, hunts: 10, stat: { wins: 8, fails: 2 }, ev: { RK: evst(40, 4), RK2: evst(40, 4), CW: { n: 2, cw: 1, e: NOW + D } } }, top: { nwEvDone: ['CW|' + C3] } }),
    stu(C3, 6, '小華', { nw: { hr: 3, coins: 5, stat: { wins: 2, fails: 2 }, nick: ['a_star', 'b_slime'], ev: { RK: evst(30, 3), RK2: evst(30, 3) } }, top: { nwEvDone: ['CW|' + C3] } }),
    stu(C3, 7, '阿強', { nw: { hr: 5, stat: { wins: 4, fails: 2 }, ev: { RK: evst(30, 2) } } }),
    stu(C4, 11, '丁同學', { nw: { ev: { RK: evst(80, 2), RK2: evst(80, 2), RKA: { s: 3, n: 3, best: 3, base: 20 } } } }),
    stu(C4, 12, '戊同學', { nw: { ev: { RK: evst(10, 2), RK2: evst(10, 2), RKA: { s: 20, n: 2, best: 20 } } } }),
    stu(C4, 13, '己同學', { nw: { ev: { RK: { n: 1, runs: 1, e: NOW - D } } } }),
    stu(C4, 14, '庚同學', { nw: null }),
    ['mg_mail/m1', { aud: ['all'], title: '舊信', body: '', items: [], from: '老師', sendAt: NOW - 1000, expireAt: 0, t: NOW - 1000, src: 'manual' }],
    /* 活動：已結束的排行榜（發獎用）、進行中的排行榜（⚠ 標記）、進行中的班級挑戰 */
    ['mg_events/RK', ev({ type: 'ranking', metric: 'improve', mk: 'frog', title: '進步獎：泡泡蛙', startAt: NOW - 10 * D, endAt: NOW - D })],
    ['mg_events/RK2', ev({ type: 'ranking', metric: 'improve', mk: 'frog', title: '進步獎二', startAt: NOW - 10 * D, endAt: NOW - D })],
    ['mg_events/RKA', ev({ type: 'ranking', metric: 'fastest', mk: 'frog', title: '最快泡泡蛙', startAt: NOW - D, endAt: NOW + 5 * D })],
    ['mg_events/CW', ev({ type: 'classwar', per: 2, goalPct: 50, mk: 'coo', title: '全班打咕咕鳥', cls: [C3], items: [{ type: 'coins', n: 100 }], startAt: NOW - D, endAt: NOW + 10 * D })],
    ['mg_events/BADONE', { type: 'hunt', title: '壞資料', endAt: NOW + D }],
    /* 回饋 */
    flag('fb1', { type: 'feedback', mk: 'coo', mon: '咕咕鳥', rate: '好玩', text: '很好玩', t: NOW - H }),
    flag('fb2', { type: 'feedback', mk: 'coo', mon: '咕咕鳥', rate: '太難', text: '紅線太快', t: NOW - 2 * H }),
    flag('fb3', { type: 'feedback', mk: 'coo', mon: '咕咕鳥', rate: '好玩', text: '喜歡', read: true, t: NOW - 3 * H }),
    flag('fb4', { type: 'feedback', mk: 'frog', mon: '泡泡蛙', rate: '普通', text: '還可以', t: NOW - 4 * H }),
    flag('fb5', { type: 'feedback', mk: 'shroom', mon: '蘑菇怪', text: '只寫字沒選', t: NOW - 5 * H }),
    flag('fb6', { type: 'feedback', mk: 'frog', mon: '泡泡蛙', rate: '好玩', text: '泡泡很可愛', t: NOW - 6 * H }),
    /* 回報 */
    flag('q1', { t: NOW - 3 * H, did: 'A1做了事', what: 'A1壞了' }),
    flag('q2', { t: NOW - 2 * H, did: 'A2做了事', what: 'A2壞了' }),
    flag('q3', { docId: ID6, seat: 6, name: '小華', t: NOW - 5 * H, did: 'B1做了事', what: 'B1壞了' }),
    flag('q4', { t: NOW - 1 * H, did: 'B1同一個', what: '也壞了' }),
    flag('q5', { docId: ID7, seat: 7, name: '阿強', t: NOW - 4 * H, did: 'C1做了事', what: 'C1壞了' }),
    flag('q6', { docId: ID6, seat: 6, name: '小華', t: NOW - 6 * H, did: undefined, what: undefined, text: '【我做了什麼】點了三下\n【錯誤狀況】畫面黑掉' }),
    flag('qa1', { docId: ID11, cls: C4, seat: 11, name: '丁同學', status: 'approved', sev: 1, t: NOW - 9 * D, did: '舊的', what: '已確認' }),
    ['mg_bugboard/' + ID7, { className: C3, seat: 7, score: 5, n: 5, firstAt: NOW - 9 * D, reports: [1, 2, 3, 4, 5].map(i => ({ id: 'x' + i, st: 'approved', sev: 1, reply: '', t: NOW - 9 * D + i })) }]
  ]);
  return o;
}

/* ── 學生頁（用老師頁寫完的資料） ── */
async function student(browser, sd) {
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
  }, { s: sd, hash });
  await route(p);
  await p.goto('http://localhost:8765/index.html'); await p.waitForFunction(() => window.__NWG, null, { timeout: 15000 }); await p.waitForTimeout(500);
  await p.selectOption('#in-grade', '五年級'); await p.selectOption('#in-class', '3班'); await p.fill('#in-seat', '5'); await p.waitForTimeout(900);
  await p.click('#btn-enter'); await p.waitForTimeout(1000);
  await p.click('#nw-door'); await p.waitForTimeout(1800);
  await dismissGifts(p);
  return p;
}
const nwLocal = p => p.evaluate(() => JSON.parse(JSON.stringify(window.__NWG.nw)));
const openMail = async p => { await p.click('.vb[data-bld="mail"]'); await p.waitForSelector('#nw-mail', { timeout: 4000 }); await p.waitForFunction(() => !document.querySelector('#nw-mail [data-msg]') || document.querySelector('#nw-mail [data-msg]').textContent !== '讀信中…', null, { timeout: 4000 }); await p.waitForTimeout(200); };
const mailIds = p => p.$$eval('#nw-mail [data-mail]', els => els.map(e => e.dataset.mail));
const dismissGifts = async p => { for (let i = 0; i < 14; i++) { if (!(await p.$('#nw-gift'))) break; await p.click('#nw-gift [data-ok]'); await p.waitForTimeout(150); } };
const openNotice = async (p, t) => { await p.click('[data-act="notice"]'); await p.waitForSelector('#nw-notice'); await p.click(`#nw-notice [data-ntab="${t}"]`); await p.waitForTimeout(900); };

/* ── 活動表單 ── */
/* 活動代號收在「進階」裡，要先展開才填得進去 */
const openAdv = p => p.evaluate(() => { const d = document.querySelector('[data-advanced]'); if (d) d.open = true; });
async function newEvent(p, { type, tpl, id, title, start, end, fill }) {
  await p.click('[data-new]'); await p.waitForSelector('[data-form]');
  if (type && type !== 'boost') await p.check(`input[name="etype"][value="${type}"]`);
  if (tpl) await p.selectOption('[data-tpl]', tpl);
  if (id) { await openAdv(p); await p.fill('[data-f="id"]', id); }
  if (title) await p.fill('[data-f="title"]', title);
  if (start) await p.fill('[data-f="startAt"]', inp(start));
  if (end) await p.fill('[data-f="endAt"]', inp(end));
  if (fill) await fill(p);
}
const submitForm = async p => { await p.click('[data-submit]'); await p.waitForTimeout(200); };
const saveForm = async p => { await submitForm(p); await waitModal(p); await clickModal(p, 'ok'); await p.waitForTimeout(500); };

(async () => {
  /* ── 純函式：名次、⚠、信件 ID ── */
  {
    const calc = await import('../../teacher/ev-calc.js'), bc = await import('../../teacher/bug-calc.js');
    const E = { id: 'R', title: '進步獎', metric: 'improve', mk: 'frog' };
    const rows = [{ id: 'a', s: 30, n: 3, warn: false }, { id: 'b', s: 30, n: 2, warn: false }, { id: 'c', s: 80, n: 5, warn: true }, { id: 'd', s: null, n: 1, warn: false }, { id: 'e', s: 10, n: 2, warn: false }];
    const sn = calc.buildSnapshot(E, rows, r => !r.warn, { t1: [{ type: 'coins', n: 5 }], t23: [{ type: 'coins', n: 3 }], t410: [] }, [{ type: 'coins', n: 1 }], 99);
    const ra = sn.rows.find(r => r.id === 'a'), rb = sn.rows.find(r => r.id === 'b'), re = sn.rows.find(r => r.id === 'e');
    ok(ra.rank === 1 && rb.rank === 1 && ra.pos !== rb.pos && re.rank === 3 && sn.rows.find(r => r.id === 'c').pick === false, '純函式：同分同名次、位置（信件 ID）不重複、被擋的人不佔名次：' + JSON.stringify(sn.rows.map(r => [r.id, r.rank, r.pos])));
    const ms = calc.snapshotMails(E, sn), ids = ms.map(m => m.id);
    ok(new Set(ids).size === ids.length && ids.includes('ev_R_1') && ids.includes('ev_R_2') && ids.includes('ev_R_p_a') && ids.includes('ev_R_p_c'), '純函式：信件 ID 全不重複，被 ⚠ 擋下的人沒有名次獎但保留參加獎：' + ids.join());
    const rows2 = rows.concat([{ id: 'f', s: 20, n: 2, warn: false }]);
    const sn2 = calc.buildSnapshot(E, rows2, r => !r.warn && r.id !== 'f', { t1: [{ type: 'coins', n: 5 }], t23: [], t410: [] }, [{ type: 'coins', n: 1 }], 99);
    ok(sn2.parts.includes('c') && !sn2.parts.includes('f') && sn2.parts.includes('d'), '純函式：⚠ 的人保留參加獎；老師手動取消勾選的正常分數的人連參加獎也沒有；沒分數但有場次的人有：' + sn2.parts.join());
    ok(JSON.stringify(calc.snapshotMails(E, sn)) === JSON.stringify(ms), '純函式：同一份快照永遠產生一模一樣的信');
    const rs = [{ id: 'a', st: 'approved', sev: 1, t: 10 }, { id: 'b', st: 'approved', sev: 3, t: 50 }, { id: 'c', st: 'approved', sev: 2, t: 30 }, { id: 'd', st: 'dup', t: 99 }];
    const c = bc.boardCalc(rs, 1, []);
    ok(c.score === 7 && c.n === 3 && c.firstAt === 50, '純函式：抓蟲分＝嚴重度＋加分、firstAt＝最晚送出的已確認那則：' + JSON.stringify(c));
    ok(bc.bugText({ text: '【我做了什麼】點了\n【錯誤狀況】黑掉' }).what === '黑掉', '純函式：舊資料 text 拆成做了什麼／錯誤狀況');
  }

  const browser = await chromium.launch();
  const T = await teacher(browser, seed());

  /* ── 總覽數字（改動前） ── */
  {
    ok(await num(T, 'pending') === '6', '總覽：待審回報 6（已確認的 qa1 不算）：' + await num(T, 'pending'));
    ok(await num(T, 'unread') === '5', '總覽：未讀回饋 5（fb3 已讀）：' + await num(T, 'unread'));
  }

  /* ══════════ 🎪 活動 ══════════ */
  await tab(T, 'events');
  {
    const heads = await T.$$eval('#main h3', h => h.map(x => x.textContent));
    ok(heads.some(h => h.startsWith('進行中')) && heads.some(h => h.startsWith('排程中')) && heads.some(h => h.startsWith('已結束')), '列表分三區：' + heads.join('、'));
    ok((await T.$$eval('[data-evtable="active"] tr[data-eid]', r => r.map(x => x.dataset.eid))).sort().join() === 'CW,RKA', '進行中：CW、RKA');
    ok((await T.$$eval('[data-evtable="ended"] tr[data-eid]', r => r.map(x => x.dataset.eid))).sort().join() === 'RK,RK2', '已結束：RK、RK2');
    ok((await T.textContent('[data-brokentable]')).includes('BADONE'), '壞資料的活動單獨列出可刪除');
  }

  /* 四種活動新增 */
  const ids4 = {};
  {
    /* ID 不合法 */
    await newEvent(T, { type: 'boost', id: 'bad id!', title: '壞 ID' });
    await submitForm(T);
    ok((await T.textContent('[data-err]')).includes('英文、數字、底線') && await modalOpen(T) === 0 && !(await keys(T, 'mg_events/')).some(k => k.includes('bad')), '活動 ID 有空白／符號：擋下、不寫入');
    await openAdv(T); await T.fill('[data-f="id"]', 'RK'); await submitForm(T);
    ok((await T.textContent('[data-err]')).includes('已經有了'), '活動 ID 重複：擋下');
    await openAdv(T); await T.fill('[data-f="id"]', 'T_boost-1'); await T.fill('[data-f="title"]', '本週經驗加倍');
    ok((await T.textContent('[data-pv]')).includes('本週經驗加倍') && (await T.textContent('[data-pv]')).includes('變 2 倍'), '右邊即時預覽學生會看到的卡片');
    await submitForm(T); await waitModal(T);
    const mt = await modalText(T);
    ok(mt.includes('學生會看到這個') && mt.includes('新增「本週經驗加倍」') && mt.includes('全校'), '送出前預覽＋摘要：' + mt.slice(0, 120));
    await clickModal(T, 'ok'); await T.waitForTimeout(500);
    let d = await FS(T, 'mg_events/T_boost-1');
    ok(d && d.type === 'boost' && d.mul === 2 && d.what === 'exp' && d.endAt > d.startAt && Array.isArray(d.cls) && !('goal' in d) && !('metric' in d), '新增 boost：只有這個類型的欄位：' + JSON.stringify(d));
    ok(await T.$('[data-evinfo]') !== null, '送出後到詳細頁');
    await T.click('[data-back]');

    await newEvent(T, { type: 'hunt', tpl: 'hunt_coo', id: 'T_hunt', title: '咕咕鳥討伐' });
    ok(await T.$('[data-f="goal"]') !== null && await T.$('[data-f="per"]') === null && await T.$('[data-f="metric"]') === null && await T.$('[data-items]') !== null, 'hunt：只顯示這個類型的欄位（目標隻數、獎勵；沒有每人隻數、指標）');
    ok(await T.inputValue('[data-f="goal"]') === '5' && await T.inputValue('[data-f="mk"]') === 'coo', '範本預填：打 5 隻咕咕鳥');
    await saveForm(T);
    d = await FS(T, 'mg_events/T_hunt');
    ok(d && d.type === 'hunt' && d.mk === 'coo' && d.goal === 5 && d.minStar === 1 && d.items[0].type === 'coins' && d.items[0].n === 100 && !('per' in d), '新增 hunt：' + JSON.stringify(d));
    await T.click('[data-back]');

    await newEvent(T, { type: 'classwar', tpl: 'classwar', id: 'T_cw', title: '全班打咕咕鳥二' });
    ok(await T.inputValue('[data-f="per"]') === '3' && await T.inputValue('[data-f="goalPct"]') === '50', 'classwar 範本：每人 3 隻、全班 50%（照模擬結果）');
    await T.check(`[data-cls="${C3}"]`);
    await saveForm(T);
    d = await FS(T, 'mg_events/T_cw');
    ok(d && d.type === 'classwar' && d.per === 3 && d.goalPct === 50 && d.cls.join() === C3 && d.items.length === 1, '新增 classwar（限 3 班）：' + JSON.stringify(d));
    await T.click('[data-back]');

    await newEvent(T, { type: 'ranking', tpl: 'rank_improve_frog', id: 'T_rank', title: '進步獎測試' });
    ok(await T.inputValue('[data-f="metric"]') === 'improve' && await T.inputValue('[data-f="mk"]') === 'frog', 'ranking 範本：進步獎、泡泡蛙');
    await T.selectOption('[data-f="metric"]', 'kills'); await T.selectOption('[data-f="mk"]', '');
    await T.selectOption('[data-f="metric"]', 'improve');
    ok(await T.inputValue('[data-f="mk"]') !== '', '切回進步獎：一定有指定魔物（畫面跟資料一致）');
    await T.selectOption('[data-f="mk"]', 'frog');
    await saveForm(T);
    d = await FS(T, 'mg_events/T_rank');
    ok(d && d.type === 'ranking' && d.metric === 'improve' && d.mk === 'frog' && !('items' in d), '新增 ranking：' + JSON.stringify(d));
    await T.click('[data-back]');
    ok((await T.$$eval('[data-evtable="active"] tr[data-eid]', r => r.map(x => x.dataset.eid))).includes('T_rank'), '剛開始的活動在「進行中」');

    /* 排程中的活動（還沒開始，全部欄位都能改） */
    await newEvent(T, { type: 'hunt', tpl: 'hunt_coo', id: 'T_soon', title: '明天開始的討伐', start: NOW + D, end: NOW + 8 * D });
    await saveForm(T); await T.click('[data-back]');
    ok((await T.$$eval('[data-evtable="soon"] tr[data-eid]', r => r.map(x => x.dataset.eid))).join() === 'T_soon', '開始時間在明天：列在「排程中」');
    const log0 = (await logsOf(T)).filter(l => l.act === '新增活動').length;
    ok(log0 === 5, '每個新增都有操作紀錄：' + log0);

    /* 學生端真的看得到 */
    const S = await student(browser, await allFS(T));
    await openNotice(S, 'ev');
    const vis = await S.$$eval('#nw-notice [data-evcard]', e => e.map(x => x.dataset.evcard + ':' + x.dataset.evphase));
    ok(['T_boost-1:active', 'T_hunt:active', 'T_cw:active', 'T_rank:active', 'T_soon:soon'].every(x => vis.includes(x)), '學生端看得到這 5 個新活動：' + vis.join());
    ok(vis.includes('RK:ended'), '學生端：剛結束的排行榜也在');
    const cardText = await S.textContent('#nw-notice [data-evcard="T_hunt"]');
    ok(cardText.includes('咕咕鳥討伐') && /5/.test(cardText), '學生端卡片內容：' + cardText.replace(/\s+/g, ' ').slice(0, 80));
    noErr(S, '學生端沒有 JS 錯誤'); await S.close();
  }

  /* 開始後鎖欄位 */
  {
    await T.click('[data-evtable="active"] [data-open="T_hunt"]');
    await T.click('[data-edit="T_hunt"]'); await T.waitForSelector('[data-form]');
    const dis = async s => await T.isDisabled(s);
    ok(await T.$('[data-lockednote]') !== null && await dis('[data-f="goal"]') && await dis('[data-f="mk"]') && await dis('[data-f="minStar"]') && await dis('input[name="etype"][value="hunt"]'), '開始後：類型、魔物、星級、目標隻數 都鎖住（disabled）');
    ok(!(await dis('[data-f="title"]')) && !(await dis('[data-f="desc"]')) && !(await dis('[data-f="endAt"]')) && await dis('[data-f="startAt"]'), '開始後：標題、說明、結束時間可以改；開始時間鎖住');
    const before = await FS(T, 'mg_events/T_hunt');
    await T.fill('[data-f="endAt"]', inp(before.endAt - 2 * D)); await submitForm(T);
    ok((await T.textContent('[data-err]')).includes('只能延長') && await modalOpen(T) === 0 && (await FS(T, 'mg_events/T_hunt')).endAt === before.endAt, '開始後把結束時間改早：擋下，沒寫入');
    await T.fill('[data-f="title"]', '咕咕鳥大討伐（改名）'); await T.fill('[data-f="endAt"]', inp(before.endAt + 3 * D));
    await saveForm(T);
    const after = await FS(T, 'mg_events/T_hunt');
    ok(after.title === '咕咕鳥大討伐（改名）' && Math.abs(after.endAt - (before.endAt + 3 * D)) < 61000 && after.goal === 5 && after.mk === 'coo' && after.type === 'hunt' && after.startAt === before.startAt && after.t === before.t, '開始後存檔：只動標題與延長結束時間，其他欄位原封不動');
    /* 還沒開始的活動：全部都能改 */
    await T.click('[data-back]'); await T.click('[data-evtable="soon"] [data-open="T_soon"]'); await T.click('[data-edit="T_soon"]'); await T.waitForSelector('[data-form]');
    ok(!(await dis('[data-f="goal"]')) && await T.$('[data-lockednote]') === null && await dis('input[name="etype"][value="hunt"]'), '排程中的活動：目標隻數可以改（類型本身不能換）');
    await T.fill('[data-f="goal"]', '8'); await saveForm(T);
    ok((await FS(T, 'mg_events/T_soon')).goal === 8, '排程中的活動改目標隻數 → 8');
    await T.click('[data-back]');
  }

  /* 開始後：倍數、加倍什麼、至少打幾場、對象班級也鎖住；獎品還能改（老師想加碼） */
  {
    const dis = async x => await T.isDisabled(x);
    await T.click('[data-evtable="active"] [data-open="T_boost-1"]'); await T.click('[data-edit="T_boost-1"]'); await T.waitForSelector('[data-form]');
    ok(await dis('[data-f="mul"]') && await dis('[data-f="what"]') && !(await dis('[data-f="title"]')), '開始後的 boost：倍數、加倍什麼鎖住，標題還能改');
    const toList = async () => { for (let i = 0; i < 3 && !(await T.$('[data-evtable="active"]')); i++) { const b = (await T.$('[data-cancel]')) || (await T.$('[data-back]')); if (b) await b.click(); await T.waitForTimeout(150); } };
    await toList();
    await newEvent(T, { type: 'ranking', tpl: 'rank_improve_frog', id: 'T_acc', title: '神準手測試', fill: async p => { await p.selectOption('[data-f="metric"]', 'acc'); await p.selectOption('[data-f="mk"]', 'frog'); await p.fill('[data-f="minRuns"]', '4'); } });
    await saveForm(T);
    ok((await FS(T, 'mg_events/T_acc')).minRuns === 4, '新增神準手：至少打 4 場');
    await T.click('[data-edit="T_acc"]'); await T.waitForSelector('[data-form]');
    ok(await dis('[data-f="minRuns"]') && await dis('[data-f="metric"]') && await dis('[data-f="mk"]'), '開始後的 ranking：至少打幾場、指標、魔物都鎖住');
    await toList();
    await T.click('[data-evtable="active"] [data-open="T_cw"]'); await T.click('[data-edit="T_cw"]'); await T.waitForSelector('[data-form]');
    ok(await dis(`[data-cls="${C3}"]`) && await dis('[data-f="per"]') && await dis('[data-f="goalPct"]'), '開始後的 classwar：對象班級、每人隻數、達標比例鎖住');
    ok(!(await dis('[data-gadd]')) && !(await dis('[data-gdel="0"]')), '開始後：達標獎勵還能改（可以加碼）');
    const cwBefore = await FS(T, 'mg_events/T_cw');
    await T.selectOption('[data-gadd]', 'coins'); await T.fill('[data-gn="1"]', '7');
    await saveForm(T);
    const cwAfter = await FS(T, 'mg_events/T_cw');
    ok(cwAfter.items.length === 2 && cwAfter.items[1].n === 7 && cwAfter.cls.join() === cwBefore.cls.join() && cwAfter.per === cwBefore.per && cwAfter.goalPct === cwBefore.goalPct && cwAfter.startAt === cwBefore.startAt, '開始後加碼獎品存得進去，班級、隻數、比例沒變：' + JSON.stringify(cwAfter.items));
    await toList();
  }

  /* 進行中：參加人數、各班達標率、前 10 名（含 ⚠） */
  {
    await T.click('[data-evtable="active"] [data-open="CW"]');
    const row = (await T.textContent('[data-cw="' + C3 + '"]')).replace(/\s+/g, ' ');
    ok(row.includes('2 / 3 人') && row.includes('67%') && row.includes('全班達標') && row.includes('1 人已領'), '班級挑戰：503 達標 2/3＝67%、已達 50% 目標、1 人已領全班獎：' + row);
    ok((await mainText(T)).includes('只顯示，不寄信') && (await T.textContent('[data-joined]')).includes('1 人'), '全班獎只顯示不寄；參加人數（n>=1）1 人');
    ok(await T.$('[data-award-btn]') === null, '班級挑戰沒有「發獎」按鈕（學生自己領）');
    await T.click('[data-back]');
    await T.click('[data-evtable="active"] [data-open="RKA"]');
    const rk = (await T.textContent('[data-ranktable]')).replace(/\s+/g, ' ');
    ok(rk.includes('丁同學') && rk.includes('⚠') && rk.includes('戊同學'), '進行中排行榜：看得到目前前 10 名、最快 3 秒標 ⚠（低於合理下限）：' + rk);
    ok(await T.$('[data-award-btn]') === null, '還沒結束：不能發獎');
    await T.click('[data-back]');
  }

  /* 提早結束 */
  {
    await T.click('[data-evtable="active"] [data-open="T_boost-1"]');
    await T.click('[data-endnow]'); await waitModal(T); await clickModal(T, 'ok'); await T.waitForTimeout(500);
    const d = await FS(T, 'mg_events/T_boost-1');
    ok(d.endAt <= Date.now() + 1000 && d.endAt > NOW - H, '提早結束：endAt 設成現在');
    await T.click('[data-back]');
    ok((await T.$$eval('[data-evtable="ended"] tr[data-eid]', r => r.map(x => x.dataset.eid))).includes('T_boost-1'), '提早結束的活動移到「已結束」');
  }

  /* ranking 發獎 */
  {
    await T.click('[data-evtable="ended"] [data-open="RK2"]');
    /* RK2：先設一個過大的字元數 → confirmBig 擋住，沒寫快照、沒寄信 */
    await T.click('[data-award-btn="RK2"]'); await waitModal(T);
    const mt = await modalText(T);
    ok(mt.includes('進步 80%') && mt.includes('⚠') && mt.includes('丁同學'), '發獎視窗：列出每人分數與有效場次，80% 標 ⚠');
    ok(await T.isChecked('[data-pick="' + ID11 + '"]') === false && await T.isChecked('[data-pick="' + ID5 + '"]') === true, '⚠ 的人預設不勾，其他人預設勾');
    const rks = await T.$$eval('[data-award-table] tr[data-arow]', r => r.map(x => [x.dataset.arow, x.children[1].textContent]));
    ok(rks.find(x => x[0] === ID5)[1] === '1' && rks.find(x => x[0] === ID6)[1] === '2' && rks.find(x => x[0] === ID12)[1] === '3' && rks.find(x => x[0] === ID11)[1] === '—', '名次：小明 1、小華 2、戊同學 3（⚠ 的丁同學不佔名次）：' + JSON.stringify(rks));
    await T.selectOption('[data-tier="t1"] [data-gadd]', 'coins'); await T.fill('[data-tier="t1"] [data-gn="0"]', '5000');
    await clickModal(T, 'ok'); await T.waitForTimeout(300);
    ok((await modalText(T)).includes('數量比平常多很多'), '名次獎品字元 5000：跳「數量比平常多很多」（confirmBig）');
    await clickModal(T, 'no'); await T.waitForTimeout(300);
    ok(await modalOpen(T) === 0 && !(await FS(T, 'mg_events/RK2')).result && (await keys(T, 'mg_mail/ev_RK2')).length === 0, '不確定就按「回去改」：沒寫快照、沒寄信');
    /* 重來一次：把 ⚠ 的人勾回來，正常數量 */
    await T.click('[data-award-btn="RK2"]'); await waitModal(T);
    await T.check('[data-pick="' + ID11 + '"]');
    const rks2 = await T.$$eval('[data-award-table] tr[data-arow]', r => r.map(x => [x.dataset.arow, x.children[1].textContent]));
    ok(rks2.find(x => x[0] === ID11)[1] === '1' && rks2.find(x => x[0] === ID5)[1] === '2', '勾回 ⚠ 的人：他變第 1 名、小明變第 2：' + JSON.stringify(rks2));
    await T.selectOption('[data-tier="t1"] [data-gadd]', 'coins'); await T.fill('[data-tier="t1"] [data-gn="0"]', '50');
    await clickModal(T, 'ok'); await waitModal(T); await clickModal(T, 'ok'); await T.waitForTimeout(700);
    const m2 = await evMails(T, 'ev_RK2_');
    ok(m2.length === 1 && m2[0]._id === 'ev_RK2_1' && m2[0].aud[0] === 'id:' + ID11 && m2[0].items[0].n === 50 && (await FS(T, 'mg_events/RK2')).awarded === true, 'RK2：只有第 1 名有獎，寄給勾回的丁同學，awarded=true');
    await T.click('[data-back]');

    /* RK：三級獎品＋參加獎 */
    await T.click('[data-evtable="ended"] [data-open="RK"]');
    await T.click('[data-award-btn="RK"]'); await waitModal(T);
    for (const [k, n] of [['t1', 50], ['t23', 30], ['t410', 10]]) { await T.selectOption(`[data-tier="${k}"] [data-gadd]`, 'coins'); await T.fill(`[data-tier="${k}"] [data-gn="0"]`, String(n)); }
    await T.check('[data-parton]'); await T.selectOption('[data-part] [data-gadd]', 'coins'); await T.fill('[data-part] [data-gn="0"]', '5');
    await clickModal(T, 'ok'); await waitModal(T);
    const pv = await modalText(T);
    ok(pv.includes('學生會看到這個') && pv.includes('共 10 封信') && pv.includes('參加獎 6 人'), '發獎預覽＋摘要：共 10 封（名次 4＋參加 6，⚠ 的人保留參加獎）：' + pv.slice(0, 160));
    await clickModal(T, 'ok'); await T.waitForTimeout(800);
    const evRK = await FS(T, 'mg_events/RK');
    ok(evRK.awarded === true && evRK.result && Array.isArray(evRK.result.rows) && evRK.result.rows.length === 5, '先寫名次快照：mg_events/RK.result 5 筆有分數的、awarded=true');
    ok(evRK.result.rows.every(r => !('name' in r) && !('className' in r) && !('seat' in r)), '快照只放榜上名字（nick，也就是登入名字，跟榜單公開的一樣），沒有 name／班級／座號欄位（mg_events 全部登入的人都讀得到）');
    const rr = id => evRK.result.rows.find(r => r.id === id);
    ok(rr(ID11).warn === true && rr(ID11).pick === false && rr(ID5).rank === 1 && rr(ID6).rank === 2 && rr(ID7).rank === 2 && rr(ID12).rank === 4 && rr(ID6).pos !== rr(ID7).pos && rr(ID5).n === 4, '快照：每人分數、有效場次、⚠、同分同名次但位置不同');
    const mk = (await evMails(T, 'ev_RK_')).sort((a, b) => a._id < b._id ? -1 : 1);
    ok(mk.length === 10 && mk.every(m => m.src === 'event:RK' && m.from === '老師' && m.aud.length === 1), '寄了 10 封，格式正確：' + mk.map(m => m._id).join());
    const byId = id => mk.find(m => m._id === id);
    ok(byId('ev_RK_1').items[0].n === 50 && byId('ev_RK_1').aud[0] === 'id:' + ID5 && byId('ev_RK_2').items[0].n === 30 && byId('ev_RK_3').items[0].n === 30 && byId('ev_RK_4').items[0].n === 10 && byId('ev_RK_4').aud[0] === 'id:' + ID12, '第 1 名 50、並列第 2 名各 30（兩封不同 ID）、第 4 名 10');
    ok(mk.filter(m => m._id.startsWith('ev_RK_p_')).length === 6 && byId('ev_RK_p_' + ID11).items[0].n === 5 && !byId('ev_RK_' + 5) && byId('ev_RK_p_' + ID13).items[0].n === 5, '參加獎 6 人（有參加的都有：被擋下的 ⚠ 學生保留參加獎但沒有名次獎、只打 1 場沒分數的己同學有）');
    /* 重按：同一份快照、同樣的 ID，不會變兩封 */
    const snapBefore = JSON.stringify(evRK.result), mailsBefore = JSON.stringify(mk);
    await T.click('[data-back]'); await T.click('[data-evtable="ended"] [data-open="RK"]');
    ok((await T.textContent('[data-awarded]')).includes('同一份名次存檔'), '已發過獎的畫面說明重按會照同一份名次存檔');
    await T.click('[data-award-btn="RK"]'); await waitModal(T);
    ok((await modalText(T)).includes('同一份存檔'), '重按：顯示「用同一份存檔、同樣信件代號」');
    await clickModal(T, 'ok'); await waitModal(T); await clickModal(T, 'ok'); await T.waitForTimeout(800);
    const mk2 = (await evMails(T, 'ev_RK_')).sort((a, b) => a._id < b._id ? -1 : 1);
    ok(mk2.length === 10 && JSON.stringify(mk2) === mailsBefore && JSON.stringify((await FS(T, 'mg_events/RK')).result) === snapBefore, '重按發獎：還是 10 封、內容一模一樣、快照沒變');
    /* 中途失敗（awarded 沒寫成）再按：照快照補寄 */
    await T.evaluate(() => { const e = window.__FS['mg_events/RK']; e.awarded = false; delete window.__FS['mg_mail/ev_RK_2']; delete window.__FS['mg_mail/ev_RK_p_' + '五年級4班_12號']; });
    await tab(T, 'events'); await T.click('[data-evtable="ended"] [data-open="RK"]');
    ok((await T.textContent('[data-snapnote]')).includes('已經有名次存檔'), '名次存檔有了但 awarded 沒寫：畫面提示可以照存檔再寄');
    await T.click('[data-award-btn="RK"]'); await waitModal(T); await clickModal(T, 'ok'); await waitModal(T); await clickModal(T, 'ok'); await T.waitForTimeout(800);
    const mk3 = (await evMails(T, 'ev_RK_')).sort((a, b) => a._id < b._id ? -1 : 1);
    ok(mk3.length === 10 && JSON.stringify(mk3) === mailsBefore && (await FS(T, 'mg_events/RK')).awarded === true, '補寄：缺的 2 封補回來，總數還是 10、都跟原本一模一樣');
    ok((await logsOf(T)).filter(l => l.act === '活動發獎').length === 3 && (await logsOf(T)).some(l => l.act === '重寄活動獎品'), '操作紀錄：活動發獎、重寄活動獎品');
    await T.click('[data-back]');
  }

  /* 再開一次、刪除 */
  {
    await T.click('[data-evtable="ended"] [data-again="RK"]'); await T.waitForSelector('[data-form]');
    ok(await T.inputValue('[data-f="title"]') === '進步獎：泡泡蛙' && await T.inputValue('[data-f="metric"]') === 'improve' && await T.inputValue('[data-f="mk"]') === 'frog' , '再開一次：複製成新活動表單（內容照舊）');
    const nid = await T.inputValue('[data-f="id"]');
    ok(nid !== 'RK' && /^[A-Za-z0-9_-]+$/.test(nid) && Math.abs(new Date(await T.inputValue('[data-f="startAt"]')).getTime() - NOW) < 3 * H, '再開一次：新 ID、開始時間是現在：' + nid);
    await saveForm(T);
    const nd = await FS(T, 'mg_events/' + nid), old = await FS(T, 'mg_events/RK');
    ok(nd && nd.type === 'ranking' && nd.metric === 'improve' && !nd.result && !nd.awarded && old.awarded === true && nd.endAt > Date.now(), '再開一次：新活動沒有 result／awarded；舊的不變');
    await T.click('[data-back]');
    await T.click('[data-evtable="ended"] [data-del="RK2"]'); await waitModal(T);
    ok((await modalText(T)).includes('這個活動取消了'), '刪除前說明學生端會看到「取消了」');
    await clickModal(T, 'ok'); await T.waitForTimeout(500);
    ok(!(await FS(T, 'mg_events/RK2')) && (await keys(T, 'mg_mail/ev_RK2_')).length === 1, '刪除活動：文件沒了，已寄出的信不收回');
    await T.click('[data-brokentable] [data-del="BADONE"]'); await waitModal(T); await clickModal(T, 'ok'); await T.waitForTimeout(400);
    ok(!(await FS(T, 'mg_events/BADONE')), '壞資料活動可以刪');
    const acts = (await logsOf(T)).map(l => l.act);
    ok(['新增活動', '修改活動', '提早結束活動', '活動發獎', '刪除活動'].every(a => acts.includes(a)), '活動的操作紀錄：' + [...new Set(acts)].join('、'));
    noErr(T, '活動分頁沒有 JS 錯誤');
  }

  /* ══════════ 💬 回饋 ══════════ */
  await tab(T, 'feedback');
  {
    const st = m => T.textContent(`[data-mon="${m}"]`).then(t => t.replace(/\s+/g, ' '));
    ok((await T.textContent('[data-mon="coo"] [data-r="好玩"]')) === '2' && (await T.textContent('[data-mon="coo"] [data-r="太難"]')) === '1' && (await T.textContent('[data-mon="frog"] [data-r="普通"]')) === '1', '上方統計：咕咕鳥 好玩 2、太難 1；泡泡蛙 普通 1：' + await st('coo'));
    ok((await T.$$eval('[data-fbtable] tbody tr', r => r.length)) === 6, '表格 6 則');
    const heads = await T.$$eval('[data-fbtable] th', h => h.map(x => x.textContent));
    ok(['時間', '學生', '魔物', '評價', '內容'].every(x => heads.includes(x)), '欄位：' + heads.join(','));
    ok(!(await mainText(T)).includes('A1做了事'), '回饋頁沒有混進回報內容');
    await T.selectOption('[data-fmk]', 'frog');
    ok((await T.$$eval('[data-fbtable] tbody tr', r => r.length)) === 2, '篩魔物：泡泡蛙 2 則');
    await T.selectOption('[data-frate]', '好玩');
    ok((await T.$$eval('[data-fbtable] tbody tr', r => r.map(x => x.dataset.fid))).join() === 'fb6', '再篩評價「好玩」：只剩 fb6');
    await T.selectOption('[data-fmk]', ''); await T.selectOption('[data-frate]', '');
    await T.check('[data-funread]');
    ok((await T.$$eval('[data-fbtable] tbody tr', r => r.length)) === 5, '只看未讀：5 則（fb3 已讀不顯示）');
    await T.click('[data-read="fb1"]'); await T.waitForTimeout(300);
    ok((await FS(T, 'mg_nw_flags/fb1')).read === true && (await FS(T, 'mg_nw_flags/fb1')).type === 'feedback' && (await FS(T, 'mg_nw_flags/fb1')).text === '很好玩', '標已讀：寫 read:true，其他欄位不動');
    ok((await T.$$eval('[data-fbtable] tbody tr', r => r.length)) === 4, '標已讀後，未讀清單少一則');
    await T.selectOption('[data-fmk]', 'coo'); await T.click('[data-readall]'); await T.waitForTimeout(400);
    ok((await FS(T, 'mg_nw_flags/fb2')).read === true && !(await FS(T, 'mg_nw_flags/fb4')).read, '「目前列出的全部標已讀」只動篩出來的（咕咕鳥）');
    await tab(T, 'overview');
    ok(await num(T, 'unread') === '3', '總覽：未讀回饋變 3（fb1、fb2 標了已讀，剩 fb4、fb5、fb6）：' + await num(T, 'unread'));
    noErr(T, '回饋分頁沒有 JS 錯誤');
  }

  /* ══════════ 🐛 回報 ══════════ */
  await tab(T, 'bugs');
  const clickSev = async (p, v) => { await p.check(`input[name="sev"][value="${v}"]`); };
  const zone = async (p, z) => { await p.click(`[data-zone="${z}"]`); await p.waitForTimeout(100); };
  {
    const zs = await T.$$eval('[data-zones] button', b => b.map(x => x.textContent));
    ok(zs.join('|') === '待審核（6）|已確認（1）|不採用（0）|重複（0）', '四區與數量：' + zs.join('|'));
    const c6 = (await T.textContent('[data-flag="q6"]')).replace(/\s+/g, ' ');
    ok(c6.includes('點了三下') && c6.includes('畫面黑掉') && c6.includes('做了什麼') && c6.includes('錯誤狀況'), '舊資料（只有 text）也拆成「做了什麼」「錯誤狀況」：' + c6);
    const c1 = (await T.textContent('[data-flag="q1"]')).replace(/\s+/g, ' ');
    ok(c1.includes('A1做了事') && c1.includes('A1壞了') && c1.includes('小明') && c1.includes('503'), '回報卡片：做了什麼、錯誤狀況、學生：' + c1.slice(0, 80));

    /* 確認 q2（嚴重度大），再確認 q1（小）：firstAt 看送出時間不是確認順序 */
    await T.click('[data-confirm="q2"]'); await waitModal(T);
    ok((await modalText(T)).includes('小 15／中 30／大 45'), '確認視窗說明字元照嚴重度（小 15／中 30／大 45）');
    await clickSev(T, 3); await T.fill('[data-reply]', '謝謝，我修好了'); await clickModal(T, 'ok'); await T.waitForTimeout(700);
    let b5 = await FS(T, 'mg_bugboard/' + ID5), q2 = await FS(T, 'mg_nw_flags/q2'), ml = await FS(T, 'mg_mail/bug_q2');
    ok(q2.status === 'approved' && q2.sev === 3 && q2.reply === '謝謝，我修好了', '確認 q2：flag 寫 status／sev／reply');
    ok(b5.score === 3 && b5.n === 1 && b5.firstAt === NOW - 2 * H && b5.reports.length === 1 && b5.reports[0].id === 'q2' && b5.reports[0].st === 'approved' && b5.reports[0].sev === 3 && b5.reports[0].t === NOW - 2 * H && b5.className === C3 && b5.seat === 5, '確認 q2：bugboard 分數 3、n 1、firstAt＝送出時間、reports 一筆：' + JSON.stringify(b5));
    ok(ml && ml.aud.join() === 'id:' + ID5 && ml.items.length === 1 && ml.items[0].type === 'coins' && ml.items[0].n === 45 && ml.src === 'bug' && ml.from === '老師' && ml.body.includes('謝謝，我修好了') && ml.title.length <= 20 && ml.body.length <= 200, '確認 q2：獎勵信 bug_q2（大＝45 字元、帶老師回覆）');
    ok(ml.body.includes('你回報的：') && ml.body.indexOf('你回報的：') < ml.body.indexOf('老師說：'), '獎勵信先引用他回報的內容，再寫老師說的話：' + ml.body.split(String.fromCharCode(10)).join('／'));
    await T.click('[data-confirm="q1"]'); await waitModal(T); await clickModal(T, 'ok'); await T.waitForTimeout(700);
    b5 = await FS(T, 'mg_bugboard/' + ID5);
    ok(b5.score === 4 && b5.n === 2 && b5.firstAt === NOW - 2 * H && b5.reports.length === 2 && (await FS(T, 'mg_nw_flags/q1')).sev === 1, '再確認較早送出的 q1（小）：分數 4、n 2、firstAt 仍是較晚送出那則 q2 的時間（不是確認時間）');
    ok((await FS(T, 'mg_mail/bug_q1')).items[0].n === 15, 'q1（小）寄了 15 字元');
    const lg = (await logsOf(T)).filter(l => l.act === '確認回報');
    ok(lg.length === 2, '確認動作寫操作紀錄');

    /* 重按（畫面沒更新、另一個分頁已經確認過）：不重複加分、不重寄 */
    await T.evaluate(() => { window.__FS['mg_nw_flags/q2'].status = 'pending'; });
    await tab(T, 'bugs');
    await T.click('[data-confirm="q2"]'); await waitModal(T);
    ok((await modalText(T)).includes('已經確認過'), '重按：視窗說明這則已經確認過');
    await clickSev(T, 1); await clickModal(T, 'ok'); await T.waitForTimeout(700);
    b5 = await FS(T, 'mg_bugboard/' + ID5);
    ok(b5.score === 4 && b5.n === 2 && b5.reports.length === 2 && (await keys(T, 'mg_mail/bug_q')).length === 2 && (await FS(T, 'mg_nw_flags/q2')).status === 'approved' && (await FS(T, 'mg_nw_flags/q2')).sev === 3, '重按確認：分數還是 4、reports 還是 2 筆、信還是 2 封、flag 補回已確認（嚴重度不被改）');

    /* 重複 */
    await T.click('[data-confirm="q3"]'); await waitModal(T); await clickSev(T, 2); await clickModal(T, 'ok'); await T.waitForTimeout(700);
    ok((await FS(T, 'mg_bugboard/' + ID6)).score === 2, '小華 q3 確認（中）：2 分');
    await T.click('[data-dup="q4"]'); await waitModal(T);
    const opts = await T.$$eval('[data-dupof] option', o => o.map(x => x.value));
    ok(opts[0] === 'q3' || opts.slice(0, 3).includes('q3'), '重複：可選「跟哪一則一樣」，已確認的排前面：' + opts.join());
    await T.selectOption('[data-dupof]', 'q3'); await clickModal(T, 'ok'); await T.waitForTimeout(700);
    b5 = await FS(T, 'mg_bugboard/' + ID5); const q4 = await FS(T, 'mg_nw_flags/q4'), m4 = await FS(T, 'mg_mail/bug_q4');
    ok(q4.status === 'dup' && q4.dupOf === 'q3' && b5.score === 4 && b5.n === 2 && b5.reports.find(r => r.id === 'q4').st === 'dup' && !('dupOf' in b5.reports.find(r => r.id === 'q4')), '重複 q4：flag.dupOf、不加分（4 分、n 2）、reports 記 st:dup（reports 只留 id／st／sev／t／reply）');
    ok(m4 && m4.items.length === 0 && m4.aud[0] === 'id:' + ID5 && m4.body.includes('謝謝'), '重複：寄 0 字元的感謝信 bug_q4');

    /* 不採用 */
    await T.click('[data-reject="q6"]'); await waitModal(T); await T.fill('[data-reply]', '這是設計成這樣的'); await clickModal(T, 'ok'); await T.waitForTimeout(700);
    const b6 = await FS(T, 'mg_bugboard/' + ID6), q6 = await FS(T, 'mg_nw_flags/q6');
    ok(q6.status === 'rejected' && q6.reply === '這是設計成這樣的' && b6.score === 2 && b6.reports.find(r => r.id === 'q6').st === 'rejected' && b6.reports.find(r => r.id === 'q6').reply === '這是設計成這樣的' && !(await FS(T, 'mg_mail/bug_q6')), '不採用 q6：flag 與 reports 記 rejected＋回覆、不加分、不寄信');

    /* 超過字元上限只寄感謝 */
    await T.click('[data-confirm="q5"]'); await waitModal(T);
    ok((await modalText(T)).includes('只寄感謝'), '第 6 個被確認：視窗說明只寄感謝信');
    await clickSev(T, 2); await clickModal(T, 'ok'); await T.waitForTimeout(700);
    const m5 = await FS(T, 'mg_mail/bug_q5'), b7 = await FS(T, 'mg_bugboard/' + ID7);
    ok(m5 && m5.items.length === 0 && b7.score === 7 && b7.n === 6 && b7.reports.length === 6, `超過 BUG_REWARD_MAX(5) 只寄感謝（沒有字元），分數 5＋2＝7、n 6：` + JSON.stringify(b7.score));

    /* 各區 */
    await zone(T, 'approved');
    ok((await T.$$eval('[data-flag]', f => f.map(x => x.dataset.flag))).sort().join() === 'q1,q2,q3,q5,qa1', '已確認區：q1、q2、q3、q5、qa1');
    ok((await mainText(T)).includes('不收回'), '已確認區寫清楚：撤銷不收回已寄的信');
    await zone(T, 'dup'); ok((await T.$$eval('[data-flag]', f => f.map(x => x.dataset.flag))).join() === 'q4' && (await mainText(T)).includes('跟哪一則一樣'), '重複區：q4');
    await zone(T, 'rejected'); ok((await T.$$eval('[data-flag]', f => f.map(x => x.dataset.flag))).join() === 'q6', '不採用區：q6');

    /* 撤銷確認 */
    await zone(T, 'approved');
    await T.click('[data-undo="q1"]'); await waitModal(T);
    ok((await modalText(T)).includes('已經寄出的信不收回'), '撤銷視窗：已寄出的信不收回');
    await clickModal(T, 'ok'); await T.waitForTimeout(700);
    b5 = await FS(T, 'mg_bugboard/' + ID5); const q1 = await FS(T, 'mg_nw_flags/q1');
    ok(q1.status === 'pending' && !('sev' in q1) && b5.score === 3 && b5.n === 1 && b5.firstAt === NOW - 2 * H && !b5.reports.some(r => r.id === 'q1') && !!(await FS(T, 'mg_mail/bug_q1')), '撤銷 q1：flag 回待審、分數重算成 3、reports 拿掉、信還在（不收回）');
  }

  /* 抓蟲榜、手動加分 */
  {
    const rows = () => T.$$eval('[data-boardtable] tr[data-bid]', r => r.map(x => [x.dataset.bid, x.children[0].textContent.replace(/\s+/g, ''), x.querySelector('[data-score]').textContent.trim()]));
    const rw = await rows();
    ok(rw.map(r => r[0]).join() === [ID7, ID5, ID6].join() && rw.map(r => r[2]).join() === '7,3,2', '榜：阿強 7、小明 3、小華 2（照分數、同分看 firstAt）：' + JSON.stringify(rw));
    const bt = (await T.textContent('[data-boardtable]')).replace(/\s+/g, ' ');
    ok(bt.includes('503・5號 小明') && bt.includes('503・7號 阿強'), '教師榜有姓名（學生榜沒有）');
    await T.click(`[data-detail="${ID5}"]`);
    const dt = (await T.textContent(`[data-detailrow="${ID5}"]`)).replace(/\s+/g, ' ');
    ok(dt.includes('A2做了事') && dt.includes('✓ 確認') && dt.includes('重複') && dt.includes('B1同一個'), '每人的回報明細：' + dt.slice(0, 120));
    await T.click(`[data-detail="${ID5}"]`);

    /* 手動加分：沒理由／零分被擋 */
    await T.click('[data-bonus]'); await waitModal(T);
    await T.fill('[data-q]', '丁同學'); await T.check(`[data-pick="${ID11}"]`);
    await T.fill('[data-pts]', '2'); await clickModal(T, 'ok'); await T.waitForTimeout(150);
    ok((await T.textContent('[data-berr]')).includes('請寫理由') && await modalOpen(T) === 1, '手動加分：沒寫理由 → 擋下，視窗不關');
    await T.fill('[data-why]', '之前就抓到'); await T.fill('[data-pts]', '0'); await clickModal(T, 'ok'); await T.waitForTimeout(150);
    ok((await T.textContent('[data-berr]')).includes('不為 0'), '手動加分：0 分 → 擋下');
    await T.fill('[data-pts]', '2'); await clickModal(T, 'ok'); await T.waitForTimeout(700);
    let b11 = await FS(T, 'mg_bugboard/' + ID11);
    let p11 = await FS(T, 'mg_bugboard_private/' + ID11);
    ok(b11.bonus === 2 && b11.score === 2 && b11.n === 0 && !('notes' in b11) && b11.className === C4 && b11.seat === 11, '手動加分 +2（原本沒有 bugboard）：bonus、score 重算，學生讀得到的 mg_bugboard 沒有 notes：' + JSON.stringify(b11));
    ok(p11.notes.length === 1 && p11.notes[0].pts === 2 && p11.notes[0].why === '之前就抓到' && p11.notes[0].t > 0, '手動加分的理由只存在老師專用的 mg_bugboard_private.notes');
    await T.click(`[data-bonus-for="${ID11}"]`); await waitModal(T);
    ok(await T.isChecked(`[data-pick="${ID11}"]`), '列上的「加分」會預選這位學生');
    await T.fill('[data-pts]', '-1'); await T.fill('[data-why]', '加多了，扣回'); await clickModal(T, 'ok'); await T.waitForTimeout(700);
    b11 = await FS(T, 'mg_bugboard/' + ID11);
    p11 = await FS(T, 'mg_bugboard_private/' + ID11);
    ok(b11.bonus === 1 && b11.score === 1 && p11.notes.length === 2 && p11.notes[1].pts === -1, '手動加分 -1（負分）：bonus 1、score 1、notes 兩筆');
    /* 已有確認回報的人加分：分數＝嚴重度＋加分 */
    await T.click(`[data-bonus-for="${ID5}"]`); await waitModal(T); await T.fill('[data-pts]', '2'); await T.fill('[data-why]', '另外抓過'); await clickModal(T, 'ok'); await T.waitForTimeout(700);
    b5 = await FS(T, 'mg_bugboard/' + ID5);
    ok(b5.score === 5 && b5.bonus === 2 && b5.n === 1 && b5.reports.length === 2, '有回報的人加分：3（嚴重度）＋2＝5，n 不變，reports 不受影響');
    ok((await T.textContent(`[data-bid="${ID11}"]`)).includes('丁同學') && (await rows()).find(r => r[0] === ID11)[2] === '1', '榜上看得到手動加分的人');

    /* 隱藏／恢復暱稱 */
    await T.click(`[data-hide="${ID5}"]`); await waitModal(T); await clickModal(T, 'ok'); await T.waitForTimeout(600);
    ok((await FS(T, 'mg_bugboard/' + ID5)).hideNick === true && (await T.textContent(`[data-bid="${ID5}"]`)).includes('已隱藏') && (await FS(T, 'mg_bugboard/' + ID5)).score === 5, '隱藏暱稱：hideNick true，分數不動');
    await T.click(`[data-hide="${ID5}"]`); await T.waitForTimeout(600);
    ok((await FS(T, 'mg_bugboard/' + ID5)).hideNick === false, '恢復暱稱：hideNick false（不用再確認）');
    await T.click(`[data-hide="${ID5}"]`); await waitModal(T); await clickModal(T, 'ok'); await T.waitForTimeout(600);

    /* 頒發職業除錯師 */
    await T.click(`[data-king="${ID5}"]`); await waitModal(T);
    ok((await modalText(T)).includes('學生會看到這封信') && (await modalText(T)).includes('職業除錯師'), '頒發前預覽信件');
    await clickModal(T, 'ok'); await T.waitForTimeout(600);
    const kg = await FS(T, 'mg_mail/award_bugking_' + ID5);
    ok(kg && kg.items.length === 1 && kg.items[0].type === 'word' && kg.items[0].key === 'bugking' && kg.aud[0] === 'id:' + ID5 && kg.src === 'award', '頒發：寄 word bugking、固定 ID award_bugking_{docId}');
    const nBefore = (await keys(T, 'mg_mail/')).length;
    await T.click(`[data-king="${ID5}"]`); await T.waitForTimeout(500);
    ok(await modalOpen(T) === 0 && (await keys(T, 'mg_mail/')).length === nBefore && (await T.textContent('#toast')).includes('已經頒發過'), '重按頒發：不會多一封，提示已經頒發過');

    const acts = (await logsOf(T)).map(l => l.act);
    ok(['確認回報', '回報標成重複', '不採用回報', '撤銷確認回報', '抓蟲手動加分', '隱藏暱稱', '恢復暱稱', '頒發職業除錯師'].every(a => acts.includes(a)), '回報／抓蟲榜的操作紀錄：' + [...new Set(acts)].join('、'));
    ok(await T.evaluate(() => window.__WRITES.every(w => w.by === 'admin')), '所有寫入都走 admin app');
    noErr(T, '回報分頁沒有 JS 錯誤');
  }

  /* ── 學生端：領信、抓蟲榜更新、稱號 ── */
  {
    const fsAll = await allFS(T);
    const S = await student(browser, fsAll);
    await openMail(S);
    const ids = await mailIds(S);
    ok(['bug_q1', 'bug_q2', 'bug_q4', 'award_bugking_' + ID5, 'ev_RK_1', 'ev_RK_p_' + ID5].every(i => ids.includes(i)) && !ids.includes('ev_RK_2') && !ids.includes('bug_q3') && !ids.includes('ev_RK_p_' + ID6), '學生（小明）收到自己的回報信、獎勵信、發獎信；沒有別人的：' + ids.join());
    const expect = Object.values(fsAll).filter(d => d && Array.isArray(d.aud) && d.aud.includes('id:' + ID5) && d.src !== 'manual').reduce((s, d) => s + (d.items || []).filter(i => i.type === 'coins').reduce((a, i) => a + i.n, 0), 0);
    const c0 = (await nwLocal(S)).coins;
    await S.click('#nw-mail [data-all]'); await S.waitForTimeout(600); await dismissGifts(S);
    const nw = await nwLocal(S);
    ok(expect === 45 + 15 + 50 + 5 && nw.coins === c0 + expect, `領信：字元 +${expect}（回報 45＋15、第 1 名 50、參加獎 5）：${nw.coins - c0}`);
    ok(nw.awards && nw.awards.bugking === 1, '領到「職業除錯師」稱號詞條');
    ok(nw.bugScore === 5 && nw.bugs >= 1, '同步抓蟲分 5（確認 3＋加分 2）：' + nw.bugScore);
    await S.keyboard.press('Escape'); await S.waitForTimeout(200);
    if (await S.$('#nw-mail')) await S.evaluate(() => document.querySelector('#nw-mail').remove());
    await openNotice(S, 'bug');
    const br = await S.$$eval('#nw-notice [data-rbrow]', r => r.map(x => [x.dataset.rbid, x.textContent.replace(/\s+/g, ' ')]));
    ok(br.map(x => x[0]).join() === [ID7, ID5, ID6, ID11].join(), '學生抓蟲榜更新：阿強 7、小明 5、小華 2、丁同學 1：' + br.map(x => x[0]).join());
    const mine = br.find(x => x[0] === ID5)[1];
    ok(mine.includes('神秘獵人') && !mine.includes('閃電咕咕鳥'), '被老師隱藏暱稱的人（自己）在榜上顯示「神秘獵人」：' + mine);
    ok(!(await S.textContent('#nw-notice')).includes('小明') && !(await S.textContent('#nw-notice')).includes('阿強'), '學生榜不顯示真名');
    noErr(S, '學生端沒有 JS 錯誤'); await S.close();
  }

  /* ── 寄獎給前 N 名 → 信箱 ── */
  {
    await tab(T, 'bugs');
    await T.fill('[data-topn]', '2'); await T.click('[data-sendtop]'); await T.waitForSelector('[data-form]'); await T.waitForTimeout(200);
    ok((await T.textContent('#nav [aria-current="page"]')).includes('信箱') && await T.inputValue('[data-title]') === '抓蟲大作戰獎勵', '寄獎給前 N 名：跳到信箱、標題預填');
    const chosen = (await T.textContent('[data-chosen]')).replace(/\s+/g, ' ');
    ok(chosen.includes('阿強') && chosen.includes('小明') && !chosen.includes('小華'), '收件人預填前 2 名（阿強、小明）：' + chosen);
  }

  /* ── 總覽數字（改動後） ── */
  {
    await tab(T, 'overview');
    ok(await num(T, 'pending') === '1', '總覽：待審回報 1（只剩被撤銷的 q1）：' + await num(T, 'pending'));
    ok(await num(T, 'unread') === '3', '總覽：未讀回饋還是 3');
    await T.click('[data-card="pending"]'); await ready(T);
    ok((await T.textContent('#nav [aria-current="page"]')).includes('回報'), '總覽「待審回報」卡片連到回報分頁');
    noErr(T, '總覽沒有 JS 錯誤');
  }
  await T.close();

  /* ── 手機寬度 ── */
  {
    const P = await teacher(browser, seed(), { mobile: true });
    for (const id of ['events', 'feedback', 'bugs']) {
      await tab(P, id);
      const o = await P.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }));
      ok(o.sw <= o.iw, `手機 390 寬：「${id}」沒有橫向捲出頁面（${o.sw}/${o.iw}）`);
    }
    await tab(P, 'events'); await P.click('[data-new]'); await P.waitForSelector('[data-form]');
    let o = await P.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }));
    ok(o.sw <= o.iw, `手機：新增活動表單沒有橫向捲出（${o.sw}/${o.iw}）`);
    await P.check('input[name="etype"][value="hunt"]'); await P.selectOption('[data-tpl]', 'hunt_coo');
    o = await P.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }));
    ok(o.sw <= o.iw, `手機：hunt 表單（含獎勵列）沒有橫向捲出（${o.sw}/${o.iw}）`);
    await P.click('[data-submit]'); await waitModal(P);
    const mw = await P.evaluate(() => { const r = document.querySelector('[data-modal] .px-panel').getBoundingClientRect(); return [r.left >= 0, r.right <= window.innerWidth]; });
    ok(mw[0] && mw[1], '手機：活動預覽視窗在畫面內'); await clickModal(P, 'no');
    await tab(P, 'events');
    await P.click('[data-evtable="ended"] [data-open="RK"]'); await P.click('[data-award-btn="RK"]'); await waitModal(P);
    const aw = await P.evaluate(() => { const r = document.querySelector('[data-modal] .px-panel').getBoundingClientRect(); return [r.left >= 0, r.right <= window.innerWidth, document.documentElement.scrollWidth <= window.innerWidth]; });
    ok(aw.every(Boolean), '手機：發獎視窗在畫面內'); await clickModal(P, 'no');
    await tab(P, 'bugs'); await P.click('[data-confirm="q1"]'); await waitModal(P);
    const cw = await P.evaluate(() => { const r = document.querySelector('[data-modal] .px-panel').getBoundingClientRect(); return [r.left >= 0, r.right <= window.innerWidth]; });
    ok(cw[0] && cw[1], '手機：確認回報視窗在畫面內'); await clickModal(P, 'no');
    noErr(P, '手機：沒有 JS 錯誤'); await P.close();
  }

  await browser.close();
  console.log(fails ? `\n${fails} FAIL` : '\n全部通過'); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
