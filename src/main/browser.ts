import { app, BaseWindow, session, WebContentsView, type Session, type WebContents } from 'electron';
import { BAR_STATE, type BarCommand, type BarState, type BrowserProfile } from '../shared/contract';
import { normalizeUrl } from '../shared/url';
import { AppError } from './errors';
import type { Services } from './services';

/** اسم الجلسة الدائمة؛ partitionId ثابت ولا يتغير أبداً لنفس الملف. */
export const sessionPartition = (partitionId: string): string => `persist:${partitionId}`;

const BAR_HEIGHT = 46;
const MAX_AUTH_ATTEMPTS = 3;

interface Running {
  profile: BrowserProfile;
  window: BaseWindow;
  bar: WebContentsView;
  content: WebContentsView;
  proxy: { host: string; port: number; credentials: { username: string; password: string } | null } | null;
  authAttempts: number;
}

export interface BrowserManagerOptions {
  loadBar: (wc: WebContents) => Promise<void>;
  barPreload: string;
  onChange: (ids: string[]) => void;
  audit?: (event: string, profileId: string) => void;
}

export class BrowserManager {
  private readonly running = new Map<string, Running>();

  constructor(
    private readonly svc: Services,
    private readonly opts: BrowserManagerOptions,
  ) {}

  /** مصادقة البروكسي تصل عبر حدث login؛ لا يُرسل الاعتماد إلا لخادم البروكسي المضبوط. */
  registerAppHandlers(): void {
    app.on('login', (event, wc, _details, authInfo, callback) => {
      if (!authInfo.isProxy || !wc) return;
      const r = this.findByContents(wc);
      if (!r?.proxy?.credentials) return;
      if (authInfo.host.toLowerCase() !== r.proxy.host || authInfo.port !== r.proxy.port) return;
      event.preventDefault();
      if (r.authAttempts++ >= MAX_AUTH_ATTEMPTS) {
        callback();
        return;
      }
      callback(r.proxy.credentials.username, r.proxy.credentials.password);
    });
    app.on('before-quit', () => this.closeAll());
  }

  runningIds(): string[] {
    return [...this.running.keys()];
  }
  isRunning(id: string): boolean {
    return this.running.has(id);
  }
  contentsOf(id: string): WebContents | null {
    return this.running.get(id)?.content.webContents ?? null;
  }
  isBarSender(wc: WebContents): boolean {
    for (const r of this.running.values()) if (r.bar.webContents === wc) return true;
    return false;
  }
  private findByContents(wc: WebContents): Running | undefined {
    for (const r of this.running.values()) if (r.content.webContents === wc || r.bar.webContents === wc) return r;
    return undefined;
  }

  async launch(id: string, openUrl?: string): Promise<void> {
    const existing = this.running.get(id);
    if (existing) {
      if (existing.window.isMinimized()) existing.window.restore();
      existing.window.focus();
      if (openUrl) existing.content.webContents.loadURL(openUrl).catch(() => undefined);
      return;
    }
    const profile = this.svc.getProfile(id);
    if (!profile) throw new AppError('ملف المتصفح غير موجود.');
    const proxy = profile.proxyId ? await this.svc.proxyForLaunch(profile.proxyId) : null;
    if (this.running.has(id)) return;

    const part = sessionPartition(profile.partitionId);
    await this.configureSession(session.fromPartition(part), proxy);

    const window = new BaseWindow({ width: 1280, height: 820, minWidth: 640, minHeight: 420, title: profile.name, backgroundColor: '#0b0f17' });
    const secure = { sandbox: true, contextIsolation: true, nodeIntegration: false } as const;
    const content = new WebContentsView({ webPreferences: { ...secure, partition: part } });
    const bar = new WebContentsView({ webPreferences: { ...secure, preload: this.opts.barPreload } });
    window.contentView.addChildView(content);
    window.contentView.addChildView(bar);

    const r: Running = { profile, window, bar, content, proxy: proxy ? { host: proxy.host, port: proxy.port, credentials: proxy.credentials } : null, authAttempts: 0 };
    this.running.set(id, r);

    const layout = () => {
      const { width, height } = window.getContentBounds();
      bar.setBounds({ x: 0, y: 0, width, height: BAR_HEIGHT });
      content.setBounds({ x: 0, y: BAR_HEIGHT, width, height: Math.max(0, height - BAR_HEIGHT) });
    };
    layout();
    window.on('resize', layout);
    window.on('closed', () => {
      this.running.delete(id);
      for (const v of [content, bar]) if (!v.webContents.isDestroyed()) v.webContents.close();
      this.opts.audit?.('profile.close', id);
      this.opts.onChange(this.runningIds());
    });

    this.wireContent(r);
    await this.opts.loadBar(bar.webContents);
    this.svc.touchProfileOpened(id);
    this.opts.audit?.('profile.launch', id);
    this.opts.onChange(this.runningIds());
    content.webContents.loadURL(openUrl ?? profile.homeUrl ?? 'about:blank').catch(() => undefined);
  }

  /** فتح رابط خارجي (بعد التحقق) داخل ملف محدد، وتشغيله إن لزم. */
  async openUrlIn(id: string, rawUrl: string): Promise<void> {
    const url = normalizeUrl(rawUrl, false);
    if (!url || url === 'about:blank') throw new AppError('الرابط يجب أن يكون http أو https صالحاً.');
    await this.launch(id, url);
  }

  private async configureSession(ses: Session, proxy: Awaited<ReturnType<Services['proxyForLaunch']>>): Promise<void> {
    await ses.setProxy(proxy ? { mode: 'fixed_servers', proxyRules: `${proxy.scheme}://${proxy.host}:${proxy.port}` } : { mode: 'direct' });
    // صلاحيات الجهاز (كاميرا، ميكروفون، موقع، إشعارات…) مرفوضة افتراضياً.
    ses.setPermissionRequestHandler((_wc, _perm, cb) => cb(false));
    ses.setPermissionCheckHandler(() => false);
  }

  private wireContent(r: Running): void {
    const wc = r.content.webContents;
    const push = () => this.pushState(r);
    for (const ev of ['did-navigate', 'did-navigate-in-page', 'did-start-loading', 'did-stop-loading', 'did-fail-load'] as const) wc.on(ev as 'did-navigate', push);
    wc.on('did-finish-load', () => {
      r.authAttempts = 0;
    });
    wc.on('page-title-updated', (_e, title) => {
      if (!r.window.isDestroyed()) r.window.setTitle(title ? `${r.profile.name} — ${title}` : r.profile.name);
      push();
    });
    wc.setWindowOpenHandler(({ url }) => {
      const safe = normalizeUrl(url, false);
      if (safe && safe !== 'about:blank') wc.loadURL(safe).catch(() => undefined);
      return { action: 'deny' };
    });
    wc.on('will-navigate', (e, url) => {
      if (!normalizeUrl(url, false)) e.preventDefault();
    });
    r.bar.webContents.on('did-finish-load', push);
  }

  private pushState(r: Running): void {
    if (r.bar.webContents.isDestroyed() || r.content.webContents.isDestroyed()) return;
    const wc = r.content.webContents;
    const state: BarState = {
      profileName: `${r.profile.businessName} · ${r.profile.name}`,
      url: wc.getURL(), title: wc.getTitle(), canGoBack: wc.navigationHistory.canGoBack(),
      canGoForward: wc.navigationHistory.canGoForward(), loading: wc.isLoading(),
    };
    r.bar.webContents.send(BAR_STATE, state);
  }

  handleBarCommand(sender: WebContents, command: BarCommand): void {
    const r = this.findByContents(sender);
    if (!r || r.bar.webContents !== sender) return;
    const wc = r.content.webContents;
    switch (command.cmd) {
      case 'back': if (wc.navigationHistory.canGoBack()) wc.navigationHistory.goBack(); break;
      case 'forward': if (wc.navigationHistory.canGoForward()) wc.navigationHistory.goForward(); break;
      case 'reload': wc.reload(); break;
      case 'stop': wc.stop(); break;
      case 'navigate': {
        if (typeof command.url !== 'string' || command.url.length > 2000) return;
        const url = normalizeUrl(command.url, true);
        if (url) wc.loadURL(url).catch(() => undefined);
        break;
      }
    }
  }

  sendInitialState(sender: WebContents): void {
    const r = this.findByContents(sender);
    if (r) this.pushState(r);
  }

  close(id: string): void {
    this.running.get(id)?.window.close();
  }
  closeAll(): void {
    for (const id of this.runningIds()) this.close(id);
  }

  /** يمسح كل بيانات جلسة ملف (كوكيز، تخزين، كاش) ويغلق نافذته. */
  async wipeSession(profile: { id: string; partitionId: string }): Promise<void> {
    this.close(profile.id);
    const ses = session.fromPartition(sessionPartition(profile.partitionId));
    await ses.clearStorageData();
    await ses.clearCache();
    await ses.clearAuthCache();
    await ses.clearHostResolverCache();
  }
}
