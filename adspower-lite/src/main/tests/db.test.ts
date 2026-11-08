import { mkdtempSync, readFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { ProfileInput } from '../../shared/types';
import { normalizeUrl } from '../../shared/url';
import { openDatabase } from '../db';
import { AppError } from '../errors';
import { ProfileService } from '../profiles';
import { parseGroupInput, parseProfileInput } from '../validate';
import { check, run, testSecretBox } from './harness';

const base: ProfileInput = {
  name: 'متجر 1', groupId: null, notes: '', startUrl: '', userAgent: '', proxyType: 'none', proxyHost: '', proxyPort: null, proxyUsername: '',
};
const expectErr = (fn: () => unknown, label: string) => {
  try { fn(); check(false, label); } catch (e) { check(e instanceof AppError, label); }
};

run('SQLite + التحقق + تشفير كلمة المرور', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'adslite-db-'));
  const file = join(dir, 't.sqlite');
  const db = openDatabase(file);
  const svc = new ProfileService(db, testSecretBox());

  const g = svc.createGroup(parseGroupInput({ name: 'متاجر', color: '#10B981' }));
  check(g.color === '#10b981' && g.profileCount === 0, 'إنشاء تصنيف');
  expectErr(() => svc.createGroup({ name: 'متاجر', color: '#000000' }), 'منع تصنيف مكرر');

  const p = await svc.create(parseProfileInput({ ...base, groupId: g.id, notes: 'ملاحظة', startUrl: 'example.com', proxyType: 'http', proxyHost: 'Proxy.Example.com', proxyPort: 8080, proxyUsername: 'u1', proxyPassword: 'SuperSecret-123' }));
  check(p.startUrl === 'https://example.com/', 'تطبيع رابط البداية');
  check(p.proxyHost === 'proxy.example.com' && p.hasProxyPassword, 'حفظ بروكسي مع علامة كلمة مرور');
  check(!JSON.stringify(p).includes('SuperSecret'), 'الكائن المعاد للواجهة لا يحوي كلمة المرور');

  db.exec('PRAGMA wal_checkpoint(TRUNCATE)');
  const raw = readdirSync(dir).map((f) => readFileSync(join(dir, f)).toString('latin1')).join('');
  check(!raw.includes('SuperSecret-123'), 'كلمة المرور غير موجودة كنص صريح في ملفات SQLite');
  const stored = (db.prepare('SELECT proxy_password_enc AS e FROM profiles WHERE id=?').get(p.id) as { e: string }).e;
  check(stored.startsWith('test:'), 'العمود يحوي نصاً مشفّراً');
  const creds = await svc.getProxyCredentials(p.id);
  check(creds?.username === 'u1' && creds.password === 'SuperSecret-123', 'فك التشفير يعيد القيمة الأصلية');

  const kept = await svc.update(p.id, parseProfileInput({ ...base, name: 'متجر معدّل', groupId: g.id, proxyType: 'http', proxyHost: 'proxy.example.com', proxyPort: 3128, proxyUsername: 'u1' }));
  check(kept.name === 'متجر معدّل' && kept.hasProxyPassword && (await svc.getProxyCredentials(p.id))?.password === 'SuperSecret-123', 'التعديل بلا كلمة مرور يُبقي المحفوظة');
  const cleared = await svc.update(p.id, parseProfileInput({ ...base, proxyType: 'http', proxyHost: 'proxy.example.com', proxyPort: 3128, proxyUsername: 'u1', clearProxyPassword: true }));
  check(!cleared.hasProxyPassword && cleared.groupId === null, 'حذف كلمة المرور المحفوظة وإزالة التصنيف');
  const noProxy = await svc.update(p.id, parseProfileInput(base));
  check(noProxy.proxyType === 'none' && noProxy.proxyHost === '' && noProxy.proxyPort === null, 'تحويل إلى اتصال مباشر ينظّف حقول البروكسي');

  const p2 = await svc.create(parseProfileInput({ ...base, name: 'حساب إعلانات', notes: 'فيسبوك', groupId: g.id }));
  check(svc.list({ query: 'إعلانات', group: 'all' }).length === 1, 'البحث بالاسم');
  check(svc.list({ query: 'فيسبوك', group: 'all' }).length === 1, 'البحث بالملاحظات');
  check(svc.list({ query: 'متاجر', group: 'all' }).length === 1, 'البحث باسم التصنيف');
  check(svc.list({ query: '', group: g.id }).length === 1 && svc.list({ query: '', group: 'none' }).length === 1, 'التصفية حسب التصنيف / بدون تصنيف');
  check(svc.list({ query: '%', group: 'all' }).length === 0, 'محرف % لا يُعامل كنمط');
  check(svc.listGroups()[0].profileCount === 1, 'عدّاد ملفات التصنيف');

  svc.deleteGroup(g.id);
  check(svc.get(p2.id)?.groupId === null, 'حذف التصنيف يُبقي الملف بلا تصنيف');
  svc.remove(p2.id);
  check(svc.get(p2.id) === null, 'حذف الملف');

  expectErr(() => parseProfileInput({ ...base, name: '   ' }), 'رفض اسم فارغ');
  expectErr(() => parseProfileInput({ ...base, proxyType: 'http', proxyHost: 'a b', proxyPort: 80 }), 'رفض عنوان بروكسي غير صالح');
  expectErr(() => parseProfileInput({ ...base, proxyType: 'http', proxyHost: 'a.com', proxyPort: 70000 }), 'رفض منفذ خارج المدى');
  expectErr(() => parseProfileInput({ ...base, proxyType: 'socks5', proxyHost: 'a.com', proxyPort: 1080, proxyUsername: 'x' }), 'رفض مصادقة SOCKS');
  expectErr(() => parseProfileInput({ ...base, startUrl: 'javascript:alert(1)' }), 'رفض رابط javascript:');
  expectErr(() => parseProfileInput({ ...base, startUrl: 'file:///etc/passwd' }), 'رفض رابط file:');
  expectErr(() => parseProfileInput({ ...base, userAgent: 'a\nb' }), 'رفض محارف تحكم في User-Agent');
  expectErr(() => parseProfileInput(null), 'رفض مدخل غير كائن');
  expectErr(() => parseGroupInput({ name: 'x', color: 'red' }), 'رفض لون غير صالح');
  let missing = false;
  try { await svc.create({ ...base, groupId: 999 }); } catch (e) { missing = e instanceof AppError; }
  check(missing, 'رفض تصنيف غير موجود');

  check(normalizeUrl('localhost:3000', true) === 'http://localhost:3000/', 'localhost:3000 → http');
  check(normalizeUrl('مرحبا بالعالم', true)?.startsWith('https://duckduckgo.com/?q='), 'نص عادي → بحث');
  check(normalizeUrl('data:text/html,hi', true) === null && normalizeUrl('view-source:https://a.com', true) === null, 'منع data: وview-source:');

  db.close();
  const db2 = openDatabase(file);
  check(new ProfileService(db2, testSecretBox()).list({ query: '', group: 'all' }).length === 1, 'البيانات باقية بعد إعادة فتح القاعدة');
  db2.close();
});
