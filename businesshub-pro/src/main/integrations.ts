import type { Integration } from '../shared/contract';

/**
 * واجهات تكامل للقراءة فقط (هياكل مستقبلية). المرحلة 1: لا OAuth، لا طلبات شبكة، لا بيانات تجريبية.
 * أي تنفيذ مستقبلي يجب أن يطبّق ReadOnlyProvider ويُعيد بيانات حقيقية من المزوّد فقط.
 */
export interface ReadOnlyProvider {
  readonly id: Integration['id'];
  status(): 'not_connected';
  listCampaigns(): Promise<never[]>;
}

export const INTEGRATIONS: Integration[] = [
  {
    id: 'meta_marketing',
    name: 'Meta Marketing API',
    status: 'not_connected',
    description: 'قراءة الحملات والإنفاق لحسابات إعلانات فيسبوك وإنستغرام. غير مفعّلة في المرحلة 1.',
    requires: ['تطبيق Meta for Developers', 'ترخيص ads_read', 'OAuth من المالك'],
  },
  {
    id: 'tiktok_marketing',
    name: 'TikTok Marketing API',
    status: 'not_connected',
    description: 'قراءة حملات تيك توك الإعلانية. غير مفعّلة في المرحلة 1.',
    requires: ['حساب TikTok for Business Developer', 'اعتماد التطبيق', 'OAuth من المالك'],
  },
  {
    id: 'whatsapp_business',
    name: 'WhatsApp Business Platform',
    status: 'not_connected',
    description: 'ربط رقم واتساب للأعمال عبر المنصة الرسمية. غير مفعّل في المرحلة 1.',
    requires: ['حساب Meta Business', 'رقم هاتف موثّق', 'رمز وصول من المالك'],
  },
];

export const notConnectedProvider = (id: Integration['id']): ReadOnlyProvider => ({
  id,
  status: () => 'not_connected',
  listCampaigns: async () => [],
});
