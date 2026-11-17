/* 🎪 活動（SPEC §4.4）：列表（排程中／進行中／已結束）、新增（選類型→範本預填→預覽→送出）、
   開始後鎖欄位、提早結束／延長、刪除、再開一次、進行中的參加人數／各班達標率／前 10 名、ranking 發獎。

   mg_events/{ID} 的欄位寫在 nw-events.js 檔頭，學生端怎麼算也看那裡。
   活動 ID 會變成學生存檔的欄位路徑（nw.ev.{ID}.s），所以只能用英數、底線、連字號。

   發獎（§4.2b）：先把名次快照寫進 mg_events/{ID}.result → 依快照寄信（固定 ID）→ 最後才寫 awarded。
   重按會照同一份快照、同樣的信件 ID 重寄，不會變兩封（信是覆蓋，不是新增）。
   快照裡不放真名：mg_events 所有登入的人都讀得到。 */
import { db, doc, setDoc, updateDoc, deleteDoc, deleteField, writeBatch, commitAll } from './fb.js';
import { loadScores, loadEvents, loadClassSizes, invalidate } from './data.js';
import { EVENT_TEMPLATES, EVENT_DEFAULTS, IMPROVE_SANE_MAX, MONSTERS, clsShort, normalizeEvent, phaseOf, timeText, scoreText, pctOf, classReached } from './nw.js';
import { itemLabel, itemError } from './gifts.js';
import { mountItems } from './gift-ui.js';
import { rankingRows, rankRows, buildSnapshot, snapshotMails, snapshotSummary, tierOf, TIER_NAME } from './ev-calc.js';
import { $, esc, fmtT, toInput, fromInput, log, ask, modal, toast, errText, confirmBig, previewConfirm, mailCardHtml } from './util.js';

const TYPE_NAME = { boost: '限時加倍', hunt: '限時討伐', classwar: '班級挑戰', ranking: '活動排行榜' };
const TYPE_ICON = { boost: '⚡', hunt: '🗡', classwar: '🏫', ranking: '🏆' };
const METRIC_NAME = { improve: '進步獎', kills: '討伐王', fastest: '最快討伐', acc: '神準手' };
const FIELDS = { boost: ['mul', 'what'], hunt: ['mk', 'minStar', 'goal', 'items'], classwar: ['mk', 'minStar', 'per', 'goalPct', 'items'], ranking: ['metric', 'mk', 'minStar', 'minRuns'] };
/* 開始後鎖住：改了就變成「開始前跟開始後是兩種規則」，已經在打的人不公平（SPEC §4.4） */
const LOCKED = ['type', 'mk', 'minStar', 'goal', 'per', 'goalPct', 'metric'];
const ID_RE = /^[A-Za-z0-9_-]{1,60}$/;
const mkName = k => (MONSTERS[k] || { name: k }).name;
const stOf = (s, id) => { const e = s.raw && s.raw.nw && s.raw.nw.ev; return e && typeof e === 'object' ? (e[id] || null) : null; };
const minute = () => Math.floor(Date.now() / 60000) * 60000;

/* 給學生看的條件句，預覽卡片與詳細頁都用 */
function condText(ev) {
  const mon = ev.mk ? `${mkName(ev.mk)}${ev.minStar > 1 ? `（★${ev.minStar} 以上）` : ''}` : '任何魔物';
  const prize = ev.items && ev.items.length ? ev.items.map(itemLabel).join('、') : '';
  if (ev.type === 'boost') return `活動期間打贏魔物，${ev.what === 'coins' ? '字元' : '獵人經驗'}變 ${ev.mul} 倍`;
  if (ev.type === 'hunt') return `打倒 ${mon} ${ev.goal} 隻，達標自己領獎：${prize || '（沒有獎品）'}`;
  if (ev.type === 'classwar') return `每人打倒 ${mon} ${ev.per} 隻；全班 ${ev.goalPct}% 的人做到，大家都有獎：${prize || '（沒有獎品）'}`;
  const m = { improve: `比自己以前的紀錄快越多越好（${mon}，至少打 2 場）`, kills: `打倒最多隻 ${mon}`, fastest: `${mon} 最快討伐`, acc: `平均正確率（至少 ${ev.minRuns} 場）` }[ev.metric];
  return `${METRIC_NAME[ev.metric]}：${m}。結束後老師會寄獎品`;
}
/* 學生佈告欄「活動」卡片的樣子（簡化版，給送出前預覽用） */
function evCard(ev) {
  const goal = ev.type === 'hunt' ? ev.goal : ev.type === 'classwar' ? ev.per : 0;
  return `<div class="px-panel in" data-pv-card style="padding:10px 12px"><div class="row" style="flex-wrap:nowrap;align-items:flex-start">
      <span style="font-size:26px">${TYPE_ICON[ev.type]}</span><div style="flex:1;min-width:0"><b style="color:#ffd98a;font-size:1.05em;overflow-wrap:anywhere">${esc(ev.title)}</b>
      <span class="chip" style="color:#e8b64c">${TYPE_NAME[ev.type]}</span><div class="dim" style="font-size:.85em">${esc(timeText(ev, Date.now()))}・${esc(fmtT(ev.startAt))} ～ ${esc(fmtT(ev.endAt))}</div></div></div>
    ${ev.desc ? `<p style="white-space:pre-wrap;line-height:1.6;margin:6px 0 0;overflow-wrap:anywhere">${esc(ev.desc)}</p>` : ''}
    <p class="dim" style="margin:6px 0 0">${esc(condText(ev))}</p>
    ${goal ? `<div class="dim" style="margin-top:4px">你的進度：0 / ${goal} 隻</div>` : ''}
    <div class="dim" style="margin-top:4px">${ev.cls.length ? '對象：' + ev.cls.map(clsShort).join('、') : '對象：全校'}</div></div>`;
}

export default async function mount(el, ctx, params) {
  let scores = await loadScores(true), events = await loadEvents(true), sizes = {};
  try { sizes = await loadClassSizes(); } catch (e) { console.warn('讀班級人數失敗', e); }
  const classes = [...new Set(scores.map(s => s.className).filter(Boolean))].sort((a, b) => clsShort(a) < clsShort(b) ? -1 : 1);
  let view = { mode: 'list' }, f = null, busy = false;

  const reload = async () => { invalidate('events', 'scores'); [events, scores] = await Promise.all([loadEvents(true), loadScores(true)]); };
  const byId = id => events.find(e => e.id === id);
  const joined = id => scores.filter(s => { const st = stOf(s, id); return st && st.n >= 1; }).length;

  /* ── 表單狀態 ── */
  function defaults(type) {
    const D = EVENT_DEFAULTS, base = { type, mul: D.boost.mul, what: D.boost.what, mk: 'coo', minStar: 1, goal: D.hunt.goal, per: D.classwar.per, goalPct: D.classwar.goalPct,
      metric: 'improve', minRuns: D.ranking.minRuns, items: [], cls: new Set() };
    if (type === 'hunt' || type === 'classwar') base.items = [{ type: 'coins', n: 100 }];
    return base;
  }
  const newId = pre => { const d = new Date(), base = `${pre}_${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`; let id = base, i = 2; while (byId(id)) id = `${base}_${i++}`; return id; };
  function freshForm(type, tpl) {
    const o = Object.assign({ id: '', title: '', desc: '', tpl: '' }, defaults(type));
    const start = minute(); o.startAt = toInput(start); o.endAt = toInput(start + EVENT_DEFAULTS.days * 86400000);
    if (tpl) applyTpl(o, tpl);
    else o.id = newId(type);
    return o;
  }
  function applyTpl(o, tpl) {
    const x = Object.assign({}, tpl.fields), start = fromInput(o.startAt) || minute();
    Object.assign(o, defaults(x.type), x, { items: (x.items || []).map(i => Object.assign({}, i)), tpl: tpl.id, cls: o.cls || new Set() });
    o.endAt = toInput(start + tpl.days * 86400000); o.id = newId(tpl.id);
  }
  function formFromDoc(e, asCopy) {
    const o = Object.assign({ id: e.id, title: e.title, desc: e.desc, tpl: '', cls: new Set(e.cls) }, defaults(e.type));
    ['mul', 'what', 'mk', 'minStar', 'goal', 'per', 'goalPct', 'metric', 'minRuns'].forEach(k => { if (e[k] !== undefined && e[k] !== '') o[k] = e[k]; });
    o.items = (e.items || []).map(i => Object.assign({}, i));
    o.startAt = toInput(e.startAt); o.endAt = toInput(e.endAt);
    if (asCopy) {
      const len = e.endAt - e.startAt, start = minute();
      o.startAt = toInput(start); o.endAt = toInput(start + Math.max(len, 3600000));
      const m = /^(.*?)_(\d+)$/.exec(e.id); o.id = newId(m ? m[1] : e.id); o.title = e.title;
    }
    return o;
  }

  /* 表單 → 要寫進 Firestore 的文件（只留這個類型用得到的欄位）；錯誤回字串 */
  function buildDoc() {
    const type = f.type, startAt = fromInput(f.startAt), endAt = fromInput(f.endAt), title = f.title.trim();
    if (!view.editing && !ID_RE.test(f.id)) return '活動 ID 只能用英文、數字、底線、連字號（1～60 個字）';
    if (!view.editing && byId(f.id)) return '這個活動 ID 已經有了，換一個';
    if (!title) return '請寫活動標題';
    if (!startAt) return '請選開始時間';
    if (!endAt) return '請選結束時間';
    if (endAt <= startAt) return '結束時間要比開始時間晚';
    const d = { type, title, desc: f.desc.trim(), startAt, endAt, cls: [...f.cls] };
    const int = (v, lo, hi) => Number.isInteger(+v) && v !== '' && +v >= lo && +v <= hi;
    if (type === 'boost') { if (!(+f.mul >= 1 && +f.mul <= 5)) return '倍數要在 1～5'; d.mul = +f.mul; d.what = f.what === 'coins' ? 'coins' : 'exp'; }
    if (type === 'hunt' || type === 'classwar') {
      if (!MONSTERS[f.mk]) return '請選魔物';
      if (!int(f.minStar, 1, 5)) return '星級要是 1～5';
      Object.assign(d, { mk: f.mk, minStar: +f.minStar });
      if (type === 'hunt') { if (!int(f.goal, 1, 100)) return '要打倒的隻數是 1～100 的整數'; d.goal = +f.goal; }
      else {
        if (!int(f.per, 1, 50)) return '每人要打倒的隻數是 1～50 的整數'; if (!(+f.goalPct >= 1 && +f.goalPct <= 100)) return '全班達標比例要在 1～100%';
        d.per = +f.per; d.goalPct = +f.goalPct;
      }
      if (!f.items.length) return '請放至少一個獎勵（達標才有東西可以領）';
      const bad = f.items.map(itemError).find(Boolean); if (bad) return bad;
      d.items = f.items.map(i => Object.assign({}, i));
    }
    if (type === 'ranking') {
      if (f.mk && !MONSTERS[f.mk]) return '請選魔物';
      if (f.metric === 'improve' && !f.mk) return '進步獎一定要指定魔物（要跟自己以前的紀錄比）';
      if (!int(f.minStar, 1, 5)) return '星級要是 1～5';
      d.metric = f.metric; d.minStar = +f.minStar; if (f.mk) d.mk = f.mk;
      if (f.metric === 'acc') { if (!int(f.minRuns, 1, 20)) return '至少打幾場是 1～20'; d.minRuns = +f.minRuns; }
    }
    return d;
  }

  /* ── 畫面 ── */
  function paint() {
    if (view.mode === 'form') paintForm(); else if (view.mode === 'detail') paintDetail(); else paintList();
  }
  const summaryRow = e => `${esc(fmtT(e.startAt))} ～ ${esc(fmtT(e.endAt))}`;

  function paintList() {
    const now = Date.now(), ok = [], broken = [];
    events.forEach(r => { const n = normalizeEvent(r.id, r); if (n) ok.push({ r, ev: n }); else broken.push(r); });
    const grp = ph => ok.filter(x => phaseOf(x.ev, now) === ph);
    const soon = grp('soon').sort((a, b) => a.ev.startAt - b.ev.startAt), active = grp('active').sort((a, b) => a.ev.endAt - b.ev.endAt), ended = grp('ended').sort((a, b) => b.ev.endAt - a.ev.endAt);
    const table = (list, key) => `<div class="tscroll"><table class="tbl" data-evtable="${key}"><thead><tr><th>標題</th><th>類型</th><th>時間</th><th>對象</th><th>參加</th><th></th></tr></thead><tbody>${list.map(({ ev, r }) => `<tr data-eid="${esc(ev.id)}">
      <td class="wrap"><b>${esc(ev.title)}</b>${ev.type === 'ranking' && ev.awarded ? ' <span class="chip ok">已發獎</span>' : ''}<div class="dim mono" style="font-size:.8em">${esc(ev.id)}</div></td>
      <td>${TYPE_ICON[ev.type]} ${TYPE_NAME[ev.type]}${ev.metric ? '・' + METRIC_NAME[ev.metric] : ''}</td><td>${summaryRow(ev)}</td>
      <td>${ev.cls.length ? esc(ev.cls.map(clsShort).join('、')) : '全校'}</td><td>${joined(ev.id)} 人</td>
      <td><button class="px-btn sm" data-open="${esc(ev.id)}">管理</button> <button class="px-btn sm" data-again="${esc(ev.id)}">再開一次</button> <button class="px-btn sm danger" data-del="${esc(ev.id)}">刪除</button></td></tr>`).join('')
      || '<tr><td colspan="6" class="dim">沒有</td></tr>'}</tbody></table></div>`;
    el.innerHTML = `<h2>🎪 活動</h2><div class="row"><button class="px-btn gold" data-new>＋ 新增活動</button></div>
      <h3>進行中（${active.length}）</h3>${table(active, 'active')}<h3>排程中（${soon.length}）</h3>${table(soon, 'soon')}<h3>已結束（${ended.length}）</h3>${table(ended, 'ended')}
      ${broken.length ? `<h3>資料有問題（${broken.length}）</h3><div class="note bad">這些活動的資料不完整，學生端會直接略過。可以刪掉。</div><div class="tscroll"><table class="tbl" data-brokentable><tbody>${broken.map(r => `<tr><td class="mono">${esc(r.id)}</td><td class="wrap">${esc(r.title || '')}</td><td><button class="px-btn sm danger" data-del="${esc(r.id)}">刪除</button></td></tr>`).join('')}</tbody></table></div>` : ''}
      <p class="dim" style="margin-top:10px">剩餘時間給學生看的是「還有 3 天」，不倒數秒（SPEC §4.5）。</p>`;
  }

  function paintForm() {
    const edit = view.editing, started = edit && Date.now() >= view.startedAt, locked = k => started && LOCKED.includes(k);
    const dis = k => locked(k) ? 'disabled' : '';
    const has = k => FIELDS[f.type].includes(k);
    const monOpts = (allowNone) => `${allowNone ? `<option value="" ${!f.mk ? 'selected' : ''}>不指定魔物</option>` : ''}${Object.keys(MONSTERS).map(k => `<option value="${k}" ${f.mk === k ? 'selected' : ''}>${esc(mkName(k))}</option>`).join('')}`;
    const tpls = EVENT_TEMPLATES.filter(t => t.fields.type === f.type);
    const num = (k, lbl, min, max, unit = '') => `<label>${lbl} <input class="inp" type="number" min="${min}" max="${max}" step="1" data-f="${k}" value="${esc(f[k])}" style="width:80px" ${dis(k)}> ${unit}</label>`;
    el.innerHTML = `<h2>🎪 ${edit ? '修改活動' : '新增活動'}</h2>
      ${started ? '<div class="note" data-lockednote>活動開始了：<b>類型、魔物、星級、目標、指標都鎖住了</b>（已經在打的人不公平）。只能改標題、說明、<b>延長</b>結束時間；要停就按「提早結束」。</div>' : ''}
      <div class="grid2"><div class="px-panel in" data-form>
        <div><b>活動類型</b><div class="row" data-types style="margin-top:4px">${Object.keys(TYPE_NAME).map(t => `<label class="chk"><input type="radio" name="etype" value="${t}" ${f.type === t ? 'checked' : ''} ${edit ? 'disabled' : ''}> ${TYPE_ICON[t]} ${TYPE_NAME[t]}</label>`).join('')}</div></div>
        ${edit ? '' : `<div style="margin-top:8px"><b>用範本預填</b> <select class="inp" data-tpl><option value="">（不用範本）</option>${tpls.map(t => `<option value="${t.id}" ${f.tpl === t.id ? 'selected' : ''}>${esc(t.name)}</option>`).join('')}</select></div>`}
        <div style="margin-top:8px"><b>活動 ID</b> <input class="inp mono" data-f="id" value="${esc(f.id)}" maxlength="60" style="width:100%" ${edit ? 'disabled' : ''}>
          <div class="dim" style="font-size:.85em">只能用英文、數字、底線、連字號（學生存檔要用它當欄位名稱）</div></div>
        <div style="margin-top:8px"><b>標題</b> <input class="inp" data-f="title" maxlength="30" value="${esc(f.title)}" style="width:100%"></div>
        <div style="margin-top:8px"><b>說明</b> <textarea class="inp" data-f="desc" rows="3" maxlength="200" placeholder="給學生看，用白話">${esc(f.desc)}</textarea></div>
        <div class="row gap" style="margin-top:8px"><label>開始 <input class="inp" type="datetime-local" data-f="startAt" value="${esc(f.startAt)}" ${started ? 'disabled' : ''}></label>
          <label>結束 <input class="inp" type="datetime-local" data-f="endAt" value="${esc(f.endAt)}"></label></div>
        ${started ? '<div class="dim" style="font-size:.85em">結束時間只能往後延。</div>' : ''}
        <div style="margin-top:8px"><b>對象班級</b> <span class="dim">（都不勾＝全校）</span><div class="row" style="margin-top:4px">${classes.map(c => `<label class="chk"><input type="checkbox" data-cls="${esc(c)}" ${f.cls.has(c) ? 'checked' : ''} ${started ? 'disabled' : ''}> ${esc(clsShort(c))}</label>`).join('') || '<span class="dim">還沒有學生存檔，先當全校</span>'}</div></div>
        <div class="row gap" style="margin-top:8px" data-typefields>
          ${has('mul') ? `<label>倍數 <select class="inp" data-f="mul">${[1.5, 2, 3].map(v => `<option value="${v}" ${+f.mul === v ? 'selected' : ''}>×${v}</option>`).join('')}</select></label>
            <label>加倍什麼 <select class="inp" data-f="what"><option value="exp" ${f.what === 'exp' ? 'selected' : ''}>獵人經驗</option><option value="coins" ${f.what === 'coins' ? 'selected' : ''}>字元</option></select></label>` : ''}
          ${has('metric') ? `<label>指標 <select class="inp" data-f="metric" ${dis('metric')}>${Object.keys(METRIC_NAME).map(k => `<option value="${k}" ${f.metric === k ? 'selected' : ''}>${METRIC_NAME[k]}</option>`).join('')}</select></label>` : ''}
          ${has('mk') ? `<label>魔物 <select class="inp" data-f="mk" ${dis('mk')}>${monOpts(f.type === 'ranking' && f.metric !== 'improve')}</select></label>` : ''}
          ${has('minStar') ? num('minStar', '最低星級 ★', 1, 5) : ''}
          ${has('goal') ? num('goal', '要打倒', 1, 100, '隻') : ''}
          ${has('per') ? num('per', '每人要打倒', 1, 50, '隻') : ''}
          ${has('goalPct') ? num('goalPct', '全班達標比例', 1, 100, '%') : ''}
          ${has('minRuns') && f.metric === 'acc' ? num('minRuns', '至少打', 1, 20, '場') : ''}
        </div>
        ${has('items') ? `<div style="margin-top:8px"><b>達標獎勵</b> <span class="dim">（${f.type === 'hunt' ? '每人達標自己領一次' : '全班達標，每個有參加的人自己領'}）</span><div data-items></div></div>` : ''}
        ${f.type === 'ranking' ? '<p class="dim" style="margin-top:8px">名次獎品等活動結束後，在「管理」裡按「發獎」才設定。</p>' : ''}
        <div class="row" style="margin-top:12px"><button class="px-btn gold" data-submit>預覽並${edit ? '儲存' : '送出'}</button><button class="px-btn" data-cancel>取消</button></div>
        <div class="warn" data-err style="min-height:1.3em;margin-top:6px"></div></div>
        <div class="px-panel in"><b>學生會看到的樣子</b><div data-pv style="margin-top:6px"></div></div></div>`;
    if (has('items')) mountItems($('[data-items]', el), f.items, paintPv, { disabled: false });
    paintPv();
  }
  function paintPv() {
    const box = $('[data-pv]', el); if (!box) return;
    const d = buildDoc(), tmp = typeof d === 'object' ? d : null;
    const ev = tmp && normalizeEvent(view.editing || f.id || 'preview', tmp);
    box.innerHTML = ev ? evCard(ev) : `<div class="dim" data-pv-wait>${esc(typeof d === 'string' ? d : '填好欄位就會顯示')}</div>`;
  }

  /* 詳細頁 */
  function paintDetail() {
    const r = byId(view.id), ev = r && normalizeEvent(r.id, r);
    if (!ev) { view = { mode: 'list' }; return paintList(); }
    const now = Date.now(), ph = phaseOf(ev, now), started = ph !== 'soon';
    const phText = { soon: '排程中', active: '進行中', ended: '已結束' }[ph];
    const n = joined(ev.id);
    let extra = '';
    if (ev.type === 'classwar' && started) extra = classwarHtml(ev);
    if (ev.type === 'hunt' && started) extra = `<h3>達標狀況</h3><div class="note">有 <b>${scores.filter(s => (stOf(s, ev.id) || {}).done).length}</b> 人已達標並領獎（目標 ${ev.goal} 隻）。</div>`;
    if (ev.type === 'ranking' && started) extra = rankingHtml(ev, r, ph);
    el.innerHTML = `<h2>🎪 ${esc(ev.title)} <span class="chip" style="color:var(--gold)">${phText}</span></h2>
      <div class="row"><button class="px-btn" data-back>← 回列表</button><button class="px-btn" data-edit="${esc(ev.id)}">修改</button>
        ${ph === 'active' ? `<button class="px-btn" data-endnow="${esc(ev.id)}">提早結束</button>` : ''}
        <button class="px-btn" data-again="${esc(ev.id)}">再開一次</button><button class="px-btn danger" data-del="${esc(ev.id)}">刪除</button></div>
      <div class="px-panel in" style="margin-top:10px"><div class="kv" data-evinfo>
        <b>類型</b><span>${TYPE_ICON[ev.type]} ${TYPE_NAME[ev.type]}${ev.metric ? '・' + METRIC_NAME[ev.metric] : ''}</span>
        <b>ID</b><span class="mono">${esc(ev.id)}</span><b>時間</b><span>${summaryRow(ev)}（${esc(timeText(ev, now))}）</span>
        <b>對象</b><span>${ev.cls.length ? esc(ev.cls.map(clsShort).join('、')) : '全校'}</span>
        <b>條件</b><span>${esc(condText(ev))}</span><b>參加</b><span data-joined>${n} 人</span>
        ${ev.desc ? `<b>說明</b><span style="white-space:pre-wrap">${esc(ev.desc)}</span>` : ''}</div></div>${extra}`;
  }

  function classwarHtml(ev) {
    const names = ev.cls.length ? ev.cls : classes.filter(c => scores.some(s => s.raw.nwCls === c));
    const row = cn => {
      const done = scores.filter(s => Array.isArray(s.raw.nwEvDone) && s.raw.nwEvDone.includes(ev.id + '|' + cn)).length;
      const size = (ev.clsSize[cn] > 0 ? +ev.clsSize[cn] : sizes[cn] > 0 ? +sizes[cn] : scores.filter(s => s.raw.nwCls === cn).length);
      const pct = pctOf(done, size), got = scores.filter(s => s.className === cn && (stOf(s, ev.id) || {}).cw).length;
      return `<tr data-cw="${esc(cn)}"><td>${esc(clsShort(cn))}</td><td>${done} / ${size} 人</td><td><div style="background:#0e0b16;border:2px solid var(--line);width:160px;height:14px"><div style="background:${classReached(ev, done, size) ? 'var(--gr)' : 'var(--gold)'};height:100%;width:${pct}%"></div></div></td>
        <td data-pct>${pct}%</td><td>${classReached(ev, done, size) ? '<span class="chip ok">全班達標</span>' : `<span class="dim">目標 ${ev.goalPct}%</span>`}</td><td>${got} 人已領</td></tr>`;
    };
    return `<h3>各班達標率</h3><div class="tscroll"><table class="tbl" data-cwtable><thead><tr><th>班級</th><th>達標人數</th><th></th><th>達標率</th><th></th><th>全班獎</th></tr></thead><tbody>${names.map(row).join('') || '<tr><td colspan="6" class="dim">還沒有班級資料</td></tr>'}</tbody></table></div>
      <p class="dim" style="margin-top:6px">分母：活動自己填的人數 → 設定分頁的班級人數 → 進過新世界的人數。全班獎由學生進村時自己領，這裡只顯示，不寄信。</p>`;
  }

  const who = id => { const s = scores.find(x => x.id === id); return s ? `${clsShort(s.className)}・${s.seat}號${s.name ? ' ' + s.name : ''}` : id; };
  function rankingHtml(ev, r, ph) {
    const rows = rankingRows(ev, scores), scored = rows.filter(x => x.s !== null);
    const top = rankRows(ev, rows, () => true).filter(x => x.s !== null).slice(0, 10);
    const table = `<h3>${ph === 'ended' ? '最後' : '目前'}前 10 名</h3><div class="tscroll"><table class="tbl" data-ranktable><thead><tr><th>名次</th><th>學生</th><th>暱稱</th><th>分數</th><th>有效場次</th><th></th></tr></thead><tbody>${top.map(x => `<tr><td>${x.rank}</td><td>${esc(who(x.id))}</td><td>${esc(x.nick || '—')}</td><td>${esc(scoreText(ev, x.s))}</td><td>${x.n}</td><td>${x.warn ? '<span class="chip warn" title="分數超出合理範圍，請確認">⚠ 請確認</span>' : ''}</td></tr>`).join('') || '<tr><td colspan="6" class="dim">還沒有人有分數</td></tr>'}</tbody></table></div>
      <p class="dim" style="margin-top:6px">有分數 ${scored.length} 人、參加 ${rows.length} 人。⚠＝分數超出合理範圍（進步獎超過 ${IMPROVE_SANE_MAX}%、或比魔物的合理下限還快），分數是學生端算的，請確認再發獎。</p>`;
    if (ph !== 'ended') return table;
    const snap = r.result && r.result.rows ? r.result : null;
    return `${table}<h3>發獎</h3><div class="px-panel in" data-award>${r.awarded ? '<div class="note" data-awarded>已經發過獎了。再按一次會照<b>同一份名次快照</b>、用同樣的信件 ID 重寄，不會變兩封。</div>'
      : snap ? '<div class="note" data-snapnote>已經有名次快照，還沒寄完或沒按確認。再按一次會照同一份快照寄。</div>' : '<p style="margin:0 0 6px">結束後在這裡設定名次獎品、勾掉不發的人（⚠ 預設不勾）、決定要不要送參加獎。</p>'}
      <div class="row"><button class="px-btn gold" data-award-btn="${esc(ev.id)}">${r.awarded ? '重寄獎品' : snap ? '照快照寄獎品' : '發獎'}</button>${snap && !r.awarded ? `<button class="px-btn" data-resnap="${esc(ev.id)}">作廢快照重做</button>` : ''}</div></div>`;
  }

  /* ── 事件 ── */
  el.addEventListener('input', e => {
    const t = e.target; if (view.mode !== 'form') return;
    if (t.matches('textarea[data-f],input[data-f]')) { f[t.dataset.f] = t.value; paintPv(); }
  });
  el.addEventListener('change', e => {
    const t = e.target; if (view.mode !== 'form') return;
    if (t.name === 'etype') {
      const keep = { id: f.id, title: f.title, desc: f.desc, startAt: f.startAt, endAt: f.endAt, cls: f.cls };
      f = Object.assign({ tpl: '' }, defaults(t.value), keep); f.id = f.id || newId(t.value); paintForm();
    } else if (t.matches('[data-tpl]')) {
      if (t.value) applyTpl(f, EVENT_TEMPLATES.find(x => x.id === t.value)); paintForm();
    } else if (t.matches('[data-cls]')) { t.checked ? f.cls.add(t.dataset.cls) : f.cls.delete(t.dataset.cls); paintPv(); }
    else if (t.matches('select[data-f],input[data-f]')) {
      f[t.dataset.f] = t.dataset.f === 'mul' ? +t.value : t.value;
      /* 進步獎一定要指定魔物，下拉沒有「不指定」，所以切到進步獎時狀態也要跟著選一隻，不然畫面與資料不一致 */
      if (t.dataset.f === 'metric') { if (t.value === 'improve' && !f.mk) f.mk = 'coo'; paintForm(); } else paintPv();
    }
  });
  el.addEventListener('click', e => {
    const t = e.target, q = s => t.closest(s);
    if (q('[data-new]')) { f = freshForm('boost', EVENT_TEMPLATES[0]); view = { mode: 'form' }; paintForm(); return; }
    let b;
    if ((b = q('[data-open]'))) { view = { mode: 'detail', id: b.dataset.open }; paint(); return; }
    if (q('[data-back]')) { view = { mode: 'list' }; paint(); return; }
    if (q('[data-cancel]')) { view = view.editing ? { mode: 'detail', id: view.editing } : { mode: 'list' }; paint(); return; }
    if ((b = q('[data-edit]'))) { const r = byId(b.dataset.edit), ev = normalizeEvent(r.id, r); f = formFromDoc(ev); view = { mode: 'form', editing: ev.id, startedAt: ev.startAt }; paintForm(); return; }
    if ((b = q('[data-again]'))) { again(b.dataset.again); return; }
    if ((b = q('[data-del]'))) { remove(b.dataset.del); return; }
    if ((b = q('[data-endnow]'))) { endNow(b.dataset.endnow); return; }
    if (q('[data-submit]')) { save(); return; }
    if ((b = q('[data-award-btn]'))) { award(b.dataset.awardBtn); return; }
    if ((b = q('[data-resnap]'))) resnap(b.dataset.resnap);
  });

  function again(id) {
    const r = byId(id), ev = r && normalizeEvent(r.id, r); if (!ev) return;
    f = formFromDoc(ev, true); view = { mode: 'form' }; paintForm();
    toast('已複製成新活動，確認時間後送出');
  }
  async function remove(id) {
    const r = byId(id), ev = r && normalizeEvent(id, r);
    const warn = ev && ev.type === 'ranking' && !r.awarded && Date.now() > ev.endAt ? '<p class="warn">這個排行榜還沒發獎。刪掉後名次快照也沒了。</p>' : '';
    if (!await ask('刪除活動？', `<p>「<b>${esc((r && r.title) || id)}</b>」刪掉後，學生端找不到它，有參加過的人會看到一次「這個活動取消了」。</p>${warn}<p class="dim">已經寄出的獎勵信不會收回。</p>`, '刪除', '先不要', true)) return;
    try { await deleteDoc(doc(db, 'mg_events', id)); } catch (e) { toast('刪除失敗：' + errText(e), true); return; }
    await log('刪除活動', id, (r && r.title) || id);
    await reload(); view = { mode: 'list' }; paint(); toast('已刪除');
  }
  async function endNow(id) {
    const r = byId(id); if (!r) return;
    if (!await ask('提早結束？', `<p>「<b>${esc(r.title)}</b>」現在就結束。結束後 5 分鐘內打完的場次還是會算。</p>`, '提早結束', '先不要', true)) return;
    try { await updateDoc(doc(db, 'mg_events', id), { endAt: minute() }); } catch (e) { toast('失敗：' + errText(e), true); return; }
    await log('提早結束活動', id, r.title);
    await reload(); paint(); toast('已結束');
  }

  async function save() {
    if (busy) return;
    const err = $('[data-err]', el), d = buildDoc();
    if (typeof d === 'string') { err.textContent = d; return; }
    err.textContent = '';
    const edit = view.editing, old = edit ? byId(edit) : null;
    const started = edit && Date.now() >= view.startedAt;
    if (started && d.endAt < old.endAt) { err.textContent = '活動開始後，結束時間只能延長，不能提早（要提早請按「提早結束」）'; return; }
    if (d.type === 'hunt' || d.type === 'classwar') if (!await confirmBig(d.items)) return;
    const id = edit || f.id, ev = normalizeEvent(id, d);
    if (!ev) { err.textContent = '這份資料學生端讀不進去，請檢查欄位'; return; }
    const sum = `${edit ? '修改' : '新增'}「${d.title}」（${TYPE_NAME[d.type]}）：${fmtT(d.startAt)} ～ ${fmtT(d.endAt)}，${d.cls.length ? d.cls.map(clsShort).join('、') : '全校'}`;
    if (!await previewConfirm(evCard(ev), sum, edit ? '確認儲存' : '確認送出')) return;
    busy = true;
    try {
      if (started) await updateDoc(doc(db, 'mg_events', id), { title: d.title, desc: d.desc, endAt: d.endAt });
      else await setDoc(doc(db, 'mg_events', id), Object.assign({}, d, { t: (old && old.t) || Date.now() }, old && old.result ? { result: old.result } : {}));
    } catch (e) { err.textContent = '失敗：' + errText(e); busy = false; return; }
    await log(edit ? '修改活動' : '新增活動', id, sum);
    await reload(); busy = false;
    view = { mode: 'detail', id }; paint(); toast(edit ? '已儲存' : '活動建好了，學生下次進村就看得到');
  }

  /* ── ranking 發獎 ── */
  async function resnap(id) {
    if (!await ask('作廢名次快照？', '<p>快照會刪掉，你可以重新勾選、重新設定獎品。還沒寄出任何信，所以安全。</p>', '作廢重做')) return;
    try { await updateDoc(doc(db, 'mg_events', id), { result: deleteField() }); } catch (e) { toast('失敗：' + errText(e), true); return; }
    await log('作廢名次快照', id, (byId(id) || {}).title || id);
    await reload(); paint();
  }
  async function award(id) {
    if (busy) return;
    busy = true;
    try { await awardFlow(id); } finally { busy = false; }
  }
  async function awardFlow(id) {
    await reload();
    const r = byId(id), ev = r && normalizeEvent(id, r); if (!ev || ev.type !== 'ranking') return;
    let snap = r.result && Array.isArray(r.result.rows) ? r.result : null;
    if (!snap) {
      const rows = rankingRows(ev, scores), st = { pick: new Map(rows.map(x => [x.id, !x.warn])), t1: [], t23: [], t410: [], part: [], partOn: false };
      const tbl = () => {
        const ranked = rankRows(ev, rows, x => st.pick.get(x.id));
        return `<div class="tscroll" style="max-height:34vh"><table class="tbl" data-award-table><thead><tr><th>發獎</th><th>名次</th><th>學生</th><th>暱稱</th><th>分數</th><th>有效場次</th><th></th></tr></thead><tbody>${ranked.filter(x => x.s !== null).map(x => `<tr data-arow="${esc(x.id)}"><td><input type="checkbox" data-pick="${esc(x.id)}" ${x.pick ? 'checked' : ''} aria-label="發獎給他"></td><td>${x.rank || '—'}</td><td>${esc(who(x.id))}</td><td>${esc(x.nick || '—')}</td><td>${esc(scoreText(ev, x.s))}</td><td>${x.n}</td><td>${x.warn ? '<span class="chip warn">⚠ 請確認</span>' : ''}</td></tr>`).join('') || '<tr><td colspan="7" class="dim">還沒有人有分數</td></tr>'}</tbody></table></div>`;
      };
      const html = `<p class="dim" style="margin:0 0 6px">⚠ 的人分數超出合理範圍，預設<b>不發獎</b>（含參加獎）。確認沒問題再勾回來。沒勾的人，名次由後面的人遞補。</p>
        <div data-tbl>${tbl()}</div>
        <h3 style="margin-top:12px">名次獎品</h3>
        ${['t1', 't23', 't410'].map(k => `<div style="margin:6px 0"><b>${TIER_NAME[k]}</b><div data-tier="${k}"></div></div>`).join('')}
        <label class="chk" style="margin-top:8px"><input type="checkbox" data-parton> 有參加的人都送一點（打過 1 場有效場次就有）</label><div data-part hidden></div>
        <div class="warn" data-aerr style="min-height:1.3em;margin-top:6px"></div>`;
      const res = await modal({ title: `發獎：${ev.title}`, html, wide: true, buttons: [{ id: 'no', label: '取消' }, { id: 'ok', label: '下一步：預覽', cls: 'gold' }],
        onOpen: (box) => {
          ['t1', 't23', 't410'].forEach(k => mountItems($(`[data-tier="${k}"]`, box), st[k], () => {}));
          mountItems($('[data-part]', box), st.part, () => {});
          box.addEventListener('change', e => {
            if (e.target.matches('[data-pick]')) { st.pick.set(e.target.dataset.pick, e.target.checked); $('[data-tbl]', box).innerHTML = tbl(); }
            else if (e.target.matches('[data-parton]')) { st.partOn = e.target.checked; $('[data-part]', box).hidden = !st.partOn; }
          });
          /* 按下一步時要先擋掉不合法的獎品，不能讓視窗關掉才發現 */
          box.closest('[data-modal]').addEventListener('click', e => {
            const b = e.target.closest('[data-btn="ok"]'); if (!b) return;
            const all = [...st.t1, ...st.t23, ...st.t410, ...(st.partOn ? st.part : [])];
            const bad = all.map(itemError).find(Boolean) || (!all.length ? '請至少設定一種獎品' : '');
            if (bad) { e.stopPropagation(); e.preventDefault(); $('[data-aerr]', box).textContent = bad; }
          }, true);
        } });
      if (res !== 'ok') return;
      snap = buildSnapshot(ev, rows, x => st.pick.get(x.id), { t1: st.t1, t23: st.t23, t410: st.t410 }, st.partOn ? st.part : [], Date.now());
    } else {
      const rowsHtml = snap.rows.slice(0, 15).map(x => `<tr><td>${x.rank || '—'}</td><td>${esc(who(x.id))}</td><td>${esc(scoreText({ metric: snap.metric }, x.s))}</td><td>${x.n}</td><td>${x.warn ? '⚠' : ''}${x.pick ? '' : ' 不發'}</td></tr>`).join('');
      const res = await modal({ title: `照名次快照寄獎品：${ev.title}`, wide: true, buttons: [{ id: 'no', label: '取消' }, { id: 'ok', label: '下一步：預覽', cls: 'gold' }],
        html: `<div class="note" data-snapinfo>名次快照是 ${esc(fmtT(snap.at))} 做的。這次會用同一份快照、同樣的信件 ID 寄，已經寄出的會被同樣內容覆蓋，不會變兩封。</div>
          <div class="tscroll" style="max-height:34vh"><table class="tbl"><thead><tr><th>名次</th><th>學生</th><th>分數</th><th>場次</th><th></th></tr></thead><tbody>${rowsHtml}</tbody></table></div>` });
      if (res !== 'ok') return;
    }
    const mails = snapshotMails(ev, snap);
    if (!mails.length) { toast('這份快照沒有任何要寄的信', true); return; }
    const items = [...snap.prizes.t1, ...snap.prizes.t23, ...snap.prizes.t410, ...(snap.part || [])];
    if (!await confirmBig(items)) return;
    const sample = ['t1', 't23', 't410'].filter(k => snap.prizes[k].length).map(k => `<div class="dim" style="margin-top:6px">${TIER_NAME[k]}</div>${mailCardHtml({ title: `第 N 名：${ev.title}`.slice(0, 20), body: '（名次與分數會自動寫在信上）', items: snap.prizes[k], sendAt: snap.at })}`).join('')
      + ((snap.part || []).length ? `<div class="dim" style="margin-top:6px">參加獎（${snap.parts.length} 人）</div>${mailCardHtml({ title: `參加獎：${ev.title}`.slice(0, 20), body: `謝謝你參加「${ev.title}」！送你一點小禮物。`, items: snap.part, sendAt: snap.at })}` : '');
    if (!await previewConfirm(sample, snapshotSummary(snap, mails), '確認寄出')) return;
    try {
      /* ① 快照（只在還沒有時寫；已經有就不動，才能保證兩次寄的是同一份） */
      if (!(r.result && Array.isArray(r.result.rows))) await updateDoc(doc(db, 'mg_events', id), { result: snap });
      /* ② 信：固定 ID，覆蓋不是新增 */
      await commitAll(mails.map(m => b => b.set(doc(db, 'mg_mail', m.id), m.data)));
      /* ③ 全部寄完才寫 awarded。中途失敗的話 awarded 還是 false，再按一次會從同一份快照重寄 */
      const b = writeBatch(db);
      b.update(doc(db, 'mg_events', id), { awarded: true, awardedAt: Date.now() });
      await log(r.awarded ? '重寄活動獎品' : '活動發獎', id, `${ev.title}：${snapshotSummary(snap, mails)}`, b);
      await b.commit();
    } catch (e) { toast('發獎沒有完成：' + errText(e) + '。可以再按一次發獎，會照同一份快照重寄。', true); await reload(); paint(); return; }
    invalidate('mails'); await reload(); paint(); toast(`已寄出 ${mails.length} 封信`);
  }

  if (params && params.new) { f = freshForm('boost', EVENT_TEMPLATES[0]); view = { mode: 'form' }; }
  paint();
}
