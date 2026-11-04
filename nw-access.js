export const ACCESS_SCOPE = 'nw1';
export const ACCESS_PUB = {"kty":"EC","crv":"P-256","x":"96FAB8xp-OA9iOz8PW8OhJHcg2VM4EUwsdKhAvTralQ","y":"vy_23U6q4c7OIqEVq2pEalG07FE3KqNxGqs5Y6YodSs"};

const Z85 = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ.-:+=^!/*?&<>()[]{}@%$#';
const Z85_INDEX = (() => { const m = {}; for (let i = 0; i < 85; i++) m[Z85[i]] = i; return m; })();

export function z85encode(bytes) {
  let out = '';
  for (let i = 0; i < bytes.length; i += 4) {
    let v = ((bytes[i] << 24) | (bytes[i + 1] << 16) | (bytes[i + 2] << 8) | bytes[i + 3]) >>> 0;
    const ch = [];
    for (let k = 0; k < 5; k++) { ch.unshift(Z85[v % 85]); v = Math.floor(v / 85); }
    out += ch.join('');
  }
  return out;
}

export function z85decode(str) {
  if (str.length % 5) return null;
  const out = new Uint8Array(str.length / 5 * 4);
  for (let i = 0, o = 0; i < str.length; i += 5, o += 4) {
    let v = 0;
    for (let k = 0; k < 5; k++) {
      const d = Z85_INDEX[str[i + k]];
      if (d === undefined) return null;
      v = v * 85 + d;
    }
    if (v > 0xFFFFFFFF) return null;
    out[o] = (v >>> 24) & 255; out[o + 1] = (v >>> 16) & 255; out[o + 2] = (v >>> 8) & 255; out[o + 3] = v & 255;
  }
  return out;
}

export const payloadOf = docId => new TextEncoder().encode(`${ACCESS_SCOPE}|${docId}`);

export async function signCode(docId, privateJwk) {
  const key = await crypto.subtle.importKey('jwk', privateJwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, payloadOf(docId));
  return z85encode(new Uint8Array(sig));
}

export async function verifyCode(docId, code, publicJwk) {
  try {
    const pub = publicJwk || ACCESS_PUB;
    if (!pub || !docId || typeof code !== 'string') return false;
    const sig = z85decode(code.trim());
    if (!sig || sig.length !== 64) return false;
    const key = await crypto.subtle.importKey('jwk', pub, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
    return await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, key, sig, payloadOf(docId));
  } catch (e) { return false; }
}
