/**
 * AboutSection — "عننا" footer section for the customer storefront.
 *
 * Features:
 * - Configurable text from app_settings (about_text key)
 * - Social media links (facebook, instagram, telegram)
 * - Controlled by feature gate: 'about_section' can be toggled by developer
 * - Falls back to default text if not configured
 */
import { Facebook, Instagram, Send } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { TENANT_CONFIG } from '../config/tenant';

type AboutSettings = {
  aboutText: string;
  facebookUrl: string;
  instagramUrl: string;
  telegramUrl: string;
  showAboutSection: boolean;
};

const defaults: AboutSettings = {
  aboutText: `نحن ${TENANT_CONFIG.brandName} — منصة B2B عربية متكاملة لإدارة طلبات المنتجات بين العميل والتاجر. نوفر تجربة سلسة وسريعة للطلب والتوصيل مع دعم فني متواصل. هدفنا تسهيل التجارة وتوفير وقتك.`,
  facebookUrl: '',
  instagramUrl: '',
  telegramUrl: '',
  showAboutSection: true,
};

function useAboutSettings(): AboutSettings {
  const { data } = useQuery({
    queryKey: ['app-settings', 'about-section'],
    queryFn: async () => {
      const { data } = await supabase
        .from('app_settings')
        .select('key, value')
        .in('key', ['about_text', 'facebook_url', 'instagram_url', 'telegram_url', 'show_about_section']);
      if (!data?.length) return defaults;
      const map = Object.fromEntries(data.map((r) => [r.key, typeof r.value === 'string' ? r.value : String(r.value ?? '')]));
      return {
        aboutText: map.about_text || defaults.aboutText,
        facebookUrl: map.facebook_url || defaults.facebookUrl,
        instagramUrl: map.instagram_url || defaults.instagramUrl,
        telegramUrl: map.telegram_url || defaults.telegramUrl,
        showAboutSection: map.show_about_section !== 'false',
      };
    },
    staleTime: 5 * 60_000,
  });

  return data || defaults;
}

const socialLinks = [
  { key: 'facebook', icon: Facebook, color: 'bg-blue-500 hover:bg-blue-600', label: 'فيسبوك' },
  { key: 'instagram', icon: Instagram, color: 'bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 hover:from-purple-600 hover:via-pink-600 hover:to-orange-500', label: 'انستجرام' },
  { key: 'telegram', icon: Send, color: 'bg-sky-500 hover:bg-sky-600', label: 'تليجرام' },
] as const;

export function AboutSection() {
  const settings = useAboutSettings();

  if (!settings.showAboutSection) return null;

  const links = [
    { ...socialLinks[0], url: settings.facebookUrl },
    { ...socialLinks[1], url: settings.instagramUrl },
    { ...socialLinks[2], url: settings.telegramUrl },
  ].filter((link) => link.url);

  return (
    <section className="mt-8 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm" dir="rtl">
      {/* About text */}
      <div className="rounded-xl bg-gradient-to-br from-azraq-50 to-slate-50 p-4">
        <h3 className="mb-2 font-display text-sm font-extrabold text-ink">عننا</h3>
        <p className="text-xs leading-6 text-slate-600">
          {settings.aboutText}
        </p>
      </div>

      {/* Social links */}
      {links.length > 0 && (
        <div className="mt-4 flex items-center justify-center gap-4">
          {links.map((link) => (
            <a
              key={link.key}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`grid h-12 w-12 place-items-center rounded-full text-white shadow-md transition hover:-translate-y-0.5 hover:shadow-lg ${link.color}`}
              aria-label={link.label}
            >
              <link.icon size={20} />
            </a>
          ))}
        </div>
      )}

      {/* Brand footer */}
      <p className="mt-4 text-center text-2xs text-slate-400">
        {TENANT_CONFIG.brandName} &copy; {new Date().getFullYear()}
      </p>
    </section>
  );
}
