/* 💬 回饋 的占位。下一步（後半）把整個檔案換成真的內容，介面不變：export default async function mount(el, ctx, params)。 */
import { placeholder } from './util.js';

export default async function mount(el) {
  placeholder(el, '💬 回饋', '§6.1', '資料在 <code>mg_nw_flags</code>（<code>type: feedback</code>）；「已讀」欄位用 <code>read: true</code>，總覽的「未讀回饋」就是數沒有 <code>read</code> 的。');
}
