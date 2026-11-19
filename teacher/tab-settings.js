/* ⚙ 設定（SPEC §2.2、§1.8 第 4 步）：一次搬移、班級人數覆寫、操作紀錄、回遊戲。
   新世界開放方式、通關密語、序號禮物第一版還留在舊控制台（避免同一個設定兩個地方能改）。

   班級人數：存在 mg_config/class_sizes = { sizes: { '五年級4班': 27, … }, t }。
   學生端 nw-events.js 算班級挑戰的分母時，順序是「活動自己的 clsSize > 這份 > 進過新世界的人數」。
   學生對 mg_config 只能讀，規則不用改。 */
import { db, doc, setDoc, collection, getDocs, query, orderBy, limit, commitAll } from './fb.js';
import { loadScores, loadFlags, loadClassSizes, invalidate } from './data.js';
import { clsShort } from './nw.js';
import { planMigration } from './migrate.js';
import { $, esc, fmtT, log, ask, toast, errText, helpBox } from './util.js';

export default async function mount(el) {
  const scores = await loadScores(true);
  let sizes = {};
  try { sizes = await loadClassSizes(); } catch (e) { console.warn('讀班級人數失敗', e); }

  el.innerHTML = `<h2>⚙ 設定</h2>
    ${helpBox(['「匯入舊回報」只有新版剛上線的那一天要按一次，把以前確認過的回報算進抓蟲榜。按「先看會做什麼」可以先預覽，不會寫入任何東西。', '「班級人數」是算班級挑戰「全班達標率」用的，沒填就用進過新世界的人數。', '最下面的「操作紀錄」是你在這個管理頁做過的每一件事，寄信、發獎、改公告都會留下一筆。'])}
    <h3>匯入舊回報（上線時只做一次）</h3>
    <div class="px-panel in" data-mig>
      <p style="margin:0 0 6px">上線那天按一次。把以前確認過的回報，匯入抓蟲榜與學生信箱。用<b>全部已確認</b>的回報（學生已經領過的也算）建抓蟲榜的分數與「我的回報」，沒有嚴重度的算 1 分；
        只有「已確認、學生還沒領」的才轉成獎勵信。<b>重按不會多寄、分數不會重複加</b>。</p>
      <div class="row"><button class="px-btn" data-mig-plan>先看會做什麼</button><button class="px-btn gold" data-mig-run>執行匯入</button></div>
      <div data-mig-out style="margin-top:8px"></div></div>
    <h3>班級人數</h3>
    <div class="px-panel in" data-sizes>
      <p style="margin:0 0 6px">班級挑戰的「全班達標率」分母。空白＝自動算（進過新世界的人數）。想用全班人數就在這裡填；這裡填的所有活動都會用。</p>
      <div data-size-body></div>
      <div class="row" style="margin-top:8px"><button class="px-btn gold" data-size-save>儲存班級人數</button></div></div>
    <h3>名字與榜單</h3>
    <div class="px-panel in" data-namenote>
      <p style="margin:0 0 6px"><b>榜單顯示的是學生登入時填的名字</b>，不是另外取的暱稱。抓蟲榜與活動榜是全校都看得到的，名字可能是真名，建議請學生填想讓大家看到的暱稱。</p>
      <p style="margin:0 0 6px">名字第一次登入後就固定，之後再用別的名字登入只會被記錄、不會改掉。學生要改名字，用「改名卡」（在「✉ 信箱」寄給他）。</p>
      <p style="margin:0">名字不適合：到「👥 學生」按「隱藏暱稱」，榜上就顯示「神秘獵人」。學生本人用別的名字登入並在新世界被鎖時，確認沒問題按「名字沒問題」，那個名字就變成新名字。</p></div>
    <h3>其他設定</h3>
    <p class="dim" style="margin:0 0 6px">新世界開放方式、通關密語、序號禮物還在舊控制台（遊戲首頁的教師控制台）。</p>
    <p><a class="px-btn" href="index.html" style="text-decoration:none">← 回遊戲</a></p>
    <h3>操作紀錄（最近 100 筆）</h3>
    <div class="tscroll" style="max-height:50vh" data-log><p class="dim" style="padding:8px">讀取中…</p></div>`;

  /* ── 一次搬移 ── */
  const migOut = $('[data-mig-out]', el);
  async function plan() {
    const [flags, mailSnap, boardSnap] = await Promise.all([loadFlags(true), getDocs(collection(db, 'mg_mail')), getDocs(collection(db, 'mg_bugboard'))]);
    const mailIds = new Set(), board = {};
    mailSnap.forEach(d => mailIds.add(d.id)); boardSnap.forEach(d => { board[d.id] = d.data() || {}; });
    return planMigration(flags, board, mailIds, Date.now());
  }
  const statText = s => `已確認回報 ${s.bugs} 個、${s.students} 位學生（抓蟲分合計 ${s.score}）。要寄的信：字元 ${s.mailCoins} 封、感謝 ${s.mailThanks} 封、職業除錯師 ${s.mailAward} 封`
    + `${s.skipped ? `（${s.skipped} 封之前搬移時已經寄過，不重寄）` : ''}。`;
  $('[data-mig-plan]', el).addEventListener('click', async () => {
    migOut.innerHTML = '<span class="dim">計算中…</span>';
    try {
      const p = await plan();
      migOut.innerHTML = `<div class="note" data-mig-stat>${esc(statText(p.stats))}<br><span class="dim">這只是預覽，還沒有寫入任何東西。</span></div>`;
    } catch (e) { migOut.innerHTML = `<div class="note bad">讀取失敗：${esc(errText(e))}</div>`; }
  });
  let running = false;
  $('[data-mig-run]', el).addEventListener('click', async () => {
    if (running) return;
    running = true;
    try {
      const p = await plan();
      if (!await ask('匯入舊回報？', `<p>${esc(statText(p.stats))}</p><p class="dim">會更新抓蟲榜的分數（保留隱藏暱稱、名字沒問題、手動加分）。可以重按。</p>`, '執行')) return;
      migOut.innerHTML = '<span class="dim">寫入中…</span>';
      /* 先算好再整份寫：每個人的分數是從 flags 重算的，不是在舊分數上累加 */
      const ops = [];
      p.boards.forEach(b => ops.push(batch => batch.set(doc(db, 'mg_bugboard', b.id), b.data, { merge: true })));
      p.mails.forEach(m => ops.push(batch => batch.set(doc(db, 'mg_mail', m.id), m.data)));
      await commitAll(ops);
      await log('匯入舊回報', '舊回報→抓蟲榜與信箱', statText(p.stats));
      invalidate('board', 'mails');
      migOut.innerHTML = `<div class="note" data-mig-done><b>匯入完成。</b>${esc(statText(p.stats))}</div>`;
      toast('匯入完成');
      paintLog();
    } catch (e) { migOut.innerHTML = `<div class="note bad">匯入失敗：${esc(errText(e))}（已經寫進去的部分不會重複，可以直接再按一次）</div>`; }
    finally { running = false; }
  });

  /* ── 班級人數 ── */
  const auto = {};
  scores.forEach(s => { if (s.played && s.nwCls) auto[s.nwCls] = (auto[s.nwCls] || 0) + 1; });
  const cls = [...new Set([...scores.map(s => s.className), ...Object.keys(sizes)].filter(Boolean))].sort((a, b) => clsShort(a) < clsShort(b) ? -1 : 1);
  $('[data-size-body]', el).innerHTML = cls.length ? `<div class="tscroll"><table class="tbl"><thead><tr><th>班級</th><th>全班人數（空白＝自動）</th><th>自動算的</th></tr></thead><tbody>${cls.map(c => `<tr>
    <td>${esc(clsShort(c))}（${esc(c)}）</td><td><input class="inp" type="number" min="1" max="99" step="1" data-size="${esc(c)}" value="${sizes[c] > 0 ? +sizes[c] : ''}" style="width:90px"></td><td>${auto[c] || 0} 人</td></tr>`).join('')}</tbody></table></div>`
    : '<span class="dim">還沒有學生存檔</span>';
  $('[data-size-save]', el).addEventListener('click', async () => {
    const out = {};
    for (const i of el.querySelectorAll('[data-size]')) {
      const v = i.value.trim(); if (v === '') continue;
      const n = Number(v);
      if (!Number.isInteger(n) || n < 1 || n > 99) { toast(`「${clsShort(i.dataset.size)}」的人數要是 1～99 的整數`, true); return; }
      out[i.dataset.size] = n;
    }
    try { await setDoc(doc(db, 'mg_config', 'class_sizes'), { sizes: out, t: Date.now() }); } catch (e) { toast('儲存失敗：' + errText(e), true); return; }
    sizes = out;
    await log('改班級人數', 'mg_config/class_sizes', Object.keys(out).length ? Object.keys(out).map(c => `${clsShort(c)}＝${out[c]}`).join('、') : '全部改回自動算');
    toast('已儲存'); paintLog();
  });

  /* ── 操作紀錄 ── */
  async function paintLog() {
    const box = $('[data-log]', el);
    try {
      const snap = await getDocs(query(collection(db, 'mg_admin_log'), orderBy('t', 'desc'), limit(100))), rows = [];
      snap.forEach(d => rows.push(d.data() || {}));
      box.innerHTML = `<table class="tbl" data-logtable><thead><tr><th>時間</th><th>動作</th><th>對象</th><th>內容</th></tr></thead><tbody>${rows.map(r => `<tr><td>${esc(fmtT(r.t))}</td><td>${esc(r.act)}</td><td class="wrap">${esc(r.target)}</td><td class="wrap">${esc(r.summary)}</td></tr>`).join('') || '<tr><td colspan="4" class="dim">還沒有紀錄。你在管理頁寄信、發獎、改公告，都會記在這裡。</td></tr>'}</tbody></table>`;
    } catch (e) { box.innerHTML = `<div class="note bad">讀不到操作紀錄：${esc(errText(e))}</div>`; }
  }
  paintLog();
}
