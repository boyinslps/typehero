import { PX } from './pixel.js';
import { VILLAGE } from './nw-data.js';

const CATS = [
  { k: 'monster', icon: '👾', name: '魔物名字', ph: '例：火焰雞' },
  { k: 'region', icon: '🗺', name: '想去的地方', ph: '例：糖果王國' },
  { k: 'weapon', icon: '⚔', name: '想用的武器', ph: '例：回力鏢' },
  { k: 'other', icon: '💡', name: '其他想法', ph: '例：可以養寵物' }
];
const MAXLEN = 12;

const WEAPONS = [
  { k: 'staff', n: '法杖', first: 1, t: '打對 5 題就能「詠唱」，把很長的咒語全部打對，傷害變 3 倍！' },
  { k: 'bow', n: '長弓', first: 1, t: '打對會集滿力量，滿了就連打 3 題，傷害變 2 倍。' },
  { k: 'dagger', n: '雙刀', first: 1, t: '每 5 題砍一次「連環斬」，打得越快越痛。' },
  { k: 'crossbow', n: '連弩', first: 1, t: '打對一個字就裝一支箭，在輸入框空白時按 Enter，像機關槍一樣連發！' },
  { k: 'book', n: '元素書', t: '打字前先選火、水或木，換著用還會有特別的效果。' },
  { k: 'shield', n: '劍盾', t: '擋住攻擊就能反擊，趕快打完就是一記重擊。' },
  { k: 'fist', n: '拳套', t: '躲開攻擊就會「爆氣」，打對一個字就揮一拳。' },
  { k: 'great', n: '大劍', t: '力量條晃來晃去，在金色的地方按下去，傷害變 3 倍。' },
  { k: 'bell', n: '召喚鈴', t: '打「衝啊」叫寵物攻擊，打「守護」叫牠幫你擋。' }
];
const REGIONS = [
  { k: 'grass', n: '🌱 新芽草原', t: '最適合新手，沒有特別的麻煩。', open: 1 },
  { k: 'forest', n: '🌲 迷霧森林', t: '木的招式變強，大霧一直飄。打贏草原 ★5 才能去。', open: 1 },
  { k: 'coast', n: '🌊 珊瑚海岸', t: '水的招式變強，泡泡會飄上來。' },
  { k: 'volcano', n: '🌋 熔岩火山', t: '火的招式變強，岩漿會發光。' },
  { k: 'snow', n: '❄ 冰封雪原', t: '常常颳大風雪，題目會變模糊。' },
  { k: 'sky', n: '☁ 天空遺跡', t: '光的招式變強，島浮在天空中。' },
  { k: 'abyss', n: '🌑 深淵裂谷', t: '暗的招式變強，地上的裂縫透出紫光。' }
];
const MONSTERS = [
  { k: 'coo', n: '咕咕鳥', e: '🌿', t: '啄得很快，但每下都不太痛，最適合新手。', open: 1 },
  { k: 'frog', n: '泡泡蛙', e: '💧', t: '會吐泡泡，泡泡會擋住旁邊的注音小字。', open: 1 },
  { k: 'shroom', n: '跳跳菇', e: '🌿', t: '會灑孢子，題目的字會變得很小。', open: 1 },
  { k: 'wolf', n: '炎牙狼', e: '🔥', t: '生氣以後，攻擊會變兩倍快！', open: 1 },
  { k: 'lava', n: '熔岩龜', e: '🔥', t: '殼關起來的時候，要全部打對才打得進去。' },
  { k: 'ink', n: '墨鱗龍', e: '💧', t: '會噴墨水，墨水會蓋住一半的題目。' },
  { k: 'crab', n: '機械蟹', e: '🔥', t: '會長出盾牌，要連續答對 3 題才打得破。' },
  { k: 'octo', n: '海盜章魚', e: '💧', t: '八隻手一起來，一次出兩個短題目。' },
  { k: 'qilin', n: '石麒麟', e: '☀', t: '打錯字會被石頭定住 2 秒。' },
  { k: 'crane', n: '詩仙鶴', e: '☀', t: '10 秒還沒打完一題，牠就會偷偷回血。' },
  { k: 'cat', n: '夜影貓', e: '🌙', t: '題目只亮 3 秒就消失，要先記起來再打。' },
  { k: 'dragon', n: '混沌巨龍', e: '✨', t: '最後的大魔王！生氣就會換題目，共有 3 個階段。' }
];
const PLAY = [
  ['⏳ 倒數條', '魔物頭上有一條慢慢變滿的條，滿了牠就出招。', 1],
  ['🔥 怕什麼', '每隻魔物都有怕的東西，打中了傷害更大。小心被燒到、中毒或結冰。', 1],
  ['🏆 榮譽碑', '看誰的獵人等級最高、誰打得最快、誰打得最準。', 0],
  ['⚒ 打造', '打贏會掉材料，到鐵匠鋪做新武器、新裝備。', 0],
  ['👥 組隊', '自己開房間，最多 4 個人一起打大魔物。', 0],
  ['⭐ 星圖', '升級會拿到星星，點亮自己的特別能力。', 0]
];

const GROUPS = [
  ['story', '🌋 故事'], ['village', '🏘 獵人村'], ['board', '📜 委託板'], ['bag', '🎒 背包'], ['title', '🏅 稱號'],
  ['battle', '⚔ 戰鬥'], ['monster', '👾 魔物'], ['weapon', '🗡 武器'], ['region', '🗺 地方'], ['play', '🧩 新玩法'], ['vote', '🗳 投票']
];

const chunk = (a, n) => { const o = []; for (let i = 0; i < a.length; i += n) o.push(a.slice(i, i + n)); return o; };
const PAGES = [
  { g: 'story' }, { g: 'village' }, { g: 'board' }, { g: 'bag' }, { g: 'title' }, { g: 'battle' },
  ...chunk(MONSTERS, 4).map(items => ({ g: 'monster', items })),
  ...chunk(WEAPONS, 3).map(items => ({ g: 'weapon', items })),
  ...chunk(REGIONS, 4).map(items => ({ g: 'region', items })),
  { g: 'play' }, { g: 'vote' }
];

export function initNwPreview(C) {
  const { $, show, toast, escHtml, setTxt } = C;
  const S = { i: 0, cat: 'monster', vp: 0, sort: 'votes', admin: false, data: { noms: [], votes: {}, hidden: [] }, unsub: null };
  const ref = () => C.doc(C.db, 'mg_config', 'nw_vote');

  const tag = (t, ok) => `<span class="nwp-tag ${ok ? 'ok' : ''}">${t}</span>`;
  const openTag = o => tag(o ? '第一批開放' : '施工中', o);
  const pic = (kind, key, hf, extra = '') => `<div class="nw-px nw-stage" data-k="${kind}:${key}" data-hf="${hf}" ${extra}></div>`;
  const rowsFor = n => Math.ceil(n / (innerWidth > 760 ? Math.min(n, 4) : 2));
  const hfFor = n => (0.55 / rowsFor(n)).toFixed(2);
  const card = (head, kind, key, text, extra, hf) => `
    <div class="nwp-card"><div class="flex items-center justify-between gap-2 mb-1"><b>${head}</b>${extra || ''}</div>
      ${pic(kind, key, hf)}<div class="nwp-sm mt-1">${text}</div></div>`;
  const steps = list => `<ol class="nwp-steps">${list.map((t, i) => `<li><b>${i + 1}</b><span>${t}</span></li>`).join('')}</ol>`;
  const slot = n => `<div class="nwp-slot"><i>${n}</i></div>`;

  function pageHTML(p) {
    switch (p.g) {
      case 'story': return `
        <div class="nwp-cols">
          ${pic('portal', '-', .6)}
          <div class="nwp-text">
            <h3>後山的石門亮了！</h3>
            <p>村子後山有一扇很老很老的石門。有一天，石門突然發出紫色的光！門後面就是<b style="color:#c9a6ff">「新世界」</b>，那裡有好多沒看過的大魔物。</p>
            <p>你是新世界的<b>獵人</b>。選一隻魔物，想一想牠怕什麼，什麼時候要躲、什麼時候要擋。打贏牠，就能拿到材料，做出自己的武器。</p>
            <p class="dim">舊世界練「打得快」，新世界練「怎麼打」。</p>
          </div>
        </div>
        <div class="nwp-note">
          <div><b>第一批開放：</b>${tag('📜 委託板', 1)} ${tag('🎒 背包', 1)} ${tag('🏅 稱號', 1)}</div>
          <div class="nwp-sm mt-1">打造、商店、組隊、星圖都還在施工中。現在只有拿到老師「通關密語」的同學，能先進去玩。</div>
        </div>
        <button class="nwp-cta" data-g="vote">🗳 你想在新世界看到什麼？去提名・投票</button>`;
      case 'village': return `
        <div class="nwp-cols">
          ${pic('village', '-', .7)}
          <div class="nwp-text">
            <h3>獵人村</h3>
            <p>獵人村是新世界的大廳，房子散在噴水池旁邊，還有會走來走去的村民。</p>
            ${steps(['用 W A S D 或方向鍵走路，也可以用手指或滑鼠點想去的地方。',
              '想進房子：<b>點一下房子</b>，或站在門口按 <b>Enter</b>。走過門口不會直接進去喔！',
              '灰色的房子還在施工中，點了會告訴你。', '村民可以點，他們會跟你說話。'])}
          </div>
        </div>`;
      case 'board': return `
        <div class="nwp-cols">
          <div class="nwp-wood">${['coo', 'frog', 'wolf'].map((k, i) => `<div class="nwp-sheet" style="transform:rotate(${[-3, 2, -1.5][i]}deg)"><div class="nw-px" data-k="ink:${k}" data-hf=".2"></div><b>${['咕咕鳥', '泡泡蛙', '炎牙狼'][i]}</b><span>${['★', '★★', '★★★'][i]}</span></div>`).join('')}</div>
          <div class="nwp-text">
            <h3>委託板</h3>
            ${steps(['在木板上選一張<b>委託單</b>。單子上有星星（越多越難）、魔物名字和等級。',
              '右邊的<b>大地圖</b>會亮起來，告訴你魔物住在哪裡。',
              '按「<b>狩獵</b>」開一個房間，再按「出發」開始打。',
              '上面的分頁可以看同學開的房間。一起打還在施工中。'])}
            <p class="nwp-sm">打贏草原 ★5，就能去迷霧森林。</p>
          </div>
        </div>`;
      case 'bag': return `
        <div class="nwp-cols">
          <div class="nwp-doll">
            <div class="nwp-b">${slot('頭盔')}${slot('盔甲')}${slot('護腳')}</div>
            <div class="nw-px nw-stage" data-k="hero:-" data-look='${JSON.stringify({ style: 'short', hair: '#5a3a22', armor: '#3e9a96', weapon: 'bow' })}' data-hf=".5"></div>
            <div class="nwp-b">${slot('武器')}${slot('護手')}</div>
          </div>
          <div class="nwp-text">
            <h3>背包</h3>
            <p>按 <b>B</b> 或右上角的按鈕打開。左邊是你的角色和 5 個裝備格，右邊有裝備、道具、材料、圖紙、任務、圖鑑。</p>
            <p>第一把武器可以<b>四選一</b>（前 3 場可以免費換）：</p>
            <div class="nwp-four">${WEAPONS.slice(0, 4).map(w => `<div>${pic('weapon', w.k, .1)}<b>${w.n}</b></div>`).join('')}</div>
            <p class="nwp-sm">髮型、髮色、膚色可以自己改。其他裝備格等鐵匠鋪開張才能用。</p>
          </div>
        </div>`;
      case 'title': return `
        <div class="nwp-cols">
          <div class="nwp-badges">${[1, 2, 3].map(n => `<div>${PX.badge(n, 6)}<b>${['銅', '銀', '金'][n - 1]}</b></div>`).join('')}<p class="nwp-sm">詞條拚得越多，徽章越亮</p></div>
          <div class="nwp-text">
            <h3>自己拚稱號</h3>
            <p>遊戲只給你「<b>詞條</b>」，稱號由你自己拚！一次拚 1～3 個，順序自己決定。</p>
            <div class="nwp-mix"><span>疾風</span>＋<span>弓手</span>＝<b>疾風弓手</b></div>
            <p class="nwp-sm">詞條有三種：<b>等級</b>（新手、熟練…）、<b>武器</b>（法師、弓手…）、<b>成就</b>（勇者、殘影…）。沒拿到的是灰色，會告訴你怎麼拿。</p>
            <p class="nwp-sm">點背包裡角色上面的稱號就能拚。舊世界的大廳和排行榜也看得到喔！</p>
          </div>
        </div>`;
      case 'battle': return `
        <div class="nwp-cols col">
          ${pic('battle', '-', .46)}
          <div class="nwp-text">
            <p class="nwp-sm">① 魔物 ② 紅色危險區 ③ 同學 ④ 你（金色圈圈） ⑤ 題目</p>
            ${steps(['看魔物頭上的條慢慢變滿，地上會出現紅色（要閃）或藍色（要擋）。',
              '輸入框上面的「<b>姿態條</b>」變綠色、寫「現在打」，就打一個字：紅色打「<b>閃</b>」、藍色打「<b>防</b>」。',
              '打完會進入「閃避姿態」或「防禦姿態」，條走完以前攻擊打到你，就會被躲掉或擋住。'])}
            <p class="nwp-sm">題目都是<b>國字</b>，不用打注音符號。打對的字才有傷害，亂打會被反擊。</p>
          </div>
        </div>`;
      case 'monster': return `<div class="nwp-grid">${p.items.map(m => card(`${m.n} ${m.e}`, 'monster', m.k, m.t, openTag(m.open), hfFor(p.items.length))).join('')}</div><p class="nwp-sm">點一下魔物，看牠生氣的樣子。</p>`;
      case 'weapon': return `<div class="nwp-grid">${p.items.map(w => card(w.n, 'weapon', w.k, w.t, tag(w.first ? '第一批可選' : '施工中', w.first), hfFor(p.items.length))).join('')}</div><p class="nwp-sm">第一把武器從法杖、長弓、雙刀、連弩裡選，其他的要自己打造。</p>`;
      case 'region': return `<div class="nwp-grid">${p.items.map(r => card(r.n, 'region', r.k, r.t, openTag(r.open), hfFor(p.items.length))).join('')}</div>`;
      case 'play': return `<h3>新玩法</h3><div class="nwp-grid">${PLAY.map(([h, t, o]) => `<div class="nwp-card"><div class="flex items-center justify-between gap-2"><b>${h}</b>${openTag(o)}</div><div class="nwp-sm mt-1">${t}</div></div>`).join('')}</div>`;
      case 'vote': return voteHTML();
    }
    return '';
  }

  function voteHTML() {
    const c = CATS.find(x => x.k === S.cat);
    return `
      <div class="nwp-vbanner">
        <div class="nwp-vh">🗳 一起決定新世界的樣子！</div>
        ${steps(['按下面的<b>分類</b>（魔物名字、想去的地方…）。',
          `在大格子裡<b>打字</b>（最多 ${MAXLEN} 個字），按 <b>Enter</b> 或「<b>提名</b>」。`,
          '看到喜歡的，按「<b>👍 投一票</b>」，喜歡就多按幾下，票數不限！'])}
      </div>
      <div id="nw-who" class="nwp-who"></div>
      <div class="nwp-cats">${CATS.map(x => `<button class="nwp-cat" data-cat="${x.k}" aria-pressed="${x.k === S.cat}">${x.icon} ${x.name}</button>`).join('')}</div>
      <div class="nwp-input">
        <input class="nw-in" data-cat="${c.k}" maxlength="${MAXLEN}" placeholder="${c.ph}（最多 ${MAXLEN} 字）" autocomplete="off">
        <button class="nw-add" data-cat="${c.k}">提名</button>
      </div>
      <div id="nw-list-${c.k}" class="nwp-list"></div>
      <div class="nwp-vfoot">
        <button id="nw-sort" class="nwp-mini">排序：${S.sort === 'votes' ? '票數' : '最新'}</button>
        <span id="nwp-vpage" class="nwp-sm"></span>
        <button class="nwp-mini" data-vp="-1">◀</button><button class="nwp-mini" data-vp="1">▶</button>
        <button id="nw-admin" class="nwp-mini dim">${S.admin ? '結束管理' : '老師管理'}</button>
      </div>
      <div id="nw-admin-box" class="nwp-adm ${S.adminBox ? '' : 'hidden'}"><input id="nw-admin-pw" type="password" placeholder="教師密碼"><button id="nw-admin-ok">確定</button></div>`;
  }

  function paintWho() {
    const box = $('nw-who'); if (!box) return;
    const w = C.who();
    if (!C.online()) box.innerHTML = '<span style="color:#e5705f">目前連不上網路，沒辦法提名或投票。先看看預告吧！</span>';
    else if (w) box.innerHTML = `你是：<b>${escHtml(w.cls)}　${escHtml(w.seat)}號　${escHtml(w.name)}</b> <span class="dim">（提名會顯示你的班級、座號、姓名）</span>`;
    else box.innerHTML = '<span style="color:var(--gold)">要先在首頁填好班級、座號、姓名，才能提名和投票。</span>（只看不用填）';
    const can = C.online() && !!w;
    document.querySelectorAll('#nwp-page .nw-in, #nwp-page .nw-add, #nwp-page .nw-vote').forEach(e => { e.disabled = !can; });
  }

  function paintList() {
    const el = document.querySelector('#nwp-page .nwp-list'); if (!el) return;
    const hidden = new Set(S.data.hidden || []), now = Date.now(), can = C.online() && !!C.who();
    const votes = n => Math.max(0, +(S.data.votes || {})[n.id] || 0);
    const list = (S.data.noms || []).filter(n => n.cat === S.cat && (S.admin || !hidden.has(n.id)));
    list.sort(S.sort === 'votes' ? (a, b) => votes(b) - votes(a) || b.t - a.t : (a, b) => b.t - a.t);
    const per = Math.max(2, Math.floor(el.clientHeight / 54));
    const pages = Math.max(1, Math.ceil(list.length / per));
    S.vp = Math.min(Math.max(0, S.vp), pages - 1);
    el.innerHTML = list.length ? list.slice(S.vp * per, S.vp * per + per).map(n => `
      <div class="nw-nom ${hidden.has(n.id) ? 'hid' : ''} ${now - n.t < 60000 ? 'fresh' : ''}">
        <div class="flex-1 min-w-0"><div class="font-bold nwp-ell">${escHtml(n.text)}${now - n.t < 60000 ? ' <span class="text-xs" style="color:var(--gold)">新！</span>' : ''}${hidden.has(n.id) ? ' <span class="text-xs" style="color:#e5705f">（已隱藏）</span>' : ''}</div>
          <div class="text-xs dim nwp-ell">${escHtml(n.cls)} ${escHtml(n.seat)}號 ${escHtml(n.name)}</div></div>
        <b style="color:var(--gold);min-width:2.2em;text-align:right">${votes(n)}</b>
        <button class="nw-vote" data-id="${n.id}" ${can ? '' : 'disabled'}>👍 投一票</button>
        ${S.admin ? `<button class="nw-hide nwp-mini" data-id="${n.id}" data-hid="${hidden.has(n.id) ? 1 : 0}">${hidden.has(n.id) ? '恢復' : '隱藏'}</button>` : ''}
      </div>`).join('') : '<div class="dim" style="padding:14px 4px">還沒有人提名，你當第一個！</div>';
    setTxt('nwp-vpage', `共 ${list.length} 則・第 ${S.vp + 1}/${pages} 頁`);
  }

  function mountPx() {
    const page = $('nwp-page'), areaH = page.clientHeight;
    page.querySelectorAll('.nw-px').forEach(el => {
      const [kind, key] = el.dataset.k.split(':'), hf = +el.dataset.hf || .4;
      const make = sc => kind === 'hero' ? PX.hero(JSON.parse(el.dataset.look), sc)
        : kind === 'village' ? PX.village(VILLAGE, ['board']) : kind === 'ink' ? PX.ink('monster', key, sc) : PX.canvas(kind, key, sc, false);
      let w, h;
      if (kind === 'battle') { w = 160; h = 96 + 14; } else { const t = make(1); w = t.width; h = t.height; }
      const availW = (el.clientWidth || 280) - 16, availH = areaH * hf;
      const sc = Math.max(1, Math.min(12, Math.floor(Math.min(availW / w, availH / h))));
      if (kind === 'battle') return mountBattle(el, sc);
      if (kind === 'village') { const c = make(1); c.style.width = (c.width * Math.max(1, Math.floor(Math.min(availW / c.width, availH / c.height)))) + 'px'; c.style.imageRendering = 'pixelated'; el.replaceChildren(c); return; }
      el.replaceChildren(make(sc));
      if (kind === 'monster') el.onclick = () => { const on = el.dataset.angry !== '1'; el.dataset.angry = on ? '1' : '0'; el.replaceChildren(PX.canvas(kind, key, sc, on)); };
    });
  }

  function mountBattle(el, sc) {
    const w = 160 * sc, at = (x, y) => `left:${x / 1.6}%;top:${y / .96}%`;
    const tg = (x, y, name, chip, me) => `<div class="nwb-tag${me ? ' me' : ''}" style="${at(x, y + 2)}">${name}<small>${chip}</small></div>`;
    const num = (n, x, y) => `<span class="nwb-n" style="${at(x, y)}">${n}</span>`;
    el.innerHTML = `<div class="nwb" style="width:${w}px;--u:${sc}px">
      <div class="nwb-sc" style="height:${96 * sc}px">
        <div class="nwb-plate"><div>炎牙狼 Lv25 <span style="color:#ff8a6a">🔥生氣中</span></div><div class="nwb-bar"><i style="width:62%"></i></div></div>
        <div class="nwb-call">快打「閃」！</div><div class="nwb-timer">⏱ 3:12</div>
        ${tg(22, 78, '小華', '詠唱中 ✨')}${tg(90, 74, '小美', '擋住了 🛡')}${tg(134, 80, '阿傑', '躲開了 💨')}${tg(62, 88, '你・小明', '打字中 ⌨', true)}
        ${num('①', 116, 8)}${num('②', 46, 70)}${num('③', 150, 56)}${num('④', 74, 54)}
      </div>
      <div class="nwb-bottom"><span class="nwb-n">⑤</span>
        <div style="flex:1;min-width:0"><div class="nwp-stance"><b>✅ 現在打「閃」！</b><div class="nwp-sbar"><i></i></div></div>
          <div class="nwb-q"><span style="color:var(--dim)">題目</span> 持之以恆<span class="nwb-in">▍</span></div></div>
      </div></div>`;
    el.querySelector('.nwb-sc').prepend(PX.canvas('battle', '-', sc, false));
  }

  function render() {
    const p = PAGES[S.i];
    $('nwp-page').innerHTML = pageHTML(p);
    $('nwp-nav').innerHTML = GROUPS.map(([g, n]) => `<button class="nwp-chip" data-g="${g}" aria-pressed="${g === p.g}">${n}</button>`).join('');
    setTxt('nwp-count', `第 ${S.i + 1} / ${PAGES.length} 頁`);
    $('nwp-prev').disabled = S.i === 0; $('nwp-next').disabled = S.i === PAGES.length - 1;
    mountPx();
    if (p.g === 'vote') { paintWho(); paintList(); }
  }
  const go = i => { S.i = Math.min(PAGES.length - 1, Math.max(0, i)); S.vp = 0; render(); };

  async function nominate(cat) {
    const w = C.who();
    if (!C.online()) { toast('目前連不上網路'); return; }
    if (!w) { toast('要先填好班級、座號、姓名'); return; }
    const inp = document.querySelector(`.nw-in[data-cat="${cat}"]`);
    const text = inp.value.replace(/\s+/g, ' ').trim();
    if (!text) { toast('先打上你想提名的內容'); inp.focus(); return; }
    if (Array.from(text).length > MAXLEN) { toast(`最多 ${MAXLEN} 個字`); return; }
    const dup = (S.data.noms || []).find(n => n.cat === cat && n.text === text);
    if (dup) {
      inp.value = '';
      if ((S.data.hidden || []).includes(dup.id)) { toast('這則不能提名'); return; }
      toast('已經有人提過了，幫你投了一票！'); vote(dup.id); return;
    }
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const item = { id, cat, text, cls: w.cls, seat: w.seat, name: w.name, t: Date.now() };
    inp.value = '';
    try { await C.withTimeout(C.setDoc(ref(), { noms: C.arrayUnion(item) }, { merge: true }), 6000, 'nw-nominate'); toast('提名成功！'); }
    catch (e) { console.warn('提名失敗', e); toast('送出失敗，再試一次'); inp.value = text; }
  }
  async function vote(id) {
    if (!C.online() || !C.who()) return;
    try { await C.withTimeout(C.setDoc(ref(), { votes: { [id]: C.increment(1) } }, { merge: true }), 6000, 'nw-vote'); }
    catch (e) { console.warn('投票失敗', e); toast('投票失敗，再試一次'); }
  }
  async function hide(id, was) {
    if (!S.admin) return;
    try { await C.withTimeout(C.setDoc(ref(), { hidden: was ? C.arrayRemove(id) : C.arrayUnion(id) }, { merge: true }), 6000, 'nw-hide'); }
    catch (e) { console.warn('隱藏失敗', e); toast('操作失敗，再試一次'); }
  }

  function open() {
    show('nw-modal', true);
    go(0);
    if (C.online() && !S.unsub) {
      S.unsub = C.onSnapshot(ref(), snap => {
        const d = snap.exists() ? snap.data() : {};
        S.data = { noms: d.noms || [], votes: d.votes || {}, hidden: d.hidden || [] };
        if (PAGES[S.i].g === 'vote') paintList();
      }, e => console.warn('提名監聽失敗', e));
    }
  }
  function close() {
    show('nw-modal', false);
    if (S.unsub) { S.unsub(); S.unsub = null; }
    S.admin = false; S.adminBox = false;
  }

  $('btn-nw').addEventListener('click', open);
  $('nw-close').addEventListener('click', close);
  $('nwp-prev').addEventListener('click', () => go(S.i - 1));
  $('nwp-next').addEventListener('click', () => go(S.i + 1));
  addEventListener('resize', () => { if (!$('nw-modal').classList.contains('hidden')) render(); });
  $('nw-modal').addEventListener('click', e => {
    const g = e.target.closest('[data-g]'); if (g) { go(PAGES.findIndex(p => p.g === g.dataset.g)); return; }
    const cat = e.target.closest('.nwp-cat'); if (cat) { S.cat = cat.dataset.cat; S.vp = 0; render(); return; }
    const add = e.target.closest('.nw-add'); if (add) { nominate(add.dataset.cat); return; }
    const v = e.target.closest('.nw-vote'); if (v) { vote(v.dataset.id); return; }
    const hd = e.target.closest('.nw-hide'); if (hd) { hide(hd.dataset.id, hd.dataset.hid === '1'); return; }
    const vp = e.target.closest('[data-vp]'); if (vp) { S.vp += +vp.dataset.vp; paintList(); return; }
    if (e.target.closest('#nw-sort')) { S.sort = S.sort === 'votes' ? 'new' : 'votes'; setTxt('nw-sort', `排序：${S.sort === 'votes' ? '票數' : '最新'}`); paintList(); return; }
    if (e.target.closest('#nw-admin')) {
      if (S.admin) { S.admin = false; setTxt('nw-admin', '老師管理'); paintList(); return; }
      S.adminBox = true; show('nw-admin-box', true); $('nw-admin-pw').focus(); return;
    }
    if (e.target.closest('#nw-admin-ok')) adminOk();
  });
  function adminOk() {
    if ($('nw-admin-pw').value !== C.adminPw) { toast('密碼錯誤'); return; }
    $('nw-admin-pw').value = ''; S.adminBox = false; show('nw-admin-box', false);
    S.admin = true; setTxt('nw-admin', '結束管理'); paintList();
  }
  $('nw-modal').addEventListener('keydown', e => {
    if (e.isComposing) return;
    const t = e.target;
    if (e.key === 'Enter' && t.classList.contains('nw-in')) nominate(t.dataset.cat);
    else if (e.key === 'Enter' && t.id === 'nw-admin-pw') adminOk();
    else if (!/INPUT|TEXTAREA/.test(t.tagName)) {
      if (e.key === 'ArrowRight') go(S.i + 1); else if (e.key === 'ArrowLeft') go(S.i - 1); else if (e.key === 'Escape') close();
    }
  });
  return { open, close };
}
