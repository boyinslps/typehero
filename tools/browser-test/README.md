# 瀏覽器實測（假 Firebase）

雲端開發環境連不到 CDN（Firebase、Tailwind 都會被擋），所以用 Playwright 攔截
Firebase 的三個模組，換成 `mock/` 裡的記憶體版資料庫（`window.__FS`）。
彩帶特效（confetti）與截圖（html2canvas）也換成空函式。版面沒有 Tailwind 樣式是正常的。

```bash
cd typehero && python3 -m http.server 8765
```

```bash
NODE_PATH=$(npm root -g) node tools/browser-test/seg0.test.js /tmp
```

`seg0.test.js` 測第 0 段（v3.3.0）：
- 舊公式紀錄（101.8 分）登入時提示改版；新公式紀錄顯示「最佳一場」
- 排行榜預設只列新公式，勾選後舊紀錄標「舊版」
- 天賦按鈕在點數夠時有 `can-buy`
- 打一場正確率 50%：跳提醒、最高戰績分不變
- 再打一場正確率 100%：換成新公式分數（`scoreVer: 2`）

測試資料放在檔案開頭的 `seed`，文件路徑格式是 `集合/文件ID`。
新增的 Firebase 函式（例如 `increment`、`arrayUnion`）要記得在 `mock/fs.js` 補上。

`nw3.test.js` 測標點符號挑戰獎勵：老師勾選發放 → 打完跳出搶先體驗券並自動開通、不勾選則什麼都不發生。

`nw.test.js` 測新世界預告＋提名投票（v3.6.0）：
- 11 個關鍵字、16 頁，桌面與手機每一頁都不捲動、各頁內容（故事、獵人村、委託板、背包、稱號、戰鬥、魔物…）、點魔物換生氣、投票頁的怎麼選說明、沒填身分時輸入框停用、四個分類提名／投票／重複提名、翻頁、老師隱藏與恢復、排序、無 JS 錯誤
- 要看版面需要 `OUT/tw.css`（本機生成的 Tailwind），沒有也能跑，只是沒樣式

```bash
NODE_PATH=$(npm root -g) node tools/browser-test/nw.test.js /tmp
```
