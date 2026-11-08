import { app } from 'electron';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import type { SecretBox } from '../secrets';

let failures = 0;
export function check(cond: unknown, label: string): void {
  if (cond) console.log(`  ✓ ${label}`);
  else {
    failures++;
    console.log(`  ✗ ${label}`);
  }
}

export async function run(name: string, fn: () => Promise<void>): Promise<void> {
  console.log(`# ${name}`);
  try {
    await fn();
  } catch (e) {
    failures++;
    console.log('  ✗ استثناء:', e instanceof Error ? e.stack : e);
  }
  console.log(failures === 0 ? 'RESULT: PASS' : `RESULT: FAIL (${failures})`);
  if (app?.exit) app.exit(failures === 0 ? 0 : 1);
  else process.exit(failures === 0 ? 0 : 1);
}

/** صندوق أسرار AES-256-GCM للاختبار فقط (safeStorage غير متاح على لينكس بلا keyring). */
export function testSecretBox(): SecretBox {
  const key = randomBytes(32);
  return {
    async encrypt(plain) {
      const iv = randomBytes(12);
      const c = createCipheriv('aes-256-gcm', key, iv);
      const enc = Buffer.concat([c.update(plain, 'utf8'), c.final()]);
      return 'test:' + Buffer.concat([iv, c.getAuthTag(), enc]).toString('base64');
    },
    async decrypt(stored) {
      const b = Buffer.from(stored.slice(5), 'base64');
      const d = createDecipheriv('aes-256-gcm', key, b.subarray(0, 12));
      d.setAuthTag(b.subarray(12, 28));
      return Buffer.concat([d.update(b.subarray(28)), d.final()]).toString('utf8');
    },
  };
}
