export const DEFAULT_CODE_HASH = '34db4e6a86bbba5ad1574338ad700909081f2b072dd2ecf0fc0fda7c689270b5';

export async function sha256Hex(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}

export const cleanCode = v => String(v || '').replace(/[\s​-‍﻿]/g, '');
