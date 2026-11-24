/* 分頁清單（SPEC §2.2）。要加分頁：在這裡加一筆、新增 teacher/tab-xxx.js，其他不用動。
   load 用動態 import：一個分頁壞掉（語法錯誤）不會讓整個管理頁打不開。
   每個分頁檔 export default async function mount(el, ctx, params)：
     el＝內容容器；ctx＝{ user, go(id, params), tab }；params＝別的分頁用 ctx.go 帶來的東西。
     回傳一個函式的話，離開這個分頁時會呼叫它（清計時器、事件監聽）。 */
export const TABS = [
  { id: 'overview', icon: '📊', title: '總覽', load: () => import('./tab-overview.js') },
  { id: 'students', icon: '👥', title: '學生', load: () => import('./tab-students.js') },
  { id: 'mail', icon: '✉', title: '信箱', load: () => import('./tab-mail.js') },
  { id: 'events', icon: '🎪', title: '活動', load: () => import('./tab-events.js') },
  { id: 'news', icon: '📢', title: '公告', load: () => import('./tab-news.js') },
  { id: 'feedback', icon: '💬', title: '回饋', load: () => import('./tab-feedback.js') },
  { id: 'bugs', icon: '🐛', title: '回報與抓蟲榜', load: () => import('./tab-bugs.js') },
  { id: 'rank', icon: '🏆', title: '榮譽碑', load: () => import('./tab-rank.js') },
  { id: 'settings', icon: '⚙', title: '設定', load: () => import('./tab-settings.js') }
];
