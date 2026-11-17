/* 文件 ID「班級_座號」拆開。獨立一支是因為 migrate.js 要在 node 直接測，不能 import 有 https 的 fb.js。 */
export const idParts = id => { const m = /^(.+)_(\d+)號$/.exec(id || ''); return m ? { className: m[1], seat: +m[2] } : { className: '', seat: 0 }; };
