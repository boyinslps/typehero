/* 👥 學生（SPEC §2.3）：整份 mg_scores 的表格（可篩選、排序、勾選）＋學生卡。
   這一頁不直接改存檔：給東西一律寄信。唯一的寫入是 mg_bugboard（隱藏暱稱、名字沒問題）。 */
import { db, doc, setDoc, writeBatch } from './fb.js';
import { loadScores, loadBoard, loadFlags, loadMails, invalidate, nameChanged, nameBase, byClsSeat } from './data.js';
import { clsShort, MONSTERS, REGIONS, ITEM_DEFS, MAIN_QUESTS, currentQuest, wordById } from './nw.js';
import { MATS } from './gifts.js';
import { $, esc, fmtT, log, modal, toast, errText, ask } from './util.js';

const COLS = [
  ['cls', '班級'], ['seat', '座號'], ['name', '姓名'], ['nick', '暱稱'], ['hr', 'HR'], ['coins', '字元'], ['weapon', '武器'],
  ['hunts', '場次'], ['wins', '勝／敗'], ['last', '最後上線'], ['rep', '回報（確認／送出）']
];
const gradeOf = c => { const m = /^(.+?年級)/.exec(c || ''); return m ? m[1] : ''; };
const label = s => `${clsShort(s.className)}・${s.seat}號${s.name ? ' ' + s.name : ''}`;

export default async function mount(el, ctx, params) {
  let scores = await loadScores(true), board = await loadBoard(true);
  const sel = new Set(), f = { grade: '', cls: '', played: !!params.played, kw: '', warn: !!params.warn };
  let sort = { key: 'cls', dir: 1 };

  const bd = s => board[s.id] || {};
  const sortVal = {
    cls: s => clsShort(s.className), seat: s => s.seat, name: s => s.name, nick: s => s.nick, hr: s => s.hr, coins: s => s.coins,
    weapon: s => s.weapon, hunts: s => s.hunts, wins: s => s.wins, last: s => s.last, rep: s => +bd(s).n || 0
  };
  const shown = () => {
    const kw = f.kw.trim().toLowerCase();
    const list = scores.filter(s => (!f.grade || gradeOf(s.className) === f.grade) && (!f.cls || s.className === f.cls) && (!f.played || s.played)
      && (!f.warn || nameChanged(s, bd(s))) && (!kw || `${s.name} ${s.nick} ${s.seat} ${clsShort(s.className)} ${s.className}`.toLowerCase().includes(kw)));
    const g = sortVal[sort.key];
    return list.sort((a, b) => { const x = g(a), y = g(b); return (x < y ? -1 : x > y ? 1 : 0) * sort.dir || byClsSeat(a, b); });
  };

  const grades = () => [...new Set(scores.map(s => gradeOf(s.className)).filter(Boolean))].sort();
  const classes = () => [...new Set(scores.filter(s => !f.grade || gradeOf(s.className) === f.grade).map(s => s.className))].sort((a, b) => clsShort(a) < clsShort(b) ? -1 : 1);

  function paint() {
    const list = shown();
    el.innerHTML = `<h2>👥 學生</h2>
      <div class="row" style="margin-bottom:8px">
        <select class="inp" data-f="grade"><option value="">全部年級</option>${grades().map(g => `<option ${f.grade === g ? 'selected' : ''}>${esc(g)}</option>`).join('')}</select>
        <select class="inp" data-f="cls"><option value="">全部班級</option>${classes().map(c => `<option value="${esc(c)}" ${f.cls === c ? 'selected' : ''}>${esc(clsShort(c))}（${esc(c)}）</option>`).join('')}</select>
        <input class="inp" data-f="kw" placeholder="姓名／暱稱／座號" value="${esc(f.kw)}" style="width:150px">
        <label class="chk"><input type="checkbox" data-f="played" ${f.played ? 'checked' : ''}> 玩過新世界</label>
        <label class="chk"><input type="checkbox" data-f="warn" ${f.warn ? 'checked' : ''}> ⚠ 換過名字</label>
        <span class="dim" data-count>${list.length} / ${scores.length} 人</span>
        <button class="px-btn gold sm" data-mailsel ${sel.size ? '' : 'disabled'} style="margin-left:auto">✉ 寄信給勾選的 ${sel.size} 人</button>
      </div>
      <div class="tscroll" style="max-height:70vh"><table class="tbl" data-table><thead><tr>
        <th><input type="checkbox" data-all aria-label="全選目前列出的人"></th>
        ${COLS.map(([k, t]) => `<th data-sort="${k}">${t}${sort.key === k ? (sort.dir > 0 ? ' ▲' : ' ▼') : ''}</th>`).join('')}</tr></thead>
        <tbody>${list.map(row).join('') || `<tr><td colspan="${COLS.length + 1}" class="dim">沒有符合的學生</td></tr>`}</tbody></table></div>`;
    const all = $('[data-all]', el); if (all) all.checked = list.length > 0 && list.every(s => sel.has(s.id));
  }
  function row(s) {
    const b = bd(s), warn = nameChanged(s, b);
    return `<tr class="clk" data-id="${esc(s.id)}"><td><input type="checkbox" data-sel="${esc(s.id)}" ${sel.has(s.id) ? 'checked' : ''}></td>
      <td>${esc(clsShort(s.className))}</td><td>${s.seat}</td>
      <td>${esc(s.name)}${warn ? ' <span class="chip warn" title="名字跟上次不一樣">⚠ 換過名字</span>' : ''}</td>
      <td>${s.played ? esc(s.nick || '（還沒取）') : '<span class="dim">—</span>'}${b.hideNick ? ' <span class="chip warn">已隱藏</span>' : ''}</td>
      <td>${s.played ? s.hr : '—'}</td><td>${s.played ? s.coins : '—'}</td><td>${esc(s.weapon || '—')}</td><td>${s.played ? s.hunts : '—'}</td>
      <td>${s.played ? `${s.wins}／${s.fails}` : '—'}</td><td>${esc(fmtT(s.last))}</td>
      <td>${(+b.n || 0)}／${s.sent}${b.score ? ` <span class="dim">（${b.score} 分）</span>` : ''}</td></tr>`;
  }

  el.addEventListener('input', e => {
    const k = e.target.dataset.f;
    if (k === 'kw') { f.kw = e.target.value; const pos = e.target.selectionStart; paint(); const i = $('[data-f="kw"]', el); i.focus(); i.setSelectionRange(pos, pos); }
  });
  el.addEventListener('change', e => {
    const t = e.target, k = t.dataset.f;
    if (k) { f[k] = t.type === 'checkbox' ? t.checked : t.value; if (k === 'grade') f.cls = ''; paint(); return; }
    if (t.dataset.sel) { t.checked ? sel.add(t.dataset.sel) : sel.delete(t.dataset.sel); paint(); return; }
    if (t.matches('[data-all]')) { shown().forEach(s => t.checked ? sel.add(s.id) : sel.delete(s.id)); paint(); }
  });
  el.addEventListener('click', e => {
    const th = e.target.closest('[data-sort]');
    if (th) { sort = { key: th.dataset.sort, dir: sort.key === th.dataset.sort ? -sort.dir : 1 }; paint(); return; }
    if (e.target.closest('[data-mailsel]')) { ctx.go('mail', { aud: [...sel].map(i => 'id:' + i) }); return; }
    if (e.target.closest('input')) return;
    const tr = e.target.closest('tr[data-id]'); if (tr) openCard(tr.dataset.id);
  });

  /* ── 學生卡 ── */
  async function openCard(id) {
    const s = scores.find(x => x.id === id); if (!s) return;
    const [flags, mails] = await Promise.all([loadFlags(true).catch(() => []), loadMails().catch(() => [])]);
    const draw = box => {
      const b = bd(s), nw = s.nw, warn = nameChanged(s, b);
      const mine = flags.filter(x => x.docId === id && x.type === 'namechg').sort((p, q) => (q.t || 0) - (p.t || 0));
      const titleOf = mid => { const m = mails.find(x => x.id === mid); return m ? m.title : mid; };
      let nwHtml = '<p class="dim">還沒進過新世界。</p>';
      if (nw) {
        const q = currentQuest(nw), words = (nw.words || []).map(w => (wordById(w) || { w }).w);
        nwHtml = `<div class="kv">
          <b>稱號</b><span>${esc(nw.title || '（沒有）')}　<span class="dim">詞條 ${words.length} 個</span></span>
          <b>獵人</b><span>HR ${nw.hr}・字元 ${nw.coins}・狩獵 ${nw.hunts} 場・勝 ${nw.stat.wins}／敗 ${nw.stat.fails}</span>
          <b>區域進度</b><span>${Object.keys(REGIONS).filter(k => !REGIONS[k].wip).map(k => `${REGIONS[k].icon}${esc(REGIONS[k].name)} ★${(nw.zone || {})[k] || 0}`).join('　')}</span>
          <b>圖鑑</b><span>${Object.keys(nw.dex || {}).map(k => `${esc((MONSTERS[k] || { name: k }).name)}×${nw.dex[k]}`).join('　') || '—'}</span>
          <b>道具</b><span>${Object.keys(nw.items || {}).filter(k => nw.items[k] > 0).map(k => `${esc((ITEM_DEFS[k] || { name: k }).name)}×${nw.items[k]}`).join('　') || '—'}</span>
          <b>材料</b><span>${Object.keys(nw.mats || {}).filter(k => nw.mats[k] > 0).map(k => `${esc(MATS[k] || k)}×${nw.mats[k]}`).join('　') || '—'}</span>
          <b>教學</b><span>${['dodge', 'defend', 'attack'].map(k => `${{ dodge: '閃避', defend: '防禦', attack: '打字' }[k]}${(nw.tut || {})[k] ? '✓' : '—'}`).join('　')}</span>
          <b>任務</b><span>完成 ${(nw.quest.done || []).length} / ${MAIN_QUESTS.length}・目前：${q ? esc(q.t) : '全部完成'}</span>
          <b>已領的信</b><span>${Object.keys(nw.mail || {}).length ? Object.keys(nw.mail).map(k => `<span class="chip" style="margin:1px">${esc(titleOf(k))}</span>`).join(' ') : '—'}</span></div>`;
      }
      box.innerHTML = `<div class="kv"><b>班級座號</b><span>${esc(s.className)}　${s.seat} 號</span>
          <b>姓名</b><span>${esc(s.name)}${warn ? ' <span class="chip warn">⚠ 換過名字</span>' : ''}</span>
          <b>暱稱</b><span>${esc(s.nick || '（還沒取）')}${b.hideNick ? ' <span class="chip warn">已隱藏（榜上顯示「神秘獵人」）</span>' : ''}</span>
          <b>最後上線</b><span>${esc(fmtT(s.last))}</span>
          <b>抓蟲</b><span>${b.score || 0} 分・確認 ${b.n || 0} 個・送出 ${s.sent} 個${b.bonus ? `・手動加分 ${b.bonus}` : ''}</span></div>
        ${warn || mine.length ? `<div class="note bad" data-namechg><b>名字跟上次不一樣</b>　基準：「${esc(nameBase(s, b))}」→ 現在：「${esc(s.name)}」
            ${warn ? '<br>信箱和改暱稱先鎖著。確定是本人改了名字、或老師改了名單，就按「名字沒問題」解鎖。' : '<br>目前已解鎖。'}
            ${mine.length ? `<br><span class="dim">紀錄：${mine.map(x => `${esc(fmtT(x.t))} ${esc(x.oldName || '')}→${esc(x.name || '')}（${x.status === 'ok' ? '已確認沒問題' : '還沒處理'}）`).join('；')}</span>` : ''}</div>` : ''}
        <h3 style="margin-top:12px">新世界</h3>${nwHtml}
        <div class="row" style="margin-top:12px">
          <button class="px-btn gold" data-act="mail">✉ 寄信給他</button>
          <button class="px-btn" data-act="hide">${b.hideNick ? '恢復暱稱' : '隱藏暱稱'}</button>
          ${warn ? '<button class="px-btn" data-act="nameok">名字沒問題（解鎖）</button>' : ''}</div>`;
    };
    let box;
    const p = modal({ title: `學生卡：${label(s)}`, html: '', wide: true, buttons: [{ id: 'close', label: '關閉' }], onOpen: bx => {
      box = bx; draw(box);
      bx.addEventListener('click', async e => {
        const a = e.target.closest('[data-act]'); if (!a) return;
        a.disabled = true;
        try {
          if (a.dataset.act === 'mail') { $('[data-modal]').remove(); ctx.go('mail', { aud: ['id:' + id] }); return; }
          if (a.dataset.act === 'hide' && !(await toggleHide(s))) { a.disabled = false; return; }
          if (a.dataset.act === 'nameok') await nameOk(s, flags);
          draw(box); paint();
        } catch (er) { toast('失敗：' + errText(er), true); a.disabled = false; }
      });
    } });
    await p;
  }

  async function toggleHide(s) {
    const b = bd(s), to = !b.hideNick;
    if (to && !await ask('隱藏暱稱', `<p>隱藏 <b>${esc(label(s))}</b> 的暱稱後，所有榜單都會顯示「神秘獵人」。要恢復隨時可以。</p>`, '隱藏')) return false;
    await setDoc(doc(db, 'mg_bugboard', s.id), { className: s.className, seat: s.seat, hideNick: to }, { merge: true });
    await log(to ? '隱藏暱稱' : '恢復暱稱', s.id, `${label(s)}（暱稱：${s.nick || '—'}）`);
    invalidate('board'); board = await loadBoard(true);
    toast(to ? '已隱藏暱稱' : '已恢復暱稱');
    return true;
  }
  /* 名字沒問題：把 nameOk 寫成現在的名字（之後它就是新基準）；同時把這個人還沒處理的換名紀錄標成「已確認」。
     學生端解鎖：下次進新世界讀到 nameOk 就不再鎖。 */
  async function nameOk(s, flags) {
    const b = writeBatch(db);
    b.set(doc(db, 'mg_bugboard', s.id), { className: s.className, seat: s.seat, nameOk: s.name }, { merge: true });
    flags.filter(x => x.docId === s.id && x.type === 'namechg' && (x.status || 'pending') === 'pending').forEach(x => { b.set(doc(db, 'mg_nw_flags', x.id), { status: 'ok' }, { merge: true }); x.status = 'ok'; });
    await log('名字沒問題', s.id, `${label(s)}：基準改成「${s.name}」`, b);
    await b.commit();
    invalidate('board', 'flags'); board = await loadBoard(true);
    toast('已解鎖，學生下次進新世界就能用信箱');
  }

  paint();
}
