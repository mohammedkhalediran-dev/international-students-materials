import Database from 'better-sqlite3';
import { copyFileSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { AdAccountInput, BusinessInput, inputs, ProfileInput, ProxyInput, SocialInput } from '../../shared/contract';
import { normalizeUrl } from '../../shared/url';
import { AuditLog, sanitize } from '../audit';
import { AppError } from '../errors';
import { listIntegrations } from '../integrations';
import { Services } from '../services';
import { MIGRATIONS, SCHEMA_VERSION, Store } from '../store';
import { check, run, testSecretBox } from './harness';

const rejects = async (fn: () => unknown, label: string, match?: RegExp) => {
  try { await fn(); check(false, label); } catch (e) { check(e instanceof AppError ? !match || match.test(e.message) : !!e, label); }
};
const parseFails = (schema: { safeParse: (v: unknown) => { success: boolean } }, v: unknown, label: string) => check(!schema.safeParse(v).success, label);

run('طبقة البيانات: المخطط، القيود، السياسات، النسخ الاحتياطي', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'bh-unit-'));
  const store = new Store(join(dir, 'bh.sqlite'), join(dir, 'backups'));
  const svc = new Services(store, testSecretBox(), new AuditLog(store));

  check(store.schemaVersion() === SCHEMA_VERSION && store.integrity() === 'ok', 'المخطط مُطبَّق وسلامة القاعدة ok');
  check((store.db.pragma('foreign_keys', { simple: true }) as number) === 1, 'المفاتيح الأجنبية مفعّلة');
  check(svc.overview().counts.businesses === 0 && svc.overview().businesses.length === 0, 'لا بيانات مزروعة افتراضياً');
  check(svc.listCampaigns().length === 0, 'لا حملات مختلقة');

  // ───── الأنشطة والحسابات: 30 نشاطاً و120 حساباً ─────
  const cats = ['مطاعم', 'أزياء', 'تجميل'];
  const biz = [] as ReturnType<Services['createBusiness']>[];
  for (let i = 1; i <= 30; i++) biz.push(svc.createBusiness(BusinessInput.parse({ name: `نشاط ${i}`, category: cats[i % 3], color: '#6366F1' })));
  let socialCount = 0;
  for (const b of biz) for (const platform of ['instagram', 'facebook', 'whatsapp', 'tiktok'] as const) {
    svc.createSocial(SocialInput.parse({ businessId: b.id, platform, displayName: `${b.name} ${platform}`, usernameOrNumber: `${platform}_${b.name}` }));
    socialCount++;
  }
  const c = svc.overview().counts;
  check(c.businesses === 30 && c.socialAccounts === 120 && socialCount === 120, '30 نشاطاً و120 حساباً اجتماعياً في SQLite');
  check(svc.listBusinesses({ status: 'active', query: 'نشاط 1' }).length === 11, 'بحث الأنشطة (نشاط 1، 10..19)');
  check(svc.listBusinesses({ status: 'active', category: 'مطاعم' }).length === 10, 'تصفية الفئة');
  check(svc.listSocial({ platform: 'whatsapp' }).length === 30 && svc.listSocial({ businessId: biz[0].id }).length === 4, 'تصفية الحسابات حسب المنصة/النشاط');
  check(svc.listBusinesses({ status: 'active', query: '%' }).length === 0, 'محرف % لا يُعامل كنمط بحث');

  // ───── القيود ─────
  await rejects(() => svc.createBusiness(BusinessInput.parse({ name: 'نشاط 1', category: 'x', color: '#000000' })), 'منع اسم نشاط مكرر', /بنفس الاسم/);
  await rejects(() => svc.createBusiness(BusinessInput.parse({ name: 'نشاط 1', category: 'x', color: '#000000' })), 'منع اسم مكرر (حساسية الحالة لا تهم)');
  await rejects(() => svc.createSocial(SocialInput.parse({ businessId: biz[0].id, platform: 'instagram', displayName: 'مكرر', usernameOrNumber: 'INSTAGRAM_نشاط 1' })), 'منع حساب مكرر (منصة + معرّف) لنفس النشاط', /مسجّل/);
  await rejects(() => svc.createSocial({ ...SocialInput.parse({ businessId: '00000000-0000-4000-8000-000000000000', platform: 'tiktok', displayName: 'x' }) }), 'منع نشاط غير موجود', /غير موجود/);
  let fkBlocked = false;
  try { store.db.prepare("INSERT INTO social_accounts (id,business_id,platform,display_name,created_at,updated_at) VALUES ('x','nope','instagram','x',1,1)").run(); } catch { fkBlocked = true; }
  check(fkBlocked, 'القاعدة نفسها ترفض مرجعاً يتيماً (FOREIGN KEY)');
  let enumBlocked = false;
  try { store.db.prepare("INSERT INTO ad_accounts (id,business_id,provider,display_name,connection_status,created_at,updated_at) VALUES ('y',?, 'meta','x','connected-fake',1,1)").run(biz[0].id); } catch { enumBlocked = true; }
  check(enumBlocked, 'CHECK يرفض قيمة تعداد غير صالحة');

  // ───── التحقق (Zod) ─────
  parseFails(BusinessInput, { name: '  ', category: 'x', color: '#000000' }, 'رفض اسم فارغ');
  parseFails(BusinessInput, { name: 'x', category: 'x', color: 'red' }, 'رفض لون غير صالح');
  parseFails(SocialInput, { businessId: biz[0].id, platform: 'myspace', displayName: 'x' }, 'رفض منصة غير معروفة');
  parseFails(SocialInput, { businessId: biz[0].id, platform: 'instagram', displayName: 'x', url: 'javascript:alert(1)' }, 'رفض رابط javascript:');
  parseFails(ProfileInput, { businessId: biz[0].id, name: 'x', homeUrl: 'file:///etc/passwd' }, 'رفض رابط file:');
  parseFails(ProxyInput, { name: 'p', scheme: 'http', host: 'bad host', port: 80 }, 'رفض عنوان بروكسي غير صالح');
  parseFails(ProxyInput, { name: 'p', scheme: 'http', host: 'a.com', port: 70000 }, 'رفض منفذ خارج المدى');
  parseFails(ProxyInput, { name: 'p', scheme: 'socks5', host: 'a.com', port: 1080, username: 'u', password: 'p' }, 'رفض مصادقة SOCKS5 صراحةً (قيد Chromium)');
  parseFails(inputs['businesses:delete'], { id: 'not-a-uuid', confirmName: 'x' }, 'رفض معرّف غير UUID في قنوات IPC');
  check(!('eval' in inputs) && Object.keys(inputs).every((k) => /^[a-z]+:[A-Za-z]+$/.test(k)), 'قائمة قنوات IPC محددة وضيقة');
  check(normalizeUrl('data:text/html,x', true) === null && normalizeUrl('file:///c:/', true) === null && normalizeUrl('view-source:https://a.com', true) === null, 'حظر البروتوكولات الخطرة');

  // ───── ملفات المتصفح ─────
  const b0 = biz[0];
  const ig = svc.listSocial({ businessId: b0.id, platform: 'instagram' })[0];
  const prof = svc.createProfile(ProfileInput.parse({ businessId: b0.id, socialAccountId: ig.id, name: 'ملف 1', homeUrl: 'instagram.com' }));
  check(prof.homeUrl === 'https://instagram.com/' && prof.partitionId === `profile-${prof.id}`, 'ملف بجلسة partitionId خاصة وURL مُطبَّع');
  let immutable = false;
  try { store.db.prepare("UPDATE browser_profiles SET partition_id='hacked' WHERE id=?").run(prof.id); } catch { immutable = true; }
  check(immutable, 'partitionId غير قابل للتعديل (trigger)');
  svc.updateProfile(prof.id, ProfileInput.parse({ businessId: b0.id, socialAccountId: null, name: 'ملف 1 معدّل', homeUrl: '' }));
  check(svc.getProfile(prof.id)!.partitionId === prof.partitionId, 'التعديل لا يغيّر partitionId');
  await rejects(() => svc.updateProfile(prof.id, ProfileInput.parse({ businessId: biz[1].id, name: 'x' })), 'منع نقل الملف إلى نشاط آخر');
  await rejects(() => svc.createProfile(ProfileInput.parse({ businessId: biz[1].id, socialAccountId: ig.id, name: 'x' })), 'منع ربط حساب نشاط آخر', /نشاطاً آخر/);
  await rejects(() => svc.createProfile(ProfileInput.parse({ businessId: b0.id, name: 'ملف 1 معدّل' })), 'منع اسم ملف مكرر في النشاط');
  const dup = svc.duplicateProfile(prof.id);
  check(dup.id !== prof.id && dup.partitionId !== prof.partitionId && dup.name.includes('نسخة') && dup.lastOpenedAt === null, 'النسخ: ملف جديد بجلسة جديدة فارغة (بيانات وصفية فقط)');

  // ───── البروكسي: السر منفصل ومشفّر ─────
  const px = await svc.createProxy(ProxyInput.parse({ name: 'بروكسي 1', scheme: 'http', host: 'Proxy.Example.com', port: 8080, username: 'u', password: 'TopSecret-999' }));
  check(px.hasSecret && !JSON.stringify(px).includes('TopSecret') && px.host === 'proxy.example.com', 'البروكسي المعاد للواجهة بلا سر');
  store.db.pragma('wal_checkpoint(TRUNCATE)');
  const raw = readdirSync(dir).filter((f) => f.startsWith('bh.sqlite')).map((f) => readFileSync(join(dir, f)).toString('latin1')).join('');
  check(!raw.includes('TopSecret-999'), 'السر غير موجود كنص صريح في ملفات القاعدة');
  check((store.db.prepare('SELECT COUNT(*) c FROM proxy_secrets').get() as { c: number }).c === 1 && !('password' in (store.db.prepare('SELECT * FROM proxies').get() as object)), 'السر في جدول منفصل');
  check((await svc.proxyForLaunch(px.id))?.credentials?.password === 'TopSecret-999', 'فك التشفير للتشغيل فقط (العملية الرئيسية)');
  await svc.updateProxy(px.id, ProxyInput.parse({ name: 'بروكسي 1', scheme: 'http', host: 'proxy.example.com', port: 3128, username: 'u' }));
  check((await svc.proxyForLaunch(px.id))?.credentials?.password === 'TopSecret-999', 'التعديل بلا كلمة مرور يُبقي السر');
  svc.updateProfile(prof.id, ProfileInput.parse({ businessId: b0.id, name: 'ملف 1 معدّل', proxyId: px.id }));
  check(svc.getProfile(prof.id)!.proxyName === 'بروكسي 1', 'ربط البروكسي بالملف');
  const noEnc = new Services(store, testSecretBox(false), new AuditLog(store));
  await rejects(() => noEnc.createProxy(ProxyInput.parse({ name: 'بلا تشفير', scheme: 'http', host: 'a.com', port: 80, username: 'u', password: 'x' })), 'بدون تشفير النظام: يرفض حفظ كلمة المرور (لا نص صريح)');
  check((await noEnc.createProxy(ProxyInput.parse({ name: 'مفتوح', scheme: 'socks5', host: 'a.com', port: 1080 }))).hasSecret === false, 'بروكسي بلا مصادقة يُحفظ بدون تشفير');
  svc.deleteProxy(px.id);
  check(svc.getProfile(prof.id)!.proxyId === null && (store.db.prepare('SELECT COUNT(*) c FROM proxy_secrets').get() as { c: number }).c === 0, 'حذف البروكسي: الملف يصبح مباشراً والسر يُحذف');

  // ───── الحسابات الإعلانية: لا اتصال مزيّف ─────
  const ad = svc.createAd(AdAccountInput.parse({ businessId: b0.id, provider: 'meta', displayName: 'إعلانات 1', externalId: 'act_123' }));
  check(ad.connectionStatus === 'not_connected', 'الحساب الإعلاني يُنشأ not_connected');
  await rejects(() => svc.createAd(AdAccountInput.parse({ businessId: biz[1].id, provider: 'meta', displayName: 'مكرر', externalId: 'act_123' })), 'منع معرّف إعلاني مكرر لنفس المزوّد');
  const ints = listIntegrations(store.db);
  check(ints.length === 3 && ints.every((i) => i.status === 'not_configured'), 'التكاملات الثلاثة not_configured بلا إعدادات (لا ادّعاء اتصال)');

  // ───── سياسة حذف النشاط ─────
  await rejects(() => svc.deleteBusiness(b0.id, b0.name), 'الحذف النهائي مرفوض لنشاط غير مؤرشف', /مؤرشفة/);
  check(svc.getBusiness(b0.id) !== null, 'النشاط النشط لم يُحذف');
  svc.setBusinessStatus(b0.id, 'archived');
  check(svc.getBusiness(b0.id)!.platformCounts.instagram === 1 && svc.getBusiness(b0.id)!.platformCounts.tiktok === 1, 'عدّادات المنصات لكل نشاط');
  await rejects(() => svc.deleteBusiness(b0.id, 'اسم خاطئ'), 'الحذف يتطلب اسم التأكيد الصحيح', /لا يطابق/);
  check(svc.getBusiness(b0.id) !== null, 'لم يُحذف النشاط عند التأكيد الخاطئ');
  const before = svc.overview().counts;
  const res = svc.deleteBusiness(b0.id, b0.name);
  const after = svc.overview().counts;
  check(res.removedSocial === 4 && res.removedProfiles === 2 && res.removedAds === 1, 'تقرير الحذف المتسلسل');
  check(after.businesses === before.businesses && after.socialAccounts === 116 && after.profiles === 0 && after.adAccounts === 0, 'الحذف تسلسلي: الحسابات والملفات والإعلانية');
  check(svc.listProxies().length === 1, 'البروكسيات المشتركة لا تُحذف مع النشاط');
  svc.setBusinessStatus(biz[1].id, 'archived');
  check(svc.listBusinesses({ status: 'archived' }).length === 1 && svc.listBusinesses({ status: 'active' }).length === 28 && svc.listBusinesses({ status: 'all' }).length === 29, 'الأرشفة والتصفية حسب الحالة');

  // ───── التدقيق ─────
  const ev = svc.audit.list(500);
  check(ev.some((e) => e.eventType === 'business.delete') && ev.some((e) => e.eventType === 'proxy.create'), 'أحداث التدقيق مسجّلة');
  check(!JSON.stringify(ev).includes('TopSecret') && !JSON.stringify(ev).includes('secret_enc'), 'سجل التدقيق بلا أسرار');
  const s = sanitize({ password: 'x', proxyPassword: 'y', token: 'z', name: 'ok', long: 'a'.repeat(500), nested: { a: 1 } });
  check(!('password' in s) && !('proxyPassword' in s) && !('token' in s) && s.name === 'ok' && (s.long as string).length <= 201 && !('nested' in s), 'تنظيف بيانات التدقيق الوصفية');

  // ───── نسخ احتياطي واستعادة ─────
  const bk = join(dir, 'manual.sqlite');
  const size = await store.backupTo(bk);
  check(size > 0 && Store.validate(bk).ok, 'نسخة احتياطية سليمة تجتاز الفحص');
  const countBefore = svc.overview().counts.businesses;
  svc.createBusiness(BusinessInput.parse({ name: 'بعد النسخة', category: 'x', color: '#111111' }));
  const rr = await store.restoreFrom(bk);
  check(svc.overview().counts.businesses === countBefore && svc.listBusinesses({ status: 'all', query: 'بعد النسخة' }).length === 0, 'الاستعادة أعادت الحالة وقت النسخة');
  check(readdirSync(join(dir, 'backups')).includes(rr.preRestoreBackup), 'حُفظت نسخة قبل الاستعادة تلقائياً');
  const junk = join(dir, 'junk.sqlite');
  writeFileSync(junk, 'this is not a database at all');
  check(!Store.validate(junk).ok, 'رفض ملف ليس SQLite');
  await rejects(() => store.restoreFrom(junk), 'الاستعادة ترفض الملف الفاسد', /لا يمكن استعادة/);
  const foreign = join(dir, 'foreign.sqlite');
  const f = new Database(foreign); f.exec('CREATE TABLE x(a)'); f.close();
  check(!Store.validate(foreign).ok, 'رفض قاعدة غريبة (ليست BusinessHub)');
  const corrupt = join(dir, 'corrupt.sqlite');
  copyFileSync(bk, corrupt);
  const buf = readFileSync(corrupt);
  for (let i = 4096; i < Math.min(buf.length, 12288); i += 7) buf[i] = 0xff;
  writeFileSync(corrupt, buf);
  check(!Store.validate(corrupt).ok, 'رفض نسخة تالفة (فشل فحص السلامة)');
  check(svc.overview().counts.businesses === countBefore, 'البيانات الحالية سليمة بعد محاولات الاستعادة الفاشلة');

  // ───── نسخ تلقائية ─────
  const t0 = Date.now();
  const a1 = await store.autoBackup(86_400_000, 3, t0);
  check(a1 !== null && Store.validate(a1).ok, 'نسخة تلقائية أولى سليمة');
  check((await store.autoBackup(86_400_000, 3, t0 + 1000)) === null, 'لا نسخة تلقائية جديدة خلال 24 ساعة');
  for (let i = 1; i <= 4; i++) { await new Promise((r) => setTimeout(r, 15)); await store.autoBackup(0, 3, t0 + i * 2 * 86_400_000); }
  check(readdirSync(join(dir, 'backups')).filter((f) => f.startsWith('auto-') && f.endsWith('.sqlite')).length === 3, 'الاحتفاظ بآخر 3 نسخ تلقائية فقط');
  check(!readdirSync(join(dir, 'backups')).some((f) => /\.sqlite-(wal|shm)$/.test(f)), 'لا ملفات -wal/-shm يتيمة بجوار النسخ الاحتياطية');

  // ───── استعادة نسخة بمخطط قديم (v1) ← هجرة تلقائية مع نسخة احتياطية ─────
  const v1 = join(dir, 'v1.sqlite');
  const o = new Database(v1); o.exec(MIGRATIONS[0]); o.pragma('user_version = 1');
  o.prepare("INSERT INTO businesses (id,name,category,color,status,created_at,updated_at) VALUES ('11111111-1111-4111-8111-111111111111','نشاط قديم','x','#000000','active',1,1)").run(); o.close();
  check(Store.validate(v1).ok, 'نسخة v1 تجتاز التحقق');
  await store.restoreFrom(v1);
  check(store.schemaVersion() === SCHEMA_VERSION && svc.getBusiness('11111111-1111-4111-8111-111111111111')?.name === 'نشاط قديم', 'استعادة v1 رُقّيت تلقائياً إلى المخطط الحالي مع بقاء البيانات');
  check(readdirSync(join(dir, 'backups')).some((f) => f.startsWith('pre-migration-v1-')), 'نسخة احتياطية تلقائية قبل الهجرة');
  check(store.integrity() === 'ok' && (store.db.prepare('SELECT COUNT(*) c FROM meta_connections').get() as { c: number }).c === 0, 'القاعدة المرقّاة سليمة وجداول Meta موجودة');
  store.db.prepare("DELETE FROM businesses WHERE id='11111111-1111-4111-8111-111111111111'").run();
  store.close();
  const store2 = new Store(join(dir, 'bh.sqlite'), join(dir, 'backups'));
  check(new Services(store2, testSecretBox(), new AuditLog(store2)).overview().counts.businesses === 0, 'إعادة فتح القاعدة تحفظ الحالة (بعد استعادة v1 الفارغة)');
  store2.close();
});
