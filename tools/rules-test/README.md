# Firestore 規則測試

用 Firebase 模擬器（要 Java 11 以上）跑 `firestore-rules.txt`（正式版）與
`firestore-rules-transition.txt`（過渡版）。每一條都是「誰（匿名學生／老師／不是老師的登入帳號／未登入）、
哪份文件、做什麼、該過還是不過」。

```bash
cd tools/rules-test
npm install      # 第一次
npm test         # 起模擬器、跑完自動關
```

- 第一次會下載模擬器的 jar（約 60MB），之後有快取。
- 埠號 8089（`firebase.json`）。
- `placeholder.rules` 只是讓模擬器能啟動；真正測的規則是 `rules.test.mjs` 讀 repo 根目錄的檔案後載入，
  所以改完規則直接重跑就好。
- 發布到主控台前一定要先跑過。

## 涵蓋的重點
- 老師身分靠 `mg_admins/{uid}`；不是老師的登入帳號不能寫。
- `mg_config`／`mg_round`／`mg_bank` 學生只能讀；`nw_vote` 學生只能動 `v`、`noms`。
- `mg_nw_flags`：學生只能 create、欄位白名單、不能讀、不能帶 `claimed`（舊版送回報會被擋，所以 A 版要先上線）。
- `mg_gift_used`：同一人第二次領會被擋，count 查詢可用。
- `mg_scores` 刪除只有老師。

## 已知限制
- 學生仍可改自己的 `mg_scores`（字元、裝備）；匿名 uid 對不上「班級_座號」，規則做不到。
- 學生可以清掉 `nw_vote.v`（投票本來就要能寫），只能保護 `hidden`、`noms` 以外欄位。
- `mg_gift_used` 學生可以亂造 `{h, id}` 灌高某個序號的使用次數（影響上限）；老師可在管理頁刪除。
