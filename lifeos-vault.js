/* Password-encrypted portable backups. No password or key is persisted. */
(function (global) {
  'use strict';
  const FORMAT = 'lifeos-encrypted-backup/1';
  const ITERATIONS = 600000;
  const LIMIT = 64 * 1024 * 1024;
  const encode = bytes => { let result = ''; for (let i = 0; i < bytes.length; i += 16384) result += String.fromCharCode(...bytes.subarray(i, i + 16384)); return btoa(result); };
  const decode = text => { if (typeof text !== 'string' || text.length > LIMIT * 1.4) throw new Error('Invalid encrypted backup.'); const binary = atob(text); return Uint8Array.from(binary, c => c.charCodeAt(0)); };
  async function key(password, salt, usage) {
    if (typeof password !== 'string' || !password.length) throw new Error('Enter the backup password.');
    const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' }, material, { name: 'AES-GCM', length: 256 }, false, usage);
  }
  async function encrypt(payload, password) {
    if (password.length < 12) throw new Error('Use a backup password of at least 12 characters.');
    const raw = new TextEncoder().encode(JSON.stringify(payload));
    if (raw.length > LIMIT) throw new Error('This backup is larger than this version can export. Your saved records are unchanged.');
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const secret = await key(password, salt, ['encrypt']);
    const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: new TextEncoder().encode(FORMAT) }, secret, raw);
    return { format: FORMAT, algorithm: 'AES-256-GCM', kdf: 'PBKDF2-SHA256', iterations: ITERATIONS, salt: encode(salt), iv: encode(iv), ciphertext: encode(new Uint8Array(encrypted)) };
  }
  async function decrypt(envelope, password) {
    if (!envelope || envelope.format !== FORMAT || envelope.algorithm !== 'AES-256-GCM' || envelope.kdf !== 'PBKDF2-SHA256' || envelope.iterations !== ITERATIONS) throw new Error('Choose a supported Life OS encrypted backup.');
    const salt = decode(envelope.salt), iv = decode(envelope.iv), ciphertext = decode(envelope.ciphertext);
    if (salt.length !== 16 || iv.length !== 12 || ciphertext.length < 16 || ciphertext.length > LIMIT + 16) throw new Error('This backup has an invalid format.');
    try {
      const secret = await key(password, salt, ['decrypt']);
      const raw = await crypto.subtle.decrypt({ name: 'AES-GCM', iv, additionalData: new TextEncoder().encode(FORMAT) }, secret, ciphertext);
      return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(raw));
    } catch (_) { throw new Error('The password is incorrect or the backup is damaged. Your current records have not changed.'); }
  }
  global.LifeOSVault = Object.freeze({ encrypt, decrypt, FORMAT, LIMIT });
})(window);
