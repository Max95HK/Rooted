/* Built-in modules */
import { randomBytes, scrypt } from 'node:crypto';

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
