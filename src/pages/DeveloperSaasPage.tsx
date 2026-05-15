import { FormEvent, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Code2, Database, Download, FileText, Palette, Save, Settings2, Shield, Type, Upload } from 'lucide-react';
import { Button, Card, ErrorState, Input, LoadingState, Select, Textarea } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { useSupabaseQuery } from '../hooks/useSupabaseQuery';
import { applyCustomCSS, applyTypography, exportAppSnapshot, importAppSnapshot, logAudit } from '../lib/audit';
import type { AppCustomCSS, AppLabel, AppSnapshot, AppTypography, AuditLog, PlanConfig } from '../types/developer';
import { auditActionLabels, auditEntityLabels, labelCategories, typographyCategories } from '../types/developer';

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

/* ─── Section 1: Typography ─── */
function TypographySection() {
  const { profile } = useAuth();
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [filterCat, setFilterCat] = useState('all');

  const { data, loading, error, reload } = useSupabaseQuery(async () => {
    const { data, error } = await supabase.from('app_typography').select('*').order('category');
    if (error) throw error;
    return data as AppTypography[];
  }, []);

  useEffect(() => {
    if (data) {
      const next: Record<string, string> = {};
      data.forEach((row) => { next[row.key] = row.value; });
      setForm(next);
    }
  }, [data]);

  const filtered = data?.filter((row) => filterCat === 'all' || row.category === filterCat) || [];

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const rows = (data || []).map((row) => ({
      key: row.key,
      value: form[row.key] ?? row.value,
      category: row.category,
      label: row.label,
      css_variable: row.css_variable,
      updated_at: new Date().toISOString(),
    }));
    const { error: saveErr } = await supabase.from('app_typography').upsert(rows, { onConflict: 'key' });
    if (saveErr) { toast.error(saveErr.message); setSaving(false); return; }
    applyTypography(rows);
    await logAudit(profile?.id ?? null, 'update', 'typography', null, null, { count: rows.length });
    toast.success('تم حفظ إعدادات الخطوط');
    setSaving(false);
    reload();
  };

  return (
    <Card>
      <SectionHeader icon={<Type size={20} />} title="الخطوط والأحجام" subtitle="تحكم في كل إعدادات الخطوط والأحجام والأوزان والتباعد." />
      {loading && <LoadingState />}
      {error && <ErrorState message={error} />}
      {!loading && !error && (
        <form onSubmit={handleSave} className="space-y-3">
          <Select value={filterCat} onChange={(e) => setFilterCat(e.target.value)}>
            <option value="all">كل الفئات</option>
            {Object.entries(typographyCategories).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </Select>
          <div className="grid gap-2">
            {filtered.map((row) => (
              <div key={row.key} className="grid grid-cols-[1fr_1fr_auto] items-center gap-2 rounded-xl bg-slate-50 p-2">
                <span className="text-xs font-bold text-slate-600 truncate">{row.label}</span>
                <Input
                  value={form[row.key] ?? ''}
                  onChange={(e) => setForm({ ...form, [row.key]: e.target.value })}
                  className="py-1.5 text-xs"
                  dir="ltr"
                />
                <span className="text-[10px] text-slate-400 font-mono hidden sm:block" style={{ [row.css_variable?.includes('size') ? 'fontSize' : 'fontWeight']: form[row.key] || row.value }}>
                  معاينة
                </span>
              </div>
            ))}
          </div>
          <Button disabled={saving} className="w-full">
            <Save size={16} /> {saving ? 'جاري الحفظ...' : 'حفظ الكل'}
          </Button>
        </form>
      )}
    </Card>
  );
}



/* ─── Section 2: App Labels ─── */
function LabelsSection() {
  const { profile } = useAuth();
  const [form, setForm] = useState<Record<string, string>>({});
  const [filterCat, setFilterCat] = useState('all');
  const [saving, setSaving] = useState(false);

  const { data, loading, error, reload } = useSupabaseQuery(async () => {
    const { data, error } = await supabase.from('app_labels').select('*').order('category');
    if (error) throw error;
    return data as AppLabel[];
  }, []);

  useEffect(() => {
    if (data) {
      const next: Record<string, string> = {};
      data.forEach((row) => { next[row.key] = row.value; });
      setForm(next);
    }
  }, [data]);

  const filtered = data?.filter((row) => filterCat === 'all' || row.category === filterCat) || [];

  const resetToDefault = (key: string, defaultValue: string) => {
    setForm((prev) => ({ ...prev, [key]: defaultValue }));
  };

  const handleBulkSave = async () => {
    setSaving(true);
    const rows = (data || []).map((row) => ({
      key: row.key,
      value: form[row.key] ?? row.value,
      default_value: row.default_value,
      category: row.category,
      description: row.description,
      updated_by: profile?.id ?? null,
      updated_at: new Date().toISOString(),
    }));
    const { error: saveErr } = await supabase.from('app_labels').upsert(rows, { onConflict: 'key' });
    if (saveErr) { toast.error(saveErr.message); setSaving(false); return; }
    await logAudit(profile?.id ?? null, 'update', 'label', null, null, { count: rows.length });
    toast.success('تم حفظ نصوص التطبيق');
    setSaving(false);
    reload();
  };

  return (
    <Card>
      <SectionHeader icon={<FileText size={20} />} title="نصوص التطبيق" subtitle="تحكم في كل النصوص الظاهرة للعميل. فلتر بالفئة وعدّل أي نص." color="bg-emerald-50 text-emerald-700" />
      {loading && <LoadingState />}
      {error && <ErrorState message={error} />}
      {!loading && !error && (
        <div className="space-y-3">
          <Select value={filterCat} onChange={(e) => setFilterCat(e.target.value)}>
            <option value="all">كل الفئات</option>
            {Object.entries(labelCategories).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </Select>
          <div className="grid gap-2 max-h-[400px] overflow-y-auto">
            {filtered.map((row) => (
              <div key={row.key} className="grid grid-cols-[0.8fr_1fr_auto] items-center gap-2 rounded-xl bg-slate-50 p-2">
                <span className="text-[11px] font-bold text-slate-500 truncate font-mono" dir="ltr">{row.key}</span>
                <Input
                  value={form[row.key] ?? ''}
                  onChange={(e) => setForm({ ...form, [row.key]: e.target.value })}
                  className="py-1.5 text-xs"
                />
                <button
                  type="button"
                  onClick={() => resetToDefault(row.key, row.default_value)}
                  className="text-[10px] font-bold text-azraq-600 hover:text-azraq-800 whitespace-nowrap"
                  title="إعادة للافتراضي"
                >
                  ↺
                </button>
              </div>
            ))}
          </div>
          <Button disabled={saving} onClick={handleBulkSave} className="w-full">
            <Save size={16} /> {saving ? 'جاري الحفظ...' : 'حفظ جميع النصوص'}
          </Button>
        </div>
      )}
    </Card>
  );
}



/* ─── Section 3: Plan Management ─── */
function PlansSection() {
  const { profile } = useAuth();
  const [editingPlan, setEditingPlan] = useState<string | null>(null);
  const [planForm, setPlanForm] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);

  const { data, loading, error, reload } = useSupabaseQuery(async () => {
    const { data, error } = await supabase.from('plan_config').select('*').order('sort_order');
    if (error) throw error;
    return data as PlanConfig[];
  }, []);

  const startEdit = (plan: PlanConfig) => {
    setEditingPlan(plan.id);
    setPlanForm({
      name_ar: plan.name_ar,
      price_monthly: plan.price_monthly,
      price_yearly: plan.price_yearly,
      badge_text: plan.badge_text || '',
      is_active: plan.is_active,
      features: plan.features.join('\n'),
      limits: JSON.stringify(plan.limits, null, 2),
    });
  };

  const savePlan = async (planId: string) => {
    setSaving(true);
    let parsedLimits: Record<string, number | string> = {};
    try {
      parsedLimits = JSON.parse(String(planForm.limits || '{}'));
    } catch { toast.error('صيغة JSON للحدود غير صحيحة'); setSaving(false); return; }

    const payload = {
      name_ar: String(planForm.name_ar || ''),
      price_monthly: Number(planForm.price_monthly || 0),
      price_yearly: Number(planForm.price_yearly || 0),
      badge_text: String(planForm.badge_text || '') || null,
      is_active: Boolean(planForm.is_active),
      features: String(planForm.features || '').split('\n').filter(Boolean),
      limits: parsedLimits,
      updated_at: new Date().toISOString(),
    };

    const { error: saveErr } = await supabase.from('plan_config').update(payload).eq('id', planId);
    if (saveErr) { toast.error(saveErr.message); setSaving(false); return; }
    await logAudit(profile?.id ?? null, 'update', 'plan', planId);
    toast.success('تم حفظ الخطة');
    setSaving(false);
    setEditingPlan(null);
    reload();
  };

  return (
    <Card>
      <SectionHeader icon={<Settings2 size={20} />} title="إدارة الخطط" subtitle="عرض وتعديل خطط الاشتراك: الأسعار، الميزات، الحدود، الشارة." color="bg-purple-50 text-purple-700" />
      {loading && <LoadingState />}
      {error && <ErrorState message={error} />}
      {!loading && !error && (
        <div className="grid gap-3 sm:grid-cols-2">
          {(data || []).map((plan) => {
            const isEditing = editingPlan === plan.id;
            return (
              <div key={plan.id} className={`rounded-2xl border p-3 transition ${plan.is_active ? 'border-emerald-200 bg-emerald-50/50' : 'border-slate-200 bg-slate-50'}`}>
                {!isEditing ? (
                  <>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-extrabold text-sm text-ink">{plan.name_ar}</h3>
                      {plan.badge_text && <span className="rounded-full bg-azraq-100 px-2 py-0.5 text-[10px] font-bold text-azraq-700">{plan.badge_text}</span>}
                    </div>
                    <p className="text-xs text-slate-500 mb-1">{plan.price_monthly} {plan.currency}/شهري • {plan.price_yearly} {plan.currency}/سنوي</p>
                    <p className="text-[10px] text-slate-400 mb-2">{plan.features.slice(0, 3).join(' • ')}{plan.features.length > 3 ? ` +${plan.features.length - 3}` : ''}</p>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => startEdit(plan)} className="text-xs font-bold text-azraq-700 hover:underline">تعديل</button>
                      <span className={`text-[10px] font-bold ${plan.is_active ? 'text-emerald-600' : 'text-slate-400'}`}>{plan.is_active ? 'نشط' : 'متوقف'}</span>
                    </div>
                  </>
                ) : (
                  <div className="space-y-2">
                    <Input value={String(planForm.name_ar || '')} onChange={(e) => setPlanForm({ ...planForm, name_ar: e.target.value })} placeholder="اسم الخطة بالعربي" className="py-1.5 text-xs" />
                    <div className="grid grid-cols-2 gap-2">
                      <Input type="number" value={String(planForm.price_monthly || '')} onChange={(e) => setPlanForm({ ...planForm, price_monthly: e.target.value })} placeholder="شهري" className="py-1.5 text-xs" dir="ltr" />
                      <Input type="number" value={String(planForm.price_yearly || '')} onChange={(e) => setPlanForm({ ...planForm, price_yearly: e.target.value })} placeholder="سنوي" className="py-1.5 text-xs" dir="ltr" />
                    </div>
                    <Input value={String(planForm.badge_text || '')} onChange={(e) => setPlanForm({ ...planForm, badge_text: e.target.value })} placeholder="نص الشارة (اختياري)" className="py-1.5 text-xs" />
                    <Textarea value={String(planForm.features || '')} onChange={(e) => setPlanForm({ ...planForm, features: e.target.value })} placeholder="ميزة في كل سطر" rows={3} className="text-xs" />
                    <Textarea value={String(planForm.limits || '{}')} onChange={(e) => setPlanForm({ ...planForm, limits: e.target.value })} placeholder='{"max_products": 50}' rows={2} className="text-xs font-mono" dir="ltr" />
                    <label className="flex items-center gap-2 text-xs font-bold text-slate-600">
                      <input type="checkbox" checked={Boolean(planForm.is_active)} onChange={(e) => setPlanForm({ ...planForm, is_active: e.target.checked })} className="accent-azraq-700" />
                      نشط
                    </label>
                    <div className="flex gap-2">
                      <Button disabled={saving} onClick={() => savePlan(plan.id)} className="flex-1 py-1.5 text-xs">
                        <Save size={14} /> {saving ? 'حفظ...' : 'حفظ'}
                      </Button>
                      <button type="button" onClick={() => setEditingPlan(null)} className="text-xs font-bold text-slate-500 hover:text-slate-700">إلغاء</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}



/* ─── Section 4: Audit Log ─── */
function AuditLogSection() {
  const [filterAction, setFilterAction] = useState('all');

  const { data, loading, error } = useSupabaseQuery(async () => {
    const { data, error } = await supabase
      .from('audit_log')
      .select('*, profiles(full_name, role)')
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) throw error;
    return data as AuditLog[];
  }, []);

  const filtered = data?.filter((row) => filterAction === 'all' || row.action === filterAction) || [];

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('ar-EG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <Card>
      <SectionHeader icon={<Shield size={20} />} title="سجل التغييرات" subtitle="مراجعة آخر العمليات المسجلة: من فعل ماذا ومتى." color="bg-rose-50 text-rose-700" />
      {loading && <LoadingState />}
      {error && <ErrorState message={error} />}
      {!loading && !error && (
        <div className="space-y-3">
          <Select value={filterAction} onChange={(e) => setFilterAction(e.target.value)}>
            <option value="all">كل الإجراءات</option>
            {Object.entries(auditActionLabels).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </Select>
          <div className="max-h-[350px] overflow-y-auto rounded-xl border border-slate-100">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-slate-50">
                <tr className="text-right">
                  <th className="p-2 font-bold text-slate-500">المستخدم</th>
                  <th className="p-2 font-bold text-slate-500">الإجراء</th>
                  <th className="p-2 font-bold text-slate-500">النوع</th>
                  <th className="p-2 font-bold text-slate-500 hidden sm:table-cell">الوقت</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.slice(0, 50).map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/50">
                    <td className="p-2 font-bold text-ink">{row.profiles?.full_name || 'نظام'}</td>
                    <td className="p-2">
                      <span className="rounded-full bg-azraq-50 px-2 py-0.5 text-[10px] font-bold text-azraq-700">
                        {auditActionLabels[row.action] || row.action}
                      </span>
                    </td>
                    <td className="p-2 text-slate-500">{auditEntityLabels[row.entity_type] || row.entity_type}</td>
                    <td className="p-2 text-slate-400 hidden sm:table-cell" dir="ltr">{formatTime(row.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && <p className="p-4 text-center text-xs text-slate-400">لا توجد سجلات</p>}
          </div>
        </div>
      )}
    </Card>
  );
}



/* ─── Section 5: Custom CSS ─── */
function CustomCSSSection() {
  const { profile } = useAuth();
  const [css, setCss] = useState('');
  const [isActive, setIsActive] = useState(false);
  const [saving, setSaving] = useState(false);

  const { data, loading, error, reload } = useSupabaseQuery(async () => {
    const { data, error } = await supabase.from('app_custom_css').select('*').eq('id', 'global').single();
    if (error && error.code !== 'PGRST116') throw error;
    return data as AppCustomCSS | null;
  }, []);

  useEffect(() => {
    if (data) {
      setCss(data.css_content || '');
      setIsActive(data.is_active);
    }
  }, [data]);

  const handleSave = async () => {
    setSaving(true);
    const payload = {
      id: 'global',
      css_content: css,
      is_active: isActive,
      updated_by: profile?.id ?? null,
      updated_at: new Date().toISOString(),
    };
    const { error: saveErr } = await supabase.from('app_custom_css').upsert(payload, { onConflict: 'id' });
    if (saveErr) { toast.error(saveErr.message); setSaving(false); return; }
    applyCustomCSS(css, isActive);
    await logAudit(profile?.id ?? null, 'update', 'css', 'global', null, { is_active: isActive });
    toast.success('تم حفظ CSS المخصص');
    setSaving(false);
    reload();
  };

  const handleToggle = async () => {
    const next = !isActive;
    setIsActive(next);
    applyCustomCSS(css, next);
  };

  return (
    <Card>
      <SectionHeader icon={<Code2 size={20} />} title="CSS مخصص" subtitle="حقن CSS مخصص على التطبيق مباشرة. فعّل أو أوقف في أي وقت." color="bg-amber-50 text-amber-700" />
      {loading && <LoadingState />}
      {error && <ErrorState message={error} />}
      {!loading && !error && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-xs font-bold text-slate-600">
              <input type="checkbox" checked={isActive} onChange={handleToggle} className="accent-azraq-700" />
              {isActive ? 'مفعّل' : 'متوقف'}
            </label>
            <span className="text-[10px] text-slate-400">التغييرات تظهر فورًا عند التفعيل</span>
          </div>
          <Textarea
            value={css}
            onChange={(e) => setCss(e.target.value)}
            placeholder={`/* أضف CSS مخصص هنا */\n.my-class {\n  color: red;\n}`}
            rows={8}
            className="font-mono text-xs"
            dir="ltr"
          />
          <Button disabled={saving} onClick={handleSave} className="w-full">
            <Save size={16} /> {saving ? 'جاري الحفظ...' : 'حفظ CSS'}
          </Button>
        </div>
      )}
    </Card>
  );
}



/* ─── Section 6: Snapshots ─── */
function SnapshotsSection() {
  const { profile } = useAuth();
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);

  const { data, loading, error, reload } = useSupabaseQuery(async () => {
    const { data, error } = await supabase
      .from('app_snapshots')
      .select('*, profiles(full_name)')
      .order('created_at', { ascending: false })
      .limit(20);
    if (error) throw error;
    return data as AppSnapshot[];
  }, []);

  const handleExport = async () => {
    setExporting(true);
    try {
      const snapshot = await exportAppSnapshot();
      const title = `نسخة ${new Date().toLocaleDateString('ar-EG')}`;
      const { error: saveErr } = await supabase.from('app_snapshots').insert({
        title,
        description: null,
        snapshot_data: snapshot,
        version: snapshot.version || '1.0',
        created_by: profile?.id ?? null,
      });
      if (saveErr) { toast.error(saveErr.message); setExporting(false); return; }
      await logAudit(profile?.id ?? null, 'export', 'snapshot', null, null, { title });
      toast.success('تم تصدير النسخة الاحتياطية بنجاح');
      reload();
    } catch (err) {
      toast.error('تعذر تصدير النسخة');
    }
    setExporting(false);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const text = await file.text();
      const snapshot = JSON.parse(text);
      const result = await importAppSnapshot(snapshot);
      if (result.success) {
        await logAudit(profile?.id ?? null, 'import', 'snapshot', null, null, { filename: file.name });
        toast.success('تم استيراد النسخة بنجاح');
        reload();
      } else {
        toast.error(`أخطاء: ${result.errors.join(', ')}`);
      }
    } catch {
      toast.error('ملف JSON غير صالح');
    }
    setImporting(false);
    e.target.value = '';
  };

  const downloadSnapshot = (snapshot: AppSnapshot) => {
    const blob = new Blob([JSON.stringify(snapshot.snapshot_data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `snapshot-${snapshot.id.slice(0, 8)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <SectionHeader icon={<Database size={20} />} title="نسخ احتياطي" subtitle="تصدير واستيراد إعدادات التطبيق كاملة. حافظ على نسخ آمنة." color="bg-indigo-50 text-indigo-700" />
      {loading && <LoadingState />}
      {error && <ErrorState message={error} />}
      {!loading && !error && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button disabled={exporting} onClick={handleExport}>
              <Download size={16} /> {exporting ? 'جاري التصدير...' : 'تصدير نسخة جديدة'}
            </Button>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-azraq-100 bg-white px-4 py-2.5 text-sm font-bold text-azraq-800 shadow-sm transition hover:-translate-y-0.5 hover:border-azraq-200">
              <Upload size={16} /> {importing ? 'جاري الاستيراد...' : 'استيراد من ملف'}
              <input type="file" accept=".json" onChange={handleImport} className="hidden" disabled={importing} />
            </label>
          </div>
          {(data && data.length > 0) && (
            <div className="grid gap-2 max-h-[300px] overflow-y-auto">
              {data.map((snap) => (
                <div key={snap.id} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-3">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-ink truncate">{snap.title}</p>
                    <p className="text-[10px] text-slate-400">
                      {snap.profiles?.full_name || 'نظام'} • {new Date(snap.created_at).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => downloadSnapshot(snap)}
                    className="shrink-0 rounded-xl bg-azraq-50 p-2 text-azraq-700 hover:bg-azraq-100 transition"
                    title="تحميل"
                  >
                    <Download size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
          {data?.length === 0 && <p className="text-center text-xs text-slate-400 py-4">لا توجد نسخ احتياطية بعد</p>}
        </div>
      )}
    </Card>
  );
}



/* ─── Main Page Export ─── */
export function DeveloperSaasPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white p-3 sm:p-4" dir="rtl">
      {/* Header */}
      <div className="mb-4 overflow-hidden rounded-2xl border border-white/80 bg-gradient-to-br from-azraq-700 via-azraq-800 to-azraq-950 p-4 text-white shadow-soft">
        <p className="text-[10px] font-extrabold text-azraq-300">SaaS Control Panel</p>
        <h1 className="mt-0.5 font-display text-lg font-extrabold sm:text-2xl">لوحة تحكم المطور الكاملة</h1>
        <p className="mt-1 text-xs leading-5 text-azraq-200">
          تحكم مطلق في الخطوط، النصوص، الخطط، سجل التغييرات، التصميم المخصص، والنسخ الاحتياطي.
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {['الخطوط', 'النصوص', 'الخطط', 'سجل التغييرات', 'CSS مخصص', 'نسخ احتياطي'].map((label) => (
            <span key={label} className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-bold text-white">
              <Palette size={10} />
              {label}
            </span>
          ))}
        </div>
      </div>

      {/* Sections Grid */}
      <div className="grid gap-4 lg:grid-cols-2">
        <TypographySection />
        <LabelsSection />
        <PlansSection />
        <AuditLogSection />
        <CustomCSSSection />
        <SnapshotsSection />
      </div>
    </div>
  );
}
