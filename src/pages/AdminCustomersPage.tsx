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
    const { data, error } = await supabase.from('profiles').select('*').eq('role', 'customer').order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []) as Profile[];
  }, []);

  const customers = useMemo(() => {
    const value = query.trim();
    if (!value) return data || [];
    return (data || []).filter((c) => c.full_name?.includes(value) || c.phone?.includes(value) || c.address?.includes(value));
  }, [data, query]);

  const startEdit = (customer: Profile) => {
    setEditing(customer);
    setEditForm({ full_name: customer.full_name || '', phone: customer.phone || '', address: customer.address || '' });
    setReservationNote('');
  };

  const createCustomer = async (event: FormEvent) => {
    event.preventDefault();
    if (createForm.password.length < 6) { toast.error('كلمة المرور لازم تكون 6 أحرف على الأقل'); return; }
    setSaving(true);
    const { error } = await supabase.rpc('admin_create_customer_user', { phone_input: createForm.phone, password_input: createForm.password, full_name_input: createForm.full_name, address_input: createForm.address || null });
    setSaving(false);
    if (error) { toast.error(error.message.includes('function') ? 'شغل supabase/business_features_migration.sql' : error.message); return; }
    toast.success('تم إضافة العميل');
    setCreateForm(emptyCreate); reload();
  };

  const saveEdit = async (event: FormEvent) => {
    event.preventDefault();
    if (!editing) return;
    setSaving(true);
    const { error } = await supabase.from('profiles').update({ full_name: editForm.full_name, phone: editForm.phone, address: editForm.address }).eq('id', editing.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success('تم تعديل العميل');
    setEditing(null); reload();
  };

  const reserveCustomer = async () => {
    if (!editing) { toast.error('اختر عميل للحجز'); return; }
    const { error } = await supabase.from('customer_reservations').insert({ customer_id: editing.id, reserved_by: currentUser?.id || null, note: reservationNote || null });
    if (error) { toast.error(error.message.includes('customer_reservations') ? 'شغل supabase/business_features_migration.sql الأول' : error.message); return; }
    toast.success('تم حجز العميل');
    setReservationNote('');
  };

  return (
    <div className="pb-24">
      <PageHeader title="العملاء" subtitle="إضافة وتعديل وحجز العملاء." />
      <div className="grid gap-3 xl:grid-cols-[340px_1fr]">
        <div className="grid content-start gap-3">
          <Card>
            <h2 className="mb-2 font-display text-base font-extrabold">إضافة عميل</h2>
            <form onSubmit={createCustomer} className="grid gap-2">
              <Input required value={createForm.full_name} onChange={(e) => setCreateForm({ ...createForm, full_name: e.target.value })} placeholder="اسم العميل" />
              <Input required dir="ltr" value={createForm.phone} onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })} placeholder="01000000000" />
              <Input required type="password" minLength={6} value={createForm.password} onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })} placeholder="كلمة المرور" />
              <Textarea value={createForm.address} onChange={(e) => setCreateForm({ ...createForm, address: e.target.value })} placeholder="العنوان" rows={2} />
              <Button disabled={saving} className="w-full"><Plus size={15} /> إضافة عميل</Button>
            </form>
          </Card>

          <Card>
            <h2 className="mb-2 font-display text-base font-extrabold">{editing ? 'تعديل وحجز عميل' : 'اختر عميل للتعديل'}</h2>
            <form onSubmit={saveEdit} className="grid gap-2">
              <Input required disabled={!editing} value={editForm.full_name} onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })} placeholder="اسم العميل" />
              <Input disabled={!editing} dir="ltr" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} placeholder="رقم الهاتف" />
              <Textarea disabled={!editing} value={editForm.address} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} placeholder="العنوان" rows={2} />
              <Button disabled={!editing || saving} className="w-full"><Save size={15} /> حفظ التعديل</Button>
            </form>
            <div className="mt-3 border-t border-slate-100 pt-3">
              <Textarea disabled={!editing} value={reservationNote} onChange={(e) => setReservationNote(e.target.value)} placeholder="ملاحظة الحجز" rows={2} />
              <button type="button" disabled={!editing} onClick={reserveCustomer} className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-amber-50 px-4 py-2.5 text-xs font-extrabold text-amber-700 disabled:opacity-50">
                <CalendarClock size={14} /> حجز العميل
              </button>
            </div>
          </Card>
        </div>

        <div>
          <div className="relative mb-2">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ابحث بالاسم أو الهاتف أو العنوان" className="pr-9" />
          </div>
          {loading && <LoadingState />}
          {error && <ErrorState message={error} />}
          {!loading && !error && customers.length === 0 && <EmptyState title="لا يوجد عملاء" body="أي عميل تسجله سيظهر هنا." />}
          <div className="grid gap-2 md:grid-cols-2">
            {customers.map((customer) => (
              <Card key={customer.id} className="flex items-center gap-3">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-azraq-50 text-azraq-700">
                  <UserRound size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-display text-sm font-extrabold text-ink">{customer.full_name || 'عميل بدون اسم'}</h3>
                  <p className="text-xs font-bold text-slate-500" dir="ltr">{customer.phone || '-'}</p>
                  <p className="truncate text-xs text-slate-500">{customer.address || 'لا يوجد عنوان'}</p>
                </div>
                <button onClick={() => startEdit(customer)} className="shrink-0 rounded-xl bg-azraq-50 px-2.5 py-1.5 text-xs font-extrabold text-azraq-700">
                  تعديل
                </button>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
