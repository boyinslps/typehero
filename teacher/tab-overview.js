/* 📊 總覽（SPEC §2.2）：數字卡、「今天要做的事」、三個捷徑。卡片點下去到對應的分頁（帶篩選）。 */
import { loadScores, loadBoard, loadFlags, loadEvents, nameChanged, pendingAwards } from './data.js';
import { twDay, normalizeEvent, phaseOf } from './nw.js';
import { esc, fmtT, helpBox } from './util.js';

const SOON_MS = 48 * 3600 * 1000;   // 「快結束」的意思：兩天內

export default async function mount(el, ctx) {
  const [scores, board, flags, events] = await Promise.all([loadScores(true), loadBoard(true), loadFlags(true), loadEvents(true)]);
  const now = Date.now(), today = twDay(now);
  const online = scores.filter(s => s.last && twDay(s.last) === today).length;
  const players = scores.filter(s => s.played).length;
  /* 壞資料的活動（normalizeEvent 回 null）不算，跟學生端看到的一致 */
  const evs = events.map(e => normalizeEvent(e.id, e)).filter(Boolean);
  const active = evs.filter(e => phaseOf(e, now) === 'active').length, soon = evs.filter(e => phaseOf(e, now) === 'soon').length;
  const ending = evs.filter(e => phaseOf(e, now) === 'active' && e.endAt - now <= SOON_MS);
  const pend = pendingAwards(events, now);
  const pending = flags.filter(f => f.type === 'bug' && (f.status || 'pending') === 'pending').length;
  const unread = flags.filter(f => f.type === 'feedback' && !f.read).length;
  const warn = scores.filter(s => s.played && nameChanged(s, board[s.id])).length;

  const card = (key, label, val, go, cls = '', sub = '') =>
    `<button class="card ${cls}" data-card="${key}" data-go="${go}"><span class="dim">${esc(label)}</span><b>${val}</b>${sub ? `<span class="dim" style="font-size:.85em">${sub}</span>` : ''}</button>`;
  /* 今天要做的事：只列真的要動作的；每一行點下去就到那裡 */
  const todo = [];
  if (pend.length) pend.forEach(ev => todo.push({ k: 'award', go: 'events', params: { open: ev.id }, text: `排行榜「${esc(ev.title)}」結束了，還沒發獎`, cls: 'warn' }));
  if (pending) todo.push({ k: 'bugs', go: 'bugs', text: `有 ${pending} 則回報等你審核`, cls: 'warn' });
  if (warn) todo.push({ k: 'warn', go: 'students', params: { warn: true }, text: `有 ${warn} 位同學換過名字，信箱先鎖著，要你確認`, cls: 'warn' });
  ending.forEach(ev => todo.push({ k: 'ending', go: 'events', params: { open: ev.id }, text: `活動「${esc(ev.title)}」快結束了（${esc(fmtT(ev.endAt))}）`, cls: '' }));
  if (unread) todo.push({ k: 'unread', go: 'feedback', params: { unread: true }, text: `有 ${unread} 則回饋還沒看`, cls: '' });
  el.innerHTML = `<h2>📊 總覽</h2>
    ${helpBox(['先看「今天要做的事」：有紅色的就是要你動手的，點一下就會跳到那一頁。', '下面的數字卡也可以點，會帶你到對應的分頁（而且已經篩好）。', '最常用的三件事在最下面的「快速開始」：寄信、開活動、審回報。', '左邊的分頁各管一件事；每一頁標題下面都有「？這頁怎麼用」。'])}
    <h3 style="margin-top:0">今天要做的事</h3>
    <div class="px-panel in" data-todolist>${todo.length ? `<ul style="list-style:none;margin:0;padding:0">${todo.map((t, i) => `<li style="padding:4px 0"><button class="px-btn sm ${t.cls === 'warn' ? 'gold' : ''}" data-todo="${i}" data-todo-k="${t.k}">${t.text}</button></li>`).join('')}</ul>` : '<span class="dim" data-todo-none>今天沒有要處理的事，可以放心。</span>'}</div>
    <h3>數字一覽</h3>
    <div class="cards">
      ${card('online', '今天上線', online, 'students', '', `共 ${scores.length} 人有存檔`)}
      ${card('players', '新世界玩家', players, 'students')}
      ${card('events', '活動', `${active}<span class="dim" style="font-size:.5em"> 進行中</span>`, 'events', '', `排程中 ${soon}`)}
      ${card('award', '待發獎', pend.length, 'events', pend.length ? 'alert' : '', '排行榜結束了還沒發獎')}
      ${card('pending', '待審回報', pending, 'bugs', pending ? 'alert' : '')}
      ${card('unread', '未讀回饋', unread, 'feedback')}
      ${card('warn', '⚠ 換過名字', warn, 'students', warn ? 'alert' : '', '信箱先鎖著，等你按「名字沒問題」')}
    </div>
    <h3>快速開始</h3>
    <div class="row gap">
      <button class="px-btn gold" data-go="mail">✉ 寄信</button>
      <button class="px-btn gold" data-go="events" data-new="1">🎪 開活動</button>
      <button class="px-btn gold" data-go="bugs">🐛 審回報</button>
    </div>
    <p class="dim" style="margin-top:14px">「今天」是台灣時間的今天；「上線」是看存檔最後存的時間。</p>`;
  el.addEventListener('click', e => {
    const t = e.target.closest('[data-todo]');
    if (t) { const x = todo[+t.dataset.todo]; ctx.go(x.go, x.params); return; }
    const b = e.target.closest('[data-go]'); if (!b) return;
    const c = b.dataset.card;
    ctx.go(b.dataset.go, c === 'warn' ? { warn: true } : c === 'players' ? { played: true } : c === 'online' ? { today: true } : c === 'unread' ? { unread: true }
      : c === 'award' && pend.length === 1 ? { open: pend[0].id } : undefined);
  });
}
