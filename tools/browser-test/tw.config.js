/* 測試用：把 index.html 與各 js 裡用到的 Tailwind class 編成靜態 CSS（見 tw.js） */
const path = require('path');
const root = path.join(__dirname, '../..');
module.exports = { content: [path.join(root, 'index.html'), path.join(root, '*.js')], theme: { extend: {} } };
