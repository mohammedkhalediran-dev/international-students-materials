import { safeStorage } from 'electron';
import { AppError } from './errors';

/** تشفير الأسرار. التنفيذ الحقيقي يستخدم safeStorage (DPAPI على ويندوز). */
export interface SecretBox {
  available(): Promise<{ available: boolean; backend: string }>;
  encrypt(plain: string): Promise<string>;
  decrypt(stored: string): Promise<string>;
}

const PREFIX = 'v1:';

export const electronSecretBox: SecretBox = {
  async available() {
    const available = await safeStorage.isAsyncEncryptionAvailable();
    let backend = process.platform === 'win32' ? 'dpapi' : process.platform === 'darwin' ? 'keychain' : 'unknown';
    if (process.platform === 'linux' && typeof safeStorage.getSelectedStorageBackend === 'function') backend = safeStorage.getSelectedStorageBackend();
    return { available, backend };
  },
  async encrypt(plain) {
    if (!(await safeStorage.isAsyncEncryptionAvailable())) {
      throw new AppError('تشفير النظام غير متاح على هذا الجهاز؛ لن تُحفظ كلمة مرور البروكسي (لا نخزّن أسراراً كنص صريح).');
    }
    return PREFIX + (await safeStorage.encryptStringAsync(plain)).toString('base64');
  },
  async decrypt(stored) {
    if (!stored.startsWith(PREFIX)) throw new AppError('صيغة السر المحفوظ غير معروفة.');
    try {
      return (await safeStorage.decryptStringAsync(Buffer.from(stored.slice(PREFIX.length), 'base64'))).result;
    } catch {
      throw new AppError('تعذّر فك تشفير كلمة مرور البروكسي. أعد إدخالها.');
    }
  },
};
