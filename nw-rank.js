import { MONSTERS, REGIONS } from './nw-data.js';

const TABS = [
  ['hr', '獵人等級', r => r.hr * 1000 + r.hrExp, r => `Lv ${r.hr}`],
  ['fast', '最快討伐', null, null],
  ['dex', '圖鑑', r => r.dexN * 100 + r.starN, r => `${r.dexN} 種魔物・${r.starN} 區 ★5`],
  ['acc', '精準獵人', r => r.acc, r => `${r.acc.toFixed(0)}%（${r.accN} 場）`]
];

const MIN_ACC_RUNS = 10;

function digest(id, d) {
  const n = d.nw;
  if (!n || typeof n !== 'object') return null;
  const s = n.stat || {};
  const zone = n.zone || {};
  return {
    id, name: d.name || '？', cls: d.className || '', title: n.title || '',
    hr: n.hr || 1, hrExp: n.hrExp || 0,
    dexN: Object.values(n.dex || {}).filter(v => v > 0).length,
    starN: Object.values(zone).filter(v => v >= 5).length,
    fastest: n.fastest || {},
    accN: s.accN || 0,
    acc: s.accN >= MIN_ACC_RUNS ? s.accSum / s.accN : -1,
    hunts: n.hunts || 0
  };
}

export async function loadNwRows(C) {
  const snap = await C.withTimeout(C.getDocs(C.query(C.collection(C.db, 'mg_scores'))), 8000, '讀取逾時');
  const rows = [];
  snap.forEach(d => { const r = digest(d.id, d.data()); if (r && r.hunts > 0) rows.push(r); });
  return rows;
}

export function rankList(rows, tab, fastKey) {
  if (tab === 'fast') {
    return rows.filter(r => r.fastest[fastKey] > 0).sort((a, b) => a.fastest[fastKey] - b.fastest[fastKey])
      .map(r => ({ r, label: `${r.fastest[fastKey].toFixed(1)} 秒` }));
  }
  const t = TABS.find(x => x[0] === tab);
  const list = tab === 'acc' ? rows.filter(r => r.acc >= 0) : rows;
  return list.slice().sort((a, b) => t[2](b) - t[2](a)).filter(r => tab !== 'dex' || r.dexN > 0)
    .map(r => ({ r, label: t[3](r) }));
}

export function openNwRank(C, meId, esc) {
  const sheet = document.createElement('div');
  sheet.id = 'nw-rank'; sheet.className = 'fixed inset-0 z-[85] grid place-items-center p-4';
  sheet.style.background = 'rgba(9,8,18,.88)';
  let rows = null, tab = 'hr', fastKey = 'grass:1';
  const fastKeys = [...new Set(Object.keys(REGIONS).filter(rk => !REGIONS[rk].wip).flatMap(rk => [1, 2, 3, 4, 5].map(s => rk + ':' + s)))];
  const medal = i => ['🥇', '🥈', '🥉'][i] || `${i + 1}.`;

  function draw() {
    const body = sheet.querySelector('[data-body]');
    if (!rows) { body.innerHTML = '<p class="px-text text-center" style="color:#aab0d8">載入中…</p>'; return; }
    const list = rankList(rows, tab, fastKey);
    const mine = list.findIndex(x => x.r.id === meId);
    const row = (x, i, me) => `<div class="px-panel in flex items-center gap-2" style="padding:6px 10px;${me ? 'outline:3px solid #ffd24a' : ''}">
      <b class="px-text" style="width:2.4em">${medal(i)}</b>
      <span class="px-text flex-1" style="font-weight:900">${esc(x.r.cls)} ${esc(x.r.name)}${x.r.title ? ` <span class="px-chip" style="color:#ffd24a">${esc(x.r.title)}</span>` : ''}</span>
      <span class="px-text" style="color:#ffd98a">${x.label}</span></div>`;
    const top = list.slice(0, 10).map((x, i) => row(x, i, x.r.id === meId)).join('');
    const hint = tab === 'acc' ? `Lv20 以上的平均正確率，至少打 ${MIN_ACC_RUNS} 場才會上榜。`
      : tab === 'fast' ? '只算打贏的那一場。' : '';
    body.innerHTML = `${tab === 'fast' ? `<select data-fk class="px-btn" style="margin-bottom:8px">${fastKeys.map(k => {
      const [rk, s] = k.split(':'); return `<option value="${k}" ${k === fastKey ? 'selected' : ''}>${REGIONS[rk].name} ★${s}</option>`;
    }).join('')}</select>` : ''}
      <div class="flex flex-col gap-1">${top || '<p class="px-text text-center" style="color:#aab0d8;padding:18px 0">還沒有人上榜，你當第一個吧！</p>'}</div>
      ${mine >= 10 ? `<div class="px-text mt-2" style="color:#aab0d8">你的名次</div>${row(list[mine], mine, true)}` : ''}
      ${mine < 0 && top ? '<p class="px-text mt-2 text-sm" style="color:#aab0d8">你還沒上這一榜，再多打幾場！</p>' : ''}
      ${hint ? `<p class="text-xs mt-2" style="color:#aab0d8">${hint}</p>` : ''}`;
  }

  sheet.innerHTML = `<div class="px-panel" style="max-width:520px;width:100%;padding:16px;max-height:90vh;overflow-y:auto">
    <div class="px-title" style="font-size:1.5em;margin-bottom:8px">🏆 獵人排行</div>
    <div class="flex gap-1 flex-wrap mb-2">${TABS.map(t => `<button class="px-btn ${t[0] === tab ? 'gold' : ''}" data-tab="${t[0]}">${t[1]}</button>`).join('')}</div>
    <div data-body></div>
    <div class="text-right mt-3"><button class="px-btn gold" data-x>關閉</button></div></div>`;
  sheet.addEventListener('click', e => {
    if (e.target.closest('[data-x]') || e.target === sheet) { sheet.remove(); return; }
    const t = e.target.closest('[data-tab]');
    if (t) { tab = t.dataset.tab; sheet.querySelectorAll('[data-tab]').forEach(b => b.classList.toggle('gold', b === t)); draw(); }
  });
  sheet.addEventListener('change', e => { if (e.target.matches('[data-fk]')) { fastKey = e.target.value; draw(); } });
  document.body.appendChild(sheet);
  draw();
  loadNwRows(C).then(r => { rows = r; draw(); })
    .catch(() => { sheet.querySelector('[data-body]').innerHTML = '<p class="px-text text-center" style="color:#ff8a9c">讀不到排行榜，等一下再試試看</p>'; });
}
