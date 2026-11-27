/* 解鎖路線的時間模型（docs/SPEC-UNLOCK-ROUTE.md「怎麼算的」）：每個等級要多少新世界分鐘、第幾場。
   用法：node tools/nw-sim/unlock-route.mjs [每場外加秒=60] [開場秒=300] [--tut 0] [--n 40] [--lv forge=3,shop=4,...]
     --tut   教學大樓任務（1-0a）給的獵人經驗；老師 2026-11-27 決定 0（要用初始武器打一兩場才解鎖鐵匠鋪）；舊規格是 10
     --lv    覆蓋建築解鎖等級，例如 --lv forge=3,shop=5
   模型（全部照規格）：
   - 每場秒數：sim.mjs＋v2Rules({flow:'none'})＋attendDodge 0.11／attendDef 0.73；學生＝realPersonas() 的慢 P25、中 P50、快 P90，另加極慢 4 字/分。
   - 時間：開場（取名、選武器、教學大樓三堂課）＋每場外加（委託板、結算、走路）；每節新世界 15 分鐘，剩下時間不夠打一場就等下一節；
     一天（＝一節）最多開 NW_V2.starsPerDay 個新星級；每場挑能開的最高星。
   - 主線：前兩場是 1-1 泡泡蛙 ★1、1-2 咕咕鳥 ★1（各 +30 經驗），之後挑最高星。
   - 經驗：huntExp(regionLv('grass', 星), true) × rewardRatio（贏＝1）。
   分鐘＝從第一次進新世界算起的累計，含「剩下時間不夠打一場」的空檔。 */
import { regionLv, huntExp, hrNeed, NW_V2, rewardRatio } from '../../nw-data.js';
import { simulate, DEFAULT_ASSUME } from './sim.mjs';
import { v2Rules } from './rules-v2.mjs';
import { realPersonas } from './personas.mjs';

const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf(k); return i < 0 ? d : args[i + 1]; };
const pos = args.filter((a, i) => !a.startsWith('--') && !(i > 0 && args[i - 1].startsWith('--')));
const EXTRA = +(pos[0] ?? 60), OPEN = +(pos[1] ?? 300), TUT = +opt('--tut', 0), N = +opt('--n', 40), SESSION = 15 * 60;

/* 建築 → 解鎖等級（SPEC-UNLOCK-ROUTE 的路線表；刷新與改名卡 2026-11-27 起不綁等級，不在表裡） */
const LV = { storage: 2, forge: 3, shop: 4, rank: 7, rooms: 8, armor: 10, star: 12 };
String(opt('--lv', '')).split(',').filter(Boolean).forEach(kv => { const [k, v] = kv.split('='); LV[k] = +v; });
const NAME = { storage: '倉庫', forge: '鐵匠鋪', shop: '商店', rank: '榮譽碑', rooms: '組隊酒館', armor: '防具店', star: '星圖台' };

const expTotal = L => { let s = 0; for (let l = 1; l < L; l++) s += hrNeed(l); return s; };
const GRASS = ['coo', 'frog', 'shroom'], A = { ...DEFAULT_ASSUME, attendDodge: 0.11, attendDef: 0.73 };
const W = ['staff', 'bow', 'dagger', 'crossbow'];

/* 一個學生每個星級的平均秒數與勝率（三種草原魔物、四種武器輪流） */
function fightStats(p, seed0) {
  const out = {};
  for (let star = 1; star <= 5; star++) {
    let secs = 0, wins = 0, n = 0;
    for (const mk of GRASS) for (let i = 0; i < N; i++) {
      const r = simulate({ ...p, weapon: W[i % 4] }, mk, 'grass', star, 0.5, seed0 * 100003 + star * 9973 + i * 7 + GRASS.indexOf(mk) * 131, { ...A, rules: v2Rules({ flow: 'none' }) }, {});
      secs += r.secs; n++; if (r.result === 'win') wins++;
    }
    out[star] = { secs: secs / n, win: wins / n };
  }
  return out;
}

/* 走一遍時間模型。回每個等級的 { min, session, fight }；fight＝第幾場打完才到的 */
export function route(stats, { extra = EXTRA, open = OPEN, tut = TUT, maxFights = 400 } = {}) {
  let t = open, session = 1, exp = tut, hr = 1, fights = 0, starTop = 1, newToday = 0;   // t＝累計秒數；session 內已用 = t - (session-1)*SESSION
  const reached = {}, expAt = e => { let l = 1; while (e >= expTotal(l + 1)) l++; return l; };
  const sessEnd = () => session * SESSION;
  while (fights < maxFights && !reached.__done) {
    /* 這場打哪一星：前兩場是主線的 ★1 單子，之後挑能開的最高星（今天新星級用完就停在今天已開的那一星） */
    const cap = newToday >= NW_V2.starsPerDay ? Math.max(1, starTop - 1) : starTop;   // 今天新星級用完：還沒打贏過的那一星今天不能開（newStarLocked）
    const star = fights < 2 ? 1 : Math.min(5, cap);
    const dur = stats[star].secs + extra;
    if (t + dur > sessEnd()) { session++; t = (session - 1) * SESSION; newToday = 0; continue; }   // 剩下時間不夠打一場：等下一節
    t += dur; fights++;
    exp += huntExp(regionLv('grass', star), true) * rewardRatio(true, 0, 0, 1) + (fights <= 2 ? 30 : 0);
    if (star === starTop && starTop < 5) { starTop++; newToday++; }   // 贏了目前最高的一星，開下一星
    const L = expAt(exp);
    for (let l = hr + 1; l <= L; l++) reached['Lv' + l] = { min: t / 60, session, fight: fights };
    hr = L;
    if (hr >= 12) reached.__done = true;
  }
  return reached;
}

const personas = realPersonas().list.slice(0, 3).map(([name, p]) => [name, p]);
personas.push(['極慢（4）', { ...personas[0][1], wpm: 4 }]);
const rows = personas.map(([name, p], i) => { const st = fightStats(p, i + 1); return { name, wpm: p.wpm, st, r: route(st) }; });

const f = x => x ? `${x.min.toFixed(1)} 分・第 ${x.fight} 場（第 ${x.session} 節）` : '—';
console.log(`## 解鎖路線時間模型（每場外加 ${EXTRA} 秒、開場 ${OPEN} 秒、教學大樓 +${TUT} 經驗、每節 15 分、一天最多 ${NW_V2.starsPerDay} 個新星級）`);
console.log('\n草原每場平均秒數（★1／★2／★3／★4／★5；勝率）：');
rows.forEach(r => console.log(`- ${r.name}（${r.wpm} 字/分）：${[1, 2, 3, 4, 5].map(s => Math.round(r.st[s].secs)).join('／')} 秒；勝率 ${[1, 2, 3, 4, 5].map(s => Math.round(r.st[s].win * 100)).join('／')}%`));
console.log('\n| 等級 | 建築 | ' + rows.map(r => r.name).join(' | ') + ' |');
console.log('|---|---|' + rows.map(() => '---').join('|') + '|');
const need = [...new Set(Object.values(LV))].sort((a, b) => a - b);
need.forEach(l => console.log(`| Lv${l}（累計經驗 ${expTotal(l)}） | ${Object.keys(LV).filter(k => LV[k] === l).map(k => NAME[k]).join('、')} | ` + rows.map(r => f(r.r['Lv' + l])).join(' | ') + ' |'));
