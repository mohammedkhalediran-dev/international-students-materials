const BLOCKED_SCHEME = /^(javascript|data|file|vbscript|chrome|chrome-extension|devtools|view-source|blob|filesystem|ftp):/i;

function isHostLike(s: string): boolean {
  if (/\s/.test(s)) return false;
  const host = s.split(/[/?#]/, 1)[0].replace(/:\d+$/, '');
  return host === 'localhost' || /^\d{1,3}(\.\d{1,3}){3}$/.test(host) || /^[^.\s]+(\.[^.\s]+)+$/.test(host);
}

function isLocalHost(s: string): boolean {
  const host = s.split(/[/?#]/, 1)[0].replace(/:\d+$/, '');
  return host === 'localhost' || /^\d{1,3}(\.\d{1,3}){3}$/.test(host);
}

/**
 * يحوّل ما يكتبه المستخدم إلى رابط http/https صالح، أو null إن كان غير مسموح.
 * allowSearch: النص العادي يتحول إلى بحث DuckDuckGo (شريط العنوان فقط).
 */
export function normalizeUrl(input: string, allowSearch: boolean): string | null {
  const s = input.trim();
  if (!s) return null;
  if (s.toLowerCase() === 'about:blank') return 'about:blank';
  if (BLOCKED_SCHEME.test(s)) return null;
  try {
    if (/^https?:\/\//i.test(s)) {
      const u = new URL(s);
      return u.protocol === 'http:' || u.protocol === 'https:' ? u.href : null;
    }
    if (isHostLike(s)) {
      const u = new URL((isLocalHost(s) ? 'http://' : 'https://') + s);
      return u.href;
    }
  } catch {
    return null;
  }
  if (!allowSearch) return null;
  return 'https://duckduckgo.com/?q=' + encodeURIComponent(s);
}
