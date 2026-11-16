/* 舊控制台的老師登入（教師管理頁規格 §1.4）：具名 app 'admin'、登入小視窗、記住這台電腦、
   開戰／設定／序號／清空成績都走 admin 身分。window.__RULES 開著：沒登入就寫會被擋。 */
const { chromium } = require('playwright'); const fs = require('fs');
const path = require('path'); const M = path.join(__dirname, 'mock') + '/'; const OUT = process.argv[2] || require('os').tmpdir();
const css = require('./tw.js')(OUT);
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };

async function open(browser, o = {}) {
  const ctx = o.ctx || await browser.newContext({ viewport: { width: 1200, height: 900 } });
  const p = await ctx.newPage();
  const errs = []; p.on('dialog', d => d.accept());
  p.on('pageerror', e => errs.push('pageerror: ' + e.message));
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|permission|Missing or insufficient/.test(m.text())) errs.push('console: ' + m.text()); });
  const seed = Object.assign({
    'mg_admins/T1': { ok: true },
    '__gift': null,
    'mg_scores/五年級3班_1號': { className: '五年級3班', seat: 1, name: '甲', bestLevel: 3 },
    'mg_scores/五年級3班_2號': { className: '五年級3班', seat: 2, name: '乙', bestLevel: 3 }
  }, o.seed || {});
  delete seed.__gift;
  await p.addInitScript(a => {
    if (!a.keep) { window.__FS = a.s; localStorage.clear(); }
    window.__RULES = true; window.confetti = () => {}; window.html2canvas = async () => document.createElement('canvas');
    if (a.pre) window.__ADMIN_PRESIGNED = { uid: 'T1', email: 'teacher@example.test' };
    if (a.other) window.__MOCK_ADMIN = { email: 'other@example.test', password: 'pw-x', uid: 'X1' };
  }, { s: seed, pre: o.pre, other: o.other, keep: o.keep });
  await p.route('**/*', r => {
    const u = r.request().url();
    if (u.startsWith('http://localhost')) return r.continue();
    if (u.includes('cdn.tailwindcss.com')) return r.fulfill({ contentType: 'application/javascript', body: `const s=document.createElement('style');s.textContent=${JSON.stringify(css)};document.head.appendChild(s);` });
    const m = u.includes('firebase-app') ? 'app.js' : u.includes('firebase-auth') ? 'auth.js' : u.includes('firebase-firestore') ? 'fs.js' : null;
    if (m) return r.fulfill({ contentType: 'application/javascript', body: fs.readFileSync(M + m, 'utf8') });
    return r.abort();
  });
  await p.goto('http://localhost:8765/index.html'); await p.waitForFunction(() => window.__NWG, null, { timeout: 15000 }); await p.waitForTimeout(500);
  p.errs = errs; p.ctx = ctx;
  return p;
}
const gate = async p => { await p.click('#btn-teacher'); await p.fill('#auth-pw', 'teacher'); await p.click('#auth-ok'); await p.waitForTimeout(500); };
const login = async (p, email, pw, remember) => {
  await p.fill('#al-email', email); await p.fill('#al-pw', pw);
  if (remember) await p.check('#al-remember');
  await p.click('#al-ok'); await p.waitForTimeout(600);
};
const lastW = (p, path) => p.evaluate(path => window.__WRITES.filter(w => w.path === path).pop(), path);

(async () => {
  const b = await chromium.launch();
  {
    const p = await open(b);
    await p.click('#btn-teacher'); await p.fill('#auth-pw', 'wrong'); await p.click('#auth-ok'); await p.waitForTimeout(300);
    ok(await p.isHidden('#admin-login-modal') && await p.isHidden('#teacher-modal'), '「teacher」那道門還在：密碼錯誤不會跳登入，也進不去');
    await p.fill('#auth-pw', 'teacher'); await p.click('#auth-ok'); await p.waitForTimeout(500);
    ok(await p.isVisible('#admin-login-modal') && await p.isHidden('#teacher-modal'), '過了門：沒登入老師帳號，先跳 email／密碼登入小視窗');
    await p.click('#al-ok');
    ok((await p.textContent('#al-err')).includes('請輸入'), '沒填就按登入：提醒要填');
    await login(p, 'teacher@example.test', 'bad');
    ok((await p.textContent('#al-err')).includes('email 或密碼不對') && await p.isVisible('#admin-login-modal'), '密碼錯：說 email 或密碼不對，視窗還在');
    await p.evaluate(() => { window.__MOCK_ADMIN = { email: 'other@example.test', password: 'pw-x', uid: 'X1' }; });
    await login(p, 'other@example.test', 'pw-x');
    ok((await p.textContent('#al-err')).includes('不是老師帳號') && await p.isVisible('#admin-login-modal') && !(await p.evaluate(() => window.__AUTHS_ADMIN())), '登入成功但沒有 mg_admins 文件：說不是老師帳號，並且登出');
    await p.evaluate(() => { window.__MOCK_ADMIN = { email: 'teacher@example.test', password: 'pw-ok', uid: 'T1' }; });
    await login(p, 'teacher@example.test', 'pw-ok');
    ok(await p.isHidden('#admin-login-modal') && await p.isVisible('#teacher-modal'), '老師帳號登入成功：登入視窗關掉、控制台打開');
    ok(await p.evaluate(() => window.__LAST_PERSISTENCE) === 'SESSION', '沒勾「記住這台電腦」：用 browserSessionPersistence（關分頁就登出）');
    ok(!(await p.evaluate(() => window.__AUTHS_ADMIN().isAnonymous)) && await p.evaluate(() => window.__AUTHS_ADMIN().uid) === 'T1', '登入的是 admin app（跟學生的匿名登入分開）');

    /* 開戰 */
    await p.click('#tc-start'); await p.waitForTimeout(400);
    const r = await p.evaluate(() => window.__FS['mg_round/current']), w = await lastW(p, 'mg_round/current');
    ok(r && r.state === 'running' && w.by === 'admin', '開戰：寫 mg_round/current，用 admin 身分');
    await p.click('#tc-stop'); await p.waitForTimeout(300);
    ok((await p.evaluate(() => window.__FS['mg_round/current'].state)) === 'ended' && (await lastW(p, 'mg_round/current')).by === 'admin', '結束比賽：admin 身分');
    await p.click('#tc-reset-round'); await p.waitForTimeout(300);
    ok((await p.evaluate(() => window.__FS['mg_round/current'].state)) === 'lobby', '回到營地：admin 身分');
    /* 設定 */
    await p.fill('#tc-ranklimit', '7'); await p.click('#tc-save-cfg'); await p.waitForTimeout(400);
    ok((await p.evaluate(() => window.__FS['mg_config/settings'].rankLimit)) === 7 && (await lastW(p, 'mg_config/settings')).by === 'admin', '儲存設定：mg_config/settings，admin 身分');
    /* 序號 */
    await p.fill('#tg-code', 'HELLO-1'); await p.fill('#tg-max', '3'); await p.fill('#tg-note', '五年級'); await p.click('#tg-add'); await p.waitForTimeout(600);
    const gc = await p.evaluate(() => window.__FS['mg_config/gift_codes']);
    const h = Object.keys(gc.codes)[0], e = gc.codes[h];
    ok(e && e.max === 3 && !('used' in e) && (await lastW(p, 'mg_config/gift_codes')).by === 'admin', '新增序號：admin 身分，不再寫 used 欄位');
    ok((await p.textContent('#tg-list')).includes('已領 0 / 3'), '序號列表：用掉 0 次');
    await p.evaluate(h => { window.__FS['mg_gift_used/' + h + '_五年級3班_1號'] = { h, id: '五年級3班_1號', t: 1 }; window.__FS['mg_gift_used/' + h + '_五年級3班_2號'] = { h, id: '五年級3班_2號', t: 2 }; }, h);
    await p.click('#tc-close'); await p.click('#btn-teacher'); await p.fill('#auth-pw', 'teacher'); await p.click('#auth-ok'); await p.waitForTimeout(600);
    ok((await p.textContent('#tg-list')).includes('已領 2 / 3'), '序號列表的「用掉幾次」改用 count 數 mg_gift_used（兩份 → 已領 2）');
    await p.evaluate(h => { const c = window.__FS['mg_config/gift_codes']; c.codes[h].used = 1; }, h);
    await p.click('#tc-close'); await p.click('#btn-teacher'); await p.fill('#auth-pw', 'teacher'); await p.click('#auth-ok'); await p.waitForTimeout(600);
    ok((await p.textContent('#tg-list')).includes('已領 3 / 3'), '舊版留下的 used 也加進去（1 + 2 → 已領 3）');
    await p.click(`[data-del="${h}"]`); await p.waitForTimeout(400);
    ok(!(await p.evaluate(h => (window.__FS['mg_config/gift_codes'].codes || {})[h], h)) && (await lastW(p, 'mg_config/gift_codes')).by === 'admin', '刪除序號：admin 身分');
    /* 回饋連結 */
    ok(await p.getAttribute('#tc-nwfb', 'href') === 'teacher.html' && (await p.textContent('#tc-nwfb')).includes('管理頁'), '舊的「新世界測試回饋」換成連到管理頁的按鈕');
    /* 清空成績 */
    await p.click('.tc-tab[data-tab="scores"]'); await p.waitForTimeout(500);
    await p.click('#sc-clear'); await p.waitForTimeout(700);
    ok((await p.evaluate(() => Object.keys(window.__FS).filter(k => k.startsWith('mg_scores/')).length)) === 0 && (await p.evaluate(() => window.__WRITES.filter(w => w.op === 'delete' && w.path.startsWith('mg_scores/')).every(w => w.by === 'admin'))), '清空成績：mg_scores 刪光了，刪除都是 admin 身分');
    ok(p.errs.length === 0, '沒有 JS 錯誤 ' + p.errs.join(' | '));
    await p.ctx.close();
  }
  {
    const p = await open(b);
    await gate(p);
    await login(p, 'teacher@example.test', 'pw-ok', true);
    ok(await p.evaluate(() => window.__LAST_PERSISTENCE) === 'LOCAL', '勾「記住這台電腦」：用 browserLocalPersistence');
    const ctx = p.ctx; await p.close();
    const q = await open(b, { ctx, keep: true });
    await gate(q);
    ok(await q.isHidden('#admin-login-modal') && await q.isVisible('#teacher-modal'), '重開分頁：記得登入，不用再打 email');
    await ctx.close();
  }
  {
    const p = await open(b, { pre: true });
    await gate(p);
    ok(await p.isHidden('#admin-login-modal') && await p.isVisible('#teacher-modal'), '已經登入過：直接開控制台，不跳登入');
    await p.ctx.close();
  }
  {
    const p = await open(b);
    await gate(p);
    await p.click('#al-cancel'); await p.waitForTimeout(400);
    ok(await p.isHidden('#admin-login-modal') && await p.isVisible('#teacher-modal'), '取消登入：控制台照樣打開（只看不寫）');
    await p.click('#tc-start'); await p.waitForTimeout(400);
    ok(await p.isVisible('#admin-login-modal') && !(await p.evaluate(() => window.__FS['mg_round/current'])), '沒登入就按開始：再跳登入視窗，沒有寫入');
    await p.click('#al-cancel'); await p.waitForTimeout(300);
    ok(!(await p.evaluate(() => window.__FS['mg_round/current'])), '再取消：還是沒寫入');
    ok(p.errs.length === 0, '沒有 JS 錯誤 ' + p.errs.join(' | '));
    await p.ctx.close();
  }
  await b.close(); process.exit(fails ? 1 : 0);
})();
