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
- `window.__FAIL_WRITES`：路徑符合這個正規表示式的寫入一律丟「連不上」（code `unavailable`），測離線補寫用（例 `'^mg_nw_(runs|flags)/'`）。
- `window.__READS`、`window.__WRITES`：讀寫紀錄（路徑、哪個 app），用來斷言「學生端沒讀過某集合」「老師的寫入走 admin」。

`nw4.test.js` 測新世界禮物與回饋：登入通知、提前送測試者之刃、換裝備導覽（三步一直等）、背包換裝、委託板任務目標標籤、測試魔物名稱、回饋視窗給字元、序號兌換、教學大樓閃避課（演示、沒做到重來、做對才過、按 Enter 不會重複彈出、五下打怪）、第一次進村與進教學大樓的介紹、回報問題（兩格說明與好壞例子、待老師確認、確認後才領獎）、職業除錯師稱號領取、導覽太快關背包會退回與測試員手冊。

`nw10.test.js` 測第 6 步村莊延伸（32×22 格）：每棟建築（含未開放）門口走得到、出生點三步內到委託板與佈告欄、建築／門口／郵筒／傳送門不重疊、鏡頭兩個方向都能捲且碰到邊緣就停、捲動後點地面走到那一格、小地圖（傳送到門口、空地不動、視窗蓋著不能點）、熱區名牌與 Enter 提示不重疊（桌機倍率 4、手機倍率 2）、`posV` 不是 2 的舊座標回出生點、地板箭頭、手機 390 寬不橫向捲出頁面且小地圖不擋按鈕。截圖 `nw10-desktop.png`、`nw10-mobile.png`、全地圖 `nw10-map.png`。測試用 `window.__NWV`（只在 localhost 才有）讀位置、傳送、走路。

`t1.test.js` 測第 7 步前半的教師管理頁（開 `__RULES`）：非老師帳號被擋、總覽、👥 學生（篩選、排序、學生卡）、✉ 信箱（三種收件人、排程、過期、預覽、收回、confirmBig）、📢 公告（新增、編輯不重跳、置頂、刪除）、⚙ 設定（一次搬移的預覽與執行、重按不重複、班級人數、操作紀錄）；寫完的資料搬給學生頁驗證收得到。

`nw7.test.js` 測第 3 步信箱與暱稱（開 `__RULES`）：郵筒與背包信箱、三種收件人、排程與過期（用伺服器時間）、全部領取、未知 type 整封不領、重複領不到、雙分頁、名字不同被鎖、暱稱（詞庫組合、取了就固定、改名卡）、班級短碼。

`nw8.test.js` 測第 4 步活動學生端（開 `__RULES`）：boost／hunt／classwar／ranking 的結算、時間外不算、結束後 5 分鐘緩衝、班級限制、只算有效場、全班獎只領一次、活動榜（前 10＋自己、榜外文字、進步獎 base 用活動前紀錄）、30 天清除、活動被刪的取消提示；純函式（`nw-events.js`）直接在 node 測。

`nw9.test.js` 測第 5 步佈告欄建築與三分頁（公告｜活動｜抓蟲榜）：老師公告排序與跳一次、新人不跳、「！」與小紅點、抓蟲榜名次與同分、班級短碼、不顯示真名、榜外文字、抓蟲徽章通知、活動榜不顯示超出合理範圍的分數。

`t2.test.js` 測第 7 步後半的教師管理頁（開 `__RULES`，老師頁寫完的資料搬給學生頁驗證）：
- 🎪 活動：四種活動新增（ID 檢查、範本預填、只顯示該類型欄位、預覽）、學生端看得到、開始後欄位鎖住（含倍數、至少打幾場、對象班級）且只能延長、達標獎勵仍可加碼、排程中可全改、提早結束、進行中的班級達標率與前 10 名（⚠）、ranking 發獎（⚠ 預設不勾但保留參加獎、同分並列、三級獎品、參加獎、confirmBig、重按與中途失敗重寄不重複、快照不含真名）、再開一次、刪除。
- 💬 回饋：每隻魔物三種評價統計、篩選、已讀、不混進回報。
- 🐛 回報：確認（分數、`firstAt` 用送出時間、獎勵信）、重按不重複加分、重複、不採用、超過字元上限只寄感謝、撤銷、抓蟲榜、手動加分（含負分）、隱藏暱稱、頒發職業除錯師、寄獎給前 N 名；學生端領信、榜單更新、稱號。
- 總覽數字、手機 390 寬。

`t3.test.js` 測教師管理頁審查後的修正（`docs/research/TEACHER-ADMIN-REVIEW.md` 的必改 M1～M6、建議 S1～S5，開 `__RULES`）：
- M1 老師打的理由與真名不進 `mg_bugboard`（理由只在 `mg_bugboard_private` 與操作紀錄、名字沒問題只存雜湊、回覆另外寄信、學生「我的回報」看得到信裡那句）；M2 用 CDP `Input.imeSetComposition` 模擬注音輸入（學生頁、信箱頁、手動加分的搜尋框）；M3 信箱預設不選收件人、全校＋禮物多一道確認、24 小時內重複提醒；M4 點背景／Esc 先問要不要放棄；M5 已經有信寄出就不能重新排名；M6 總覽與活動頁的待發獎提醒。
- S1 班級快覽與相對時間、S2 多人手動加分與搜尋認得「503 5」、S3 活動表單、S4 手機 390 寬按鈕不被切掉、S5 白話與空狀態。

`t4.test.js` 測教師頁「👥 學生」的人物卡（開 `__RULES`）：點名字開卡、角色 canvas（整數倍率、呼吸動畫、減少動態時關閉）、暱稱／稱號／HR／武器名稱、裝備格（武器有圖、其他暗色＋）、小資訊列、沒進過新世界／沒造型不壞、◀ ▶ 與左右鍵（確認視窗開著不換人）、Esc／背景關閉、看詳細資料開文字版學生卡、寄信、隱藏暱稱、名字沒問題、手機 390 不橫向捲動。截圖 `/tmp/card-desktop.png`、`/tmp/card-mobile.png`。

`t5.test.js` 測教師頁「給東西」與「🏷 頒稱號」（開 `__RULES`，教師頁寄的信搬給學生頁驗證）：禮物種類涵蓋所有學生端 type、清單＝資料表（`WORDS` 三組、`GIFT_WEAPONS`、`ITEM_DEFS`、材料、圖紙、區域、圖鑑、教學課）、**動態塞假稱號／道具／武器／材料／圖紙進資料表後清單自動出現**、稱號搜尋與解鎖條件、範圍與 `confirmBig` 防呆；人物卡與學生卡的「頒稱號」（已擁有／已寄出標示、固定 ID 不重複寄、操作紀錄）、「給東西」帶收件人、顯示他有的稱號／材料／圖紙／道具／武器；學生端領稱號（通知、解鎖、背包戴上）、`bp`／`hr`／`zone`／`dex`／`tut`／`mat`／`word` 各領一次、重複不加（不往下）、狀態類禮物領完立刻重算任務、10 種不認得的信整封不領。

`nw5.test.js` 測 A 版（教師管理頁規格 §1.4～§1.7，開 `__RULES`）：房間改存 `mg_rooms`、序號（一人一份 `mg_gift_used`、同一人換電腦不能再領、次數上限用 count、舊版 `used` 也算）、回報不帶 `claimed`、學生端不讀 `mg_nw_flags`、`mg_bugboard` 同步（件數取 max、抓蟲分、詞條）、存檔最外層 `nwCls`／`nwEvDone`、`mg_clock` 時差、冒名鎖（基準 `nameOk`／`name0`、`namechg` 固定 ID、改回原名自動解鎖、全半形與空白）。

`nw6.test.js` 測舊控制台的老師登入：過「teacher」那道門後跳 email 登入、錯誤訊息、非老師帳號被擋並登出、記住這台電腦（Local／Session）、重開還在、取消後控制台只看不寫、開戰／設定／序號／清空成績都走 admin 身分、序號「用掉幾次」用 count、回饋按鈕連到 `teacher.html`。

`nw12.test.js` 測第 2 段 2b 鐵匠鋪＋倉庫（`window.__NW_STAGES__ = ['1','2b']` 開放，預設 `OPEN_STAGES` 只有 `'1'`）：純函式（配方、任意材料先扣最多的、材料不夠的「還差」、強化成本、戰力、×1.32 上限、圖紙保底、結算提示）、2b 沒開放時鐵匠鋪是施工中且不冒煙、開放後鐵匠鋪冒火花＋「！」、第一次進去送 4 張布裝圖紙且只送一次、圖紙發亮排前面、材料不夠按鈕灰、點別種材料換掉要用的材料、打造敲三下→「要穿上嗎」→穿上、雙分頁（雲端存檔較新時先同步、不重複扣）、背包五格裝備格與裝備／材料／圖紙分頁、強化 +1～+5 一定成功、1-5／1-6 完成且不擋 1-7、60 件上限、Esc 關閉、手機 390 寬、倉庫建築、信箱 `gear`／`bp`（顏色上限、已經會的圖紙換 30 字元、滿 60 件整封不領）。截圖 `OUT/nw12-*.png`。
`nw13.test.js` 測舊存檔搬移與裝備資料（純 node，不開瀏覽器）：5 種舊存檔（只有初心武器、有測試者之刃且穿著、換過武器、還沒選武器、`equip` 指到沒有的武器）搬成裝備格式、跑兩次不重搬（`gearV`）、`gearV=1` 卻沒有 `gear` 只放初心武器並 `console.warn`、壞資料清掉、舊欄位 `equip`／`gw` 照寫、舊格式直接丟進純函式不會壞、圖紙來源、信箱 `gear`／`bp` 規則。
`nw14.test.js` 測戰鬥吃裝備（`window.__NW_GEAR__` 直接指定）：攻擊力 ×屬性（打怕火 ×1.32、打不怕火 ×1.08）、測試者之刃攻擊力 112 不重複乘、存檔裡的炎牙刀、生命上限、盔甲減招式傷害但不減亂打反擊、護手舉盾秒數、護腳紅線早出現。
`nw15.test.js` 測每場紀錄與可疑偵測：`susCheck` 四種標記（含 0 按鍵不判斷、2 字題目不判斷、超過 120 題不比題數）、`qBand`、2b 沒開放不寫、打完一場寫一筆（ID、`ts` 伺服器時間、欄位）、被標記寫 `mg_nw_flags/run_…` 且不扣獎勵、離線排隊最多 5 筆並補寫（用 `window.__FAIL_WRITES`）、重送遇到 permission-denied 當成已寫入、學生端不讀 `mg_nw_runs`、結算畫面不出現「作弊」「可疑」。
`nw16.test.js` 測 2a 榮譽碑老師端彙總 `teacher/rank-calc.js`（**目前只有純 node 這一半，不開瀏覽器、不需要靜態伺服器**：`node tools/browser-test/nw16.test.js`；教師頁 `tab-rank.js` 與學生端 `nw-rank.js` 做好後，檔案裡的 TODO 區塊要補瀏覽器測試）：`q` 平的數字陣列切回每題（長度不是 4 的倍數、負數、打對比字數多都拒絕）、進步（同題目等級、兩邊各 3 場、最好 3 場平均、下降／持平不顯示、> 60% ⚠、> 100% 先不上榜、分週用伺服器 `ts` 不用 `t`）、週切換邊界（台灣時間週一 00:00）、排除（待審 `sus`／老師判決 `verdicts`／先不上榜／正確率 < 90%）、最快討伐、神準名單不排名次、▲／新上榜／下降不顯示、輸出沒有身分欄位與巢狀陣列、增量處理與一次算完在隨機資料上結果相同（含晚到的紀錄、重複讀）、空資料／只有 1 人／同分／`ts` 缺漏／壞資料等邊界。
`nw3.test.js` 測標點符號挑戰（打完自動開放、太早按「學會了」會提醒、老玩家不重跳門票）：兩組教學一次看完（Shift 4 個符號、Ctrl 5 個符號，含上下引號選字動畫）、動畫分步驟、演完才能按「學會了」、每組練 3 個、打怪挑戰（5 句、每句 ≤8 字且字標點混用）、章章列與過關橫幅，以及獎勵：老師勾選發放 → 打完跳出新世界門票並自動開通、不勾選則什麼都不發生。

`nw.test.js` 測新世界預告＋提名投票（v3.6.0）：
- 11 個關鍵字、16 頁，桌面與手機每一頁都不捲動、各頁內容（故事、獵人村、委託板、背包、稱號、戰鬥、魔物…）、點魔物換生氣、投票頁的怎麼選說明、沒填身分時輸入框停用、四個分類提名／投票／重複提名、翻頁、老師隱藏與恢復、排序、無 JS 錯誤
- 要看版面需要 `OUT/tw.css`（本機生成的 Tailwind），沒有也能跑，只是沒樣式

```bash
NODE_PATH=$(npm root -g) node tools/browser-test/nw.test.js /tmp
```

`t6.test.js` 測教師頁「⚙ 設定」的「📊 匯出打字速度（匿名）」（開 `__RULES`，資料全是假姓名）：
- 去識別化：下載的 JSON／CSV 全文逐一確認沒有姓名、暱稱、班級名稱、docId；只輸出白名單欄位，武器等字串不符格式就丟掉；列的順序洗牌、隨機編號每次匯出都不同。
- 年級不足 5 人合併成 `?`、摘要的平均／中位數／P10／P25／P75／P90、`?` 組少於 3 人不單獨列、欄位缺漏或亂值不會壞。
- 介面：預覽（人數、各年級人數、欄位、前 3 列）、確認視窗（取消不下載也不寫紀錄）、檔名、CSV 有 BOM 且逗號引號跳脫、操作紀錄 `export／speed`、沒有資料的提示、手機 390 不橫向捲動。

`t7.test.js` 測教師頁「🐛 回報與抓蟲榜」的「🤖 請 Claude 檢查待審回報」（開 `__RULES`，姓名、班級、docId 全是假的）：
- 去識別化：匯出的 JSON／複製的文字／下載檔／畫面預覽，全文逐一搜尋假姓名、暱稱、班級名稱、座號樣式、docId、flag 文件 ID，都不能出現；只有白名單欄位；`n`／`score` 是回報者的件數與分數（沒有 ID）。
- 遮蔽：「五年4班5號」「3班12號」「座號 12」「我是王小明」「我叫○○」與已知學生姓名被遮成「（已遮蔽）」，「我是在背包裡…」這類描述不遮；預覽顯示「共遮蔽 N 處」；`reply`／`note` 也遮。
- `rid` 每次匯出都不同；對照表只在 `sessionStorage`（Firestore、localStorage、console 都找不到）；重新匯出後舊 `rid` 的建議被略過並說明；分頁關過（`sessionStorage` 清掉再重載）會整份拒絕並教怎麼重來，單純重新整理則還能匯入。
- `dupGroup`：相近回報同組（門檻 0.3）、標出最早的；舊格式（只有 `text`）也拆得出 `did`／`what`。
- 匯入驗證：錯 `rid`、`sev` 超界／缺／小數、`dupOf` 不在批次內或指自己、`verdict` 不合、型別錯、同 `rid` 兩次、已審過、非 JSON、空白、外面包 ```json 都有清楚訊息，合法的列照收，頁面不壞。
- 預填：匯入不寫資料庫；「採用這個建議」只預填視窗，取消不寫入，改過後按確認才寫入（用老師改的值）；沒有建議的回報不受影響；「全部採用建議」先顯示總分變化與每位同學分數再確認，取消不寫入，對象是不採用的重複會略過；只有匯出下載／複製才寫操作紀錄 `export／bugs`。
- 純函式（`maskText`、`jaccard`、`buildBugExport`、`parseSuggestions`、`planBulk`）直接在 node 測；空狀態（沒有待審）與手機 390 不橫向捲動。
- `tools/nw-sim/load-real.mjs`：讀匯出檔轉成模擬器的 `[{ grade, wpm, acc, tier, weapon }]`，再丟給 `run.mjs` 確認吃得進去。

**用真實匯出檔校準模擬器**：匯出檔放 `data-private/`（已在 `.gitignore`，不進 repo；測試只用假資料）。
```bash
node tools/nw-sim/load-real.mjs data-private/typehero-speed-YYYYMMDD.json --out data-private/profiles.json
node tools/nw-sim/run.mjs data-private/profiles.json     # 年級不明的人可加 --unknown-as 五年級
```
