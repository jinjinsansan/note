import { createDecipheriv, createCipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const KEY = process.env.NOTE_ACCOUNT_SECRET_KEY;

const getKeyBuffer = () => {
  if (!KEY) {
    throw new Error("NOTE_ACCOUNT_SECRET_KEY is not set. Encryption is required.");
  }
  const buffer = Buffer.from(KEY, "base64");
  if (buffer.length !== 32) {
    throw new Error("NOTE_ACCOUNT_SECRET_KEY must be a 32-byte base64 string.");
  }
  return buffer;
};

export const encryptToken = (value: string): string => {
  const key = getKeyBuffer();

  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return Buffer.concat([iv, authTag, encrypted]).toString("base64");
};

export const decryptToken = (encoded: string): string => {
  const key = getKeyBuffer();

  const data = Buffer.from(encoded, "base64");
  const iv = data.subarray(0, 12);
  const authTag = data.subarray(12, 28);
  const encrypted = data.subarray(28);

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString("utf8");
};
