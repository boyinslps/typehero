export const DEFAULT_CODE_HASH = '745b7ae6ef73cb5e8985b0dabf828c29e01c8ca8282b1508e6eb92b667fd4bd1';

export async function sha256Hex(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}

export const cleanCode = v => String(v || '').replace(/[\s​-‍﻿]/g, '');
