# 打字勇者：遊戲設計參考資料

> 建立：2026-11-17　用途：之後設計新功能、改規格時直接查。這份是**遊戲設計**本身（動機、循環、難度、大廳、活動、排行、UI、新手引導、無障礙），不是營運後台。
> 對象：國小四～六年級（10～12 歲）、一週一節電腦課、一節課中位數打 2 場。

## 先講清楚：這份資料的查證程度

- 這次的雲端環境只能用 WebSearch，**WebFetch 被擋**（`getaddrinfo ENOTFOUND`，gameaccessibilityguidelines.com、lostgarden.com、lennysnewsletter.com、selfdeterminationtheory.org 等都連不上）。所以下面每條重點是根據**搜尋結果摘要＋我對這些著作的既有了解**寫的，**沒有逐篇讀全文**。
- 標記：**（摘要）**＝搜尋結果摘要有直接寫到；**（推論）**＝沒有來源直接支持，是我套到打字勇者上的判斷；**（待核）**＝來源品質不夠或細節沒驗證，引用前要點進去確認。

## 目錄

1. [遊戲設計](#1-遊戲設計game-design)
2. [網路遊戲設計](#2-網路遊戲設計online--mmo--多人)
3. [遊戲 UI 設計](#3-遊戲-ui-設計)
4. [遊戲體驗設計（UX）](#4-遊戲體驗設計ux--player-experience)
5. [對現有規格的檢查清單](#5-對現有規格的檢查清單只列不改)
6. [參考資料總表](#6-參考資料總表)

---

## 1. 遊戲設計（Game Design）

### 1.1 重點原則

**動機與心理需求**

- **自我決定論（SDT）三需求：自主、勝任、連結。** Ryan、Rigby、Przybylski 的研究發現這三項需求獨立預測玩家的享受與「還想再玩」；遊戲吸引人的程度，主要看這三項在玩的當下有沒有被滿足。（摘要）[Przybylski, Ryan & Rigby 2009（PSPB）](https://selfdeterminationtheory.org/wp-content/uploads/2014/04/2009_PrzbylskiRyanRigby_PSPB-1.pdf)、[Przybylski 等 2014（JPSP）](https://selfdeterminationtheory.org/wp-content/uploads/2014/07/2014_PrzyDeciRigbyRyan_JPSP1.pdf)、[Game Developer：Why do we really play?](https://gamedeveloper.com/design/why-do-we-really-play-)
- **「暴力內容」對享受的貢獻不大，勝任感與自主感才是。** 同一組作者認為在控制自主與勝任之後，暴力內容對一般玩家的樂趣幾乎沒有加分。（摘要）[Przybylski 等 2009](https://selfdeterminationtheory.org/wp-content/uploads/2014/04/2009_PrzbylskiRyanRigby_PSPB-1.pdf)。對我們的意思：魔物戰鬥的樂趣不用靠「打得痛」，靠「我打得更好了」。（推論）
- **Quantic Foundry 的 12 種動機**：破壞、刺激、競爭、社群、挑戰、策略、完成、力量、幻想、故事、設計、探索，兩兩成對、分成三大群；來自大規模玩家問卷的因素分析。（摘要）[Gamer Motivation Model Reference](https://quanticfoundry.com/wp-content/uploads/2019/04/Gamer-Motivation-Model-Reference.pdf)、[GDC 2019：12 Motivations 深入分析](https://gdcvault.com/play/1025742/contactUs)。但樣本是成人玩家，不能直接當 10～12 歲的數據（待核）。。

- **Bartle 四型（成就者、探索者、社交者、殺手）**原為 1996 年 MUD 玩家分類，玩家會隨心情換類型；用來提醒別只照顧一種人，不用來貼標籤。（摘要，推論）[Wikipedia](https://en.wikipedia.org/wiki/Bartle_taxonomy_of_player_types)

**核心循環與進度**

- **Daniel Cook 的「技能原子」與「互動迴圈」**：玩家行動、得到回應、再根據回應行動，這個小迴圈就是在練一個技能；學會的技能可以像積木一樣組成更大的技能。（摘要）[Game Developer：The Chemistry of Game Design](https://www.gamedeveloper.com/pc/feature-the-chemistry-of-game-design-)；迴圈（練熟）與弧線（劇情、情緒、內容）要交替的「loop-arc sandwich」說法見 [Sketchnote: Loops & Arcs](https://mechanicsofmagic.com/2026/05/13/sketchnote-loops-arcs-51/)（二手整理，待核）。
- **Koster：樂趣是大腦吸收規律時給的回饋；規律學完就膩。** 遊戲失去吸引力有三種：看不出規律（太亂）、規律太簡單、全部學完。（摘要）[A Theory of Fun（O'Reilly）](https://oreilly.com/library/view/theory-of-fun/9781449363208)、[書摘](https://gamedev.net/blogs/entry/437313-a-theory-of-fun-by-raph-koster)。對打字遊戲：樂趣是「我的手變準了、變快了」這種**看得到的學習**，不是單純計分。（推論）
- **Gee 的 16 條學習原則**：好遊戲把問題排成由易到難、讓玩家待在「令人愉快的挫折」區（有挑戰但做得到）、降低失敗代價（從存檔點重來）所以敢冒險。（摘要）[Gee 2005, Good Video Games and Good Learning](https://ocw.metu.edu.tr/file.php/85/ceit706/week7/PaulGee.pdf)
- **MDA 框架（機制、動態、美學）**：設計者從機制出發，玩家卻是先感受到美學（感官、幻想、敘事、挑戰、情誼、探索、表現、消遣）；所以要**倒著想**：先決定想讓學生感受到什麼，再回推機制。（摘要）[Hunicke, LeBlanc, Zubek 2004](https://users.cs.northwestern.edu/%7Ehunicke/MDA.pdf)、[AAAI 頁面](https://aaai.org/papers/ws04-04-001-mda-a-formal-approach-to-game-design-and-game-research/)

**難度與心流**

- **GameFlow（Sweetser & Wyeth 2005）**把心流拆成 8 項：專注、挑戰、技能、控制、明確目標、回饋、沉浸、社交；並指出社交有時反而打斷心流。（摘要）[GameFlow 論文](https://ntnu.no/wiki/download/attachments/112986425/GameFlow.pdf?api=v2)。Jenova Chen 的〈Flow in Games〉主張讓玩家自己調整難度而不是強迫選等級（我對該文的既有了解，連結 [CACM 2007](https://cacmb4.acm.org/magazines/2007/4/5692-flow-in-games-and-everything-else/fulltext)，待核）。
- **動態難度（DDA）**：用玩家表現估計障礙難度並即時調整。（摘要）[Hunicke & Chapman, Hamlet](https://users.cs.northwestern.edu/~hunicke/pubs/Hamlet.pdf)。Left 4 Dead 的 AI Director 則是「高峰與喘息」節奏，它改的是遭遇與道具的安排，不是單純調數字。（摘要）[Game Developer：The Discomfort Zone](https://www.gamedeveloper.com/design/the-discomfort-zone-the-hidden-potential-of-valve-s-ai-director)（有人主張它不算 DDA，分類有爭議）。

**教育遊戲／兒童**

- **內在整合（intrinsic integration）**：把學習內容做成遊戲「核心機制」本身，而不是答對才給獎勵的外掛。Habgood & Ainsworth 給 7～11 歲孩子玩數學遊戲 Zombie Division：內在整合版在固定時間內學得更多，自由選擇時玩的時間長 7 倍。（摘要）[Habgood & Ainsworth 2011](https://shura.shu.ac.uk/3556)。**打字勇者天生就是內在整合**（打字＝攻擊），這是最大的設計優勢，不要破壞它。（推論）
- **遊戲化的整體證據是「看情境」**：24 篇實證研究的回顧結論是多數有正面效果，但效果高度依賴情境與使用者。（摘要）[Hamari, Koivisto & Sarsa 2014](https://www.lescahiersdelinnovation.com/wp-content/uploads/2019/06/2014-hamari_et_al-does_gamification_work.pdf)。所以「別人家有排行榜」不是我們也要有的理由。
- **打字教學本身的證據**：一份準實驗研究發現，有結構的鍵盤課程比免費打字遊戲更能穩定提升準確率；遊戲適合當**補充**。（摘要，作者之一與該課程有關聯，且為單一學校）[Donica 等研究摘要](https://core.ac.uk/download/232209254.pdf)、[相關 WFOT 摘要](https://archive.wfot.org/wfot2018/downloads/abstracts/GP102/Efficacy%20of%20using%20a%20Game-Based%20Keyboarding%20Tool%20.pdf)。對我們：電腦課的打字遊戲要和課程的指法目標對齊，而不是只追求好玩。（推論）

### 1.2 對打字勇者的啟示

| 系統 | 目前做法 | 判斷 | 建議 |
|---|---|---|---|
| 核心循環 | 委託板接單 → 三線戰鬥（打字＋換線＋舉盾）→ 獎勵（武器、稱號、字元） | **符合**：內在整合；一場約幾分鐘，適合一節只打 2 場 | 保持「一場內完成一個完整小循環」。獎勵要在**結算畫面當場看到**，不要要求課後再回來領（推論） |
| 動機覆蓋 | 委託＝成就者；稱號詞條、造型＝設計／表現；班級挑戰＝社群；抓蟲榜＝探索者（找 bug）；排行＝競爭 | **符合但偏成就／競爭** | 檢查每個新功能：自主（有選擇嗎）、勝任（看得到進步嗎）、連結（和同學有互動嗎）至少一項明確。目前連結偏弱（班級挑戰是間接的，見 §2） |
| 難度 | ★1～★3 魔物、三線戰鬥、題目字數上限；學生回饋「閃避太難」已改三線 | **要小心**：HANDOFF 寫「還沒重跑 `tools/nw-sim/`」 | 難度要用模擬器與真實戰績驗證，並看「失敗率」分佈（推論）。Gee：失敗代價要低——倒下後馬上可以再打 |

---

## 2. 網路遊戲設計（Online / MMO / 多人）

### 2.1 重點原則

**大廳與城鎮（hub）**

- **Hub 的作用是「進入一局之前的社交與準備空間」，且空間本身可以顯示進度。** 例：同一個酒館隨戰役推進外觀改變。（摘要）[Amplitude 論壇：hub 的概念、可見進度與舒適感](https://community.amplitude-studios.com/amplitude-studios/endless-dungeon/forums/204-game-design/threads/48251-the-saloon-hub-concepts-visible-progression-and-comfort?page=1)（論壇討論，非權威）
- **如果城鎮裡沒有非戰鬥的活動，它其實可以只是選單。** 很多 MMO 的城鎮本質上只是任務中心。（摘要）[MassivelyOP：MMO social hubs overrated?](https://massivelyop.com/2021/03/18/massively-overthinking-are-mmo-social-hubs-overrated/)
- **大廳的社交功能不能讓「開始一場」變難。** Guilty Gear Strive 的大廳被批評社交功能太搶戲、使配對更難；《快打旋風 6》的 Battle Hub 則是把大廳做成社交區。（摘要）[The Gamer：SF6 Battle Hub](https://www.thegamer.com/street-fighter-6-battle-hub-playstation-home-closed-beta/)（遊戲媒體報導）

**共同目標與活動**

- **全員共同目標**（Pokémon GO 的「Global Challenge」）：玩家能看到整體進度、剩餘時間、自己貢獻了多少；貢獻來自「正常玩」而不需要另外催促。（摘要）[Substack 分析：Pokémon GO 的設計](https://jamielangskov.substack.com/p/incentives-augmented-reality-and)（次級分析）、[Niantic：Strength in Numbers 2025](https://pokemongo.com/news/strength-in-numbers-global-challenge-2025)、[iMore：GO Fest 2020 Global Challenges](https://imore.com/pokemon-go-fest-2020-virtual-event-actually-worked)。Niantic 自己說 Global Challenge 是 2020 活動裡最成功的部分，目標壞掉時也趕在期限前修好讓玩家達標。（摘要）

**排行榜**

- **低名次的玩家常被打擊；結論不一致但方向一致。** 回顧：高名次提升動機，低名次有害；也有研究發現外向、隨和的人幾乎不受影響，另有教育遊戲研究發現低名次學習者反而更努力。（摘要）[arXiv 2305.08346：教育軟體遊戲化負面效果的系統性地圖](https://arxiv.org/pdf/2305.08346)、[Emerald/Internet Research](https://www.emerald.com/insight/content/doi/10.1108/intr-12-2021-0897/full/html)（待核：哪篇對應哪個結論，我沒逐篇對上）
- **「相對排行榜」（只顯示你前後幾名／同程度的人）比「絕對排行榜」不傷人。** 一項課堂研究中，相對榜各程度學生都維持滿意；絕對榜的中後段學生感到同儕壓力增加；作者建議限制公開顯示後段學生名次。（摘要，相對榜研究仍少）[par.nsf.gov 論文](https://par.nsf.gov/servlets/purl/10510520)、[2024 眾包研究](https://www.universityxp.com/research/2024/9/16/how-leaderboard-positions-shape-our-motivation-the-impact-of-competence-satisfaction-and-competence-frustration-on-motivation-in-a-gamified-crowdsourcing-task)（待核：兩個連結對應哪個結論）
- **Duolingo 的排行榜與連續天數是經大量 A/B 測試後留下的。** 前 CPO Mazal 寫到：移植自其他遊戲的「步數計」造成團隊立刻放棄、被否決；連續天數越長，越有動力維持。（摘要）[Lenny's Newsletter：How Duolingo reignited user growth](https://lennysnewsletter.com/p/how-duolingo-reignited-user-growth)。注意：那是**成人為主、自願的商業 App**，且有大量測試；我們不能照搬。

**經濟（貨幣）**

- **水龍頭與排水口（faucet／sink）**：貨幣來源（掉落、任務）幾乎無上限，要有排水口（消耗）才不會通膨；「玩家之間轉移」是軟排水口，不會真的減少貨幣，「系統收走」才是硬排水口。（摘要）[Ten Ton Hammer：How virtual economies handle inflation](https://www.tentonhammer.com/articles/how-virtual-economies-handle-inflation-in-modern-sandbox-mmos)、[GameBanshee：Faucets](https://www.gamebanshee.com/9x94)（皆為媒體／社群文章，非權威數據）

**對兒童的保護與公平**

- **限時活動與「怕錯過」（FOMO）對兒童有特別風險。** 荷蘭消費者管理局因為 Fortnite 道具商店用 24 小時倒數，暗示限量、其實過期後還買得到，對 Epic 罰款約 100 萬歐元，理由是利用兒童的怕錯過心理。（摘要）[Stibbe 事務所：ACM 罰 Epic](https://stibbe.com/publications-and-insights/game-over-for-dark-patterns-acm-fines-epic-for-unfairly-targeting)。德國消費者聯盟 2025 的實地調查列出「時間模式壓力，包括催促每天都要玩」，並警告兒童特別容易養成不好的習慣。（摘要）[vzbv 2025](https://www.vzbv.de/sites/default/files/2025-04/25-03-11_Additional_information_vzbv_manipulative_design_online-games.pdf)。英國 ICO 也出了保護兒童的遊戲開發者指引（連結取自現有規格 §12，未重新核對）[ICO 2023](https://ico.org.uk/about-the-ico/media-centre/news-and-blogs/2023/02/new-guidance-to-industry-issued-for-game-developers-on-protecting-children)。
- **聊天：Roblox 的做法是文字過濾（髒話、個資、霸凌詞、不認識的文字一律擋成「####」並警告），之後再加 AI 改寫。** 但外部稽核（轉述）發現過濾仍會漏掉不當接觸；語音聊天不在過濾範圍。（摘要，稽核為二手轉述，待核）[Roblox Help：文字過濾](https://en.help.roblox.com/hc/cs/articles/4406238486676-Roblox-User-Data-FAQ)、[Roblox：兒童安全](https://about.roblox.com/resource/child-safety)、[TechCrunch 2026](https://techcrunch.com/2026/03/05/roblox-launches-real-time-ai-chat-rephrasing-to-filter-out-banned-language)。**最保險的是我們現在的做法：不開放聊天、暱稱用詞庫組合。**（推論）
- **防作弊：客戶端分數不可信。** 伺服器端只是「收下」客戶端送來的數字仍然是客戶端說了算；基本是範圍與合理性檢查、用行動紀錄重算、重要名次交給人審；目標是提高作弊成本而不是做到不可能。（摘要，皆為開發者部落格／廠商文，品質中等，待核）[Supercraft：Validate scores server-side](https://crux.supercraft.host/blog/leaderboard-cheating-public-leaderboard-server-validation-2026/)、[Bugnet：fix leaderboard cheating](https://bugnet.io/blog/how-to-fix-leaderboard-cheating-and-fake-scores)

### 2.2 對打字勇者的啟示

| 系統 | 目前做法 | 判斷 | 建議 |
|---|---|---|---|
| 村莊（hub） | 32×22 格、分區、廣場 3 步內到委託板與佈告欄、小地圖點建築傳送 | **符合**「hub 不能擋住開局」與「一節只打 2 場」 | 保持「出生點 3 步到委託板」。村莊要有**不打怪也想逛**的東西，否則 MassivelyOP 的批評會成立：加進度可見的變化（例如村莊隨全校總討伐數長出新東西）（推論） |
| 班級挑戰 | 全班目標為主、同年級只列前 3、榜外不顯示名次 | **符合**共同目標原則（Pokémon GO）與相對排行建議 | 進度條要同時顯示「全班進度、剩餘天數、我貢獻幾隻」三件事，Pokémon GO 的做法；現規格有進度條與「還有 N 天」，但沒明寫「我貢獻幾隻」（推論，可加） |
| 活動排行榜 | 前 10 ＋自己；自己不在前 10 只寫「再快 N 秒就上榜」 | **大致符合**；比一般榜好 | 研究顯示相對榜更不傷人：**可以改成預設只顯示「自己前後各 2 名」＋前 3**，不做全班前 10 公開；或讓學生自己選「看全部／只看自己附近」（推論，需老師決定）。「進步獎」以自己為基準是最好的設計 |
| 抓蟲榜 | 前 10 ＋自己、徽章 1/3/5/10 分 | **符合**：里程碑讓沒上榜的人也有目標 | 保持。榜外只寫「再拿 N 分」是對的 |
| 限時活動 | 不倒數秒、不閃紅、不做週末加倍、可「再開一次」 | **符合** ICO／ACM／vzbv 的兒童保護方向 | 維持；新增活動類型時都過一遍「這會不會讓孩子怕錯過」。**不要做連續天數**（對一週一節的學生只會是懲罰）（推論） |
| 防作弊 | 學生端算分、`mg_nw_runs`、⚠ 標記、老師審核、人工發獎 | **符合**「重要名次交給人審」 | 注意：目前分數是客戶端算的，只能提高成本（規格 §4.2b 已自覺）。獎勵越大，越需要人工抽查 |

---

## 3. 遊戲 UI 設計

### 3.1 重點原則

- **HUD 的問題是「要放很多資訊，同時又要留空間看遊戲場景」。** 設計者要先想玩家此刻找什麼資訊、哪些資訊跟這個任務有關。（摘要）[Bycer：Understanding Focal Points in UI Design](https://gamedeveloper.com/design/understanding-focal-points-in-ui-design)、[Bycer：Understanding Smart UI Design](https://gamedeveloper.com/design/understanding-smart-ui-design)。層級靠大小、位置、對比、顯眼度建立（摘要，部落格，低權威）[Bugnet：readable HUD](https://bugnet.io/blog/how-to-design-a-readable-hud)。
- **UI 的四類：diegetic（在世界裡）、non-diegetic（疊在畫面上）、spatial（在空間裡但世界裡沒有）、meta（在故事裡但沒有空間位置）。** 該論文發現「遊戲整體的一致性（HUD 風格跟遊戲主題一致）比顯示方式更能決定沉浸感」，不是 HUD 元素越少越好。（摘要）[Fagerholt & Lorentzon 2009（Chalmers）](https://publications.lib.chalmers.se/records/fulltext/111921.pdf)。這正是 UI-ART-SPEC §0「像素場景＋網頁卡片風格打架」的學術版。
- **紅點與徽章：只標真的需要處理的東西，不然會「紅點盲」。** 業界建議：數字徽章與圓點不要混用；數字要和目標畫面用同一個資料來源算（不然紅點和內容對不上）；較不重要的提醒用較淡的樣式；徽章不能是唯一的重要資訊管道；圓點要有螢幕閱讀器文字。（摘要，皆為廠商部落格／設計系統文件，是業界慣例而非實驗）[Braze：Beware Red Dot Blindness](https://www.braze.com/resources/articles/beware-red-dot-badging)、[PatternFly 通知徽章](https://www.patternfly.org/components/notification-badge/design-guidelines)、[Proximus 通知圓點](https://designsystem.proximus.com/pagesDS/15__Basic_Elements/Notification_dot/)、[Apple HIG：通知](https://developer.apple.com/design/human-interface-guidelines/notifications.md)
- **文字可讀性：文字大小與顏色是一整條無障礙準則。** Xbox 無障礙準則 XAG 101 規定遊戲中所有文字（HUD、任務、NPC 對話、圖示內文字）都要符合最小大小、玩家可調整，平台放大鏡不算數；XAG 102 規定對比（一般文字 4.5:1、大字 3:1），並建議用實色底、描邊、高對比模式。（摘要，**具體像素值沒能驗證**）[XAG 101](https://devdocs.xbox.com/gaming/accessibility/xbox-accessibility-guidelines/101)、[XAG 102](https://devdocs.xbox.com/build/game-principles/accessibility/xag-deep-dives/xag-102-contrast.md)
- **兒童介面：用詞要貼近他們的程度。** NN/g 的兒童研究（6～8 歲）發現「sign-in／sign-up」看得懂、「submit／username」會迷惑，建議用「start／go／nickname」；9～12 歲分辨廣告與內容比成人差；兒童遇到的可用性問題不比成人少。（摘要，完整報告要付費）[NN/g：Designing for Children](https://www.nngroup.com/videos/designing-children/)、[Experientia 整理](https://blog.experientia.com/?p=947)、[UXmatters：兒童 UX](https://uxmatters.com/mt/archives/2020/01/ux-design-for-kids-key-design-considerations.php)

### 3.2 對打字勇者的啟示

| 項目 | 目前做法 | 判斷 | 建議 |
|---|---|---|---|
| 戰鬥畫面資訊層級 | 魔物血量／倒數→場景→題目；次要資訊縮小 | **符合** | 打字是主要動作，**題目文字應是畫面上最大、對比最高的字**；檢查題目字在手機與投影機（教室）下的大小（推論） |
| 紅點 | 佈告欄「！」、上方按鈕小紅點、郵筒 ✉ 數字、背包紅點 | **要小心**：現在至少 4 處會同時亮（佈告欄、郵筒、背包、公告） | 分級：**需要動作（有獎品可領）＝紅數字**；**資訊（新公告、活動）＝淡色小點**；點開一次就清掉；紅點與數字用同一份資料算。規格 §9.1 寫「上方按鈕也加小紅點」，建議明定「進村一次最多出現兩種提示」（推論） |
| 文字大小 | UI-ART-SPEC 沒規定最小字級 | **可以改進** | 補一條：戰鬥題目、按鈕、公告內文的最小字級（XAG 101 概念），在教室投影機與手機各檢查一次。具體數值要先查 XAG 101 原文（待核） |
| 紅／藍區 | 紅＝閃避、藍＝防禦 | **可以改進** | 不能只靠顏色：已有文字提示（姿態條），建議再加形狀（紅區斜線、藍區波紋）給色盲學生（依 Game Accessibility Guidelines「不只靠顏色傳達資訊」，見 §4） |

---

## 4. 遊戲體驗設計（UX / Player Experience）

### 4.1 重點原則

**新手引導（onboarding）**

- **Hodent（Epic，《The Gamer's Brain》作者）談新手引導：** 常見錯誤、UX 準則、大腦如何學習；核心是**認知負荷**——加越多功能與複雜度，注意力與記憶負擔越高，越容易挫折；建議隨玩家熟悉再逐步增加。（摘要，沒有拿到投影片）[GDC 2016：The Gamer's Brain Part 2](https://gdcvault.com/play/1022951/contactUs)、[IxDF：為工作記憶設計](https://ixdf.org/literature/article/design-for-working-memory-players-will-remember-what-matters)
- **用關卡本身教，不用文字。** 超級瑪利歐 1-1：第一個畫面左邊走不了、右邊有空間、一隻栗寶寶走過來；水管越來越高，不說話就教會「按久一點跳更高」；每個新元素都在玩家準備好時才出現、馬上在更高風險下再用一次。（摘要，Medium／評論品質，是被廣泛引用的分析）[Medium：Analyzing Super Mario's level and tutorial design](https://medium.com/swlh/the-perfect-game-tutorial-analyzing-super-marios-level-design-92f08c28bdf7)
- **Gee：資訊要「剛好在需要時」給，問題由易到難，失敗代價低。**（摘要）[Gee 2005](https://ocw.metu.edu.tr/file.php/85/ceit706/week7/PaulGee.pdf)

**回饋與 juice**

- **「Juice it or lose it」（Jonasson & Purho）**：只加回饋效果（動畫、粒子、音效、震動），一個普通的打磚塊就變得很好玩。（摘要）[GDC Vault：Juice It or Lose It](https://gdcvault.com/play/1016487/Juice-It-or-Lose)。也有反方：後來的演講「Don't Juice It or Lose It」主張過度加工會損失一部分沉浸。（摘要）
- **Swink 的 game feel 定義**：「對模擬空間中虛擬物件的即時控制，再用打磨強調互動」；操作要低延遲、高敏感。（摘要）[Wikipedia：Game feel](https://Www.wikipedia.org/wiki/Game_feel)（次級來源）。Vlambeer 的〈The Art of Screenshake〉我沒找到可驗證的摘要，不引用細節。

**難度、心流與挫折**

- 見 §1：Gee 的「令人愉快的挫折」、GameFlow 的挑戰／技能平衡、DDA。**打字遊戲的特殊處：失敗的原因必須讓學生看得懂**（是我太慢？打錯字？沒換線？），否則挫折不會變成學習。（推論）

**無障礙**

- **Game Accessibility Guidelines**（基本、中級、進階三層）：基本層是「容易做、影響廣、適用幾乎所有遊戲機制」的項目，我查到的內容包含預設可讀的字級、簡單的文字排版、可重新對應按鍵、對重要語音加字幕、文字高對比。（摘要，各項屬於哪一層，不同來源說法不一，**待上官網核對**）[Game Accessibility Guidelines：Basic](https://gameaccessibilityguidelines.com/basic/)、[IGDA GA SIG Top Ten](https://igda-gasig.org/how/game-accessibility-top-ten-se/)
- **Xbox XAG** 是另一套可操作的清單，字級與對比各有一條深入指引。（摘要）見 §3 連結。

**兒童的可用性測試**

- **兒童玩家的測試方法要調整。** 小孩越小越難「邊玩邊說」；可以用回想式訪談、圖卡放進盒子表達「不好用／不好玩」、讓兩個同學一起玩互相講話（建設性互動）、或把任務包成遊戲情境。（摘要）[UCLan：兒童可用性測試的實務與倫理](https://clok.uclan.ac.uk/14915)、[Playtesting with Kids（廠商，需謹慎）](https://www.playtestcloud.com/playtest-with-kids)。Skylanders 的 GDC 演講也指出兒童是核心受眾時不能只靠傳統技術。（摘要）[GDC：Child's Play](https://gdcvault.com/play/1020991/Child-s-Play-Playtesting-with)
- **啟發式評估（HEP）**：從文獻整理出遊戲可玩性啟發式，最適合在**早期原型**抓一般性問題。（摘要）[Desurvire, Caplan & Toth 2004](https://hci.rwth-aachen.de/materials/conferences/CHI2004/2p1509.pdf)
- 注意：做兒童測試要有家長／學校同意（NN/g 相關整理有提醒）。（摘要）

### 4.2 對打字勇者的啟示

| 項目 | 目前做法 | 判斷 | 建議 |
|---|---|---|---|
| 新手導覽 | `tour(steps)`、`INTROS`（看過就不再跳）、第一個任務 `1-0a`、地板箭頭、標點挑戰、教學大樓 | **符合**多數原則；導覽可退回、學生太快也不壞 | 對照 Hodent：**第一次進村一次只教一件事**（走到委託板接第一單），其他建築第一次靠近才介紹（現在 `INTROS` 已是這樣）。用瑪利歐式「先安全練、再加風險」安排：第一場戰鬥魔物不攻擊（已有 `ATTACKS_OPEN` 逐隻開） |
| 戰鬥回饋 | 閃白、震動、連弩逐支、大字標語 | **符合** juice 與 Swink | 檢查**打對一個字**的即時回饋是否夠「爽」：打字是每秒多次的動作，單字級回饋（微小火花、音效或震動）比結算大特效更重要（推論）。「戰鬥回饋不關」要重新想（見 §5 無障礙） |
| 挫折管理 | 倒下、題目字數上限 | **可以改進** | 結算畫面解釋「為什麼倒下」（被哪個招式、哪一線），並給一句下一場的小建議；對連續倒下 2 次的學生自動提示「要不要換個武器／先練習？」，但不降難度（推論，由老師決定） |
| 可用性測試 | `tools/browser-test/` 是自動化，學生回饋靠 `askFeedback()`、回報問題 | **可以改進** | 自動測試只驗證「不壞」，不驗證「看得懂」。每個大改版前，找 2～3 位學生**兩人一組**玩 10 分鐘、不插話，只記他們卡在哪（建設性互動法）。HEP 清單可給老師／工程師自己做早期檢查 |
| 無障礙 | 不用方向鍵（注音會吃）；題目一律國字判定；有「減少動態效果」 | **符合一部分** | 缺：按鍵重新對應（Ctrl／Alt 是固定的）、不只靠顏色、閃爍上限、字級調整。見 §5 |

---

## 5. 對現有規格的檢查清單（只列，不改）

對照 `docs/SPEC-TEACHER-ADMIN.md` 與 `docs/UI-ART-SPEC.md`。**優先序以我認為的重要性排**，最後都需要老師或工程師決定。

### 5.1 `SPEC-TEACHER-ADMIN.md`

| # | 位置 | 現況 | 依研究的建議 | 依據 |
|---|---|---|---|---|
| 1 | §4.2b 活動排行榜（前 10 ＋自己） | 公開前 10 名 | 新增「相對榜」選項：預設只顯示「前 3 ＋我前後各 2 名」，教師頁可切換成前 10。「進步獎」維持（以自己為基準最安全） | §2 排行榜研究；中後段學生壓力 |
| 2 | §9.1 紅點與「！」 | 佈告欄「！」、上方按鈕紅點、郵筒 ✉ | 區分「要動作（可領獎）＝紅」與「資訊＝淡色」；紅點與內容同一資料來源；進村提示最多兩種 | §3 紅點盲 |
| 3 | §4.2 班級挑戰進度條 | 顯示全班進度條與「還有 N 天」 | 加「我貢獻 N 隻」，讓個人看得到自己的份 | Pokémon GO 共同目標 |
| 4 | §4.5 兒童時間壓力 | 不倒數秒、不閃紅 | 加明確條文：**不做連續天數／每日登入獎勵**；任何新活動都要回答「錯過會失去什麼？」，答案必須是「不會」或「老師會補發」 | ACM／vzbv／ICO |
| 5 | §3 信箱與經濟 | 字元「暫時用不到」，商店未開 | 開商店之前先寫**字元的排水口**（改名卡、鐵匠鋪強化、造型），並設每場獲得量上限，避免只進不出 | faucet／sink |
| 6 | §4.2b 防作弊 | 學生端算分、⚠ 標記、人工發獎 | 條文裡加：「獎品大的活動，發獎前一律抽查 `mg_nw_runs`」；分數用「行動紀錄可重算」的設計優先（例如存場次數與每場秒數，而不只存最後分數） | §2 防作弊 |

### 5.2 `UI-ART-SPEC.md`

| # | 位置 | 現況 | 依研究的建議 | 依據 |
|---|---|---|---|---|
| 1 | §3 元件規則 | 未規定最小字級 | 補「最小字級」與「對比 ≥ 4.5:1」，戰鬥題目字優先；測投影機與手機。具體數字先查 XAG 101（待核） | XAG 101／102 |
| 2 | §5 戰鬥：紅區／藍區 | 紅＝閃避、藍＝防禦，靠顏色＋姿態條文字 | 加形狀（紅斜線、藍波紋）作為第二訊號 | GAG：不只靠顏色 |
| 3 | §6 動畫規則「戰鬥回饋不關」 | 減少動態效果時戰鬥仍閃白、震動 | 改成：閃白與震動有**強度與頻率上限**，並提供「柔和回饋」開關（保留聲光以外的回饋，例如數字與邊框） | GAG；光敏性（推論） |
| 4 | §5 三線戰鬥操作 | Ctrl／Alt 固定 | 評估「可重新對應」（至少提供另一組備用鍵）。注意：現在不用方向鍵是因為注音輸入法，要驗證備用鍵不會被輸入法吃掉 | GAG：可重新對應按鍵 |
| 5 | §4 村莊／§3 `px-chip`、紅點 | 沒有紅點元件規範 | 新增「提示點」元件：紅數字（要動作）、淡點（資訊），並規定點開即清 | §3 紅點 |
| 6 | §5 戰鬥結算 | 未規定 | 加「倒下原因＋一句建議」與「比上次快／準 N」常駐顯示 | Koster、SDT 勝任感 |

---

## 6. 參考資料總表

> 欄位：標題／作者／連結／一句話摘要。**品質**：A＝原始論文或官方文件；B＝業界權威（GDC、Game Developer）；C＝媒體、部落格、廠商、社群，只能佐證。

### 1 遊戲設計
| 標題 | 作者／來源 | 連結 | 一句話摘要 | 品質 |
|---|---|---|---|---|
| The Motivational Pull of Video Games 系列（2009 PSPB、2014 JPSP） | Przybylski、Ryan、Rigby、Deci | [2009](https://selfdeterminationtheory.org/wp-content/uploads/2014/04/2009_PrzbylskiRyanRigby_PSPB-1.pdf)／[2014](https://selfdeterminationtheory.org/wp-content/uploads/2014/07/2014_PrzyDeciRigbyRyan_JPSP1.pdf) | 自主、勝任、連結預測遊戲享受與續玩 | A |
| Why do we really play? | Game Developer | [連結](https://gamedeveloper.com/design/why-do-we-really-play-) | SDT 給遊戲設計者的科普 | B |
| Gamer Motivation Model Reference／12 Motivations | Quantic Foundry（Nick Yee） | [PDF](https://quanticfoundry.com/wp-content/uploads/2019/04/Gamer-Motivation-Model-Reference.pdf)／[GDC](https://gdcvault.com/play/1025742/contactUs) | 12 種玩家動機，成人問卷 | A/B |
| Bartle taxonomy | Wikipedia（原文 Bartle 1996） | [連結](https://en.wikipedia.org/wiki/Bartle_taxonomy_of_player_types) | 成就、探索、社交、殺手四型 | C |
| MDA | Hunicke、LeBlanc、Zubek 2004 | [PDF](https://users.cs.northwestern.edu/%7Ehunicke/MDA.pdf) | 機制→動態→美學，玩家看到的方向相反 | A |
| The Chemistry of Game Design | Daniel Cook（Game Developer） | [連結](https://www.gamedeveloper.com/pc/feature-the-chemistry-of-game-design-) | 技能原子與技能鏈 | B |
| A Theory of Fun | Raph Koster | [O'Reilly](https://oreilly.com/library/view/theory-of-fun/9781449363208) | 樂趣＝吸收規律；學完就膩 | A（書） |
| GameFlow | Sweetser & Wyeth 2005 | [PDF](https://ntnu.no/wiki/download/attachments/112986425/GameFlow.pdf?api=v2) | 把心流拆成 8 項評估準則 | A |
| Good Video Games and Good Learning | James Paul Gee 2005 | [PDF](https://ocw.metu.edu.tr/file.php/85/ceit706/week7/PaulGee.pdf) | 16 條學習原則；愉快的挫折 | A |
| Hamlet／AI Director | Hunicke & Chapman；Game Developer | [Hamlet](https://users.cs.northwestern.edu/~hunicke/pubs/Hamlet.pdf)／[Director](https://www.gamedeveloper.com/design/the-discomfort-zone-the-hidden-potential-of-valve-s-ai-director) | 動態難度與節奏 | A/B |
| Motivating children to learn effectively | Habgood & Ainsworth 2011 | [連結](https://shura.shu.ac.uk/3556) | 7～11 歲，內在整合學更多、玩 7 倍久 | A |
| Does Gamification Work? | Hamari、Koivisto、Sarsa 2014 | [PDF](https://www.lescahiersdelinnovation.com/wp-content/uploads/2019/06/2014-hamari_et_al-does_gamification_work.pdf) | 24 篇實證，多半有效但看情境 | A |

### 2 網路遊戲設計
| 標題 | 作者／來源 | 連結 | 一句話摘要 | 品質 |
|---|---|---|---|---|
| How Duolingo reignited user growth | Jorge Mazal（Lenny's Newsletter） | [連結](https://lennysnewsletter.com/p/how-duolingo-reignited-user-growth) | 排行榜、連續天數、推播的測試經驗 | B |
| Strength in Numbers 2025／GO Fest 2020／Community Day 回顧 | Niantic、iMore | [Niantic](https://pokemongo.com/news/strength-in-numbers-global-challenge-2025)／[iMore](https://imore.com/pokemon-go-fest-2020-virtual-event-actually-worked)／[CD](https://nianticlabs.com/blog/cdrecap-2018) | 全員共同目標 | A/C |
| 教育軟體遊戲化負面效果 | arXiv 2305.08346 | [連結](https://arxiv.org/pdf/2305.08346) | 排行榜讓初學者失去動力是已知負面效果 | A |
| 排行榜相關研究 | Emerald、NSF PAR、UniversityXP | [Emerald](https://www.emerald.com/insight/content/doi/10.1108/intr-12-2021-0897/full/html)／[NSF](https://par.nsf.gov/servlets/purl/10510520)／[UXP](https://www.universityxp.com/research/2024/9/16/how-leaderboard-positions-shape-our-motivation-the-impact-of-competence-satisfaction-and-competence-frustration-on-motivation-in-a-gamified-crowdsourcing-task) | 相對榜較不傷人 | A（待核對應） |
| MMO social hubs overrated? | MassivelyOP | [連結](https://massivelyop.com/2021/03/18/massively-overthinking-are-mmo-social-hubs-overrated/) | 無事可做的城鎮不如選單 | C |
| 虛擬經濟通膨 | Ten Ton Hammer／GameBanshee | [TTH](https://www.tentonhammer.com/articles/how-virtual-economies-handle-inflation-in-modern-sandbox-mmos)／[GB](https://www.gamebanshee.com/9x94) | 水龍頭與排水口 | C |
| ACM 罰 Epic | Stibbe | [連結](https://stibbe.com/publications-and-insights/game-over-for-dark-patterns-acm-fines-epic-for-unfairly-targeting) | 倒數計時利用兒童 FOMO | B |
| 遊戲操縱性設計調查 | vzbv 2025 | [PDF](https://www.vzbv.de/sites/default/files/2025-04/25-03-11_Additional_information_vzbv_manipulative_design_online-games.pdf) | 「天天登入」的時間壓力 | A |
| ICO 遊戲兒童指引 | ICO 2023 | [連結](https://ico.org.uk/about-the-ico/media-centre/news-and-blogs/2023/02/new-guidance-to-industry-issued-for-game-developers-on-protecting-children) | 保護兒童的遊戲設計指引 | A（引自現有規格，未重核） |
| Roblox 聊天安全 | Roblox、TechCrunch | [Help](https://en.help.roblox.com/hc/cs/articles/4406238486676-Roblox-User-Data-FAQ)／[Safety](https://about.roblox.com/resource/child-safety)／[TC](https://techcrunch.com/2026/03/05/roblox-launches-real-time-ai-chat-rephrasing-to-filter-out-banned-language) | 文字過濾、AI 改寫 | B |
| 排行榜防作弊 | Supercraft、Bugnet | [Supercraft](https://crux.supercraft.host/blog/leaderboard-cheating-public-leaderboard-server-validation-2026/)／[Bugnet](https://bugnet.io/blog/how-to-fix-leaderboard-cheating-and-fake-scores) | 客戶端分數不可信，重要名次人審 | C |

### 3 遊戲 UI
| 標題 | 作者／來源 | 連結 | 一句話摘要 | 品質 |
|---|---|---|---|---|
| Beyond the HUD | Fagerholt & Lorentzon 2009 | [PDF](https://publications.lib.chalmers.se/records/fulltext/111921.pdf) | 一致性比 HUD 形式更決定沉浸 | A |
| Understanding Focal Points／Smart UI | Josh Bycer（Game Developer） | [Focal](https://gamedeveloper.com/design/understanding-focal-points-in-ui-design)／[Smart](https://gamedeveloper.com/design/understanding-smart-ui-design) | 玩家此刻要找什麼資訊 | B |
| Beware Red Dot Blindness | Braze | [連結](https://www.braze.com/resources/articles/beware-red-dot-badging) | 紅點氾濫讓人視而不見 | C |
| 通知徽章指引 | PatternFly／Proximus／Apple HIG | [PF](https://www.patternfly.org/components/notification-badge/design-guidelines)／[Proximus](https://designsystem.proximus.com/pagesDS/15__Basic_Elements/Notification_dot/)／[Apple](https://developer.apple.com/design/human-interface-guidelines/notifications.md) | 數字與圓點不混用、同一資料來源 | A/B |
| Xbox Accessibility Guidelines 101／102 | Microsoft | [101](https://devdocs.xbox.com/gaming/accessibility/xbox-accessibility-guidelines/101)／[102](https://devdocs.xbox.com/build/game-principles/accessibility/xag-deep-dives/xag-102-contrast.md) | 文字大小、顏色、對比 | A |
| Designing for Children | Nielsen Norman Group | [連結](https://www.nngroup.com/videos/designing-children/) | 兒童研究：用詞、年齡分層 | A |

### 4 遊戲體驗
| 標題 | 作者／來源 | 連結 | 一句話摘要 | 品質 |
|---|---|---|---|---|
| The Gamer's Brain Part 2（GDC 2016） | Celia Hodent | [GDC Vault](https://gdcvault.com/play/1022951/contactUs) | 新手引導與認知心理 | B |
| 為工作記憶設計 | IxDF | [連結](https://ixdf.org/literature/article/design-for-working-memory-players-will-remember-what-matters) | 逐步增加認知負荷 | B |
| Super Mario 1-1 教學分析 | Medium 作者 | [連結](https://medium.com/swlh/the-perfect-game-tutorial-analyzing-super-marios-level-design-92f08c28bdf7) | 不用文字也教會 | C |
| Juice It or Lose It | Jonasson & Purho | [GDC Vault](https://gdcvault.com/play/1016487/Juice-It-or-Lose) | 只加回饋就改變手感 | B |
| Game Accessibility Guidelines | gameaccessibilityguidelines.com | [Basic](https://gameaccessibilityguidelines.com/basic/) | 三層準則；基本層最容易做 | A（待核） |
| Game Accessibility Top Ten | IGDA GA-SIG | [連結](https://igda-gasig.org/how/game-accessibility-top-ten-se/) | 最先要做的十件事 | B |
| 兒童可用性測試實務與倫理 | UCLan | [連結](https://clok.uclan.ac.uk/14915) | 測試兒童的方法與倫理 | A |
| Child's Play（Skylanders） | GDC | [連結](https://gdcvault.com/play/1020991/Child-s-Play-Playtesting-with) | 兒童受眾不能只靠傳統測試 | B |
| Heuristics for Playability（HEP） | Desurvire、Caplan、Toth 2004 | [PDF](https://hci.rwth-aachen.de/materials/conferences/CHI2004/2p1509.pdf) | 遊戲可玩性啟發式評估 | A |

---

### 附：這次沒能查證、之後值得補的

- Game Accessibility Guidelines 官網各項屬於哪一層（網站連不上）。
- XAG 101 的具體最小字級數字。
