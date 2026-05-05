import { FormEvent, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { BarChart3, Database, Palette, Pencil, Save, Settings2, Trash2, Upload } from 'lucide-react';
import { applyThemeSettings } from '../components/Brand';
import { Button, Card, ErrorState, Input, LoadingState, Select, Textarea } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { useSupabaseQuery } from '../hooks/useSupabaseQuery';
import type { AppSetting, DeveloperReport, PermissionKey } from '../types/database';

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
  { table: 'app_announcements', label: 'إعلانات العملاء' },
  { table: 'customer_debts', label: 'مديونيات العملاء' },
  { table: 'purchase_invoices', label: 'فواتير الشراء' },
  { table: 'purchase_returns', label: 'مرتجعات الشراء' },
  { table: 'notifications', label: 'الإشعارات' },
  { table: 'developer_reports', label: 'تقارير وشاشات مخصصة' },
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

function DeveloperHeader() {
  return (
    <div className="mb-3 rounded-[1.35rem] border border-white/80 bg-white/80 p-3 shadow-sm backdrop-blur sm:mb-5 sm:p-5">
      <p className="text-[10px] font-extrabold text-azraq-500 sm:text-xs">أزرق ماركت</p>
      <h1 className="mt-1 font-display text-2xl font-extrabold leading-tight text-ink sm:text-3xl">لوحة المطور</h1>
      <p className="mt-1 text-xs font-bold leading-5 text-slate-500 sm:mt-2 sm:max-w-2xl sm:text-sm">
        تحكم كامل في هوية المشروع وإعداداته وبياناته قبل تسليم النسخة أو بيعها.
      </p>
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
    data?.forEach((setting) => {
      next[setting.key] = valueToInput(setting.value);
    });
    setForm(next);
  }, [data]);

  const uploadBrandFile = async (file: File, settingKey: 'logo_url' | 'login_hero_url') => {
    setUploading(settingKey);
    const extension = file.name.split('.').pop() || 'png';
    const path = `branding/${settingKey}-${Date.now()}.${extension}`;
    const { error: uploadError } = await supabase.storage.from('product-images').upload(path, file, { upsert: true });
    if (uploadError) {
      toast.error(uploadError.message);
      setUploading(null);
      return;
    }
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
    if (saveError) {
      toast.error('شغل developer_control_migration.sql الأول');
      console.error('APP_SETTINGS_SAVE_FAILED', saveError);
      return;
    }
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
    <Card className="p-3 sm:p-5">
      <div className="mb-3 flex items-start gap-2 sm:mb-4 sm:gap-3">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-azraq-50 text-azraq-700 sm:h-12 sm:w-12"><Settings2 size={23} /></div>
        <div>
          <h2 className="font-display text-xl font-extrabold sm:text-2xl">هوية وإعدادات المشروع</h2>
          <p className="text-xs leading-5 text-slate-500 sm:text-sm">رفع لوجو وصور، لوحة ألوان، وأرقام الدعم لكل نسخة مباعة.</p>
        </div>
      </div>
      {loading && <LoadingState label="بنحمّل الإعدادات..." />}
      {error && <ErrorState message="جدول إعدادات المطور غير مفعل. شغل migration الأول." />}
      {!loading && (
        <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
          <div className="min-w-0 rounded-2xl bg-slate-50 p-3 sm:col-span-2">
            <div className="mb-3 flex items-center gap-2 font-display text-base font-extrabold text-ink sm:text-lg"><Upload size={18} /> رفع ملفات الهوية</div>
            <div className="grid gap-3 sm:grid-cols-2">
              {(['logo_url', 'login_hero_url'] as const).map((key) => (
                <label key={key} className="grid min-w-0 gap-2 rounded-2xl bg-white p-2.5 text-xs font-bold text-slate-600 sm:p-3 sm:text-sm">
                  {key === 'logo_url' ? 'ارفع اللوجو من جهازك' : 'ارفع صورة شاشة الدخول'}
                  {form[key] && <img src={form[key]} alt="" className="h-16 w-16 rounded-2xl object-cover sm:h-20 sm:w-20" />}
                  <Input type="file" accept="image/*" className="min-w-0 px-2 py-2 text-xs file:ml-2 file:rounded-lg file:border-0 file:bg-azraq-50 file:px-2 file:py-1 file:text-xs file:font-bold file:text-azraq-700" onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) uploadBrandFile(file, key);
                  }} />
                  {uploading === key && <span className="text-xs text-azraq-700">جاري الرفع...</span>}
                </label>
              ))}
            </div>
          </div>

          <div className="min-w-0 rounded-2xl bg-slate-50 p-3 sm:col-span-2">
            <div className="mb-3 flex items-center gap-2 font-display text-base font-extrabold text-ink sm:text-lg"><Palette size={18} /> بانل الألوان</div>
            <div className="grid min-w-0 gap-2 sm:grid-cols-2 xl:grid-cols-4">
              {colorFields.map((key) => (
                <label key={key} className="min-w-0 rounded-2xl bg-white p-2.5 text-xs font-bold text-slate-600 sm:text-sm">
                  <span>{settingsFields.find((field) => field.key === key)?.label}</span>
                  <div className="mt-2 grid min-w-0 grid-cols-[minmax(0,1fr)_42px] items-center gap-2">
                    <Input value={form[key] || ''} onChange={(event) => setForm({ ...form, [key]: event.target.value })} dir="ltr" className="min-w-0 px-2 py-2 text-[11px]" />
                    <input type="color" value={form[key] || '#0f78d2'} onChange={(event) => setForm({ ...form, [key]: event.target.value })} className="h-10 w-[42px] rounded-xl border border-slate-200 bg-white p-1" />
                  </div>
                </label>
              ))}
            </div>
          </div>

          {settingsFields.filter((field) => !colorFields.includes(field.key)).map((field) => (
            <label key={field.key} className="grid min-w-0 gap-1 text-sm font-bold text-slate-600">
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
    try {
      config = JSON.parse(form.config) as Record<string, unknown>;
    } catch {
      toast.error('صيغة إعداد التقرير JSON غير صحيحة');
      return;
    }
    const { error: saveError } = await supabase.from('developer_reports').insert({
      title: form.title,
      description: form.description || null,
      report_type: form.report_type,
      config,
      allowed_permissions: form.allowed_permissions,
      is_active: form.is_active,
      created_by: profile?.id ?? null,
    });
    if (saveError) {
      toast.error('شغل migration الخاص بالتقارير الأول');
      console.error('DEVELOPER_REPORT_SAVE_FAILED', saveError);
      return;
    }
    toast.success('التقرير/الشاشة اتسجلت');
    setForm({ ...form, title: '', description: '' });
    reload();
  };

  const addTemplates = async () => {
    const rows = reportTemplates.map((template) => ({
      ...template,
      is_active: true,
      created_by: profile?.id ?? null,
    }));
    const { error: saveError } = await supabase.from('developer_reports').upsert(rows, { onConflict: 'title' });
    if (saveError) {
      toast.error('تعذر إضافة التقارير الجاهزة. شغل migration المحدث الأول.');
      console.error('REPORT_TEMPLATES_SAVE_FAILED', saveError);
      return;
    }
    toast.success('تم تجهيز 5 تقارير إضافية');
    reload();
  };

  return (
    <Card className="p-3 sm:p-5">
      <div className="mb-3 flex items-start gap-2 sm:mb-4 sm:gap-3">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-indigo-50 text-indigo-700 sm:h-12 sm:w-12"><BarChart3 size={23} /></div>
        <div>
          <h2 className="font-display text-xl font-extrabold sm:text-2xl">مصنع التقارير والشاشات</h2>
          <p className="text-xs leading-5 text-slate-500 sm:text-sm">سجل طلبات العملاء كتقارير أو شاشات مخصصة، وحدد مين يقدر يستخدمها.</p>
        </div>
      </div>
      <button type="button" onClick={addTemplates} className="mb-4 w-full rounded-2xl bg-azraq-50 px-4 py-3 text-sm font-extrabold text-azraq-800 sm:w-auto">
        إضافة 5 تقارير جاهزة للعميل
      </button>
      <form onSubmit={submit} className="grid gap-3 xl:grid-cols-[340px_1fr]">
        <div className="grid gap-3">
          <Input required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="اسم التقرير: كشف حساب عميل" />
          <Textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="وصف مختصر أو طلب العميل" rows={3} />
          <Select value={form.report_type} onChange={(event) => setForm({ ...form, report_type: event.target.value as ReportType })}>
            {reportTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
          </Select>
          <div className="grid gap-2 rounded-2xl bg-slate-50 p-3">
            {reportPermissions.map((permission) => (
              <label key={permission} className="flex items-center gap-2 text-sm font-bold text-slate-600">
                <input type="checkbox" checked={form.allowed_permissions.includes(permission)} onChange={() => setForm({ ...form, allowed_permissions: togglePermission(form.allowed_permissions, permission) })} />
                {permission}
              </label>
            ))}
          </div>
          <label className="flex items-center gap-2 text-sm font-bold text-slate-600">
            <input type="checkbox" checked={form.is_active} onChange={(event) => setForm({ ...form, is_active: event.target.checked })} />
            التقرير نشط
          </label>
        </div>
        <div>
          <Textarea value={form.config} onChange={(event) => setForm({ ...form, config: event.target.value })} rows={9} dir="ltr" className="font-mono text-xs" />
          <Button className="mt-3"><Save size={17} /> إضافة التقرير</Button>
        </div>
      </form>
      {loading && <LoadingState label="بنحمّل التقارير..." />}
      {error && <ErrorState message="جدول developer_reports غير مفعل. شغل migration." />}
      {!loading && !error && (
        <div className="mt-4 grid gap-2">
          {data?.map((report) => (
            <div key={report.id} className="rounded-2xl bg-slate-50 p-3 text-sm">
              <div className="flex items-center justify-between gap-2">
                <p className="font-display text-lg font-extrabold text-ink">{report.title}</p>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-500">{report.report_type}</span>
              </div>
              <p className="mt-1 text-slate-500">{report.description || 'بدون وصف'}</p>
              <p className="mt-2 text-xs font-bold text-azraq-700">{report.allowed_permissions?.join(' - ') || 'بدون صلاحيات'}</p>
            </div>
          ))}
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

  const startEdit = (row: DataRow) => {
    setEditing(row);
    setJsonText(JSON.stringify(row, null, 2));
  };

  const saveRow = async () => {
    if (!editing?.id) {
      toast.error('السطر لازم يكون له id للتعديل');
      return;
    }
    let payload: DataRow;
    try {
      payload = JSON.parse(jsonText) as DataRow;
    } catch {
      toast.error('صيغة JSON غير صحيحة');
      return;
    }
    const { error: saveError } = await rawSupabase.from(selectedTable).update(payload).eq('id', editing.id);
    if (saveError) {
      toast.error(saveError.message);
      return;
    }
    toast.success('تم تعديل السطر');
    setEditing(null);
    reload();
  };

  const deleteRow = async (row: DataRow) => {
    if (!row.id) {
      toast.error('السطر لازم يكون له id للحذف');
      return;
    }
    const confirmed = window.confirm(`حذف السطر من ${selectedLabel}؟`);
    if (!confirmed) return;
    const { error: deleteError } = await rawSupabase.from(selectedTable).delete().eq('id', row.id);
    if (deleteError) {
      toast.error(deleteError.message);
      return;
    }
    toast.success('تم حذف السطر');
    reload();
  };

  return (
    <Card className="p-3 sm:p-5">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-2 sm:gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-slate-100 text-slate-700 sm:h-12 sm:w-12"><Database size={23} /></div>
          <div>
            <h2 className="font-display text-xl font-extrabold sm:text-2xl">مستعرض بيانات المشروع</h2>
            <p className="text-xs leading-5 text-slate-500 sm:text-sm">عرض مثل الإكسيل مع تعديل وحذف مباشر للجداول الأساسية.</p>
          </div>
        </div>
        <Select value={selectedTable} onChange={(event) => { setSelectedTable(event.target.value); setEditing(null); }}>
          {dataTables.map((item) => <option key={item.table} value={item.table}>{item.label}</option>)}
        </Select>
      </div>
      {loading && <LoadingState label="بنحمّل الجدول..." />}
      {error && <ErrorState message={`تعذر تحميل جدول ${selectedLabel}. تأكد من صلاحيات المطور و RLS.`} />}
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
                  <button type="button" onClick={() => startEdit(row)} className="flex-1 rounded-xl bg-azraq-50 px-3 py-2 font-bold text-azraq-700">تعديل</button>
                  <button type="button" onClick={() => deleteRow(row)} className="rounded-xl bg-rose-50 px-3 py-2 font-bold text-rose-700">حذف</button>
                </div>
              </div>
            ))}
            {!data?.length && <p className="p-4 text-sm font-bold text-slate-400">لا توجد بيانات في هذا الجدول.</p>}
          </div>
          <div className="hidden overflow-x-auto rounded-2xl border border-slate-100 md:block">
            <table className="w-full min-w-[780px] text-sm">
              <thead className="bg-slate-50 text-right text-xs font-extrabold text-slate-500">
                <tr>{columns.map((column) => <th key={column} className="px-3 py-3">{column}</th>)}<th className="px-3 py-3">إجراءات</th></tr>
              </thead>
              <tbody>
                {data?.map((row, index) => (
                  <tr key={row.id || index} className="border-t border-slate-100">
                    {columns.map((column) => <td key={column} className="max-w-[220px] px-3 py-3 text-slate-600">{shortValue(row[column])}</td>)}
                    <td className="whitespace-nowrap px-3 py-3">
                      <button type="button" onClick={() => startEdit(row)} className="ml-2 rounded-xl bg-azraq-50 px-3 py-2 font-bold text-azraq-700"><Pencil size={14} /></button>
                      <button type="button" onClick={() => deleteRow(row)} className="rounded-xl bg-rose-50 px-3 py-2 font-bold text-rose-700"><Trash2 size={14} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!data?.length && <p className="p-4 text-sm font-bold text-slate-400">لا توجد بيانات في هذا الجدول.</p>}
          </div>
        </div>
      )}
      {editing && (
        <div className="mt-4 rounded-2xl bg-slate-50 p-3">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="font-display text-lg font-extrabold">تعديل السطر JSON</h3>
            <button type="button" onClick={() => setEditing(null)} className="rounded-xl bg-white px-3 py-2 text-sm font-bold text-slate-600">إلغاء</button>
          </div>
          <Textarea value={jsonText} onChange={(event) => setJsonText(event.target.value)} rows={12} dir="ltr" className="font-mono text-xs" />
          <Button type="button" onClick={saveRow} className="mt-3"><Save size={17} /> حفظ التعديل</Button>
        </div>
      )}
    </Card>
  );
}

export function AdminDeveloperPage() {
  return (
    <div className="mx-auto w-full max-w-5xl">
      <DeveloperHeader />
      <div className="grid gap-3 sm:gap-5">
        <DeveloperSettingsCard />
        <DeveloperReportsCard />
        <DataBrowserCard />
      </div>
    </div>
  );
}
