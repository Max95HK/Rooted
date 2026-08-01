/* Built-in modules */
import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

export const hashPassword = async (password: string) => {
  const salt = randomBytes(16).toString('hex');
  const hash = await scryptAsync(password, salt);

  return `${salt}:${hash.toString('hex')}`;
};

const scryptAsync = async (password: string, salt: string) => {
  return new Promise<Buffer<ArrayBuffer>>((resolve, reject) => {
    scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) return reject(err);
      resolve(derivedKey);
    });
  });
};

export const verifyPassword = async (
  rawPassword: string,
  storedPasswordHash: string,
) => {
  const [salt, storedHashHex] = storedPasswordHash.split(':');
  const storedHashBuffer = Buffer.from(storedHashHex, 'hex');
  const computedHashBuffer = await scryptAsync(rawPassword, salt);

  return timingSafeEqual(storedHashBuffer, computedHashBuffer);
};

export const generateApiKey = () => {
  const rawApiKey = randomBytes(32).toString('base64');
  const apiKeyHash = createHash('sha256').update(rawApiKey).digest('hex');
  const apiKeyPrefix = rawApiKey.slice(0, 8);

  return {
    rawApiKey,
    apiKeyHash,
    apiKeyPrefix,
  };
};
