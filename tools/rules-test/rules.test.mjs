/* 規則測試：每一條「誰、哪份文件、做什麼、該過還是不過」。
   正式規則（firestore-rules.txt）。
   跑法見 README.md。 */
import { test, describe, before, after, beforeEach } from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, collection, query, where, getCountFromServer, serverTimestamp, writeBatch } from 'firebase/firestore';
import { publicBoard } from '../../teacher/bug-calc.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const PORT = 8089;

async function env(file, pid) {
  return initializeTestEnvironment({ projectId: pid, firestore: { host: '127.0.0.1', port: PORT, rules: readFileSync(join(root, file), 'utf8') } });
}
const ANON = { firebase: { sign_in_provider: 'anonymous' } };
const who = (te) => ({
  stu: te.authenticatedContext('stu1', ANON).firestore(),
  stu2: te.authenticatedContext('stu2', ANON).firestore(),
  teacher: te.authenticatedContext('T1', { email: 'teacher@example.test' }).firestore(),
  notTeacher: te.authenticatedContext('X1', { email: 'other@example.test' }).firestore(),
  anon: te.unauthenticatedContext().firestore()
});
async function seed(te, fn) { await te.withSecurityRulesDisabled(async ctx => fn(ctx.firestore())); }
const ID = '五年級4班_5號';

describe('正式規則 firestore-rules.txt', () => {
  let te, d;
  before(async () => { te = await env('firestore-rules.txt', 'demo-formal'); d = who(te); });
  after(async () => { await te.cleanup(); });
  beforeEach(async () => {
    await te.clearFirestore();
    await seed(te, async db => {
      await setDoc(doc(db, 'mg_admins/T1'), { ok: true });
      await setDoc(doc(db, 'mg_config/settings'), { a: 1 });
      await setDoc(doc(db, 'mg_config/nw_vote'), { noms: [], hidden: [], v: {}, votes: {} });
      await setDoc(doc(db, 'mg_scores/' + ID), { name: '甲' });
      await setDoc(doc(db, 'mg_nw_flags/f1'), { type: 'bug', status: 'pending', text: 'x' });
      await setDoc(doc(db, 'mg_mail/m1'), { aud: ['all'] });
      await setDoc(doc(db, 'mg_bugboard/' + ID), { n: 1 });
    });
  });

  describe('mg_admins', () => {
    test('老師讀自己 → 過', () => assertSucceeds(getDoc(doc(d.teacher, 'mg_admins/T1'))));
    test('學生讀別人的 → 不過', () => assertFails(getDoc(doc(d.stu, 'mg_admins/T1'))));
    test('列出整個集合 → 不過', () => assertFails(getDocs(collection(d.teacher, 'mg_admins'))));
    test('老師寫自己 → 不過（只能從主控台建）', () => assertFails(setDoc(doc(d.teacher, 'mg_admins/T1'), { ok: true })));
    test('學生自己建一份 → 不過', () => assertFails(setDoc(doc(d.stu, 'mg_admins/stu1'), { ok: true })));
    test('未登入 → 不過', () => assertFails(getDoc(doc(d.anon, 'mg_admins/T1'))));
  });

  describe('舊站 competition / scores', () => {
    test('登入者讀寫 → 過', async () => {
      await assertSucceeds(setDoc(doc(d.stu, 'competition/c1'), { a: 1 }));
      await assertSucceeds(getDoc(doc(d.stu, 'scores/s1')));
      await assertSucceeds(setDoc(doc(d.stu, 'scores/s1'), { a: 1 }));
    });
    test('未登入 → 不過', () => assertFails(getDoc(doc(d.anon, 'scores/s1'))));
  });

  describe('mg_config / mg_round / mg_bank', () => {
    test('學生讀設定 → 過', () => assertSucceeds(getDoc(doc(d.stu, 'mg_config/settings'))));
    test('學生讀序號表 → 過（兌換要讀）', () => assertSucceeds(getDoc(doc(d.stu, 'mg_config/gift_codes'))));
    test('學生寫設定 → 不過', () => assertFails(setDoc(doc(d.stu, 'mg_config/settings'), { a: 2 })));
    test('學生寫序號表（used: increment 舊路）→ 不過', () => assertFails(setDoc(doc(d.stu, 'mg_config/gift_codes'), { codes: { h: { used: 1 } } }, { merge: true })));
    test('學生開舊房間 mg_config/nwroom_x → 不過（已改走 mg_rooms）', () => assertFails(setDoc(doc(d.stu, 'mg_config/nwroom_x'), { mk: 'coo' })));
    test('老師寫設定 → 過', () => assertSucceeds(setDoc(doc(d.teacher, 'mg_config/settings'), { a: 2 }, { merge: true })));
    test('不是老師的登入帳號寫設定 → 不過', () => assertFails(setDoc(doc(d.notTeacher, 'mg_config/settings'), { a: 2 })));
    test('學生寫開戰狀態 mg_round → 不過', () => assertFails(setDoc(doc(d.stu, 'mg_round/current'), { state: 'running' })));
    test('老師寫 mg_round → 過', () => assertSucceeds(setDoc(doc(d.teacher, 'mg_round/current'), { state: 'running' })));
    test('學生讀 mg_round → 過', () => assertSucceeds(getDoc(doc(d.stu, 'mg_round/current'))));
    test('學生寫題庫 → 不過', () => assertFails(setDoc(doc(d.stu, 'mg_bank/main'), { p: [] })));
    test('老師寫題庫 → 過', () => assertSucceeds(setDoc(doc(d.teacher, 'mg_bank/main'), { p: [] })));
    test('學生讀題庫 → 過', () => assertSucceeds(getDoc(doc(d.stu, 'mg_bank/main'))));
  });

  describe('mg_config/nw_vote', () => {
    test('學生投票（只動 v）→ 過', () => assertSucceeds(setDoc(doc(d.stu, 'mg_config/nw_vote'), { v: { a: { me: 1 } } }, { merge: true })));
    test('學生提名（只動 noms）→ 過', () => assertSucceeds(setDoc(doc(d.stu, 'mg_config/nw_vote'), { noms: [{ id: 'x' }] }, { merge: true })));
    test('學生收回投票（updateDoc 只動 v）→ 過', () => assertSucceeds(updateDoc(doc(d.stu, 'mg_config/nw_vote'), { 'v.a.me': 1 })));
    test('文件還不存在時學生第一次提名 → 過', async () => {
      await seed(te, db => deleteDoc(doc(db, 'mg_config/nw_vote')));
      await assertSucceeds(setDoc(doc(d.stu, 'mg_config/nw_vote'), { noms: [{ id: 'x' }] }, { merge: true }));
    });
    test('學生動 hidden → 不過', () => assertFails(setDoc(doc(d.stu, 'mg_config/nw_vote'), { hidden: ['x'] }, { merge: true })));
    test('學生整份覆寫、把隱藏清單清掉 → 不過', async () => {
      await seed(te, db => setDoc(doc(db, 'mg_config/nw_vote'), { noms: [], hidden: ['x'], v: { a: { me: 1 } }, votes: {} }));
      await assertFails(setDoc(doc(d.stu, 'mg_config/nw_vote'), { noms: [], hidden: [], v: {}, votes: {} }));
    });
    test('學生只動自己的票（v）→ 過；已知限制：v 整個清掉規則擋不住', async () => {
      await seed(te, db => setDoc(doc(db, 'mg_config/nw_vote'), { noms: [], hidden: ['x'], v: { a: { me: 1 } }, votes: {} }));
      await assertSucceeds(setDoc(doc(d.stu, 'mg_config/nw_vote'), { v: {} }, { merge: true }));
    });
    test('學生順手寫其他欄位 → 不過', () => assertFails(setDoc(doc(d.stu, 'mg_config/nw_vote'), { v: {}, evil: 1 }, { merge: true })));
    test('老師整份覆寫、隱藏 → 過', async () => {
      await assertSucceeds(setDoc(doc(d.teacher, 'mg_config/nw_vote'), { noms: [], hidden: ['x'], v: {}, votes: {} }));
    });
  });

  describe('mg_scores', () => {
    test('學生讀全部 → 過', () => assertSucceeds(getDocs(collection(d.stu, 'mg_scores'))));
    test('學生 create 自己的 → 過', () => assertSucceeds(setDoc(doc(d.stu, 'mg_scores/新_1號'), { name: 'a' })));
    test('學生 update（merge）→ 過', () => assertSucceeds(setDoc(doc(d.stu, 'mg_scores/' + ID), { nw: { x: 1 }, nwCls: '五年級4班', nwEvDone: [] }, { merge: true })));
    test('學生 delete → 不過', () => assertFails(deleteDoc(doc(d.stu, 'mg_scores/' + ID))));
    test('老師 delete → 過', () => assertSucceeds(deleteDoc(doc(d.teacher, 'mg_scores/' + ID))));
    test('未登入 → 不過', () => assertFails(getDoc(doc(d.anon, 'mg_scores/' + ID))));
  });

  describe('mg_rooms', () => {
    test('學生開房（寫 mg_rooms/班級_座號）→ 過', () => assertSucceeds(setDoc(doc(d.stu, 'mg_rooms/' + ID), { mk: 'coo', host: 'a', t: 1 })));
    test('學生讀房間列表 → 過', () => assertSucceeds(getDocs(collection(d.stu, 'mg_rooms'))));
    test('學生關房（delete）→ 過', async () => {
      await seed(te, db => setDoc(doc(db, 'mg_rooms/' + ID), { mk: 'coo' }));
      await assertSucceeds(deleteDoc(doc(d.stu, 'mg_rooms/' + ID)));
    });
    test('成員子集合 → 過', () => assertSucceeds(setDoc(doc(d.stu, `mg_rooms/${ID}/members/m1`), { a: 1 })));
  });

  describe('mg_nw_runs', () => {
    test('學生 create → 過', () => assertSucceeds(setDoc(doc(d.stu, 'mg_nw_runs/r1'), { a: 1 })));
    test('學生 update 已有的 → 不過', async () => {
      await seed(te, db => setDoc(doc(db, 'mg_nw_runs/r1'), { a: 1 }));
      await assertFails(setDoc(doc(d.stu, 'mg_nw_runs/r1'), { a: 2 }));
    });
    test('老師 update → 過', async () => {
      await seed(te, db => setDoc(doc(db, 'mg_nw_runs/r1'), { a: 1 }));
      await assertSucceeds(setDoc(doc(d.teacher, 'mg_nw_runs/r1'), { a: 2 }));
    });
  });

  describe('mg_nw_flags', () => {
    const bug = { type: 'bug', status: 'pending', docId: ID, cat: '畫面', text: '【我做了什麼】aaaa\n【錯誤狀況】bbbb', did: 'aaaa', what: 'bbbb', view: 'hub', cls: '五年級4班', seat: 5, name: '甲', t: 1 };
    const fb = { type: 'feedback', mk: 'coo', mon: '咕咕鳥', star: 1, rate: '好玩', text: 'ok', cls: '五年級4班', seat: 5, name: '甲', t: 1 };
    test('學生送回報（不帶 claimed）→ 過', () => assertSucceeds(setDoc(doc(d.stu, 'mg_nw_flags/b1'), bug)));
    test('學生送回報帶 claimed:false（舊版）→ 不過', () => assertFails(setDoc(doc(d.stu, 'mg_nw_flags/b1'), { ...bug, claimed: false })));
    test('學生送回饋 → 過', () => assertSucceeds(setDoc(doc(d.stu, 'mg_nw_flags/f2'), fb)));
    test('回饋逾時重送（同 ID、內容一樣）→ 過', async () => {
      await assertSucceeds(setDoc(doc(d.stu, 'mg_nw_flags/f2'), fb));
      await assertSucceeds(setDoc(doc(d.stu, 'mg_nw_flags/f2'), fb));
    });
    test('同 ID 改內容 → 不過', async () => {
      await assertSucceeds(setDoc(doc(d.stu, 'mg_nw_flags/f2'), fb));
      await assertFails(setDoc(doc(d.stu, 'mg_nw_flags/f2'), { ...fb, rate: '太難' }));
    });
    test('學生自己建「已確認」的回報 → 不過', () => assertFails(setDoc(doc(d.stu, 'mg_nw_flags/b2'), { ...bug, status: 'approved' })));
    test('學生塞 sev 欄位（嚴重 3 分）→ 不過', () => assertFails(setDoc(doc(d.stu, 'mg_nw_flags/b2'), { ...bug, sev: 3 })));
    test('type 是 award → 不過', () => assertFails(setDoc(doc(d.stu, 'mg_nw_flags/a1'), { type: 'award', status: 'approved', award: 'bugking', docId: ID })));
    test('text 超過 400 字 → 不過', () => assertFails(setDoc(doc(d.stu, 'mg_nw_flags/b3'), { ...bug, text: 'x'.repeat(401) })));
    test('did 超過 200 字 → 不過', () => assertFails(setDoc(doc(d.stu, 'mg_nw_flags/b3'), { ...bug, did: 'x'.repeat(201) })));
    test('what 超過 200 字 → 不過', () => assertFails(setDoc(doc(d.stu, 'mg_nw_flags/b3'), { ...bug, what: 'x'.repeat(201) })));
    test('換名紀錄 namechg → 過', () => assertSucceeds(setDoc(doc(d.stu, 'mg_nw_flags/namechg_x_abcd1234'), { type: 'namechg', status: 'pending', docId: ID, cls: '五年級4班', seat: 5, name: '乙', oldName: '甲', t: 1 })));
    test('學生讀 flags（get）→ 不過', () => assertFails(getDoc(doc(d.stu, 'mg_nw_flags/f1'))));
    test('學生查詢 flags（舊的 claimBugs）→ 不過', () => assertFails(getDocs(query(collection(d.stu, 'mg_nw_flags'), where('type', '==', 'bug'), where('docId', '==', ID)))));
    test('學生改已有的 flag（舊的 claimed:true）→ 不過', () => assertFails(setDoc(doc(d.stu, 'mg_nw_flags/f1'), { claimed: true }, { merge: true })));
    test('學生刪 flag → 不過', () => assertFails(deleteDoc(doc(d.stu, 'mg_nw_flags/f1'))));
    test('老師讀、改狀態、刪 → 過', async () => {
      await assertSucceeds(getDocs(query(collection(d.teacher, 'mg_nw_flags'), where('type', '==', 'bug'))));
      await assertSucceeds(setDoc(doc(d.teacher, 'mg_nw_flags/f1'), { status: 'approved' }, { merge: true }));
      await assertSucceeds(deleteDoc(doc(d.teacher, 'mg_nw_flags/f1')));
    });
    test('老師頒獎（award）→ 過', () => assertSucceeds(setDoc(doc(d.teacher, 'mg_nw_flags/award_x'), { type: 'award', status: 'approved' })));
  });

  describe('mg_gift_used', () => {
    const H = 'a'.repeat(64), K = `${H}_${ID}`;
    test('學生 create {h,id,t} → 過', () => assertSucceeds(setDoc(doc(d.stu, 'mg_gift_used/' + K), { h: H, id: ID, t: Date.now() })));
    test('同一人第二次 → 不過（變成 update）', async () => {
      await assertSucceeds(setDoc(doc(d.stu, 'mg_gift_used/' + K), { h: H, id: ID, t: 1 }));
      await assertFails(setDoc(doc(d.stu, 'mg_gift_used/' + K), { h: H, id: ID, t: 2 }));
    });
    test('缺 h → 不過', () => assertFails(setDoc(doc(d.stu, 'mg_gift_used/' + K), { id: ID, t: 1 })));
    test('多塞欄位 → 不過', () => assertFails(setDoc(doc(d.stu, 'mg_gift_used/' + K), { h: H, id: ID, t: 1, x: 1 })));
    test('學生刪 → 不過', async () => {
      await seed(te, db => setDoc(doc(db, 'mg_gift_used/' + K), { h: H, id: ID, t: 1 }));
      await assertFails(deleteDoc(doc(d.stu, 'mg_gift_used/' + K)));
    });
    test('學生數次數（count 查詢）→ 過', async () => {
      await seed(te, db => setDoc(doc(db, 'mg_gift_used/' + K), { h: H, id: ID, t: 1 }));
      const c = await assertSucceeds(getCountFromServer(query(collection(d.stu, 'mg_gift_used'), where('h', '==', H))));
      if (c.data().count !== 1) throw new Error('count 應為 1');
    });
    test('老師刪（重設某人的領取）→ 過', async () => {
      await seed(te, db => setDoc(doc(db, 'mg_gift_used/' + K), { h: H, id: ID, t: 1 }));
      await assertSucceeds(deleteDoc(doc(d.teacher, 'mg_gift_used/' + K)));
    });
  });

  describe('mg_clock', () => {
    test('學生寫 {t: serverTimestamp} 再讀 → 過', async () => {
      await assertSucceeds(setDoc(doc(d.stu, 'mg_clock/' + ID), { t: serverTimestamp() }));
      await assertSucceeds(getDoc(doc(d.stu, 'mg_clock/' + ID)));
    });
    test('學生再寫一次（update）→ 過', async () => {
      await assertSucceeds(setDoc(doc(d.stu, 'mg_clock/' + ID), { t: serverTimestamp() }));
      await assertSucceeds(setDoc(doc(d.stu, 'mg_clock/' + ID), { t: serverTimestamp() }));
    });
    test('塞別的欄位 → 不過', () => assertFails(setDoc(doc(d.stu, 'mg_clock/' + ID), { t: serverTimestamp(), x: 1 })));
  });

  for (const col of ['mg_mail', 'mg_events', 'mg_news', 'mg_bugboard']) {
    describe(col, () => {
      test('學生讀 → 過', () => assertSucceeds(getDocs(collection(d.stu, col))));
      test('學生寫 → 不過', () => assertFails(setDoc(doc(d.stu, `${col}/z1`), { a: 1 })));
      test('學生改已有的 → 不過', () => assertFails(setDoc(doc(d.stu, `${col}/${col === 'mg_bugboard' ? ID : 'm1'}`), { a: 2 }, { merge: true })));
      test('學生刪 → 不過', () => assertFails(deleteDoc(doc(d.stu, `${col}/${col === 'mg_bugboard' ? ID : 'm1'}`))));
      test('老師寫 → 過', () => assertSucceeds(setDoc(doc(d.teacher, `${col}/z1`), { a: 1 })));
      test('不是老師的登入帳號寫 → 不過', () => assertFails(setDoc(doc(d.notTeacher, `${col}/z1`), { a: 1 })));
      test('未登入讀 → 不過', () => assertFails(getDocs(collection(d.anon, col))));
    });
  }
  describe('mg_bugboard 查詢', () => {
    test('學生讀前 10 名（orderBy score limit）→ 過', async () => {
      const { orderBy, limit } = await import('firebase/firestore');
      await assertSucceeds(getDocs(query(collection(d.stu, 'mg_bugboard'), orderBy('score', 'desc'), limit(10))));
    });
  });
  /* 老師打的理由與真名放 mg_bugboard_private（只有老師讀得到）；mg_bugboard 學生讀得到，裡面不能有真名 */
  describe('mg_bugboard_private（老師專用）', () => {
    const P = 'mg_bugboard_private/' + ID;
    beforeEach(async () => { await seed(te, db => setDoc(doc(db, P), { notes: [{ pts: 2, why: '口頭回報', t: 1 }], nameOk: '甲' })); });
    test('老師讀、寫 → 過', async () => {
      await assertSucceeds(getDoc(doc(d.teacher, P)));
      await assertSucceeds(getDocs(collection(d.teacher, 'mg_bugboard_private')));
      await assertSucceeds(setDoc(doc(d.teacher, P), { nameOk: '乙' }, { merge: true }));
    });
    test('學生讀單份 → 不過', () => assertFails(getDoc(doc(d.stu, P))));
    test('學生列出整個集合 → 不過', () => assertFails(getDocs(collection(d.stu, 'mg_bugboard_private'))));
    test('學生寫、刪 → 不過', async () => {
      await assertFails(setDoc(doc(d.stu, P), { nameOk: '偽' }, { merge: true }));
      await assertFails(deleteDoc(doc(d.stu, P)));
    });
    test('不是老師的登入帳號讀、寫 → 不過', async () => {
      await assertFails(getDoc(doc(d.notTeacher, P)));
      await assertFails(setDoc(doc(d.notTeacher, P), { a: 1 }));
    });
    test('未登入讀 → 不過', () => assertFails(getDoc(doc(d.anon, P))));
    test('老師用教師頁的 publicBoard() 寫抓蟲榜：學生讀得到，但裡面沒有真名與理由欄位', async () => {
      const dirty = { className: '五年級4班', seat: 5, score: 3, n: 1, firstAt: 5, bonus: 2, hideNick: false, nameOkH: 'abc', nameOk: '甲', notes: [{ pts: 2, why: '口頭回報', t: 1 }],
        reports: [{ id: 'f1', st: 'approved', sev: 1, t: 5, reply: '謝謝', name: '甲', text: '很長的內容' }] };
      const b = writeBatch(d.teacher);
      b.set(doc(d.teacher, 'mg_bugboard/' + ID), publicBoard(dirty));
      b.set(doc(d.teacher, P), { notes: dirty.notes, nameOk: dirty.nameOk });
      await assertSucceeds(b.commit());
      const got = (await assertSucceeds(getDoc(doc(d.stu, 'mg_bugboard/' + ID)))).data(), txt = JSON.stringify(got);
      if ('nameOk' in got || 'notes' in got || txt.includes('甲') || txt.includes('口頭回報') || txt.includes('很長的內容')) throw new Error('學生讀得到真名或理由：' + txt);
      if (got.nameOkH !== 'abc' || got.bonus !== 2 || got.reports[0].reply !== '謝謝' || got.reports[0].name !== undefined) throw new Error('公開欄位不對：' + txt);
    });
  });
  /* 教師頁的批次（回報審核、手動加分、發獎）一次寫很多份：確認規則沒有卡住 */
  describe('老師的批次寫入', () => {
    test('一次 20 人手動加分（抓蟲榜＋專用資料＋信＋紀錄）→ 過', async () => {
      const b = writeBatch(d.teacher);
      for (let i = 0; i < 20; i++) {
        const id = '五年級4班_' + (i + 1) + '號';
        b.set(doc(d.teacher, 'mg_bugboard/' + id), { score: 2, bonus: 2 }, { merge: true });
        b.set(doc(d.teacher, 'mg_bugboard_private/' + id), { notes: [{ pts: 2, why: 'x', t: 1 }] }, { merge: true });
        b.set(doc(d.teacher, 'mg_mail/bonus_' + id + '_1'), { aud: ['id:' + id], title: 't', body: '', items: [], t: 1 });
        b.set(doc(d.teacher, 'mg_admin_log/l_' + i), { act: '抓蟲手動加分', t: 1 });
      }
      await assertSucceeds(b.commit());
    });
    test('學生帳號同樣的批次 → 不過', async () => {
      const b = writeBatch(d.stu);
      b.set(doc(d.stu, 'mg_bugboard/' + ID), { score: 99 }, { merge: true });
      await assertFails(b.commit());
    });
  });
  describe('mg_mail 查詢', () => {
    test('學生用 array-contains-any 查自己的信 → 過', () => assertSucceeds(getDocs(query(collection(d.stu, 'mg_mail'), where('aud', 'array-contains-any', ['all', 'cls:五年級4班', 'id:' + ID])))));
  });

  describe('mg_admin_log', () => {
    test('老師 create → 過', () => assertSucceeds(setDoc(doc(d.teacher, 'mg_admin_log/l1'), { act: 'x' })));
    test('老師讀 → 過', () => assertSucceeds(getDocs(collection(d.teacher, 'mg_admin_log'))));
    test('老師改、刪紀錄 → 不過（只能新增）', async () => {
      await seed(te, db => setDoc(doc(db, 'mg_admin_log/l1'), { act: 'x' }));
      await assertFails(setDoc(doc(d.teacher, 'mg_admin_log/l1'), { act: 'y' }));
      await assertFails(deleteDoc(doc(d.teacher, 'mg_admin_log/l1')));
    });
    test('學生讀、寫 → 不過', async () => {
      await assertFails(getDocs(collection(d.stu, 'mg_admin_log')));
      await assertFails(setDoc(doc(d.stu, 'mg_admin_log/l2'), { act: 'x' }));
    });
  });

  describe('沒寫到的集合', () => {
    test('預設全擋', () => assertFails(setDoc(doc(d.teacher, 'whatever/x'), { a: 1 })));
  });
});
