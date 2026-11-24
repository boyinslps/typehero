# 給雲端 Claude 的交接提示詞

把下面整段貼給雲端的 Claude（它只讀得到 GitHub 的 `boyinslps/typehero`）。要它做的事在最後一段「這次的任務」，要換任務就改那一段。

---

你要接手「打字勇者」（GitHub：`boyinslps/typehero`），這是國小資訊老師黃博胤做給四～六年級的打字遊戲，「新世界」是裡面的 RPG 模式。你只能讀這個 repo，不能碰老師的電腦，也不能碰真的 Firebase。

**先讀（照順序，讀完再動手）**：`docs/HANDOFF-CLOUD.md`（入口，現況、規則、可以做的事、環境與測試、踩過的坑）→ `CLAUDE.md` → `docs/HANDOFF.md` 最上面「第 2 段 2b」那節 → `docs/SPEC-STAGE2.md`（以 §10 為準）→ `docs/RELEASE-STAGES.md`。用到再讀：`docs/UI-ART-SPEC.md`、`docs/ANNOUNCEMENT-GUIDE.md`、`docs/BALANCE-GEAR-2B.md`、`tools/browser-test/README.md`、`tools/nw-sim/README.md`。

**現況**：第 1 段已對學生開放。第 2 段的 2b（鐵匠鋪＋倉庫、五格裝備、每場紀錄）已開放（`nw-data.js` 的 `OPEN_STAGES` 是 `['1', '2b']`）。2a 榮譽碑還沒做、沒開放。

**絕對不能做**：
1. 不要改 `OPEN_STAGES`、不要自己決定開放某一段、不要發對外公告（`NOTICES`、`VERSION_LOG`、pcclass）。
2. 不要推 `main`。用分支（`claude/…`）加 PR；連分支都推不了，就把改動寫成補丁或清楚的修改清單交給老師。
3. 學生姓名、座號、通關密語、金鑰不進 repo；`data-public/` 只放已去識別化的檔案。
4. 不要憑感覺改遊戲數值；老師說平衡先不調，要驗證就用 `tools/nw-sim/`。

**必守的做法**：給學生看的字用國小生看得懂的白話；美術用 `pixel.js` 的 `PX`（像素風），畫面用 `px-panel`／`px-btn`／`px-bar`；署名 `made by 資訊老師黃博胤` 不能掉；程式註解寫「為什麼」；既有檔多半是 CRLF，保持原檔換行；改完跑相關測試（`tools/browser-test/`，說明見 README，埠號 8765 寫死），全過才算完成；改了規格以外的做法，記在 `docs/SPEC-STAGE2.md` §10 或 `docs/HANDOFF.md`。Firestore 不能存陣列裡的陣列，也不能有 undefined，假資料庫不會幫你擋，自己檢查。

**回報時**：說做了什麼（分支或 PR 連結）、測試結果（哪幾個檔、通過幾項、沒跑到的要老實說）、老師要做的事、你不確定要老師決定的事。遇到規格和程式對不上，先看 `docs/SPEC-STAGE2.md` §10 與 `docs/HANDOFF.md`，還是不確定就列出選項問老師，不要自己選。

**這次的任務**（請先用一兩句話複述你的理解，再開始）：
> 先讀完上面的檔案，回報你看到的現況和你打算怎麼做。然後做 `docs/HANDOFF-CLOUD.md` §5 的 **A. 2a 榮譽碑**：先做老師端彙總的純函式 `teacher/rank-calc.js`（含 node 單元測試）和 `nw16.test.js`，再做教師頁「🏆 榮譽碑」分頁，最後才重寫學生端 `nw-rank.js`。每做完一塊就跑測試、commit 到你的分支。**不要開放 2a。** 如果雲端環境有 Java，順便跑 `tools/rules-test/` 的 `npm test` 並回報結果（開發那台沒有 Java，規則測試從來沒實際跑過）。
