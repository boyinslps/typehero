/* 雲端連不到 cdn.tailwindcss.com，測試把它換成預先編好的 CSS。
   沒有 CSS 時 `fixed inset-0` 這類 class 全部失效，蓋在村莊上的視窗會被地圖擋住、按鈕點不到
   （nw1／nw4 曾因此失敗，不是程式的問題）。所以沒有 OUT/tw.css 就自動編一份。 */
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
module.exports = function twCss(OUT) {
  const f = path.join(OUT, 'tw.css');
  if (!fs.existsSync(f)) {
    try {
      execFileSync('npx', ['--yes', 'tailwindcss@3.4.17', '-c', path.join(__dirname, 'tw.config.js'), '-i', path.join(__dirname, 'tw-in.css'), '-o', f], { stdio: 'ignore', timeout: 120000 });
    } catch (e) { console.warn('！編 Tailwind CSS 失敗，有些按鈕會被擋住：', e.message); }
  }
  return fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : '';
};
