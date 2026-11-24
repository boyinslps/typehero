/* 🏆 榮譽碑（SPEC-STAGE2 §2.7、§2.10，以 §10 為準）。
   學生看的榜單（mg_nw_board）不是學生端算的，是老師端彙總出來的：這一頁按「更新榜單」→ 讀新的狩獵紀錄
   → rank-calc.js 計算 → 寫回 3 份 mg_nw_board（學生讀）與 3 份 mg_nw_board_private（只有老師，放累積狀態與「先不上榜」）。
   Firestore 怎麼讀寫在 rank-io.js（舊控制台老師登入後的背景更新也用它）；這裡只管畫面與老師的審核動作。

   審核（mg_nw_flags，type 'run'）：「放行」「不採用」「先不上榜」「撤銷」。
   每個動作都用「同一個 batch」寫：flag 的狀態、run 文件的 ok（1／-1／刪掉）、重新彙總的 3＋3 份榜單、操作紀錄，一起成功或一起失敗。
   不重讀新紀錄（只用已經吸收的狀態重新彙總），所以一連審十筆不會每按一下就讀一次全校。
   撤銷要從原始紀錄重新吸收：先把那一場從私有狀態拿掉再讀回來（rank-calc 故意不讓重複讀到的場次被打回待審）。
   學生不會收到任何通知；結算畫面與學生端不寫「作弊」「可疑」。 */
import { db, collection, doc, getDoc, getDocs, query, where, orderBy, limit, writeBatch, deleteField } from './fb.js';
import { clsShort, MONSTERS, FASTEST_FLOOR, IMPROVE_SANE_MAX, SUS_WHY, NICK_EMPTY, weaponInfo, stageOpen } from './nw.js';
import { publish, updateBoards, setBlocked, normalizeRun, GRADES, RANK } from './rank-calc.js';
import * as IO from './rank-io.js';
import { invalidate } from './data.js';
import { idParts } from './ids.js';
import { $, esc, fmtT, fmtD, relT, log, ask, modal, toast, errText, helpBox } from './util.js';

const DAY = 24 * 3600 * 1000;
const GRADE_NAME = { 4: '四', 5: '五', 6: '六' };
const ZONES = [['pending', '待審核'], ['approved', '已放行'], ['rejected', '不採用']];
const SUBS = [['improve', '🌱 進步'], ['fast', '⚡ 最快討伐'], ['acc', '🎯 神準名單']];
const WHY_HINT = {
  keys: '打對的字比按下的鍵多很多（像是貼上或外掛輸入）',
  fast: '有一題比手能打的速度快，或整場速度比全校最快的人還快很多',
  sum: '每題的紀錄加起來，跟整場的總數對不起來（像是被改過）',
  jump: '這一場比自己前幾場快了 3 倍以上'
};
const isObj = o => !!o && typeof o === 'object' && !Array.isArray(o);
/* qb 的前面是題目字數：4＝★1～2、6＝★3～4、8＝★5（SPEC §2.2） */
const bandStar = qb => { const n = +String(qb).split(':')[0]; return n <= 4 ? '★1～2' : n <= 6 ? '★3～4' : '★5'; };
const monName = mk => (MONSTERS[mk] && MONSTERS[mk].name) || '（不認得的魔物）';
const medal = r => (r >= 1 && r <= 3 ? ['🥇', '🥈', '🥉'][r - 1] : String(r));
const upHtml = up => (up > 0 ? `<span class="ok" data-up>▲${up}</span>` : up === -1 ? '<span class="ok" data-up>🆕 新上榜</span>' : '');
const pct = a => (Number.isFinite(a) ? Math.round(a * 1000) / 10 + '%' : '—');

export default async function mount(el, ctx, params = {}) {
  const env = { db, fs: { collection, doc, getDoc, getDocs, query, where, orderBy, limit, writeBatch } };
  let priv = {}, boards = {}, flags = [], pub = null, loadErr = '', dataErr = '', last = null, busy = false;
  let gsel = '5', tsel = 'improve', fkey = '', zone = ZONES.some(z => z[0] === params.zone) ? params.zone : 'pending', showPrev = false;
  const details = {};   // rid → { cpm, acc, secs, win }｜null：私有狀態裡沒有那一場時，才去讀原始紀錄

  el.innerHTML = `<h2>🏆 榮譽碑</h2>
    ${helpBox([
      '榮譽碑的榜單<b>不是即時的</b>：按「更新榜單」，才會把同學新打的狩獵紀錄整理成榜單。學生看到的就是你更新的那一份。',
      '上課前後按一次就好；舊控制台（遊戲首頁的教師控制台）登入後，榮譽碑開放了也會在背景自動更新。',
      '「待審核」是系統覺得怪怪的場次（原因寫在每一張卡片上）。看過覺得沒問題按「放行」；不想讓這場算進榜單按「不採用」。學生都不會收到通知。',
      '覺得某位同學的成績不合理，在榜單那一列按「先不上榜」，可以選一週、四週或不設期限；到期會自動回到榜上，隨時也可以解除。',
      '⚠ 是提醒：進步超過 60%、或比最低合理秒數還快。榜單照常算，你看過再決定要不要排除。進步超過 100% 的先不放上榜。',
      '每個動作都可以撤銷，也都會記在「⚙ 設定」最下面的操作紀錄。'
    ])}
    <div data-rk-body><p class="dim">讀取中…</p></div>`;
  const body = $('[data-rk-body]', el);

  /* ── 讀資料與整理 ── */
  async function load() {
    [priv, boards, flags] = await Promise.all([IO.readPrivate(env), IO.readBoards(env), IO.readRunFlags(env)]);
  }
  function derive() {
    /* 用「上次更新的那一刻」重算檢視，跟學生讀到的榜單是同一份（每次更新都會改 t；沒更新過就用現在） */
    const t = IO.lastUpdate(boards);
    dataErr = '';
    const badVer = GRADES.filter(g => isObj(priv[g]) && priv[g].v !== 1);
    try { pub = publish(priv, t || Date.now()); }
    catch (e) { console.warn('榮譽碑私有狀態讀不懂', e); pub = publish(null, Date.now()); dataErr = '私有資料讀不懂，下面先當成空的。按「從頭重算」可以重建（「先不上榜」名單也會一起重建，不會留下）。'; }
    if (!dataErr && badVer.length) dataErr = `${badVer.map(g => GRADE_NAME[g] + '年級').join('、')}的私有資料版本不認得，下面先當成空的。按「從頭重算」可以重建。`;
  }
  const stuOf = id => { const p = IO.parseRid(id + '_1'); return p && p.g && pub.states[p.g].students[id]; };
  const who = (id, f) => {
    const s = stuOf(id), p = idParts(id);
    if (s) return `${s.c}・${s.s}號${s.n ? ' ' + s.n : ''}`;
    if (f && (f.cls || f.docId)) return `${clsShort(f.cls || idParts(f.docId).className)}・${f.seat !== undefined && f.seat !== '' ? f.seat : idParts(f.docId).seat}號${f.name ? ' ' + f.name : ''}`;
    return p.className ? `${clsShort(p.className)}・${p.seat}號` : String(id || '（不明）');
  };
  const isBlockedNow = id => GRADES.some(g => pub.review[g].blocked.some(b => b.id === id));

  /* 待審核／已放行／不採用：來自 mg_nw_flags（學生端寫的標記），再加上老師端重算才發現、沒有標記的待審場次 */
  function items() {
    const held = {}, out = [], seen = new Set();
    GRADES.forEach(g => pub.review[g].held.forEach(h => { held[h.rid] = h; }));
    const mk = (rid, f, h) => {
      const p = IO.parseRid(rid) || {}, en = IO.entryOf(pub.states, rid);
      const status = f && (f.status === 'approved' || f.status === 'rejected') ? f.status : 'pending';
      const why = ((h && h.why) || (en && en.e.y) || (f && Array.isArray(f.why) ? f.why : []) || []).filter(x => typeof x === 'string');
      const pick = (...v) => v.find(x => x !== undefined && x !== null && x !== '');
      return {
        rid, id: p.id || (f && f.docId) || '', g: p.g, f, status, why,
        mk: pick(h && h.mk, en && en.e.m, f && f.mk) || '', star: pick(h && h.star, en && en.e.r, f && f.star) || 0,
        ts: pick(h && h.ts, en && en.e.u, f && f.t) || p.t || 0,
        d: en ? { cpm: en.e.c, acc: en.e.a, secs: en.e.s, win: !!en.e.w } : (details[rid] || null)
      };
    };
    flags.forEach(f => { const rid = IO.runIdOf(f); if (f.type === 'run' && rid && !seen.has(rid)) { seen.add(rid); out.push(mk(rid, f, held[rid])); } });
    Object.keys(held).forEach(rid => { if (!seen.has(rid)) out.push(mk(rid, null, held[rid])); });
    return out;
  }
  async function fetchDetails() {
    const need = items().filter(i => i.status === 'pending' && !i.d && i.rid && !(i.rid in details)).slice(0, 40);
    await Promise.all(need.map(async i => {
      try {
        const s = await getDoc(doc(db, 'mg_nw_runs', i.rid));
        const n = s.exists() ? normalizeRun(Object.assign({}, s.data() || {}, { _rid: i.rid })) : null;
        details[i.rid] = n && n.ok ? { cpm: n.run.cpm, acc: n.run.acc, secs: n.run.secs, win: n.run.win } : null;
      } catch (e) { details[i.rid] = null; }
    }));
  }
  /* 榜單與標記都剛寫過：總覽的快取要丟掉，不然切回去還是舊的更新時間與待審數 */
  async function refresh() { invalidate('rankboards', 'flags'); derive(); await fetchDetails(); paint(); }

  /* ── 畫面 ── */
  function statusHtml() {
    const t = IO.lastUpdate(boards), n = items().filter(i => i.status === 'pending').length;
    const blocked = GRADES.reduce((a, g) => a + pub.review[g].blocked.length, 0), days = IO.staleDays();
    const stale = t && Date.now() - t > days * DAY;
    const stage = !stageOpen('2a')
      ? `<div class="note" data-rk-stage>榮譽碑還沒開放給學生：你現在更新榜單，只有你看得到，學生那邊不會出現榜單。${stageOpen('2b') ? '' : '狩獵紀錄要等 2b（鐵匠鋪）開放才開始記錄，所以現在可能還沒有資料。'}</div>`
      : '';
    return `${stage}
      <div class="px-panel in" data-rk-status>
        <div class="row gap"><span>上次更新：<b data-rk-last>${t ? esc(fmtT(t)) : '還沒更新過'}</b>${t ? `<span class="dim">（${esc(relT(t))}）</span>` : ''}</span>
          <span>待審核：<b data-rk-pendn>${n}</b> 場</span><span>先不上榜：<b data-rk-blockn>${blocked}</b> 人</span></div>
        ${stale ? `<div class="note bad" data-rk-stale-note style="margin:8px 0 0">榜單 ${Math.floor((Date.now() - t) / DAY)} 天沒更新了。</div>` : ''}
        <div class="row" style="margin-top:8px"><button class="px-btn gold" data-rk-update ${busy ? 'disabled' : ''}>更新榜單</button>
          <button class="px-btn sm" data-rk-rebuild ${busy ? 'disabled' : ''}>從頭重算</button><span class="dim" data-rk-progress></span></div>
        <div data-rk-result>${resultHtml()}</div>
        <div class="row" style="margin-top:8px"><label class="dim">超過 <input class="inp" type="number" min="1" max="60" step="1" data-rk-stale value="${days}" style="width:4.2em"> 天沒更新，就在「📊 總覽」提醒我</label></div>
      </div>`;
  }
  function resultHtml() {
    if (!last) return '';
    const s = last;
    return `<div class="note" data-rk-summary style="margin:8px 0 0">${s.rebuild ? '從頭重算完成：' : ''}這次讀了 <b data-rk-read>${s.read}</b> 筆紀錄（其中新的 <b data-rk-fresh>${s.fresh}</b> 筆）、新上榜 <b data-rk-newboard>${s.newOnBoard}</b> 人。更新時間：<b>${esc(fmtT(s.t))}</b>。
      ${s.skipped && s.skipped.length ? `<div class="warn" data-rk-skipped>有 ${s.skipped.length} 筆紀錄格式不對，已經略過（不影響其他人）。</div>` : ''}
      ${s.capped ? '<div class="warn" data-rk-capped>紀錄很多，這次只讀了一部分，請再按一次「更新榜單」讀完。</div>' : ''}
      ${(s.warn || []).map(w => `<div class="warn">${esc(w)}</div>`).join('')}</div>`;
  }

  function cardHtml(it) {
    const d = it.d, z = it.status, mon = it.mk ? `${esc(monName(it.mk))} ★${esc(it.star)}` : '（不明）';
    const why = it.why.length ? it.why.map(c => `<div data-rk-why>${esc(SUS_WHY[c] || '不認得的代碼')}<span class="dim">：${esc(WHY_HINT[c] || '')}</span></div>`).join('') : '<span class="dim">（沒有原因）</span>';
    const g = it.g ? `${GRADE_NAME[it.g]}年級` : '';
    return `<div class="px-panel in" data-rk-item="${esc(it.rid)}" data-zone="${z}" style="margin-bottom:8px">
      <div class="row"><b data-rk-who>${esc(who(it.id, it.f))}</b>${g ? `<span class="chip" style="color:var(--blue)">${g}</span>` : ''}<span class="dim">${esc(fmtT(it.ts))}</span>
        ${z === 'approved' ? '<span class="chip ok">已放行</span>' : z === 'rejected' ? '<span class="chip warn">不採用</span>' : ''}${isBlockedNow(it.id) ? '<span class="chip warn">先不上榜中</span>' : ''}</div>
      <div class="kv" style="margin-top:6px">
        <b>魔物</b><span data-rk-mon>${mon}${d ? `　${d.win ? '打贏了' : '沒打贏'}` : ''}</span>
        <b>打字速度</b><span data-rk-cpm>${d ? `${d.cpm} 字／分` : '<span class="dim">按「更新榜單」後才算得出來</span>'}</span>
        <b>正確率</b><span data-rk-acc>${d ? pct(d.acc) : '—'}</span>
        <b>花的時間</b><span>${d ? `${d.secs} 秒` : '—'}</span>
        <b>原因</b><span style="overflow-wrap:anywhere">${why}</span></div>
      <div class="row" style="margin-top:8px">${z === 'pending'
        ? `<button class="px-btn gold sm" data-rk-act="approve" data-rid="${esc(it.rid)}">放行</button><button class="px-btn sm danger" data-rk-act="reject" data-rid="${esc(it.rid)}">不採用（不上榜）</button><button class="px-btn sm" data-rk-act="block" data-id="${esc(it.id)}">先不上榜…</button>`
        : `<button class="px-btn sm" data-rk-act="undo" data-rid="${esc(it.rid)}">撤銷，退回待審核</button>`}</div></div>`;
  }
  function reviewHtml() {
    const all = items(), cnt = k => all.filter(i => i.status === k).length;
    const L = all.filter(i => i.status === zone).sort((a, b) => (zone === 'pending' ? a.ts - b.ts : b.ts - a.ts));
    const empty = zone === 'pending' ? '沒有待審核的場次。學生打完狩獵，系統覺得怪怪的場次會出現在這裡。' : '這一區沒有場次。';
    return `<h3>待審核的狩獵紀錄</h3>
      <div class="row" data-rk-zones>${ZONES.map(([k, n]) => `<button class="px-btn ${zone === k ? 'gold' : ''}" data-rk-zone="${k}">${n}（${cnt(k)}）</button>`).join('')}</div>
      <div data-rk-items style="margin-top:8px">${L.slice(0, 60).map(cardHtml).join('') || `<p class="dim" data-rk-empty>${empty}</p>`}${L.length > 60 ? `<p class="dim">只列最早的 60 筆，共 ${L.length} 筆</p>` : ''}</div>`;
  }

  /* 榜單檢視：每列有「先不上榜」。名字是真的登入名字；學生那邊如果被隱藏就顯示「神秘獵人」，在這裡標出來 */
  const rowWho = r => `${esc(`${r.c}・${r.s}號 ${(stuOf(r.id) || {}).n || ''}`.trim())}${r.n === NICK_EMPTY && (stuOf(r.id) || {}).n ? ` <span class="chip" style="color:var(--dim)" title="這位同學的暱稱被隱藏了">學生看到：${NICK_EMPTY}</span>` : ''}`;
  const rowBtn = r => `<button class="px-btn sm" data-rk-act="block" data-id="${esc(r.id)}">先不上榜…</button>`;
  const rowBox = (r, mid, warn) => `<div class="rk-row" data-rk-row="${esc(r.id)}" style="display:flex;flex-wrap:wrap;gap:4px 10px;align-items:center;padding:6px 4px;border-bottom:1px solid var(--line)">
      <b style="min-width:2.2em">${medal(r.r)}</b><span style="flex:1 1 11em;min-width:0;overflow-wrap:anywhere">${rowWho(r)}</span>${mid}${warn ? `<span class="warn" data-rk-warn>⚠ ${warn}</span>` : ''}${rowBtn(r)}</div>`;
  function rowsHtml(g) {
    const V = pub.view[g], R = pub.review[g], N = RANK.listMax;
    if (tsel === 'improve') {
      const warn = new Set(R.improveWarn.map(x => x.id));
      const rows = V.improve.slice(0, N).map(r => rowBox(r, `<span>打字變快 <b>${r.v}%</b>（${bandStar(r.qb)}）</span>${upHtml(r.up)}`, warn.has(r.id) ? `進步超過 ${IMPROVE_SANE_MAX}%，請看一下` : '')).join('');
      const hold = R.improveHold.length ? `<div class="note bad" data-rk-hold><b>進步超過 ${RANK.improveHold}%，先不放上榜</b>（${R.improveHold.length} 人）：${R.improveHold.map(x => `<div data-rk-holdrow="${esc(x.id)}">${esc(who(x.id))}　${bandStar(x.qb)}　+${x.v}%</div>`).join('')}
        <div class="dim">初學者剛開始進步很快是正常的，這裡只是請你看一眼。現在沒有「放行」按鈕；如果確定是真的，之後想加請告訴開發者。</div></div>` : '';
      return (rows || '<p class="dim" data-rk-empty>這個年級還沒有人達到進步榜的條件（同一種題目，兩邊各至少 3 場）。</p>') + hold;
    }
    if (tsel === 'fast') {
      const keys = Object.keys(V.fast);
      if (!keys.length) return '<p class="dim" data-rk-empty>這個年級還沒有人打贏而且正確率 90% 以上的場次。</p>';
      if (!keys.includes(fkey)) fkey = keys[0];
      const sel = `<div class="row" style="margin:6px 0"><label>魔物與星級 <select class="inp" data-rk-fkey>${keys.map(k => { const [mk, star] = k.split(':'); return `<option value="${esc(k)}" ${k === fkey ? 'selected' : ''}>${esc(monName(mk))} ★${esc(star)}（${V.fast[k].length} 人）</option>`; }).join('')}</select></label></div>`;
      const warn = new Map(R.fastWarn.map(x => [x.rid, x]));
      return sel + V.fast[fkey].slice(0, N).map(r => {
        const w = warn.get(r.rid), wi = r.w ? weaponInfo(r.w) : null;
        return rowBox(r, `<span><b>${r.v}</b> 秒</span><span class="dim">${esc(wi ? wi.name : '')}${r.pw ? ` 戰力 ${r.pw}` : ''}</span>${upHtml(r.up)}`, w ? `比最低合理的 ${w.floor} 秒還快` : '');
      }).join('');
    }
    const A = V.acc;
    return A.length ? `<p class="dim" style="margin:4px 0">神準名單不排名次，新的在前。</p>${A.slice(0, RANK.accListMax).map(r => `<div class="rk-row" data-rk-row="${esc(r.id)}" style="display:flex;flex-wrap:wrap;gap:4px 10px;align-items:center;padding:6px 4px;border-bottom:1px solid var(--line)">
        <span>🎯</span><span style="flex:1 1 11em;min-width:0;overflow-wrap:anywhere">${rowWho(r)}</span><span class="dim">${esc(fmtD(r.at))} 起</span>${rowBtn(r)}</div>`).join('')}${A.length > RANK.accListMax ? `<p class="dim">學生只看得到最近 ${RANK.accListMax} 人，還有 ${A.length - RANK.accListMax} 人。</p>` : ''}`
      : '<p class="dim" data-rk-empty>這個年級還沒有人達標（Lv10 以上的最近 10 場，平均正確率 97% 以上）。</p>';
  }
  /* 「這是學生看到的樣子」：只用 mg_nw_board 那一份文件畫，跟學生端讀到的一模一樣，不放任何 id */
  function previewHtml(g) {
    const b = boards[g];
    if (!isObj(b)) return '<div class="px-panel" data-rk-preview><p class="dim" style="margin:0">這個年級還沒有榜單。學生現在會看到「榮譽碑剛蓋好，老師更新後就會有名字喔！」。</p></div>';
    const line = (r, mid) => `<div data-rk-prow style="padding:3px 0;overflow-wrap:anywhere"><b>${medal(r.r)}</b>　${esc(r.c)}・${esc(r.s)}號　${esc(r.n)}　${mid}</div>`;
    let rows = '';
    if (tsel === 'improve') rows = (b.improve || []).map(r => line(r, `打字變快 ${esc(r.v)}%（${bandStar(r.qb)}）${upHtml(r.up)}`)).join('');
    else if (tsel === 'fast') rows = ((b.fast || {})[fkey] || []).map(r => line(r, `${esc(r.v)} 秒${r.pw ? `　戰力 ${esc(r.pw)}` : ''}${upHtml(r.up)}`)).join('');
    else rows = ((b.acc && b.acc.list) || []).map(r => `<div data-rk-prow style="padding:3px 0;overflow-wrap:anywhere">⭐　${esc(r.c)}・${esc(r.s)}號　${esc(r.n)}</div>`).join('') + (b.acc && b.acc.more ? `<div class="dim">還有 ${esc(b.acc.more)} 人也很準！</div>` : '');
    return `<div class="px-panel" data-rk-preview style="max-width:560px"><b>🏆 榮譽碑・${GRADE_NAME[g]}年級</b><div class="dim" style="font-size:.9em">榮譽碑每週更新，上次：${esc(fmtD(b.t))}</div>
      <div style="margin-top:6px">${rows || '<span class="dim">（這一頁目前沒有名單）</span>'}</div></div>`;
  }
  function boardHtml() {
    const hasBoard = GRADES.some(g => isObj(boards[g]));
    return `<h3>榜單</h3>
      ${hasBoard ? '' : '<p class="dim" data-rk-nodata>還沒有榜單。按上面的「更新榜單」，會把學生的狩獵紀錄整理成榜單。</p>'}
      <div class="row" data-rk-grades>${GRADES.map(g => `<button class="px-btn ${gsel === g ? 'gold' : ''}" data-rk-grade="${g}">${GRADE_NAME[g]}年級</button>`).join('')}</div>
      <div class="row" style="margin-top:6px" data-rk-subs>${SUBS.map(([k, n]) => `<button class="px-btn sm ${tsel === k ? 'gold' : ''}" data-rk-sub="${k}">${n}</button>`).join('')}</div>
      <div data-rk-rows style="margin-top:6px">${rowsHtml(gsel)}</div>
      <div class="row" style="margin-top:10px"><button class="px-btn sm" data-rk-prevtoggle>${showPrev ? '收起' : '👀 看學生看到的樣子'}</button></div>
      ${showPrev ? `<div style="margin-top:8px">${previewHtml(gsel)}</div>` : ''}`;
  }
  function blockedHtml() {
    const rows = GRADES.flatMap(g => pub.review[g].blocked.map(b => Object.assign({ g }, b)));
    return `<h3>先不上榜的同學</h3>${rows.length ? rows.map(b => `<div class="rk-row" data-rk-blocked="${esc(b.id)}" style="display:flex;flex-wrap:wrap;gap:4px 10px;align-items:center;padding:6px 4px;border-bottom:1px solid var(--line)">
        <span style="flex:1 1 11em;min-width:0;overflow-wrap:anywhere"><b>${esc(who(b.id))}</b>　<span class="dim">${b.until ? `到 ${esc(fmtD(b.until))}` : '不設期限'}${b.why ? '・' + esc(b.why) : ''}</span></span>
        <button class="px-btn sm" data-rk-act="unblock" data-id="${esc(b.id)}">解除</button></div>`).join('') : '<p class="dim" data-rk-empty>沒有。在榜單那一列按「先不上榜」，可以暫時把某位同學拿下榜。</p>'}`;
  }
  function paint() {
    if (loadErr) {
      body.innerHTML = `<div class="note bad" data-rk-loaderr>讀不到榮譽碑的資料：${esc(loadErr)}<br><span class="dim">要先貼上新版 Firestore 規則（firestore-rules.txt 裡 mg_nw_runs、mg_nw_board、mg_nw_board_private 那幾段），再重新整理。</span></div>
        <div class="row"><button class="px-btn" data-rk-retry>重試</button></div>`;
      return;
    }
    const keep = document.activeElement && document.activeElement.matches && document.activeElement.matches('[data-rk-stale]');
    body.innerHTML = `${dataErr ? `<div class="note bad" data-rk-dataerr>${esc(dataErr)}</div>` : ''}${statusHtml()}${reviewHtml()}${boardHtml()}${blockedHtml()}`;
    if (keep) { const i = $('[data-rk-stale]', el); if (i) i.focus(); }
  }

  /* ── 寫入 ── */
  const guard = fn => async (...a) => {
    if (busy) return;
    busy = true;
    try { await fn(...a); } catch (e) { toast('失敗：' + errText(e), true); console.error(e); } finally { busy = false; paint(); }
  };
  const shortWho = id => { const p = idParts(id); return p.className ? `${clsShort(p.className)}・${p.seat}號` : id; };

  const doUpdate = guard(async rebuild => {
    paint();   // busy 已經是 true：按鈕變灰
    const prog = () => $('[data-rk-progress]', el);
    const out = await IO.updateRank(env, {
      rebuild, onProgress: n => { const p = prog(); if (p) p.textContent = `讀到第 ${n} 筆…`; },
      log: (b, st) => log('rank', 'update', `${rebuild ? '從頭重算' : '更新榜單'}：讀 ${st.read} 筆（新 ${st.fresh} 筆）、新上榜 ${st.newOnBoard} 人`, b)
    });
    priv = out.priv; boards = out.r.boards; flags = out.flags;
    last = Object.assign({}, out.stats, { warn: out.stats.warn });
    await refresh();
    toast(rebuild ? '從頭重算完成' : out.stats.fresh ? `榜單更新了，新增 ${out.stats.fresh} 筆紀錄` : '榜單更新了（沒有新紀錄）');
  });

  const SAY = {
    approve: ['放行這一場？', '這場會算進榜單（還是要符合正確率 90% 等條件）。學生不會收到任何通知。', '放行', 'gold'],
    reject: ['這一場不採用？', '這場不會算進榜單，也不會被拿來算進步。學生不會收到通知，之後可以撤銷。', '不採用', 'danger'],
    undo: ['撤銷這個決定？', '這一場會退回「待審核」，榜單跟著重算。', '撤銷', 'gold']
  };
  const doVerdict = guard(async (rid, kind) => {
    const it = items().find(x => x.rid === rid); if (!it) return;
    const label = `${who(it.id, it.f)}・${monName(it.mk)}★${it.star}`;
    const [title, text, okLabel, cls] = SAY[kind];
    const yes = await modal({ title, html: `<p><b>${esc(label)}</b></p><p>${esc(text)}</p>`, buttons: [{ id: 'no', label: '取消' }, { id: 'ok', label: okLabel, cls }] });
    if (yes !== 'ok') return;
    const runRef = doc(db, 'mg_nw_runs', rid), runSnap = await getDoc(runRef);
    if (kind === 'undo' && !runSnap.exists()) { toast('找不到這場的原始紀錄，沒辦法撤銷', true); return; }
    const status = kind === 'approve' ? 'approved' : kind === 'reject' ? 'rejected' : 'pending';
    const nf = Object.assign({ id: 'run_' + rid, type: 'run', runId: rid }, it.f || {}, { status });
    const flagsNew = flags.filter(f => IO.runIdOf(f) !== rid).concat([nf]);
    let base = priv, runs = [];
    if (kind === 'undo') { base = IO.dropEntry(priv, rid); const raw = Object.assign({}, runSnap.data() || {}, { _rid: rid }); delete raw.ok; runs = [raw]; }
    const r = updateBoards(base, runs, { now: Date.now(), verdicts: IO.verdictsOf(flagsNew) });
    await IO.commitBoards(env, r, b => {
      const p = idParts(it.id);
      b.set(doc(db, 'mg_nw_flags', 'run_' + rid), it.f ? { status } : { type: 'run', status, docId: it.id, cls: p.className, seat: p.seat, runId: rid, mk: it.mk, star: it.star, t: it.ts, why: it.why.slice(0, 4) }, { merge: true });
      if (runSnap.exists()) b.update(runRef, { ok: kind === 'approve' ? 1 : kind === 'reject' ? -1 : deleteField() });
      log('rank', rid, `${{ approve: '放行', reject: '不採用', undo: '撤銷審核' }[kind]}：${shortWho(it.id)} ${monName(it.mk)}★${it.star}${it.why.length ? '（' + it.why.map(c => SUS_WHY[c] || c).join('、') + '）' : ''}`, b);
    });
    priv = r.states; boards = r.boards; flags = flagsNew;
    await refresh();
    toast({ approve: '已放行，榜單重算好了', reject: '已標成不採用，榜單重算好了', undo: '已撤銷，退回待審核' }[kind]);
  });

  const doBlock = guard(async id => {
    const stuName = who(id);
    let box;
    const r = await modal({
      title: `先不上榜：${stuName}`, sticky: true, onOpen: b => { box = b; },
      buttons: [{ id: 'no', label: '取消' }, { id: 'ok', label: '先不上榜', cls: 'danger' }],
      html: `<p>這位同學的成績在這段期間不會出現在榜單上（進步、最快、神準都不算）。他不會收到通知，也看不到原因。</p>
        <div style="margin-top:8px"><b>期間</b> <select class="inp" data-rk-until><option value="7">一週</option><option value="28">四週</option><option value="0">不設期限（我自己解除）</option></select></div>
        <div style="margin-top:8px"><b>理由（只有你看得到）</b><input class="inp" data-rk-why maxlength="60" style="width:100%" placeholder="例如：進步 150%，要先問他"></div>`
    });
    if (r !== 'ok') return;
    const days = +$('[data-rk-until]', box).value, why = $('[data-rk-why]', box).value.trim(), now = Date.now();
    const until = days ? now + days * DAY : 0;
    const out = updateBoards(setBlocked(priv, id, { until, why }, now), [], { now, verdicts: IO.verdictsOf(flags) });
    await IO.commitBoards(env, out, b => log('rank', id, `先不上榜：${shortWho(id)}，${days ? `${days} 天（到 ${fmtD(until)}）` : '不設期限'}`, b));
    priv = out.states; boards = out.boards;
    await refresh();
    toast('已先不上榜，榜單重算好了');
  });
  const doUnblock = guard(async id => {
    const yes = await ask('解除「先不上榜」？', `<p><b>${esc(who(id))}</b> 的成績會回到榜單上，榜單跟著重算。</p>`, '解除', '取消');
    if (!yes) return;
    const now = Date.now();
    const out = updateBoards(setBlocked(priv, id, null, now), [], { now, verdicts: IO.verdictsOf(flags) });
    await IO.commitBoards(env, out, b => log('rank', id, `解除先不上榜：${shortWho(id)}`, b));
    priv = out.states; boards = out.boards;
    await refresh();
    toast('已解除，榜單重算好了');
  });
  const doRebuild = guard(async () => {
    if (!(await ask('從頭重算榜單？', '<p>會重新讀這學期<b>全部</b>的狩獵紀錄（可能有一萬多筆），花比較久，也比較耗用量。平常按「更新榜單」就夠了。</p><p>「先不上榜」的名單會保留。</p>', '繼續', '取消'))) return;
    if (!(await ask('再確認一次', '<p>真的要從頭重算嗎？重算期間請不要關掉這一頁。</p>', '真的要重算', '先不要', true))) return;
    busy = false; await doUpdate(true);
  });

  /* ── 事件 ── */
  el.addEventListener('click', e => {
    const q = s => e.target.closest(s);
    let b;
    if ((b = q('[data-rk-act]'))) {
      const a = b.dataset.rkAct;
      if (a === 'block') return doBlock(b.dataset.id);
      if (a === 'unblock') return doUnblock(b.dataset.id);
      return doVerdict(b.dataset.rid, a);
    }
    if (q('[data-rk-update]')) return doUpdate(false);
    if (q('[data-rk-rebuild]')) return doRebuild();
    if (q('[data-rk-retry]')) return start();
    if ((b = q('[data-rk-zone]'))) { zone = b.dataset.rkZone; return paint(); }
    if ((b = q('[data-rk-grade]'))) { gsel = b.dataset.rkGrade; fkey = ''; return paint(); }
    if ((b = q('[data-rk-sub]'))) { tsel = b.dataset.rkSub; return paint(); }
    if (q('[data-rk-prevtoggle]')) { showPrev = !showPrev; return paint(); }
  });
  el.addEventListener('change', e => {
    if (e.target.matches('[data-rk-fkey]')) { fkey = e.target.value; paint(); }
    else if (e.target.matches('[data-rk-stale]')) {
      const n = Math.floor(+e.target.value);
      if (n >= 1 && n <= 60) { IO.setStaleDays(n); toast(`榜單超過 ${n} 天沒更新，總覽會提醒你`); }
      paint();
    }
  });

  async function start() {
    loadErr = '';
    try { await load(); derive(); await fetchDetails(); }
    catch (e) { console.warn('讀榮譽碑資料失敗', e); loadErr = errText(e); priv = {}; boards = {}; flags = []; derive(); }
    /* 一開始就停在有資料的年級，老師不用先按一圈 */
    const g = GRADES.find(x => pub.view[x].improve.length || Object.keys(pub.view[x].fast).length || pub.view[x].acc.length);
    if (g && !pub.view[gsel].improve.length && !Object.keys(pub.view[gsel].fast).length && !pub.view[gsel].acc.length) gsel = g;
    paint();
  }
  await start();
}
