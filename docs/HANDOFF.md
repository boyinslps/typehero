# 交接：目前進度與下一步

> 更新：2026-11-03　分支：`claude/youthful-cerf-a6t41t`（**還沒合併到 main**，
> GitHub Pages 若是發布 main，學生還看不到 v3.3.0）

## 現在在哪裡

| 項目 | 狀態 | 在哪 |
|---|---|---|
| 新世界企畫書 v2.2 | 完成，老師已審過四輪 | [`GDD-NEWWORLD.md`](GDD-NEWWORLD.md) |
| 專家審查紀錄（13 輪） | 完成 | [`GDD-REVIEW.md`](GDD-REVIEW.md) |
| 第 0 段：戰績分防亂打、天賦發亮 | **完成，v3.3.0** | `index.html`，見 [`../CHANGELOG.md`](../CHANGELOG.md) |
| 新世界預告＋提名投票頁 | **完成，v3.4.0** | `index.html` 的 `#nw-modal`／`NW_*`／`nw*()`，見 [`../CHANGELOG.md`](../CHANGELOG.md) |
| 第 1 段：獵人村開幕 | 未開始 | 規格：GDD §21.3 第 1 列 |

## 下一步（照順序）

1. ~~預告＋提名投票頁~~ ✅ v3.4.0 已完成（資料在 `mg_config/nw_vote`，免改規則）。
   - 上線後可以看投票結果再決定魔物名字、區域、武器；老師在投票頁按「老師管理」可隱藏不適當的提名。
   - 預告頁的文字與 ASCII 在 `index.html` 的 `NW_ART`／`NW_WEAPONS`／`NW_REGIONS`／`NW_SYSTEMS`，
     企畫有改（例如武器、區域改名）要一起改。故事文字在 `nwPreviewHTML()`，是草稿，老師可改。
2. **第 1 段**（GDD §21.3）：新世界入口（歷史最高 LV8＝解鎖史詩）、獵人村全部介面（未開放的掛「🔗 施工中」）、
   初心武器四選一（法杖、長弓、雙刀、連弩）、世界地圖（草原、森林）、咕咕鳥／泡泡蛙／跳跳菇／炎牙狼、
   讀條＋打「閃避」「防禦」、生命／倒下／生氣、魔物攻擊帶的狀態、HR、新排行、防作弊、主線第 1 章、素材字元先存著。
   - 新世界資料放 `mg_scores` 的 `nw` 欄位（GDD §23.1），排行與可疑紀錄也可以先放這裡，**第 1 段就不用改規則**。

## 老師已經決定的

- 進入門檻：解鎖史詩（LV8）。護甲＝頭盔。
- 元素書統一用方向鍵（← 火、↑ 水、→ 木）；注音輸入法下上排 1、2、3 是ㄅㄉˇ，不能用。
- 召喚鈴寵物要有血條（GDD §10.3）。
- 英文魔物的閃避／防禦接受 jump／stop，要提醒。
- 讀條與有效時間：先寬，看資料再收；狀態數字：先這樣，看資料再調。
- 魔物、武器美術一律 ASCII；介面可用 emoji。
- 陷阱、戰鎚刪除；武器不分系；每種武器要有獨特操作，不能只是「打對 X 次觸發 X」。

## 還沒決定的

見 GDD §25「還要請老師決定」（狩獵時限、組隊範圍、重新打磨次數、題庫誰寫、跨學期、擴增武器）。

## 第 0 段改了哪些程式（v3.3.0）

| 位置（`index.html`） | 內容 |
|---|---|
| `BALANCE.rank.minAcc`、`scoreVer` | 85% 門檻、新公式版本 2 |
| `battleScore()` | 改乘正確率² |
| `histFromDoc()`、`mergeHist()` | 新欄位 `bestScoreWpm`／`bestScoreAcc`／`scoreVer`；合併時新公式優先 |
| `saveScore()` | 正確率不足不更新；舊公式紀錄直接被新公式覆蓋 |
| `paintLoginHistory()` | 顯示戰績分最高那一場 |
| `renderRankBoard()`、`#rank-old` | 預設只列新公式，可勾選含舊版 |
| `paintTalentDot()`、`#btn-talent.can-buy` | 天賦可點時發亮 |
| `showResult()`、`#r-lowacc` | 正確率不足提醒 |

## 開發環境注意

- 版面要看真的樣子：雲端連不到 Tailwind CDN，可以 `npm i tailwindcss@3` 後用
  `npx tailwindcss -i in.css -o tw.css`（content 指向 `index.html`）產生 CSS，再讓 Playwright 把 `cdn.tailwindcss.com` 攔截成注入這份 CSS 的腳本。
- 在 `String.raw` 模板裡畫 ASCII：**最後一個字元是 `\` 時會把結尾的反引號跳脫掉**（整支 script 語法錯誤、整個遊戲開不起來），結尾要補空白。

- 雲端環境連不到 CDN（Firebase、Tailwind、jsdelivr 都被擋），瀏覽器實測用 [`../tools/browser-test/`](../tools/browser-test/README.md) 的假 Firebase。
- 主程式是 `index.html` 裡的單一 `<script type="module">`，改完可以抽出來用 `node --check` 檢查語法。
- 改版要同步：`APP_VERSION`、`VERSION_LOG`（遊戲內）、`CHANGELOG.md`。
- 學生真實資料可以用遊戲本身的匿名登入（Firebase REST `accounts:signUp` → Firestore REST）唯讀撈 `mg_scores`；只做統計，不要把姓名座號寫進文件。
