import { readFileSync, existsSync } from 'node:fs';
import { signCode, verifyCode, z85encode, z85decode, ACCESS_PUB } from '../../nw-access.js';
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };

const kp = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
const pub = await crypto.subtle.exportKey('jwk', kp.publicKey), prv = await crypto.subtle.exportKey('jwk', kp.privateKey);
const A = '五年級3班_5號', B = '五年級3班_6號';
const codeA = await signCode(A, prv);

ok(codeA.length === 80, `密語長度 ${codeA.length} 個字元`);
ok(/[a-z]/.test(codeA) && /[A-Z]/.test(codeA) && /[0-9]/.test(codeA) && /[^A-Za-z0-9]/.test(codeA), '同時有小寫、大寫、數字、特殊字元');
ok(await verifyCode(A, codeA, pub), '本人的密語通過');
ok(!(await verifyCode(B, codeA, pub)), '別的同學用這組密語：不通過');
ok(!(await verifyCode(A, codeA.slice(0, -5), pub)), '少一段：不通過');
ok(!(await verifyCode(A, codeA.slice(0, -1) + (codeA.endsWith('a') ? 'b' : 'a'), pub)), '改一個字元：不通過');
ok(!(await verifyCode(A, '', pub)) && !(await verifyCode(A, 'hello', pub)) && !(await verifyCode(A, '!'.repeat(80), pub)), '亂打、空白、全是驚嘆號：不通過');
const other = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
const codeX = await signCode(A, await crypto.subtle.exportKey('jwk', other.privateKey));
ok(!(await verifyCode(A, codeX, pub)), '用別把私鑰簽的：不通過');
const bytes = new Uint8Array(64).map((_, i) => (i * 37 + 11) & 255);
ok(JSON.stringify([...z85decode(z85encode(bytes))]) === JSON.stringify([...bytes]), 'Z85 編碼可以來回');
ok(ACCESS_PUB && ACCESS_PUB.kty === 'EC', '網站裡放的是公鑰');
const priv = new URL('../../.nw-private/nw-access-private.jwk', import.meta.url);
if (existsSync(priv)) {
  const real = await signCode(A, JSON.parse(readFileSync(priv, 'utf8')));
  ok(await verifyCode(A, real), '真正的私鑰簽出來的密語，能通過網站裡的公鑰');
}
process.exit(fails ? 1 : 0);
