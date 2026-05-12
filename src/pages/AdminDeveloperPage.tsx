import { FormEvent, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  AlertCircle, BarChart3, CheckCircle2, ChevronDown, ChevronUp, Database, Download,
  Palette, Pencil, Power, Save, Settings2, Shield, Trash2, Upload, Users,
} from 'lucide-react';
import { applyThemeSettings } from '../components/Brand';
import { Button, Card, ErrorState, Input, LoadingState, Select, Textarea } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { useSupabaseQuery } from '../hooks/useSupabaseQuery';
import { allPermissions, permissionLabels } from '../lib/permissions';
import type { AppSetting, DeveloperReport, PermissionKey, Profile } from '../types/database';

type DataRow = Record<string, unknown> & { id?: string };
type ReportType = DeveloperReport['report_type'];

const rawSupabase = supabase as unknown as {
  from: (table: string) => {
    select: (columns?: string) => { limit: (count: number) => Promise<{ data: unknown; error: { message: string } | null }> };
    update: (payload: Record<string, unknown>) => { eq: (column: string, value: string) => Promise<{ error: { message: string } | null }> };
    delete: () => { eq: (column: string, value: string) => Promise<{ error: { message: string } | null }> };
  };
};

const settingsFields = [
  { key: 'company_name', label: 'اسم الشركة', placeholder: 'أزرق ماركت' },
  { key: 'company_subtitle', label: 'الاسم الفرعي', placeholder: 'Azraq Market' },
  { key: 'logo_url', label: 'اللوجو الحالي', placeholder: '/assets/brand/azraq-market-logo.jpg' },
  { key: 'login_hero_url', label: 'صورة الدخول الحالية', placeholder: '/assets/brand/login-hero-720.jpg' },
  { key: 'support_phone', label: 'رقم الدعم', placeholder: '01153338337' },
  { key: 'whatsapp_phone', label: 'رقم واتساب بصيغة دولية', placeholder: '201153338337' },
  { key: 'app_description', label: 'وصف التطبيق', placeholder: 'تطبيق طلبات الجملة وإدارة الطلبات' },
  { key: 'primary_color', label: 'لون الهوية الأساسي', placeholder: '#0f78d2' },
  { key: 'secondary_color', label: 'اللون المساعد', placeholder: '#2b6177' },
  { key: 'accent_color', label: 'لون العروض والتنبيهات', placeholder: '#f97316' },
  { key: 'background_color', label: 'لون الخلفية', placeholder: '#eef6fa' },
];
const colorFields = ['primary_color', 'secondary_color', 'accent_color', 'background_color'];

const reportTypes: Array<{ value: ReportType; label: string }> = [
  { value: 'accounts', label: 'حسابات' },
  { value: 'customers', label: 'عملاء' },
  { value: 'orders', label: 'طلبات' },
  { value: 'products', label: 'منتجات' },
  { value: 'custom', label: 'مخصص' },
];
const reportPermissions: PermissionKey[] = ['reports', 'customers', 'orders', 'products', 'developer'];

const reportTemplates = [
  {
    title: 'مبيعات الفترة',
    description: 'متابعة آخر الطلبات وقيم البيع حسب التاريخ والحالة.',
    report_type: 'orders' as ReportType,
    config: { source: 'orders', fields: ['id', 'created_at', 'status', 'total_amount', 'paid_amount', 'debt_amount'] },
    allowed_permissions: ['reports', 'orders'] as PermissionKey[],
  },
  {
    title: 'كشف حساب عميل',
    description: 'متابعة مديونية العميل والمدفوع والمتبقي.',
    report_type: 'accounts' as ReportType,
    config: { source: 'customer_debts', fields: ['id', 'customer_id', 'amount', 'paid_amount', 'remaining_amount', 'status', 'created_at'] },
    allowed_permissions: ['reports', 'customers'] as PermissionKey[],
  },
  {
    title: 'أفضل المنتجات مبيعًا',
    description: 'قراءة سريعة للكميات وقيم البنود المباعة.',
    report_type: 'products' as ReportType,
    config: { source: 'order_items', fields: ['product_name_snapshot', 'unit_type_snapshot', 'quantity', 'unit_price_snapshot', 'line_total'] },
    allowed_permissions: ['reports', 'products'] as PermissionKey[],
  },
  {
    title: 'حركة المخزون',
    description: 'مراجعة الكمية والسعر والتكلفة لكل منتج متاح.',
    report_type: 'products' as ReportType,
    config: { source: 'products', fields: ['name', 'unit_type', 'stock_quantity', 'price', 'cost_price', 'is_available'] },
    allowed_permissions: ['reports', 'products'] as PermissionKey[],
  },
  {
    title: 'إشعارات العملاء',
    description: 'مراجعة الإشعارات المرسلة وحالة القراءة.',
    report_type: 'customers' as ReportType,
    config: { source: 'notifications', fields: ['user_id', 'title', 'body', 'is_read', 'created_at'] },
    allowed_permissions: ['reports', 'customers'] as PermissionKey[],
  },
];

const dataTables = [
  { table: 'profiles', label: 'المستخدمين والعملاء' },
  { table: 'products', label: 'المنتجات' },
  { table: 'categories', label: 'الأقسام' },
  { table: 'subcategories', label: 'الأقسام الفرعية' },
  { table: 'orders', label: 'الطلبات' },
  { table: 'order_items', label: 'تفاصيل الطلبات' },
  { table: 'promotions', label: 'العروض' },
  { table: 'coupons', label: 'الكوبونات' },
  { table: 'product_reviews', label: 'تقييمات المنتجات' },
  { table: 'wishlists', label: 'المفضلة' },
  { table: 'app_announcements', label: 'إعلانات العملاء' },
  { table: 'customer_debts', label: 'مديونيات العملاء' },
  { table: 'purchase_invoices', label: 'فواتير الشراء' },
  { table: 'purchase_returns', label: 'مرتجعات الشراء' },
  { table: 'notifications', label: 'الإشعارات' },
  { table: 'developer_reports', label: 'تقارير وشاشات مخصصة' },
  { table: 'app_settings', label: 'إعدادات المشروع' },
];

const featureFlags = [
  { key: 'feature_wishlist', label: 'المفضلة', description: 'زر القلب وصفحة المفضلة للعملاء' },
  { key: 'feature_reviews', label: 'تقييمات المنتجات', description: 'النجوم والتقييمات على صفحة المنتج' },
  { key: 'feature_coupons', label: 'الكوبونات', description: 'حقل الكوبون في صفحة الطلب' },
  { key: 'feature_deals', label: 'صفحة العروض', description: 'الرابط والصفحة الخاصة بالتخفيضات' },
  { key: 'feature_push_notifications', label: 'الإشعارات الفورية', description: 'إشعارات الجهاز للعملاء' },
  { key: 'feature_map', label: 'خريطة العنوان', description: 'خريطة اختيار العنوان في الملف الشخصي' },
];

type RawRow = Record<string, unknown>;
type RawClient = {
  from: (table: string) => {
    select: (cols: string) => {
      order: (col: string, opts: { ascending: boolean }) => {
        limit: (n: number) => Promise<{ data: unknown; error: unknown }>;
      };
      eq: (col: string, val: string) => {
        order: (col: string, opts: { ascending: boolean }) => Promise<{ data: unknown; error: unknown }>;
      };
    };
  };
};

function asRaw() {
  return supabase as unknown as RawClient;
}

async function rawFetch(table: string, cols: string, orderCol: string, asc: boolean, lim = 1000): Promise<RawRow[]> {
  const result = await asRaw().from(table).select(cols).order(orderCol, { ascending: asc }).limit(lim);
  return ((result as { data: unknown }).data as RawRow[] | null) || [];
}

const excelReports = [
  {
    id: 'sales',
    title: 'ملخص المبيعات',
    icon: '📊',
    color: 'bg-blue-50 text-blue-700',
    fetch: async () => {
      const rows = await rawFetch('orders', 'id,created_at,status,total_amount,paid_amount,debt_amount,customer_id', 'created_at', false, 500);
      return rows.map((row) => ({
        'رقم الطلب': String(row.id || '').slice(0, 8),
        'التاريخ': row.created_at ? new Date(String(row.created_at)).toLocaleDateString('ar-EG') : '',
        'الحالة': String(row.status || ''),
        'الإجمالي': Number(row.total_amount || 0),
        'المدفوع': Number(row.paid_amount || 0),
        'المتبقي': Number(row.debt_amount || 0),
      }));
    },
  },
  {
    id: 'customers',
    title: 'قائمة العملاء',
    icon: '👥',
    color: 'bg-emerald-50 text-emerald-700',
    fetch: async () => {
      const result = await asRaw().from('profiles').select('full_name,phone,address,created_at').eq('role', 'customer').order('created_at', { ascending: false });
      const rows = ((result as { data: unknown }).data as RawRow[] | null) || [];
      return rows.map((row) => ({
        'الاسم': String(row.full_name || ''),
        'الهاتف': String(row.phone || ''),
        'العنوان': String(row.address || ''),
        'تاريخ التسجيل': row.created_at ? new Date(String(row.created_at)).toLocaleDateString('ar-EG') : '',
      }));
    },
  },
  {
    id: 'inventory',
    title: 'حركة المخزون',
    icon: '📦',
    color: 'bg-amber-50 text-amber-700',
    fetch: async () => {
      const rows = await rawFetch('products', 'name,unit_type,stock_quantity,price,cost_price,is_available', 'stock_quantity', true);
      return rows.map((row) => ({
        'اسم المنتج': String(row.name || ''),
        'الوحدة': String(row.unit_type || ''),
        'الكمية': Number(row.stock_quantity || 0),
        'سعر البيع': Number(row.price || 0),
        'سعر التكلفة': Number(row.cost_price || 0),
        'الهامش': Number(row.price || 0) - Number(row.cost_price || 0),
        'متاح': row.is_available ? 'نعم' : 'لا',
      }));
    },
  },
  {
    id: 'debts',
    title: 'كشف المديونيات',
    icon: '💳',
    color: 'bg-rose-50 text-rose-700',
    fetch: async () => {
      const rows = await rawFetch('customer_debts', 'amount,paid_amount,remaining_amount,status,created_at,customer_id', 'remaining_amount', false, 300);
      return rows.map((row) => ({
        'رقم العميل': String(row.customer_id || '').slice(0, 8),
        'إجمالي الدين': Number(row.amount || 0),
        'المدفوع': Number(row.paid_amount || 0),
        'المتبقي': Number(row.remaining_amount || 0),
        'الحالة': String(row.status || ''),
        'التاريخ': row.created_at ? new Date(String(row.created_at)).toLocaleDateString('ar-EG') : '',
      }));
    },
  },
  {
    id: 'coupons',
    title: 'استخدام الكوبونات',
    icon: '🎟️',
    color: 'bg-purple-50 text-purple-700',
    fetch: async () => {
      const rows = await rawFetch('coupons', 'code,type,value,min_order,max_uses,used_count,is_active,expires_at', 'used_count', false);
      return rows.map((row) => ({
        'الكود': String(row.code || ''),
        'النوع': row.type === 'percent' ? 'نسبة مئوية' : 'قيمة ثابتة',
        'الخصم': String(row.value || ''),
        'أقل طلب': Number(row.min_order || 0),
        'الحد الأقصى': String(row.max_uses || 'غير محدود'),
        'مرات الاستخدام': Number(row.used_count || 0),
        'نشط': row.is_active ? 'نعم' : 'لا',
        'ينتهي': row.expires_at ? new Date(String(row.expires_at)).toLocaleDateString('ar-EG') : 'غير محدد',
      }));
    },
  },
  {
    id: 'reviews',
    title: 'تقييمات المنتجات',
    icon: '⭐',
    color: 'bg-orange-50 text-orange-700',
    fetch: async () => {
      const rows = await rawFetch('product_reviews', 'rating,comment,created_at,product_id,user_id', 'created_at', false, 300);
      return rows.map((row) => ({
        'رقم المنتج': String(row.product_id || '').slice(0, 8),
        'رقم العميل': String(row.user_id || '').slice(0, 8),
        'التقييم': Number(row.rating || 0),
        'التعليق': String(row.comment || ''),
        'التاريخ': row.created_at ? new Date(String(row.created_at)).toLocaleDateString('ar-EG') : '',
      }));
    },
  },
];

function valueToInput(value: unknown) {
  if (value == null) return '';
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  return String(value);
}

function parseValue(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;
  if (trimmed === 'null') return null;
  if (!Number.isNaN(Number(trimmed)) && /^-?\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed);
  if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) return JSON.parse(trimmed);
  return value;
}

function shortValue(value: unknown) {
  const text = valueToInput(value).replace(/\s+/g, ' ');
  return text.length > 80 ? `${text.slice(0, 80)}...` : text;
}

function togglePermission(list: PermissionKey[], permission: PermissionKey) {
  return list.includes(permission) ? list.filter((item) => item !== permission) : [...list, permission];
}

function SectionHeader({ icon, title, subtitle, color = 'bg-azraq-50 text-azraq-700' }: { icon: React.ReactNode; title: string; subtitle: string; color?: string }) {
  return (
    <div className="mb-3 flex items-start gap-2.5">
      <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${color}`}>{icon}</div>
      <div>
        <h2 className="font-display text-sm font-extrabold text-ink sm:text-base">{title}</h2>
        <p className="text-[11px] leading-5 text-slate-500">{subtitle}</p>
      </div>
    </div>
  );
}

function DeveloperHeader() {
  return (
    <div className="mb-3 overflow-hidden rounded-2xl border border-white/80 bg-gradient-to-br from-azraq-700 via-azraq-800 to-azraq-950 p-4 text-white shadow-soft">
      <p className="text-[10px] font-extrabold text-azraq-300">لوحة التحكم الكاملة</p>
      <h1 className="mt-0.5 font-display text-lg font-extrabold sm:text-2xl">لوحة المطور</h1>
      <p className="mt-1 text-xs leading-5 text-azraq-200">
        تحكم كامل في هوية المشروع، إعداداته، بياناته، صلاحيات الفريق، وتصدير التقارير.
      </p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {['هوية المشروع', 'تقارير Excel', 'فيتشر فلاجز', 'صلاحيات الفريق', 'مصنع التقارير', 'قاعدة البيانات'].map((label) => (
          <span key={label} className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-bold text-white">
            <CheckCircle2 size={10} />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

function DeveloperSettingsCard() {
  const { profile } = useAuth();
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const { data, loading, error, reload } = useSupabaseQuery(async () => {
    const result = await supabase.from('app_settings').select('*').order('key');
    if (result.error) throw result.error;
    return (result.data || []) as AppSetting[];
  }, []);

  useEffect(() => {
    const next = Object.fromEntries(settingsFields.map((field) => [field.key, '']));
    data?.forEach((setting) => { next[setting.key] = valueToInput(setting.value); });
    setForm(next);
  }, [data]);

  const uploadBrandFile = async (file: File, settingKey: 'logo_url' | 'login_hero_url') => {
    setUploading(settingKey);
    const extension = file.name.split('.').pop() || 'png';
    const path = `branding/${settingKey}-${Date.now()}.${extension}`;
    const { error: uploadError } = await supabase.storage.from('product-images').upload(path, file, { upsert: true });
    if (uploadError) { toast.error(uploadError.message); setUploading(null); return; }
    const { data: publicData } = supabase.storage.from('product-images').getPublicUrl(path);
    setForm((current) => ({ ...current, [settingKey]: publicData.publicUrl }));
    setUploading(null);
    toast.success(settingKey === 'logo_url' ? 'اللوجو اترفع' : 'صورة الدخول اترفعت');
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    let rows: Array<{ key: string; value: unknown; description: string; updated_by: string | null; updated_at: string }>;
    try {
      rows = settingsFields.map((field) => ({
        key: field.key,
        value: parseValue(form[field.key] || ''),
        description: field.label,
        updated_by: profile?.id ?? null,
        updated_at: new Date().toISOString(),
      }));
    } catch {
      setSaving(false);
      toast.error('في قيمة مكتوبة بصيغة JSON غير صحيحة');
      return;
    }
    const { error: saveError } = await supabase.from('app_settings').upsert(rows, { onConflict: 'key' });
    setSaving(false);
    if (saveError) { toast.error('شغل developer_control_migration.sql الأول'); return; }
    localStorage.removeItem('market_brand_settings');
    applyThemeSettings({
      primaryColor: form.primary_color || '#2b5b74',
      secondaryColor: form.secondary_color || '#316f8d',
      accentColor: form.accent_color || '#f97316',
      backgroundColor: form.background_color || '#eef6fa',
    });
    toast.success('إعدادات المشروع اتحفظت');
    reload();
  };

  return (
    <Card className="p-4 sm:p-6">
      <SectionHeader icon={<Settings2 size={23} />} title="هوية وإعدادات المشروع" subtitle="رفع لوجو وصور، لوحة ألوان، وأرقام الدعم لكل نسخة مباعة." />
      {loading && <LoadingState label="بنحمّل الإعدادات..." />}
      {error && <ErrorState message="جدول إعدادات المطور غير مفعل. شغل migration الأول." />}
      {!loading && (
        <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
          <div className="min-w-0 rounded-2xl bg-slate-50 p-4 sm:col-span-2">
            <div className="mb-3 flex items-center gap-2 font-display text-base font-extrabold text-ink"><Upload size={18} /> رفع ملفات الهوية</div>
            <div className="grid gap-3 sm:grid-cols-2">
              {(['logo_url', 'login_hero_url'] as const).map((key) => (
                <label key={key} className="grid gap-2 rounded-2xl bg-white p-3 text-xs font-bold text-slate-600">
                  {key === 'logo_url' ? 'ارفع اللوجو من جهازك' : 'ارفع صورة شاشة الدخول'}
                  {form[key] && <img src={form[key]} alt="" className="h-20 w-20 rounded-2xl object-cover" />}
                  <Input type="file" accept="image/*" className="px-2 py-2 text-xs file:ml-2 file:rounded-lg file:border-0 file:bg-azraq-50 file:px-2 file:py-1 file:text-xs file:font-bold file:text-azraq-700" onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) uploadBrandFile(file, key);
                  }} />
                  {uploading === key && <span className="text-xs text-azraq-700">جاري الرفع...</span>}
                </label>
              ))}
            </div>
          </div>

          <div className="min-w-0 rounded-2xl bg-slate-50 p-4 sm:col-span-2">
            <div className="mb-3 flex items-center gap-2 font-display text-base font-extrabold text-ink"><Palette size={18} /> بانل الألوان</div>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              {colorFields.map((key) => (
                <label key={key} className="rounded-2xl bg-white p-3 text-xs font-bold text-slate-600">
                  {settingsFields.find((field) => field.key === key)?.label}
                  <div className="mt-2 grid grid-cols-[1fr_42px] items-center gap-2">
                    <Input value={form[key] || ''} onChange={(event) => setForm({ ...form, [key]: event.target.value })} dir="ltr" className="px-2 py-2 text-[11px]" />
                    <input type="color" value={form[key] || '#0f78d2'} onChange={(event) => setForm({ ...form, [key]: event.target.value })} className="h-10 w-[42px] rounded-xl border border-slate-200 bg-white p-1" />
                  </div>
                </label>
              ))}
            </div>
          </div>

          {settingsFields.filter((field) => !colorFields.includes(field.key)).map((field) => (
            <label key={field.key} className="grid gap-1 text-sm font-bold text-slate-600">
              {field.label}
              <Input value={form[field.key] || ''} onChange={(event) => setForm({ ...form, [field.key]: event.target.value })} placeholder={field.placeholder} dir={field.key.includes('url') || field.key.includes('phone') ? 'ltr' : 'rtl'} className="py-2.5" />
            </label>
          ))}
          <Button disabled={saving} className="sm:col-span-2"><Save size={17} /> {saving ? 'جاري الحفظ...' : 'حفظ إعدادات المشروع'}</Button>
        </form>
      )}
    </Card>
  );
}

function ExcelReportsCard() {
  const [downloading, setDownloading] = useState<string | null>(null);

  const exportReport = async (report: typeof excelReports[0]) => {
    setDownloading(report.id);
    try {
      const rows = await report.fetch();
      if (!rows.length) { toast.error('لا توجد بيانات لتصديرها'); setDownloading(null); return; }

      const XLSX = await import('xlsx');
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, report.title.slice(0, 31));

      const colWidths = Object.keys(rows[0]).map((key) => ({
        wch: Math.max(key.length * 2, Math.min(30, ...rows.map((row) => String(row[key as keyof typeof row] ?? '').length))),
      }));
      ws['!cols'] = colWidths;

      const filename = `${report.title}-${new Date().toISOString().slice(0, 10)}.xlsx`;
      XLSX.writeFile(wb, filename);
      toast.success(`تم تصدير ${rows.length} سطر كـ Excel`);
    } catch (err) {
      toast.error('تعذر تصدير التقرير');
      console.error('EXCEL_EXPORT_FAILED', err);
    }
    setDownloading(null);
  };

  return (
    <Card className="p-4 sm:p-6">
      <SectionHeader icon={<Download size={23} />} title="تقارير Excel الجاهزة" subtitle="6 تقارير تجيب البيانات من الداتابيز مباشرة وتصدّرها كملف Excel بضغطة واحدة." color="bg-emerald-50 text-emerald-700" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {excelReports.map((report) => (
          <div key={report.id} className={`rounded-2xl p-4 ${report.color.replace('text-', 'bg-').split(' ')[0]} bg-opacity-10 border border-current border-opacity-20`} style={{ borderColor: 'transparent' }}>
            <div className={`mb-3 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-extrabold ${report.color}`}>
              <span>{report.icon}</span>
              {report.title}
            </div>
            <button
              type="button"
              onClick={() => exportReport(report)}
              disabled={downloading === report.id}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-extrabold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:opacity-60"
            >
              {downloading === report.id ? (
                <><span className="animate-spin">⏳</span> جاري التصدير...</>
              ) : (
                <><Download size={16} /> تصدير Excel</>
              )}
            </button>
          </div>
        ))}
      </div>
      <p className="mt-4 rounded-2xl bg-slate-50 p-3 text-xs font-bold text-slate-500">
        💡 الملفات بتتنزل مباشرة على جهازك — مفيش بيانات بتتبعت لخارج المشروع. كل تقرير فيه أعلى 300-500 سطر من أحدث البيانات.
      </p>
    </Card>
  );
}

function FeatureFlagsCard() {
  const { profile } = useAuth();
  const [saving, setSaving] = useState<string | null>(null);
  const { data, loading, reload } = useSupabaseQuery(async () => {
    const result = await supabase.from('app_settings').select('*').in('key', featureFlags.map((flag) => flag.key));
    if (result.error) throw result.error;
    return (result.data || []) as AppSetting[];
  }, []);

  const getFlagValue = (key: string): boolean => {
    const setting = data?.find((item) => item.key === key);
    if (!setting) return true;
    return String(setting.value) !== 'false';
  };

  const toggleFlag = async (key: string, currentValue: boolean) => {
    setSaving(key);
    const { error } = await supabase.from('app_settings').upsert({
      key,
      value: !currentValue,
      description: featureFlags.find((flag) => flag.key === key)?.label || key,
      updated_by: profile?.id ?? null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'key' });
    setSaving(null);
    if (error) { toast.error('تعذر حفظ الإعداد. تأكد من تشغيل migration.'); return; }
    toast.success(`تم ${!currentValue ? 'تفعيل' : 'إيقاف'} الميزة`);
    reload();
  };

  return (
    <Card className="p-4 sm:p-6">
      <SectionHeader icon={<Power size={23} />} title="تشغيل وإيقاف ميزات المشروع" subtitle="فعّل أو أوقف أي ميزة للعميل النهائي من غير ما تعدّل الكود — مناسب لكل نسخة مباعة." color="bg-orange-50 text-orange-700" />
      {loading && <LoadingState label="بنحمّل الإعدادات..." />}
      <div className="grid gap-2 sm:grid-cols-2">
        {featureFlags.map((flag) => {
          const isOn = getFlagValue(flag.key);
          const isSaving = saving === flag.key;
          return (
            <div key={flag.key} className={`flex items-center justify-between gap-3 rounded-2xl border p-4 transition ${isOn ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-slate-50'}`}>
              <div className="min-w-0">
                <p className="text-sm font-extrabold text-ink">{flag.label}</p>
                <p className="text-xs font-bold text-slate-500">{flag.description}</p>
              </div>
              <button
                type="button"
                onClick={() => toggleFlag(flag.key, isOn)}
                disabled={isSaving}
                className={`relative h-7 w-12 shrink-0 rounded-full transition ${isOn ? 'bg-emerald-500' : 'bg-slate-300'} disabled:opacity-60`}
              >
                <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${isOn ? 'right-1' : 'right-6'}`} />
              </button>
            </div>
          );
        })}
      </div>
      <p className="mt-4 rounded-2xl bg-amber-50 p-3 text-xs font-bold text-amber-700">
        ⚠️ ملاحظة: إيقاف الميزة هنا بيحفظ الإعداد في قاعدة البيانات — التطبيق يقرأ الإعداد عند الفتح. بعض الميزات تحتاج تحديث الصفحة لتأثيرها.
      </p>
    </Card>
  );
}

function PermissionsManagerCard() {
  const [expanding, setExpanding] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const { data, loading, error, reload } = useSupabaseQuery(async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .neq('role', 'customer')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data as Profile[];
  }, []);

  const updatePermissions = async (profileId: string, permissions: PermissionKey[]) => {
    setSaving(profileId);
    const { error } = await supabase.from('profiles').update({ app_permissions: permissions }).eq('id', profileId);
    setSaving(null);
    if (error) { toast.error(error.message); return; }
    toast.success('تم حفظ الصلاحيات');
    reload();
  };

  return (
    <Card className="p-4 sm:p-6">
      <SectionHeader icon={<Users size={23} />} title="إدارة صلاحيات الفريق" subtitle="شوف وعدّل صلاحيات كل مستخدم في الإدارة مباشرة من هنا — بدون روحة لصفحة المستخدمين." color="bg-indigo-50 text-indigo-700" />
      {loading && <LoadingState label="بنحمّل الفريق..." />}
      {error && <ErrorState message={error} />}
      <div className="grid gap-2">
        {data?.map((profile) => {
          const isOpen = expanding === profile.id;
          const isSaving = saving === profile.id;
          const currentPerms: PermissionKey[] = (profile.app_permissions || []) as PermissionKey[];
          const isDeveloper = currentPerms.includes('developer');
          return (
            <div key={profile.id} className="rounded-2xl border border-slate-100 bg-white">
              <button
                type="button"
                onClick={() => setExpanding(isOpen ? null : profile.id)}
                className="flex w-full items-center justify-between gap-3 p-4 text-right"
              >
                <div className="min-w-0">
                  <p className="font-extrabold text-ink">{profile.full_name || 'بدون اسم'}</p>
                  <p className="text-xs font-bold text-slate-400" dir="ltr">{profile.phone}</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {isDeveloper ? (
                      <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-700">مطور</span>
                    ) : currentPerms.length === 0 ? (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">بدون صلاحيات</span>
                    ) : currentPerms.slice(0, 3).map((perm) => (
                      <span key={perm} className="rounded-full bg-azraq-50 px-2 py-0.5 text-[10px] font-bold text-azraq-700">{permissionLabels[perm]}</span>
                    ))}
                    {currentPerms.length > 3 && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">+{currentPerms.length - 3}</span>}
                  </div>
                </div>
                {isOpen ? <ChevronUp size={18} className="text-slate-400 shrink-0" /> : <ChevronDown size={18} className="text-slate-400 shrink-0" />}
              </button>
              {isOpen && !isDeveloper && (
                <div className="border-t border-slate-100 p-4">
                  <div className="grid gap-2 sm:grid-cols-2">
                    {allPermissions.filter((perm) => perm !== 'developer').map((perm) => (
                      <label key={perm} className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm font-bold text-slate-600 cursor-pointer hover:bg-azraq-50">
                        <input
                          type="checkbox"
                          checked={currentPerms.includes(perm)}
                          onChange={() => {
                            const next = togglePermission(currentPerms, perm);
                            updatePermissions(profile.id, next);
                          }}
                          className="accent-azraq-700"
                        />
                        {permissionLabels[perm]}
                      </label>
                    ))}
                  </div>
                  {isSaving && <p className="mt-2 text-xs font-bold text-azraq-700 animate-pulse">جاري الحفظ...</p>}
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => updatePermissions(profile.id, allPermissions.filter((p) => p !== 'developer'))}
                      className="rounded-xl bg-azraq-50 px-3 py-2 text-xs font-bold text-azraq-700"
                    >
                      كل الصلاحيات
                    </button>
                    <button
                      type="button"
                      onClick={() => updatePermissions(profile.id, [])}
                      className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-600"
                    >
                      إلغاء الكل
                    </button>
                  </div>
                </div>
              )}
              {isOpen && isDeveloper && (
                <div className="border-t border-slate-100 p-4">
                  <p className="rounded-2xl bg-indigo-50 p-3 text-sm font-bold text-indigo-700">
                    <Shield size={14} className="inline ml-1" />
                    هذا المستخدم مطور — صلاحياته محمية ولا يمكن تعديلها من هنا.
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function DeveloperReportsCard() {
  const { profile } = useAuth();
  const [form, setForm] = useState({
    title: '',
    description: '',
    report_type: 'custom' as ReportType,
    config: '{\n  "source": "orders",\n  "fields": ["id", "created_at", "total_amount"],\n  "filters": []\n}',
    allowed_permissions: ['developer'] as PermissionKey[],
    is_active: true,
  });
  const { data, loading, error, reload } = useSupabaseQuery(async () => {
    const result = await supabase.from('developer_reports').select('*').order('created_at', { ascending: false });
    if (result.error) throw result.error;
    return (result.data || []) as DeveloperReport[];
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    let config: Record<string, unknown>;
    try { config = JSON.parse(form.config) as Record<string, unknown>; }
    catch { toast.error('صيغة JSON غير صحيحة'); return; }
    const { error: saveError } = await supabase.from('developer_reports').insert({
      title: form.title, description: form.description || null,
      report_type: form.report_type, config,
      allowed_permissions: form.allowed_permissions,
      is_active: form.is_active, created_by: profile?.id ?? null,
    });
    if (saveError) { toast.error('شغل migration الخاص بالتقارير الأول'); return; }
    toast.success('التقرير اتسجل');
    setForm({ ...form, title: '', description: '' });
    reload();
  };

  const addTemplates = async () => {
    const rows = reportTemplates.map((template) => ({ ...template, is_active: true, created_by: profile?.id ?? null }));
    const { error: saveError } = await supabase.from('developer_reports').upsert(rows, { onConflict: 'title' });
    if (saveError) { toast.error('شغل migration أولاً'); return; }
    toast.success('تم تجهيز 5 تقارير إضافية');
    reload();
  };

  return (
    <Card className="p-4 sm:p-6">
      <SectionHeader icon={<BarChart3 size={23} />} title="مصنع تقارير المدير" subtitle="سجل تقارير مخصصة تظهر للمدير في صفحة التقارير — حدد مصدر البيانات والحقول والصلاحيات." color="bg-violet-50 text-violet-700" />
      <button type="button" onClick={addTemplates} className="mb-4 inline-flex items-center gap-2 rounded-2xl bg-violet-50 px-4 py-3 text-sm font-extrabold text-violet-800 hover:bg-violet-100">
        + إضافة 5 تقارير جاهزة للعميل
      </button>
      <form onSubmit={submit} className="grid gap-3 xl:grid-cols-[340px_1fr]">
        <div className="grid gap-3 content-start">
          <Input required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="اسم التقرير" />
          <Textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="وصف مختصر" rows={2} />
          <Select value={form.report_type} onChange={(event) => setForm({ ...form, report_type: event.target.value as ReportType })}>
            {reportTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
          </Select>
          <div className="grid gap-2 rounded-2xl bg-slate-50 p-3">
            <p className="text-xs font-extrabold text-slate-500 mb-1">الصلاحيات المسموح لها بالتقرير</p>
            {reportPermissions.map((permission) => (
              <label key={permission} className="flex items-center gap-2 text-sm font-bold text-slate-600">
                <input type="checkbox" checked={form.allowed_permissions.includes(permission)} onChange={() => setForm({ ...form, allowed_permissions: togglePermission(form.allowed_permissions, permission) })} className="accent-azraq-700" />
                {permissionLabels[permission]}
              </label>
            ))}
          </div>
          <label className="flex items-center gap-2 text-sm font-bold text-slate-600">
            <input type="checkbox" checked={form.is_active} onChange={(event) => setForm({ ...form, is_active: event.target.checked })} className="accent-azraq-700" />
            التقرير نشط ومرئي للمدير
          </label>
        </div>
        <div>
          <p className="mb-2 text-xs font-extrabold text-slate-500">إعداد JSON — حدد source (اسم الجدول) و fields (الحقول)</p>
          <Textarea value={form.config} onChange={(event) => setForm({ ...form, config: event.target.value })} rows={10} dir="ltr" className="font-mono text-xs" />
          <Button className="mt-3"><Save size={17} /> إضافة التقرير للمدير</Button>
        </div>
      </form>
      {loading && <LoadingState label="بنحمّل التقارير..." />}
      {error && <ErrorState message="جدول developer_reports غير مفعل. شغل migration." />}
      {!loading && !error && (
        <div className="mt-4 grid gap-2">
          {data?.map((report) => (
            <div key={report.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="font-display text-base font-extrabold text-ink">{report.title}</p>
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${report.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                  {report.is_active ? 'نشط' : 'مخفي'}
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-500">{report.description || 'بدون وصف'}</p>
              <p className="mt-2 text-xs font-bold text-azraq-700">{report.allowed_permissions?.join(' - ') || '-'}</p>
            </div>
          ))}
          {!data?.length && <p className="p-3 text-sm font-bold text-slate-400">لا توجد تقارير حتى الآن.</p>}
        </div>
      )}
    </Card>
  );
}

function DataBrowserCard() {
  const [selectedTable, setSelectedTable] = useState(dataTables[0].table);
  const [editing, setEditing] = useState<DataRow | null>(null);
  const [jsonText, setJsonText] = useState('');
  const selectedLabel = useMemo(() => dataTables.find((item) => item.table === selectedTable)?.label || selectedTable, [selectedTable]);
  const { data, loading, error, reload } = useSupabaseQuery(async () => {
    const result = await rawSupabase.from(selectedTable).select('*').limit(50);
    if (result.error) throw result.error;
    return (result.data || []) as DataRow[];
  }, [selectedTable]);

  const columns = useMemo(() => {
    const keys = new Set<string>();
    data?.slice(0, 10).forEach((row) => Object.keys(row).forEach((key) => keys.add(key)));
    return [...keys].slice(0, 8);
  }, [data]);

  const exportTable = async () => {
    if (!data?.length) { toast.error('لا توجد بيانات'); return; }
    const XLSX = await import('xlsx');
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, selectedLabel.slice(0, 31));
    XLSX.writeFile(wb, `${selectedLabel}-${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success(`تم تصدير ${data.length} سطر`);
  };

  const startEdit = (row: DataRow) => { setEditing(row); setJsonText(JSON.stringify(row, null, 2)); };

  const saveRow = async () => {
    if (!editing?.id) { toast.error('السطر لازم يكون له id'); return; }
    let payload: DataRow;
    try { payload = JSON.parse(jsonText) as DataRow; }
    catch { toast.error('صيغة JSON غير صحيحة'); return; }
    const { error: saveError } = await rawSupabase.from(selectedTable).update(payload).eq('id', editing.id);
    if (saveError) { toast.error(saveError.message); return; }
    toast.success('تم التعديل'); setEditing(null); reload();
  };

  const deleteRow = async (row: DataRow) => {
    if (!row.id) { toast.error('السطر لازم يكون له id'); return; }
    if (!window.confirm(`حذف السطر من ${selectedLabel}؟`)) return;
    const { error: deleteError } = await rawSupabase.from(selectedTable).delete().eq('id', row.id);
    if (deleteError) { toast.error(deleteError.message); return; }
    toast.success('تم الحذف'); reload();
  };

  return (
    <Card className="p-4 sm:p-6">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <SectionHeader icon={<Database size={23} />} title="مستعرض قاعدة البيانات" subtitle="عرض مثل الإكسيل مع تعديل وحذف مباشر — 17 جدول متاح." color="bg-slate-100 text-slate-700" />
        <div className="flex flex-wrap items-center gap-2 md:shrink-0">
          <button type="button" onClick={exportTable} className="inline-flex items-center gap-2 rounded-2xl bg-emerald-50 px-3 py-2.5 text-sm font-extrabold text-emerald-700 hover:bg-emerald-100">
            <Download size={16} /> Excel
          </button>
          <Select value={selectedTable} onChange={(event) => { setSelectedTable(event.target.value); setEditing(null); }} className="py-2.5">
            {dataTables.map((item) => <option key={item.table} value={item.table}>{item.label}</option>)}
          </Select>
        </div>
      </div>
      {loading && <LoadingState label="بنحمّل الجدول..." />}
      {error && <ErrorState message={`تعذر تحميل جدول ${selectedLabel}.`} />}
      {!loading && !error && (
        <div className="grid gap-2">
          <div className="grid gap-2 md:hidden">
            {data?.map((row, index) => (
              <div key={row.id || index} className="rounded-2xl border border-slate-100 bg-white p-3 text-sm">
                <div className="grid gap-1">
                  {columns.slice(0, 5).map((column) => (
                    <div key={column} className="flex items-start justify-between gap-3 border-b border-slate-50 py-1 last:border-b-0">
                      <span className="text-xs font-extrabold text-slate-400">{column}</span>
                      <span className="max-w-[58%] break-words text-left text-xs font-bold text-slate-700">{shortValue(row[column])}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex gap-2">
                  <button type="button" onClick={() => startEdit(row)} className="flex-1 rounded-xl bg-azraq-50 px-3 py-2 text-sm font-bold text-azraq-700">تعديل</button>
                  <button type="button" onClick={() => deleteRow(row)} className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-bold text-rose-700">حذف</button>
                </div>
              </div>
            ))}
            {!data?.length && <p className="p-4 text-sm font-bold text-slate-400">لا توجد بيانات.</p>}
          </div>
          <div className="hidden overflow-x-auto rounded-2xl border border-slate-100 md:block">
            <table className="w-full min-w-[780px] text-sm">
              <thead className="bg-slate-50 text-right text-xs font-extrabold text-slate-500">
                <tr>{columns.map((column) => <th key={column} className="px-3 py-3">{column}</th>)}<th className="px-3 py-3">إجراءات</th></tr>
              </thead>
              <tbody>
                {data?.map((row, index) => (
                  <tr key={row.id || index} className="border-t border-slate-100 hover:bg-slate-50">
                    {columns.map((column) => <td key={column} className="max-w-[220px] truncate px-3 py-3 text-slate-600">{shortValue(row[column])}</td>)}
                    <td className="whitespace-nowrap px-3 py-3">
                      <button type="button" onClick={() => startEdit(row)} className="ml-2 rounded-xl bg-azraq-50 px-3 py-2 text-azraq-700"><Pencil size={14} /></button>
                      <button type="button" onClick={() => deleteRow(row)} className="rounded-xl bg-rose-50 px-3 py-2 text-rose-700"><Trash2 size={14} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!data?.length && <p className="p-4 text-sm font-bold text-slate-400">لا توجد بيانات.</p>}
          </div>
        </div>
      )}
      {editing && (
        <div className="mt-4 rounded-2xl bg-slate-50 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-display text-lg font-extrabold">تعديل السطر</h3>
            <button type="button" onClick={() => setEditing(null)} className="rounded-xl bg-white px-3 py-2 text-sm font-bold text-slate-600 shadow-sm">إلغاء</button>
          </div>
          <Textarea value={jsonText} onChange={(event) => setJsonText(event.target.value)} rows={12} dir="ltr" className="font-mono text-xs" />
          <Button type="button" onClick={saveRow} className="mt-3"><Save size={17} /> حفظ التعديل</Button>
        </div>
      )}
    </Card>
  );
}

const DEV_SESSION_KEY = 'azraq_dev_unlocked';
const DEV_PASSWORD = 'azraq@dev2025';

function DevPasswordGate({ onUnlock }: { onUnlock: () => void }) {
  const [input, setInput] = useState('');
  const [error, setError] = useState(false);

  const attempt = () => {
    if (input === DEV_PASSWORD) {
      sessionStorage.setItem(DEV_SESSION_KEY, '1');
      onUnlock();
    } else {
      setError(true);
      setInput('');
    }
  };

  return (
    <div className="grid min-h-[70vh] place-items-center">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <div className="grid h-16 w-16 place-items-center rounded-3xl bg-azraq-900 text-white">
            <Shield size={28} />
          </div>
          <h1 className="font-display text-2xl font-extrabold text-ink">لوحة المطور</h1>
          <p className="text-sm font-bold text-slate-500">هذه الصفحة محمية — أدخل كلمة المرور للمتابعة</p>
        </div>
        <Card>
          <div className="space-y-3">
            <Input
              type="password"
              value={input}
              onChange={(event) => { setInput(event.target.value); setError(false); }}
              placeholder="كلمة المرور"
              dir="ltr"
              onKeyDown={(event) => { if (event.key === 'Enter') attempt(); }}
              autoFocus
            />
            {error && (
              <div className="flex items-center gap-2 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-bold text-rose-600">
                <AlertCircle size={16} /> كلمة المرور غير صحيحة
              </div>
            )}
            <Button type="button" onClick={attempt} className="w-full">
              <Shield size={17} /> فتح لوحة المطور
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

export function AdminDeveloperPage() {
  const [unlocked, setUnlocked] = useState(() => sessionStorage.getItem(DEV_SESSION_KEY) === '1');

  if (!unlocked) return <DevPasswordGate onUnlock={() => setUnlocked(true)} />;

  return (
    <div className="mx-auto w-full max-w-5xl pb-10">
      <DeveloperHeader />
      <div className="grid gap-3">
        <DeveloperSettingsCard />
        <ExcelReportsCard />
        <FeatureFlagsCard />
        <PermissionsManagerCard />
        <DeveloperReportsCard />
        <DataBrowserCard />
      </div>
    </div>
  );
}
