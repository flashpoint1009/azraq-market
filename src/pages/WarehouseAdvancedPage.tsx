import { FormEvent, useCallback, useState } from 'react';
import toast from 'react-hot-toast';
import {
  AlertTriangle,
  ArrowDownUp,
  CheckCircle2,
  ClipboardList,
  MapPin,
  Package,
  Plus,
  RotateCcw,
  Trash2,
  XCircle,
} from 'lucide-react';
import { Button, Card, EmptyState, ErrorState, Input, LoadingState, PageHeader, Select, Textarea } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { useSupabaseQuery } from '../hooks/useSupabaseQuery';
import {
  recordMovement,
  getLowStockProducts,
  createStocktake,
  completeStocktake,
  processCustomerReturn,
} from '../lib/stockMovements';
import type {
  StockMovement,
  Stocktake,
  StocktakeItem,
  CustomerReturn,
  BinLocation,
} from '../types/warehouse';
import {
  movementTypeLabels,
  movementTypeColors,
  stocktakeStatusLabels,
  returnStatusLabels,
  returnConditionLabels,
} from '../types/warehouse';

type Tab = 'movements' | 'stocktake' | 'lowstock' | 'returns' | 'bins';

const tabs: { key: Tab; label: string; icon: typeof Package }[] = [
  { key: 'movements', label: 'سجل الحركة', icon: ArrowDownUp },
  { key: 'stocktake', label: 'الجرد', icon: ClipboardList },
  { key: 'lowstock', label: 'تنبيه النفاد', icon: AlertTriangle },
  { key: 'returns', label: 'المرتجعات', icon: RotateCcw },
  { key: 'bins', label: 'مواقع التخزين', icon: MapPin },
];

export function WarehouseAdvancedPage() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('movements');

  return (
    <div dir="rtl" className="mx-auto max-w-4xl space-y-3 p-3">
      <PageHeader title="إدارة المخزن المتقدمة" subtitle="حركة المخزون، الجرد، التنبيهات، المرتجعات" />

      {/* Tab Navigation */}
      <div className="flex gap-1 overflow-x-auto rounded-2xl bg-white/60 p-1 shadow-soft backdrop-blur">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-extrabold transition ${
              activeTab === key
                ? 'bg-azraq-700 text-white shadow-sm'
                : 'text-slate-600 hover:bg-azraq-50'
            }`}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'movements' && <MovementsTab />}
      {activeTab === 'stocktake' && <StocktakeTab actorId={profile?.id || null} />}
      {activeTab === 'lowstock' && <LowStockTab actorId={profile?.id || null} />}
      {activeTab === 'returns' && <ReturnsTab actorId={profile?.id || null} />}
      {activeTab === 'bins' && <BinLocationsTab />}
    </div>
  );
}

/* ─── Stock Movements Tab ─── */
function MovementsTab() {
  const [filterType, setFilterType] = useState<string>('all');

  const loader = useCallback(async () => {
    let query = supabase
      .from('stock_movements')
      .select('*, products(name, sku, barcode), profiles(full_name)')
      .order('created_at', { ascending: false })
      .limit(100);
    if (filterType !== 'all') query = query.eq('movement_type', filterType);
    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as StockMovement[];
  }, [filterType]);

  const { data: movements, loading, error } = useSupabaseQuery(loader, [filterType]);

  return (
    <Card>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h2 className="text-sm font-extrabold text-ink">سجل الحركة</h2>
        <Select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="!w-auto text-xs">
          <option value="all">الكل</option>
          <option value="in">إضافة</option>
          <option value="out">صرف</option>
          <option value="adjustment">تسوية</option>
          <option value="return">مرتجع</option>
          <option value="damage">تالف</option>
          <option value="transfer">تحويل</option>
        </Select>
      </div>

      {loading && <LoadingState />}
      {error && <ErrorState message={error} />}
      {!loading && !error && (!movements || movements.length === 0) && (
        <EmptyState title="لا توجد حركات" body="لم يتم تسجيل أي حركة مخزون بعد" />
      )}
      {movements && movements.length > 0 && (
        <div className="space-y-2">
          {movements.map((m) => (
            <div key={m.id} className="flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50/50 p-2 text-xs">
              <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold ${movementTypeColors[m.movement_type]}`}>
                {movementTypeLabels[m.movement_type]}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold text-ink">{m.products?.name || '—'}</p>
                {m.reason && <p className="truncate text-slate-500">{m.reason}</p>}
              </div>
              <div className="text-left">
                <p className={`font-extrabold ${m.quantity > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                </p>
                <p className="text-[10px] text-slate-400">{m.profiles?.full_name || '—'}</p>
              </div>
              <p className="shrink-0 text-[10px] text-slate-400">{new Date(m.created_at).toLocaleDateString('ar')}</p>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

/* ─── Stocktake Tab ─── */
function StocktakeTab({ actorId }: { actorId: string | null }) {
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loader = useCallback(async () => {
    const { data, error } = await supabase
      .from('stocktakes')
      .select('*, profiles(full_name)')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []) as Stocktake[];
  }, []);

  const { data: stocktakes, loading, error, reload } = useSupabaseQuery(loader, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!actorId || !title.trim()) return;
    setCreating(true);
    try {
      await createStocktake(title.trim(), actorId);
      toast.success('تم إنشاء الجرد بنجاح');
      setTitle('');
      reload();
    } catch {
      toast.error('فشل إنشاء الجرد');
    } finally {
      setCreating(false);
    }
  }

  async function handleComplete(stocktakeId: string) {
    if (!actorId) return;
    try {
      await completeStocktake(stocktakeId, actorId);
      toast.success('تم إتمام الجرد بنجاح');
      reload();
    } catch {
      toast.error('فشل إتمام الجرد');
    }
  }

  return (
    <div className="space-y-3">
      <Card>
        <form onSubmit={handleCreate} className="flex gap-2">
          <Input placeholder="عنوان الجرد الجديد..." value={title} onChange={(e) => setTitle(e.target.value)} />
          <Button type="submit" disabled={creating || !title.trim()} className="shrink-0">
            <Plus size={14} /> بدأ جرد جديد
          </Button>
        </form>
      </Card>

      <Card>
        <h2 className="mb-2 text-sm font-extrabold text-ink">قائمة الجرد</h2>
        {loading && <LoadingState />}
        {error && <ErrorState message={error} />}
        {!loading && !error && (!stocktakes || stocktakes.length === 0) && (
          <EmptyState title="لا يوجد جرد" body="أنشئ جرد جديد للبدء" />
        )}
        {stocktakes && stocktakes.length > 0 && (
          <div className="space-y-2">
            {stocktakes.map((st) => (
              <div key={st.id} className="rounded-xl border border-slate-100 bg-slate-50/50 p-2">
                <div className="flex items-center gap-2 text-xs" onClick={() => setExpandedId(expandedId === st.id ? null : st.id)}>
                  <span className="rounded-full border border-azraq-200 bg-azraq-50 px-2 py-0.5 text-[10px] font-bold text-azraq-700">
                    {stocktakeStatusLabels[st.status]}
                  </span>
                  <span className="flex-1 font-bold text-ink">{st.title}</span>
                  <span className="text-[10px] text-slate-400">{st.total_items} منتج</span>
                </div>
                {expandedId === st.id && (
                  <StocktakeItemsList stocktakeId={st.id} status={st.status} onComplete={() => handleComplete(st.id)} />
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function StocktakeItemsList({ stocktakeId, status, onComplete }: { stocktakeId: string; status: string; onComplete: () => void }) {
  const loader = useCallback(async () => {
    const { data, error } = await supabase
      .from('stocktake_items')
      .select('*, products(name, sku, barcode, image_1_url)')
      .eq('stocktake_id', stocktakeId);
    if (error) throw error;
    return (data || []) as StocktakeItem[];
  }, [stocktakeId]);

  const { data: items, loading, error } = useSupabaseQuery(loader, [stocktakeId]);

  async function updateCounted(itemId: string, counted: number) {
    const { error } = await supabase
      .from('stocktake_items')
      .update({ counted_quantity: counted, counted_at: new Date().toISOString() })
      .eq('id', itemId);
    if (error) toast.error('فشل التحديث');
  }

  if (loading) return <LoadingState label="تحميل بنود الجرد..." />;
  if (error) return <ErrorState message={error} />;

  return (
    <div className="mt-2 space-y-1 border-t border-slate-100 pt-2">
      {items?.map((item) => (
        <div key={item.id} className="flex items-center gap-2 text-xs">
          <span className="flex-1 truncate font-medium text-ink">{item.products?.name || '—'}</span>
          <span className="text-slate-400">نظام: {item.system_quantity}</span>
          <Input
            type="number"
            placeholder="الفعلي"
            defaultValue={item.counted_quantity ?? ''}
            onBlur={(e) => updateCounted(item.id, Number(e.target.value))}
            className="!w-16 text-center text-xs"
            disabled={status === 'completed'}
          />
        </div>
      ))}
      {status === 'in_progress' && (
        <Button onClick={onComplete} className="mt-2 w-full text-xs">
          <CheckCircle2 size={14} /> إتمام الجرد
        </Button>
      )}
    </div>
  );
}

/* ─── Low Stock Tab ─── */
function LowStockTab({ actorId }: { actorId: string | null }) {
  const loader = useCallback(() => getLowStockProducts(), []);
  const { data: products, loading, error, reload } = useSupabaseQuery(loader, []);

  async function handleRestock(productId: string, productName: string) {
    const qty = prompt(`أدخل الكمية المراد إضافتها لـ "${productName}":`);
    if (!qty || isNaN(Number(qty)) || Number(qty) <= 0) return;
    try {
      await recordMovement(productId, 'in', Number(qty), actorId, { reason: 'إعادة تعبئة مخزون' });
      toast.success(`تمت إضافة ${qty} وحدة`);
      reload();
    } catch {
      toast.error('فشلت العملية');
    }
  }

  return (
    <Card>
      <h2 className="mb-3 text-sm font-extrabold text-ink">
        <AlertTriangle size={14} className="ml-1 inline text-rose-500" />
        منتجات منخفضة المخزون
      </h2>
      {loading && <LoadingState />}
      {error && <ErrorState message={error} />}
      {!loading && !error && (!products || products.length === 0) && (
        <EmptyState title="المخزون جيد" body="جميع المنتجات فوق الحد الأدنى" />
      )}
      {products && products.length > 0 && (
        <div className="space-y-2">
          {products.map((p: any) => (
            <div key={p.id} className="flex items-center gap-2 rounded-xl border border-rose-100 bg-rose-50/50 p-2">
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-rose-100">
                <AlertTriangle size={14} className="text-rose-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-bold text-ink">{p.name}</p>
                <p className="text-[10px] text-rose-600">
                  المتبقي: {p.stock_quantity} / الحد الأدنى: {p.min_stock_level ?? 5}
                </p>
              </div>
              <Button onClick={() => handleRestock(p.id, p.name)} className="shrink-0 text-[10px] !px-2 !py-1">
                <Plus size={12} /> أضف كمية
              </Button>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

/* ─── Returns Tab ─── */
function ReturnsTab({ actorId }: { actorId: string | null }) {
  const loader = useCallback(async () => {
    const { data, error } = await supabase
      .from('customer_returns')
      .select('*, profiles(full_name, phone), customer_return_items(*, products(name))')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []) as CustomerReturn[];
  }, []);

  const { data: returns, loading, error, reload } = useSupabaseQuery(loader, []);

  async function handleAction(returnId: string, approve: boolean) {
    if (!actorId) return;
    try {
      await processCustomerReturn(returnId, approve, actorId);
      toast.success(approve ? 'تمت الموافقة على المرتجع' : 'تم رفض المرتجع');
      reload();
    } catch {
      toast.error('فشلت العملية');
    }
  }

  return (
    <Card>
      <h2 className="mb-3 text-sm font-extrabold text-ink">المرتجعات</h2>
      {loading && <LoadingState />}
      {error && <ErrorState message={error} />}
      {!loading && !error && (!returns || returns.length === 0) && (
        <EmptyState title="لا توجد مرتجعات" body="لم يتم تسجيل أي مرتجع بعد" />
      )}
      {returns && returns.length > 0 && (
        <div className="space-y-2">
          {returns.map((r) => (
            <div key={r.id} className="rounded-xl border border-slate-100 bg-slate-50/50 p-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                  {returnStatusLabels[r.status]}
                </span>
                <span className="flex-1 font-bold text-ink">{r.profiles?.full_name || 'عميل'}</span>
                <span className="text-[10px] text-slate-400">{new Date(r.created_at).toLocaleDateString('ar')}</span>
              </div>
              <p className="mt-1 text-slate-600">{r.reason}</p>
              {r.customer_return_items && r.customer_return_items.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {r.customer_return_items.map((item) => (
                    <span key={item.id} className="rounded-lg bg-white px-1.5 py-0.5 text-[10px] text-slate-600 border border-slate-100">
                      {item.products?.name} × {item.quantity} ({returnConditionLabels[item.condition]})
                    </span>
                  ))}
                </div>
              )}
              {r.status === 'pending' && (
                <div className="mt-2 flex gap-2">
                  <Button onClick={() => handleAction(r.id, true)} className="flex-1 !bg-emerald-600 text-[10px] hover:!bg-emerald-700">
                    <CheckCircle2 size={12} /> موافقة
                  </Button>
                  <Button onClick={() => handleAction(r.id, false)} className="flex-1 !bg-rose-600 text-[10px] hover:!bg-rose-700">
                    <XCircle size={12} /> رفض
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

/* ─── Bin Locations Tab ─── */
function BinLocationsTab() {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [zone, setZone] = useState('');

  const loader = useCallback(async () => {
    const { data, error } = await supabase
      .from('bin_locations')
      .select('*')
      .order('code', { ascending: true });
    if (error) throw error;
    return (data || []) as BinLocation[];
  }, []);

  const { data: bins, loading, error, reload } = useSupabaseQuery(loader, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!code.trim() || !name.trim()) return;
    const { error } = await supabase
      .from('bin_locations')
      .insert({ code: code.trim(), name: name.trim(), zone: zone.trim() || null, is_active: true });
    if (error) {
      toast.error('فشل إنشاء الموقع');
      return;
    }
    toast.success('تم إنشاء موقع التخزين');
    setCode('');
    setName('');
    setZone('');
    reload();
  }

  async function handleDelete(id: string) {
    if (!confirm('هل تريد حذف هذا الموقع؟')) return;
    const { error } = await supabase.from('bin_locations').delete().eq('id', id);
    if (error) {
      toast.error('فشل الحذف');
      return;
    }
    toast.success('تم الحذف');
    reload();
  }

  return (
    <div className="space-y-3">
      <Card>
        <h2 className="mb-2 text-sm font-extrabold text-ink">إضافة موقع تخزين</h2>
        <form onSubmit={handleCreate} className="grid grid-cols-1 gap-2 sm:grid-cols-4">
          <Input placeholder="الرمز (A-01)" value={code} onChange={(e) => setCode(e.target.value)} required />
          <Input placeholder="الاسم" value={name} onChange={(e) => setName(e.target.value)} required />
          <Input placeholder="المنطقة (اختياري)" value={zone} onChange={(e) => setZone(e.target.value)} />
          <Button type="submit" disabled={!code.trim() || !name.trim()}>
            <Plus size={14} /> إضافة
          </Button>
        </form>
      </Card>

      <Card>
        <h2 className="mb-2 text-sm font-extrabold text-ink">مواقع التخزين</h2>
        {loading && <LoadingState />}
        {error && <ErrorState message={error} />}
        {!loading && !error && (!bins || bins.length === 0) && (
          <EmptyState title="لا توجد مواقع" body="أضف مواقع تخزين جديدة" />
        )}
        {bins && bins.length > 0 && (
          <div className="space-y-1">
            {bins.map((bin) => (
              <div key={bin.id} className="flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50/50 p-2 text-xs">
                <div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-azraq-50">
                  <MapPin size={12} className="text-azraq-700" />
                </div>
                <span className="font-extrabold text-azraq-700">{bin.code}</span>
                <span className="flex-1 truncate font-medium text-ink">{bin.name}</span>
                {bin.zone && <span className="rounded-lg bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">{bin.zone}</span>}
                <button onClick={() => handleDelete(bin.id)} className="text-rose-400 transition hover:text-rose-600">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
