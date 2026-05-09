import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Download, Phone, ReceiptText } from 'lucide-react';
import { Button, Card, EmptyState, ErrorState, Input, LoadingState, PageHeader } from '../components/ui';
import { formatCurrency, formatDate } from '../lib/labels';
import { supabase } from '../lib/supabase';
import { useSupabaseQuery } from '../hooks/useSupabaseQuery';
import type { CustomerDebt } from '../types/database';

type DebtStatus = CustomerDebt['status'] | 'all';

const statusTabs: { label: string; value: DebtStatus; color: string }[] = [
  { label: 'الكل', value: 'all', color: 'bg-slate-700 text-white' },
  { label: 'مفتوح', value: 'open', color: 'bg-rose-600 text-white' },
  { label: 'جزئي', value: 'partial', color: 'bg-amber-500 text-white' },
  { label: 'مسدد', value: 'paid', color: 'bg-emerald-600 text-white' },
];

const debtStatusLabel: Record<CustomerDebt['status'], string> = {
  open: 'مفتوح',
  partial: 'سداد جزئي',
  paid: 'مسدد',
};

const debtStatusTone: Record<CustomerDebt['status'], string> = {
  open: 'bg-rose-50 text-rose-700 border-rose-100',
  partial: 'bg-amber-50 text-amber-700 border-amber-100',
  paid: 'bg-emerald-50 text-emerald-700 border-emerald-100',
};

function exportCSV(debts: CustomerDebt[]) {
  const header = ['العميل', 'الموبايل', 'رقم الطلب', 'الإجمالي', 'المسدد', 'المتبقي', 'الحالة', 'التاريخ'];
  const rows = debts.map((d) => [
    d.profiles?.full_name || '',
    d.profiles?.phone || '',
    d.order_id?.slice(0, 8) || '',
    String(d.amount),
    String(d.paid_amount),
    String(d.remaining_amount),
    debtStatusLabel[d.status],
    formatDate(d.created_at),
  ]);
  const csv = [header, ...rows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `debts_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function PaymentModal({ debt, onClose, onSaved }: { debt: CustomerDebt; onClose: () => void; onSaved: () => void }) {
  const [amount, setAmount] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const pay = Number(amount);
    if (!pay || pay <= 0) { toast.error('ادخل مبلغ صحيح'); return; }
    if (pay > debt.remaining_amount) { toast.error(`المبلغ أكبر من المتبقي (${formatCurrency(debt.remaining_amount)})`); return; }
    setSaving(true);
    const newPaid = debt.paid_amount + pay;
    const newRemaining = Math.max(debt.amount - newPaid, 0);
    const newStatus = newRemaining <= 0 ? 'paid' : 'partial';
    const { error } = await supabase
      .from('customer_debts')
      .update({ paid_amount: newPaid, remaining_amount: newRemaining, status: newStatus })
      .eq('id', debt.id);
    setSaving(false);
    if (error) { toast.error('مش قادرين نحفظ، حاول تاني'); return; }
    toast.success(newStatus === 'paid' ? '🎉 تم السداد بالكامل!' : `تم تسجيل ${formatCurrency(pay)} كدفعة`);
    onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-3 sm:items-center" onClick={onClose}>
      <div className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-display text-xl font-extrabold text-ink">تسجيل دفعة</h3>
        <p className="mt-1 text-sm text-slate-500">
          {debt.profiles?.full_name || 'عميل'} — متبقي {formatCurrency(debt.remaining_amount)}
        </p>
        <div className="mt-4 space-y-3">
          <label className="grid gap-1 text-xs font-bold text-slate-500">
            المبلغ المدفوع
            <Input
              type="number"
              min="1"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={`أقصى ${formatCurrency(debt.remaining_amount)}`}
              autoFocus
            />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={onClose} className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-extrabold text-slate-600">إلغاء</button>
            <Button onClick={save} disabled={saving}>{saving ? 'جاري الحفظ...' : 'احفظ الدفعة'}</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AdminDebtsPage() {
  const [statusFilter, setStatusFilter] = useState<DebtStatus>('all');
  const [payingDebt, setPayingDebt] = useState<CustomerDebt | null>(null);

  const { data, loading, error, reload } = useSupabaseQuery(async () => {
    const result = await supabase
      .from('customer_debts')
      .select('*, profiles(full_name,phone)')
      .order('created_at', { ascending: false });
    if (result.error) throw result.error;
    return result.data as CustomerDebt[];
  }, []);

  const filtered = useMemo(() => {
    if (!data) return [];
    if (statusFilter === 'all') return data;
    return data.filter((d) => d.status === statusFilter);
  }, [data, statusFilter]);

  // Summary numbers
  const summary = useMemo(() => {
    if (!data) return { totalOpen: 0, totalRemaining: 0, totalCount: 0 };
    const open = data.filter((d) => d.status !== 'paid');
    return {
      totalOpen: open.length,
      totalRemaining: open.reduce((s, d) => s + d.remaining_amount, 0),
      totalCount: data.length,
    };
  }, [data]);

  return (
    <div>
      <PageHeader
        title="المديونيات"
        subtitle="متابعة ديون العملاء وتسجيل المدفوعات."
        action={
          <button
            onClick={() => filtered.length && exportCSV(filtered)}
            disabled={!filtered.length}
            className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-extrabold text-azraq-700 shadow-sm disabled:opacity-40"
          >
            <Download size={16} /> تصدير CSV
          </button>
        }
      />

      {/* Summary cards */}
      {!loading && data && (
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Card className="p-4">
            <p className="text-xs font-bold text-slate-400">ديون مفتوحة</p>
            <p className="mt-1 font-display text-3xl font-extrabold text-rose-600">{summary.totalOpen}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs font-bold text-slate-400">إجمالي المتبقي</p>
            <p className="mt-1 font-display text-2xl font-extrabold text-rose-700">{formatCurrency(summary.totalRemaining)}</p>
          </Card>
          <Card className="p-4 col-span-2 sm:col-span-1">
            <p className="text-xs font-bold text-slate-400">إجمالي السجلات</p>
            <p className="mt-1 font-display text-3xl font-extrabold text-ink">{summary.totalCount}</p>
          </Card>
        </div>
      )}

      {/* Status filter tabs */}
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {statusTabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setStatusFilter(tab.value)}
            className={`shrink-0 rounded-2xl px-4 py-2 text-xs font-extrabold shadow-sm transition ${statusFilter === tab.value ? tab.color : 'bg-white text-slate-500 hover:bg-slate-50'}`}
          >
            {tab.label}
            {tab.value !== 'all' && data && (
              <span className="mr-1.5 opacity-70">({data.filter((d) => d.status === tab.value).length})</span>
            )}
          </button>
        ))}
      </div>

      {loading && <LoadingState />}
      {error && <ErrorState message={error} />}
      {!loading && filtered.length === 0 && (
        <EmptyState title="لا توجد مديونيات" body={statusFilter !== 'all' ? 'جرب تغيير الفلتر.' : 'كل المبالغ اتسددت.'} />
      )}

      {/* Desktop table */}
      {filtered.length > 0 && (
        <>
          <Card className="hidden overflow-hidden p-0 md:block">
            <div className="grid grid-cols-[1fr_120px_110px_110px_110px_120px_140px] gap-3 border-b border-slate-100 bg-slate-50 px-4 py-3 text-xs font-extrabold text-slate-500">
              <span>العميل</span>
              <span>رقم الطلب</span>
              <span>الإجمالي</span>
              <span>المسدد</span>
              <span>المتبقي</span>
              <span>الحالة</span>
              <span>إجراء</span>
            </div>
            <div className="divide-y divide-slate-50">
              {filtered.map((debt) => (
                <div key={debt.id} className="grid grid-cols-[1fr_120px_110px_110px_110px_120px_140px] items-center gap-3 px-4 py-3 text-sm">
                  <div>
                    <p className="font-bold text-slate-800">{debt.profiles?.full_name || 'عميل'}</p>
                    {debt.profiles?.phone && (
                      <a href={`tel:${debt.profiles.phone}`} className="inline-flex items-center gap-1 text-xs text-azraq-600">
                        <Phone size={11} /> {debt.profiles.phone}
                      </a>
                    )}
                  </div>
                  {debt.order_id ? (
                    <Link to={`/orders/${debt.order_id}`} className="flex items-center gap-1 text-xs font-bold text-azraq-700 hover:underline">
                      <ReceiptText size={12} /> #{debt.order_id.slice(0, 8)}
                    </Link>
                  ) : <span className="text-xs text-slate-400">—</span>}
                  <span className="font-bold text-slate-700">{formatCurrency(debt.amount)}</span>
                  <span className="font-bold text-emerald-600">{formatCurrency(debt.paid_amount)}</span>
                  <span className="font-extrabold text-rose-600">{formatCurrency(debt.remaining_amount)}</span>
                  <span className={`w-fit rounded-full border px-3 py-1 text-xs font-extrabold ${debtStatusTone[debt.status]}`}>{debtStatusLabel[debt.status]}</span>
                  {debt.status !== 'paid' ? (
                    <button
                      onClick={() => setPayingDebt(debt)}
                      className="rounded-2xl bg-azraq-700 px-3 py-2 text-xs font-extrabold text-white hover:bg-azraq-800 transition"
                    >
                      تسجيل دفعة
                    </button>
                  ) : (
                    <span className="text-xs font-bold text-emerald-600">✓ مسدد</span>
                  )}
                </div>
              ))}
            </div>
          </Card>

          {/* Mobile cards */}
          <div className="grid gap-3 md:hidden">
            {filtered.map((debt) => (
              <Card key={debt.id} className="p-0 overflow-hidden">
                <div className="flex items-center justify-between gap-3 bg-slate-50 px-4 py-2.5 border-b border-slate-100">
                  <div>
                    <p className="font-bold text-slate-800">{debt.profiles?.full_name || 'عميل'}</p>
                    {debt.profiles?.phone && (
                      <a href={`tel:${debt.profiles.phone}`} className="inline-flex items-center gap-1 text-xs text-azraq-600">
                        <Phone size={11} /> {debt.profiles.phone}
                      </a>
                    )}
                  </div>
                  <span className={`rounded-full border px-3 py-1 text-xs font-extrabold ${debtStatusTone[debt.status]}`}>{debtStatusLabel[debt.status]}</span>
                </div>
                <div className="px-4 py-3 space-y-2">
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-xl bg-slate-50 p-2">
                      <p className="text-[10px] font-bold text-slate-400">الإجمالي</p>
                      <p className="text-sm font-extrabold text-slate-700">{formatCurrency(debt.amount)}</p>
                    </div>
                    <div className="rounded-xl bg-emerald-50 p-2">
                      <p className="text-[10px] font-bold text-slate-400">المسدد</p>
                      <p className="text-sm font-extrabold text-emerald-700">{formatCurrency(debt.paid_amount)}</p>
                    </div>
                    <div className="rounded-xl bg-rose-50 p-2">
                      <p className="text-[10px] font-bold text-slate-400">المتبقي</p>
                      <p className="text-sm font-extrabold text-rose-700">{formatCurrency(debt.remaining_amount)}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    {debt.order_id && (
                      <Link to={`/orders/${debt.order_id}`} className="inline-flex items-center gap-1 text-xs font-bold text-azraq-700">
                        <ReceiptText size={12} /> طلب #{debt.order_id.slice(0, 8)}
                      </Link>
                    )}
                    {debt.status !== 'paid' && (
                      <button
                        onClick={() => setPayingDebt(debt)}
                        className="rounded-2xl bg-azraq-700 px-4 py-2 text-xs font-extrabold text-white"
                      >
                        تسجيل دفعة
                      </button>
                    )}
                    {debt.status === 'paid' && (
                      <span className="text-xs font-bold text-emerald-600">✓ مسدد بالكامل</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400">{formatDate(debt.created_at)}</p>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      {payingDebt && (
        <PaymentModal
          debt={payingDebt}
          onClose={() => setPayingDebt(null)}
          onSaved={reload}
        />
      )}
    </div>
  );
}
