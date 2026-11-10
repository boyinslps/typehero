import { BAL, TIERS, MONSTERS, MAX_CHARS, CHANT_MAX, SHORT_CHANTS, regionLv, monMaxHp, monDmg, atkInterval, castTime, STATUS } from './nw-data.js';

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

const ACTIONS = [['閃', 'dodge'], ['防', 'defend'], ['jump', 'dodge'], ['stop', 'defend']];
const TIER_KEYS = ['normal', 'fine', 'epic', 'legend'];
const LEAD = { A: 2.0, B: 1.2, C: .9, D: .7 };
const LANE_C = [27, 80, 133];
const LANE_W = { A: 3.0, B: 2.5, C: 2.2, D: 2.0 };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rnd = arr => arr[Math.floor(Math.random() * arr.length)];

export function startBattle(env, cfg, done) {
  const { C, PX } = env;
  const NW = env.NW();
  const mon0 = MONSTERS[cfg.mk];
  const lv = regionLv(cfg.rk, cfg.star);
  const tier = env.tier();
  const weapon = NW.starter || 'staff';
  const mode = 'hanzi';
  const laneMode = !(C.battleMode && C.battleMode() === 'type');
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
        <div class="px-panel nwb3-time"><div class="nwb3-lbl">時間</div><div id="nwb-time" class="mono px-text" style="color:#ffd98a">5:00</div></div>
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
    zr: PX.zone('dodge', LW), zb: PX.zone('defend', LW),
    mon: PX.canvas('monster', cfg.mk, 2, false), monA: PX.canvas('monster', cfg.mk, 2, true),
    hero: PX.hero(env.myHero(weapon), 1)
  };
  art.monW = whiteOf(art.mon);

  const T0 = nowS();
  const S = {
    over: false, T0, mon: { hp: monMaxHp(cfg.mk, lv, tier), max: monMaxHp(cfg.mk, lv), angry: false, flashUntil: 0, lungeAt: -9 },
    me: { hp: BAL.playerHp, max: BAL.playerHp, down: false, downUntil: 0, downs: 0, hitAt: -9, x: 0, atkAt: -9 },
    st: { burn: 0, poison: [], ice: 0, lastTick: T0 },
    cast: null, nextCast: T0 + 6, action: null, lane: 1, hx: LANE_C[1] - 2, shieldUntil: 0, laneFlash: [],
    q: null, units: [], qAt: 0, qCount: 0, lastT: '', composing: false, committed: '',
    combo: 0, maxCombo: 0, typed: 0, correct: 0, answered: 0, perfect: 0,
    gauge: 0, sharp: 0, mag: 0,
    dodgeOk: 0, dodgeAll: 0, defOk: 0, defAll: 0,
    flags: { fast: 0, paste: 0, wrong: 0 }, fx: [], hits: [], volley: null, bubUntil: 0, sporeUntil: 0, lastUi: 0
  };
  host.dataset.mode = mode;

  $q('nwb-mname').textContent = `${mon0.name} Lv ${lv}`;
  $q('nwb-wlabel').textContent = weapon === 'staff' ? '下一次詠唱' : weapon === 'bow' ? '力量條' : weapon === 'dagger' ? '下一次連環斬' : '彈匣';
  $q('nwb-hint').innerHTML = laneMode
    ? '紅色的線出現：<b style="color:#ffd98a">左 Ctrl／右 Ctrl</b> 換線躲開、<b style="color:#ffd98a">Alt</b> 舉盾'
    : '紅／藍區域出現：打「<b style="color:#ffd98a">閃</b>」躲開、打「<b style="color:#ffd98a">防</b>」擋住';

  $q('nwb-side').innerHTML = '<b class="px-text">操作</b><br>Enter 送出<br>Esc 換題<br>' + (weapon === 'crossbow' ? '空白 Enter＝連射' : laneMode ? 'Ctrl 換線／Alt 舉盾' : '閃／防＝躲開／擋住');

  const tierIdx = () => Math.min(3, (lv < 10 ? 0 : lv < 20 ? 1 : 2) + (S.mon.angry ? 1 : 0));
  const maxChars = MAX_CHARS(cfg.star);
  const fits = p => p.filter(q => [...q.t].length <= maxChars);
  function wordPool() {
    for (let i = tierIdx(); i >= 0; i--) { const f = fits(C.q.pool('common_' + TIER_KEYS[i])); if (f.length) return f; }
    return C.q.pool('common_normal');
  }
  function pickWord() {
    const p = wordPool();
    let q, n = 0;
    do { q = rnd(p); n++; } while (p.length > 1 && q.t === S.lastT && n < 10);
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
    const every = S.qCount % BAL.chantEvery === 0;
    S.q = (weapon === 'staff' && every) ? pickChant() : (weapon === 'dagger' && every) ? pickFlurry() : pickWord();
    S.units = C.q.questionUnits(S.q, mode);
    renderUnits();
    S.qAt = nowS();
    inp.value = ''; S.committed = '';
    inp.style.fontSize = clamp(Math.floor(((inp.clientWidth || 600) - 40) / Math.max(1, S.units.length)), 16, 30) + 'px';
    if (S.q.sp === 'chant') banner('✨ 詠唱！全部打對傷害變 3 倍', '#c9a6ff', true);
    if (S.q.sp === 'flurry') banner('🗡 連環斬！越快越痛', '#ffd24a', true);
    if (!S.me.down && !S.action) inp.focus();
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

  function hitMonster(dmg, note, color, small) {
    if (dmg <= 0 || S.over) return;
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
    if (S.over || S.me.down || S.action) return;
    const val = inp.value;
    if (!val.trim()) {
      if (weapon === 'crossbow' && S.mag > 0) return fire();
      return;
    }
    const T = nowS();
    if (T - S.qAt < BAL.minShow) { S.flags.fast++; inp.value = ''; paintProgress(); toast('太快了，這題不算！'); return; }
    const res = C.q.judge(S.units, val);
    S.typed += res.total; S.correct += res.correct; S.answered++;
    if (res.wrong >= S.units.length * BAL.wrongRatio) {
      S.flags.wrong++; S.combo = 0;
      hurt(BAL.wrongHit, null, '亂打被反擊！');
      S.mon.lungeAt = T;
      nextQuestion(); updateUi(true); return;
    }
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
    const dmg = Math.round(BAL.perChar * res.correct * uw * mul * comboMul * angryMul());
    S.me.atkAt = T;
    hitMonster(dmg, note || (S.combo >= 3 ? `${S.combo} 連擊` : ''));
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
    if (S.over || S.me.down || S.action) return;
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
    S.me.down = true; S.me.downs++; S.combo = 0; S.action = null; S.cast = null;
    S.st = { burn: 0, poison: [], ice: 0, lastTick: T };
    if (S.me.downs >= BAL.downMax) { finish('fail'); return; }
    S.me.downUntil = T + BAL.downRest;
    inp.disabled = true;
    banner('倒下了…', '#e5705f');
  }

  function startAction(type) {
    if (S.over || S.me.down || S.action) return;
    const T = nowS(), W0 = type === 'dodge' ? TIERS[tier].dodge : TIERS[tier].defend;
    const W = W0 * (S.st.ice > T ? .7 : 1);
    S.action = { type, start: T, end: T + W, dur: W };
    if (type === 'dodge') S.dodgeAll++; else S.defAll++;
    inp.disabled = true;
    banner(type === 'dodge' ? '💨 閃避！' : '🛡 防禦！', type === 'dodge' ? '#9fd8ff' : '#ffd24a', true);
  }
  function endAction() {
    S.action = null;
    if (!S.me.down && !S.over) { inp.disabled = false; inp.focus(); }
  }

  function pickPattern() {
    const r = Math.random();
    if (cfg.star <= 2) return r < .6 ? 'single' : 'pair';
    if (cfg.star <= 4) return r < .35 ? 'single' : r < .65 ? 'pair' : 'sweep';
    return r < .25 ? 'single' : r < .5 ? 'pair' : r < .75 ? 'sweep' : 'fake';
  }
  function buildStrikes(atk, H) {
    const W = LANE_W[tier] || 2.5, rl = () => Math.floor(Math.random() * 3);
    const forced = location.hostname === 'localhost' && window.__NW_PATTERN__;
    const kind = forced || (atk.type === 'defend' ? 'slam' : pickPattern());
    let strikes = [];
    if (kind === 'slam') strikes = [0, 1, 2].map(l => ({ lane: l, warn: H - W * 1.1, hit: H, slam: true, mul: 1 }));
    else if (kind === 'single') strikes = [{ lane: rl(), warn: H - W, hit: H, mul: 1 }];
    else if (kind === 'pair') { const safe = rl(); strikes = [0, 1, 2].filter(l => l !== safe).map(l => ({ lane: l, warn: H - W, hit: H, mul: 1 })); }
    else if (kind === 'sweep') { const o = Math.random() < .5 ? [0, 1, 2] : [2, 1, 0]; strikes = o.map((l, i) => ({ lane: l, warn: H + i * .7 - W * .8, hit: H + i * .7, mul: .5 })); }
    else { const a = rl(), b = (a + 1 + Math.floor(Math.random() * 2)) % 3; strikes = [{ lane: a, warn: H - W, hit: H, cancel: H - W * .5, mul: 1 }, { lane: b, warn: H - W * .5, hit: H + .4, mul: 1 }]; }
    return { kind, strikes, base: monDmg(lv, atk.mul), hurt: false };
  }
  function castStart(T) {
    const atk = rnd(mon0.attacks);
    const quick = mon0.spKey === 'quick';
    const dur = castTime(lv, tier) * (quick ? .75 : 1);
    S.cast = { atk, start: T, dur, hitAt: T + dur };
    if (laneMode) { Object.assign(S.cast, buildStrikes(atk, T + dur)); S.cast.hitAt = Math.max(...S.cast.strikes.map(x => x.hit)); }
    const rage = mon0.spKey === 'rage' && S.mon.angry;
    S.nextCast = T + atkInterval(lv, tier, rage) * (quick ? BAL.quickMul : 1);
    const box = $q('nwb-cast');
    box.style.display = 'block'; box.className = 'nwb2-cast ' + atk.type;
    $q('nwb-cast-t').textContent = `${laneMode ? '⚠' : atk.type === 'dodge' ? '💨' : '🛡'} ${mon0.name}要用「${atk.name}」！`;
    const learn = NW.hunts < 3;
    if (laneMode) $q('nwb-cast-h').textContent = S.cast.kind === 'slam' ? '👉 整排都會危險，按 Alt 舉盾' : '👉 紅色的線出現後，站到沒有紅色的線（左右 Ctrl 換線）';
    else $q('nwb-cast-h').textContent = atk.type === 'dodge'
      ? (learn ? '👉 條快滿了，快打「閃」！' : '紅色：快滿的時候打「閃」')
      : (learn ? '👉 現在就打「防」，擋得住！' : '藍色：過一半就可以打「防」');
    if (mon0.spKey === 'bubble') { S.bubUntil = T + 5; showBubbles(); host.classList.add('nwb2-nozy'); }
    if (mon0.spKey === 'spore') { S.sporeUntil = T + 5; host.classList.add('nwb2-spore'); }
  }
  function showBubbles() {
    const b = $q('nwb-bub'); b.innerHTML = '';
    for (let i = 0; i < 7; i++) { const e = document.createElement('i'); e.style.left = (6 + i * 13) + '%'; e.style.top = (Math.random() * 50) + '%'; b.appendChild(e); }
    b.style.display = 'block';
  }
  function castResolve(T) {
    const c = S.cast; S.cast = null;
    $q('nwb-cast').style.display = 'none';
    S.mon.lungeAt = T;
    if (S.me.down) return;
    const a = S.action;
    let avoid = 'none';
    if (a && a.start <= c.hitAt && c.hitAt <= a.end) avoid = a.type === c.atk.type ? 'full' : 'half';
    let dmg = monDmg(lv, c.atk.mul);
    if (avoid === 'full') {
      dmg = 0;
      if (a.type === 'dodge') S.dodgeOk++; else S.defOk++;
      banner(a.type === 'dodge' ? '✨ 完美閃避！' : '🛡 擋下來了！', '#8ec96b');
      floatText('成功！', 80 + S.me.x, 56, '#8ec96b', true);
    } else if (avoid === 'half') {
      dmg = Math.ceil(dmg / 2); banner('只擋了一半…', '#ffd24a', true);
    } else banner(a ? '時機不對！' : '被打中了！', '#e5705f', true);
    if (dmg > 0) hurt(dmg, avoid === 'full' ? null : c.atk.status);
  }

  function resolveStrike(st, T) {
    const c = S.cast;
    S.mon.lungeAt = T; S.laneFlash.push({ lane: st.lane, t0: T });
    if (S.me.down) return;
    const shielded = S.shieldUntil > T;
    let dmg = Math.max(1, Math.round(c.base * st.mul));
    if (st.slam) { if (shielded) return; }
    else if (S.lane !== st.lane) return;
    else if (shielded) { dmg = Math.ceil(dmg / 2); banner('盾只擋了一部分…', '#ffd24a', true); }
    c.hurt = true;
    hurt(dmg, c.atk.status);
  }
  function laneResolve(T) {
    const c = S.cast;
    for (const st of c.strikes) {
      if (st.done) continue;
      if (st.cancel && T >= st.cancel) { st.done = true; continue; }
      if (T >= st.hit) { st.done = true; resolveStrike(st, T); }
    }
    if (!c.strikes.every(x => x.done)) return;
    S.cast = null; $q('nwb-cast').style.display = 'none';
    if (S.me.down) return;
    if (c.kind === 'slam') { S.defAll++; if (!c.hurt) S.defOk++; } else { S.dodgeAll++; if (!c.hurt) S.dodgeOk++; }
    if (!c.hurt) { banner(c.kind === 'slam' ? '🛡 擋下來了！' : '✨ 躲開了！', '#8ec96b'); floatText('成功！', 80, 56, '#8ec96b', true); }
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
    } else { stEl.dataset.state = 'idle'; nm.textContent = '左 Ctrl／右 Ctrl 換線　Alt 舉盾'; ht.textContent = ''; }
    if (shieldLeft > 0) ht.textContent += `　🛡 盾 ${shieldLeft.toFixed(1)} 秒`;
    fl.style.width = c ? (clamp((T - c.start) / c.dur, 0, 1) * 100) + '%' : '0';
    root.dataset.lane = S.lane; root.dataset.shield = shieldLeft > 0 ? '1' : '0';
    root.dataset.danger = live.map(x => x.lane).join(','); root.dataset.kind = c ? c.kind : '';
  }

  function updateUi(force) {
    const T = nowS();
    if (!force && T - S.lastUi < .08) return;
    S.lastUi = T;
    const left = Math.max(0, BAL.timeLimit - (T - S.T0));
    $q('nwb-time').textContent = `${Math.floor(left / 60)}:${String(Math.floor(left % 60)).padStart(2, '0')}`;
    $q('nwb-mhp').style.width = (S.mon.hp / S.mon.max * 100) + '%';
    $q('nwb-hp').style.width = (Math.max(0, S.me.hp) / S.me.max * 100) + '%';
    $q('nwb-hpt').textContent = `${Math.max(0, Math.round(S.me.hp))}/${S.me.max}`;
    $q('nwb-combo').textContent = S.combo;
    const stIcons = [];
    if (S.st.burn > T) stIcons.push('🔥'); if (S.st.poison.some(u => u > T)) stIcons.push('☠'.repeat(S.st.poison.filter(u => u > T).length)); if (S.st.ice > T) stIcons.push('❄');
    $q('nwb-st').textContent = stIcons.join(' ');
    let wg = 0, wl = '';
    if (weapon === 'staff') { const k = S.qCount % BAL.chantEvery; wg = k / BAL.chantEvery * 100; wl = `詠唱還要 ${BAL.chantEvery - k} 題`; }
    else if (weapon === 'bow') { wg = S.sharp > 0 ? 100 : S.gauge; wl = S.sharp > 0 ? `神射手！還有 ${S.sharp} 題` : '力量條'; }
    else if (weapon === 'dagger') { const k = S.qCount % BAL.chantEvery; wg = k / BAL.chantEvery * 100; wl = `連環斬還要 ${BAL.chantEvery - k} 題`; }
    else { wg = S.mag / BAL.magMax * 100; wl = `彈匣 ${S.mag}/${BAL.magMax}　空白時按 Enter 射出`; }
    $q('nwb-wg').style.width = wg + '%'; $q('nwb-wlabel').textContent = wl;
    const stEl = $q('nwb-stance'), nm = $q('nwb-st-name'), ht = $q('nwb-st-hint'), fl = $q('nwb-st-i'), mkr = $q('nwb-st-mark');
    const iceMul = S.st.ice > T ? .7 : 1, dW = TIERS[tier].dodge * iceMul, fW = TIERS[tier].defend * iceMul;
    if (laneMode) laneStance(T, stEl, nm, ht, fl, mkr);
    else if (S.action) {
      const a = S.action, k = clamp((T - a.start) / a.dur, 0, 1);
      stEl.dataset.state = a.type;
      stEl.style.setProperty('--sc', a.type === 'dodge' ? '#7ccfff' : '#ffd24a');
      nm.textContent = a.type === 'dodge' ? '💨 閃避姿態' : '🛡 防禦姿態';
      fl.style.width = (k * 100) + '%';
      if (S.cast) {
        const pos = (S.cast.hitAt - a.start) / a.dur;
        mkr.style.display = 'block'; mkr.style.left = (clamp(pos, 0, 1) * 100) + '%';
        ht.textContent = pos >= 0 && pos <= 1 ? `✓ 攻擊會落在姿態裡！（剩 ${Math.max(0, a.end - T).toFixed(1)} 秒）` : pos > 1 ? '✗ 姿態會先結束，攻擊還沒到' : '✗ 太早了';
      } else { mkr.style.display = 'none'; ht.textContent = `姿態剩 ${Math.max(0, a.end - T).toFixed(1)} 秒`; }
    } else {
      mkr.style.display = 'none';
      if (S.cast && !S.me.down) {
        const type = S.cast.atk.type, W = type === 'dodge' ? dW : fW, remain = Math.max(0, S.cast.hitAt - T), want = type === 'dodge' ? '閃' : '防', goAt = W + (LEAD[tier] || 1.2);
        const prog = clamp(1 - (remain - goAt) / Math.max(.1, S.cast.dur - goAt), 0, 1);
        fl.style.width = (prog * 100) + '%';
        if (remain <= goAt) { stEl.dataset.state = 'go'; nm.textContent = `✅ 現在打「${want}」！`; }
        else { stEl.dataset.state = 'wait'; nm.textContent = `⏳ 再等一下…還不用打「${want}」`; }
        ht.textContent = `出手倒數 ${remain.toFixed(1)} 秒`;
      } else {
        stEl.dataset.state = 'idle'; fl.style.width = '0'; nm.textContent = '姿態：沒有';
        ht.textContent = `打「閃」＝閃避姿態 ${dW.toFixed(1)} 秒　打「防」＝防禦姿態 ${fW.toFixed(1)} 秒`;
      }
    }
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
    if (laneMode) drawLanes(T);
    else if (S.cast) {
      g.globalAlpha = .65 + .3 * Math.sin(T * 9);
      g.drawImage(S.cast.atk.type === 'dodge' ? art.zr : art.zb, 0, EXTRA);
      g.globalAlpha = 1;
    }
    g.save(); g.translate(OX, EXTRA);
    g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(80, 61, 32, 4, 0, 0, 7); g.fill();
    const lunge = T - S.mon.lungeAt < .35 ? Math.sin((T - S.mon.lungeAt) / .35 * Math.PI) * 9 : 0;
    const mx = 40 + (S.mon.angry ? Math.round(Math.sin(T * 30)) : 0), my = -2 + Math.round(Math.sin(T * 2) * 1) + Math.round(lunge);
    g.drawImage(S.mon.angry ? art.monA : art.mon, mx, my);
    if (T < S.mon.flashUntil) g.drawImage(art.monW, mx, my);

    let hx = 62, hy = 88;
    if (laneMode) { S.hx += (LANE_C[S.lane] - 2 - S.hx) * .35; hx = S.hx; }
    const shielding = laneMode ? S.shieldUntil > T : false;
    let offs = 0;
    const a = S.action;
    if (a && a.type === 'dodge') {
      const p = (T - a.start) / a.dur;
      offs = p < .15 ? -34 * (p / .15) : p > .85 ? -34 * ((1 - p) / .15) : -34;
    }
    S.me.x = Math.round(offs);
    g.fillStyle = 'rgba(0,0,0,.4)'; g.beginPath(); g.ellipse(hx + offs, hy, 8, 2, 0, 0, 7); g.fill();
    const blink = T - S.me.hitAt < .4 && Math.floor(T * 20) % 2 === 0;
    const atk = T - S.me.atkAt < .18 ? -2 : 0;
    if (S.me.down) {
      g.save(); g.globalAlpha = .6; g.filter = 'grayscale(1)';
      g.translate(hx + offs, hy - 6); g.rotate(Math.PI / 2); g.drawImage(art.hero, -13, -15);
      g.restore();
    } else if (!blink) {
      if (a && a.type === 'dodge') { g.globalAlpha = .3; g.drawImage(art.hero, hx - 11, hy - 30); g.globalAlpha = 1; }
      g.drawImage(art.hero, Math.round(hx - 11 + offs), hy - 30 + atk + (Math.sin(T * 4) > 0 ? 0 : 1));
      if (laneMode) { g.fillStyle = '#ffd24a'; g.fillRect(Math.round(hx - 8), hy + 4, 20, 2); }
      if ((a && a.type === 'defend') || shielding) {
        g.fillStyle = '#3a6ea5'; g.fillRect(hx - 24, hy - 26, 12, 15); g.fillStyle = '#e8b64c'; g.fillRect(hx - 24, hy - 26, 12, 2);
        g.fillStyle = '#f0f4f8'; g.fillRect(hx - 19, hy - 23, 2, 9); g.fillRect(hx - 22, hy - 19, 8, 2);
        g.strokeStyle = 'rgba(159,216,255,.8)'; g.lineWidth = 1; g.beginPath(); g.arc(hx, hy - 16, 18 + Math.sin(T * 12), 0, 7); g.stroke();
      }
    }
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
      banner('站起來了！', '#8ec96b', true);
    }
    runVolley(T);
    if (S.action && T >= S.action.end) endAction();
    if (!S.cast && T >= S.nextCast && !S.me.down) castStart(T);
    if (S.cast && laneMode) laneResolve(T); else if (S.cast && T >= S.cast.hitAt) castResolve(T);
    if (S.bubUntil && T > S.bubUntil) { S.bubUntil = 0; $q('nwb-bub').style.display = 'none'; host.classList.remove('nwb2-nozy'); }
    if (S.sporeUntil && T > S.sporeUntil) { S.sporeUntil = 0; host.classList.remove('nwb2-spore'); }
    if (T - S.st.lastTick >= 1) {
      S.st.lastTick = T;
      let d = 0;
      if (S.st.burn > T) d += 3;
      d += S.st.poison.filter(u => u > T).length;
      if (d && !S.me.down) { S.me.hp -= d; floatText(`-${d}`, 80 + S.me.x, 64, '#c08aff'); if (S.me.hp <= 0) goDown(); }
    }
    if (T - S.T0 >= BAL.timeLimit) { finish('retreat'); return; }
    draw(T); updateUi(false);
    raf = requestAnimationFrame(tick);
  }

  function detectAction(val) {
    if (laneMode) return null;
    const low = val.toLowerCase(), typed = [...val];
    for (const [w, type] of ACTIONS) {
      if (!low.endsWith(w)) continue;
      const at = typed.length - [...w].length;
      const expected = S.units.slice(at, at + [...w].length).map(u => u.want).join('').toLowerCase();
      if (expected === w) continue;
      return { w, type };
    }
    return null;
  }
  function onInput() {
    if (S.composing) return paintProgress();
    const hit = detectAction(inp.value);
    if (hit) { inp.value = inp.value.slice(0, inp.value.length - hit.w.length); paintProgress(); startAction(hit.type); return; }
    paintProgress();
  }
  const onKey = e => {
    if (e.key === 'Enter' && !e.isComposing && e.keyCode !== 229) { e.preventDefault(); submit(); }
    else if (e.key === 'Escape') { e.preventDefault(); skip(); }
  };
  const laneKey = e => {
    if (S.over) return;
    const alt = e.code === 'AltLeft' || e.code === 'AltRight';
    if (alt) { e.preventDefault(); if (!S.me.down) S.shieldUntil = Math.max(S.shieldUntil, nowS() + 1.5); return; }
    if (S.me.down || e.repeat) return;
    if (e.code === 'ControlLeft') S.lane = Math.max(0, S.lane - 1);
    else if (e.code === 'ControlRight') S.lane = Math.min(2, S.lane + 1);
  };
  const laneKeyUp = e => { if (e.code === 'AltLeft' || e.code === 'AltRight') e.preventDefault(); };
  if (laneMode) { addEventListener('keydown', laneKey); addEventListener('keyup', laneKeyUp); }
  const blockPaste = e => { e.preventDefault(); S.flags.paste++; toast('這裡不能貼上喔，要自己打！'); };
  inp.addEventListener('input', onInput);
  inp.addEventListener('keydown', onKey);
  inp.addEventListener('compositionstart', () => { S.composing = true; S.committed = inp.value; });
  inp.addEventListener('compositionend', () => { S.composing = false; onInput(); });
  inp.addEventListener('paste', blockPaste);
  inp.addEventListener('drop', blockPaste);
  root.addEventListener('click', e => { if (!S.me.down && !S.action && e.target.id !== 'nwb-quit') inp.focus(); });
  $q('nwb-quit').addEventListener('click', () => { if (confirm('要撤退嗎？現在撤退只能拿到一半的獎勵。')) finish('retreat'); });

  function finish(result) {
    if (S.over) return;
    S.over = true; S.volley = null; S.hits = []; cancelAnimationFrame(raf);
    removeEventListener('keydown', laneKey); removeEventListener('keyup', laneKeyUp);
    const secs = Math.min(BAL.timeLimit, nowS() - S.T0);
    inp.disabled = true;
    const win = result === 'win';
    banner(win ? '🎉 討伐成功！' : result === 'fail' ? '狩獵失敗…' : '撤退', win ? '#ffd24a' : '#e5705f');
    updateUi(true); draw(nowS());
    const acc = S.typed ? S.correct / S.typed : 0;
    const res = {
      rk: cfg.rk, mk: cfg.mk, star: cfg.star, result, secs, accuracy: acc, answered: S.answered,
      dodgeOk: S.dodgeOk, dodgeAll: S.dodgeAll, defOk: S.defOk, defAll: S.defAll,
      maxCombo: S.maxCombo, flags: S.flags, tier, weapon,
      valid: win || S.answered >= 3, lvAcc: true
    };
    if (!res.valid) res.invalidWhy = '還沒打幾題就結束了，這場不算數。';
    setTimeout(() => { root.remove(); done(res); }, 1500);
  }

  nextQuestion();
  updateUi(true);
  raf = requestAnimationFrame(tick);
  inp.focus();
}
