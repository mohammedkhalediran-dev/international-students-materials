import type { GroupInput, ProfileInput, ProxyType } from '../shared/types';
import { normalizeUrl } from '../shared/url';
import { AppError } from './errors';

const PROXY_TYPES: ProxyType[] = ['none', 'http', 'https', 'socks4', 'socks5'];
const HOST_RE = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*$/i;
// eslint-disable-next-line no-control-regex
const CONTROL_RE = /[\u0000-\u001f\u007f]/;

function obj(v: unknown): Record<string, unknown> {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) throw new AppError('بيانات غير صالحة.');
  return v as Record<string, unknown>;
}

function str(o: Record<string, unknown>, key: string, max: number, label: string, required = false): string {
  const v = o[key];
  if (v === undefined || v === null) {
    if (required) throw new AppError(`${label} مطلوب.`);
    return '';
  }
  if (typeof v !== 'string') throw new AppError(`${label} غير صالح.`);
  const t = v.trim();
  if (required && !t) throw new AppError(`${label} مطلوب.`);
  if (t.length > max) throw new AppError(`${label} طويل جداً (الحد ${max} حرفاً).`);
  return t;
}

export function parseProfileInput(raw: unknown): ProfileInput {
  const o = obj(raw);
  const name = str(o, 'name', 80, 'اسم الملف', true);
  const notes = str(o, 'notes', 2000, 'الملاحظات');
  const userAgent = str(o, 'userAgent', 300, 'وكيل المستخدم');
  if (CONTROL_RE.test(userAgent)) throw new AppError('وكيل المستخدم يحتوي على محارف غير مسموحة.');

  let startUrl = str(o, 'startUrl', 2000, 'رابط البداية');
  if (startUrl) {
    const n = normalizeUrl(startUrl, false);
    if (!n) throw new AppError('رابط البداية يجب أن يكون http أو https.');
    startUrl = n;
  }

  let groupId: number | null = null;
  if (o.groupId !== null && o.groupId !== undefined) {
    if (typeof o.groupId !== 'number' || !Number.isInteger(o.groupId) || o.groupId <= 0) throw new AppError('التصنيف غير صالح.');
    groupId = o.groupId;
  }

  const proxyType = o.proxyType as ProxyType;
  if (!PROXY_TYPES.includes(proxyType)) throw new AppError('نوع البروكسي غير صالح.');

  let proxyHost = '';
  let proxyPort: number | null = null;
  let proxyUsername = '';
  let proxyPassword = '';
  let clearProxyPassword = false;

  if (proxyType !== 'none') {
    proxyHost = str(o, 'proxyHost', 253, 'عنوان البروكسي', true).toLowerCase();
    if (!HOST_RE.test(proxyHost)) throw new AppError('عنوان البروكسي غير صالح.');
    const p = o.proxyPort;
    if (typeof p !== 'number' || !Number.isInteger(p) || p < 1 || p > 65535) throw new AppError('منفذ البروكسي يجب أن يكون بين 1 و65535.');
    proxyPort = p;
    proxyUsername = str(o, 'proxyUsername', 128, 'اسم مستخدم البروكسي');
    proxyPassword = typeof o.proxyPassword === 'string' ? o.proxyPassword : '';
    if (proxyPassword.length > 256) throw new AppError('كلمة مرور البروكسي طويلة جداً.');
    clearProxyPassword = o.clearProxyPassword === true;
    if ((proxyType === 'socks4' || proxyType === 'socks5') && (proxyUsername || proxyPassword)) {
      throw new AppError('Chromium لا يدعم مصادقة SOCKS باسم مستخدم وكلمة مرور. استخدم بروكسي HTTP/HTTPS أو اتركهما فارغين.');
    }
  }

  return { name, groupId, notes, startUrl, userAgent, proxyType, proxyHost, proxyPort, proxyUsername, proxyPassword, clearProxyPassword };
}

export function parseGroupInput(raw: unknown): GroupInput {
  const o = obj(raw);
  const name = str(o, 'name', 40, 'اسم التصنيف', true);
  const color = typeof o.color === 'string' ? o.color : '';
  if (!/^#[0-9a-f]{6}$/i.test(color)) throw new AppError('لون التصنيف غير صالح.');
  return { name, color: color.toLowerCase() };
}

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function parseProfileId(v: unknown): string {
  if (typeof v !== 'string' || !UUID_RE.test(v)) throw new AppError('معرّف الملف غير صالح.');
  return v.toLowerCase();
}

export function parseGroupId(v: unknown): number {
  if (typeof v !== 'number' || !Number.isInteger(v) || v <= 0) throw new AppError('معرّف التصنيف غير صالح.');
  return v;
}
