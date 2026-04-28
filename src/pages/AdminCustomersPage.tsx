import { FormEvent, useState } from 'react';
import toast from 'react-hot-toast';
import { Button, Card, EmptyState, ErrorState, Input, LoadingState, PageHeader, Select, Textarea } from '../components/ui';
import { phoneToInternalEmail } from '../lib/auth';
import { roleLabels } from '../lib/labels';
import { supabase } from '../lib/supabase';
import { useSupabaseQuery } from '../hooks/useSupabaseQuery';
import type { Profile, Role } from '../types/database';

export function AdminCustomersPage() {
  const [editing, setEditing] = useState<Profile | null>(null);
  const [form, setForm] = useState({ full_name: '', address: '', role: 'customer' as Role });
  const [phonePreview, setPhonePreview] = useState('');
  const { data, loading, error, reload } = useSupabaseQuery(async () => {
    const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data as Profile[];
  }, []);

  const startEdit = (profile: Profile) => {
    setEditing(profile);
    setForm({
      full_name: profile.full_name || '',
      address: profile.address || '',
      role: profile.role,
    });
  };

  const reset = () => {
    setEditing(null);
    setForm({ full_name: '', address: '', role: 'customer' });
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!editing) {
      toast.error('اختار مستخدم من القائمة عشان تعدّل بياناته');
      return;
    }

    const { error } = await supabase.from('profiles').update({
      full_name: form.full_name,
      address: form.address,
      role: form.role,
    }).eq('id', editing.id);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success('بيانات المستخدم اتحدثت');
    reset();
    reload();
  };

  const previewEmail = () => {
    try {
      return phonePreview ? phoneToInternalEmail(phonePreview) : 'phone201014099991@azraqmarket.app';
    } catch (error) {
      return error instanceof Error ? error.message : 'رقم غير صالح';
    }
  };

  return (
    <div>
      <PageHeader title="العملاء" subtitle="راجع العملاء وعدّل الاسم والعنوان والدور بسهولة." />
      <div className="grid gap-5 xl:grid-cols-[380px_1fr]">
        <Card>
          <h2 className="mb-4 font-display text-2xl font-extrabold">{editing ? 'تعديل مستخدم' : 'اختار مستخدم'}</h2>
          <form onSubmit={submit} className="space-y-3">
            <Input required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} placeholder="الاسم" />
            <Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>
              {Object.entries(roleLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </Select>
            <Textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="العنوان" rows={3} />
            <Button disabled={!editing} className="w-full">حفظ التعديل</Button>
            {editing && (
              <button type="button" onClick={reset} className="w-full rounded-2xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-600">
                إلغاء
              </button>
            )}
          </form>
          <div className="mt-5 rounded-2xl border border-amber-100 bg-amber-50 p-4 text-xs font-semibold leading-6 text-amber-700">
            عشان تعمل مشرف أو مخزن أو توصيل: اعمل المستخدم من Supabase Auth، وبعدها عدّل دوره هنا أو من SQL.
          </div>
          <div className="mt-4 space-y-2">
            <Input dir="ltr" value={phonePreview} onChange={(event) => setPhonePreview(event.target.value)} placeholder="01014099991" />
            <p className="rounded-2xl bg-azraq-50 p-3 text-xs font-bold text-azraq-800" dir="ltr">{previewEmail()}</p>
          </div>
        </Card>
        <div className="grid gap-3">
          {loading && <LoadingState />}
          {error && <ErrorState message={error} />}
          {!loading && !error && data?.length === 0 && <EmptyState title="مفيش مستخدمين" body="المستخدمين هيظهروا هنا بعد التسجيل أو بعد إضافتهم من Supabase." />}
          {data?.map((profile) => (
            <Card key={profile.id} className="grid gap-2 md:grid-cols-[1fr_auto] md:items-center">
              <div>
                <h3 className="font-display text-lg font-extrabold">{profile.full_name || 'من غير اسم'}</h3>
                <p className="text-sm text-slate-500" dir="ltr">{profile.phone}</p>
                <p className="text-xs text-slate-400">{profile.address || 'مفيش عنوان'}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-azraq-50 px-3 py-1 text-xs font-extrabold text-azraq-700">{roleLabels[profile.role]}</span>
                <button onClick={() => startEdit(profile)} className="rounded-2xl bg-white px-4 py-2 text-sm font-bold text-azraq-700 shadow-sm">تعديل</button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
