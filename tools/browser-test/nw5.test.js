/* A 版（教師管理頁規格 §1.4～§1.7）：房間、序號、回報、抓蟲榜同步、換名鎖、伺服器時差
   全程開 window.__RULES：照正式規則擋寫入，確認學生端沒有再碰「只有老師能寫」的地方。 */
const { chromium } = require('playwright'); const fs = require('fs');
const path = require('path'); const M = path.join(__dirname, 'mock') + '/'; const OUT = process.argv[2] || require('os').tmpdir();
const css = require('./tw.js')(OUT);
/* 最新一則改版公告的 id：發新公告時不用回來改測試（「已讀」的種子資料要等於它，不然會跳公告、冒「！」） */
const NOTICE_ID = /export const NOTICES = \[\s*\{ id: '([^']+)'/.exec(fs.readFileSync(path.join(__dirname, '../../nw-data.js'), 'utf8'))[1];
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const ID = '五年級3班_5號';
const gh = async raw => { const { sha256Hex, cleanCode } = await import('../../nw-access.js'); return sha256Hex('gift:' + cleanCode(raw)); };

async function open(browser, o = {}) {
  const p = await browser.newPage({ viewport: { width: 1200, height: 900 } });
  const errs = []; p.on('dialog', d => d.accept());
  p.on('pageerror', e => errs.push('pageerror: ' + e.message));
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push('console: ' + m.text()); });
  const { sha256Hex } = await import('../../nw-access.js');
  const hash = await sha256Hex('Test-Pass_9!x');
  const seed = Object.assign({
    ['mg_scores/' + ID]: { className: '五年級3班', seat: 5, name: '小明', bestLevel: 10, bestScore: 20, scoreVer: 2, plays: 9, tutorialDone: true, talentIntroDone: true, tier: 'B', balanceVer: 3,
      nw: Object.assign({ v: 1, savedAt: 5, look: { style: 1, hair: 2, skin: 1 }, starter: 'dagger', quest: { done: ['1-0', '1-0a'] }, items: { potion: 3 }, intro: { hub: 1 }, seenNotice: NOTICE_ID, name0: '小明' }, o.nw || {}) }
  }, o.seed || {});
  await p.addInitScript(a => {
    window.__FS = a.s; window.__RULES = true; localStorage.clear(); localStorage.setItem('mg_nw_fast', '1');
    window.__NW_CODE_HASH__ = a.hash; localStorage.setItem('mg_nw_code', a.hash); window.__NW_NOINTRO__ = true; window.__NW_NOGIFT__ = true;
    if (a.skew) window.__SERVER_SKEW_MS = a.skew;
    window.confetti = () => {}; window.html2canvas = async () => document.createElement('canvas');
  }, { s: seed, hash, skew: o.skew || 0 });
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
  if (o.name) await p.fill('#in-name', o.name);
  await p.click('#btn-enter'); await p.waitForTimeout(1000);
  p.errs = errs;
  if (o.lobby) return p;
  await p.click('#nw-door'); await p.waitForTimeout(1500);
  return p;
}
const FS = (p, k) => p.evaluate(k => window.__FS[k], k);
const keys = (p, pre) => p.evaluate(pre => Object.keys(window.__FS).filter(k => k.startsWith(pre)), pre);
const nwLocal = p => p.evaluate(() => JSON.parse(localStorage.getItem('mg_nw_五年級3班_5號')));
const noErr = (p, m = '沒有 JS 錯誤') => ok(p.errs.length === 0, m + ' ' + p.errs.join(' | '));

(async () => {
  const { normName } = await import('../../nw-data.js');
  ok(normName(' 王 小　明 ') === '王小明' && normName('ＡＢＣ１２３') === 'abc123' && normName('Ａｂ') === normName('aB'), '姓名比對前：去空白（含全形空白）、全形轉半形、英文不分大小寫');

  const b = await chromium.launch();

  /* ── 房間 ── */
  {
    const p = await open(b, { seed: {
      'mg_rooms/五年級4班_9號': { host: '阿華', cls: '五年級4班', mk: 'coo', rk: 'grass', star: 1, state: 'open', members: ['x'], t: Date.now() },
      'mg_rooms/五年級4班_8號': { host: '舊房間', cls: '五年級4班', mk: 'wolf', rk: 'forest', star: 2, state: 'open', members: ['y'], t: Date.now() - 3600000 },
      'mg_config/nwroom_五年級4班_7號': { host: '舊版位置', cls: '五年級4班', mk: 'coo', rk: 'grass', star: 1, state: 'open', members: ['z'], t: Date.now() }
    } });
    await p.click('.vb[data-bld="board"]'); await p.waitForSelector('#nwbd-board');
    await p.click('[data-tab="rooms"]'); await p.waitForTimeout(700);
    const t = await p.textContent('#nwbd-list');
    ok(t.includes('阿華') && !t.includes('舊房間') && !t.includes('舊版位置'), '房間列表讀 mg_rooms：看得到同學的房間，過期的與舊位置（mg_config）的不顯示');
    await p.click('[data-tab="quests"]'); await p.click('.qs[data-q="grass:frog:1"]'); await p.click('[data-go]'); await p.waitForSelector('[data-view="room"]');
    const room = await FS(p, 'mg_rooms/' + ID);
    ok(room && room.mk === 'frog' && room.state === 'open' && room.host === '小明', '開房間寫在 mg_rooms/{班級_座號}（學生身分，正式規則下寫得進去）');
    ok((await keys(p, 'mg_config/nwroom_')).length === 1, '不再寫 mg_config/nwroom_*（只剩種子裡那筆舊的）');
    await p.click('[data-act="leaveroom"]'); await p.waitForSelector('#nwbd-board'); await p.waitForTimeout(300);
    ok(!(await FS(p, 'mg_rooms/' + ID)), '離開房間：刪掉 mg_rooms 那份');
    noErr(p); await p.close();
  }

  /* ── 序號 ── */
  const redeem = async (p, code) => { if (!(await p.$('[data-code]'))) await p.click('[data-act="gift"]'); await p.waitForSelector('[data-code]'); await p.fill('[data-code]', code); await p.press('[data-code]', 'Enter'); await p.waitForTimeout(500); };
  {
    const h = await gh('ONE-time'), key = h.slice(0, 16);
    const p = await open(b, { seed: { 'mg_config/gift_codes': { codes: { [h]: { reward: { type: 'coins', n: 50 }, max: 2, label: '測試' } } } } });
    await redeem(p, 'ONE-time'); await p.waitForSelector('#nw-gift', { timeout: 4000 });
    ok((await p.textContent('#nw-gift')).includes('字元 ×50'), '序號：第一次領到字元 ×50');
    await p.click('#nw-gift [data-ok]'); await p.waitForTimeout(300);
    const used = await FS(p, `mg_gift_used/${h}_${ID}`);
    ok(used && used.h === h && used.id === ID && typeof used.t === 'number', '領取紀錄 mg_gift_used/{雜湊}_{班級_座號} 存著 h、id、t');
    /* 換一台電腦：本機的 NW.gifts 不見了，雲端那份還在 → 仍然不能再領 */
    await p.evaluate(k => { const n = JSON.parse(localStorage.getItem('mg_nw_五年級3班_5號')); n.gifts = n.gifts.filter(x => x !== k); n.savedAt += 1; localStorage.setItem('mg_nw_五年級3班_5號', JSON.stringify(n)); }, key);
    await p.click('[data-act="leave"]'); await p.waitForTimeout(300); await p.click('#nw-door'); await p.waitForTimeout(1200);
    const coins0 = (await nwLocal(p)).coins;
    await redeem(p, 'ONE-time');
    ok((await p.textContent('body')).includes('已經領過') && (await nwLocal(p)).coins === coins0, '同一個人換電腦再領：被擋下（mg_gift_used 已存在），字元沒有再加');
    noErr(p); await p.close();
  }
  {
    const h = await gh('FULL-1'), h2 = await gh('LEGACY-1');
    const p = await open(b, { seed: {
      'mg_config/gift_codes': { codes: { [h]: { reward: { type: 'coins', n: 50 }, max: 2, label: 'A' }, [h2]: { reward: { type: 'coins', n: 50 }, max: 2, used: 2, label: 'B' } } },
      [`mg_gift_used/${h}_五年級3班_1號`]: { h, id: '五年級3班_1號', t: 1 },
      [`mg_gift_used/${h}_五年級3班_2號`]: { h, id: '五年級3班_2號', t: 2 }
    } });
    await redeem(p, 'FULL-1');
    ok((await p.textContent('body')).includes('領完了') && (await keys(p, 'mg_gift_used/')).length === 2, '次數上限：用 count 數領了 2 份、上限 2 → 說已經被領完了，也沒有再寫紀錄');
    await redeem(p, 'LEGACY-1');
    ok((await p.textContent('body')).includes('領完了'), '舊版 increment 出來的 used 也要算（used 2、上限 2 → 領完了）');
    noErr(p); await p.close();
  }
  {
    const h = await gh('TWO-left');
    const p = await open(b, { seed: {
      'mg_config/gift_codes': { codes: { [h]: { reward: { type: 'coins', n: 50 }, max: 2, label: 'A' } } },
      [`mg_gift_used/${h}_五年級3班_1號`]: { h, id: '五年級3班_1號', t: 1 }
    } });
    await redeem(p, 'TWO-left'); await p.waitForSelector('#nw-gift', { timeout: 4000 });
    ok((await p.textContent('#nw-gift')).includes('字元 ×50'), '還沒領完（1/2）：領得到');
    noErr(p); await p.close();
  }

  /* ── 回報不帶 claimed、學生不讀 flags ── */
  {
    const p = await open(b, { nw: { hunts: 1 } });
    await p.click('[data-act="bug"]'); await p.waitForSelector('[data-send]');
    await p.click('[data-c="畫面"]'); await p.fill('[data-did]', '我按了背包按鈕'); await p.fill('[data-what]', '背包整個黑掉了');
    await p.click('[data-send]'); await p.waitForSelector('#nw-gift', { timeout: 5000 });
    const f = (await keys(p, 'mg_nw_flags/bug_'));
    ok(f.length === 1, '正式規則下回報送得出去（欄位都在白名單裡）');
    const d = await FS(p, f[0]);
    ok(d.status === 'pending' && !('claimed' in d) && d.type === 'bug', '回報 status 是 pending、沒有 claimed 欄位');
    await p.click('#nw-gift [data-ok]'); await p.waitForTimeout(300);
    ok(!(await p.evaluate(() => window.__READS.some(r => r.path.startsWith('mg_nw_flags')))), '學生端從進村到送出回報，沒有讀過 mg_nw_flags');
    noErr(p); await p.close();
  }

  /* ── 抓蟲榜同步：件數取 max(本機, 雲端) ── */
  {
    const p = await open(b, { nw: { bugs: 3, bugsSent: 4 }, seed: { ['mg_bugboard/' + ID]: { n: 1, score: 1, reports: [] } } });
    const n = await nwLocal(p);
    ok(n.bugs === 3 && n.bugScore === 1, '本機 3 件、雲端 1 件：取 3，件數不會變少；抓蟲分取雲端的 1');
    await p.close();
  }
  {
    const p = await open(b, { nw: { bugs: 1 }, seed: { ['mg_bugboard/' + ID]: { n: 5, score: 9, reports: [] } } });
    const n = await nwLocal(p);
    ok(n.bugs === 5 && n.bugScore === 9 && n.words.includes('bughunter') && n.words.includes('bugmaster'), '本機 1 件、雲端 5 件：取 5，除蟲員與蟲蟲剋星詞條解鎖');
    ok((await p.textContent('body')).includes('任務完成'), '同步後補發任務完成通知');
    noErr(p); await p.close();
  }
  {
    const p = await open(b, { nw: { bugs: 2 } });
    ok(await p.evaluate(() => window.__NWG.nw.bugs) === 2, '沒有 mg_bugboard 這份：件數維持本機的 2');
    await p.close();
  }

  /* ── 存檔最外層的 nwCls、nwEvDone ── */
  {
    /* name0 空的會在進村時補上並存檔，順便觸發一次雲端寫入 */
    const p = await open(b, { nw: { evDone: ['ev1|五年級3班'], name0: '' } });
    await p.waitForTimeout(1500);
    const d = await FS(p, 'mg_scores/' + ID);
    ok(d.nwCls === '五年級3班' && Array.isArray(d.nwEvDone) && d.nwEvDone[0] === 'ev1|五年級3班', '雲端存檔最外層有 nwCls（班級）與 nwEvDone（不會被存檔洗掉）');
    await p.close();
  }
  {
    const p = await open(b, { lobby: true });
    const d = await FS(p, 'mg_scores/' + ID);
    ok(d.nwCls === undefined, '還沒進過新世界的人：不寫 nwCls');
    await p.close();
  }

  /* ── 伺服器時差 ── */
  {
    const p = await open(b, { skew: 90 * 60 * 1000 });
    const sk = await p.evaluate(() => window.__NWG.now() - Date.now());
    ok(Math.abs(sk - 90 * 60 * 1000) < 3000, '伺服器比本機快 90 分鐘：now() 補上時差');
    const c = await FS(p, 'mg_clock/' + ID);
    ok(c && Object.keys(c).join() === 't', 'mg_clock/{班級_座號} 只放 t');
    await p.close();
  }
  {
    const p = await open(b, { skew: 0 });
    const sk = await p.evaluate(() => window.__NWG.now() - Date.now());
    ok(Math.abs(sk) < 3000, '時間準的電腦：時差約 0');
    await p.close();
  }
  {
    const p = await open(b, { lobby: true });
    await p.evaluate(() => { window.__FS['mg_clock/x'] = 1; });
    ok(await p.evaluate(() => window.__NWG.now() - Date.now()) === 0, '沒進過新世界（還沒讀時差）：now() 等於本機時間');
    await p.close();
  }

  /* ── 冒名鎖 ── */
  const hash8 = async n => { const { sha256Hex } = await import('../../nw-access.js'); const { normName } = await import('../../nw-data.js'); return (await sha256Hex(normName(n))).slice(0, 8); };
  {
    const p = await open(b, { nw: { name0: '' } });
    const n = await nwLocal(p);
    ok(n.name0 === '小明' && !(await p.evaluate(() => window.__NWG.nameLocked())), '第一次有名字：寫入 nw.name0（以後不覆蓋），沒有鎖');
    ok((await keys(p, 'mg_nw_flags/namechg_')).length === 0, '沒有換名紀錄');
    await p.close();
  }
  {
    const p = await open(b, { name: '小 明　' });
    ok(!(await p.evaluate(() => window.__NWG.nameLocked())) && (await keys(p, 'mg_nw_flags/namechg_')).length === 0, '名字多了空白：不算換名');
    await p.close();
  }
  {
    const p = await open(b, { name: '小華' });
    ok(await p.evaluate(() => window.__NWG.nameLocked()), '名字跟 name0 不一樣：鎖住（nameLocked() 是 true）');
    ok(await p.isVisible('#nw-root'), '照舊讓他玩，不會進不去');
    const h = await hash8('小華'), f = await FS(p, `mg_nw_flags/namechg_${ID}_${h}`);
    ok(f && f.type === 'namechg' && f.status === 'pending' && f.name === '小華' && f.oldName === '小明' && f.docId === ID, '寫一筆 namechg_{班級_座號}_{新名字雜湊前 8 碼}：type、name、oldName（基準）');
    ok((await nwLocal(p)).name0 === '小明', 'name0 沒被新名字蓋掉（冒名的人第二次登入不會自己解鎖）');
    /* 再用同一個新名字登入：不再多寫、仍然鎖著 */
    await p.click('[data-act="leave"]'); await p.waitForTimeout(300);
    await p.click('#btn-relogin'); await p.waitForTimeout(400);
    await p.selectOption('#in-grade', '五年級'); await p.selectOption('#in-class', '3班'); await p.fill('#in-seat', '5'); await p.waitForTimeout(700); await p.fill('#in-name', '小華'); await p.click('#btn-enter'); await p.waitForTimeout(900);
    await p.click('#nw-door'); await p.waitForTimeout(1300);
    ok(await p.evaluate(() => window.__NWG.nameLocked()) && (await keys(p, 'mg_nw_flags/namechg_')).length === 1, '第二次還用「小華」：仍然鎖著，同一個新名字只有一筆紀錄');
    /* 換成另一個新名字：多一筆 */
    await p.click('[data-act="leave"]'); await p.waitForTimeout(300);
    await p.click('#btn-relogin'); await p.waitForTimeout(400);
    await p.selectOption('#in-grade', '五年級'); await p.selectOption('#in-class', '3班'); await p.fill('#in-seat', '5'); await p.waitForTimeout(700); await p.fill('#in-name', '小美'); await p.click('#btn-enter'); await p.waitForTimeout(900);
    await p.click('#nw-door'); await p.waitForTimeout(1300);
    ok((await keys(p, 'mg_nw_flags/namechg_')).length === 2, '換成別的新名字：多一筆');
    /* 改回原名：自動解鎖 */
    await p.click('[data-act="leave"]'); await p.waitForTimeout(300);
    await p.click('#btn-relogin'); await p.waitForTimeout(400);
    await p.selectOption('#in-grade', '五年級'); await p.selectOption('#in-class', '3班'); await p.fill('#in-seat', '5'); await p.waitForTimeout(700); await p.fill('#in-name', '小明'); await p.click('#btn-enter'); await p.waitForTimeout(900);
    await p.click('#nw-door'); await p.waitForTimeout(1300);
    ok(!(await p.evaluate(() => window.__NWG.nameLocked())), '名字改回基準「小明」：自動解鎖');
    noErr(p); await p.close();
  }
  {
    /* mg_bugboard 所有學生都讀得到，所以老師核可的名字只存雜湊 nameOkH（正規化後的名字），學生端拿自己輸入的名字算雜湊比對 */
    const { sha256Hex } = await import('../../nw-access.js'), hH = await sha256Hex('小華');
    const p = await open(b, { name: '小華', seed: { ['mg_bugboard/' + ID]: { nameOkH: hH, n: 0, score: 0, reports: [] } } });
    ok(!(await p.evaluate(() => window.__NWG.nameLocked())) && (await keys(p, 'mg_nw_flags/namechg_')).length === 0, '老師按了「沒問題」（nameOkH＝小華的雜湊）：小華就是新基準，不鎖也不再記錄');
    await p.close();
    const p2 = await open(b, { name: '小明', seed: { ['mg_bugboard/' + ID]: { nameOkH: hH, n: 0, score: 0, reports: [] } } });
    ok(await p2.evaluate(() => window.__NWG.nameLocked()), '基準優先用老師寫的 nameOkH：核可的是小華時，用「小明」登入反而被鎖');
    await p2.close();
    const p3 = await open(b, { name: '小 華', seed: { ['mg_bugboard/' + ID]: { nameOkH: hH, n: 0, score: 0, reports: [] } } });
    ok(!(await p3.evaluate(() => window.__NWG.nameLocked())), 'nameOkH 比對前先統一寫法：中間多一個空白的「小 華」不算換名');
    await p3.close();
  }
  {
    const p = await open(b, { name: 'ＡＢ', nw: { name0: 'ab' } });
    ok(!(await p.evaluate(() => window.__NWG.nameLocked())), '全形半形、大小寫不同：不算換名');
    await p.close();
  }

  await b.close(); process.exit(fails ? 1 : 0);
})();
