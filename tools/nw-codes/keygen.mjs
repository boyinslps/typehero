import { writeFileSync, existsSync } from 'node:fs';
const out = process.argv[2];
if (!out) { console.error('用法：node keygen.mjs <私鑰要存到哪裡>'); process.exit(1); }
if (existsSync(out)) { console.error('檔案已經存在，不覆蓋：' + out); process.exit(1); }
const { publicKey, privateKey } = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
const pub = await crypto.subtle.exportKey('jwk', publicKey);
const prv = await crypto.subtle.exportKey('jwk', privateKey);
writeFileSync(out, JSON.stringify(prv), { mode: 0o600 });
console.log(JSON.stringify({ kty: pub.kty, crv: pub.crv, x: pub.x, y: pub.y }));
