const LANE_C = [27, 80, 133];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const wait = ms => new Promise(r => setTimeout(r, ms));
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
#nw-acad{position:fixed;inset:0;z-index:92;overflow:auto}
.ac-card{display:flex;gap:10px;align-items:center;width:100%;text-align:left;padding:12px;cursor:pointer}
.ac-card .ic{font-size:34px;flex:none;width:52px;text-align:center}
.ac-card[disabled]{opacity:.5;cursor:default}
.ac-say{min-height:84px;padding:10px 14px;font-size:1.25em;line-height:1.5;font-weight:900}
.ac-keys{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}
.kc{display:inline-block;min-width:3.4em;text-align:center;padding:.2em .7em;border:3px solid #6a5ab0;border-bottom-width:6px;background:#1a1530;color:#aab0d8;font-weight:900;font-family:ui-monospace,Consolas,monospace}
.kc.need{border-color:#ffd24a;color:#ffd24a;animation:acNeed .6s steps(2) infinite}
.kc.down{background:#e8b64c;color:#1a1409;border-bottom-width:2px;transform:translateY(3px)}
@keyframes acNeed{50%{background:#3a2c10}}
.ac-dots{display:flex;gap:6px}.ac-dots i{width:14px;height:14px;border:3px solid #6a5ab0;background:#14102a;display:block}
.ac-dots i.on{background:#ffd24a;border-color:#ffd24a}.ac-dots i.now{border-color:#fff}
.ac-cv{display:block;margin:0 auto;image-rendering:pixelated;border:4px solid #0a0714}
.ac-word{font-size:3em;font-weight:900;letter-spacing:.1em;color:#ffd98a;text-align:center;line-height:1.2}
.ac-zy{font-size:1.1em;color:#aab0d8;text-align:center}
.ac-ok{animation:acOk .5s}@keyframes acOk{0%{transform:scale(.8)}60%{transform:scale(1.08)}100%{transform:scale(1)}}
#nw-tour{position:fixed;left:50%;bottom:14px;transform:translateX(-50%);z-index:130;max-width:min(520px,94vw);pointer-events:auto}
#nw-tour-ring{position:fixed;z-index:128;pointer-events:none;border:4px solid #ffd24a;box-shadow:0 0 0 9999px rgba(5,4,12,.55);animation:acNeed .7s steps(2) infinite}
#nw-tour-arrow{position:fixed;z-index:129;pointer-events:none;font-size:30px;animation:acBob .7s ease-in-out infinite}
@keyframes acBob{50%{transform:translateY(8px)}}
`;
function css() {
  if (document.getElementById('nw-acad-css')) return;
  const s = document.createElement('style'); s.id = 'nw-acad-css'; s.textContent = CSS; document.head.appendChild(s);
}

/* 一步一步照著做的導覽：每一步亮出要按的地方，沒做完就一直等，做完才換下一步 */
export function tour(steps, o = {}) {
  css();
  return new Promise(resolve => {
    let i = 0, alive = true, raf = 0;
    const bar = document.createElement('div'); bar.id = 'nw-tour'; bar.className = 'px-panel';
    bar.style.padding = '10px 14px';
    bar.innerHTML = '<div class="px-text" data-n style="color:#ffd98a;font-size:.85em"></div><div class="px-text" data-t style="font-size:1.15em;font-weight:900"></div><div class="text-right mt-1"><button class="px-btn" data-skip style="font-size:.8em;padding:2px 10px">跳過教學</button></div>';
    const ring = document.createElement('div'); ring.id = 'nw-tour-ring'; ring.style.display = 'none';
    const arrow = document.createElement('div'); arrow.id = 'nw-tour-arrow'; arrow.textContent = '👇'; arrow.style.display = 'none';
    document.body.append(bar, ring, arrow);
    const finish = skipped => { if (!alive) return; alive = false; cancelAnimationFrame(raf); bar.remove(); ring.remove(); arrow.remove(); resolve(!skipped); };
    bar.querySelector('[data-skip]').addEventListener('click', () => finish(true));
    let shown = -1;
    const frame = () => {
      if (!alive) return;
      const st = steps[i];
      if (!st) { finish(false); return; }
      if (shown !== i) { shown = i; bar.querySelector('[data-n]').textContent = `${o.title || '教學'}　第 ${i + 1} / ${steps.length} 步`; bar.querySelector('[data-t]').textContent = st.text; }
      const el = st.target ? st.target() : null;
      if (el && el.isConnected) {
        const r = el.getBoundingClientRect();
        ring.style.display = 'block'; ring.style.left = (r.left - 6) + 'px'; ring.style.top = (r.top - 6) + 'px'; ring.style.width = (r.width + 12) + 'px'; ring.style.height = (r.height + 12) + 'px';
        arrow.style.display = 'block'; arrow.style.left = (r.left + r.width / 2 - 15) + 'px'; arrow.style.top = Math.max(0, r.top - 46) + 'px';
      } else { ring.style.display = 'none'; arrow.style.display = 'none'; }
      if (st.done()) i++;
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
  });
}

const LESSONS = [
  { id: 'attack', icon: '⌨', name: '攻擊：打字', desc: '看魔物頭上的字，把它打出來，魔物就會掉血。' },
  { id: 'dodge', icon: '💨', name: '閃避：換線', desc: '地上的線變紅了，用左右 Ctrl 換到沒有紅色的線。' },
  { id: 'defend', icon: '🛡', name: '防禦：舉盾', desc: '整排變藍色，用 Alt 舉盾擋住。' },
  { id: 'equip', icon: '🎒', name: '換裝備', desc: '拿到新武器以後，怎麼換上。', needsGift: true }
];
const WORDS = [['太陽', 'ㄊㄞˋ ㄧㄤˊ'], ['小狗', 'ㄒㄧㄠˇ ㄍㄡˇ'], ['老師', 'ㄌㄠˇ ㄕ'], ['書包', 'ㄕㄨ ㄅㄠ'], ['朋友', 'ㄆㄥˊ ㄧㄡˇ'], ['學校', 'ㄒㄩㄝˊ ㄒㄧㄠˋ']];
const KEYNAME = { ControlLeft: '左 Ctrl', ControlRight: '右 Ctrl', Alt: 'Alt' };

export function openAcademy(env) {
  css();
  const { PX, NW } = env;
  const root = document.createElement('div'); root.id = 'nw-acad'; root.className = 'px-bg';
  document.body.appendChild(root);
  let scene = null, alive = true, cleanup = [];
  const close = () => { alive = false; if (scene) scene.stop(); cleanup.forEach(f => f()); root.remove(); env.close && env.close(); };

  function menu() {
    if (scene) { scene.stop(); scene = null; }
    cleanup.forEach(f => f()); cleanup = [];
    const nw = NW(), done = nw.tut || {};
    root.innerHTML = `<div class="max-w-3xl mx-auto p-3">
      <div class="px-panel" style="padding:12px;margin-bottom:12px"><div class="flex items-center justify-between gap-2"><div class="px-title" style="font-size:1.6em">🏫 教學大樓</div><button class="px-btn" data-close>← 回獵人村</button></div>
        <p class="px-text mt-1">跟著老師傅，先看一遍示範，再自己做一遍。做不好沒關係，會一直等你，直到做對再往下。</p></div>
      <div class="flex flex-col gap-3">${LESSONS.map(l => {
        const locked = l.needsGift && !(nw.gw || []).length;
        return `<button class="px-panel ac-card" data-l="${l.id}" ${locked ? 'disabled' : ''}><span class="ic">${l.icon}</span><span style="flex:1"><b class="px-text" style="font-size:1.2em">${l.name}</b><br><span class="px-text" style="color:#aab0d8;font-size:.9em">${locked ? '拿到新武器（例如測試者之刃）以後開放' : l.desc}</span></span><span class="px-chip" style="${done[l.id] ? 'color:#8ec96b' : 'color:#ffd98a'}">${done[l.id] ? '✓ 學會了' : '開始'}</span></button>`;
      }).join('')}</div></div>`;
    root.onclick = e => {
      if (e.target.closest('[data-close]')) { close(); return; }
      const b = e.target.closest('[data-l]'); if (b && !b.disabled) start(b.dataset.l);
    };
  }

  async function start(id) {
    if (id === 'equip') { close(); env.weaponTour && env.weaponTour(); return; }
    const lesson = LESSONS.find(l => l.id === id);
    root.innerHTML = `<div class="max-w-3xl mx-auto p-3">
      <div class="px-panel" style="padding:10px;margin-bottom:10px"><div class="flex items-center justify-between gap-2"><div class="px-title" style="font-size:1.3em">${lesson.icon} ${lesson.name}</div><div class="ac-dots" data-dots></div><button class="px-btn" data-back>← 回教學大樓</button></div></div>
      <canvas class="ac-cv" data-cv></canvas>
      <div class="px-panel ac-say" data-say style="margin-top:10px"></div>
      <div class="ac-keys" data-keys></div>
      <div data-extra class="mt-2"></div></div>`;
    const cv = root.querySelector('[data-cv]'), say = root.querySelector('[data-say]'), keys = root.querySelector('[data-keys]'), extra = root.querySelector('[data-extra]'), dots = root.querySelector('[data-dots]');
    scene = makeScene(cv, PX, env.look(), id === 'attack' ? 'shroom' : 'coo', root.clientWidth);
    let back = false;
    root.onclick = e => { if (e.target.closest('[data-back]')) { back = true; menu(); } };
    const keyCaps = need => { keys.innerHTML = need.map(k => `<span class="kc ${'need'}" data-k="${k}">${KEYNAME[k] || k}</span>`).join(''); };
    const onKey = (e, d) => { const code = (e.code === 'AltLeft' || e.code === 'AltRight') ? 'Alt' : e.code; const el = keys.querySelector(`[data-k="${code}"]`); if (el) el.classList.toggle('down', d); };
    const kd = e => onKey(e, true), ku = e => onKey(e, false);
    addEventListener('keydown', kd); addEventListener('keyup', ku); cleanup.push(() => { removeEventListener('keydown', kd); removeEventListener('keyup', ku); });
    const alive2 = () => alive && !back && root.isConnected;
    const steps = STEPS[id];
    const setDots = i => { dots.innerHTML = steps.map((_, k) => `<i class="${k < i ? 'on' : ''} ${k === i ? 'now' : ''}"></i>`).join(''); };
    const ui = { say: t => { say.textContent = t; }, keys: keyCaps, scene, extra, alive: alive2, wait, root };
    for (let i = 0; i < steps.length && alive2(); i++) {
      setDots(i);
      const st = steps[i];
      if (st.fight) {
        scene.setMax(5);
        const words = [...WORDS].sort(() => Math.random() - .5).slice(0, 5);
        ui.say(st.say); keyCaps(st.keys || []);
        for (let k = 0; k < 5 && alive2(); k++) {
          if (st.strike && (k === 1 || k === 3)) { const sk = st.strike(k); scene.spawn(sk.kind, sk.opts); }
          for (;;) {
            const ok = await scene.typeTask(ui, words[k]);
            if (!alive2()) return;
            if (ok) break;
            ui.say('字不一樣喔，看清楚再打一次。'); await wait(900); ui.say(st.say);
          }
          if (k < 4) { ui.say(`打中了！魔物還剩 ${4 - k} 下。${st.say}`); }
        }
        if (!alive2()) return;
        say.classList.add('ac-ok'); ui.say('打倒稻草魔物了！'); await wait(1400); say.classList.remove('ac-ok');
        continue;
      }
      if (st.demo) {
        do {
          ui.say(st.say); keyCaps(st.keys || []);
          await st.demo(ui);
          if (!alive2()) return;
          const again = await new Promise(res => {
            extra.innerHTML = '<div class="flex gap-2 justify-center"><button class="px-btn" data-again>▶ 再看一次</button><button class="px-btn gold" data-go style="padding:8px 26px">我知道了，換我做做看 ✓</button></div>';
            extra.querySelector('[data-again]').onclick = () => res(true); extra.querySelector('[data-go]').onclick = () => res(false);
          });
          extra.innerHTML = '';
          if (!again) break;
        } while (alive2());
      } else {
        for (;;) {
          if (!alive2()) return;
          ui.say(st.say); keyCaps(st.keys || []); if (id !== 'attack') scene.reset();
          const ok = await st.task(ui);
          if (!alive2()) return;
          if (ok) { say.classList.add('ac-ok'); ui.say(st.good || '太棒了！'); await wait(1400); say.classList.remove('ac-ok'); break; }
          ui.say(st.bad || '沒關係，再來一次！'); await wait(1500);
        }
      }
    }
    if (!alive2()) return;
    setDots(steps.length);
    ui.say(`🎉 「${lesson.name}」學會了！`); keys.innerHTML = '';
    if (env.lessonDone) await env.lessonDone(id);
    if (alive2()) menu();
  }

  menu();
  return { close };
}

/* 教學的步驟。demo 是示範（自己動），task 是換學生做（成功回傳 true，失敗回傳 false 就重來） */
const STEPS = {
  dodge: [
    { say: '看示範：地上的線變紅，就是魔物快要打到那一線了。小人按「右 Ctrl」換到沒有紅色的線。', keys: ['ControlRight'],
      demo: async ui => { const s = ui.scene; s.reset(); s.lane = 1; await wait(500); const p = s.spawn('single', { lane: 1, W: 3 }); await wait(1400); s.press('ControlRight'); await p; await wait(600); } },
    { say: '換你了！紅線出現後，按「左 Ctrl」或「右 Ctrl」，換到沒有紅色的線。', keys: ['ControlLeft', 'ControlRight'], good: '躲開了！', bad: '被打到了，沒關係，再來一次！',
      task: async ui => { await wait(600); const r = await ui.scene.spawn('single', { lane: ui.scene.lane, W: 3.5 }); return !r.hurt; } },
    { say: '這次兩條線都變紅，只有一條是安全的。站到安全的那一條！', keys: ['ControlLeft', 'ControlRight'], good: '看清楚了，很棒！',
      task: async ui => { ui.scene.lane = 1; await wait(600); const r = await ui.scene.spawn('pair', { safe: 0, W: 3.5 }); return !r.hurt; } },
    { fight: true, say: '實戰！一邊打字把稻草魔物打倒（要打 5 下），魔物出招時，記得換線躲開。', keys: ['ControlLeft', 'ControlRight'],
      strike: k => k === 1 ? { kind: 'single', opts: { lane: 1, W: 3.4 } } : { kind: 'pair', opts: { safe: 2, W: 3.4 } } }
  ],
  defend: [
    { say: '看示範：整排都變藍色，沒地方躲！小人按「Alt」舉起盾牌擋住。', keys: ['Alt'],
      demo: async ui => { const s = ui.scene; s.reset(); await wait(500); const p = s.spawn('slam', { W: 3 }); await wait(1900); s.press('Alt'); await p; await wait(600); } },
    { say: '換你了！整排變藍色以後，快要打到前，按「Alt」舉盾。盾可以舉 1.5 秒。', keys: ['Alt'], good: '擋住了！', bad: '盾沒有舉起來，被打到了，沒關係，再來一次！',
      task: async ui => { await wait(600); const r = await ui.scene.spawn('slam', { W: 3.5 }); return !r.hurt; } },
    { say: '再一次！記得：不是一直按，而是在快打到的時候按。', keys: ['Alt'], good: '時機抓得很準！',
      task: async ui => { await wait(600); const r = await ui.scene.spawn('slam', { W: 2.6 }); return !r.hurt; } },
    { say: '最後一課：只有一條線變紅時，站在紅線上舉盾，只會擋掉一半的傷。所以還是「換線」最安全！（按一下 Alt 看看）', keys: ['Alt'], good: '你知道了：能躲就躲，躲不掉再舉盾。',
      task: async ui => { await wait(600); ui.scene.lane = 1; const r = await ui.scene.spawn('single', { lane: 1, W: 3.2 }); return r.shielded; } },
    { fight: true, say: '實戰！一邊打字把稻草魔物打倒（要打 5 下），整排變藍色時，記得按 Alt 舉盾。', keys: ['Alt'],
      strike: () => ({ kind: 'slam', opts: { W: 3.4 } }) }
  ],
  attack: [
    { say: '看示範：魔物要被打倒，就把畫面上的字打出來。照著注音打，選好字，再按 Enter。',
      demo: async ui => { const s = ui.scene; s.reset(); const w = WORDS[0]; await s.fakeType(w[0], w[1]); } },
    { say: '換你了！照著下面的字，用注音打出來，再按 Enter。', word: 0, good: '打中了！', bad: '字不一樣喔，看清楚再打一次。', task: ui => ui.scene.typeTask(ui, WORDS[1]) },
    { say: '再一個！', good: '打中了！', bad: '字不一樣喔，看清楚再打一次。', task: ui => ui.scene.typeTask(ui, WORDS[2]) },
    { say: '最後一個練習！打對的字才有傷害，亂打會被反擊。', good: '很好！', bad: '字不一樣喔，看清楚再打一次。', task: ui => ui.scene.typeTask(ui, WORDS[3]) },
    { fight: true, say: '實戰！把稻草魔物打倒（要打 5 下），打完一個字就按 Enter。' }
  ]
};

/* 教學用的小場景：三條線、小人、魔物。不會真的受傷。 */
function makeScene(cv, PX, look, monKey, hostW) {
  const LW = 160, LH = 96;
  const sc = clamp(Math.floor(Math.min((hostW || 760) - 30, 760) / LW), 2, 5);
  cv.width = LW; cv.height = LH; cv.style.width = LW * sc + 'px'; cv.style.height = LH * sc + 'px';
  const g = cv.getContext('2d'); g.imageSmoothingEnabled = false;
  const bg = PX.bg('grass', LW), mon = PX.canvas('monster', monKey, 2, false), hero = PX.hero(look, 1);
  const S = { t: 0, lane: 1, hx: LANE_C[1] - 2, shieldUntil: 0, strikes: [], flash: [], hitAt: -9, hp: 3, max: 3, monFlash: -9, say: '' };
  const now = () => performance.now() / 1000;
  let raf = 0, alive = true;
  const waiters = [];
  function resolveStrike(st, T) {
    S.flash.push({ lane: st.lane, t0: T });
    const shielded = S.shieldUntil > T;
    let hurt = false;
    if (st.slam) { if (!shielded) hurt = true; else st.group.shielded = true; }
    else if (S.lane === st.lane) { hurt = true; if (shielded) st.group.shielded = true; }
    if (hurt) { st.group.hurt = true; S.hitAt = T; }
  }
  function update(T) {
    for (const gp of waiters.slice()) {
      for (const st of gp.strikes) { if (!st.done && T >= st.hit) { st.done = true; resolveStrike(st, T); } }
      if (gp.strikes.every(x => x.done)) { waiters.splice(waiters.indexOf(gp), 1); gp.resolve({ hurt: !!gp.hurt, shielded: !!gp.shielded }); }
    }
  }
  function draw(T) {
    g.drawImage(bg, 0, 0);
    g.fillStyle = 'rgba(0,0,0,.2)'; [1, 54, 107, 159].forEach(x => g.fillRect(x, 52, 1, 44));
    for (const gp of waiters) for (const st of gp.strikes) {
      if (st.done || T < st.warn) continue;
      const k = clamp((T - st.warn) / (st.hit - st.warn), 0, 1), a = .38 + .5 * k * (Math.sin(T * 22) > 0 ? 1 : .6);
      g.fillStyle = st.slam ? `rgba(80,140,255,${a})` : `rgba(255,50,50,${a})`; g.fillRect(LANE_C[st.lane] - 25, 52, 50, 44);
    }
    S.flash = S.flash.filter(f => T - f.t0 < .25);
    S.flash.forEach(f => { g.fillStyle = `rgba(255,255,255,${(1 - (T - f.t0) / .25) * .8})`; g.fillRect(LANE_C[f.lane] - 25, 52, 50, 44); });
    g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(80, 61, 32, 4, 0, 0, 7); g.fill();
    g.drawImage(mon, 40 + (T - S.monFlash < .2 ? Math.round(Math.sin(T * 60) * 2) : 0), -2 + Math.round(Math.sin(T * 2)));
    S.hx += (LANE_C[S.lane] - 2 - S.hx) * .35;
    const hx = S.hx, hy = 88, blink = T - S.hitAt < .4 && Math.floor(T * 20) % 2 === 0;
    g.fillStyle = 'rgba(0,0,0,.4)'; g.beginPath(); g.ellipse(hx, hy, 8, 2, 0, 0, 7); g.fill();
    if (!blink) {
      g.drawImage(hero, Math.round(hx - 11), hy - 30 + (Math.sin(T * 4) > 0 ? 0 : 1));
      g.fillStyle = '#ffd24a'; g.fillRect(Math.round(hx - 8), hy + 4, 20, 2);
      if (S.shieldUntil > T) {
        g.fillStyle = '#3a6ea5'; g.fillRect(hx - 24, hy - 26, 12, 15); g.fillStyle = '#e8b64c'; g.fillRect(hx - 24, hy - 26, 12, 2);
        g.fillStyle = '#f0f4f8'; g.fillRect(hx - 19, hy - 23, 2, 9); g.fillRect(hx - 22, hy - 19, 8, 2);
        g.strokeStyle = 'rgba(159,216,255,.8)'; g.lineWidth = 1; g.beginPath(); g.arc(hx, hy - 16, 18 + Math.sin(T * 12), 0, 7); g.stroke();
      }
    }
    const sw = Math.floor(56 / S.max) * 2 - 2;
    for (let i = 0; i < S.max; i++) { g.fillStyle = i < S.hp ? '#d8402a' : '#2a1c1c'; g.fillRect(80 - S.max * (sw + 2) / 2 + i * (sw + 2), 4, sw, 4); }
  }
  const loop = () => { if (!alive) return; const T = now(); update(T); draw(T); raf = requestAnimationFrame(loop); };
  raf = requestAnimationFrame(loop);

  const press = code => {
    if (code === 'ControlLeft') S.lane = Math.max(0, S.lane - 1);
    else if (code === 'ControlRight') S.lane = Math.min(2, S.lane + 1);
    else if (code === 'AltLeft' || code === 'AltRight' || code === 'Alt') S.shieldUntil = Math.max(S.shieldUntil, now() + 1.5);
  };
  const kd = e => {
    if (e.code === 'AltLeft' || e.code === 'AltRight') e.preventDefault();
    if (e.repeat && e.code.startsWith('Control')) return;
    press(e.code);
  };
  addEventListener('keydown', kd);

  const api = {
    get lane() { return S.lane; }, set lane(v) { S.lane = v; },
    get danger() { const T = now(); return waiters.flatMap(gp => gp.strikes.filter(st => !st.done && T >= st.warn)).map(st => ({ lane: st.lane, slam: !!st.slam, left: st.hit - T })); },
    press,
    reset() { S.max = 3; S.hp = 3; S.shieldUntil = 0; },
    setMax(n) { S.max = n; S.hp = n; },
    get hp() { return S.hp; },
    stop() { alive = false; cancelAnimationFrame(raf); removeEventListener('keydown', kd); },
    spawn(kind, o = {}) {
      return new Promise(resolve => {
        const T = now(), W = o.W || 3, H = T + W, group = { resolve, strikes: [] };
        if (kind === 'slam') group.strikes = [0, 1, 2].map(l => ({ lane: l, warn: H - W * .8, hit: H, slam: true, group }));
        else if (kind === 'pair') group.strikes = [0, 1, 2].filter(l => l !== (o.safe ?? 0)).map(l => ({ lane: l, warn: H - W * .8, hit: H, group }));
        else group.strikes = [{ lane: o.lane ?? 1, warn: H - W * .8, hit: H, group }];
        waiters.push(group);
      });
    },
    async fakeType(word, zy) {
      const host = cv.parentElement.querySelector('[data-extra]');
      host.innerHTML = `<div class="ac-word" data-w>${esc(word)}</div><div class="ac-zy">${esc(zy)}</div><div class="px-panel in text-center" style="font-size:2em;min-height:1.6em;margin-top:6px" data-fake></div>`;
      const box = host.querySelector('[data-fake]');
      await wait(800);
      for (const ch of [...word]) { box.textContent += ch; await wait(900); }
      await wait(500); box.textContent += '　⏎'; await wait(600);
      S.hp = Math.max(0, S.hp - 1); S.monFlash = now(); await wait(900); host.innerHTML = '';
    },
    typeTask(ui, [word, zy]) {
      return new Promise(resolve => {
        const host = ui.extra;
        host.innerHTML = `<div class="ac-word">${esc(word)}</div><div class="ac-zy">${esc(zy)}</div><input data-in type="text" autocomplete="off" placeholder="打字，按 Enter" class="w-full mt-2 p-3 px-panel in" style="color:#fff;font-size:1.6em;text-align:center">`;
        const inp = host.querySelector('[data-in]'); inp.focus();
        const onKey = e => {
          if (e.key !== 'Enter' || e.isComposing || e.keyCode === 229) return;
          e.preventDefault();
          const ok = inp.value.trim() === word;
          if (ok) { S.hp = Math.max(0, S.hp - 1); S.monFlash = now(); }
          inp.removeEventListener('keydown', onKey);
          host.innerHTML = ''; resolve(ok);
        };
        inp.addEventListener('keydown', onKey);
        S.hp = Math.max(S.hp, 1);
      });
    }
  };
  if (location.hostname === 'localhost') window.__acScene = api;
  return api;
}
