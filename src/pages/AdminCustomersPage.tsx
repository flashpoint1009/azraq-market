import { FormEvent, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { CalendarClock, Plus, Save, Search, UserRound } from 'lucide-react';
import { Button, Card, EmptyState, ErrorState, Input, LoadingState, PageHeader, Textarea } from '../components/ui';
import { supabase } from '../lib/supabase';
import { useSupabaseQuery } from '../hooks/useSupabaseQuery';
import { useAuth } from '../context/AuthContext';
import type { Profile } from '../types/database';

const emptyCreate = { full_name: '', phone: '', password: '', address: '' };
const emptyEdit = { full_name: '', phone: '', address: '' };

export function AdminCustomersPage() {
  const { profile: currentUser } = useAuth();
  const [query, setQuery] = useState('');
  const [createForm, setCreateForm] = useState(emptyCreate);
  const [editing, setEditing] = useState<Profile | null>(null);
  const [editForm, setEditForm] = useState(emptyEdit);
  const [reservationNote, setReservationNote] = useState('');
  const [saving, setSaving] = useState(false);

  const { data, loading, error, reload } = useSupabaseQuery(async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'customer')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []) as Profile[];
  }, []);

  const customers = useMemo(() => {
    const value = query.trim();
    if (!value) return data || [];
    return (data || []).filter((customer) =>
      customer.full_name?.includes(value) ||
      customer.phone?.includes(value) ||
      customer.address?.includes(value),
    );
  }, [data, query]);

  const startEdit = (customer: Profile) => {
    setEditing(customer);
    setEditForm({
      full_name: customer.full_name || '',
      phone: customer.phone || '',
      address: customer.address || '',
    });
    setReservationNote('');
  };

  const createCustomer = async (event: FormEvent) => {
    event.preventDefault();
    if (createForm.password.length < 6) {
      toast.error('كلمة المرور لازم تكون 6 أحرف على الأقل');
      return;
    }
    setSaving(true);
    const { error } = await supabase.rpc('admin_create_customer_user', {
      phone_input: createForm.phone,
      password_input: createForm.password,
      full_name_input: createForm.full_name,
      address_input: createForm.address || null,
    });
    setSaving(false);
    if (error) {
      console.error('ADMIN_CREATE_CUSTOMER_FAILED', error);
      toast.error(error.message.includes('function') ? 'شغل supabase/business_features_migration.sql أو fix_customer_order_rpc.sql' : error.message);
      return;
    }
    toast.success('تم إضافة العميل');
    setCreateForm(emptyCreate);
    reload();
  };

  const saveEdit = async (event: FormEvent) => {
    event.preventDefault();
    if (!editing) return;
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: editForm.full_name, phone: editForm.phone, address: editForm.address })
      .eq('id', editing.id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('تم تعديل العميل');
    setEditing(null);
    reload();
  };

  const reserveCustomer = async () => {
    if (!editing) {
      toast.error('اختر عميل للحجز');
      return;
    }
    const { error } = await supabase.from('customer_reservations').insert({
      customer_id: editing.id,
      reserved_by: currentUser?.id || null,
      note: reservationNote || null,
    });
    if (error) {
      console.error('CUSTOMER_RESERVATION_FAILED', error);
      toast.error(error.message.includes('customer_reservations') ? 'شغل supabase/business_features_migration.sql الأول' : error.message);
      return;
    }
    toast.success('تم حجز العميل');
    setReservationNote('');
  };

  return (
    <div>
      <PageHeader title="العملاء" subtitle="إضافة وتعديل وحجز العملاء، منفصلين عن مستخدمي الإدارة والمخزن والتوصيل." />
      <div className="grid gap-4 xl:grid-cols-[380px_1fr]">
        <div className="grid content-start gap-4">
          <Card className="p-4">
            <h2 className="mb-4 font-display text-xl font-extrabold">إضافة عميل</h2>
            <form onSubmit={createCustomer} className="space-y-3">
              <Input required value={createForm.full_name} onChange={(event) => setCreateForm({ ...createForm, full_name: event.target.value })} placeholder="اسم العميل" />
              <Input required dir="ltr" value={createForm.phone} onChange={(event) => setCreateForm({ ...createForm, phone: event.target.value })} placeholder="01000000000" />
              <Input required type="password" minLength={6} value={createForm.password} onChange={(event) => setCreateForm({ ...createForm, password: event.target.value })} placeholder="كلمة المرور" />
              <Textarea value={createForm.address} onChange={(event) => setCreateForm({ ...createForm, address: event.target.value })} placeholder="العنوان" rows={3} />
              <Button disabled={saving} className="w-full"><Plus size={17} /> إضافة عميل</Button>
            </form>
          </Card>

          <Card className="p-4">
            <h2 className="mb-4 font-display text-xl font-extrabold">{editing ? 'تعديل وحجز عميل' : 'اختر عميل للتعديل'}</h2>
            <form onSubmit={saveEdit} className="space-y-3">
              <Input required disabled={!editing} value={editForm.full_name} onChange={(event) => setEditForm({ ...editForm, full_name: event.target.value })} placeholder="اسم العميل" />
              <Input disabled={!editing} dir="ltr" value={editForm.phone} onChange={(event) => setEditForm({ ...editForm, phone: event.target.value })} placeholder="رقم الهاتف" />
              <Textarea disabled={!editing} value={editForm.address} onChange={(event) => setEditForm({ ...editForm, address: event.target.value })} placeholder="العنوان" rows={3} />
              <Button disabled={!editing || saving} className="w-full"><Save size={17} /> حفظ التعديل</Button>
            </form>
            <div className="mt-4 border-t border-slate-100 pt-4">
              <Textarea disabled={!editing} value={reservationNote} onChange={(event) => setReservationNote(event.target.value)} placeholder="ملاحظة الحجز" rows={3} />
              <button type="button" disabled={!editing} onClick={reserveCustomer} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-amber-50 px-4 py-3 text-sm font-extrabold text-amber-700 disabled:opacity-50">
                <CalendarClock size={17} /> حجز العميل
              </button>
            </div>
          </Card>
        </div>

        <div>
          <Card className="mb-4 p-3">
            <div className="relative">
              <Search className="absolute right-3 top-3 text-slate-400" size={17} />
              <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ابحث بالاسم أو الهاتف أو العنوان" className="pr-10" />
            </div>
          </Card>
          {loading && <LoadingState />}
          {error && <ErrorState message={error} />}
          {!loading && !error && customers.length === 0 && <EmptyState title="لا يوجد عملاء" body="أي عميل تسجله أو يسجل في التطبيق سيظهر هنا." />}
          <div className="grid gap-3 md:grid-cols-2">
            {customers.map((customer) => (
              <Card key={customer.id} className="p-4">
                <div className="flex items-start gap-3">
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-azraq-50 text-azraq-700">
                    <UserRound size={20} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-display text-lg font-extrabold text-ink">{customer.full_name || 'عميل بدون اسم'}</h3>
                    <p className="mt-1 text-sm font-bold text-slate-500" dir="ltr">{customer.phone || '-'}</p>
                    <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-400">{customer.address || 'لا يوجد عنوان'}</p>
                  </div>
                  <button onClick={() => startEdit(customer)} className="rounded-2xl bg-azraq-50 px-3 py-2 text-xs font-extrabold text-azraq-700">
                    تعديل
                  </button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
