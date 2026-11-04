const STEP = n => `polygon(0 ${n}px,${n}px ${n}px,${n}px 0,calc(100% - ${n}px) 0,calc(100% - ${n}px) ${n}px,100% ${n}px,100% calc(100% - ${n}px),calc(100% - ${n}px) calc(100% - ${n}px),calc(100% - ${n}px) 100%,${n}px 100%,${n}px calc(100% - ${n}px),0 calc(100% - ${n}px))`;

export const UI_CSS = `
.px-panel{position:relative;background:linear-gradient(180deg,#2a2358,#1b1738);color:var(--ink);padding:14px;
  border:4px solid #0a0714;box-shadow:inset 0 0 0 2px #f0eee8,inset 0 0 0 4px #6a5ab0;clip-path:${STEP(4)}}
.px-panel.in{background:#141030;border-width:3px;padding:10px;box-shadow:inset 0 0 0 2px #3a3070;clip-path:${STEP(3)}}
.px-btn{display:inline-flex;align-items:center;justify-content:center;gap:.4em;font-weight:900;padding:9px 18px;color:#fff;cursor:pointer;
  background:#3a3280;border:3px solid #0a0714;box-shadow:inset 0 -4px 0 #231d55,inset 0 3px 0 #6a5ab0;text-shadow:2px 2px 0 #000;
  clip-path:${STEP(3)};transition:transform .08s,filter .08s;font-family:inherit}
.px-btn:hover{filter:brightness(1.25);transform:translateY(-2px)}
.px-btn:active{transform:translateY(2px);box-shadow:inset 0 -2px 0 #231d55,inset 0 2px 0 #6a5ab0}
.px-btn.gold{background:#e8b64c;color:#2a1a00;text-shadow:1px 1px 0 #ffe9a8;box-shadow:inset 0 -4px 0 #b4731a,inset 0 3px 0 #ffe9a8}
.px-btn:disabled{opacity:.45;cursor:not-allowed;transform:none;filter:none}
.px-bar{height:14px;background:#0a0714;border:2px solid #0a0714;box-shadow:inset 0 0 0 1px #6a5ab0;padding:1px;--c:#d8402a}
.px-bar>i{display:block;height:100%;width:100%;background:repeating-linear-gradient(90deg,var(--c) 0 6px,transparent 6px 8px);transition:width .2s}
.px-bar.ok{--c:#6aa84f}.px-bar.xp{--c:#e8b64c}.px-bar.mp{--c:#4a8fd8}
.px-title{font-weight:900;color:#ffd98a;text-shadow:3px 3px 0 #000,-1px -1px 0 #000,1px -1px 0 #000,-1px 1px 0 #000}
.px-text{color:#fff;text-shadow:1px 1px 0 #000,-1px 1px 0 #000,1px -1px 0 #000,-1px -1px 0 #000}
.px-cursor::before{content:"▶";color:#e8b64c;margin-right:.35em;animation:pxBlink 1s steps(2) infinite}
@keyframes pxBlink{50%{opacity:0}}
.px-chip{display:inline-block;font-size:.75em;font-weight:800;padding:0 8px;background:#0a0714;border:2px solid currentColor;white-space:nowrap}
.px-bg{background-color:#0e0a1e;background-image:linear-gradient(45deg,#150f2c 25%,transparent 25%,transparent 75%,#150f2c 75%),linear-gradient(45deg,#150f2c 25%,transparent 25%,transparent 75%,#150f2c 75%);background-size:16px 16px;background-position:0 0,8px 8px}
.px-img canvas,canvas.px-img{image-rendering:pixelated;image-rendering:crisp-edges}
`;

export function injectUi() {
  if (document.getElementById('nw-ui-css')) return;
  const st = document.createElement('style');
  st.id = 'nw-ui-css';
  st.textContent = UI_CSS;
  document.head.appendChild(st);
}
