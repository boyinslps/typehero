# 交接給雲端的 Claude（只讀得到 GitHub 的環境）

> 寫於 2026-11-24，repo `boyinslps/typehero` 的 `main`（最新到「文件：2b 鐵匠鋪＋倉庫的實作記錄…」c45a05b 之後）。
> 讀者：在別的雲端環境工作、**只能從 GitHub 讀這個 repo** 的 Claude。這份是入口；細節都在下面列的檔案裡，不要靠這份猜。
> 老師是黃博胤（國小資訊老師）。遊戲「打字勇者」給四～六年級，「新世界」是裡面的 RPG 模式。

## 1. 一句話現況
> **2026-11-25 更新：老師已決定開放 2b 與 3s（商店），`OPEN_STAGES＝['1','2b','3s']`、`BOARD_ROT＝true`（v3.15.0，分支上，未推 main）。下面「沒開放」「預設仍是 `['1']`」的字樣是開放前的寫法，以 `RELEASE-STAGES.md`、`HANDOFF.md` 最上面為準。2a 仍沒開。**

新世界第 1 段（討伐看板、背包、稱號）已對學生開放。**第 2 段的 2b（鐵匠鋪＋倉庫）程式與測試都做完、已在 `main`，但沒開放**（`nw-data.js` 的 `OPEN_STAGES` 預設仍是 `['1']`）。2a（榮譽碑）還沒做。開放與貼 Firestore 規則都要老師點頭，**你不能自己開放**。

## 2. 開工前依序讀
1. `CLAUDE.md`（發版清單、文字與美術規範，必守）
2. `docs/HANDOFF.md`（最上面「第 2 段 2b」那一節）
3. `docs/SPEC-STAGE2.md`（規格；§10 寫了實作跟規格不同的地方，**以 §10 為準**）
4. `docs/RELEASE-STAGES.md`（分段開放表、2b 開放前檢查）
5. `docs/BALANCE-GEAR-2B.md`（裝備數值驗收結果，G1～G8；老師說平衡先不調）
6. 做畫面時：`docs/UI-ART-SPEC.md`、`docs/ANNOUNCEMENT-GUIDE.md`；做測試時：`tools/browser-test/README.md`

## 3. 必守規則（違反會出事）
- **不要動 `OPEN_STAGES`**，不要自己決定開放。公告（`NOTICES`、`VERSION_LOG`、pcclass `TYPEHERO_UPDATES`）等開放時才發，草稿在 `docs/SPEC-STAGE2.md` §4。
- **不要推 `main`**，除非老師明說。用分支（例如 `claude/xxx`）＋ PR；如果你連分支都推不了，就把改動寫成可套用的補丁或清楚的修改清單，交給老師。
- 學生姓名、座號、通關密語、金鑰**絕對不進 repo**。`data-public/` 只放已去識別化的匯出檔（見 `data-public/README.md`）；對得回個別學生的資料不行。
- 給學生看的字用國小生看得懂的白話（用詞表在 `docs/GDD-NEWWORLD.md` §2.3）；美術一律像素風（`pixel.js` 的 `PX`），新畫面用 `px-panel`／`px-btn`／`px-bar`。
- 署名 `made by 資訊老師黃博胤` 不能掉（遊戲畫面右下角、README、`<meta name="author">`）。
- 程式註解寫「為什麼」，不寫「做了什麼」。
- 既有檔案多半是 **CRLF**（Windows 開發）；新增修改保持原檔的換行，不要整檔換行。
- 平衡數字：用 `tools/nw-sim/` 模擬器驗證，不要憑感覺調；老師說現在先不調。

## 4. 現況表
| 項目 | 狀態 | 在哪 |
|---|---|---|
| 第 1 段（看板、背包、稱號） | ✅ 已開放 | — |
| 2b 鐵匠鋪＋倉庫 | ✅ 做完、測試過、**沒開放** | `nw-data.js`（資料）、`nw-forge.js`（畫面）、`nw-battle.js`、`pixel.js`、`newworld.js`、`teacher/*` |
| 每場紀錄 `mg_nw_runs`、可疑偵測 | ✅ 做完，`stageOpen('2b')` 才會寫 | `newworld.js` 的 `queueRun`／`flushRuns`、`nw-data.js` 的 `susCheck` |
| Firestore 新規則（`mg_nw_runs`、`mg_nw_flags` 加 `run`、`mg_nw_board`） | ⚠ 寫好在 `firestore-rules.txt`，**老師還沒貼**；規則測試案例**沒有實際跑過**（開發那台沒有 Java） | `firestore-rules.txt`、`tools/rules-test/` |
| 2a 榮譽碑（老師端彙總、教師頁審核、學生端重寫） | ⬜ **沒做**，要等 2b 開放 4 週以上才有資料 | 規格 §2、§5 的 2a-1／2a-2 |
| 2c 劍盾、拳套 | ⬜ 延後 | 規格 §8 第 6 題 |
| 炎牙狼的攻擊 | ⬜ 先不開 | `ATTACKS_OPEN`，規格 §3.4 G8 |

## 5. 可以接著做的事（照優先序；做之前先問老師要哪個）
**A. 2a 榮譽碑**（最大的一塊，規格 §2、§5、§6）
- 新檔 `teacher/rank-calc.js`（純函式：`qBand`、進步＝兩邊各最好 3 場平均、週切換、▲／新上榜、神準名單、排除待審與「先不上榜」；`qBand`、`susCheck` 已在 `nw-data.js`，可直接重用）。
- 新檔 `teacher/tab-rank.js`（教師頁「🏆 榮譽碑」：待審核、榜單檢視、更新），`tabs.js`、`tab-overview.js` 加列；舊控制台（`index.html`）老師登入後背景更新。
- 重寫 `nw-rank.js`（只讀 1 份 `mg_nw_board/{年級}`、榜外不顯示名次、下降不顯示），順便修 F3（現在每次開榜讀整個 `mg_scores`）。
- 測試用 `nw16.test.js`、`t5` 系列；假 Firebase 要能處理 `where('ts','>',…)`（已支援）。
- **注意**：`mg_nw_runs.q` 是**平的數字陣列、每 4 個一題** `[字數, 按鍵, 毫秒, 打對]`（Firestore 不能存陣列裡的陣列，規格原本寫巢狀是行不通的），彙總時要自己切回來。

**B. 用真實資料校正模擬器**：`tools/nw-sim/calib.mjs`、`gear.mjs`（資料在 `data-public/`）。目前模擬器假設人人都會躲紅線，真實閃避成功率低很多；等 `mg_nw_runs` 有資料再校正。結果寫回 `docs/BALANCE-GEAR-2B.md`（`node tools/nw-sim/gear.mjs --n 1000 --md` 產生，不要手改）。

**C. 數值議題（需要老師同意才能改）**：護腳效果幾乎看不到（G6a）；邊緣的慢速孩子穿綠全身 +5 勝率大增（G4）；重壓沒擋住時三條線各打一次（三倍傷害，`resolveStrike` 現況）。

**D. 規則測試**：在有 Java 11+ 的環境跑 `cd tools/rules-test && npm install && npm test`，把結果回報。雲端環境若有 Java，這是最有價值的一件小事。

## 6. 老師（不是你）要做的事
貼規則（先備份舊規則）→ 在真的 Firebase 走一遍 → 決定哪天把 `'2b'` 加進 `OPEN_STAGES` 並發版。清單在 `docs/RELEASE-STAGES.md`「第 2 段 2b」。

## 7. 環境與測試怎麼跑
- 瀏覽器測試在 `tools/browser-test/`：Playwright 攔截 Firebase 換成記憶體版假資料庫（`mock/`）。需要 Node 20 以上＋ `playwright`（Chromium）。步驟：
  1. repo 根目錄開靜態伺服器：`python3 -m http.server 8765 --bind 127.0.0.1`（**埠號 8765 寫死在測試裡**）。
  2. Tailwind 要先編成靜態 CSS：`npx tailwindcss@3.4.17 -c tools/browser-test/tw.config.js -i tools/browser-test/tw-in.css -o <OUT>/tw.css`。
  3. `NODE_PATH=$(npm root -g) node tools/browser-test/nw12.test.js <OUT>`。
- 全部 24 個檔跑一輪約 25 分鐘；改動小就只跑相關的（`nw12`～`nw15` 是 2b、`t4`／`t5` 是教師頁）。跑的時候不要同時改檔案（測試直接讀工作目錄）；要邊改邊跑，就複製一份 repo、改埠號再跑。
- `seg0.test.js` 沒有 `PASS` 字樣，成功的訊號是最後一行 `no page errors`。
- 純函式用 node 直接測（`nw13.test.js` 完全不開瀏覽器）。
- 模擬器：`node tools/nw-sim/gear.mjs --n 1000`（說明在 `tools/nw-sim/README.md`）。

## 8. 踩過的坑
- 假 Firebase **不會**擋 Firestore 的限制（巢狀陣列、單文件 1MB、undefined 欄位）。存進 Firestore 的資料自己檢查：不要陣列裡放陣列、不要 undefined（先過一次 `JSON.parse(JSON.stringify())`）。
- `NW`（整份新世界存檔）會原封不動存進 `mg_scores`，所以放進 `NW` 的東西（例如 `runQ`）也受 Firestore 限制。
- 規格寫的測試編號 `nw11`～`nw14` 跟既有檔衝突：2b 是 `nw12`（鐵匠鋪）、`nw13`（舊存檔）、`nw14`（戰鬥）、`nw15`（每場紀錄），2a 接著用 `nw16`。
- 舊存檔搬移用 `gearV` 旗標只搬一次；`equip`／`gw`／`starter` 舊欄位要繼續寫（`syncLegacy`），舊分頁與教師頁舊程式才不會壞。
- 沒開放時，鐵匠鋪、新詞條、新任務、材料／圖紙分頁的新內容都要藏起來（`stageOpen('2b')`），不然會透露還沒開的功能。
- 對外訊息只寫已經上線、學生現在就玩得到的功能。

## 9. 資料
`data-public/typehero-speed-20261120.json`：315 列去識別化的學生打字速度與新世界場次（隨機編號、年級、速度、正確率、層級、武器、勝敗、閃避防禦次數）。沒有姓名座號。用途與限制見 `data-public/README.md`。

## 10. 交接提示詞
見 [`PROMPT-CLOUD.md`](PROMPT-CLOUD.md)（整段貼給雲端的 Claude 即可）。
