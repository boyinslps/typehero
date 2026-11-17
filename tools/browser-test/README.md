# 瀏覽器實測（假 Firebase）

雲端開發環境連不到 CDN（Firebase、Tailwind 都會被擋），所以用 Playwright 攔截
Firebase 的三個模組，換成 `mock/` 裡的記憶體版資料庫（`window.__FS`）。
彩帶特效（confetti）與截圖（html2canvas）也換成空函式。

**Tailwind 要編成靜態 CSS**：`cdn.tailwindcss.com` 同樣連不到，測試改注入 `tw.js` 編好的 CSS（第一次跑會用 `npx tailwindcss@3.4.17` 編到 `OUT/tw.css`，之後重用；`tw.config.js` 掃 `index.html` 與根目錄的 js）。
沒有這份 CSS 時 `fixed inset-0` 這類 class 全部失效，蓋在村莊上的視窗被地圖擋住、按鈕點不到（nw1／nw4 曾經因此失敗，是測試環境的問題，不是程式）。
版面有改 class 時，刪掉 `OUT/tw.css` 重編。

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
新增的 Firebase 函式要記得在 `mock/fs.js`／`mock/auth.js` 補上。

### 假 Firebase 支援什麼（`mock/`）
- Firestore：`where`（`== != < <= > >= in not-in array-contains array-contains-any`，欄位可寫 `a.b.c`）、`orderBy`、`limit`、`getCountFromServer`、`writeBatch`、`updateDoc`、`increment`／`arrayUnion`／`arrayRemove`／`deleteField`、`serverTimestamp`（存成時間，讀回來有 `toMillis()`／`toDate()`）、`onSnapshot`（文件與查詢）。`getDocs` 只回直接子文件。
- 具名 app：`initializeApp(cfg, 'admin')`；每個 app 一個 auth。`signInWithEmailAndPassword`、`signOut`、`setPersistence`（記在 `window.__LAST_PERSISTENCE`）、`browserLocalPersistence`／`browserSessionPersistence`。「記住這台電腦」會存進 localStorage／sessionStorage，重新整理還在。
- 老師帳號：預設 `teacher@example.test`／`pw-ok`／uid `T1`（`window.__MOCK_ADMIN` 可換）；`window.__ADMIN_PRESIGNED = { uid, email }` 一開始就登入。
- `window.__SERVER_SKEW_MS`：模擬學生電腦時間不準（伺服器時間＝本機＋這個數）。
- `window.__RULES = true`：照正式規則的重點擋寫入與讀取（老師寫入要 admin app 登入、且 `mg_admins/{uid}` 存在；學生不能讀 `mg_nw_flags`、`mg_gift_used` 只能 create…）。**這是簡化版**，正式內容以 `firestore-rules.txt` 與 `tools/rules-test/` 為準。預設關閉，新測試請打開。
- `window.__READS`、`window.__WRITES`：讀寫紀錄（路徑、哪個 app），用來斷言「學生端沒讀過某集合」「老師的寫入走 admin」。

`nw4.test.js` 測新世界禮物與回饋：登入通知、提前送測試者之刃、換裝備導覽（三步一直等）、背包換裝、委託板任務目標標籤、測試魔物名稱、回饋視窗給字元、序號兌換、教學大樓閃避課（演示、沒做到重來、做對才過、按 Enter 不會重複彈出、五下打怪）、第一次進村與進教學大樓的介紹、回報問題（兩格說明與好壞例子、待老師確認、確認後才領獎）、職業除錯師稱號領取、導覽太快關背包會退回與測試員手冊。

`nw10.test.js` 測第 6 步村莊延伸（32×22 格）：每棟建築（含未開放）門口走得到、出生點三步內到委託板與佈告欄、建築／門口／郵筒／傳送門不重疊、鏡頭兩個方向都能捲且碰到邊緣就停、捲動後點地面走到那一格、小地圖（傳送到門口、空地不動、視窗蓋著不能點）、熱區名牌與 Enter 提示不重疊（桌機倍率 4、手機倍率 2）、`posV` 不是 2 的舊座標回出生點、地板箭頭、手機 390 寬不橫向捲出頁面且小地圖不擋按鈕。截圖 `nw10-desktop.png`、`nw10-mobile.png`、全地圖 `nw10-map.png`。測試用 `window.__NWV`（只在 localhost 才有）讀位置、傳送、走路。

`nw5.test.js` 測 A 版（教師管理頁規格 §1.4～§1.7，開 `__RULES`）：房間改存 `mg_rooms`、序號（一人一份 `mg_gift_used`、同一人換電腦不能再領、次數上限用 count、舊版 `used` 也算）、回報不帶 `claimed`、學生端不讀 `mg_nw_flags`、`mg_bugboard` 同步（件數取 max、抓蟲分、詞條）、存檔最外層 `nwCls`／`nwEvDone`、`mg_clock` 時差、冒名鎖（基準 `nameOk`／`name0`、`namechg` 固定 ID、改回原名自動解鎖、全半形與空白）。

`nw6.test.js` 測舊控制台的老師登入：過「teacher」那道門後跳 email 登入、錯誤訊息、非老師帳號被擋並登出、記住這台電腦（Local／Session）、重開還在、取消後控制台只看不寫、開戰／設定／序號／清空成績都走 admin 身分、序號「用掉幾次」用 count、回饋按鈕連到 `teacher.html`。

`nw3.test.js` 測標點符號挑戰（打完自動開放、太早按「學會了」會提醒、老玩家不重跳門票）：兩組教學一次看完（Shift 4 個符號、Ctrl 5 個符號，含上下引號選字動畫）、動畫分步驟、演完才能按「學會了」、每組練 3 個、打怪挑戰（5 句、每句 ≤8 字且字標點混用）、章章列與過關橫幅，以及獎勵：老師勾選發放 → 打完跳出新世界門票並自動開通、不勾選則什麼都不發生。

`nw.test.js` 測新世界預告＋提名投票（v3.6.0）：
- 11 個關鍵字、16 頁，桌面與手機每一頁都不捲動、各頁內容（故事、獵人村、委託板、背包、稱號、戰鬥、魔物…）、點魔物換生氣、投票頁的怎麼選說明、沒填身分時輸入框停用、四個分類提名／投票／重複提名、翻頁、老師隱藏與恢復、排序、無 JS 錯誤
- 要看版面需要 `OUT/tw.css`（本機生成的 Tailwind），沒有也能跑，只是沒樣式

```bash
NODE_PATH=$(npm root -g) node tools/browser-test/nw.test.js /tmp
```
