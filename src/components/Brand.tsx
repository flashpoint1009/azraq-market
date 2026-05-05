import { useEffect, useState } from 'react';
import { TENANT_CONFIG } from '../config/tenant';
import { supabase } from '../lib/supabase';

const defaultBrand = {
  companyName: TENANT_CONFIG.brandName,
  companySubtitle: 'Azraq Market',
  logoUrl: '/assets/brand/azraq-market-logo.jpg',
};

const defaultTheme = {
  primaryColor: TENANT_CONFIG.primaryColor,
  secondaryColor: '#316f8d',
  accentColor: '#f97316',
  backgroundColor: '#eef6fa',
};

function readCachedBrand() {
  try {
    const cached = localStorage.getItem('market_brand_settings');
    return cached ? { ...defaultBrand, ...JSON.parse(cached) } : defaultBrand;
  } catch {
    return defaultBrand;
  }
}

function useBrandSettings() {
  const [brand, setBrand] = useState(defaultBrand);

  useEffect(() => {
    setBrand(readCachedBrand());
    supabase
      .from('app_settings')
      .select('key,value')
      .in('key', ['company_name', 'company_subtitle', 'logo_url'])
      .then(({ data }) => {
        if (!data?.length) return;
        const next = data.reduce((acc, row) => {
          const value = typeof row.value === 'string' ? row.value : String(row.value ?? '');
          if (row.key === 'company_name') acc.companyName = value || defaultBrand.companyName;
          if (row.key === 'company_subtitle') acc.companySubtitle = value || defaultBrand.companySubtitle;
          if (row.key === 'logo_url') acc.logoUrl = value || defaultBrand.logoUrl;
          return acc;
        }, { ...defaultBrand });
        localStorage.setItem('market_brand_settings', JSON.stringify(next));
        setBrand(next);
      });
  }, []);

  return brand;
}

function shade(hex: string, amount: number) {
  const clean = hex.replace('#', '');
  if (!/^[0-9a-f]{6}$/i.test(clean)) return hex;
  const number = Number.parseInt(clean, 16);
  const r = Math.max(0, Math.min(255, (number >> 16) + amount));
  const g = Math.max(0, Math.min(255, ((number >> 8) & 255) + amount));
  const b = Math.max(0, Math.min(255, (number & 255) + amount));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

export function applyThemeSettings(values: Partial<typeof defaultTheme>) {
  const theme = { ...defaultTheme, ...values };
  const root = document.documentElement;
  root.style.setProperty('--azraq-50', shade(theme.backgroundColor, 6));
  root.style.setProperty('--azraq-100', shade(theme.primaryColor, 150));
  root.style.setProperty('--azraq-200', shade(theme.primaryColor, 120));
  root.style.setProperty('--azraq-300', shade(theme.primaryColor, 80));
  root.style.setProperty('--azraq-400', shade(theme.secondaryColor, 35));
  root.style.setProperty('--azraq-500', theme.secondaryColor);
  root.style.setProperty('--azraq-600', shade(theme.primaryColor, 18));
  root.style.setProperty('--azraq-700', theme.primaryColor);
  root.style.setProperty('--azraq-800', shade(theme.primaryColor, -20));
  root.style.setProperty('--azraq-900', shade(theme.primaryColor, -38));
  root.style.setProperty('--azraq-950', shade(theme.primaryColor, -55));
  root.style.setProperty('--app-bg', theme.backgroundColor);
  root.style.setProperty('--pearl', shade(theme.backgroundColor, 8));
  root.style.setProperty('--app-accent', theme.accentColor);
}

export function AppTheme() {
  useEffect(() => {
    supabase
      .from('app_settings')
      .select('key,value')
      .in('key', ['primary_color', 'secondary_color', 'accent_color', 'background_color'])
      .then(({ data }) => {
        const theme = { ...defaultTheme };
        data?.forEach((row) => {
          const value = typeof row.value === 'string' ? row.value : String(row.value ?? '');
          if (!value.startsWith('#')) return;
          if (row.key === 'primary_color') theme.primaryColor = value;
          if (row.key === 'secondary_color') theme.secondaryColor = value;
          if (row.key === 'accent_color') theme.accentColor = value;
          if (row.key === 'background_color') theme.backgroundColor = value;
        });
        applyThemeSettings(theme);
      });
  }, []);

  return null;
}

export function LogoMark({ compact = false }: { compact?: boolean }) {
  const brand = useBrandSettings();
  return (
    <div className="flex items-center gap-3">
      <div className="grid h-12 w-12 place-items-center overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-azraq-100">
        <img src={brand.logoUrl} alt={brand.companyName} className="h-full w-full object-cover" width="48" height="48" />
      </div>
      {!compact && (
        <div>
          <p className="font-display text-2xl font-extrabold text-ink">{brand.companyName}</p>
          <p className="-mt-1 text-xs font-semibold uppercase tracking-[0.3em] text-azraq-500">{brand.companySubtitle}</p>
        </div>
      )}
    </div>
  );
}

export function SplashScreen() {
  return (
    <div className="grid min-h-screen place-items-center overflow-hidden bg-[radial-gradient(circle_at_20%_20%,#d7efff,transparent_28%),linear-gradient(135deg,#f7fbff,#eef7ff_45%,#ffffff)] p-6">
      <div className="absolute inset-x-8 top-12 h-32 rounded-full bg-azraq-200/50 blur-3xl" />
      <div className="animate-rise rounded-[2rem] border border-white/80 bg-white/80 p-8 text-center shadow-soft backdrop-blur-xl">
        <div className="mx-auto mb-6 flex justify-center">
          <LogoMark />
        </div>
        <p className="text-sm font-semibold text-slate-500">بنجهزلك التطبيق... ثواني بس</p>
        <div className="mt-6 h-2 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full w-2/3 animate-shimmer rounded-full bg-[linear-gradient(90deg,#0f78d2,#88d1ff,#0f78d2)] bg-[length:200%_100%]" />
        </div>
      </div>
    </div>
  );
}
