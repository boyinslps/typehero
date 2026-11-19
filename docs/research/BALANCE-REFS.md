# 打字勇者：遊戲平衡與數值設計參考資料

> 建立：2026-11-19　用途：設計數值曲線（敵人血量、裝備、強化費用、經驗、字元收入與價格）時直接查公式、查來源、查「別人踩過的坑」。
> 對象與限制：國小四～六年級、一週一節課（約 40 分鐘，實際玩 15～20 分鐘）、中位數一節打 2 場、一學期十幾節。
> 搭配閱讀：`docs/BALANCE.md`、`docs/META-GROWTH.md`、`docs/SPEC-STAGE2.md`（§3.2 裝備數值、§3.4 驗收）、`tools/nw-sim/`。

## 先講清楚：這份資料的查證程度

- 這次環境只能用 WebSearch，**WebFetch 連不上**（`bulbapedia.bulbagarden.net`、`gamedeveloper.com`、`wikipedia.org` 都是 `ENOTFOUND`）。所以**沒有任何一篇讀過全文**，每條重點都是搜尋摘要加我對這些著作的既有了解。
- 標記：**（摘要）**＝搜尋摘要有直接寫到；**（推論）**＝沒有來源直接支持，是我套到打字勇者上的判斷；**（已驗算）**＝我用 Python 自己算過；**（待核）**＝來源品質不夠或細節沒驗證。
- 沒查到的：Guitar Hero、ZType、TypeRacer 的難度設計資料（搜尋沒有回傳可用內容）；Daniel Cook／Lostgarden 的數值文章（沒搜到）；中文**四～六年級**注音打字速度（只查到二年級）。這些在對應章節會再註明。
- 「已驗算」的運算是用暫存腳本算的（沒有進 repo）；文中都把輸入與輸出寫出來，要重算時照抄即可。

## 目錄

1. [數值成長曲線](#1-數值成長曲線)
2. [戰鬥平衡](#2-戰鬥平衡)
3. [動態難度與公平](#3-動態難度與公平)
4. [經濟設計](#4-經濟設計)
5. [數值驗證方法](#5-數值驗證方法)
6. [打字與節奏遊戲的難度](#6-打字與節奏遊戲的難度)
7. [建議的設計流程與公式清單](#7-建議的設計流程與公式清單)
8. [參考資料總表](#8-參考資料總表)

---

## 1. 數值成長曲線

### 1.1 重點原則與公式

**曲線形狀的取捨**

- **多項式（`a·n^b`）每一級的「增加量」變小或平穩，指數（`a·r^n`）每一級的「比例」固定。** 多項式後期好控制，指數後期會爆炸，需要連獎勵一起加倍才追得上，容易被刷。（摘要）[Aversa：RPG 等級制的遊戲設計數學](https://davideaversa.it/blog/gamedesign-math-rpg-level-based-progression/)、[XP 曲線計算器（非權威）](https://ziva.sh/tools/xp-level-curve-calculator)
  ```
  線性      need(n) = a + b·n            每級多一點點，等差
  多項式    cum(n)  = a·n^b   (b≈1.5～3)  累計需求；每級增加 = a·b·n^(b-1)
  指數      need(n) = a·r^n   (r≈1.05～1.2) 每級多固定比例
  ```
- **Pokémon 經驗組是立方曲線，不是指數。** Medium Fast＝`n³`，Fast＝`4n³/5`，Slow＝`5n³/4`；Medium Slow＝`6n³/5 − 15n² + 100n − 140`。Bulbapedia 摘要給的 100 級累計：800,000／1,000,000／1,250,000／1,059,860。（摘要；公式是我記的，**已驗算**四個 100 級累計都對得上：`0.8×10⁶`、`10⁶`、`1.25×10⁶`、`1.2×10⁶−1.5×10⁵+10⁴−140=1,059,860`）[Bulbapedia：Experience](https://bulbapedia.bulbagarden.net/wiki/Experience)
- **Diablo III 的巔峰等級官方公式沒有公開，計算器網站的公式互相矛盾**（`5,000,000×1.1^(L-1)`、`500,000(P+99)(P+100)/2`…），不要引用。能確認的是設計意圖：「爬到高巔峰等級的時間，約等於 Diablo II 練到 99 級的長期投入」＝**先定時間目標再定曲線**。（摘要）[Diablo Wiki 巔峰經驗表](https://diablowiki.net/Paragon_experience_charts)、[Maxroll：經驗機制](https://maxroll.gg/d3/resources/experience-explained)
- **S 曲線（logistic）是「學習曲線的理想形」：起步慢、中段快、接近上限又慢。** 練習律則說完成一次任務的時間是練習次數的負冪函數。（摘要）[Wikipedia：Learning curve](https://en.wikipedia.org/wiki/Learning_curve)、[Wikipedia：Power law of practice](https://en.wikipedia.org/wiki/Power_law_of_practice)
  ```
  logistic   L(t) = Lmax / (1 + e^(-k(t - t0)))      Lmax 上限、k 陡度、t0 中點
  練習律則   T(N)  = a + b·N^(-α)                     a 是漸近線（極限）
  ```
  注意：冪律在「平均資料」上特別好看，有研究認為個人層級其實更像指數（Heathcote 等 2000）。（摘要）[Newell & Rosenbloom 之後的修正](https://dare.uva.nl/id/717fcfb1-edf1-4010-9959-2b0acccb9c8b)
- **放置遊戲的標準做法：成本指數成長、產出線性（或多項式）成長。** 成本形式一般寫成 `cost(n)=base·growth^n`（推論：摘要只確認「成本指數、產出線性」，這個式子是我補的）。[Pecorella：The Math of Idle Games](https://gamedeveloper.com/design/the-math-of-idle-games-part-i)、[Kongregate 版](https://blog.kongregate.com/quest-for-progress-the-math-of-idle-games)

**為什麼是 power curve、為什麼要有遞減報酬**

- **power curve＝「遊戲內容強度」與「玩家強度」隨進度的成長率；兩邊要對著調。** 玩家成長太慢＝沒進步感，太快＝後面都是散步。可以調的是怪的強度（最好控制）與玩家成長。（摘要）[Game Developer：3 種 power curve](https://gamedeveloper.com/design/the-3-ways-power-curves-impact-progression)、[Game Wisdom：追蹤 power curve](https://game-wisdom.com/?p=11706)
- **遞減報酬用來防止疊加把平衡打壞。** EVE 的例子：同類模組第一個全效、第二個約 80%、第四個幾乎沒用。（摘要，來源是整理頁）[遞減報酬模式](https://math.vu.nl/~eliens/media/pattern-diminishingreturns.html)
- **「體感」看比例，不看絕對值（Weber 定律）：最小可察覺的變化是起始值的固定比例，比例依感官不同，約數 % 到 10%。** 對遊戲數字有沒有適用，沒有來源，要試玩。（摘要）[Wikipedia：Weber–Fechner law](https://en.wikipedia.org/wiki/Weber%E2%80%93Fechner_law)、[Wikipedia：Just-noticeable difference](https://en.wikipedia.org/wiki/Just-noticeable_difference)
  ```
  ΔI / I = k    （k 是 Weber 常數）→ 想讓人「感覺到」，每一階至少要比現值多 k
  ```

**避免通膨與 power creep**

- **Rosewater 的「Escher 樓梯」：一邊拉高某些東西、一邊壓低另一些，整體看起來往上、實際持平。** 無限制拉高會讓舊卡失去價值、最後殺死遊戲。（摘要）[Game Developer：Magic 24 年的設計心得](https://gamedeveloper.com/design/what-game-devs-can-learn-about-design-from-24-years-of-i-magic-the-gathering-i-)、[MTG Wiki：Power creep](https://mtg.wiki/page/Power_creep)
- **Path of Exile 的教訓：十年 power creep 之後，開發團隊自己說「到了臨界點」；PoE2 刻意避開 Diablo 4 那種天文數字傷害。**（摘要，只有標題與摘要）[PC Gamer：PoE2 避免 D4 的傷害數字](https://pcgamer.com/games/rpg/we-dont-have-to-worry-about-trillions-of-damage-path-of-exile-2-is-trying-to-avoid-diablo-4s-game-breaking-damage-numbers-director-says)、[GDC 2019：Designing Path of Exile to Be Played Forever](https://gdcvault.com/play/1025784/contactUs)
- **敵人跟玩家等級走（level scaling）的失敗：Oblivion 讓玩家「升級感」被敵人抵銷，原設計者事後稱之為錯誤。**（摘要，二手報導）[VideoGamer：Oblivion 升級系統是「錯誤」](https://www.videogamer.com/news/elder-scrolls-iv-oblivion-levelling-system-mistake-admits-designer-haunts-remaster)

### 1.2 對打字勇者的啟示

**可以用的公式：把「想要幾場升到幾級」直接反推成 `a`。**

```
cum(L) = a · L^b                       累計經驗
a      = cum_target / L_target^b       （例：一學期 28 場要到 L=10，累計 28 場份）
每級要打幾場 F(L) = a·b·L^(b-1) / c    （c＝每場平均得到的經驗單位）
```

（已驗算）一學期 28 場（14 節×2 場）、第 28 場剛好到 L=10 時，累計場數：

| b | L=1 | L=2 | L=3 | L=5 | L=7 | 每級要打幾場（L=2／5／10） |
|---|---|---|---|---|---|---|
| 1（線性） | 2.8 | 5.6 | 8.4 | 14.0 | 19.6 | 2.8／2.8／2.8 |
| 1.5 | 0.9 | 2.5 | 4.6 | 9.9 | 16.4 | 1.9／3.0／4.2 |
| 2 | 0.3 | 1.1 | 2.5 | 7.0 | 13.7 | 1.1／2.8／5.6 |
| 3 | 0.0 | 0.2 | 0.8 | 3.5 | 9.6 | 0.3／2.1／8.4 |

- **b=1.5～2 最符合「前面快、後面慢但不停滯」**：第一級 1 場內、L=5 約第 7～10 場（第 3～5 節）、後期每級 4～6 場。b=3 前期太快、後期一級要 8 場（4 節課），孩子會覺得卡住。（推論）
- **遊戲現況**：`BALANCE.md` §5 的 `need = 40+16(L-1)+1.2(L-1)²` 是二次多項式（累計約立方），對「單場內等級」合理；新世界的 HR 要用**跨課累計**，不要照搬。
- **避免通膨的做法**：每一個「乘上去」的成長只允許一條（見 §2）；一學期全部成長的總倍率先寫下來（例：武器 ×1.20、屬性 ×1.1＝×1.32），再往下分配。把「總倍率」當預算，不要讓各處各自加碼。
- **體感**：每次強化 +1 武器只多約 2%（`SPEC-STAGE2` §3.2：攻擊力 +2／100），**低於一般 JND**，單靠數字孩子感覺不到。要把它換成孩子看得懂的單位：「打咕咕鳥快 N 秒」（見 §7）。（推論）

---

## 2. 戰鬥平衡

### 2.1 重點原則與公式

**TTK（殺敵時間）與 TTD（被殺時間）**

- **TTK 的數字本身沒有對錯，要跟技巧成比例。** Game Developer 一篇（標為 sponsored 的）文章主張：就難度而言 TTK 應隨技能高低成比例增加，Counter-Strike 的槍口散布就是「TTK 隨瞄準技巧成比例變動」的例子；較短的 TTK 對玩家懲罰較輕。（摘要，原文部分亂碼）[Game Developer：How balance can affect difficulty](https://gamedeveloper.com/design/how-balance-can-affect-difficulty)
- **TTK 太長被玩家視為「不平衡」。** DICE 自己在 Battlefield V 承認「較高的 TTK 不平衡」並回調。（摘要）[mp1st：DICE 測試 time to death](https://mp1st.com/news/battlefield-5-time-to-death-tests-done-with-public-dice-admits-higher-ttk-is-not-)、[Red Bull：TTK 為何重要](https://www.redbull.com/au-en/understanding-ttk-and-why-it-was-important-for-bfv-to-revert-its-changes)、[EA：Battlefield 1 武器平衡](https://www.ea.com/games/battlefield/news/improving-battlefield-1-weapon-balance)
  ```
  TTK = HP_monster / (DPS_player)           DPS = 每秒正確字×每字傷害×連擊×裝備
  TTD = HP_player / (DPS_monster × (1-迴避率) × (1-減傷))
  ```
- **一場多久，取決於「這段時間裡有幾個有意義的選擇」，不是固定分鐘數。**（摘要）[Zeboyd：JRPG 設計取向](https://gamedeveloper.com/design/the-zeboyd-games-approach-to-jrpg-design)、[Kotaku：怎樣做好隨機遭遇](https://kotaku.com/how-to-make-random-encounters-good-5958615)。沒有查到「幾分鐘最佳」的來源（待核）。

**傷害公式：加法、乘法、減傷**

- **Pokémon 是「基礎式再連乘修正」。** 暴擊 ×2（II–V 代）或 ×1.5（VI 代起）、隨機 0.85–1.00（整數百分比）、STAB ×1.5、屬性相剋 ×0／0.25／0.5／1／2／4（雙屬性連乘）。（摘要）[Bulbapedia：Damage](https://bulbapedia.bulbagarden.net/wiki/Damage)、[Smogon：BW 完整傷害公式](https://www.smogon.com/resources/competitive/bw/bw_complete_damage)
  ```
  Damage = ((2·Lv·Crit/5 + 2) · Power · A/D / 50 + 2) · STAB · Type1 · Type2 · Random
  ```
  （已驗算）Lv50、A=D、Power=80：`(22·80/50 + 2)=37.2`；STAB ×1.5＝55.8；再打剛好相剋 ×2＝111.6。**三個「看起來各自合理」的 1.5～2 倍乘起來就是 3 倍**。
- **加法與乘法的實務共識：同類別內相加、類別之間相乘。** 純乘法會讓數字爆炸、難以平衡；Diablo III 就是「同類加成相加、各類別再相乘」。（摘要，主要是玩家社群分析）[Maxroll：Diablo 3 傷害乘數](https://maxroll.gg/d3/resources/damage-multipliers-thorns-explained)、[Blizzard 論壇：D4 修改器 PSA（社群）](https://us.forums.blizzard.com/en/d4/t/this-is-why-your-damage-sucks%E2%80%94a-psa-on-damage-modifiers/58203)
  ```
  加法池   mult = 1 + Σ bonus_i                  （同類 +20% 十次 → ×3.0）
  連乘     mult = Π (1 + bonus_i)                （同類 ×1.2 十次 → ×6.19）
  ```
  （已驗算）十次 +20%：加法 `1+10×0.2=3.0`，連乘 `1.2^10=6.19`，差 2.06 倍；單步越大、步數越多，差距越大。
- **Slay the Spire：力量（加法）先算，再乘易傷 ×1.5、虛弱 ×0.75，最後無條件捨去。**（摘要，wiki 自述施工中、為 StS2 計算器的建模）[StS Wiki：Debuffs](https://slaythespire.wiki.gg/wiki/Debuffs)、[Fandom：Vulnerable](https://slay-the-spire.fandom.com/wiki/Vulnerable)
- **減傷：減法式、除法式與 `A/(A+K)`。** 減法式容易讓玩家幾級後無敵，所以回復多的遊戲偏好除法式；代價是玩家心算不出來。（摘要，論壇與部落格）[Game Developer：Final Fantasy 與 Dragon Quest 的戰鬥數學](https://gamedeveloper.com/design/number-punchers-how-i-final-fantasy-i-and-i-dragon-quest-i-handle-combat-math)、[RPG Maker 論壇：subtractive vs divisive](https://rpgmaker.net/forums/topics/21673)
  ```
  減傷率    c = A / (A + K)             → A 加倍不會讓 c 加倍，永遠 < 100%
  PoE2      c = AR / (AR + 10·DMG)       硬上限 90%；打得越痛減得越多（對大傷害更弱）
  Conan     c = Armor / (Armor + 500)
  ```
  （已驗算）PoE2：AR=500、DMG=100 → `500/(500+1000)=33.3%`，剛好符合 wiki「要 5 倍於傷害的護甲才 33.3%」。K=500：A=100／250／500／1000／2000 → 16.7%／33.3%／50%／66.7%／80%。[PoE Wiki：Armor](https://www.poewiki.net/wiki/Armor)、[Mobalytics：PoE2 護甲](https://mobalytics.gg/poe-2/guides/armour)、[Predecessor wiki：Armor](https://predecessor.wiki.gg/wiki/Armor)
- **「減傷 `1/(1+d)`」＝「`c = d/(1+d)`」是同一件事的兩種寫法**（已驗算 d=0.04／0.10／0.15／0.30 → 受傷剩 96.2%／90.9%／87.0%／76.9%）。**打字勇者現在的「受傷少 N%」就是 `c`**，直接相乘（`×(1−c)`），目前只到 15%，不需要換式；等 c 要超過 30% 再改 `d/(1+d)` 型，保證不會到 100%。（推論）

**屬性相剋與倍率**

- **相剋倍率其實是在決定「選對的人比亂選的人多贏多少」。** Pokémon 用 2／0.5／0，一次極端；3 屬性剪刀石頭布若改兩種倍率，納許均衡就偏離 1/3（改 payoff 會讓某邊長期有利）。（摘要）[UMD：RPS 最佳策略](https://math.umd.edu/~petersd/401/html/game_ex.html)、[arXiv：Imbalance in RPS games](https://arxiv.org/html/2511.00374v1)
  ```
  相剋矩陣 M（對稱、行和為 0）→ 均衡為均勻分布 = 「平衡」；
  勝 +x 敗 −x 平 0 時最簡單；改成勝 ×1.1、敗 ×0.9 之類的「溫和相剋」仍是對稱的。
  ```

**技巧型與數值型共存**

- **Sirlin：平衡＝有相當多選項在高手層級仍然可行；第一個目標是把「神級」空出來。**（摘要）[Sirlin：Balancing Multiplayer Games Part 1](https://www.sirlin.net/articles/balancing-multiplayer-games-part-1-definitions)、[Part 3：Fairness](https://www.sirlin.net/articles/balancing-multiplayer-games-part-3-fairness)
- **內在整合：把學習內容放進核心機制，比外掛獎勵學得多、玩得久。**（摘要，已在 `GAME-DESIGN-REFS.md` 引用）[Habgood & Ainsworth 2011](https://shura.shu.ac.uk/3556)。「裝備放大打對的字」＝**數值放大技巧**，不是取代技巧。
- **Hades 的 Heat：難度是玩家自己一格一格加的「公開刻度」，每個條件加固定 Heat，總量封頂約 63～64，Supergiant 的前作也有同類（Bastion、Transistor 的 Limiters）。**（摘要）[Kotaku：Hades 後期](https://kotaku.com/everything-you-need-to-know-about-hades-endgame-1845239105)、[RPGSite：Pact of Punishment](https://rpgsite.net/feature/10287-hades-pact-of-punishment-heat-modifiers-and-how-to-maximize-your-rewards)。沒有查到 GDC 設計演講（待核）。

### 2.2 對打字勇者的啟示

**核心問題：手慢靠裝備能過關，手快不被裝備蓋過。** 把它寫成數學：

```
TTK = H / (r · g)         r = 玩家有效傷害率（技巧）  g = 裝備倍率（>=1）
贏     ⟺  TTK ≤ T_limit       →  需要的速度  r_need = H / (g · T_limit)
```

**三個結論（已驗算，推導如下）：**

1. **裝備只是把「過關門檻速度」乘以 `1/g`**（g=1.10／1.20／1.32 → 門檻降到 0.909／0.833／0.758 倍）。
2. **受影響的人數有上限。** 令速度 `v` 服從對數常態，`ln v ~ N(μ, σ²)`，每分鐘字數資料（p10=3、p25=6、中位 10、p75=14、p90=19）擬合得 `σ≈0.63～0.72`，取 0.65。對一隻門檻速度 `v_c` 的怪，裝備讓「從輸變贏」的比例是 `Φ((ln v_c−μ)/σ) − Φ((ln(v_c/g)−μ)/σ)`，最大約 `ln g / (σ√(2π))`。
   ```
   g      1.05   1.10   1.15   1.20   1.32
   翻盤人數上限  3.0%   5.8%   8.6%   11.2%  16.9%      （同一隻怪、全班最多這個比例的人輸贏被裝備改變）
   ```
   **所以「裝備把全班都推過關」做不到，裝備 ×1.32 最多改變約 17% 的人（一隻怪）。** 要讓更多慢的孩子有勝算，主力是難度層級（`HP_TIER`、`T_limit`），不是裝備。（推論）
3. **用「對數範圍佔比」當是否蓋過技巧的指標。**
   ```
   裝備佔比 = ln(g_max) / ln(v_max / v_min)
   ```
   `nw-sim` 樣本 11～53 字/分 → `ln(53/11)=1.57`，`ln(1.32)=0.278` → **17.7%**；用實測 p10～p90（3～19）→ 6.3 倍、`ln=1.85` → 15%。**建議上限 20%**（推論，沒有來源給這個數字，是我定的設計預算）。
4. **「次序保留」條件：兩個速度比為 ρ 的孩子，只有 `g_慢/g_快 ≥ ρ` 時裝備會把次序倒過來。** 目前 g_max=1.32，所以只有速度比 <1.32 的相近兩人（如 11 與 12）可能顛倒，這在實務上等於「差不多快」，可接受。**不要讓任何一件新裝備讓 g_max 超過下一個速度群的比例**（nw-sim 樣本中「慢 12」到「中 20」的比例是 1.67）。

**減傷與時間限制該放哪裡**：`SPEC-STAGE2` §3.4 觀察到「慢的孩子主要是時間到才輸」，所以：**輸出倍率（g）管過關速度；減傷與紅線預警管「倒下」**——這兩者影響不同的失敗原因，不能互相取代。設計目標寫成兩個指標：`勝率` 與 `倒下次數`，分別驗收（`SPEC` G2 與 G3 本來就分開，方向正確）。

**戰鬥長度**：先用現有模擬器目標範圍——快的孩子 ≥55 秒（G1）、中位勝利約 120～180 秒、時限 300 秒；會攻擊的怪「每場至少 2 次攻擊」（G1）。TTD 目標：中位學生每場倒下 ≤1 次（推論）。

**屬性**：目前藍武器對「怕」×1.1／「不怕」×0.9，合起來最高 ×1.32。**屬性屬於「選擇」不是「變強」**，所以 ×1.1 對 ×0.9 的對稱寫法好，並且與 `g_max` 一起算進預算（已在 `SPEC` G1 做）。

---

## 3. 動態難度與公平

### 3.1 重點原則與公式

**心流與難度曲線**

- **心流＝挑戰與技能都高且相配；挑戰超過技能偏向焦慮，技能超過挑戰偏向無聊／放鬆。** 需要明確目標、立即回饋。（摘要）[Chen：Flow in Games（CACM 2007）](https://cacm.acm.org/?p=1415)、[Game Developer：Anxiety, Boredom and Flow](https://gamedeveloper.com/design/anxiety-boredom-and-flow)、[Media Design：Flow and Flow Control](https://www.mediadesign.de/de/news/2017/flow-and-flow-control-how-design-games-player-growth-replay-value-and-great-gaming-experiences)
  ```
  挑戰/技能 比值   < 1：無聊／放鬆   ≈ 1：心流   > 1：焦慮
  ```
- **實驗證據：平衡條件的玩家體驗普遍較好；有些指標「挑戰略大於技能」比「無聊」更好玩。**（摘要）[CHI 2016：boredom／balance／overload 三版本遊戲研究](https://dx.doi.org/10.1145/2858036.2858563)。意思是**偏難一點比偏簡單安全**，但仍要有出口。（推論）
- **Schell 的挑戰透鏡：問「太簡單？太難？剛剛好？成功後難度怎麼升？」**（摘要）[Schell：Lens of Challenge](https://gamefroot-developer.gitbooks.io/jesse-schell-the-art-of-game-design-lenses-1-to-1/content/031.html)、[Lens of Flow](https://gamefroot-developer.gitbooks.io/jesse-schell-the-art-of-game-design-lenses-1-to-1/content/018.html)

**DDA（動態難度調整）與 rubber banding**

- **Hamlet（Valve 引擎）：用「庫存理論」調整遊戲內資源供需來控制難度，玩家屢次資源不足就視為卡關。** 初步結論是有調整比沒調整好、不傷玩家的主導感。（摘要，沒讀到結果章）[Hunicke & Chapman：Hamlet](https://users.cs.northwestern.edu/~hunicke/pubs/Hamlet.pdf)
- **Resident Evil 4 的隱形排名（1～10）：依命中率等調整傷害與敵人強度，難度設定只決定起點與上下限；效果細微且不宣傳，玩家不覺被看輕。**（摘要，speedrun 社群分析 v0.3.1，未經開發者確認）[Engadget：RE4 偷偷調難度](https://www.engadget.com/2015-06-03-resident-evil-4-difficulty.html)、[speedrun.com：Rank 分析](https://www.speedrun.com/re4pc07/guides/qorc9)
- **隱藏 vs 公開 DDA 的證據不一致：** 訓練出的行為模型 DDA 比傳統方法更討喜；Denisova & Cairns 擔心調整後玩家得到「被稀釋的挑戰」，但結果也顯示可提高沉浸；傳統規則式調整常被察覺成「橡皮筋」而被覺得煩或不公平。（摘要）[Newcastle：Enemy Within](https://openlab.ncl.ac.uk/research/enemy-within-long-term-motivation-effects-of-deep-player-behavior-models-for-dynamic-difficulty-adjustment)、[Denisova & Cairns 2015](https://www-users.york.ac.uk/~pc530/pubs/Denisova_CHIPLAY15.pdf)、[Aalto 碩論：隱藏 vs 公開 DDA](https://aaltodoc.aalto.fi/items/940fd4e0-96c6-491a-8613-e0983008f1cf)（沒讀到結論）
- **Mario Kart 用「落後者拿強道具、領先者拿弱道具」讓新手和老手在同一場競爭。** 效果是縮小技巧差距，代價是「好好開」的回報被稀釋，玩家常說「像被作弊」。（摘要，多為部落格與論壇）[Mario Wiki：MK8 道具機率表](https://www.mariowiki.com/Mario_Kart_8_item_probability_distributions)、[Game Design Post：Mario Kart Tour 的 rubber banding](https://medium.com/game-design-post/mario-kart-tours-rubber-banding-is-at-odds-with-its-monetisation-1f5b43909348)
- **「讓卡關的人看得到結局」的公開輔助：** Nintendo「Super Guide」在新超級瑪利歐 Wii 出現，NSMBU 版在同一關失敗 5 次後出現；Celeste 的 Assist Mode 允許改遊戲速度、體力、空中衝刺數，甚至無敵，並把原名「Cheat Mode」改成不帶評價的說法。（摘要）[Iwata Asks：Super Guide](https://www.nintendo.com/en-gb/Iwata-Asks/Iwata-Asks-New-Super-Mario-Bros-Wii/Volume-3/4-The-Peer-Evaluated-Super-Guide/4-The-Peer-Evaluated-Super-Guide-219590.html)、[GMTK：Super Mario 的隱形難度](https://gmtk.substack.com/p/super-marios-invisible-difficulty)、[Game Accessibility Guidelines：Celeste](https://gameaccessibilityguidelines.com/celeste-assist-mode)
- **教育遊戲的適性難度：理論根據是 Vygotsky 的近側發展區；現有回顧只說「需要更多實證」，大多數系統調的是任務難度，查不到「適性難度優於固定難度」的兒童證據。**（摘要）[Frontiers 2020：教育遊戲適性分析回顧](https://www.frontiersin.org/articles/10.3389/feduc.2020.611072/pdf)、[Frontiers 2023：適性遊戲式學習系統性回顧](https://www.frontiersin.org/articles/10.3389/fcomp.2023.1062350)

### 3.2 對打字勇者的啟示

- **現有設計（`BALANCE.md` §7）＝公開的四層級、升層要學生自己按、降層只有老師能做**，與 Celeste／Super Guide「公開、可選、不羞辱」同一路線，並避開了 DDA「偷偷把變強吃掉」的問題（`META-GROWTH.md` §1）。**這個決定有證據支持，不用回頭。**
- **新世界不再每場調血量，所以公平性靠三樣東西：** ① 層級（`HP_TIER`）決定「門檻速度」；② 裝備決定 `g`（受影響人數上限約 17%，見 §2.2）；③ 失敗時有公開出口。
- **失敗出口（建議）**：同一隻怪連輸 3 場，鐵匠鋪或委託板出現「找幫手」（推薦做一件灰裝／換低一星／教師調層級），**明說「這是幫手」不偷偷調**，沿用 Super Guide 的「失敗 N 次後才出現」（NSMBU 是 5 次，我們一週只有一節，建議 2～3 次，推論）。
- **不採用 Mario Kart 式「落後者獎勵」於排行榜**：全班總傷害與個人榜只比打字，補償放在 `T_limit`、HP 層級、裝備材料保底，不放在得分上。（推論）
- **「難度刻度公開讓玩家加」＝Hades 的 Heat 思路**，可用於快的孩子：高階學生可自願加「紅線更早收」「怪更硬 +10%」換更多材料（上限寫死）。**只往上加，不往下減**（降由老師）。（推論；第 2 段後再做）

---

## 4. 經濟設計

### 4.1 重點原則與公式

**水龍頭與排水口（source／sink）**

- **水龍頭（faucet）讓資源進遊戲，排水口（sink／drain）讓資源永久離開；兩者合起來決定價格。** 水龍頭大於排水口＝通膨。（摘要）[Cornell CS 3152：Balance](https://cs.cornell.edu/courses/cs3152/2013sp/lectures/07-Balance.pdf)、[Ludgate：The F-Words of MMOs: Faucets](https://gamedeveloper.com/design/the-f-words-of-mmos-faucets)、[Koster：Star Wars Galaxies 經濟統計](https://www.raphkoster.com/games/essays/astromech-stats-economy-stats/)
  ```
  ΔM(t) = Σ faucets(t) − Σ sinks(t)          M＝流通中資源總量
  通膨訊號：M 持續上升且人均持有 > 一個月的收入
  ```
- **Machinations（Dormans）：資源遊戲用「來源、排水、轉換器、交易者」四種節點畫經濟，可模擬回饋迴圈。**（摘要）[Adams & Dormans：Game Mechanics ch.5](https://www.oreilly.com/library/view/game-mechanics-advanced/9780132946728/ch05.html)、[Game Developer：Machinations](https://gamedeveloper.com/design/the-designer-s-notebook-machinations-a-new-way-to-design-game-mechanics)
- **固定排水口在玩家掌握產出時會失控；一個修正是把排水量綁價格水平。**（摘要，Sam Lewis AGC 講稿筆記）[Koster 站：AGC MMO economies](https://www.raphkoster.com/?p=680)。Koster 另寫過「mudflation」，多數控制手段是中央管控。[Boing Boing：Mudflation](https://boingboing.net/2007/01/19/mudflation-inflation.html)、[Simpson：Ultima Online 的遊戲內經濟](https://gwern.net/doc/economics/mechanism-design/1999-04-07-simpson-theingameconomicsofultimaonline.html)
- **成本曲線：價格＝收益；越強越貴；曲線形狀決定偏早期或後期。** 遞增曲線偏後期、遞減偏前期。（摘要）[Cornell 講義](https://cs.cornell.edu/courses/cs3152/2013sp/lectures/07-Balance.pdf)、[Schreiber & Romero：Game Balance](https://www.routledge.com/Game-Balance/Schreiber-Romero/p/book/9781315156422)
  ```
  成本曲線：每件物品「利益」換算成同一單位 → 同單位成本應相等
  選擇 A 或 B 的物品：cost ≥ cost(A) + cost(B)
  ```

**掉落率與保底（pity）**

- **保底：軟保底（機率逐步上升）＋硬保底（固定次數必出）。保底只限制最壞情況，不改變前面的抽。** 例：Genshin 基礎 0.6%、硬保底 90、綜合率約 1.6%（平均每 62.5 抽）；Wuthering Waves 50 抽起軟保底、80 抽必出。（摘要）[Plarium：Pity System](https://plarium.com/en/glossary/pity-system/)、[Sportskeeda：Genshin 保底](https://sportskeeda.com/esports/genshin-impact-pity-guide-for-yae-miko-tartaglia-banners-soft-pity-drop-rates-explained)、[Prima：Wuthering Waves](https://primagames.com/gaming/wuthering-waves-gacha-rates-and-pity-system-explained)
  ```
  無保底   期望 = 1/p            例 p=0.3 → 3.33 場；沒掉機率 P(連 n 場沒掉)=(1-p)^n
  硬保底 K（連續 K 次沒掉，第 K+1 次必掉）
           E = Σ_{k=1..K} k·(1-p)^(k-1)·p + (K+1)·(1-p)^K
  ```
  （已驗算）p=0.3、K=5：`E=2.94`（無保底 3.33）；最壞 6 場。無保底連打 10 場沒掉機率 `0.7^10=2.8%`，28 人班約 0.8 人。**保底的價值不是縮短平均，是把「那 0.8 人」消掉**。
- **Diablo III「Loot 2.0」：少掉、掉得更好、依職業智慧掉落，目標是「別讓背包塞滿你不要的東西」。**（摘要；沒查到保底細節）[PC Gamer：Reaper of Souls 掉落系統](https://pcgamer.com/diablo-3-reaper-of-souls-loot-system-designed-to-cut-the-legs-out-from-the-auction-house)、[Game Wisdom：Loot 2.0](https://game-wisdom.com/critical/loot-2-0-and-diablos-fourth-revival)

**強化：一定成功 vs 機率；對兒童**

- **MMO 強化的失敗處理有兩派：失敗毀裝（MapleStory、BDO，待核）或只損材料（Lost Ark）；好的系統讓每次失敗有累積效果。** 多篇批評說這類系統本質接近賭博，只是做得不明顯。（摘要，非權威）[MassivelyOP：Lost Ark 與強化系統](https://massivelyop.com/2022/10/20/four-winds-lost-ark-and-the-refinement-of-mmo-item-enhance-systems/)
- **對兒童：英國 2022 年質性研究（42 家庭，2019–2022）認為內購與開箱對兒童造成財務與情緒傷害；相關研究多數顯示開箱與問題賭博有相關（相關非因果）。** 規範建議限制 18 歲以上。（摘要）[Loughborough／Newcastle 報告](https://www.lboro.ac.uk/media-centre/press-releases/2022/november/loot-box-report-emotional-financial-harm-children/)、[英國賭博委員會顧問：開箱](https://www.gamblingcommission.gov.uk/print/lootboxes-advice-to-the-gambling-commission-from-absg)

### 4.2 對打字勇者的啟示

- **強化費用已經是二次曲線**（已驗算）：字元 `20,35,55,80,110` 完全符合
  ```
  cost(n) = 2.5n² + 7.5n + 10        n=1..5 → 20, 35, 55, 80, 110    累計 300
  ```
  每次強化武器攻擊力 +2（約 +2.0%、1.96%、1.92%、1.89%、1.85%），所以**每 +1% 要花 10、17.9、28.6、42.4、59.4 字元**：效率下降 6 倍，這就是遞減報酬，**不用再另外加數值遞減**。
- **「多久買得起」**：用狩獵收入 `20+6Lv`（Lv1/5/12/22＝26/50/92/152）；以每戰約 50 字元、一節 2 場估（已驗算）：
  ```
  價格     需要場數    約幾節課
  30       0.6         0.3
  120      2.4         1.2
  300      6           3
  600      12          6
  3600     72          36
  ```
  **一學期以 14 節計**，收入約 1,400～2,100 字元（每節 100～150）；`SPEC` §3.8 用 20 節估 2,500～3,000，所以「全身綠 +5（3,600）」在 14 節的學期要**約 1.7～2.6 學期**才買得完。這未必是壞事（一直有存錢目標），但**要決定：是否願意讓多數人一學期做不完全套**。（推論，收入假設是 `SPEC` 的）
- **設計目標（價格表）**：小件（≤120）≤1 節；一次強化 +1～+3 ≤1.5 節；一整套灰裝＋強化至 +3 約 3～4 節；全套綠 +5 約 2 學期。這是「**時間目標先定、價格後算**」的寫法（見 §7）。
- **兒童保護**：一定成功的強化已與研究方向一致，**不要加「機率成功」或「失敗掉級」**；圖紙掉落（30% ＋保底）是唯一隨機，保底 K=5 的 `E≈2.94`、最壞 6 場（約 3 節課）可以接受。（推論）**保底該設計在「最壞情況」而不是平均**。
- **材料掉落別讓人卡**：材料「贏全拿、輸一半最少 1」本身接近確定性，是對的；若加入機率材料，用「p95 場數」當設計值：`n95 = ln(0.05)/ln(1−p)`（p=0.3 → 8.4 場，約 4 節課）。（已驗算）

---

## 5. 數值驗證方法

### 5.1 重點原則與公式

- **先定設計目標（一場多久、勝率多少、多久升一級），再用公式反推數值，最後用模擬驗證。** 平衡在多數情境指的是數學：等級曲線、物品成本、血量，用試算表與分析模型做。（摘要）[O'Reilly：Math and Game Balance（Intro to Game Design）](https://www.oreilly.com/library/view/introduction-to-game/9780133439571/ch11.html)、[Schreiber：Game Balance Concepts 課程](https://gdcvault.com/play/1023349/A-Course-About-Game)
- **公式在極端值會壞，要在公式外加硬限制。**（摘要）[Carthage：Numeric analysis](https://sites.google.com/carthage.edu/game-design/lessons/numeric-analysis)
- **蒙地卡羅與機器人試玩：Zook 等用 MCTS 代理人（不同技能）算出平衡指標；一篇自動平衡研究發現單一牌組要約 2,000 次模擬才取得穩定指標。**（摘要）[Zook 等 FDG 2015](https://faculty.cc.gatech.edu/~riedl/pubs/zook-fdg15.pdf)、[arXiv：自動遊戲平衡的可行性](https://arxiv.org/pdf/1603.03795)
- **玩家分群（persona）：Holmgård 等把玩家原型形式化成效用函數，做成自動試玩的「程序化人格」。批評是靜態 persona 只能說明玩家做過什麼。**（摘要）[Holmgård：Procedural Personas](https://arxiv.org/pdf/1802.06881)、[arXiv：Playtesting: What is Beyond Personas](https://arxiv.org/pdf/2107.11965)
- **遙測與留存：用存活分析（survival analysis）看玩家在哪個時間點流失；基礎術語見 Drachen 等的《Game Analytics》。**（摘要）[Game Analytics 書目](https://www.springer.com/in/book/9781447147688)、[arXiv：玩時間的存活分析](https://pdf.arxiv.org/pdf/1701.02359)
- **勝率不是唯一指標：** Riot 的框架依禁用率分級，勝率容忍帶隨禁用率縮窄；星海爭霸 II 團隊接受約 ±5% 並說「單一指標不夠、不能只靠資料」。（摘要）[Riot：Champion balance framework](https://nexus.leagueoflegends.com/en-au/2019/05/dev-champion-balance-framework/)、[GDC：Balancing LoL from Bronze to Bengi](https://gdcvault.com/play/1024684/Balancing-League-of-Legends-for)、[Blizzard：SC2 The Balancing Act](https://news.blizzard.com/en-us/article/1136961/starcraft-ii-the-balancing-act)、[Game Developer：Browder「不能只靠資料」](https://gamedeveloper.com/game-platforms/-i-starcraft-ii-i-s-browder-you-can-t-rely-solely-on-data)
- **常見失誤案例：** 敵人隨玩家等級（Oblivion）抵銷成長感；power creep（Magic、PoE）；數字爆炸（D4）；本專案自己的案例：舊版 `balance-sim` 把慢速打字者的速度下限鎖成 `max(0.3,…)`，等於把 wpm 3 的學生當 wpm 18 模擬，表是假的（`BALANCE.md` §11）。

**樣本數與顯著性（已驗算）**

```
單一勝率 95% 信賴區間     ± 1.96·√(p(1-p)/n)     n=300,p=0.5 → ±5.7pp ；n=1000 → ±3.1pp
兩組勝率差顯著（獨立樣本）  需 n ≥ 2·p(1-p) / (Δ/1.96)²        Δ=5pp,p=0.5 → n ≈ 770 每組
```

### 5.2 對打字勇者的啟示

- **現有驗收標準（`SPEC-STAGE2` G2、G3：差 ≥5pp、每格 300 場）統計力不足**：若兩格用獨立亂數，300 場的 5pp 差距不顯著（需約 770 場）。**建議兩個辦法擇一**：① 兩組用**相同亂數種子**（common random numbers，讓差只來自裝備；現有 `run.mjs` 以 `i*1000+k+7` 固定種子，需確認裝備前後用同一組）；② 每格拉到 1,000 場。（推論）
- **敏感度分析（一次動一個參數）**：每個旋鈕（`g`、`HP_TIER`、`T_limit`、反應時間、`wordFast`）各 ±20%，記錄「勝率變化、勝利秒數變化」，排成龍捲風圖。**影響最大的前三個先實測**，其餘不用精雕。（推論）
- **persona 要涵蓋「學期後」的自己：** 同一個孩子的速度會成長（有研究：結構化課程 24 週平均 +4.5 字/分，來源二手且作者與課程有關，待核；Ertl 2007：五年級 20 wpm 到七年級仍維持），模擬要有「學期初／學期末」兩組速度。（摘要，推論）
- **遙測要記的最少欄位**：每場的 `勝負、秒數、倒下數、材料、字元餘額、當時層級與裝備倍率`，以及「連輸次數」。先看「卡在哪一隻」（存活分析的簡化版：各星級的通過率與嘗試次數）。

---

## 6. 打字與節奏遊戲的難度

### 6.1 重點原則與公式

**兒童打字速度（查到的數據）**

| 來源 | 對象 | 數據 | 備註 |
|---|---|---|---|
| NAEP 2011 usability study（NCES 2015119） | 美國四年級英文鍵盤 | **平均 12 wpm**；八年級 30 wpm；2012 年試測中有人僅 4、有人到 25 | （摘要）官方 [NCES](https://nces.ed.gov/nationsreportcard/pubs/writing/2015119.aspx)；原始 2011 報告沒找到 |
| 美國回顧（Freeman 等 2005，經 2018 論文引用） | 五年級 | **4.7～70 wpm**，變異極大；Ertl 2007：五年級 20 wpm 到七年級仍維持 | （摘要，二手）[2018 回顧](https://informahealthcare.com/doi/full/10.1080/19411243.2018.1512067) |
| Wisconsin DPI 標準 | 各年級 | 「5 wpm × 年級」→ 四／五／六年級約 20／25／30（我的算術） | 作者自己說未必有研究依據 [DPI](https://dpi.wi.gov/bit/standards/elementary-keyboarding) |
| AJOT 2020 摘要 | 五、六年級 | 有年級差異，但摘要看不到數字 | [摘要](https://sage.cnpereading.com/doi/10.5014/ajot.2020.74S1-PO8114) |
| 台灣 ICCE 論文 | **二年級（8～9 歲）注音**，204 人 | **平均 12.48 字/分**（定義是每分鐘字數）；持續練習兩學期 | （摘要）[ICCE](https://library.apsce.net/index.php/ICCE/article/download/1039/970)；另見 [NCU 摘要](https://scholars.ncu.edu.tw/en/publications/investigating-the-factors-of-practice-time-and-literacy-on-childr/) |
| Dhakal 等 CHI 2018（成人） | 16.8 萬人 | 平均 **52 wpm**，最快 120；快打者較少錯、手指重疊（rollover） | [Aalto](https://userinterfaces.aalto.fi/136Mkeystrokes/)、[論文](https://www.pokristensson.com/pubs/DhakalEtAlCHI2018.pdf) |
| 本專案實測（`BALANCE.md` §0，2026-09） | 17 班 139 筆 `bestWpm` | p10=3、p25=6、**中位 10**、p75=14、p90=19、最高 45；四／五／六年級中位 7／10／13 | 單位是「每分鐘正確字數」 |

- **沒有查到**：四～六年級的**注音**輸入速度、中文兒童打字常模。單位也不同：英文 wpm＝5 個字母；台灣論文是「字」；本專案是「正確字數」且包含戰鬥中的換線與等待，數字**不能直接互比**。（推論）
- **速度與準確率的取捨：** 打字是 Fitts 定律（距離越遠越慢）與 Hick 定律（選項越多越慢）的平衡，練習會降低選項數的影響；速度－準確取捨在指向任務有直接證據。（摘要）[Ulrich, Lindsey & Logan 2016](https://cognitiveresearchjournal.springeropen.com/articles/10.1186/s41235-016-0007-6)、[MacKenzie & Isokoski 2008](https://www.yorku.ca/mack/chi2008.html)。有商業頁面說 80+ wpm 的人錯誤是 50–65 wpm 的兩倍，**來源無法驗證，不要引用**。
  ```
  Fitts   MT = a + b·log2(D/W + 1)       Hick   RT = a + b·log2(n + 1)
  ```
- **常見的速度分布近似對數常態**（推論：只有本專案資料擬合 σ≈0.65；沒有兒童研究給分布形狀）。

**打字／節奏遊戲的難度設計**

- **打字遊戲：玩家 20 wpm（看鍵盤）與 110 wpm（盲打）差 5 倍以上，設計成「固定時間反應」會讓兩端都不好玩；玩家也會在最後一個字前等待「對的時機」。**《Typing of the Dead: Overkill》依速度與準確率調難度，有 3 級加一個 hardcore。（摘要）[Game Developer：Finding gameplay depth in typing games](https://www.gamedeveloper.com/game-platforms/finding-gameplay-depth-in-typing-games)。**ZType、TypeRacer、Guitar Hero 的難度設計沒有搜到可用資料。**
- **osu! 的星級＝自動演算：把每個物件丟進「skills」（aim、speed…）算 strain，strain 隨時間衰減；mania 早期版本只看音符密度與數量。**（摘要）[osu! wiki：Star rating](https://osu.ppy.sh/wiki/Beatmap/Star_rating)、[osu! 2021 SR 更新](https://osu.ppy.sh/home/news/2021-11-09-performance-points-star-rating-updates)。
  ```
  strain_t = strain_{t-Δ}·decay^(Δ) + 物件難度       難度 = 持續高強度的程度，不是單點峰值
  ```
- **對打字遊戲的概念轉譯：** 難度＝「單位時間需要的字數」與「持續時間」，不只是單字長度。

### 6.2 對打字勇者的啟示

- **本專案手速中位 10、p90 19（139～229 筆實測），比美國四年級 12 wpm 還低一點，且比台灣二年級注音 12.48 字/分低**，不是學生打字不行，而是單位與場景不同（戰鬥中要換線、閃避、等字出現）。（推論）**用本專案自己的分布當 persona，不要用外部 wpm**。
- **速度範圍約 6 倍（p10～p90）、極端 15 倍**，所以「一種難度」不可能：層級（`HP_TIER`）是必要的，裝備不能補這個差距（§2.2）。
- **把怪的難度寫成「每秒需要的正確字」**：`需要速度 = H/(g·T_limit)`（§2.2），再除以 persona 速度得到「壓力比」；壓力比 ≈ 0.8～1.0 為「剛好」，>1.2 為「焦慮區」。（推論，套用 §3 的心流比值）
- **準確率不另外懲罰**（`META-GROWTH.md` §3.6 已有理由）；打錯本來就 0 傷害。維持。

---

## 7. 建議的設計流程與公式清單

### 7.1 先定的設計目標（寫下來、驗收時逐條對）

| # | 目標 | 建議值 | 依據 |
|---|---|---|---|
| T1 | 一場戰鬥時長（贏的場） | 中位 120～180 秒；快的 ≥55 秒；時限 300 秒 | `SPEC` G1、§2；TTK 與選擇數有關（§2） |
| T2 | 各速度組勝率（對「適合的星級」，無裝備） | 慢 70%、中 85%、快 95%+ | 心流偏難一點比無聊安全（§3）；（推論，數字是我定的） |
| T3 | 裝備帶來的勝率提升 | 慢 約 +6～+11pp（`SPEC` §3.4 粗跑）；全班翻盤人數 ≤17% | §2.2 的上限公式 |
| T4 | 裝備佔「對數技巧範圍」比例 | ≤20% | §2.2（推論） |
| T5 | 倒下次數 | 中位學生每場 ≤1 次；防具讓慢的倒下少 ≥30% | `SPEC` G3 |
| T6 | 升級／解鎖節奏 | 第一件裝備第 1 節；一次強化 ≤30 秒；一個新星級約 2～3 節 | `SPEC` §3.1 一節課流程 |
| T7 | 經濟 | 小件 ≤1 節；全套灰＋強化 3～4 節；全套綠 +5 約 2 學期 | §4.2 |
| T8 | 掉落最壞情況 | 圖紙最壞 ≤6 場（約 3 節） | §4.1 保底公式 |
| T9 | 壓力比（`H/(g·T_limit)`÷速度） | 0.8～1.0 為剛好，>1.2 要有公開出口 | §6.2 |

### 7.2 用哪個公式反推哪個數值

1. **敵人血量曲線**：參考角色取「慢」代表（p25），目標 T2 勝率 70% 對應的「贏的時間」`T_win`：
   ```
   H(★) = r_ref · T_win(★)           r_ref＝慢參考的有效傷害率；T_win(★)＝目標贏的秒數
   H(★) = H1 · (1 + s·(★-1))         s≈0.2～0.3（每星 +20～30%，高於一般 JND）
   H(Lv) = hpBase + hpPerLv·Lv       跨區沿用線性（BALANCE v3 已證明飽和曲線後期沒壓力）
   ```
   每星 +20～30% 會讓每一星大約少一成多的人通過，這是（推論），要用模擬驗證（見 7.3）。
2. **裝備倍率（預算）**：先定總預算 `g_max`，再分配給武器、屬性：
   ```
   g_total = (1 + Σ武器加成)·(屬性)   ≤ 1.32     （武器加法池 ×屬性連乘，全遊戲只允許這兩層）
   防具 c_total = Σ c_i   ≤ 0.30       （超過改 d/(1+d)：受傷剩 1/(1+d)）
   g_max ≤ exp(0.20 · ln(v_max/v_min))  = 1.37（以 v_max/v_min=4.8 計；與 1.32 一致）
   每次強化步長 Δg ≈ 2% → 顯示成「少 N 秒」：ΔT = T_win·(1−1/g)
   ```
   （已驗算）g=1.02／1.05／1.10／1.20／1.32 → TTK 縮短 2.0%／4.8%／9.1%／16.7%／24.2%；對 150 秒的戰鬥＝少 3／7／14／25／36 秒。
3. **強化費用**：沿用 `cost(n)=2.5n²+7.5n+10`（×顏色倍率 1／2／3），驗收「每 +1%攻擊力要花多少」遞增即可。
4. **經驗／等級**：`cum(L)=a·L^b`，b=1.5～2，`a = cum_target / L_target^b`（§1.2 表）；每場經驗用 `c` 定，使「第 5 級在第 3～5 節」。
5. **字元收入與價格**：
   ```
   收入/節  I = 2 場 × 平均每場字元 ≈ 100～150（Lv1～12）
   價格     P = I × 目標節數       例：全套灰＋強化 3 約 3.5 節 ≈ 400～500
   全套綠+5 總價 ≈ I × 學期節數 × 1.7～2.6（目標約 2 學期）
   ```
   水龍頭（收入）已寫死，排水口（價格）用上式反算；每學期期初用教師頁「平均持有字元」看是否通膨。
6. **掉落**：圖紙機率 p、保底 K 由「最壞場數」`K+1` 反推，平均場數 `E` 用 §4.1 公式；材料用 p95：`n95=ln0.05/ln(1−p)`。

### 7.3 需要用模擬驗證的假設

| 假設 | 風險 | 怎麼驗 |
|---|---|---|
| 速度分布近似對數常態 σ≈0.65 | 若重尾，翻盤人數上限的估計會偏 | 用雲端 `mg_scores` 重擬；或用經驗分布直接取代公式 |
| 慢者主要輸在「時間到」 | 若主要輸在「倒下」，防具比武器重要 | `nw-sim` 記錄失敗原因（時間到／倒下）分開統計 |
| 每星 +20～30% 血量是可察覺的一階 | 太小感覺不到、太大卡關 | 掃 s=0.1～0.4，看各 persona 通過率階梯 |
| 全班翻盤人數 ≤17% 時仍有進步感 | 看不到進步 | 試玩訪談；顯示「少 N 秒」是否被孩子注意到 |
| 學期內速度會成長（+2～5 字/分？） | 前期合適的血量後期變太簡單 | persona 加「學期初／末」兩組；後期重跑 |
| 二次強化費用導致多數人停在 +3 | 強化變成沒人用 | 遙測各強化等級人數；`META-GROWTH` §4.2 同樣用累計曲線看 |
| 保底 K=5 的最壞 6 場能被接受 | 一個學生連 3 節沒圖紙 | 遙測 `bpDry`；模擬班級 28 人最壞值 |
| 公開出口（連輸 2～3 場）會被濫用 | 孩子故意輸 | 出口只給一次性、只看連輸、不給稀有物；教師頁可看 |
| 樣本數足夠 | 驗收被雜訊決定 | 同種子（CRN）或每格 1,000 場（§5.1） |

### 7.4 建議的工作順序

1. 把 T1～T9 寫進 `SPEC-STAGE2` §3.4 的驗收表（或另開 `docs/BALANCE-NW.md`）。
2. 升級 `nw-sim`：記失敗原因、支援「學期初／末」persona、固定種子配對（CRN）。
3. 掃參數：`s`（星級步長）、`g`、`T_limit`；畫「勝率－速度」曲線（S 形），對照 T2。
4. 檢查「全班翻盤人數」與「裝備佔比」，過就上線，不過就改 §7.2 的預算而不是改驗收。
5. 上線兩週後用遙測（勝負、秒數、連輸、字元餘額）對照模擬，修 persona 假設。

---

## 8. 參考資料總表

### 1 數值成長曲線
| 標題 | 作者／來源 | 連結 | 一句話 |
|---|---|---|---|
| RPG 等級制的遊戲設計數學 | Davide Aversa | [連結](https://davideaversa.it/blog/gamedesign-math-rpg-level-based-progression/) | 多項式後期增量變小，指數比例固定（摘要） |
| XP Curve Calculator | ziva.sh | [連結](https://ziva.sh/tools/xp-level-curve-calculator) | 平方多項式是安全起點，敵人經驗要跟等級成長（非權威） |
| Experience | Bulbapedia | [連結](https://bulbapedia.bulbagarden.net/wiki/Experience) | Pokémon 經驗組為立方曲線，100 級累計 0.8～1.25 百萬（摘要） |
| Paragon 經驗表 | Diablo Wiki | [連結](https://diablowiki.net/Paragon_experience_charts) | D3 巔峰曲線 60 級後變陡，官方公式未公開 |
| Experience Mechanics | Maxroll | [連結](https://maxroll.gg/d3/resources/experience-explained) | D3 經驗機制；公式互相矛盾不引用 |
| 3 ways power curves impact progression | Game Developer | [連結](https://gamedeveloper.com/design/the-3-ways-power-curves-impact-progression) | 玩家與內容成長要對著調（摘要） |
| Tracking Power Curves Through Progression | Game Wisdom | [連結](https://game-wisdom.com/?p=11706) | 成長太快變散步、太慢無進步感 |
| Learning curve | Wikipedia | [連結](https://en.wikipedia.org/wiki/Learning_curve) | S 曲線為學習曲線的理想形 |
| Power law of practice | Wikipedia | [連結](https://en.wikipedia.org/wiki/Power_law_of_practice) | 練習時間為練習次數的負冪函數 |
| Refining the Law of Practice | Univ. of Amsterdam | [連結](https://dare.uva.nl/id/717fcfb1-edf1-4010-9959-2b0acccb9c8b) | 冪律可能是平均化的假象（摘要） |
| Weber–Fechner law | Wikipedia | [連結](https://en.wikipedia.org/wiki/Weber%E2%80%93Fechner_law) | 可察覺差異是起始值的固定比例 |
| Just-noticeable difference | Wikipedia | [連結](https://en.wikipedia.org/wiki/Just-noticeable_difference) | JND 通常是被偵測到至少一半的變化 |
| The Math of Idle Games | A. Pecorella／Kongregate | [連結](https://gamedeveloper.com/design/the-math-of-idle-games-part-i) | 成本指數、產出線性（摘要） |
| Magic 24 年設計心得 | Game Developer | [連結](https://gamedeveloper.com/design/what-game-devs-can-learn-about-design-from-24-years-of-i-magic-the-gathering-i-) | Rosewater 的 Escher 樓梯（摘要） |
| Power creep | MTG Wiki | [連結](https://mtg.wiki/page/Power_creep) | power creep 讓舊卡失去價值 |
| PoE2 避免 D4 傷害數字 | PC Gamer | [連結](https://pcgamer.com/games/rpg/we-dont-have-to-worry-about-trillions-of-damage-path-of-exile-2-is-trying-to-avoid-diablo-4s-game-breaking-damage-numbers-director-says) | 十年 power creep 的教訓（摘要） |
| Oblivion 升級系統是「錯誤」 | VideoGamer | [連結](https://www.videogamer.com/news/elder-scrolls-iv-oblivion-levelling-system-mistake-admits-designer-haunts-remaster) | 全敵人等級縮放抵銷成長感（二手） |

### 2 戰鬥平衡
| 標題 | 作者／來源 | 連結 | 一句話 |
|---|---|---|---|
| Damage | Bulbapedia | [連結](https://bulbapedia.bulbagarden.net/wiki/Damage) | Pokémon 傷害式連乘 STAB、屬性、隨機 |
| BW Complete Damage Formula | Smogon | [連結](https://www.smogon.com/resources/competitive/bw/bw_complete_damage) | 第五代傷害公式的完整順序 |
| Armor | PoE Wiki | [連結](https://www.poewiki.net/wiki/Armor) | 護甲減傷是 AR/(AR+10·DMG) 型 |
| PoE2 護甲 | Mobalytics | [連結](https://mobalytics.gg/poe-2/guides/armour) | 硬上限 90%（摘要） |
| Armor | Predecessor Wiki | [連結](https://predecessor.wiki.gg/wiki/Armor) | `1−100/(100+Armor)` |
| Debuffs | StS Wiki | [連結](https://slaythespire.wiki.gg/wiki/Debuffs) | 力量先加、易傷虛弱再乘、捨去 |
| Vulnerable | StS Fandom | [連結](https://slay-the-spire.fandom.com/wiki/Vulnerable) | 易傷＝多受 50% |
| Damage multipliers explained | Maxroll | [連結](https://maxroll.gg/d3/resources/damage-multipliers-thorns-explained) | 同類相加、類別相乘 |
| D4 傷害修改器 PSA | Blizzard 論壇（社群） | [連結](https://us.forums.blizzard.com/en/d4/t/this-is-why-your-damage-sucks%E2%80%94a-psa-on-damage-modifiers/58203) | 乘法疊加比加法快（社群） |
| Number Punchers | Game Developer | [連結](https://gamedeveloper.com/design/number-punchers-how-i-final-fantasy-i-and-i-dragon-quest-i-handle-combat-math) | FF 與 DQ 的減法式戰鬥數學 |
| subtractive vs divisive | RPG Maker 論壇 | [連結](https://rpgmaker.net/forums/topics/21673) | 減法式易無敵，除法式難心算 |
| How balance can affect difficulty | Game Developer | [連結](https://gamedeveloper.com/design/how-balance-can-affect-difficulty) | TTK 隨技能成比例 |
| Battlefield V TTK | mp1st／Red Bull | [連結](https://mp1st.com/news/battlefield-5-time-to-death-tests-done-with-public-dice-admits-higher-ttk-is-not-) | DICE 承認高 TTK 不平衡 |
| Battlefield 1 武器平衡 | EA | [連結](https://www.ea.com/games/battlefield/news/improving-battlefield-1-weapon-balance) | 官方 TTK 調整說明（只讀標題） |
| Zeboyd JRPG 設計 | Game Developer | [連結](https://gamedeveloper.com/design/the-zeboyd-games-approach-to-jrpg-design) | 戰鬥長度與選擇數 |
| Balancing Multiplayer Games Part 1／3 | Sirlin | [連結](https://www.sirlin.net/articles/balancing-multiplayer-games-part-1-definitions) | 平衡＝多個選項可行；先清空神級 |
| RPS 對稱與均衡 | UMD | [連結](https://math.umd.edu/~petersd/401/html/game_ex.html) | 改 payoff 會偏離均勻均衡 |
| Imbalance in RPS Games | arXiv | [連結](https://arxiv.org/html/2511.00374v1) | RPS 類遊戲的失衡定義 |
| Habgood & Ainsworth 2011 | Sheffield Hallam | [連結](https://shura.shu.ac.uk/3556) | 內在整合的教育遊戲效果 |
| Hades Pact of Punishment | Kotaku／RPGSite | [連結](https://kotaku.com/everything-you-need-to-know-about-hades-endgame-1845239105) | 公開、可自訂的 Heat 難度 |

### 3 動態難度與公平
| 標題 | 作者／來源 | 連結 | 一句話 |
|---|---|---|---|
| Flow in Games | Jenova Chen／CACM | [連結](https://cacm.acm.org/?p=1415) | 讓玩家自己調整挑戰而非強迫選級（摘要） |
| Anxiety, Boredom and Flow | Game Developer | [連結](https://gamedeveloper.com/design/anxiety-boredom-and-flow) | 挑戰與技能的帶狀區 |
| Flow and Flow Control | Media Design | [連結](https://www.mediadesign.de/de/news/2017/flow-and-flow-control-how-design-games-player-growth-replay-value-and-great-gaming-experiences) | 宏觀心流＝難度曲線；給玩家控制權 |
| boredom／balance／overload 研究 | CHI 2016 | [連結](https://dx.doi.org/10.1145/2858036.2858563) | 平衡最佳；過載有時優於無聊 |
| Lens of Challenge／Flow | Jesse Schell | [連結](https://gamefroot-developer.gitbooks.io/jesse-schell-the-art-of-game-design-lenses-1-to-1/content/031.html) | 太易、太難、剛剛好；成功後難度怎麼升 |
| Hamlet | Hunicke & Chapman | [連結](https://users.cs.northwestern.edu/~hunicke/pubs/Hamlet.pdf) | 用庫存理論調整資源供需做 DDA |
| RE4 偷偷調難度 | Engadget | [連結](https://www.engadget.com/2015-06-03-resident-evil-4-difficulty.html) | 隱形排名細微調整不被察覺 |
| RE4 Rank 分析 | speedrun.com | [連結](https://www.speedrun.com/re4pc07/guides/qorc9) | 排名 1～10，未經開發者確認 |
| Enemy Within | Newcastle | [連結](https://openlab.ncl.ac.uk/research/enemy-within-long-term-motivation-effects-of-deep-player-behavior-models-for-dynamic-difficulty-adjustment) | 傳統調整易被察覺成橡皮筋 |
| Denisova & Cairns 2015 | York | [連結](https://www-users.york.ac.uk/~pc530/pubs/Denisova_CHIPLAY15.pdf) | 適性可能稀釋挑戰但提高沉浸 |
| 隱藏 vs 公開 DDA | Aalto 碩論 | [連結](https://aaltodoc.aalto.fi/items/940fd4e0-96c6-491a-8613-e0983008f1cf) | 比較是否告知玩家 DDA（沒讀到結論） |
| MK8 道具機率 | Mario Wiki | [連結](https://www.mariowiki.com/Mario_Kart_8_item_probability_distributions) | 依距領先者距離選道具表 |
| Mario Kart rubber banding | Game Design Post | [連結](https://medium.com/game-design-post/mario-kart-tours-rubber-banding-is-at-odds-with-its-monetisation-1f5b43909348) | 縮小技巧差距、保持派對氣氛 |
| Super Guide | Iwata Asks／Nintendo | [連結](https://www.nintendo.com/en-gb/Iwata-Asks/Iwata-Asks-New-Super-Mario-Bros-Wii/Volume-3/4-The-Peer-Evaluated-Super-Guide/4-The-Peer-Evaluated-Super-Guide-219590.html) | 讓新手也看到結局的公開輔助 |
| Super Mario 的隱形難度 | GMTK | [連結](https://gmtk.substack.com/p/super-marios-invisible-difficulty) | 瑪利歐用隱藏機制取代難度選單 |
| Celeste Assist Mode | Game Accessibility Guidelines | [連結](https://gameaccessibilityguidelines.com/celeste-assist-mode) | 可調規則、不評價的措辭 |
| 教育遊戲適性分析回顧 | Frontiers 2020 | [連結](https://www.frontiersin.org/articles/10.3389/feduc.2020.611072/pdf) | 適性設計需要更多實證 |
| 適性遊戲式學習回顧 | Frontiers 2023 | [連結](https://www.frontiersin.org/articles/10.3389/fcomp.2023.1062350) | 近側發展區為理論基礎 |

### 4 經濟設計
| 標題 | 作者／來源 | 連結 | 一句話 |
|---|---|---|---|
| Game Mechanics: Advanced Game Design ch.5 | Adams & Dormans | [連結](https://www.oreilly.com/library/view/game-mechanics-advanced/9780132946728/ch05.html) | Machinations 的來源、排水、轉換器、交易者 |
| Machinations | Game Developer | [連結](https://gamedeveloper.com/design/the-designer-s-notebook-machinations-a-new-way-to-design-game-mechanics) | 用圖形模擬遊戲內經濟 |
| The F-Words of MMOs: Faucets | Simon Ludgate／Game Developer | [連結](https://gamedeveloper.com/design/the-f-words-of-mmos-faucets) | 水龍頭與排水口（只有片段） |
| Astromech Stats: Economy Stats | Raph Koster | [連結](https://www.raphkoster.com/games/essays/astromech-stats-economy-stats/) | SWG 的水龍頭－排水口經濟 |
| AGC: MMO economies | Koster 站（Sam Lewis 筆記） | [連結](https://www.raphkoster.com/?p=680) | 固定排水口會惡性通膨，綁價格水平 |
| Mudflation | Boing Boing | [連結](https://boingboing.net/2007/01/19/mudflation-inflation.html) | 虛擬世界通膨的控制手段 |
| The In-Game Economics of Ultima Online | Simpson | [連結](https://gwern.net/doc/economics/mechanism-design/1999-04-07-simpson-theingameconomicsofultimaonline.html) | UO 的經濟分析（未讀全文） |
| Balance 講義 | Cornell CS 3152 | [連結](https://cs.cornell.edu/courses/cs3152/2013sp/lectures/07-Balance.pdf) | 成本曲線與來源／排水 |
| Game Balance | Schreiber & Romero | [連結](https://www.routledge.com/Game-Balance/Schreiber-Romero/p/book/9781315156422) | 經濟系統、成本曲線、機率章節 |
| Pity System | Plarium | [連結](https://plarium.com/en/glossary/pity-system/) | 軟、硬保底定義 |
| Genshin 保底 | Sportskeeda | [連結](https://sportskeeda.com/esports/genshin-impact-pity-guide-for-yae-miko-tartaglia-banners-soft-pity-drop-rates-explained) | 0.6%、硬保底 90 |
| Wuthering Waves 保底 | Prima Games | [連結](https://primagames.com/gaming/wuthering-waves-gacha-rates-and-pity-system-explained) | 50 抽軟保底、80 抽必出 |
| Reaper of Souls 掉落 | PC Gamer | [連結](https://pcgamer.com/diablo-3-reaper-of-souls-loot-system-designed-to-cut-the-legs-out-from-the-auction-house) | Loot 2.0 少而精的目標 |
| Loot 2.0 | Game Wisdom | [連結](https://game-wisdom.com/critical/loot-2-0-and-diablos-fourth-revival) | 智慧掉落的設計取向 |
| Lost Ark 與強化系統 | MassivelyOP | [連結](https://massivelyop.com/2022/10/20/four-winds-lost-ark-and-the-refinement-of-mmo-item-enhance-systems/) | 失敗要有累積；批評近似賭博 |
| 開箱對兒童的傷害 | Loughborough／Newcastle | [連結](https://www.lboro.ac.uk/media-centre/press-releases/2022/november/loot-box-report-emotional-financial-harm-children/) | 42 家庭質性研究 |
| 開箱建議 | 英國賭博委員會顧問 | [連結](https://www.gamblingcommission.gov.uk/print/lootboxes-advice-to-the-gambling-commission-from-absg) | 相關性研究與預防原則 |

### 5 數值驗證方法
| 標題 | 作者／來源 | 連結 | 一句話 |
|---|---|---|---|
| Math and Game Balance | Intro to Game Design／O'Reilly | [連結](https://www.oreilly.com/library/view/introduction-to-game/9780133439571/ch11.html) | 平衡是試算表與分析模型 |
| A Course About Game Balance | Ian Schreiber／GDC | [連結](https://gdcvault.com/play/1023349/A-Course-About-Game) | 平衡課程的設計說明 |
| Numeric analysis | Carthage College | [連結](https://sites.google.com/carthage.edu/game-design/lessons/numeric-analysis) | 公式在極端值會壞，要硬限制 |
| Zook 等 FDG 2015 | Georgia Tech | [連結](https://faculty.cc.gatech.edu/~riedl/pubs/zook-fdg15.pdf) | MCTS 代理人算平衡指標 |
| Automatic Game Balancing | arXiv 1603.03795 | [連結](https://arxiv.org/pdf/1603.03795) | 約 2,000 次模擬的準確度成本平衡 |
| Procedural Personas | Holmgård 等 | [連結](https://arxiv.org/pdf/1802.06881) | 把玩家原型形式化做自動試玩 |
| Playtesting: Beyond Personas | arXiv | [連結](https://arxiv.org/pdf/2107.11965) | 靜態 persona 的限制 |
| Game Analytics | Springer | [連結](https://www.springer.com/in/book/9781447147688) | 遊戲遙測與分析的專書 |
| 遊戲時間的存活分析 | arXiv 1701.02359 | [連結](https://pdf.arxiv.org/pdf/1701.02359) | 用存活／危險曲線看流失 |
| Champion balance framework | Riot | [連結](https://nexus.leagueoflegends.com/en-au/2019/05/dev-champion-balance-framework/) | 勝率容忍帶隨禁用率調整 |
| Balancing LoL from Bronze to Bengi | GDC | [連結](https://gdcvault.com/play/1024684/Balancing-League-of-Legends-for) | 對每個技術層級都要平衡（只讀標題） |
| SC2 The Balancing Act | Blizzard | [連結](https://news.blizzard.com/en-us/article/1136961/starcraft-ii-the-balancing-act) | 勝率±5% 與多指標 |
| Browder：不能只靠資料 | Game Developer | [連結](https://gamedeveloper.com/game-platforms/-i-starcraft-ii-i-s-browder-you-can-t-rely-solely-on-data) | 資料是必要但不充分 |

### 6 打字與節奏遊戲
| 標題 | 作者／來源 | 連結 | 一句話 |
|---|---|---|---|
| NAEP 寫作電腦化報告 | NCES | [連結](https://nces.ed.gov/nationsreportcard/pubs/writing/2015119.aspx) | 四年級平均 12 wpm、八年級 30 wpm |
| 小學鍵盤標準 | Wisconsin DPI | [連結](https://dpi.wi.gov/bit/standards/elementary-keyboarding) | 5 wpm×年級的建議，無研究依據 |
| 鍵盤速度研究回顧 | 2018 論文 | [連結](https://informahealthcare.com/doi/full/10.1080/19411243.2018.1512067) | 五年級 4.7～70 wpm，變異極大 |
| AJOT 2020 摘要 | AOTA | [連結](https://sage.cnpereading.com/doi/10.5014/ajot.2020.74S1-PO8114) | 五、六年級速度有年級差異 |
| 台灣二年級注音打字 | ICCE | [連結](https://library.apsce.net/index.php/ICCE/article/download/1039/970) | 204 人平均 12.48 字/分 |
| 兒童中文打字技能 | NCU | [連結](https://scholars.ncu.edu.tw/en/publications/investigating-the-factors-of-practice-time-and-literacy-on-childr/) | 練習時間與識字對打字的影響 |
| Observations on Typing from 136 Million Keystrokes | Dhakal 等 | [連結](https://userinterfaces.aalto.fi/136Mkeystrokes/) | 成人平均 52 wpm；快打者錯得少 |
| Different (key)strokes | Ulrich, Lindsey & Logan | [連結](https://cognitiveresearchjournal.springeropen.com/articles/10.1186/s41235-016-0007-6) | 打字是 Fitts 與 Hick 的平衡 |
| Fitts 速度－準確取捨 | MacKenzie & Isokoski | [連結](https://www.yorku.ca/mack/chi2008.html) | 指向任務的速度準確取捨 |
| Finding gameplay depth in typing games | Game Developer | [連結](https://www.gamedeveloper.com/game-platforms/finding-gameplay-depth-in-typing-games) | 20 與 110 wpm 玩家差距帶來的設計難題 |
| Star rating | osu! wiki | [連結](https://osu.ppy.sh/wiki/Beatmap/Star_rating) | 以 strain 衡量持續難度 |
| 2021 SR 更新 | osu! | [連結](https://osu.ppy.sh/home/news/2021-11-09-performance-points-star-rating-updates) | 說明 strain 與技能組成 |
