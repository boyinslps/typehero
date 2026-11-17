/* 📊 總覽（SPEC §2.2）：六張數字卡＋三個捷徑。卡片點下去到對應的分頁。 */
import { loadScores, loadBoard, loadFlags, loadEvents, nameChanged } from './data.js';
import { twDay, normalizeEvent, phaseOf } from './nw.js';
import { esc } from './util.js';

export default async function mount(el, ctx) {
  const [scores, board, flags, events] = await Promise.all([loadScores(true), loadBoard(true), loadFlags(true), loadEvents(true)]);
  const now = Date.now(), today = twDay(now);
  const online = scores.filter(s => s.last && twDay(s.last) === today).length;
  const players = scores.filter(s => s.played).length;
  /* 壞資料的活動（normalizeEvent 回 null）不算，跟學生端看到的一致 */
  const evs = events.map(e => normalizeEvent(e.id, e)).filter(Boolean);
  const active = evs.filter(e => phaseOf(e, now) === 'active').length, soon = evs.filter(e => phaseOf(e, now) === 'soon').length;
  const pending = flags.filter(f => f.type === 'bug' && (f.status || 'pending') === 'pending').length;
  const unread = flags.filter(f => f.type === 'feedback' && !f.read).length;
  const warn = scores.filter(s => s.played && nameChanged(s, board[s.id])).length;

  const card = (key, label, val, go, cls = '', sub = '') =>
    `<button class="card ${cls}" data-card="${key}" data-go="${go}"><span class="dim">${esc(label)}</span><b>${val}</b>${sub ? `<span class="dim" style="font-size:.85em">${sub}</span>` : ''}</button>`;
  el.innerHTML = `<h2>📊 總覽</h2>
    <div class="cards">
      ${card('online', '今天上線', online, 'students', '', `共 ${scores.length} 人有存檔`)}
      ${card('players', '新世界玩家', players, 'students')}
      ${card('events', '活動', `${active}<span class="dim" style="font-size:.5em"> 進行中</span>`, 'events', '', `排程中 ${soon}`)}
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
    <p class="dim" style="margin-top:14px">今天＝台灣時間的今天；「上線」看存檔的最後存檔時間。</p>`;
  el.addEventListener('click', e => {
    const b = e.target.closest('[data-go]'); if (!b) return;
    ctx.go(b.dataset.go, b.dataset.card === 'warn' ? { warn: true } : b.dataset.card === 'players' ? { played: true } : b.dataset.card === 'unread' ? { unread: true } : b.dataset.new ? { new: true } : undefined);
  });
}
