import { createServer, type Server } from 'node:http';
import { randomBytes } from 'node:crypto';
import type { AddressInfo } from 'node:net';
import { AppError } from '../errors';

export const META_SCOPES = ['ads_read', 'business_management'];

export interface OAuthSession {
  authUrl: string;
  redirectUri: string;
  /** يُحلّ عند وصول الرد؛ يُرفض عند الرفض/الانتهاء/عدم تطابق state */
  code: Promise<string>;
  cancel: () => void;
}

export function buildAuthUrl(opts: { dialogBase: string; version: string; appId: string; redirectUri: string; state: string; scopes: string[] }): string {
  const u = new URL(`${opts.dialogBase.replace(/\/$/, '')}/${opts.version}/dialog/oauth`);
  u.searchParams.set('client_id', opts.appId);
  u.searchParams.set('redirect_uri', opts.redirectUri);
  u.searchParams.set('state', opts.state);
  u.searchParams.set('response_type', 'code');
  u.searchParams.set('scope', opts.scopes.join(','));
  return u.toString();
}

const page = (title: string, body: string) =>
  `<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8"><title>${title}</title><body style="font-family:Segoe UI,Tahoma,sans-serif;background:#0b0f17;color:#e2e8f0;display:grid;place-items:center;height:100vh;margin:0"><div style="text-align:center"><h2>${title}</h2><p>${body}</p></div></body></html>`;

/**
 * يشغّل مستمعاً على 127.0.0.1 فقط لاستقبال رد OAuth (redirect URI حلقة مرتدة).
 * لا يقبل إلا المسار /meta/callback وبـ state مطابق، ويُغلق بعد أول رد أو عند انتهاء المهلة.
 */
export async function startLoopbackAuth(opts: { port: number; dialogBase: string; version: string; appId: string; scopes?: string[]; timeoutMs?: number }): Promise<OAuthSession> {
  const state = randomBytes(24).toString('hex');
  let server: Server | null = null;
  let settle!: { resolve: (c: string) => void; reject: (e: Error) => void };
  const code = new Promise<string>((resolve, reject) => { settle = { resolve, reject }; });
  code.catch(() => undefined); // يمنع unhandled rejection عند الإلغاء قبل الانتظار

  const close = () => { server?.close(); server?.closeAllConnections(); server = null; };
  const timer = setTimeout(() => { settle.reject(new AppError('انتهت مهلة تسجيل الدخول إلى Meta (5 دقائق).')); close(); }, opts.timeoutMs ?? 300_000);
  timer.unref();

  server = createServer((req, res) => {
    const u = new URL(req.url ?? '/', 'http://127.0.0.1');
    if (u.pathname !== '/meta/callback') { res.writeHead(404).end(); return; }
    const done = (status: number, title: string, msg: string) => { res.writeHead(status, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }).end(page(title, msg)); };
    if (u.searchParams.get('state') !== state) { done(400, 'طلب غير صالح', 'رمز state لا يطابق. أغلق هذه الصفحة وأعد المحاولة من التطبيق.'); return; }
    clearTimeout(timer);
    const err = u.searchParams.get('error');
    const c = u.searchParams.get('code');
    if (err || !c) {
      done(400, 'لم يكتمل التفويض', 'يمكنك إغلاق هذه الصفحة والعودة إلى BusinessHub Pro.');
      settle.reject(new AppError(err === 'access_denied' ? 'رُفض التفويض في Meta.' : 'لم يُرجع Meta رمز التفويض.'));
    } else {
      done(200, 'تم الربط بنجاح', 'يمكنك إغلاق هذه الصفحة والعودة إلى BusinessHub Pro.');
      settle.resolve(c);
    }
    setTimeout(close, 200);
  });
  await new Promise<void>((resolve, reject) => {
    server!.once('error', (e: NodeJS.ErrnoException) => reject(new AppError(e.code === 'EADDRINUSE' ? `المنفذ ${opts.port} مستخدم. أغلق البرنامج الذي يستخدمه أو غيّر المنفذ.` : 'تعذّر بدء مستمع OAuth المحلي.')));
    server!.listen(opts.port, '127.0.0.1', resolve);
  });
  const port = (server.address() as AddressInfo).port;
  const redirectUri = `http://127.0.0.1:${port}/meta/callback`;
  return {
    authUrl: buildAuthUrl({ dialogBase: opts.dialogBase, version: opts.version, appId: opts.appId, redirectUri, state, scopes: opts.scopes ?? META_SCOPES }),
    redirectUri,
    code,
    cancel: () => { clearTimeout(timer); settle.reject(new AppError('أُلغي تسجيل الدخول.')); close(); },
  };
}
