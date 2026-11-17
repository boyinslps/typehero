/* 🎪 活動 的占位。下一步（後半）把整個檔案換成真的內容，介面不變：export default async function mount(el, ctx, params)。 */
import { placeholder } from './util.js';

export default async function mount(el) {
  placeholder(el, '🎪 活動', '§4.4', '類型、範本、排程、發獎快照都在規格 §4。範本在 <code>nw-data.js</code> 的 <code>EVENT_TEMPLATES</code>（從 <code>teacher/nw.js</code> import）。');
}
