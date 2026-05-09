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
    if (saveError) {
      toast.error(saveError.message);
      return;
    }
    toast.success('تم إضافة الكوبون');
    setForm({ code: '', type: 'percent', value: '10', min_order: '0', max_uses: '', starts_at: '', expires_at: '', is_active: true });
    reload();
  };

  const remove = async (id: string) => {
    if (!window.confirm('حذف الكوبون؟')) return;
    const { error: deleteError } = await supabase.from('coupons').delete().eq('id', id);
    if (deleteError) toast.error(deleteError.message);
    else reload();
  };

  const toggleActive = async (coupon: Coupon) => {
    const { error: updateError } = await supabase.from('coupons').update({ is_active: !coupon.is_active }).eq('id', coupon.id);
    if (updateError) toast.error(updateError.message);
    else reload();
  };

  return (
    <div>
      <PageHeader title="الكوبونات" subtitle="إضافة وإدارة أكواد الخصم للعملاء." />
      <div className="grid gap-5 xl:grid-cols-[400px_1fr]">

        {/* Add coupon form */}
        <Card>
          <h2 className="mb-4 font-display text-lg font-extrabold text-ink">إضافة كوبون جديد</h2>
          <form onSubmit={save} className="space-y-3">
            <Input
              required
              value={form.code}
              onChange={(event) => setForm({ ...form, code: event.target.value })}
              placeholder="كود الخصم (مثال: SAVE20)"
              dir="ltr"
            />
            <Select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value as CouponType })}>
              <option value="percent">نسبة مئوية (%)</option>
              <option value="fixed">قيمة ثابتة (ج.م)</option>
            </Select>
            <Input
              required
              type="number"
              min="0"
              value={form.value}
              onChange={(event) => setForm({ ...form, value: event.target.value })}
              placeholder={form.type === 'percent' ? 'نسبة الخصم (مثال: 10)' : 'قيمة الخصم (مثال: 50)'}
            />
            <Input
              type="number"
              min="0"
              value={form.min_order}
              onChange={(event) => setForm({ ...form, min_order: event.target.value })}
              placeholder="أقل قيمة للطلب (0 = بدون حد)"
            />
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-500">عدد مرات الاستخدام (فارغ = غير محدود)</label>
              <Input
                type="number"
                min="1"
                value={form.max_uses}
                onChange={(event) => setForm({ ...form, max_uses: event.target.value })}
                placeholder="مثال: 1 = مرة واحدة، 100 = مئة مرة"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-500">صالح من</label>
                <Input
                  type="datetime-local"
                  value={form.starts_at}
                  onChange={(event) => setForm({ ...form, starts_at: event.target.value })}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-500">صالح حتى</label>
                <Input
                  type="datetime-local"
                  value={form.expires_at}
                  onChange={(event) => setForm({ ...form, expires_at: event.target.value })}
                />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm font-bold text-slate-600">
              <input type="checkbox" checked={form.is_active} onChange={(event) => setForm({ ...form, is_active: event.target.checked })} />
              الكوبون نشط
            </label>
            <Button className="w-full"><Plus size={17} /> إضافة كوبون</Button>
          </form>
        </Card>

        {/* Coupons list */}
        <div className="space-y-3">
          {loading && <LoadingState />}
          {error && <ErrorState message={error} />}
          {!loading && !error && data?.length === 0 && (
            <div className="rounded-[20px] border-2 border-dashed border-slate-200 p-8 text-center text-sm font-bold text-slate-400">
              لا توجد كوبونات بعد — أضف أول كوبون من الجانب الأيسر
            </div>
          )}
          {data?.map((coupon) => {
            const now = new Date();
            const isExpired = coupon.expires_at ? new Date(coupon.expires_at) < now : false;
            const notStartedYet = coupon.starts_at ? new Date(coupon.starts_at) > now : false;
            const isMaxed = coupon.max_uses != null && coupon.used_count >= coupon.max_uses;
            const effectivelyActive = coupon.is_active && !isExpired && !notStartedYet && !isMaxed;

            return (
              <Card key={coupon.id} className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-start">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-display text-xl font-extrabold tracking-wider text-ink" dir="ltr">{coupon.code}</span>
                    {effectivelyActive
                      ? <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-extrabold text-emerald-700"><CheckCircle2 size={11} /> نشط</span>
                      : <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-extrabold text-rose-600"><XCircle size={11} /> {isExpired ? 'منتهي' : notStartedYet ? 'لم يبدأ' : isMaxed ? 'استنفد' : 'موقوف'}</span>
                    }
                  </div>

                  <p className="mt-1.5 text-sm font-bold text-slate-600">
                    خصم {coupon.type === 'percent' ? `${coupon.value}%` : formatCurrency(coupon.value)}
                    {coupon.min_order > 0 && ` — أقل طلب ${formatCurrency(coupon.min_order)}`}
                  </p>

                  <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs font-bold text-slate-400">
                    <span>الاستخدام: {coupon.used_count}{coupon.max_uses ? ` / ${coupon.max_uses}` : ' (غير محدود)'}</span>
                    {coupon.starts_at && (
                      <span className="flex items-center gap-1"><Calendar size={11} /> من: {formatDate(coupon.starts_at)}</span>
                    )}
                    {coupon.expires_at && (
                      <span className={`flex items-center gap-1 ${isExpired ? 'text-rose-500' : ''}`}>
                        <Calendar size={11} /> حتى: {formatDate(coupon.expires_at)}
                      </span>
                    )}
                    {!coupon.starts_at && !coupon.expires_at && <span>بدون تاريخ محدد</span>}
                  </div>
                </div>

                <div className="flex items-center gap-2 sm:flex-col sm:items-end">
                  <button
                    type="button"
                    onClick={() => toggleActive(coupon)}
                    className={`rounded-xl px-3 py-2 text-xs font-extrabold transition ${coupon.is_active ? 'bg-amber-50 text-amber-700 hover:bg-amber-100' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}
                  >
                    {coupon.is_active ? 'إيقاف' : 'تفعيل'}
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(coupon.id)}
                    className="grid h-9 w-9 place-items-center rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
