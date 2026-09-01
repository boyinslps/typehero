/* 六個階級徽章（SVG）
   共用一枚圓章，隨等級往外長：緞帶 → 桂冠 → 光芒 → 雙翼與王冠。
   顏色也跟著從石灰、皮革、銅、銀、金一路上去。 */

const RANK_SVG = (() => {

  const disc = (rim, face, inner) => `
    <circle cx="50" cy="45" r="27" fill="${face}" stroke="${rim}" stroke-width="3.5"/>
    <circle cx="50" cy="45" r="21" fill="none" stroke="${inner}" stroke-width="1.6" opacity=".85"/>`;

  const ribbon = (a, b) => `
    <path d="M36 68 L28 95 L43 86 L50 95 L57 86 L72 95 L64 68 Z" fill="${a}"/>
    <path d="M43 86 L50 95 L57 86 L50 78 Z" fill="${b}"/>`;

  /* 桂冠：左右各一條弧線，上面掛葉子 */
  const laurel = (c, n = 5) => {
    let s = '';
    for (const side of [-1, 1]) {
      s += `<path d="M${50 + side * 30} 68 A34 34 0 0 1 ${50 + side * 30} 22"
              fill="none" stroke="${c}" stroke-width="3" stroke-linecap="round"/>`;
      for (let i = 0; i < n; i++) {
        const t = 0.12 + 0.76 * i / (n - 1);
        const ang = Math.PI * (0.5 + side * 0.5 * (2 * t - 1));
        const x = 50 + side * 30 - side * Math.sin(ang * 0) * 0;
        const cx = 50 + side * (30 - 4 * Math.sin(Math.PI * t));
        const cy = 68 - 46 * t;
        s += `<ellipse cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" rx="6.5" ry="3.2"
                fill="${c}" transform="rotate(${(side * (70 - 130 * t)).toFixed(0)} ${cx.toFixed(1)} ${cy.toFixed(1)})"/>`;
      }
    }
    return s;
  };

  const rays = c => {
    let s = '';
    for (let i = 0; i < 12; i++) {
      const a = i * Math.PI / 6;
      const x1 = 50 + Math.cos(a) * 31, y1 = 45 + Math.sin(a) * 31;
      const x2 = 50 + Math.cos(a) * 39, y2 = 45 + Math.sin(a) * 39;
      s += `<path d="M${x1.toFixed(1)} ${y1.toFixed(1)} L${x2.toFixed(1)} ${y2.toFixed(1)}"
              stroke="${c}" stroke-width="2.6" stroke-linecap="round" opacity=".9"/>`;
    }
    return s;
  };

  const wings = (c, edge) => `
    <path d="M24 40 L-6 22 L2 40 L-11 37 L0 52 L-8 55 L10 62 L27 52 Z"
          fill="${c}" stroke="${edge}" stroke-width="1.6" stroke-linejoin="round"/>
    <path d="M76 40 L106 22 L98 40 L111 37 L100 52 L108 55 L90 62 L73 52 Z"
          fill="${c}" stroke="${edge}" stroke-width="1.6" stroke-linejoin="round"/>`;

  const star = (cx, cy, r, fill, pts = 5) => {
    const v = [];
    for (let i = 0; i < pts * 2; i++) {
      const a = -Math.PI / 2 + i * Math.PI / pts;
      const rr = i % 2 ? r * 0.44 : r;
      v.push(`${(cx + Math.cos(a) * rr).toFixed(1)},${(cy + Math.sin(a) * rr).toFixed(1)}`);
    }
    return `<polygon points="${v.join(' ')}" fill="${fill}"/>`;
  };

  const crown = c => `
    <path d="M36 12 L42 1 L50 10 L58 1 L64 12 L60 18 L40 18 Z"
          fill="${c}" stroke="${c}" stroke-width="1.5" stroke-linejoin="round"/>
    <circle cx="42" cy="0" r="2.8" fill="${c}"/>
    <circle cx="50" cy="8" r="2.8" fill="${c}"/>
    <circle cx="58" cy="0" r="2.8" fill="${c}"/>`;

  return [
    /* 0 見習生：素面石章 */
    `${disc('#7d7568', '#4a4339', '#8f8676')}
     <circle cx="50" cy="45" r="7" fill="#8f8676"/>`,

    /* 1 冒險者：皮革章＋箭頭＋緞帶 */
    `${ribbon('#6f5637', '#8a6c46')}
     ${disc('#9a7748', '#54432c', '#b08d59')}
     <path d="M50 33 L62 55 L50 49 L38 55 Z" fill="#b08d59"/>`,

    /* 2 銅級：銅章＋緞帶＋小桂冠 */
    `${laurel('#a8702f', 4)}
     ${ribbon('#8a4f22', '#a8702f')}
     ${disc('#cd7f32', '#5a3a1c', '#e09a52')}
     ${star(50, 45, 13, '#e09a52')}`,

    /* 3 銀級：銀章＋緞帶＋桂冠 */
    `${laurel('#9fa8b5', 5)}
     ${ribbon('#5d6773', '#828d9b')}
     ${disc('#c9d1dd', '#3f4650', '#e6ecf5')}
     ${star(50, 45, 15, '#e6ecf5')}`,

    /* 4 金級：金章＋光芒＋桂冠＋緞帶 */
    `${rays('#e8b64c')}
     ${laurel('#c8912f', 6)}
     ${ribbon('#8a5f16', '#c8912f')}
     ${disc('#e8b64c', '#4a3413', '#ffd98a')}
     ${star(50, 45, 16, '#ffd98a')}
     ${star(50, 45, 7, '#fff6dd')}`,

    /* 5 傳說：雙翼＋王冠＋光芒＋桂冠 */
    `${wings('#fff4d6', '#c8912f')}
     ${rays('#ffd98a')}
     ${laurel('#e8b64c', 6)}
     ${ribbon('#8a5f16', '#e8b64c')}
     ${disc('#ffd98a', '#4a3413', '#fff6dd')}
     ${star(50, 45, 17, '#fff6dd')}
     ${star(50, 45, 8, '#ffffff')}
     ${crown('#ffd98a')}`
  ].map(body =>
    `<svg viewBox="-12 -4 124 110" width="100%" height="100%"
          preserveAspectRatio="xMidYMid meet">${body}</svg>`);
})();
