import { app, BaseWindow, session, WebContentsView, type Session, type WebContents } from 'electron';
import { CH } from '../shared/channels';
import type { BarCommand, BarState, Profile } from '../shared/types';
import { normalizeUrl } from '../shared/url';
import { AppError } from './errors';
import type { ProfileService } from './profiles';

export const partitionFor = (profileId: string): string => `persist:profile-${profileId}`;

const BAR_HEIGHT = 46;
const MAX_AUTH_ATTEMPTS = 3;

interface Running {
  profile: Profile;
  window: BaseWindow;
  bar: WebContentsView;
  content: WebContentsView;
  credentials: { username: string; password: string } | null;
  authAttempts: number;
}

export interface BrowserManagerOptions {
  /** يحمّل صفحة شريط العنوان داخل WebContents المعطى */
  loadBar: (wc: WebContents) => Promise<void>;
  barPreload: string;
  onChange: (runningIds: string[]) => void;
}

export function proxyRulesFor(p: Pick<Profile, 'proxyType' | 'proxyHost' | 'proxyPort'>): string | null {
  if (p.proxyType === 'none') return null;
  return `${p.proxyType}://${p.proxyHost}:${p.proxyPort}`;
}

export class BrowserManager {
  private readonly running = new Map<string, Running>();

  constructor(
    private readonly profiles: ProfileService,
    private readonly opts: BrowserManagerOptions,
  ) {}

  /** يُستدعى مرة واحدة: مصادقة البروكسي تأتي عبر حدث login على مستوى التطبيق. */
  registerAppHandlers(): void {
    app.on('login', (event, wc, _details, authInfo, callback) => {
      if (!authInfo.isProxy) return;
      const r = wc ? this.findByContents(wc) : undefined;
      if (!r || !r.credentials) return;
      // لا نرسل الاعتماد إلا للبروكسي المضبوط لهذا الملف.
      if (authInfo.host.toLowerCase() !== r.profile.proxyHost) return;
      event.preventDefault();
      if (r.authAttempts++ >= MAX_AUTH_ATTEMPTS) {
        callback(); // إلغاء بعد فشل متكرر بدل حلقة لا تنتهي
        return;
      }
      callback(r.credentials.username, r.credentials.password);
    });
    app.on('before-quit', () => this.closeAll());
  }

  runningIds(): string[] {
    return [...this.running.keys()];
  }

  isRunning(id: string): boolean {
    return this.running.has(id);
  }

  /** WebContents صفحة الويب لملف قيد التشغيل (للاختبارات). */
  contentsOf(id: string): WebContents | null {
    return this.running.get(id)?.content.webContents ?? null;
  }

  isBarSender(wc: WebContents): boolean {
    for (const r of this.running.values()) if (r.bar.webContents === wc) return true;
    return false;
  }

  private findByContents(wc: WebContents): Running | undefined {
    for (const r of this.running.values()) {
      if (r.content.webContents === wc || r.bar.webContents === wc) return r;
    }
    return undefined;
  }

  async launch(id: string): Promise<void> {
    const existing = this.running.get(id);
    if (existing) {
      if (existing.window.isMinimized()) existing.window.restore();
      existing.window.focus();
      return;
    }
    const profile = this.profiles.get(id);
    if (!profile) throw new AppError('الملف غير موجود.');
    const credentials = await this.profiles.getProxyCredentials(id);
    if (this.running.has(id)) return; // سباق: تم التشغيل أثناء الانتظار

    const ses = session.fromPartition(partitionFor(id));
    await this.configureSession(ses, profile);

    const window = new BaseWindow({ width: 1280, height: 820, minWidth: 640, minHeight: 420, title: profile.name, backgroundColor: '#0b0f17' });
    const secure = { sandbox: true, contextIsolation: true, nodeIntegration: false } as const;
    const content = new WebContentsView({ webPreferences: { ...secure, partition: partitionFor(id) } });
    const bar = new WebContentsView({ webPreferences: { ...secure, preload: this.opts.barPreload } });
    window.contentView.addChildView(content);
    window.contentView.addChildView(bar);

    const r: Running = { profile, window, bar, content, credentials, authAttempts: 0 };
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
      this.opts.onChange(this.runningIds());
    });

    this.wireContent(r);
    await this.opts.loadBar(bar.webContents);

    if (profile.userAgent) content.webContents.setUserAgent(profile.userAgent);
    this.profiles.touchOpened(id);
    this.opts.onChange(this.runningIds());
    // الفشل في تحميل الصفحة (انقطاع، بروكسي خاطئ) لا يمنع النافذة من العمل.
    content.webContents.loadURL(profile.startUrl || 'about:blank').catch(() => undefined);
  }

  private async configureSession(ses: Session, profile: Profile): Promise<void> {
    const rules = proxyRulesFor(profile);
    await ses.setProxy(rules ? { mode: 'fixed_servers', proxyRules: rules } : { mode: 'direct' });
    // صلاحيات الجهاز (كاميرا، موقع، إشعارات...) مرفوضة افتراضياً.
    ses.setPermissionRequestHandler((_wc, _perm, cb) => cb(false));
    ses.setPermissionCheckHandler(() => false);
    if (profile.userAgent) ses.setUserAgent(profile.userAgent);
  }

  private wireContent(r: Running): void {
    const wc = r.content.webContents;
    const push = () => this.pushState(r);
    for (const ev of ['did-navigate', 'did-navigate-in-page', 'did-start-loading', 'did-stop-loading', 'did-fail-load'] as const) {
      wc.on(ev as 'did-navigate', push);
    }
    wc.on('did-finish-load', () => {
      r.authAttempts = 0;
    });
    wc.on('page-title-updated', (_e, title) => {
      if (!r.window.isDestroyed()) r.window.setTitle(title ? `${r.profile.name} — ${title}` : r.profile.name);
      push();
    });
    // لا صفحات تُفتح خارج جلسة الملف: النوافذ المنبثقة تُحمّل في نفس العرض.
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
      profileName: r.profile.name,
      url: wc.getURL(),
      title: wc.getTitle(),
      canGoBack: wc.navigationHistory.canGoBack(),
      canGoForward: wc.navigationHistory.canGoForward(),
      loading: wc.isLoading(),
    };
    r.bar.webContents.send(CH.barState, state);
  }

  /** أوامر شريط العنوان؛ المرسل يجب أن يكون شريطاً مسجّلاً. */
  handleBarCommand(sender: WebContents, command: BarCommand): void {
    const r = this.findByContents(sender);
    if (!r || r.bar.webContents !== sender) return;
    const wc = r.content.webContents;
    switch (command.cmd) {
      case 'back':
        if (wc.navigationHistory.canGoBack()) wc.navigationHistory.goBack();
        break;
      case 'forward':
        if (wc.navigationHistory.canGoForward()) wc.navigationHistory.goForward();
        break;
      case 'reload':
        wc.reload();
        break;
      case 'stop':
        wc.stop();
        break;
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

  /** حذف كل بيانات جلسة الملف (كوكيز، تخزين محلي، كاش) عند حذف الملف. */
  async wipeSession(id: string): Promise<void> {
    this.close(id);
    const ses = session.fromPartition(partitionFor(id));
    await ses.clearStorageData();
    await ses.clearCache();
    await ses.clearAuthCache();
    await ses.clearHostResolverCache();
  }
}
