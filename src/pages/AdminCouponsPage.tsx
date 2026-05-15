import { FormEvent, useState } from 'react';
import toast from 'react-hot-toast';
import { Calendar, CheckCircle2, Plus, Trash2, XCircle } from 'lucide-react';
import { Button, Card, ErrorState, Input, LoadingState, PageHeader, Select } from '../components/ui';
import { formatCurrency, formatDate } from '../lib/labels';
import { supabase } from '../lib/supabase';
import { useSupabaseQuery } from '../hooks/useSupabaseQuery';
import type { Coupon, CouponType } from '../types/database';

export function AdminCouponsPage() {
  const [form, setForm] = useState({
    code: '',
    type: 'percent' as CouponType,
    value: '10',
    min_order: '0',
    max_uses: '',
    starts_at: '',
    expires_at: '',
    is_active: true,
  });

  const { data, loading, error, reload } = useSupabaseQuery(async () => {
    const result = await supabase.from('coupons').select('*').order('created_at', { ascending: false });
    if (result.error) throw result.error;
    return (result.data || []) as Coupon[];
  }, []);

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (form.starts_at && form.expires_at && new Date(form.starts_at) >= new Date(form.expires_at)) {
      toast.error('تاريخ البداية يجب أن يكون قبل تاريخ الانتهاء');
      return;
    }
    const { error: saveError } = await supabase.from('coupons').insert({
      code: form.code.trim().toUpperCase(),
      type: form.type,
      value: Number(form.value) || 0,
      min_order: Number(form.min_order) || 0,
      max_uses: form.max_uses ? Number(form.max_uses) : null,
      starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : null,
      expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
      is_active: form.is_active,
    });
    if (saveError) { toast.error(saveError.message); return; }
    toast.success('تم إضافة الكوبون');
    setForm({ code: '', type: 'percent', value: '10', min_order: '0', max_uses: '', starts_at: '', expires_at: '', is_active: true });
    reload();
  };

  const remove = async (id: string) => {
    if (!window.confirm('حذف الكوبون؟')) return;
    const { error: deleteError } = await supabase.from('coupons').delete().eq('id', id);
    if (deleteError) toast.error(deleteError.message); else reload();
  };

  const toggleActive = async (coupon: Coupon) => {
    const { error: updateError } = await supabase.from('coupons').update({ is_active: !coupon.is_active }).eq('id', coupon.id);
    if (updateError) toast.error(updateError.message); else reload();
  };

  return (
    <div className="pb-24">
      <PageHeader title="الكوبونات" subtitle="إضافة وإدارة أكواد الخصم للعملاء." />
      <div className="grid gap-3 xl:grid-cols-[360px_1fr]">
        <Card>
          <h2 className="mb-2 font-display text-base font-extrabold text-ink">إضافة كوبون جديد</h2>
          <form onSubmit={save} className="grid gap-2">
            <Input required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="كود الخصم (مثال: SAVE20)" dir="ltr" />
            <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as CouponType })}>
              <option value="percent">نسبة مئوية (%)</option>
              <option value="fixed">قيمة ثابتة (ج.م)</option>
            </Select>
            <Input required type="number" min="0" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} placeholder={form.type === 'percent' ? 'نسبة الخصم (مثال: 10)' : 'قيمة الخصم (مثال: 50)'} />
            <Input type="number" min="0" value={form.min_order} onChange={(e) => setForm({ ...form, min_order: e.target.value })} placeholder="أقل قيمة للطلب (0 = بدون حد)" />
            <div>
              <label className="mb-1 block text-2xs font-bold text-slate-500">عدد مرات الاستخدام (فارغ = غير محدود)</label>
              <Input type="number" min="1" value={form.max_uses} onChange={(e) => setForm({ ...form, max_uses: e.target.value })} placeholder="مثال: 1 = مرة واحدة" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block text-2xs font-bold text-slate-500">صالح من</label>
                <Input type="datetime-local" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} />
              </div>
              <div>
                <label className="mb-1 block text-2xs font-bold text-slate-500">صالح حتى</label>
                <Input type="datetime-local" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} />
              </div>
            </div>
            <label className="flex items-center gap-2 text-xs font-bold text-slate-600">
              <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
              الكوبون نشط
            </label>
            <Button className="w-full"><Plus size={15} /> إضافة كوبون</Button>
          </form>
        </Card>

        <div className="grid content-start gap-2">
          {loading && <LoadingState />}
          {error && <ErrorState message={error} />}
          {!loading && !error && data?.length === 0 && (
            <div className="rounded-xl border-2 border-dashed border-slate-200 p-6 text-center text-xs font-bold text-slate-500">
              لا توجد كوبونات بعد — أضف أول كوبون من الجانب
            </div>
          )}
          {data?.map((coupon) => {
            const now = new Date();
            const isExpired = coupon.expires_at ? new Date(coupon.expires_at) < now : false;
            const notStartedYet = coupon.starts_at ? new Date(coupon.starts_at) > now : false;
            const isMaxed = coupon.max_uses != null && coupon.used_count >= coupon.max_uses;
            const effectivelyActive = coupon.is_active && !isExpired && !notStartedYet && !isMaxed;

            return (
              <Card key={coupon.id}>
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-display text-base font-extrabold tracking-wider text-ink" dir="ltr">{coupon.code}</span>
                      {effectivelyActive
                        ? <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-2xs font-extrabold text-emerald-700"><CheckCircle2 size={10} /> نشط</span>
                        : <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-2xs font-extrabold text-rose-600"><XCircle size={10} /> {isExpired ? 'منتهي' : notStartedYet ? 'لم يبدأ' : isMaxed ? 'استنفد' : 'موقوف'}</span>
                      }
                    </div>
                    <p className="mt-1 text-xs font-bold text-slate-600">
                      خصم {coupon.type === 'percent' ? `${coupon.value}%` : formatCurrency(coupon.value)}
                      {coupon.min_order > 0 && ` — أقل طلب ${formatCurrency(coupon.min_order)}`}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-2xs font-bold text-slate-500">
                      <span>استخدام: {coupon.used_count}{coupon.max_uses ? ` / ${coupon.max_uses}` : ' (غير محدود)'}</span>
                      {coupon.starts_at && <span className="flex items-center gap-1"><Calendar size={10} /> من: {formatDate(coupon.starts_at)}</span>}
                      {coupon.expires_at && <span className={`flex items-center gap-1 ${isExpired ? 'text-rose-500' : ''}`}><Calendar size={10} /> حتى: {formatDate(coupon.expires_at)}</span>}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <button type="button" onClick={() => toggleActive(coupon)} className={`rounded-xl px-2.5 py-1.5 text-xs font-extrabold transition ${coupon.is_active ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>
                      {coupon.is_active ? 'إيقاف' : 'تفعيل'}
                    </button>
                    <button type="button" onClick={() => remove(coupon.id)} className="grid h-8 w-8 place-items-center rounded-xl bg-rose-50 text-rose-600">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
