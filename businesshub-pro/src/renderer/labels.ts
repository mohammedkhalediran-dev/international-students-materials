import type { AccountStatus, AdProvider, BusinessStatus, ConnectionStatus, Platform } from '../shared/contract';

export const PLATFORM_LABEL: Record<Platform, string> = { instagram: 'إنستغرام', facebook: 'فيسبوك', whatsapp: 'واتساب للأعمال', tiktok: 'تيك توك' };
export const PLATFORM_COLOR: Record<Platform, string> = { instagram: '#e1306c', facebook: '#1877f2', whatsapp: '#25d366', tiktok: '#69c9d0' };
export const PROVIDER_LABEL: Record<AdProvider, string> = { meta: 'Meta (فيسبوك / إنستغرام)', tiktok: 'TikTok Ads' };
export const CONNECTION_LABEL: Record<ConnectionStatus, string> = { not_connected: 'غير متصل', pending: 'قيد الانتظار', connected: 'متصل', error: 'خطأ' };
export const BUSINESS_STATUS_LABEL: Record<BusinessStatus, string> = { active: 'نشط', archived: 'مؤرشف' };
export const ACCOUNT_STATUS_LABEL: Record<AccountStatus, string> = { active: 'نشط', inactive: 'غير نشط' };

const fmt = new Intl.DateTimeFormat('ar-u-nu-latn', { dateStyle: 'medium', timeStyle: 'short' });
export const formatDate = (ms: number | null): string => (ms ? fmt.format(ms) : '—');
export const formatBytes = (n: number): string => (n < 1024 ? `${n} B` : n < 1048576 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1048576).toFixed(1)} MB`);
