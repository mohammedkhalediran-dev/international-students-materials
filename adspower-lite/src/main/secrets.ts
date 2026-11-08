import { safeStorage } from 'electron';
import { AppError } from './errors';

/** تشفير الأسرار قبل حفظها. التنفيذ الحقيقي يستخدم safeStorage (DPAPI على ويندوز). */
export interface SecretBox {
  encrypt(plain: string): Promise<string>;
  decrypt(stored: string): Promise<string>;
}

const PREFIX = 'v1:';

export const electronSecretBox: SecretBox = {
  async encrypt(plain) {
    if (!(await safeStorage.isAsyncEncryptionAvailable())) {
      throw new AppError('تشفير النظام غير متاح على هذا الجهاز، لذلك لا يمكن حفظ كلمة مرور البروكسي.');
    }
    const buf = await safeStorage.encryptStringAsync(plain);
    return PREFIX + buf.toString('base64');
  },
  async decrypt(stored) {
    if (!stored.startsWith(PREFIX)) throw new AppError('صيغة كلمة المرور المحفوظة غير معروفة.');
    try {
      const { result } = await safeStorage.decryptStringAsync(Buffer.from(stored.slice(PREFIX.length), 'base64'));
      return result;
    } catch {
      throw new AppError('تعذّر فك تشفير كلمة مرور البروكسي. أعد إدخالها من شاشة التعديل.');
    }
  },
};
