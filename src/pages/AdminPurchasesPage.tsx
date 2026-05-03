import { FormEvent, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, ReceiptText, Trash2 } from 'lucide-react';
import { Button, Card, EmptyState, ErrorState, Input, LoadingState, PageHeader, Select } from '../components/ui';
import { formatCurrency } from '../lib/labels';
import { supabase } from '../lib/supabase';
import { useSupabaseQuery } from '../hooks/useSupabaseQuery';
import type { Product, PurchaseInvoice } from '../types/database';

type DraftItem = {
  product_id: string;
  quantity: string;
  purchase_price: string;
};

export function AdminPurchasesPage() {
  const [supplierName, setSupplierName] = useState('');
  const [items, setItems] = useState<DraftItem[]>([{ product_id: '', quantity: '1', purchase_price: '0' }]);
  const [saving, setSaving] = useState(false);

  const { data, loading, error, reload } = useSupabaseQuery(async () => {
    const products = await supabase.from('products').select('*').order('name');
    if (products.error) {
      console.error('PURCHASE_PRODUCTS_FETCH_FAILED', products.error);
      throw products.error;
    }
    const invoices = await supabase.from('purchase_invoices').select('*, purchase_invoice_items(*)').order('created_at', { ascending: false }).limit(20);
    if (invoices.error) console.error('PURCHASE_INVOICES_FETCH_FAILED', invoices.error);
    return { products: products.data as Product[], invoices: (invoices.data || []) as PurchaseInvoice[] };
  }, []);

  const total = useMemo(
    () => items.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.purchase_price) || 0), 0),
    [items],
  );

  const save = async (event: FormEvent) => {
    event.preventDefault();
    const cleanItems = items
      .map((item) => ({
        product_id: item.product_id,
        quantity: Number(item.quantity) || 0,
        purchase_price: Number(item.purchase_price) || 0,
      }))
      .filter((item) => item.product_id && item.quantity > 0);

    if (!cleanItems.length) {
      toast.error('ضيف منتج واحد على الأقل');
      return;
    }

    setSaving(true);
    const result = await supabase.rpc('process_purchase_invoice', {
      items: cleanItems,
      supplier: supplierName || null,
      notes: null,
    });
    if (result.error) {
      console.error('PURCHASE_INVOICE_SAVE_FAILED', result.error);
      setSaving(false);
      toast.error('تعذر تحميل البيانات، حاول مرة أخرى');
      return;
    }

    setSaving(false);
    toast.success('فاتورة المشتريات اتحفظت والمخزون زاد');
    setSupplierName('');
    setItems([{ product_id: '', quantity: '1', purchase_price: '0' }]);
    reload();
  };

  return (
    <div>
      <PageHeader title="فواتير المشتريات" subtitle="سجّل مشتريات المنتجات والكمية هتزيد في المخزون تلقائيًا." />
      <div className="grid gap-5 xl:grid-cols-[minmax(520px,1fr)_360px]">
        <Card>
          <h2 className="mb-4 font-display text-2xl font-extrabold">فاتورة جديدة</h2>
          <form onSubmit={save} className="space-y-3">
            <Input value={supplierName} onChange={(event) => setSupplierName(event.target.value)} placeholder="اسم المورد" />
            <div className="overflow-x-auto">
              <div className="min-w-[720px]">
                <div className="grid grid-cols-[1fr_110px_140px_140px_44px] gap-2 px-2 pb-2 text-xs font-extrabold text-slate-500">
                  <span>المنتج</span>
                  <span>الكمية</span>
                  <span>سعر التكلفة</span>
                  <span>الإجمالي</span>
                  <span />
                </div>
                <div className="grid gap-2">
                  {items.map((item, index) => (
                    <div key={index} className="grid grid-cols-[1fr_110px_140px_140px_44px] gap-2 rounded-2xl bg-slate-50 p-2">
                      <Select required value={item.product_id} onChange={(event) => setItems(items.map((entry, i) => (i === index ? { ...entry, product_id: event.target.value } : entry)))}>
                        <option value="">اختار المنتج</option>
                        {data?.products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
                      </Select>
                      <Input type="number" min="1" value={item.quantity} onChange={(event) => setItems(items.map((entry, i) => (i === index ? { ...entry, quantity: event.target.value } : entry)))} />
                      <Input type="number" min="0" step="0.01" value={item.purchase_price} onChange={(event) => setItems(items.map((entry, i) => (i === index ? { ...entry, purchase_price: event.target.value } : entry)))} />
                      <div className="rounded-2xl bg-white px-3 py-3 text-sm font-extrabold text-azraq-800">
                        {formatCurrency((Number(item.quantity) || 0) * (Number(item.purchase_price) || 0))}
                      </div>
                      <button type="button" onClick={() => setItems(items.length > 1 ? items.filter((_, i) => i !== index) : items)} className="grid h-full place-items-center rounded-2xl bg-rose-50 text-rose-600 disabled:opacity-40" disabled={items.length === 1}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <button type="button" onClick={() => setItems([...items, { product_id: '', quantity: '1', purchase_price: '0' }])} className="inline-flex items-center gap-2 text-sm font-bold text-azraq-700">
              <Plus size={16} /> زوّد سطر
            </button>
            <div className="rounded-2xl bg-azraq-50 p-4 font-display text-xl font-extrabold text-azraq-900">
              الإجمالي: {formatCurrency(total)}
            </div>
            <Button disabled={saving} className="w-full"><ReceiptText size={18} /> {saving ? 'جاري الحفظ...' : 'احفظ الفاتورة'}</Button>
          </form>
        </Card>
        <div>
          {loading && <LoadingState />}
          {error && <ErrorState message={error} />}
          {!loading && data?.invoices.length === 0 && <EmptyState title="مفيش فواتير مشتريات" body="أول فاتورة هتظهر هنا بعد الحفظ." />}
          <div className="grid gap-3">
            {data?.invoices.map((invoice) => (
              <Card key={invoice.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-display text-lg font-extrabold">{invoice.supplier_name || 'مورد بدون اسم'}</h3>
                    <p className="text-xs text-slate-400">{new Date(invoice.created_at).toLocaleString('ar-EG')}</p>
                  </div>
                  <strong className="text-azraq-800">{formatCurrency(invoice.total_amount)}</strong>
                </div>
                <p className="mt-3 text-sm font-bold text-slate-500">{invoice.purchase_invoice_items?.length || 0} صنف</p>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
