export type ProxyType = 'none' | 'http' | 'https' | 'socks4' | 'socks5';

export interface Group {
  id: number;
  name: string;
  color: string;
  profileCount: number;
}

export interface Profile {
  id: string;
  name: string;
  groupId: number | null;
  notes: string;
  startUrl: string;
  userAgent: string;
  proxyType: ProxyType;
  proxyHost: string;
  proxyPort: number | null;
  proxyUsername: string;
  /** كلمة المرور لا تغادر العملية الرئيسية أبداً؛ الواجهة تعرف فقط هل هي محفوظة. */
  hasProxyPassword: boolean;
  createdAt: number;
  updatedAt: number;
  lastOpenedAt: number | null;
}

export interface ProfileInput {
  name: string;
  groupId: number | null;
  notes: string;
  startUrl: string;
  userAgent: string;
  proxyType: ProxyType;
  proxyHost: string;
  proxyPort: number | null;
  proxyUsername: string;
  /** فارغ/غير موجود = إبقاء المحفوظة. */
  proxyPassword?: string;
  clearProxyPassword?: boolean;
}

export interface GroupInput {
  name: string;
  color: string;
}

/** all = كل الملفات، none = بلا تصنيف، رقم = تصنيف محدد */
export interface ProfileFilter {
  query: string;
  group: 'all' | 'none' | number;
}

export type Result<T> = { ok: true; data: T } | { ok: false; error: string };

export interface Api {
  listProfiles(filter: ProfileFilter): Promise<Result<Profile[]>>;
  createProfile(input: ProfileInput): Promise<Result<Profile>>;
  updateProfile(id: string, input: ProfileInput): Promise<Result<Profile>>;
  deleteProfile(id: string): Promise<Result<null>>;
  launchProfile(id: string): Promise<Result<null>>;
  closeProfile(id: string): Promise<Result<null>>;
  runningProfiles(): Promise<Result<string[]>>;
  listGroups(): Promise<Result<Group[]>>;
  createGroup(input: GroupInput): Promise<Result<Group>>;
  updateGroup(id: number, input: GroupInput): Promise<Result<Group>>;
  deleteGroup(id: number): Promise<Result<null>>;
  onRunningChanged(cb: (ids: string[]) => void): () => void;
}

export type BarCommand =
  | { cmd: 'back' | 'forward' | 'reload' | 'stop' }
  | { cmd: 'navigate'; url: string };

export interface BarState {
  profileName: string;
  url: string;
  title: string;
  canGoBack: boolean;
  canGoForward: boolean;
  loading: boolean;
}

export interface BarApi {
  send(command: BarCommand): void;
  onState(cb: (s: BarState) => void): () => void;
  ready(): void;
}
