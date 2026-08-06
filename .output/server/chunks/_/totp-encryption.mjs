import { createDecipheriv, randomBytes, createCipheriv, createHash } from 'node:crypto';

const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;
function deriveKey(encryptionKey) {
  return createHash("sha256").update(encryptionKey).digest();
}
function encryptTotpSecret(secret, encryptionKey) {
  const key = deriveKey(encryptionKey);
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString("base64"), authTag.toString("base64"), encrypted.toString("base64")].join(":");
}
function decryptTotpSecret(payload, encryptionKey) {
  const [ivB64, authTagB64, encryptedB64] = payload.split(":");
  if (!ivB64 || !authTagB64 || !encryptedB64) {
    throw new Error("Malformed encrypted TOTP secret payload");
  }
  const key = deriveKey(encryptionKey);
  const iv = Buffer.from(ivB64, "base64");
  const authTag = Buffer.from(authTagB64, "base64");
  const encrypted = Buffer.from(encryptedB64, "base64");
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString("utf8");
}

export { decryptTotpSecret as d, encryptTotpSecret as e };
//# sourceMappingURL=totp-encryption.mjs.map
