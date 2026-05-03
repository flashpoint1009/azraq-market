import { FormEvent, useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, Trash2 } from 'lucide-react';
import { Button, Card, ErrorState, Input, LoadingState, PageHeader, Select } from '../components/ui';
import { formatCurrency } from '../lib/labels';
import { supabase } from '../lib/supabase';
import { useSupabaseQuery } from '../hooks/useSupabaseQuery';
import type { Coupon, CouponType } from '../types/database';

export function AdminCouponsPage() {
  const [form, setForm] = useState({ code: '', type: 'percent' as CouponType, value: '10', min_order: '0', max_uses: '', expires_at: '', is_active: true });
  const { data, loading, error, reload } = useSupabaseQuery(async () => {
    const result = await supabase.from('coupons').select('*').order('created_at', { ascending: false });
    if (result.error) throw result.error;
    return (result.data || []) as Coupon[];
  }, []);

  const save = async (event: FormEvent) => {
    event.preventDefault();
    const { error: saveError } = await supabase.from('coupons').insert({
      code: form.code.trim().toUpperCase(),
      type: form.type,
      value: Number(form.value) || 0,
      min_order: Number(form.min_order) || 0,
      max_uses: form.max_uses ? Number(form.max_uses) : null,
      expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
      is_active: form.is_active,
    });
    if (saveError) {
      toast.error(saveError.message);
      return;
    }
    toast.success('تم إضافة الكوبون');
    setForm({ ...form, code: '' });
    reload();
  };

  const remove = async (id: string) => {
    if (!window.confirm('حذف الكوبون؟')) return;
    const { error: deleteError } = await supabase.from('coupons').delete().eq('id', id);
    if (deleteError) toast.error(deleteError.message);
    else reload();
  };

  return (
    <div>
      <PageHeader title="الكوبونات" subtitle="إضافة وإدارة أكواد الخصم للعملاء." />
      <div className="grid gap-5 xl:grid-cols-[380px_1fr]">
        <Card>
          <form onSubmit={save} className="space-y-3">
            <Input required value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} placeholder="كود الخصم" dir="ltr" />
            <Select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value as CouponType })}>
              <option value="percent">نسبة مئوية</option>
              <option value="fixed">قيمة ثابتة</option>
            </Select>
            <Input required type="number" min="0" value={form.value} onChange={(event) => setForm({ ...form, value: event.target.value })} placeholder="قيمة الخصم" />
            <Input type="number" min="0" value={form.min_order} onChange={(event) => setForm({ ...form, min_order: event.target.value })} placeholder="أقل طلب" />
            <Input type="number" min="0" value={form.max_uses} onChange={(event) => setForm({ ...form, max_uses: event.target.value })} placeholder="عدد مرات الاستخدام" />
            <Input type="datetime-local" value={form.expires_at} onChange={(event) => setForm({ ...form, expires_at: event.target.value })} />
            <label className="flex items-center gap-2 text-sm font-bold text-slate-600">
              <input type="checkbox" checked={form.is_active} onChange={(event) => setForm({ ...form, is_active: event.target.checked })} />
              الكوبون نشط
            </label>
            <Button><Plus size={17} /> إضافة كوبون</Button>
          </form>
        </Card>
        <div className="grid gap-3">
          {loading && <LoadingState />}
          {error && <ErrorState message={error} />}
          {data?.map((coupon) => (
            <Card key={coupon.id} className="grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
              <div>
                <h3 className="font-display text-xl font-extrabold">{coupon.code}</h3>
                <p className="text-sm font-bold text-slate-500">
                  {coupon.type === 'percent' ? `${coupon.value}%` : formatCurrency(coupon.value)} - أقل طلب {formatCurrency(coupon.min_order)}
                </p>
                <p className="text-xs font-bold text-slate-400">استخدم {coupon.used_count}{coupon.max_uses ? ` من ${coupon.max_uses}` : ''}</p>
              </div>
              <button type="button" onClick={() => remove(coupon.id)} className="grid h-10 w-10 place-items-center rounded-xl bg-rose-50 text-rose-600"><Trash2 size={16} /></button>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
