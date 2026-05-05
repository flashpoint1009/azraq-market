import { FormEvent, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowRight, Plus, ReceiptText, RotateCcw, Trash2 } from 'lucide-react';
import { Button, Card, EmptyState, ErrorState, Input, LoadingState, PageHeader, Select } from '../components/ui';
import { formatCurrency } from '../lib/labels';
import { supabase } from '../lib/supabase';
import { useSupabaseQuery } from '../hooks/useSupabaseQuery';
import type { Product, PurchaseInvoice, PurchaseReturn } from '../types/database';

type Mode = 'purchase' | 'return';
type DraftItem = { product_id: string; quantity: string; purchase_price: string };

const emptyItem = { product_id: '', quantity: '1', purchase_price: '0' };

export function AdminPurchasesPage() {
  const [mode, setMode] = useState<Mode>('purchase');
  const [supplierName, setSupplierName] = useState('');
  const [items, setItems] = useState<DraftItem[]>([emptyItem]);
  const [saving, setSaving] = useState(false);

  const { data, loading, error, reload } = useSupabaseQuery(async () => {
    const products = await supabase.from('products').select('*').order('name');
    if (products.error) throw products.error;

    const invoices = await supabase.from('purchase_invoices').select('*, purchase_invoice_items(*)').order('created_at', { ascending: false }).limit(15);
    const returns = await supabase.from('purchase_returns').select('*, purchase_return_items(*)').order('created_at', { ascending: false }).limit(15);
    if (invoices.error) console.error('PURCHASE_INVOICES_FETCH_FAILED', invoices.error);
    if (returns.error) console.error('PURCHASE_RETURNS_FETCH_FAILED', returns.error);

    return {
      products: products.data as Product[],
      invoices: (invoices.data || []) as PurchaseInvoice[],
      returns: (returns.data || []) as PurchaseReturn[],
    };
  }, []);

  const total = useMemo(
    () => items.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.purchase_price) || 0), 0),
    [items],
  );

  const save = async (event: FormEvent) => {
    event.preventDefault();
    const cleanItems = items
      .map((item) => ({ product_id: item.product_id, quantity: Number(item.quantity) || 0, purchase_price: Number(item.purchase_price) || 0 }))
      .filter((item) => item.product_id && item.quantity > 0);

    if (!cleanItems.length) {
      toast.error('ضيف منتج واحد على الأقل');
      return;
    }

    setSaving(true);
    const result = mode === 'purchase'
      ? await supabase.rpc('process_purchase_invoice', { items: cleanItems, supplier: supplierName || null, notes: null })
      : await supabase.rpc('process_purchase_return', { items: cleanItems, supplier: supplierName || null, notes: null });
    setSaving(false);

    if (result.error) {
      console.error('PURCHASE_RPC_SAVE_FAILED', result.error);
      toast.error(result.error.message.includes('process_purchase') ? 'شغل ملف supabase/005_atomic_stock_operations.sql الأول' : result.error.message);
      return;
    }

    toast.success(mode === 'purchase' ? 'تم حفظ الفاتورة وتحديث المخزون' : 'تم حفظ المرتجع وتحديث المخزون');
    setSupplierName('');
    setItems([emptyItem]);
    reload();
  };

  const history = mode === 'purchase' ? data?.invoices : data?.returns;

  return (
    <div>
      <PageHeader
        title="المشتريات"
        subtitle="سجل فواتير الشراء والمرتجعات مع تحديث المخزون من عملية واحدة آمنة."
        action={<Link to="/admin" className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-extrabold text-azraq-700 shadow-sm"><ArrowRight size={17} /> رجوع للرئيسية</Link>}
      />

      <div className="mb-4 grid grid-cols-2 gap-2 rounded-2xl bg-white p-1 shadow-sm sm:w-fit">
        <button type="button" onClick={() => setMode('purchase')} className={`rounded-xl px-4 py-2 text-sm font-extrabold ${mode === 'purchase' ? 'bg-azraq-700 text-white' : 'text-slate-500'}`}>فواتير الشراء</button>
        <button type="button" onClick={() => setMode('return')} className={`rounded-xl px-4 py-2 text-sm font-extrabold ${mode === 'return' ? 'bg-azraq-700 text-white' : 'text-slate-500'}`}>مرتجعات الشراء</button>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(520px,1fr)_360px]">
        <Card>
          <h2 className="mb-4 font-display text-2xl font-extrabold">{mode === 'purchase' ? 'فاتورة شراء جديدة' : 'مرتجع مشتريات جديد'}</h2>
          <form onSubmit={save} className="space-y-3">
            <Input value={supplierName} onChange={(event) => setSupplierName(event.target.value)} placeholder="اسم المورد" />
            <div className="grid gap-2">
              {items.map((item, index) => (
                <div key={index} className="grid gap-2 rounded-2xl bg-slate-50 p-2 md:grid-cols-[1fr_110px_140px_44px]">
                  <Select required value={item.product_id} onChange={(event) => setItems(items.map((entry, i) => (i === index ? { ...entry, product_id: event.target.value } : entry)))}>
                    <option value="">اختر المنتج</option>
                    {data?.products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
                  </Select>
                  <Input type="number" min="1" value={item.quantity} onChange={(event) => setItems(items.map((entry, i) => (i === index ? { ...entry, quantity: event.target.value } : entry)))} placeholder="الكمية" />
                  <Input type="number" min="0" step="0.01" value={item.purchase_price} onChange={(event) => setItems(items.map((entry, i) => (i === index ? { ...entry, purchase_price: event.target.value } : entry)))} placeholder="سعر التكلفة" />
                  <button type="button" onClick={() => setItems(items.length > 1 ? items.filter((_, i) => i !== index) : items)} className="grid h-12 place-items-center rounded-2xl bg-rose-50 text-rose-600 disabled:opacity-40" disabled={items.length === 1}>
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>

            <button type="button" onClick={() => setItems([...items, emptyItem])} className="inline-flex items-center gap-2 text-sm font-bold text-azraq-700">
              <Plus size={16} /> زود سطر
            </button>

            <div className="rounded-2xl bg-azraq-50 p-4 font-display text-xl font-extrabold text-azraq-900">
              الإجمالي: {formatCurrency(total)}
            </div>

            <Button disabled={saving} className="w-full">
              {mode === 'purchase' ? <ReceiptText size={18} /> : <RotateCcw size={18} />}
              {saving ? 'جاري الحفظ...' : mode === 'purchase' ? 'احفظ الفاتورة' : 'احفظ المرتجع'}
            </Button>
          </form>
        </Card>

        <div>
          {loading && <LoadingState />}
          {error && <ErrorState message={error} />}
          {!loading && history?.length === 0 && <EmptyState title={mode === 'purchase' ? 'لا توجد فواتير' : 'لا توجد مرتجعات'} body="أول عملية ستظهر هنا بعد الحفظ." />}
          <div className="grid gap-3">
            {history?.map((entry) => (
              <Card key={entry.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-display text-lg font-extrabold">{entry.supplier_name || 'مورد بدون اسم'}</h3>
                    <p className="text-xs text-slate-400">{new Date(entry.created_at).toLocaleString('ar-EG')}</p>
                  </div>
                  <strong className="text-azraq-800">{formatCurrency(entry.total_amount)}</strong>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
