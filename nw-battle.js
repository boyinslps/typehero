import { BAL, MONSTERS, GIFT_WEAPONS, weaponBase, curWeapon, hpPlayersMul, gearStats, gearMul, RANK_MIN_ACC, SUS, qBand, MAX_CHARS, CHANT_MAX, SHORT_CHANTS, regionLv, monMaxHp, monDmg, strikeDamage, atkInterval, castTime, STATUS, NW_V2, FLOWS, v2On, nwMaxHp, nwTier, nwLaneW, stdSecs, attacksFor, attackMul } from './nw-data.js';

const CSS = `
#nwb-root{position:fixed;inset:0;z-index:70;display:flex;flex-direction:column;background:#000;color:var(--ink);font-size:clamp(13px,1.5vmin + 7px,21px);font-weight:700}
.nwb3-stage{position:relative;flex:1;min-height:0;overflow:hidden}
.nwb3-cvw{position:absolute;bottom:0;left:50%;transform:translateX(-50%)}
.nwb3-cvw canvas{display:block;image-rendering:pixelated;image-rendering:crisp-edges}
.nwb2-ov{position:absolute;inset:0;pointer-events:none}
.nwb3-hud{position:absolute;left:0;right:0;top:0;padding:10px 12px;display:flex;gap:10px;align-items:flex-start;pointer-events:none}
.nwb3-hud>*{pointer-events:auto}
.nwb3-plate{flex:1;max-width:560px;margin:0 auto;padding:6px 14px!important}
.nwb3-time{flex:none;text-align:center;padding:6px 14px!important}
.nwb2-cast{position:absolute;left:50%;top:84px;transform:translateX(-50%);min-width:min(520px,80%);text-align:center;font-weight:900;display:none;
  background:#1b1738;border:4px solid #ff8a6a;box-shadow:inset 0 0 0 2px #0a0714;padding:6px 12px;z-index:3}
.nwb2-cast.defend{border-color:#9fd8ff}
.nwb2-cast .bar{height:14px;background:#0a0714;border:2px solid #0a0714;margin-top:4px;padding:1px}
.nwb2-cast .bar i{display:block;height:100%;width:0;background:repeating-linear-gradient(90deg,#d83a3a 0 6px,transparent 6px 8px)}
.nwb2-cast.defend .bar i{background:repeating-linear-gradient(90deg,#3a7ad8 0 6px,transparent 6px 8px)}
.nwb2-cast small{display:block;font-weight:800;color:#ffd98a;margin-top:2px}
.nwb2-float{position:absolute;transform:translate(-50%,0);font-weight:900;white-space:nowrap;text-shadow:2px 2px 0 #000,-1px -1px 0 #000,1px -1px 0 #000,-1px 1px 0 #000;animation:nwbRise 1s steps(8) forwards}
@keyframes nwbRise{0%{opacity:0;margin-top:6px}15%{opacity:1}100%{opacity:0;margin-top:-34px}}
.nwb2-banner{position:absolute;left:50%;top:44%;transform:translate(-50%,-50%);font-weight:900;font-size:2.2em;color:#fff;
  text-shadow:4px 4px 0 #000,-2px -2px 0 #000,2px -2px 0 #000,-2px 2px 0 #000;animation:nwbBan 1.1s steps(10) forwards;white-space:nowrap}
@keyframes nwbBan{0%{opacity:0;transform:translate(-50%,-50%) scale(.6)}20%{opacity:1;transform:translate(-50%,-50%) scale(1.1)}100%{opacity:0;transform:translate(-50%,-70%) scale(1)}}
.nwb2-down{position:absolute;inset:0;display:none;place-items:center;background:rgba(10,8,18,.6);font-weight:900;font-size:1.6em;text-align:center;z-index:4}
.nwb3-dock{margin:0!important;display:grid;grid-template-columns:minmax(150px,1fr) minmax(0,3fr) minmax(150px,1fr);gap:14px;align-items:center;padding:10px 16px!important;flex:none}
@media (max-width:760px){.nwb3-dock{grid-template-columns:1fr;gap:6px}}
.nwb2-q{font-weight:900;min-height:2.4em;display:flex;flex-wrap:wrap;gap:.1em .15em;align-items:flex-start;transform-origin:left top}
#nwb-in{width:100%;margin-top:6px;padding:8px 12px;background:#0a0714;border:3px solid #6a5ab0;color:var(--ink);font-weight:800;font-family:inherit}
#nwb-in:focus{border-color:#ffd98a;outline:none}
#nwb-in:disabled{opacity:.45}
.nwb-stance{margin-top:6px;padding:4px 8px 6px;background:#0a0714;border:3px solid #3a3070;--sc:#7b6ac8}
.nwb-stance[data-state="dodge"]{border-color:#9fd8ff}
.nwb-stance[data-state="defend"]{border-color:#ffd24a}
.nwb-stance[data-state="danger"]{border-color:#ff5a5a;--sc:#ff5a5a;animation:nwbGo .45s steps(2) infinite}
.nwb-stance[data-state="go"]{border-color:#8ec96b;--sc:#8ec96b;animation:nwbGo .45s steps(2) infinite}
.nwb-stance[data-state="wait"]{--sc:#7b6ac8}
@keyframes nwbGo{50%{background:#16301c}}
.nwb-stance .row{display:flex;justify-content:space-between;gap:8px;font-weight:900;flex-wrap:wrap}
.nwb-stance .row small{font-weight:700;color:#aab0d8}
.nwb-stance .bar{position:relative;height:16px;margin-top:4px;background:#14102a;border:2px solid #6a5ab0}
.nwb-stance .bar i{display:block;height:100%;width:0;background:repeating-linear-gradient(90deg,var(--sc) 0 6px,transparent 6px 8px)}
.nwb-stance .bar b{position:absolute;top:-5px;width:4px;height:23px;background:#ff4a4a;border:1px solid #fff;transform:translateX(-2px);display:none}
.nwb2-spore{transform:scale(.62)}
.nwb2-nozy .zy-bpmf{visibility:hidden}
.nwb2-bubbles{position:absolute;inset:0;pointer-events:none;display:none;overflow:hidden}
.nwb2-bubbles i{position:absolute;width:2.2em;height:2.2em;border-radius:50%;border:3px solid #bfe8ff;background:rgba(191,232,255,.25)}
.nwb2-chip{display:inline-block;padding:0 8px;font-size:.8em;font-weight:800;background:#0a0714;border:2px solid currentColor}
.nwb3-lbl{font-size:.8em;color:#aab0d8;font-weight:800}
`;

const TIER_KEYS = ['normal', 'fine', 'epic', 'legend'];
const LANE_C = [27, 80, 133];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rnd = arr => arr[Math.floor(Math.random() * arr.length)];

export function startBattle(env, cfg, done) {
  const { C, PX } = env;
  const NW = env.NW();
  const mon0 = MONSTERS[cfg.mk];
  const lv = regionLv(cfg.rk, cfg.star);
  const tier = env.tier();
  /* V2：血量、預警秒數、出招節奏都不看層級（SPEC-BALANCE-V2 §1.1）；tier 只剩記進 res。沒開 V2 時 tierE＝tier，行為不變 */
  const V2 = v2On(), tierE = nwTier(tier, V2);
  /* 時間上限：V2 沒有「時間到就輸」，只有倒下 3 次才輸；滿 cap 秒魔物逃走（不算輸，獎勵照打掉的血與有在打字的時間，見 newworld.js finishHunt） */
  /* 會用哪些攻擊：V2 照 ATTACKS_V2＋ATTACK_FROM（跳跳菇 ★1 不攻擊、狼全開、蛙多一個單線），沒開照舊的 ATTACKS_OPEN。測試在 localhost 可以用 window.__NW_ATTACKS__ 直接指定 */
  const enabled = (location.hostname === 'localhost' && window.__NW_ATTACKS__) || attacksFor(cfg.mk, cfg.star, V2);
  const CAP = V2 ? NW_V2.cap : BAL.timeLimit, STD = V2 ? stdSecs(cfg.rk, cfg.mk, cfg.star) : 0;
  /* 流派（SPEC-BALANCE-V2 §3）：只有 V2 開著、而且出發前選了才生效，其他一律是一般打法 */
  const flow = V2 && FLOWS[cfg.flow] ? cfg.flow : 'normal', FD = FLOWS[flow] || null;
  const wkey = curWeapon(NW) || 'staff', weapon = weaponBase(wkey), wmod = GIFT_WEAPONS[wkey] || null, CE = (wmod && wmod.chantEvery) || BAL.chantEvery;
  /* 裝備（2b）：攻擊力、屬性、生命、減傷、舉盾秒數、紅線預警。測試在 localhost 可以用 window.__NW_GEAR__ 直接指定（gearStats 的格式） */
  const GS = (location.hostname === 'localhost' && window.__NW_GEAR__) || gearStats(NW);
  const mode = 'hanzi';
  const nowS = () => performance.now() / 1000;

  if (!document.getElementById('nwb-style')) {
    const st = document.createElement('style'); st.id = 'nwb-style'; st.textContent = CSS; document.head.appendChild(st);
  }


  const root = document.createElement('div');
  root.id = 'nwb-root';
  root.innerHTML = `
    <div class="nwb3-stage" id="nwb-stage">
      <div class="nwb3-cvw" id="nwb-cvw">
        <canvas id="nwb-cv"></canvas>
        <div class="nwb2-ov" id="nwb-ov"></div>
      </div>
      <div class="nwb3-hud">
        <button id="nwb-quit" class="px-btn" style="font-size:.8em;padding:6px 12px">撤退</button>
        <div class="px-panel nwb3-plate"><div class="flex justify-between gap-2 px-text"><span id="nwb-mname"></span><span id="nwb-mflag"></span></div>
          <div class="px-bar" style="margin-top:4px"><i id="nwb-mhp"></i></div></div>
        <div class="px-panel nwb3-time"><div class="nwb3-lbl" id="nwb-tl">時間</div><div id="nwb-time" class="mono px-text" style="color:#ffd98a">5:00</div><div class="nwb3-lbl" id="nwb-std" style="display:none"></div></div>
      </div>
      <div class="nwb2-cast" id="nwb-cast"><div id="nwb-cast-t" class="px-text"></div><div class="bar"><i id="nwb-cast-i"></i></div><small id="nwb-cast-h"></small></div>
      <div class="nwb2-down" id="nwb-down"></div>
    </div>
    <div class="px-panel nwb3-dock">
      <div>
        <div class="nwb3-lbl">❤ 生命 <b id="nwb-hpt" class="px-text"></b> <span id="nwb-st"></span></div>
        <div class="px-bar ok" style="margin-top:3px"><i id="nwb-hp"></i></div>
        <div class="nwb3-lbl" style="margin-top:5px" id="nwb-wlabel"></div>
        <div style="display:flex;gap:8px;align-items:center"><div class="px-bar xp" style="flex:1"><i id="nwb-wg" style="width:0"></i></div>
          <span class="nwb3-lbl">連擊 <b id="nwb-combo" class="mono px-text" style="color:#ffd98a">0</b></span></div>
      </div>
      <div style="position:relative;min-width:0">
        <div class="nwb2-q px-text" id="nwb-q"></div>
        <div class="nwb2-bubbles" id="nwb-bub"></div>
        <div class="nwb-stance" id="nwb-stance" data-state="idle">
          <div class="row px-text"><span id="nwb-st-name">姿態：沒有</span><small id="nwb-st-hint"></small></div>
          <div class="bar"><i id="nwb-st-i"></i><b id="nwb-st-mark"></b></div>
        </div>
        <input id="nwb-in" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="打字攻擊，按 Enter 送出">
        <div class="nwb3-lbl" style="margin-top:4px" id="nwb-hint"></div>
        <div class="nwb3-lbl px-text" style="margin-top:2px;display:none" id="nwb-flow"></div>
      </div>
      <div class="nwb3-lbl" id="nwb-side" style="line-height:1.5"></div>
    </div>`;
  document.body.appendChild(root);
  const $q = id => root.querySelector('#' + id);
  const cvs = $q('nwb-cv'), g = cvs.getContext('2d');
  const stage = $q('nwb-stage'), cvw = $q('nwb-cvw');
  const sh = stage.clientHeight || 420, sw = stage.clientWidth || 800;
  const EXTRA = 20, SKY = cfg.rk === 'forest' ? '#2a4a3e' : '#6ec1ee';
  const sc = clamp(Math.floor(sh / (96 + EXTRA)), 2, 9), LW = Math.max(160, Math.ceil(sw / sc)), OX = Math.round((LW - 160) / 2);
  cvs.width = LW; cvs.height = 96 + EXTRA;
  cvs.style.width = LW * sc + 'px'; cvs.style.height = (96 + EXTRA) * sc + 'px';
  cvw.style.width = LW * sc + 'px'; cvw.style.height = (96 + EXTRA) * sc + 'px';
  stage.style.background = SKY;
  g.imageSmoothingEnabled = false;
  const inp = $q('nwb-in'), host = $q('nwb-q'), ov = $q('nwb-ov');

  const whiteOf = c => { const w = document.createElement('canvas'); w.width = c.width; w.height = c.height; const x = w.getContext('2d'); x.drawImage(c, 0, 0); x.globalCompositeOperation = 'source-atop'; x.fillStyle = '#fff'; x.fillRect(0, 0, w.width, w.height); return w; };
  const art = {
    bg: PX.bg(cfg.rk === 'forest' ? 'forest' : 'grass', LW),
    mon: PX.canvas('monster', cfg.mk, 2, false), monA: PX.canvas('monster', cfg.mk, 2, true),
    hero: PX.hero(env.myHero(wkey), 1)
  };
  art.monW = whiteOf(art.mon);

  const T0 = nowS();
  const S = {
    over: false, T0, mon: { hp: nwMaxHp(cfg.mk, lv, tier, cfg.players || 1, V2), max: nwMaxHp(cfg.mk, lv, undefined, cfg.players || 1, V2), angry: false, flashUntil: 0, lungeAt: -9 },
    me: { hp: BAL.playerHp + GS.hp, max: BAL.playerHp + GS.hp, down: false, downUntil: 0, downs: 0, hitAt: -9, x: 0, atkAt: -9 },
    st: { burn: 0, poison: [], ice: 0, lastTick: T0 },
    cast: null, nextCast: T0 + 6, lane: 1, hx: LANE_C[1] - 2, shieldUntil: 0, laneFlash: [],
    q: null, units: [], qAt: 0, qCount: 0, lastT: '', composing: false, committed: '',
    combo: 0, maxCombo: 0, typed: 0, correct: 0, answered: 0, perfect: 0,
    keys: 0, qKeys: 0, qLog: [],
    gauge: 0, sharp: 0, mag: 0,
    dodgeOk: 0, dodgeAll: 0, defOk: 0, defAll: 0,
    /* 遙測與「有在打字」（SPEC-BALANCE-V2 §3.4、§5）：lastCorrectAt＝最近一次打對字的時間，live＝累計「有在打字」的秒數；
       有在打字＝最近 afkWin 秒內打對過 1 個字（onInput 逐字判斷，慢手一題 40～80 秒也不會被當成掛機）而且最近 submitWin 秒內送出過 1 題（擋「每 40 秒打 1 個字、從不送出」）；
       dmgType／dmgFlow＝打字與流派各打掉多少血（輸／逃走時流派只算一半）；guards／vines／dodgeReal／react 給 mg_nw_runs 校準用 */
    lastCorrectAt: T0, lastSubmitAt: T0, accT: T0, vineT: T0, vineN: 0, vineAcc: 0, firstOk: false, afkHinted: false, downAt: 0, qOk: 0, live: 0, dmgType: 0, dmgFlow: 0, guards: 0, vines: 0, dodgeReal: 0, react: [],
    flags: { fast: 0, paste: 0, wrong: 0 }, fx: [], hits: [], volley: null, bubUntil: 0, sporeUntil: 0, lastUi: 0
  };
  host.dataset.mode = mode;

  $q('nwb-mname').textContent = `${mon0.name} Lv ${lv}`;
  $q('nwb-wlabel').textContent = weapon === 'staff' ? '下一次詠唱' : weapon === 'bow' ? '力量條' : weapon === 'dagger' ? '下一次連環斬' : '彈匣';
  $q('nwb-hint').innerHTML = enabled.length ? '紅色的線出現：<b style="color:#ffd98a">左 Ctrl／右 Ctrl</b> 換線躲開、<b style="color:#ffd98a">Alt</b> 舉盾' : '這隻魔物還不會攻擊，專心打字打倒牠！';

  $q('nwb-side').innerHTML = '<b class="px-text">操作</b><br>Enter 送出<br>Esc 換題<br>' + (weapon === 'crossbow' ? '空白 Enter＝連射' : enabled.length ? 'Ctrl 換線／Alt 舉盾' : '');

  const tierIdx = () => Math.min(3, (lv < 10 ? 0 : lv < 20 ? 1 : 2) + (S.mon.angry ? 1 : 0));
  const maxChars = MAX_CHARS(cfg.star);
  const fits = p => p.filter(q => [...q.t].length <= maxChars);
  function wordPool() {
    for (let i = tierIdx(); i >= 0; i--) { const f = fits(C.q.pool('common_' + TIER_KEYS[i])); if (f.length) return f; }
    return C.q.pool('common_normal');
  }
  /* 只擋「上一題」會一直撞到重複（詞庫約 100 個、一場要打幾十題）：改成近 30 題不重複，
     池子比 30 小就只擋池子的一半，免得沒題可選 */
  function pickWord() {
    const p = wordPool();
    S.recent = S.recent || [];
    const keep = Math.min(30, Math.floor(p.length / 2));
    let q, n = 0;
    do { q = rnd(p); n++; } while (p.length > 1 && S.recent.includes(q.t) && n < 40);
    S.recent.push(q.t); if (S.recent.length > keep) S.recent.splice(0, S.recent.length - keep);
    S.lastT = q.t; return { t: q.t, z: q.z, sp: null };
  }
  function pickChant() {
    const short = C.q.pool('special_staff').filter(q => [...q.t].length <= CHANT_MAX);
    const q = rnd(short.length ? short : SHORT_CHANTS);
    return { t: q.t, z: q.z, sp: 'chant' };
  }
  function pickFlurry() {
    const p = wordPool(), pick = [];
    let chars = 0;
    for (let i = 0; i < 3; i++) { const q = rnd(p); const n = [...q.t].length; if (pick.length && chars + n > Math.max(6, maxChars + 2)) break; pick.push(q); chars += n; }
    return { t: pick.map(q => q.t).join(''), z: pick.map(q => q.z).join(' '), sp: 'flurry' };
  }
  function nextQuestion() {
    if (S.over) return;
    S.qCount++;
    const every = S.qCount % CE === 0;
    S.q = (weapon === 'staff' && every) ? pickChant() : (weapon === 'dagger' && every) ? pickFlurry() : pickWord();
    S.units = C.q.questionUnits(S.q, mode);
    renderUnits();
    S.qAt = nowS();
    inp.value = ''; S.committed = ''; S.qKeys = 0; S.qOk = 0;
    inp.style.fontSize = clamp(Math.floor(((inp.clientWidth || 600) - 40) / Math.max(1, S.units.length)), 16, 30) + 'px';
    if (S.q.sp === 'chant') banner('✨ 詠唱！全部打對傷害變 3 倍', '#c9a6ff', true);
    if (S.q.sp === 'flurry') banner('🗡 連環斬！越快越痛', '#ffd24a', true);
    if (!S.me.down) inp.focus();
  }
  function renderUnits() {
    host.innerHTML = '';
    const n = S.units.length;
    host.style.fontSize = (n <= 8 ? 1.9 : n <= 14 ? 1.55 : n <= 22 ? 1.25 : 1.05) + 'em';
    S.units.forEach((u, i) => {
      const el = document.createElement('span');
      el.className = 'zy st-pending';
      const han = document.createElement('span'); han.className = 'zy-han'; han.textContent = u.show; el.appendChild(han);
      if (mode === 'hanzi' && u.zy) {
        const z = C.q.splitZhuyin(u.zy);
        if (z) {
          const box = document.createElement('span'); box.className = 'zy-bpmf';
          const syms = document.createElement('span'); syms.className = 'zy-syms';
          if (z.light) { const d = document.createElement('span'); d.className = 'zy-light'; d.textContent = '˙'; syms.appendChild(d); }
          z.syms.forEach(s => { const sp = document.createElement('span'); sp.textContent = s; syms.appendChild(sp); });
          box.appendChild(syms);
          const tn = document.createElement('span'); tn.className = 'zy-tone'; tn.textContent = z.tone || ''; box.appendChild(tn);
          el.appendChild(box);
        }
      }
      host.appendChild(el);
    });
    if (host.firstChild) host.firstChild.classList.add('st-current');
  }
  function paintProgress() {
    const typed = [...(S.composing ? S.committed : inp.value)];
    const blind = weapon === 'bow' && S.sharp > 0;
    const nodes = host.children;
    for (let i = 0; i < S.units.length; i++) {
      const el = nodes[i]; if (!el) continue;
      el.classList.remove('st-current', 'st-correct', 'st-wrong', 'st-pending');
      if (i < typed.length) el.classList.add(blind ? 'st-pending' : (C.q.canon(typed[i]) === C.q.canon(S.units[i].want) ? 'st-correct' : 'st-wrong'));
      else el.classList.add('st-pending');
    }
    const cur = nodes[Math.min(typed.length, S.units.length - 1)];
    if (cur && typed.length < S.units.length) cur.classList.add('st-current');
  }

  function banner(text, color, small) {
    const b = document.createElement('div'); b.className = 'nwb2-banner'; b.textContent = text; b.style.color = color || '#fff';
    if (small) { b.style.fontSize = '1.3em'; b.style.top = '30%'; }
    ov.appendChild(b); setTimeout(() => b.remove(), 1100);
  }
  function floatText(text, x, y, color, big) {
    const f = document.createElement('div'); f.className = 'nwb2-float'; f.textContent = text;
    f.style.left = ((x + OX) / LW * 100) + '%'; f.style.top = ((y + EXTRA) / (96 + EXTRA) * 100) + '%'; f.style.color = color; f.style.fontSize = big ? '1.7em' : '1.2em';
    ov.appendChild(f); setTimeout(() => f.remove(), 1000);
  }
  const addFx = (kind, o) => S.fx.push(Object.assign({ kind, t0: nowS(), dur: .3 }, o));
  /* 反擊要「看得出來」：斬擊交叉、爆開的方塊、全場白閃、魔物抖動、短暫停格、大字。
     減少動態效果的人：白閃、抖動、停格都不做（會閃的東西），斬擊與大字留著，所以仍看得出反擊發生了。
     停格只停「畫面」不停計時：出招倒數、打字判定照走，不會拖慢輸入 */
  const reduceMotion = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };
  function counterFx(T) {
    const rm = reduceMotion();
    if (!rm) addFx('cflash', { dur: .12 });   // 先加先畫：白閃墊在最底，斬擊疊在上面才不會被洗掉
    addFx('cslash', { dur: .32 });
    if (!rm) {
      S.mon.shakeUntil = T + .28;
      S.mon.flashUntil = Math.max(S.mon.flashUntil, T + .24);
      S.hsUntil = T + .1; S.hsDrawn = false;
    }
    S.counters = (S.counters || 0) + 1;
    floatText('反擊！', 30, 34, '#9fd8ff', true)   // 放在魔物左側：不蓋住頭上的傷害數字與「擋下來了」橫幅;
  }

  S.dark = [];
  function darkBurst() { const T = nowS(); for (let i = 0; i < 12; i++) S.dark.push({ x: 80 + (Math.random() - .5) * 30, y: 30 + (Math.random() - .5) * 18, vx: (Math.random() - .5) * 1.6, vy: -.4 - Math.random() * 1.2, t0: T, life: .6 + Math.random() * .4 }); }
  function drawDark(T, hx, hy) {
    if (Math.random() < .55) S.dark.push({ x: hx + 8 + Math.random() * 8, y: hy - 24 + Math.random() * 14, vx: (Math.random() - .5) * .3, vy: -.2 - Math.random() * .3, t0: T, life: .8 + Math.random() * .5 });
    S.dark = S.dark.filter(p => T - p.t0 < p.life).slice(-80);
    S.dark.forEach(p => {
      const k = (T - p.t0) / p.life, x = Math.round(p.x + p.vx * (T - p.t0) * 40), y = Math.round(p.y + p.vy * (T - p.t0) * 40);
      g.fillStyle = `rgba(14,6,24,${1 - k})`; g.fillRect(x - 1, y - 1, 3, 3);
      g.fillStyle = `rgba(170,100,240,${(1 - k) * .9})`; g.fillRect(x, y, 1, 1);
    });
  }
  /* 流派的「有在打字」：要真的打對過字（出發就站著不動的 40 秒寬限只給獎勵的 live，不給流派），而且兩個期限都沒過 */
  const flowActive = T => S.firstOk && !S.me.down && T <= S.lastCorrectAt + NW_V2.afkWin && T <= S.lastSubmitAt + NW_V2.submitWin;
  /* 藤蔓每秒的傷害（已乘 g）累積到 1 點才扣：只算 [vineT, T] 裡還「有在打字」的那一段，所以打字停了 40 秒藤蔓就停，打對字又接著算。
     每次改期限前一定先呼叫（advance 會呼叫它），不然停了很久的空檔會被新的打字補成有效 */
  function vineAdvance(T) {
    if (flow !== 'vine') return;
    const until = Math.min(T, S.lastCorrectAt + NW_V2.afkWin, S.lastSubmitAt + NW_V2.submitWin), dt = S.me.down ? 0 : Math.max(0, until - S.vineT);
    S.vineT = Math.max(S.vineT, T);
    if (!S.vineN || !dt || S.over) return;
    S.vineAcc += dt * S.vineN * S.mon.max * FD.rho * gearMul(GS, cfg.mk) / FD.every;
    const n = Math.floor(S.vineAcc);
    if (n >= 1) { S.vineAcc -= n; hitMonster(n, '', '#8ec96b', true, true); }
  }
  /* 把「有在打字」的秒數累加到時間 T：區間 [accT, T] 裡，只有在最後一次打對字＋afkWin、最後一次送出＋submitWin 兩個期限之前的部分算。
     每次事件（逐字打對、送出、倒下、起身、結束）先呼叫它再改期限，所以不靠每幀計時，分頁在背景 rAF 暫停也不會算錯 */
  function advance(T) {
    vineAdvance(T);
    S.live += Math.max(0, Math.min(T, S.lastCorrectAt + NW_V2.afkWin, S.lastSubmitAt + NW_V2.submitWin) - S.accT);
    S.accT = Math.max(S.accT, T);
  }
  /* 流派傷害算出來就已經乘過攻擊力 g（呼叫端算），所以 viaFlow 的不再乘一次；而且一場的流派傷害不能超過打字傷害（§3.4：能量來自打字） */
  function hitMonster(dmg, note, color, small, flow) {
    if (dmg <= 0 || S.over) return;
    /* 裝備攻擊力 × 屬性：只放大打對的字（dmg 已經是打對的字算出來的，打錯是 0）。測試者之刃的 ×1.12 現在是攻擊力 112 */
    if (flow) { dmg = Math.min(dmg, Math.max(0, Math.floor(S.dmgType * NW_V2.flowCap - S.dmgFlow))); if (dmg <= 0) return; }
    else dmg = Math.max(1, Math.round(dmg * gearMul(GS, cfg.mk)));
    if (wmod && wmod.dark) darkBurst();
    /* 記「真的打掉的血」（最後一下超出的不算），算 f 用；flow 是第 9 步的流派傷害 */
    if (flow) S.dmgFlow += Math.min(dmg, S.mon.hp); else S.dmgType += Math.min(dmg, S.mon.hp);
    S.mon.hp = Math.max(0, S.mon.hp - dmg);
    S.mon.flashUntil = nowS() + .15;
    if (small) floatText(String(dmg), 66 + Math.random() * 28, 14 + Math.random() * 18, color || '#fff', false);
    else floatText(String(dmg), 80, 14, color || '#ffd24a', true);
    if (note) floatText(note, 80, 24, '#fff');
    if (!S.mon.angry && S.mon.hp > 0 && S.mon.hp <= S.mon.max * BAL.angryAt) {
      S.mon.angry = true;
      $q('nwb-mflag').innerHTML = '<span class="nwb2-chip" style="color:#ff8a6a">🔥 生氣了！</span>';
      banner('吼！牠生氣了！', '#ff6a4a');
    }
    if (S.mon.hp <= 0) finish('win');
  }
  const angryMul = () => S.mon.angry ? BAL.angryTaken : 1;

  function submit() {
    if (S.over || S.me.down) return;
    const val = inp.value;
    if (!val.trim()) {
      if (weapon === 'crossbow' && S.mag > 0) return fire();
      return;
    }
    const T = nowS();
    if (T - S.qAt < BAL.minShow) { S.flags.fast++; inp.value = ''; paintProgress(); toast('太快了，這題不算！'); return; }
    const res = C.q.judge(S.units, val);
    advance(T); S.lastSubmitAt = T;   // 送出過一題（不管對不對）才算還在玩
    S.typed += res.total; S.correct += res.correct; S.answered++;
    /* 每題摘要（SPEC §2.5）：[字數, 按鍵數, 毫秒, 打對幾字]，最多 120 題；老師端用它重算「可疑」 */
    if (S.qLog.length < SUS.qMax) S.qLog.push([[...S.q.t].length, S.qKeys, Math.round((T - S.qAt) * 1000), res.correct]);
    if (res.wrong >= S.units.length * BAL.wrongRatio) {
      S.flags.wrong++; S.combo = 0;
      hurt(BAL.wrongHit, null, '亂打被反擊！');
      S.mon.lungeAt = T;
      nextQuestion(); updateUi(true); return;
    }
    if (res.correct > 0) { advance(T); S.lastCorrectAt = T; S.firstOk = true; }
    S.combo = res.perfect ? S.combo + 1 : 0;
    S.maxCombo = Math.max(S.maxCombo, S.combo);
    if (res.perfect) S.perfect++;
    const uw = [...S.q.t].length / Math.max(1, S.units.length);
    let mul = 1, note = '';
    const secs = Math.max(.6, T - S.qAt);
    if (weapon === 'staff') {
      if (S.q.sp === 'chant') {
        if (res.perfect) { mul = BAL.chantMul; note = '詠唱成功！×3'; addFx('bolt', { dur: .4, w: 4 }); banner('詠唱成功！', '#c9a6ff'); }
        else { note = '詠唱失敗…'; addFx('bolt', { dur: .25, w: 1 }); }
      } else addFx('bolt', { dur: .25, w: 2 });
    } else if (weapon === 'bow') {
      mul = .85 + .3 * res.accuracy;
      if (S.sharp > 0) { mul *= BAL.sharpMul; S.sharp--; note = '神射手！×2'; addFx('arrow', { dur: .3, gold: true }); }
      else {
        addFx('arrow', { dur: .3 });
        S.gauge += BAL.gaugePer * res.accuracy;
        if (S.gauge >= 100) { S.gauge = 0; S.sharp = BAL.sharpShots; banner('🎯 神射手！接下來 3 題傷害 ×2', '#ffd24a'); }
      }
    } else if (weapon === 'dagger') {
      mul = .95;
      if (S.q.sp === 'flurry' && res.correct > 0) {
        const f = clamp(BAL.flurryMin + (S.units.length / secs) * BAL.flurrySlope, BAL.flurryMin, BAL.flurryMax);
        mul *= f; note = `連環斬 ×${f.toFixed(1)}`; addFx('slash', { dur: .45, n: 3 });
      } else addFx('slash', { dur: .25, n: 1 });
    } else if (weapon === 'crossbow') {
      mul = BAL.arrowMul; S.mag = Math.min(BAL.magMax, S.mag + Math.round(res.correct * uw)); addFx('arrow', { dur: .25 });
    }
    const comboMul = 1 + Math.min(20, S.combo) * .02;
    const dmg = Math.round(BAL.perChar * res.correct * uw * mul * comboMul * angryMul() * (FD ? FD.typeMul : 1));
    S.me.atkAt = T;
    hitMonster(dmg, note || (S.combo >= 3 ? `${S.combo} 連擊` : ''));
    /* 藤蔓：全對才種（打錯一個字就不算），整場都在，最多 FD.n 根 */
    if (flow === 'vine' && res.perfect && !S.over && S.vineN < FD.n) { S.vineN++; S.vines = S.vineN; floatText(`🌿 藤蔓 ${S.vineN} 根`, 80, 34, '#8ec96b', true); }
    nextQuestion(); updateUi(true);
  }
  function fire() {
    if (S.volley || S.mag <= 0) return;
    const n = S.mag; S.mag = 0;
    const total = Math.round(n * BAL.arrowDmg * (1 + BAL.arrowBonusPer * n) * angryMul());
    const each = Math.floor(total / n);
    S.volley = { n, i: 0, next: nowS(), each, rest: total - each * n };
    banner(`🔫 連射 ×${n}！`, '#dfe6ec');
    updateUi(true);
  }
  function runVolley(T) {
    const v = S.volley;
    if (v) {
      while (v.i < v.n && T >= v.next) {
        v.i++;
        addFx('mg', { dur: .13, jy: (Math.random() - .5) * 10 });
        addFx('muzzle', { dur: .07 });
        S.me.atkAt = T;
        S.hits.push({ at: T + .12, dmg: v.each + (v.i === v.n ? v.rest : 0), last: v.i === v.n, n: v.n });
        v.next += .055;
      }
      if (v.i >= v.n) S.volley = null;
    }
    while (S.hits.length && S.hits[0].at <= T) {
      const h = S.hits.shift();
      addFx('spark', { dur: .12, x: 68 + Math.random() * 26, y: 12 + Math.random() * 28 });
      hitMonster(h.dmg, h.last ? `${h.n} 連射！` : '', '#e8f2ff', true);
    }
  }
  function skip() {
    if (S.over || S.me.down) return;
    S.combo = 0; nextQuestion(); updateUi(true);
  }

  function toast(m) { C.toast(m, 1400); }

  function hurt(dmg, status, label) {
    if (S.me.down) return;
    S.me.hp -= dmg; S.me.hitAt = nowS();
    floatText(`-${dmg}`, 80 + S.me.x, 62, '#ff6a6a', true);
    if (label) floatText(label, 80, 50, '#fff');
    if (status) applyStatus(status);
    if (S.me.hp <= 0) goDown();
  }
  function applyStatus(k) {
    const T = nowS();
    if (k === 'burn') S.st.burn = T + 5;
    if (k === 'poison') { S.st.poison = S.st.poison.filter(u => u > T); if (S.st.poison.length < 3) S.st.poison.push(T + 15); }
    if (k === 'ice') S.st.ice = T + 8;
    banner(STATUS[k], '#fff', true);
  }
  function goDown() {
    const T = nowS();
    advance(T); S.downAt = T;
    S.me.down = true; S.me.downs++; S.combo = 0; S.cast = null;
    S.st = { burn: 0, poison: [], ice: 0, lastTick: T };
    if (S.me.downs >= BAL.downMax) { finish('fail'); return; }
    S.me.downUntil = T + BAL.downRest;
    inp.disabled = true;
    banner('倒下了…', '#e5705f');
  }

  function pickPattern() {
    const star = cfg.star, allowed = ['single', 'pair', ...(star >= 3 ? ['sweep'] : []), ...(star >= 5 ? ['fake'] : [])];
    const pool = enabled.filter(k => allowed.includes(k));
    return rnd(pool.length ? pool : enabled.filter(k => k !== 'slam'));
  }
  function buildStrikes(atk, H) {
    const W = nwLaneW(tier, V2), B = GS.warn, rl = () => Math.floor(Math.random() * 3);
    const forced = location.hostname === 'localhost' && window.__NW_PATTERN__;
    const kind = forced || (atk.type === 'defend' ? 'slam' : pickPattern());
    let strikes = [];
    if (kind === 'slam') strikes = [0, 1, 2].map(l => ({ lane: l, warn: H - W * 1.1 - B, hit: H, slam: true, mul: 1 }));
    else if (kind === 'single') strikes = [{ lane: rl(), warn: H - W - B, hit: H, mul: 1 }];
    else if (kind === 'pair') { const safe = rl(); strikes = [0, 1, 2].filter(l => l !== safe).map(l => ({ lane: l, warn: H - W - B, hit: H, mul: 1 })); }
    else if (kind === 'sweep') { const o = Math.random() < .5 ? [0, 1, 2] : [2, 1, 0]; strikes = o.map((l, i) => ({ lane: l, warn: H + i * .7 - W * .8 - B, hit: H + i * .7, mul: .5 })); }
    else { const a = rl(), b = (a + 1 + Math.floor(Math.random() * 2)) % 3; strikes = [{ lane: a, warn: H - W - B, hit: H, cancel: H - W * .5, mul: 1 }, { lane: b, warn: H - W * .5 - B, hit: H + .4, mul: 1 }]; }
    return { kind, strikes, base: monDmg(lv, atk.mul * attackMul(cfg.mk, V2)), hurt: false };
  }
  function castStart(T) {
    const usable = mon0.attacks.filter(a => a.type === 'defend' ? enabled.includes('slam') : enabled.some(k => k !== 'slam'));
    if (!usable.length) { S.nextCast = T + 8; return; }
    const atk = rnd(usable);
    const quick = mon0.spKey === 'quick';
    const dur = castTime(lv, tierE) * (quick ? .75 : 1);
    S.cast = { atk, start: T, dur, hitAt: T + dur };
    Object.assign(S.cast, buildStrikes(atk, T + dur)); S.cast.hitAt = Math.max(...S.cast.strikes.map(x => x.hit));
    S.cast.w0 = Math.min(...S.cast.strikes.map(x => x.warn));
    const rage = mon0.spKey === 'rage' && S.mon.angry;
    S.nextCast = T + atkInterval(lv, tierE, rage) * (quick ? BAL.quickMul : 1);
    const box = $q('nwb-cast');
    box.style.display = 'block'; box.className = 'nwb2-cast ' + atk.type;
    $q('nwb-cast-t').textContent = `⚠ ${mon0.name}要用「${atk.name}」！`;
    $q('nwb-cast-h').textContent = S.cast.kind === 'slam' ? '👉 整排都會危險，按 Alt 舉盾' : '👉 紅色的線出現後，站到沒有紅色的線（左右 Ctrl 換線）';
    if (mon0.spKey === 'bubble') { S.bubUntil = T + 5; showBubbles(); host.classList.add('nwb2-nozy'); }
    if (mon0.spKey === 'spore') { S.sporeUntil = T + 5; host.classList.add('nwb2-spore'); }
  }
  function showBubbles() {
    const b = $q('nwb-bub'); b.innerHTML = '';
    for (let i = 0; i < 7; i++) { const e = document.createElement('i'); e.style.left = (6 + i * 13) + '%'; e.style.top = (Math.random() * 50) + '%'; b.appendChild(e); }
    b.style.display = 'block';
  }
  function resolveStrike(st, T) {
    const c = S.cast;
    S.mon.lungeAt = T; S.laneFlash.push({ lane: st.lane, t0: T });
    if (S.me.down) return;
    const shielded = S.shieldUntil > T;
    let dmg = strikeDamage(c.base, st.mul, st.slam, GS.cut);   // 盔甲只減魔物招式，亂打反擊、燃燒、中毒不減
    /* 重壓三條線同時閃光，但沒擋住只扣一次（slamHit 記第一條已經扣過） */
    if (st.slam) { if (shielded) c.blocked = true; if (shielded || c.slamHit) return; c.slamHit = true; }
    else if (S.lane !== st.lane) return;
    else if (shielded) { c.blocked = true; dmg = Math.ceil(dmg / 2); banner('盾只擋了一部分…', '#ffd24a', true); }
    c.hurt = true;
    hurt(dmg, c.atk.status);
  }
  function laneResolve(T) {
    const c = S.cast;
    for (const st of c.strikes) {
      if (st.done) continue;
      /* 「真的躲開」（只做統計 dodgeReal，不觸發反擊）＝預警一出現你就站在這條線上、出手前換走了（站著不動剛好沒被打到不算，SPEC-BALANCE-V2 §3.1） */
      if (st.thr === undefined && T >= st.warn) st.thr = !st.slam && S.lane === st.lane;
      if (st.cancel && T >= st.cancel) { st.done = true; if (st.thr && S.lane !== st.lane) c.real = true; continue; }
      if (T >= st.hit) { st.done = true; if (st.thr && S.lane !== st.lane) c.real = true; resolveStrike(st, T); }
    }
    if (!c.strikes.every(x => x.done)) return;
    S.cast = null; $q('nwb-cast').style.display = 'none';
    if (S.me.down) return;
    S.react.push(c.firstKey ? Math.round((c.firstKey - c.w0) * 1000) : -1);   // -1＝這招沒按過任何換線／舉盾鍵
    if (c.kind === 'slam') { S.defAll++; if (!c.hurt) S.defOk++; } else { S.dodgeAll++; if (!c.hurt) { S.dodgeOk++; if (c.real) S.dodgeReal++; } }
    if (!c.hurt) { banner(c.kind === 'slam' ? '🛡 擋下來了！' : '✨ 躲開了！', '#8ec96b'); floatText('成功！', 80, 56, '#8ec96b', true); }
    /* 守護成功＝擋下重壓、或線上攻擊時舉著盾（擋一半）；換線躲開（c.real）不反擊——閃避之後會是獨立的一套，不併進守護流（老師 2026-11-27 決定，§3.1）。
       沒在打字（§3.4）就不反擊：只按 Alt 不打字，反擊永遠是 0 */
    if (flow === 'guard' && c.blocked) {
      if (flowActive(T)) { S.guards++; hitMonster(Math.max(1, Math.round(S.mon.max * FD.rho * gearMul(GS, cfg.mk))), '', '#9fd8ff', false, true); counterFx(T); }
      else if (!S.afkHinted) { S.afkHinted = true; toast('守護成功！不過要一直打字才會反擊喔'); }
    }
  }
  function laneStance(T, stEl, nm, ht, fl, mkr) {
    mkr.style.display = 'none';
    const c = S.cast, shieldLeft = Math.max(0, S.shieldUntil - T);
    const live = c ? c.strikes.filter(x => !x.done && !(x.cancel && T >= x.cancel) && T >= x.warn) : [];
    if (c && live.length) {
      const slam = live.some(x => x.slam), here = live.some(x => x.lane === S.lane);
      stEl.dataset.state = slam ? 'defend' : here ? 'danger' : 'go';
      nm.textContent = slam ? '🛡 整排都危險！按 Alt 舉盾' : here ? '⚠ 你這一線危險！用 Ctrl 換線' : '✅ 你這一線安全';
      ht.textContent = `出手倒數 ${Math.max(0, c.hitAt - T).toFixed(1)} 秒`;
    } else if (c) {
      stEl.dataset.state = 'wait'; nm.textContent = '⏳ 魔物在蓄力…先專心打字';
      ht.textContent = `出手倒數 ${Math.max(0, c.hitAt - T).toFixed(1)} 秒`;
    } else { stEl.dataset.state = 'idle'; nm.textContent = enabled.length ? '左 Ctrl／右 Ctrl 換線　Alt 舉盾' : '這隻魔物還不會攻擊，專心打字！'; ht.textContent = ''; }
    if (shieldLeft > 0) ht.textContent += `　🛡 盾 ${shieldLeft.toFixed(1)} 秒`;
    fl.style.width = c ? (clamp((T - c.start) / c.dur, 0, 1) * 100) + '%' : '0';
    root.dataset.lane = S.lane; root.dataset.shield = shieldLeft > 0 ? '1' : '0';
    root.dataset.danger = live.map(x => x.lane).join(','); root.dataset.kind = c ? c.kind : '';
  }

  function updateUi(force) {
    const T = nowS();
    if (!force && T - S.lastUi < .08) return;
    S.lastUi = T;
    /* V2 寫「已經打了」往上數、標準時間照著比，不倒數、不變紅（研究：兒童時間壓力；舊的 5:00 倒數維持原樣） */
    const mmss = x => `${Math.floor(x / 60)}:${String(Math.floor(x % 60)).padStart(2, '0')}`;
    if (V2) {
      $q('nwb-tl').textContent = '已經打了'; $q('nwb-time').textContent = mmss(Math.min(CAP, T - S.T0));
      if (STD) { const sd = $q('nwb-std'); sd.style.display = 'block'; sd.textContent = `⚡ 標準 ${mmss(STD)}`; }
      if (!S.tired && T - S.T0 >= NW_V2.warnAt && !S.over) { S.tired = true; banner('魔物累了，再 1 分鐘就會逃走', '#ffd98a', true); }
    } else {
      const left = Math.max(0, CAP - (T - S.T0));
      $q('nwb-time').textContent = mmss(left);
    }
    $q('nwb-mhp').style.width = (S.mon.hp / S.mon.max * 100) + '%';
    $q('nwb-hp').style.width = (Math.max(0, S.me.hp) / S.me.max * 100) + '%';
    $q('nwb-hpt').textContent = `${Math.max(0, Math.round(S.me.hp))}/${S.me.max}`;
    $q('nwb-combo').textContent = S.combo;
    if (FD) {
      const on = flowActive(T), fe = $q('nwb-flow'), wilt = flow === 'vine' && S.vineN > 0 && !on;
      fe.style.display = 'block'; fe.style.color = wilt || !on ? '#e5a95f' : '#8ec96b';
      fe.textContent = flow === 'guard' ? `🛡 守護流　反擊 ×${S.guards}${on ? '' : '　（要一直打字才會反擊）'}`
        : S.vineN ? (wilt ? '🥀 藤蔓枯了　（打對字就恢復）' : `🌿 藤蔓 ${S.vineN} 根　每題全對種一根`) : '🌿 藤蔓流　每題全部打對就種一根藤蔓';
      root.dataset.flow = flow; root.dataset.guards = S.guards; root.dataset.vines = S.vineN; root.dataset.wilt = wilt ? '1' : '0';
    }
    const stIcons = [];
    if (S.st.burn > T) stIcons.push('🔥'); if (S.st.poison.some(u => u > T)) stIcons.push('☠'.repeat(S.st.poison.filter(u => u > T).length)); if (S.st.ice > T) stIcons.push('❄');
    $q('nwb-st').textContent = stIcons.join(' ');
    let wg = 0, wl = '';
    if (weapon === 'staff') { const k = S.qCount % CE; wg = k / CE * 100; wl = `詠唱還要 ${CE - k} 題`; }
    else if (weapon === 'bow') { wg = S.sharp > 0 ? 100 : S.gauge; wl = S.sharp > 0 ? `神射手！還有 ${S.sharp} 題` : '力量條'; }
    else if (weapon === 'dagger') { const k = S.qCount % CE; wg = k / CE * 100; wl = `連環斬還要 ${CE - k} 題`; }
    else { wg = S.mag / BAL.magMax * 100; wl = `彈匣 ${S.mag}/${BAL.magMax}　空白時按 Enter 射出`; }
    $q('nwb-wg').style.width = wg + '%'; $q('nwb-wlabel').textContent = wl;
    const stEl = $q('nwb-stance'), nm = $q('nwb-st-name'), ht = $q('nwb-st-hint'), fl = $q('nwb-st-i'), mkr = $q('nwb-st-mark');
    laneStance(T, stEl, nm, ht, fl, mkr);
    if (S.cast) $q('nwb-cast-i').style.width = (clamp((T - S.cast.start) / S.cast.dur, 0, 1) * 100) + '%';
    if (S.me.down) {
      const d = $q('nwb-down'); d.style.display = 'grid';
      d.innerHTML = `<div>倒下了…<div style="font-size:.7em;color:var(--dim)">${Math.ceil(S.me.downUntil - T)} 秒後起來（${S.me.downs}/${BAL.downMax}）</div></div>`;
    } else $q('nwb-down').style.display = 'none';
  }

  function drawLanes(T) {
    g.save(); g.translate(OX, EXTRA);
    g.fillStyle = 'rgba(0,0,0,.2)'; [1, 54, 107, 159].forEach(x => g.fillRect(x, 52, 1, 44));
    if (S.cast) S.cast.strikes.forEach(st => {
      if (st.done || T < st.warn || (st.cancel && T >= st.cancel)) return;
      const k = clamp((T - st.warn) / (st.hit - st.warn), 0, 1);
      const a = .38 + .5 * k * (Math.sin(T * 22) > 0 ? 1 : .6);
      g.fillStyle = st.slam ? `rgba(80,140,255,${a})` : `rgba(255,50,50,${a})`;
      g.fillRect(LANE_C[st.lane] - 25, 52, 50, 44);
    });
    S.laneFlash = S.laneFlash.filter(f => T - f.t0 < .25);
    S.laneFlash.forEach(f => { g.fillStyle = `rgba(255,255,255,${(1 - (T - f.t0) / .25) * .8})`; g.fillRect(LANE_C[f.lane] - 25, 52, 50, 44); });
    g.restore();
  }
  function draw(T) {
    g.fillStyle = SKY; g.fillRect(0, 0, LW, 96 + EXTRA);
    g.drawImage(art.bg, 0, EXTRA);
    drawLanes(T);
    g.save(); g.translate(OX, EXTRA);
    g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(80, 61, 32, 4, 0, 0, 7); g.fill();
    const lunge = T - S.mon.lungeAt < .35 ? Math.sin((T - S.mon.lungeAt) / .35 * Math.PI) * 9 : 0;
    const jit = T < (S.mon.shakeUntil || 0) ? Math.round(Math.sin(T * 90) * 3 * ((S.mon.shakeUntil - T) / .28)) : 0;
    const mx = 40 + (S.mon.angry ? Math.round(Math.sin(T * 30)) : 0) + jit, my = -2 + Math.round(Math.sin(T * 2) * 1) + Math.round(lunge);
    g.drawImage(S.mon.angry ? art.monA : art.mon, mx, my);
    if (T < S.mon.flashUntil) g.drawImage(art.monW, mx, my);

    const hy = 88;
    S.hx += (LANE_C[S.lane] - 2 - S.hx) * .35;
    const hx = S.hx, offs = 0, shielding = S.shieldUntil > T;
    S.me.x = 0;
    g.fillStyle = 'rgba(0,0,0,.4)'; g.beginPath(); g.ellipse(hx + offs, hy, 8, 2, 0, 0, 7); g.fill();
    const blink = T - S.me.hitAt < .4 && Math.floor(T * 20) % 2 === 0;
    const atk = T - S.me.atkAt < .18 ? -2 : 0;
    if (S.me.down) {
      g.save(); g.globalAlpha = .6; g.filter = 'grayscale(1)';
      g.translate(hx + offs, hy - 6); g.rotate(Math.PI / 2); g.drawImage(art.hero, -13, -15);
      g.restore();
    } else if (!blink) {
      g.drawImage(art.hero, Math.round(hx - 11 + offs), hy - 30 + atk + (Math.sin(T * 4) > 0 ? 0 : 1));
      g.fillStyle = '#ffd24a'; g.fillRect(Math.round(hx - 8), hy + 4, 20, 2);
      if (shielding) {
        g.fillStyle = '#3a6ea5'; g.fillRect(hx - 24, hy - 26, 12, 15); g.fillStyle = '#e8b64c'; g.fillRect(hx - 24, hy - 26, 12, 2);
        g.fillStyle = '#f0f4f8'; g.fillRect(hx - 19, hy - 23, 2, 9); g.fillRect(hx - 22, hy - 19, 8, 2);
        g.strokeStyle = 'rgba(159,216,255,.8)'; g.lineWidth = 1; g.beginPath(); g.arc(hx, hy - 16, 18 + Math.sin(T * 12), 0, 7); g.stroke();
      }
    }
    if (wmod && wmod.dark) drawDark(T, hx, hy);
    S.fx = S.fx.filter(f => T - f.t0 < f.dur);
    S.fx.forEach(f => {
      const p = (T - f.t0) / f.dur, sx = hx + 20 + S.me.x, sy = hy - 24;
      g.lineWidth = 1;
      if (f.kind === 'bolt') { g.strokeStyle = '#c9a6ff'; g.lineWidth = f.w; g.beginPath(); g.moveTo(sx, sy); g.lineTo(sx + (80 - sx) * p, sy + (34 - sy) * p); g.stroke(); g.strokeStyle = '#fff'; g.lineWidth = 1; g.stroke(); }
      if (f.kind === 'arrow') { const ax = sx + (84 - sx) * p, ay = sy + (36 - sy) * p; g.strokeStyle = f.gold ? '#ffd24a' : '#dfe6ec'; g.lineWidth = f.gold ? 2 : 1; g.beginPath(); g.moveTo(ax - 9, ay + 3 * p); g.lineTo(ax, ay); g.stroke(); }
      if (f.kind === 'slash') for (let i = 0; i < f.n; i++) { const tp = clamp(p * f.n - i, 0, 1); if (tp > 0 && tp < 1) { g.strokeStyle = '#fff'; g.lineWidth = 2; g.beginPath(); g.moveTo(66 + i * 8, 14 + i * 6); g.lineTo(96 - i * 8, 40 + i * 4); g.stroke(); } }
      if (f.kind === 'mg') {
        const tx = 80, ty = 30 + f.jy, ax = sx + (tx - sx) * p, ay = sy + (ty - sy) * p;
        g.strokeStyle = '#ffe9a0'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(ax - 10 * (1 - p * .3), ay + (sy - ty) * .02); g.lineTo(ax, ay); g.stroke();
        g.fillStyle = '#fff'; g.fillRect(Math.round(ax) - 1, Math.round(ay) - 1, 2, 2);
      }
      if (f.kind === 'muzzle') { g.fillStyle = '#fff6c0'; g.fillRect(sx - 1, sy - 2, 5, 4); g.fillStyle = '#ffb030'; g.fillRect(sx + 3, sy - 3, 3, 6); g.fillRect(sx + 1, sy - 4, 2, 2); g.fillRect(sx + 1, sy + 2, 2, 2); }
      if (f.kind === 'cslash') {
        const q = Math.min(1, .55 + p * 2.4);   // 停格那一幀 p≈0 就要看得到斬擊，所以不從 0 開始
        [[62, 8, 98, 52], [98, 8, 62, 52]].forEach(([x0, y0, x1, y1], i) => {
          const e = clamp(q * 2 - i * .5, 0, 1), ex = x0 + (x1 - x0) * e, ey = y0 + (y1 - y0) * e;
          g.strokeStyle = `rgba(27,23,56,${1 - p * .5})`; g.lineWidth = 8; g.beginPath(); g.moveTo(x0, y0); g.lineTo(ex, ey); g.stroke();   // 深色外框：魔物閃白時斬擊才看得到
          g.strokeStyle = `rgba(80,170,255,${1 - p * .6})`; g.lineWidth = 5; g.beginPath(); g.moveTo(x0, y0); g.lineTo(ex, ey); g.stroke();
          g.strokeStyle = `rgba(255,255,255,${1 - p * .5})`; g.lineWidth = 2; g.stroke();
        });
        const r = 6 + p * 22;
        g.fillStyle = `rgba(255,246,192,${1 - p})`;
        for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4 + .4; g.fillRect(Math.round(80 + Math.cos(a) * r) - 1, Math.round(30 + Math.sin(a) * r) - 1, 3, 3); }
      }
      if (f.kind === 'cflash') { g.fillStyle = `rgba(255,255,255,${(1 - p) * .4})`; g.fillRect(-OX, -EXTRA, LW, 96 + EXTRA); }
      if (f.kind === 'spark') { g.fillStyle = '#fff'; g.fillRect(f.x, f.y - 2, 1, 5); g.fillRect(f.x - 2, f.y, 5, 1); g.fillStyle = '#ffd24a'; g.fillRect(f.x - 1, f.y - 1, 3, 3); }
    });
    g.restore();
  }

  let raf = 0;
  function tick() {
    if (S.over) return;
    const T = nowS();
    if (S.me.down && T >= S.me.downUntil) {
      S.me.down = false; S.me.hp = S.me.max; inp.disabled = false; inp.focus();
      /* 倒下休息（打不了字）的秒數算「有在打字」，不能因為被打倒就被當成掛機；倒下前期限還沒過的話，期限也往後延同樣的秒數 */
      const rest = T - S.downAt; S.live += rest; S.accT = T; S.vineT = T;   // 倒下休息不種也不扣藤蔓
      if (S.downAt <= S.lastCorrectAt + NW_V2.afkWin) S.lastCorrectAt = Math.min(T, S.lastCorrectAt + rest);
      if (S.downAt <= S.lastSubmitAt + NW_V2.submitWin) S.lastSubmitAt = Math.min(T, S.lastSubmitAt + rest);
      banner('站起來了！', '#8ec96b', true);
    }
    runVolley(T);
    if (!S.me.down) vineAdvance(T); else S.vineT = T;
    if (enabled.length && !S.cast && T >= S.nextCast && !S.me.down) castStart(T);
    if (S.cast) laneResolve(T);
    if (S.bubUntil && T > S.bubUntil) { S.bubUntil = 0; $q('nwb-bub').style.display = 'none'; host.classList.remove('nwb2-nozy'); }
    if (S.sporeUntil && T > S.sporeUntil) { S.sporeUntil = 0; host.classList.remove('nwb2-spore'); }
    if (T - S.st.lastTick >= 1) {
      S.st.lastTick = T;
      let d = 0;
      if (S.st.burn > T) d += 3;
      d += S.st.poison.filter(u => u > T).length;
      if (d && !S.me.down) { S.me.hp -= d; floatText(`-${d}`, 80 + S.me.x, 64, '#c08aff'); if (S.me.hp <= 0) goDown(); }
    }
    if (T - S.T0 >= CAP) { finish(V2 ? 'escape' : 'retreat'); return; }
    /* 停格：反擊那一幀畫出來之後，畫面凍結約 0.1 秒（hit-stop），計時與輸入照常 */
    if (!(T < (S.hsUntil || 0) && S.hsDrawn)) { draw(T); if (T < (S.hsUntil || 0)) S.hsDrawn = true; }
    updateUi(false);
    raf = requestAnimationFrame(tick);
  }

  /* 逐字判斷「有在打字」：輸入框開頭跟題目對得上、而且比這題上次多對了至少 1 個字 */
  function onInput() {
    paintProgress();
    if (S.over || S.me.down) return;
    const typed = [...(S.composing ? S.committed : inp.value)];
    let n = 0;
    while (n < typed.length && n < S.units.length && C.q.canon(typed[n]) === C.q.canon(S.units[n].want)) n++;
    if (n > S.qOk) { S.qOk = n; const T = nowS(); advance(T); S.lastCorrectAt = T; S.firstOk = true; }
    else if (n < S.qOk && typed.length < S.qOk) S.qOk = n;   // 刪掉重打：回到現在對的長度，之後再多對才算
  }
  /* 按鍵數：一般字鍵、Backspace，加上注音輸入法組字時瀏覽器送的 Process／Unidentified／keyCode 229；不算 Enter、Esc、Ctrl、Alt、Shift */
  const countKey = e => !e.ctrlKey && !e.altKey && !e.metaKey && (e.key.length === 1 || e.key === 'Backspace' || e.key === 'Process' || e.key === 'Unidentified' || e.keyCode === 229);
  const onKey = e => {
    if (countKey(e)) { S.keys++; S.qKeys++; }
    if (e.key === 'Enter' && !e.isComposing && e.keyCode !== 229) { e.preventDefault(); submit(); }
    else if (e.key === 'Escape') { e.preventDefault(); skip(); }
  };
  const laneKey = e => {
    if (S.over) return;
    const alt = e.code === 'AltLeft' || e.code === 'AltRight';
    /* 預警出現後第一次按 Ctrl／Alt 花了多久（只記，校準護腳與預警秒數用） */
    if ((alt || e.code === 'ControlLeft' || e.code === 'ControlRight') && S.cast && !S.cast.firstKey && nowS() >= S.cast.w0) S.cast.firstKey = nowS();
    if (alt) { e.preventDefault(); if (!S.me.down) S.shieldUntil = Math.max(S.shieldUntil, nowS() + 1.5 + GS.shield + (flow === 'guard' ? FD.shield : 0)); return; }
    if (S.me.down || e.repeat) return;
    if (e.code === 'ControlLeft') S.lane = Math.max(0, S.lane - 1);
    else if (e.code === 'ControlRight') S.lane = Math.min(2, S.lane + 1);
  };
  const laneKeyUp = e => { if (e.code === 'AltLeft' || e.code === 'AltRight') e.preventDefault(); };
  addEventListener('keydown', laneKey); addEventListener('keyup', laneKeyUp);
  const blockPaste = e => { e.preventDefault(); S.flags.paste++; toast('這裡不能貼上喔，要自己打！'); };
  inp.addEventListener('input', onInput);
  inp.addEventListener('keydown', onKey);
  inp.addEventListener('compositionstart', () => { S.composing = true; S.committed = inp.value; });
  inp.addEventListener('compositionend', () => { S.composing = false; onInput(); });
  inp.addEventListener('paste', blockPaste);
  inp.addEventListener('drop', blockPaste);
  root.addEventListener('click', e => { if (!S.me.down && e.target.id !== 'nwb-quit') inp.focus(); });
  $q('nwb-quit').addEventListener('click', () => { if (confirm(V2 ? '要撤退嗎？打掉多少血、認真打了多久，就照比例拿獎勵。' : '要撤退嗎？現在撤退只能拿到一半的獎勵。')) finish('retreat'); });

  function finish(result) {
    if (S.over) return;
    S.over = true; S.volley = null; S.hits = []; cancelAnimationFrame(raf);
    removeEventListener('keydown', laneKey); removeEventListener('keyup', laneKeyUp);
    const tEnd = nowS(), secs = Math.min(CAP, tEnd - S.T0);
    inp.disabled = true;
    const win = result === 'win';
    banner(win ? '🎉 討伐成功！' : result === 'fail' ? '狩獵失敗…' : result === 'escape' ? '魔物累得逃走了…' : '撤退', win ? '#ffd24a' : '#e5705f');
    updateUi(true); draw(nowS());
    const acc = S.typed ? S.correct / S.typed : 0;
        if (S.me.down) S.live += Math.max(0, tEnd - S.downAt); else advance(tEnd);
    const live = Math.min(secs, Math.round(S.live * 10) / 10);
    const frac = win ? 1 : clamp(1 - S.mon.hp / S.mon.max, 0, 1), fEff = clamp((S.dmgType + NW_V2.escFlow * S.dmgFlow) / S.mon.max, 0, 1);
    const act = S.qLog.reduce((a, x) => a + x[2], 0) / 1000;   // 各題作答時間加總（秒）；cpm＝打對的字 ÷ act × 60
    const res = {
      rk: cfg.rk, mk: cfg.mk, star: cfg.star, result, secs, accuracy: acc, answered: S.answered,
      dodgeOk: S.dodgeOk, dodgeAll: S.dodgeAll, defOk: S.defOk, defAll: S.defAll,
      maxCombo: S.maxCombo, flags: S.flags, tier, weapon, wk: wkey, atk: GS.atk, pw: GS.pw,
      valid: win || S.answered >= 3,
      /* 這場正確率夠不夠算進「精準」（>= 90%）。以前寫死 true，等於沒擋（SPEC F2） */
      lvAcc: acc >= RANK_MIN_ACC,
      lv, qb: qBand(cfg.star, lv), ans: S.answered, cor: S.correct, typ: S.typed, keys: S.keys, nokey: S.keys === 0 && S.answered > 0 ? 1 : 0,
      act: Math.round(act * 10) / 10, cpm: act > 0 ? Math.round(S.correct / act * 600) / 10 : 0, q: S.qLog,
      /* 以下給 V2 的獎勵比例與 mg_nw_runs 遙測用（沒開 V2 時只是多帶著，不影響結算）。
         live＝有在打字的秒數（最後一次打對後再算 afkWin 秒）；frac＝打掉的血比例；fEff＝折過的 f（流派只算一半，贏＝1） */
      live, idle: Math.max(0, Math.round((secs - live) * 10) / 10), frac: Math.round(frac * 1000) / 1000, fEff: win ? 1 : Math.round(fEff * 1000) / 1000,
      flow, dmgType: S.dmgType, dmgFlow: S.dmgFlow, guards: S.guards, vines: S.vines, dodgeReal: S.dodgeReal, react: S.react.slice(0, 40)
    };
    if (!res.valid) res.invalidWhy = '還沒打幾題就結束了，這場不算數。';
    setTimeout(() => { root.remove(); done(res); }, 1500);
  }

  if (location.hostname === 'localhost') window.__NWB = { S, flowActive };   // 測試用：直接看／改戰鬥狀態
  nextQuestion();
  updateUi(true);
  raf = requestAnimationFrame(tick);
  inp.focus();
}
