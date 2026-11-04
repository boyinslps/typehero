export function startBattle(env, cfg, done) {
  env.C.toast('戰鬥畫面做中', 1500);
  done({ rk: cfg.rk, mk: cfg.mk, star: cfg.star, result: 'retreat', valid: false, invalidWhy: '戰鬥還沒做好',
    secs: 0, accuracy: 0, dodgeOk: 0, dodgeAll: 0, defOk: 0, defAll: 0 });
}
