/* 榮譽碑（2a）學生端。規格：docs/SPEC-STAGE2.md §2.2～2.3、§2.8～2.9（以 §10 為準）。
   榜單全部在老師端算好（teacher/rank-calc.js），這裡只讀 1 份 mg_nw_board/{自己的年級}、畫出來。

   讀取次數（F3 的修正）：
     以前 每次打開讀整個 mg_scores（一個學校約 330 份），每個學生每次打開都讀一遍。
     現在 每次打開讀 1 份，快取 10 分鐘（10 分鐘內再打開讀 0 份；按「重新整理」才強制再讀）。
     不讀 mg_scores、不讀 mg_nw_runs（規則也不讓學生讀）、不讀 mg_nw_board_private。

   為什麼榜單的列沒有 id：mg_nw_board 全校都讀得到，不放 docId／uid／真名。
   「自己」用班級短碼 c ＋座號 s 認（clsShort(班級) 與座號），跟榜單寫入時同一套算法。

   榜外的孩子：不顯示名次，只說還差多少或怎麼拿。「再快 N 秒」用自己本機的 NW.fastMk 算（跟榜上的 cut 比）。
   進步與神準沒有本機的紀錄可比（NW 沒存「兩週前／最近兩週」的速度，也沒存 Lv10 以上最近 10 場的正確率），
   所以榜外只能說「要變快多少％」與「怎麼拿」，說不出「你差 3%」。 */
import { MONSTERS, TW_OFFSET_MS, displayName, clsShort, normName, weaponInfo, stageOpen } from './nw-data.js';
import { rankBoardHtml, mountRankBoard } from './nw-rankboard.js';
import { PX } from './pixel.js';

export const RANK_CACHE_MS = 10 * 60 * 1000;
const NAME_MAX = 20;

const esc = s => String(s === undefined || s === null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const isNum = v => typeof v === 'number' && Number.isFinite(v);
const isObj = o => !!o && typeof o === 'object' && !Array.isArray(o);
const hasOwn = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
/* weaponInfo 對 'toString' 這類字也會回東西（STARTERS[k] 沒擋原型），所以要是「有 name 的物件」才算認得 */
const knownWeapon = k => { const w = typeof k === 'string' ? weaponInfo(k) : null; return isObj(w) && typeof w.name === 'string' ? w : null; };
const round1 = x => Math.round(x * 10) / 10;

/* 四、五、六年級才有榜；其他（一～三年級、班級名稱怪怪的）回 null。跟 teacher/rank-calc.js 的 gradeOf 同一個規則 */
export function gradeOfClass(cls) {
  const m = /^([四五六4-6])年級[0-9]{1,2}班$/.exec(typeof cls === 'string' ? normName(cls) : '');
  return m ? ({ 四: '4', 五: '5', 六: '6' }[m[1]] || m[1]) : null;
}

/* 自己在榜單上的記號：班級短碼＋座號 */
export const meKey = me => ({ c: clsShort(me && me.className), s: Number(me && me.seat), grade: gradeOfClass(me && me.className) });
const isMe = (row, k) => !!row && row.c === k.c && row.s === k.s;

/* 題目等級 qb（'4:0'）前半＝題目字數：4＝★1～2、6＝★3～4、8＝★5 */
export const qbText = qb => ({ '4': '★1～2 題目', '6': '★3～4 題目', '8': '★5 題目' }[String(qb || '').split(':')[0]] || '');

const FAST_KEY = /^([a-z_]+):([1-5])$/;
export const fastKeyOk = k => { const m = FAST_KEY.exec(k); return !!m && hasOwn(MONSTERS, m[1]); };

/* 榜單是別人（老師端）寫的、全校都讀：逐欄檢查型別，壞掉的列直接丟掉，不讓一份壞資料弄壞畫面。
   沒有這份文件（老師還沒更新過）＝空榜；版本不認得＝丟錯（畫面會說讀不到，不會亂畫） */
function cleanRow(x, i, withV) {
  if (!isObj(x)) return null;
  const s = Number(x.s);
  if (typeof x.c !== 'string' || !x.c || !Number.isInteger(s) || s < 1 || s > 99) return null;
  const row = { c: x.c.slice(0, 6), s, n: displayName(typeof x.n === 'string' ? x.n.slice(0, NAME_MAX) : ''), r: Number.isInteger(x.r) && x.r >= 1 ? x.r : i + 1, up: Number.isInteger(x.up) ? x.up : 0 };
  if (withV) { if (!isNum(x.v) || x.v <= 0) return null; row.v = x.v; }
  return row;
}
export function cleanBoard(raw) {
  const out = { t: 0, week: 0, improve: [], fast: {}, acc: { list: [], more: 0 }, cut: {} };
  if (!isObj(raw)) return out;
  if (raw.v !== undefined && raw.v !== 1) throw new Error('榜單版本不認得');
  if (isNum(raw.t) && raw.t > 0) out.t = raw.t;
  if (isNum(raw.week)) out.week = raw.week;
  if (Array.isArray(raw.improve)) {
    raw.improve.slice(0, 10).forEach((x, i) => { const r = cleanRow(x, i, true); if (r) { r.qb = typeof x.qb === 'string' ? x.qb.slice(0, 8) : ''; out.improve.push(r); } });
  }
  if (isObj(raw.fast)) {
    Object.keys(raw.fast).filter(fastKeyOk).forEach(k => {
      const a = Array.isArray(raw.fast[k]) ? raw.fast[k].slice(0, 10) : [], list = [];
      a.forEach((x, i) => { const r = cleanRow(x, i, true); if (r) { r.w = knownWeapon(x.w) ? x.w : ''; r.pw = isNum(x.pw) && x.pw > 0 ? Math.round(x.pw) : 0; list.push(r); } });
      if (list.length) out.fast[k] = list;
    });
  }
  if (isObj(raw.acc)) {
    (Array.isArray(raw.acc.list) ? raw.acc.list.slice(0, 20) : []).forEach((x, i) => { const r = cleanRow(x, i, false); if (r) { r.at = isNum(x && x.at) ? x.at : 0; out.acc.list.push(r); } });
    out.acc.more = Number.isInteger(raw.acc.more) && raw.acc.more > 0 ? raw.acc.more : 0;
  }
  if (isObj(raw.cut)) Object.keys(raw.cut).forEach(k => { if (isNum(raw.cut[k]) && raw.cut[k] > 0) out.cut[k] = raw.cut[k]; });
  return out;
}

/* ── 快取：同一個年級 10 分鐘內不重讀；重新整理（force）才略過 ── */
const cache = {};
export const clearRankCache = () => { Object.keys(cache).forEach(k => delete cache[k]); };
export async function loadBoard(C, grade, force) {
  const hit = cache[grade];
  if (!force && hit && Date.now() - hit.at < RANK_CACHE_MS) return hit.v;
  if (!C.online()) throw new Error('offline');
  const snap = await C.withTimeout(C.getDoc(C.doc(C.db, 'mg_nw_board', grade)), 6000, 'nw-rank-board');
  const v = cleanBoard(snap.exists() ? snap.data() : null);
  v.at = Date.now();
  cache[grade] = { at: v.at, v };
  return v;
}

/* ── 資料 → 模板的 spec（純函式，不碰畫面；nw17.test.js 直接測） ── */
const NEVER = '榮譽碑剛蓋好，老師更新後就會有名字喔！';
const withMark = (name, up) => `${name}${up > 0 ? `　▲${up}` : up === -1 ? '　🆕 新上榜' : ''}`;
const dateText = ms => { const d = new Date(ms + TW_OFFSET_MS); return `${d.getUTCMonth() + 1} 月 ${d.getUTCDate()} 日`; };
const pctText = v => `${+v.toFixed(1)}%`;
const common = board => ({ updatedAt: board.t > 0 ? board.t : null, updatedWithDate: true });

export function improveSpec(board, me) {
  const k = meKey(me), never = !(board.t > 0);
  const rows = board.improve.map((r, i) => ({ id: 'i' + i, rank: r.r, label: `${r.c}・${r.s}號`, nick: withMark(r.n, r.up), score: `打字變快 ${pctText(r.v)}`, extra: qbText(r.qb), mine: isMe(r, k) }));
  const inList = rows.some(r => r.mine);
  const cut = board.cut.improve;
  return Object.assign({
    id: 'improve', title: '前 10 名', subtitle: '跟以前的自己比：同一種題目，最好 3 場的平均。',
    rows, badges: true,
    emptyText: never ? NEVER : '還沒有人上榜。同一種星級多打幾場，正確率 90% 以上，就會有進步紀錄喔！',
    outText: (never || inList) ? '' : (isNum(cut) ? `打字變快超過 ${pctText(cut)} 就能上榜，加油！` : '同一種星級多打幾場，正確率 90% 以上，就會有進步紀錄！')
  }, common(board));
}

/* 最快討伐可以選的組合：榜單上有人的，加上自己打贏過的。回 [{ mk, stars:[1..5] }]，魔物照 MONSTERS 的順序 */
export function fastOptions(board, myFast) {
  const keys = new Set(Object.keys(board.fast));
  Object.keys(isObj(myFast) ? myFast : {}).forEach(k => { if (fastKeyOk(k) && isNum(myFast[k]) && myFast[k] > 0) keys.add(k); });
  const by = {};
  keys.forEach(k => { const [mk, st] = k.split(':'); (by[mk] = by[mk] || []).push(+st); });
  return Object.keys(MONSTERS).filter(mk => by[mk]).map(mk => ({ mk, stars: by[mk].sort((a, b) => a - b) }));
}
/* 預設選哪一組：自己最近才第一次打贏的（fastMk 的最後一個鍵），沒有就選第一組 */
export function fastDefault(opts, myFast) {
  const ok = k => { const [mk, st] = k.split(':'); return opts.some(o => o.mk === mk && o.stars.includes(+st)); };
  const mine = Object.keys(isObj(myFast) ? myFast : {}).filter(k => fastKeyOk(k) && ok(k));
  if (mine.length) return mine[mine.length - 1];
  return opts.length ? `${opts[0].mk}:${opts[0].stars[0]}` : '';
}

export function fastSpec(board, me, key, myBest) {
  const k = meKey(me), never = !(board.t > 0);
  const mk = fastKeyOk(key) ? key.split(':')[0] : '', star = fastKeyOk(key) ? key.split(':')[1] : '';
  const list = (fastKeyOk(key) && board.fast[key]) || [];
  const rows = list.map((r, i) => {
    const wi = knownWeapon(r.w);
    /* 武器靠小圖認（decorate），字只留戰力：手機上分數那一欄太寬，名字會被擠成一字一行。沒有戰力才補武器名 */
    return { id: 'f' + i, rank: r.r, label: `${r.c}・${r.s}號`, nick: withMark(r.n, r.up), score: `${r.v.toFixed(1)} 秒`, extra: r.pw ? `戰力 ${r.pw}` : wi ? wi.name : '', mine: isMe(r, k), w: r.w };
  });
  const mineRow = list.find(r => isMe(r, k));
  const cut = board.cut['fast:' + key], mine = isNum(myBest) && myBest > 0 ? myBest : 0;
  let out = '';
  if (never || !mk) out = '';
  else if (mineRow) out = mine && mine < mineRow.v - 0.05 ? `你最近有更快的紀錄（${mine.toFixed(1)} 秒），老師下次更新就會算進去。` : '';
  else if (isNum(cut)) {
    if (!mine) out = `打贏它，比 ${cut.toFixed(1)} 秒更快就能上榜！`;
    else if (mine >= cut) out = `再快 ${(round1(mine - cut) + 0.1).toFixed(1)} 秒就上榜！`;
    else out = '你有更快的紀錄，老師下次更新就會算進去（正確率要 90% 以上才算）。';
  } else out = mine ? '你有紀錄了，老師下次更新就會算進去（正確率要 90% 以上才算）。' : '還有位置！打贏它，正確率 90% 以上，就會上榜。';
  return Object.assign({
    id: 'fast:' + key, title: mk ? `${MONSTERS[mk].name} ★${star}` : '最快討伐', subtitle: '只算打贏的那一場，正確率 90% 以上。配裝也算！',
    rows, badges: true,
    emptyText: never ? NEVER : mk ? '這一組還沒有人上榜，你可以當第一個！' : '還沒有人打出最快紀錄。打贏魔物，正確率 90% 以上，就會上榜！',
    outText: out
  }, common(board));
}

export function accSpec(board, me) {
  const k = meKey(me), never = !(board.t > 0), { list, more } = board.acc;
  const rows = list.map((r, i) => ({ id: 'a' + i, rank: '★', label: `${r.c}・${r.s}號`, nick: r.n, score: r.at > 0 ? `${dateText(r.at)}起` : '', mine: isMe(r, k) }));
  const inList = rows.some(r => r.mine);
  const how = 'Lv10 以上的魔物，最近 10 場平均正確率 97% 以上，就會上名單。';
  return Object.assign({
    id: 'acc', title: '這些人都打得又穩又準！', subtitle: `${how}不排名次。`,
    rows, badges: false, mineMark: '← 你',
    footText: more > 0 ? `還有 ${more} 人也很準！` : '',
    emptyText: never ? NEVER : `還沒有人達標，你可以當第一個！${how}`,
    outText: (never || inList) ? '' : more > 0 ? `你說不定也在「還有 ${more} 人」裡面！${how}` : how
  }, common(board));
}

export const RANK_TABS = [['improve', '🌱 進步'], ['fast', '⚡ 最快討伐'], ['acc', '🎯 神準名單']];

/* 打開榮譽碑。me＝ME（className、seat…）；opt.fastMk()＝自己各魔物各星級最快的秒數（NW.fastMk）。
   沒開放（stageOpen('2a') 為假）什麼都不做、也不讀資料：建築本來就鎖著，這裡再擋一次，之後有人從別的入口呼叫也不會透露內容。 */
export function openNwRank(C, me, opt) {
  if (!stageOpen('2a') || document.getElementById('nw-rank')) return null;
  opt = opt || {};
  const k = meKey(me), myFastMk = () => (opt.fastMk && opt.fastMk()) || {};
  const sheet = document.createElement('div');
  sheet.id = 'nw-rank'; sheet.className = 'nw-sheet fixed inset-0 z-[85] grid place-items-center p-3';
  sheet.style.background = 'rgba(9,8,18,.88)';
  const close = () => { document.removeEventListener('keydown', onKey); sheet.remove(); };
  /* 介紹、禮物視窗開在上面時，Esc 要先關它們，不是榮譽碑 */
  const onKey = e => { if (e.key === 'Escape' && document.getElementById('nw-rank') === sheet) { if (document.getElementById('nw-intro') || document.getElementById('nw-gift')) return; close(); } };
  const shell = inner => `<div class="px-panel" style="max-width:560px;width:100%;padding:14px;max-height:92vh;overflow-y:auto;box-sizing:border-box">${inner}
    <div class="text-right mt-3"><button class="px-btn gold" data-x>關閉</button></div></div>`;

  if (!k.grade) {
    sheet.innerHTML = shell(`<div class="px-title" style="font-size:1.4em">🏆 榮譽碑</div>
      <div class="px-panel in px-text mt-3" data-rk-nograde style="padding:14px;text-align:center;line-height:1.7">榮譽碑現在只有四、五、六年級的榜單喔！</div>`);
  } else {
    let tab = 'improve', fastKey = null, data = null;
    const gradeName = { '4': '四', '5': '五', '6': '六' }[k.grade];
    sheet.innerHTML = shell(`<div class="px-title" style="font-size:1.4em" data-rk-head>🏆 榮譽碑・${gradeName}年級</div>
      <p class="px-text" style="color:#aab0d8;font-size:.88em;margin-top:4px;line-height:1.5">榜單由老師更新，剛打完的紀錄要等下次更新才會算進去。</p>
      <div role="tablist" data-rk-tabs style="display:flex;flex-wrap:wrap;gap:6px;margin-top:8px"></div>
      <div data-rk-ctl></div>
      <div data-rk-board style="min-width:0"></div>`);
    const tabsEl = sheet.querySelector('[data-rk-tabs]'), ctl = sheet.querySelector('[data-rk-ctl]'), boardEl = sheet.querySelector('[data-rk-board]');

    const drawTabs = () => {
      tabsEl.innerHTML = RANK_TABS.map(([id, name]) => `<button class="px-btn ${id === tab ? 'gold' : ''}" role="tab" aria-selected="${id === tab}" data-rk-tab="${id}" style="padding:8px 10px;min-width:0;flex:1 1 auto">${name}</button>`).join('');
    };
    const options = () => (data ? fastOptions(data, myFastMk()) : []);
    const drawCtl = () => {
      if (tab !== 'fast' || !data) { ctl.innerHTML = ''; return; }
      const opts = options();
      if (!opts.length) { ctl.innerHTML = ''; return; }
      const [mk, st] = fastKey.split(':');
      const cur = opts.find(o => o.mk === mk) || opts[0];
      ctl.innerHTML = `<div style="display:flex;gap:8px;margin-top:8px;min-width:0">
        <select data-rk-mk class="px-btn" aria-label="魔物" style="flex:1 1 0;min-width:0">${opts.map(o => `<option value="${esc(o.mk)}" ${o.mk === cur.mk ? 'selected' : ''}>${esc(MONSTERS[o.mk].name)}</option>`).join('')}</select>
        <select data-rk-star class="px-btn" aria-label="星級" style="flex:1 1 0;min-width:0">${cur.stars.map(s => `<option value="${s}" ${s === +st ? 'selected' : ''}>★${s}</option>`).join('')}</select></div>`;
    };
    const specFor = () => {
      if (tab === 'improve') return improveSpec(data, me);
      if (tab === 'acc') return accSpec(data, me);
      const mf = myFastMk();
      return fastSpec(data, me, fastKey, mf[fastKey]);
    };
    const ensureKey = () => {
      const opts = options();
      const okNow = fastKey && opts.some(o => o.mk === fastKey.split(':')[0] && o.stars.includes(+fastKey.split(':')[1]));
      if (!okNow) fastKey = fastDefault(opts, myFastMk());
    };
    /* 小武器圖：榜上的武器字是別人寫的，weaponInfo 認得才畫，畫不出來（新武器還沒有圖）就不放，不要弄壞整個榜 */
    const decorate = () => {
      if (tab !== 'fast' || !data) return;
      (data.fast[fastKey] || []).forEach((r, i) => {
        const row = boardEl.querySelector(`[data-rbid="f${i}"]`);
        if (!row || !r.w || row.querySelector('canvas')) return;
        try {
          const c = PX.canvas('weapon', r.w, 1, false);
          c.setAttribute('role', 'img'); c.setAttribute('aria-label', knownWeapon(r.w).name); c.title = knownWeapon(r.w).name;
          c.style.cssText = 'flex:none;width:28px;height:28px;image-rendering:pixelated';
          row.insertBefore(c, row.children[1]);
        } catch (e) { /* 沒有圖就只留文字 */ }
      });
    };
    const paint = () => { if (!data) return; if (tab === 'fast') ensureKey(); drawTabs(); drawCtl(); boardEl.innerHTML = rankBoardHtml(specFor()); decorate(); };

    const rb = mountRankBoard(boardEl, {
      alive: () => sheet.isConnected,
      load: async force => { const d = await loadBoard(C, k.grade, !!force); return d; },
      shell: () => ({ id: 'rank', title: '榮譽碑', refresh: false, updatedAt: null, errorText: C.online() ? '榮譽碑現在讀不到，等一下再試試看。' : '現在連不上網路，榮譽碑讀不到。' }),
      toSpec: d => { data = d; if (tab === 'fast') ensureKey(); drawCtl(); return specFor(); },
      onData: d => { if (d) decorate(); }
    });

    sheet.addEventListener('click', e => {
      const t = e.target.closest('[data-rk-tab]');
      if (t) { tab = t.dataset.rkTab; if (data) paint(); else drawTabs(); }
    });
    sheet.addEventListener('change', e => {
      if (e.target.matches('[data-rk-mk]')) { const o = options().find(x => x.mk === e.target.value); if (o) { const [, st] = fastKey.split(':'); fastKey = `${o.mk}:${o.stars.includes(+st) ? st : o.stars[0]}`; paint(); } }
      if (e.target.matches('[data-rk-star]')) { fastKey = `${fastKey.split(':')[0]}:${e.target.value}`; paint(); }
    });
    drawTabs();
    rb.run(false);
  }
  sheet.addEventListener('click', e => { if (e.target.closest('[data-x]') || e.target === sheet) close(); });
  document.addEventListener('keydown', onKey);
  document.body.appendChild(sheet);
  return sheet;
}
