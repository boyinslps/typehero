/* 👥 學生（SPEC §2.3）：整份 mg_scores 的表格（可篩選、排序、勾選）＋學生卡。
   這一頁不直接改存檔：給東西一律寄信。唯一的寫入是 mg_bugboard（隱藏暱稱、名字沒問題的雜湊）
   與 mg_bugboard_private（老師核可的真名，學生讀不到）。 */
import { db, doc, setDoc, writeBatch } from './fb.js';
import { loadScores, loadBoard, loadFlags, loadMails, loadClassSizes, invalidate, nameChanged, markNameWarn, nameBase, byClsSeat } from './data.js';
import { clsShort, MONSTERS, REGIONS, MAIN_QUESTS, currentQuest, wordById, twDay, normName, sha256Hex, gearPower } from './nw.js';
import { ownedSummary } from './gifts.js';
import { awardTitle } from './title-ui.js';
import { openPersonCard } from './pc.js';
import { $, esc, fmtT, relT, log, modal, toast, errText, ask, matchStudent, helpBox } from './util.js';

const COLS = [
  ['cls', '班級'], ['seat', '座號'], ['name', '姓名'], ['nick', '榜上名字'], ['hr', 'HR'], ['coins', '字元'], ['weapon', '武器'], ['power', '戰力'],
  ['quest', '目前任務'], ['hunts', '場次'], ['wins', '勝／敗'], ['last', '最後上線'], ['rep', '回報（確認／送出）']
];
/* 「現在在線」＝最近 10 分鐘內有存檔（遊戲每打完一場、每幾分鐘就會存一次）。「勝率偏低」是用累積場次估的：
   存檔裡沒有「連敗」或「這節課打幾場」，所以用打 5 場以上、勝率低於 4 成當「可能卡關」的提醒 */
const ONLINE_MS = 10 * 60 * 1000;
const QUICK = [['', '全部'], ['online', '現在在線（10 分鐘內）'], ['today', '今天有上線'], ['notToday', '今天沒上線'], ['unplayed', '還沒進新世界'], ['lowwin', '勝率偏低（可能卡關）']];
const lowWin = s => s.played && s.wins + s.fails >= 5 && s.wins / (s.wins + s.fails) < 0.4;
const questText = s => { if (!s.played || !s.nw) return '—'; const q = currentQuest(s.nw); return q ? q.t : '全部完成'; };
const gradeOf = c => { const m = /^(.+?年級)/.exec(c || ''); return m ? m[1] : ''; };
const label = s => `${clsShort(s.className)}・${s.seat}號${s.name ? ' ' + s.name : ''}`;

export default async function mount(el, ctx, params) {
  let scores = await loadScores(true), board = await loadBoard(true), sizes = {};
  try { sizes = await loadClassSizes(); } catch (e) { console.warn('讀班級人數失敗', e); }
  markNameWarn(scores, await loadFlags(true).catch(() => []));
  const sel = new Set(), f = { grade: '', cls: '', played: !!params.played, kw: '', warn: !!params.warn, quick: params.today ? 'today' : '' };
  let sort = { key: 'cls', dir: 1 };

  const bd = s => board[s.id] || {};
  const sortVal = {
    cls: s => clsShort(s.className), seat: s => s.seat, name: s => s.name, nick: s => s.nick, hr: s => s.hr, coins: s => s.coins,
    weapon: s => s.weapon, power: s => s.power, quest: s => s.nw ? s.nw.quest.done.length : -1, hunts: s => s.hunts, wins: s => s.wins, last: s => s.last, rep: s => +bd(s).n || 0
  };
  const quickPass = (s, k, now) => !k || (k === 'online' ? s.last && now - s.last <= ONLINE_MS : k === 'today' ? s.last && twDay(s.last) === twDay(now) : k === 'notToday' ? !(s.last && twDay(s.last) === twDay(now))
    : k === 'unplayed' ? !s.played : k === 'lowwin' ? lowWin(s) : true);
  const shown = () => {
    const now = Date.now();
    const list = scores.filter(s => (!f.grade || gradeOf(s.className) === f.grade) && (!f.cls || s.className === f.cls) && (!f.played || s.played)
      && (!f.warn || nameChanged(s, bd(s))) && quickPass(s, f.quick, now) && matchStudent(s, f.kw));
    const g = sortVal[sort.key];
    return list.sort((a, b) => { const x = g(a), y = g(b); return (x < y ? -1 : x > y ? 1 : 0) * sort.dir || byClsSeat(a, b); });
  };

  const grades = () => [...new Set(scores.map(s => gradeOf(s.className)).filter(Boolean))].sort();
  const classes = () => [...new Set(scores.filter(s => !f.grade || gradeOf(s.className) === f.grade).map(s => s.className))].sort((a, b) => clsShort(a) < clsShort(b) ? -1 : 1);

  /* 選了一個班之後的「班級快覽」：5 秒看出這個班的狀態，每一項點下去就變成篩選 */
  function quickHtml() {
    if (!f.cls) return '';
    const now = Date.now(), mine = scores.filter(s => s.className === f.cls), n = k => mine.filter(s => quickPass(s, k, now)).length;
    const size = +sizes[f.cls] > 0 ? +sizes[f.cls] : 0, noSave = size > mine.length ? size - mine.length : 0;
    const chip = (k, text) => `<button class="px-btn sm ${f.quick === k ? 'gold' : ''}" data-quick="${k}">${text}</button>`;
    return `<div class="note" data-classview><b>${esc(clsShort(f.cls))} 班級快覽</b>　${chip('online', `在線 ${n('online')}／${size || mine.length} 人`)} ${chip('notToday', `今天沒上線 ${n('notToday')} 人`)} ${chip('unplayed', `還沒進新世界 ${n('unplayed')} 人`)} ${chip('lowwin', `勝率偏低 ${n('lowwin')} 人`)}
      ${noSave ? `<span class="dim"> 另有 ${noSave} 人還沒有存檔（沒登入過）</span>` : size ? '' : '<span class="dim"> 在「設定」填班級人數，才看得到「還沒登入」的人數</span>'}</div>`;
  }
  const countText = list => `${list.length} / ${scores.length} 人`;
  function paint() {
    const list = shown();
    el.innerHTML = `<h2>👥 學生</h2>
      ${helpBox(['這裡列出所有有存檔的學生。上面可以用年級、班級、關鍵字篩選；關鍵字可以打姓名、暱稱，或「503 5」（503 班 5 號）。', '選一個班，會出現「班級快覽」：誰在線、誰今天沒來、誰勝率偏低，點一下就篩出那些人。', '點名字會打開人物卡（◀ ▶ 或左右鍵換下一位）；點同一列其他地方是文字版的學生卡。兩種都可以直接寄信給他。', '勾好幾位同學，按右上角的「寄信給勾選的 N 人」。'])}
      <div class="row" style="margin-bottom:8px">
        <select class="inp" data-f="grade"><option value="">全部年級</option>${grades().map(g => `<option ${f.grade === g ? 'selected' : ''}>${esc(g)}</option>`).join('')}</select>
        <select class="inp" data-f="cls"><option value="">全部班級</option>${classes().map(c => `<option value="${esc(c)}" ${f.cls === c ? 'selected' : ''}>${esc(clsShort(c))}（${esc(c)}）</option>`).join('')}</select>
        <input class="inp" data-f="kw" placeholder="姓名／暱稱／503 5" value="${esc(f.kw)}" style="width:170px">
        <select class="inp" data-f="quick" aria-label="快速篩選">${QUICK.map(([v, t]) => `<option value="${v}" ${f.quick === v ? 'selected' : ''}>${t}</option>`).join('')}</select>
        <label class="chk"><input type="checkbox" data-f="played" ${f.played ? 'checked' : ''}> 玩過新世界</label>
        <label class="chk"><input type="checkbox" data-f="warn" ${f.warn ? 'checked' : ''}> ⚠ 換過名字</label>
        <span class="dim" data-count>${countText(list)}</span>
        <button class="px-btn gold sm" data-mailsel ${sel.size ? '' : 'disabled'} style="margin-left:auto">✉ 寄信給勾選的 ${sel.size} 人</button>
      </div>
      <div data-quickbar>${quickHtml()}</div>
      <div class="tscroll" style="max-height:70vh"><table class="tbl" data-table><thead><tr>
        <th><input type="checkbox" data-all aria-label="全選目前列出的人"></th>
        ${COLS.map(([k, t]) => `<th data-sort="${k}">${t}${sort.key === k ? (sort.dir > 0 ? ' ▲' : ' ▼') : ''}</th>`).join('')}</tr></thead>
        <tbody data-tbody>${bodyHtml(list)}</tbody></table></div>`;
    const all = $('[data-all]', el); if (all) all.checked = list.length > 0 && list.every(s => sel.has(s.id));
  }
  const bodyHtml = list => list.map(row).join('') || `<tr><td colspan="${COLS.length + 1}" class="dim">沒有符合的學生。把篩選放寬一點，或清掉搜尋的字再看看。</td></tr>`;
  /* 打字搜尋、勾選時只換表格內容，不重畫輸入框：重畫會讓注音輸入法打到一半的字被打斷 */
  function update() {
    const list = shown();
    $('[data-count]', el).textContent = countText(list);
    $('[data-tbody]', el).innerHTML = bodyHtml(list);
    $('[data-quickbar]', el).innerHTML = quickHtml();
    const mb = $('[data-mailsel]', el); mb.disabled = !sel.size; mb.textContent = `✉ 寄信給勾選的 ${sel.size} 人`;
    const all = $('[data-all]', el); if (all) all.checked = list.length > 0 && list.every(s => sel.has(s.id));
  }
  function row(s) {
    const b = bd(s), warn = nameChanged(s, b);
    return `<tr class="clk" data-id="${esc(s.id)}"><td><input type="checkbox" data-sel="${esc(s.id)}" ${sel.has(s.id) ? 'checked' : ''}></td>
      <td>${esc(clsShort(s.className))}</td><td>${s.seat}</td>
      <td><span class="pc-open" data-pc="${esc(s.id)}" title="看人物卡">${esc(s.name || '（沒有姓名）')}</span>${warn ? ' <span class="chip warn" title="名字跟上次不一樣">⚠ 換過名字</span>' : ''}</td>
      <td>${s.played ? esc(s.nick || '（沒有名字）') : '<span class="dim">—</span>'}${b.hideNick ? ' <span class="chip warn">已隱藏</span>' : ''}</td>
      <td>${s.played ? s.hr : '—'}</td><td>${s.played ? s.coins : '—'}</td><td>${esc(s.weapon || '—')}</td><td data-power>${s.played ? s.power : '—'}</td><td class="wrap" style="min-width:130px">${esc(questText(s))}</td><td>${s.played ? s.hunts : '—'}</td>
      <td>${s.played ? `${s.wins}／${s.fails}` : '—'}${lowWin(s) ? ' <span class="chip warn" title="打 5 場以上、勝率低於 4 成">卡關？</span>' : ''}</td><td title="${esc(fmtT(s.last))}">${esc(relT(s.last))}</td>
      <td>${(+b.n || 0)}／${s.sent}${b.score ? ` <span class="dim">（${b.score} 分）</span>` : ''}</td></tr>`;
  }

  /* 注音輸入法：打字的過程中（isComposing）不搜尋，選好字（compositionend）才更新一次 */
  el.addEventListener('input', e => {
    if (e.target.dataset.f === 'kw' && !e.isComposing) { f.kw = e.target.value; update(); }
  });
  el.addEventListener('compositionend', e => {
    if (e.target.dataset && e.target.dataset.f === 'kw') { f.kw = e.target.value; update(); }
  });
  el.addEventListener('change', e => {
    const t = e.target, k = t.dataset.f;
    if (k === 'kw') return;
    if (k) { f[k] = t.type === 'checkbox' ? t.checked : t.value; if (k === 'grade') f.cls = ''; paint(); return; }
    if (t.dataset.sel) { t.checked ? sel.add(t.dataset.sel) : sel.delete(t.dataset.sel); update(); return; }
    if (t.matches('[data-all]')) { shown().forEach(s => t.checked ? sel.add(s.id) : sel.delete(s.id)); update(); }
  });
  el.addEventListener('click', e => {
    const qk = e.target.closest('[data-quick]');
    if (qk) { f.quick = f.quick === qk.dataset.quick ? '' : qk.dataset.quick; paint(); return; }
    const th = e.target.closest('[data-sort]');
    if (th) { sort = { key: th.dataset.sort, dir: sort.key === th.dataset.sort ? -sort.dir : 1 }; paint(); return; }
    if (e.target.closest('[data-mailsel]')) { ctx.go('mail', { aud: [...sel].map(i => 'id:' + i) }); return; }
    const pc = e.target.closest('[data-pc]'); if (pc) { openPerson(pc.dataset.pc); return; }
    if (e.target.closest('input')) return;
    const tr = e.target.closest('tr[data-id]'); if (tr) openCard(tr.dataset.id);
  });

  /* ── 人物卡：切換的順序就是點的當下表格看到的順序（篩選、排序後的結果） ── */
  const openPerson = id => openPersonCard({ ids: shown().map(s => s.id), start: id, find: i => scores.find(x => x.id === i), board: bd, act: async (a, s) => {
    try {
      if (a === 'mail') { ctx.go('mail', { aud: ['id:' + s.id] }); return 'close'; }
      if (a === 'gift') { ctx.go('mail', { aud: ['id:' + s.id], gift: true }); return 'close'; }
      if (a === 'title') { await awardTitle(s); return; }
      if (a === 'detail') { setTimeout(() => openCard(s.id), 0); return 'close'; }
      if (a === 'hide') await toggleHide(s);
      if (a === 'nameok') await nameOk(s, await loadFlags(true).catch(() => []));
      paint();
    } catch (er) { toast('失敗：' + errText(er), true); }
  } });

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
        const q = currentQuest(nw), words = (nw.words || []).map(w => (wordById(w) || { w }).w), own = ownedSummary(nw);
        nwHtml = `<div class="kv">
          <b>稱號</b><span>${esc(nw.title || '（沒有）')}　<span class="dim">詞條 ${words.length} 個</span></span>
          <b>獵人</b><span>HR ${nw.hr}・字元 ${nw.coins}・狩獵 ${nw.hunts} 場・勝 ${nw.stat.wins}／敗 ${nw.stat.fails}</span>
          <b>區域進度</b><span>${Object.keys(REGIONS).filter(k => !REGIONS[k].wip).map(k => `${REGIONS[k].icon}${esc(REGIONS[k].name)} ★${(nw.zone || {})[k] || 0}`).join('　')}</span>
          <b>圖鑑</b><span>${Object.keys(nw.dex || {}).map(k => `${esc((MONSTERS[k] || { name: k }).name)}×${nw.dex[k]}`).join('　') || '—'}</span>
          <b>稱號詞條</b><span data-own="words">${own.words.map(g => `${esc(g.g)}：${g.names.length ? esc(g.names.join('、')) : '—'}`).join('<br>')}</span>
          <b>武器</b><span data-own="weapons">${esc(own.weapons.join('、')) || '—'}</span>
          <b>裝備</b><span data-own="gears">${esc(own.gears.join('、')) || '—'}</span>
          <b>戰力</b><span data-own="power">${gearPower(nw)}　<span class="dim">做過 ${(nw.forge || {}).made || 0} 件・最高 +${Math.max(0, ...(nw.gear || []).map(g => g.p || 0))}</span></span>
          <b>道具</b><span data-own="items">${esc(own.items.join('　')) || '—'}</span>
          <b>材料</b><span data-own="mats">${esc(own.mats.join('　')) || '—'}</span>
          <b>圖紙</b><span data-own="bps">${esc(own.bps.join('、')) || '—'}</span>
          <b>教學</b><span>${['dodge', 'defend', 'attack'].map(k => `${{ dodge: '閃避', defend: '防禦', attack: '打字' }[k]}${(nw.tut || {})[k] ? '✓' : '—'}`).join('　')}</span>
          <b>任務</b><span>完成 ${(nw.quest.done || []).length} / ${MAIN_QUESTS.length}・目前：${q ? esc(q.t) : '全部完成'}</span>
          <b>已領的信</b><span>${Object.keys(nw.mail || {}).length ? Object.keys(nw.mail).map(k => `<span class="chip" style="margin:1px">${esc(titleOf(k))}</span>`).join(' ') : '—'}</span></div>`;
      }
      box.innerHTML = `<div class="kv"><b>班級座號</b><span>${esc(s.className)}　${s.seat} 號</span>
          <b>姓名</b><span>${esc(s.name)}${warn ? ' <span class="chip warn">⚠ 換過名字</span>' : ''}</span>
          <b>榜上名字</b><span>${esc(s.nick || '（沒有名字）')}${b.hideNick ? ' <span class="chip warn">已隱藏（榜上顯示「神秘獵人」）</span>' : ''}</span>
          <b>最後上線</b><span>${esc(relT(s.last))}　<span class="dim">${esc(fmtT(s.last))}</span></span>
          <b>抓蟲</b><span>${b.score || 0} 分・確認 ${b.n || 0} 個・送出 ${s.sent} 個${b.bonus ? `・手動加分 ${b.bonus}` : ''}</span></div>
        ${warn || mine.length ? `<div class="note bad" data-namechg><b>名字跟登入時不一樣</b>　基準：「${esc(nameBase(s, b) || s.name)}」→ 學生打的：「${esc(s.chg ? s.chg.name : s.name)}」
            ${warn ? '<br>信箱和改名字先鎖著。確定是本人要改名、或老師改了名單，就按「名字沒問題」：學生打的名字會變成新名字。' : '<br>目前已解鎖。'}
            ${mine.length ? `<br><span class="dim">紀錄：${mine.map(x => `${esc(fmtT(x.t))} ${esc(x.oldName || '')}→${esc(x.name || '')}（${x.status === 'ok' ? '已確認沒問題' : '還沒處理'}）`).join('；')}</span>` : ''}</div>` : ''}
        ${nw && (nw.nameLog || []).length ? `<div class="note" data-namelog><b>改過名字</b>　<span class="dim">${nw.nameLog.map(x => `${esc(fmtT(x.t))} ${esc(x.from || '')}→${esc(x.to)}${x.card ? '（用改名卡）' : '（第一次進新世界）'}`).join('；')}</span></div>` : ''}
        <h3 style="margin-top:12px">新世界</h3>${nwHtml}
        <div class="row" style="margin-top:12px">
          <button class="px-btn gold" data-act="mail">✉ 寄信給他</button>
          <button class="px-btn gold" data-act="gift">🎁 給東西</button>
          <button class="px-btn" data-act="title">🏷 頒稱號</button>
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
          if (a.dataset.act === 'gift') { $('[data-modal]').remove(); ctx.go('mail', { aud: ['id:' + id], gift: true }); return; }
          if (a.dataset.act === 'title') { await awardTitle(s); draw(box); a.disabled = false; return; }
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
  /* 名字沒問題：把現在的名字當成新基準；同時把這個人還沒處理的換名紀錄標成「已確認」。
     真名只放老師專用的 mg_bugboard_private.nameOk；學生讀得到的 mg_bugboard 只放名字的雜湊 nameOkH，
     學生端拿自己登入的名字算雜湊比對，下次進新世界就不再鎖。 */
  async function nameOk(s, flags) {
    /* 學生打的新名字只在換名紀錄裡（雲端 name 是固定的基準），所以以紀錄為準 */
    const nn = s.chg && s.chg.name ? s.chg.name : s.name;
    const b = writeBatch(db), h = await sha256Hex(normName(nn));
    b.set(doc(db, 'mg_bugboard', s.id), { className: s.className, seat: s.seat, nameOkH: h }, { merge: true });
    b.set(doc(db, 'mg_bugboard_private', s.id), { nameOk: nn }, { merge: true });
    flags.filter(x => x.docId === s.id && x.type === 'namechg' && (x.status || 'pending') === 'pending').forEach(x => { b.set(doc(db, 'mg_nw_flags', x.id), { status: 'ok' }, { merge: true }); x.status = 'ok'; });
    await log('名字沒問題', s.id, `${label(s)}：基準改成「${nn}」`, b);
    await b.commit();
    invalidate('board', 'flags'); board = await loadBoard(true); markNameWarn(scores, await loadFlags(true).catch(() => []));
    toast('已解鎖，學生下次進新世界就能用信箱');
  }

  paint();
}
