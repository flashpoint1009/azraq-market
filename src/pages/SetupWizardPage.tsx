import { FormEvent, useState } from 'react';
import toast from 'react-hot-toast';
import { Building2, CreditCard, PackagePlus, Palette, Truck } from 'lucide-react';
import { Button, Card, Input, PageHeader, Textarea } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { TENANT_CONFIG } from '../config/tenant';

const steps = [
  { title: 'بيانات الشركة', icon: Building2 },
  { title: 'الألوان', icon: Palette },
  { title: 'الدفع', icon: CreditCard },
  { title: 'التوصيل', icon: Truck },
  { title: 'أول قسم ومنتج', icon: PackagePlus },
];

export function SetupWizardPage() {
  const { profile } = useAuth();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    company_name: TENANT_CONFIG.brandName,
    support_phone: TENANT_CONFIG.supportPhone,
    address: '',
    primary_color: TENANT_CONFIG.primaryColor,
    secondary_color: '#2b6177',
    accent_color: '#f97316',
    paymob_api_key: '',
    delivery_fee: '0',
    min_order: '0',
    category_name: '',
    product_name: '',
    product_price: '0',
  });
  const [saving, setSaving] = useState(false);

  const finish = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    const settings = [
      ['company_name', form.company_name],
      ['support_phone', form.support_phone],
      ['company_address', form.address],
      ['primary_color', form.primary_color],
      ['secondary_color', form.secondary_color],
      ['accent_color', form.accent_color],
      ['delivery_fee', Number(form.delivery_fee) || 0],
      ['min_order_amount', Number(form.min_order) || 0],
      ['setup_completed', true],
      ['setup_completed_by', profile?.id || null],
    ].map(([key, value]) => ({ key, value, updated_at: new Date().toISOString() }));

    const { error } = await (supabase as any).from('app_settings').upsert(settings, { onConflict: 'key' });
    if (!error && form.category_name.trim()) {
      const { data: category } = await supabase.from('categories').insert({ name: form.category_name.trim(), sort_order: 0, is_active: true }).select('*').single();
      if (category && form.product_name.trim()) {
        await supabase.from('products').insert({
          name: form.product_name.trim(),
          category_id: category.id,
          price: Number(form.product_price) || 0,
          cost_price: 0,
          unit_type: 'piece',
          stock_quantity: 0,
          is_available: false,
        });
      }
    }
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('تم حفظ إعدادات البداية');
  };

  const CurrentIcon = steps[step].icon;

  return (
    <div>
      <PageHeader title="معالج الإعداد الأول" subtitle="خطوات سريعة لتجهيز نسخة العميل قبل التشغيل." />
      <Card className="mx-auto max-w-3xl">
        <div className="mb-5 flex gap-2 overflow-x-auto">
          {steps.map((item, index) => (
            <button key={item.title} type="button" onClick={() => setStep(index)} className={`shrink-0 rounded-2xl px-4 py-2 text-sm font-extrabold ${step === index ? 'bg-azraq-700 text-white' : 'bg-slate-50 text-slate-500'}`}>
              {item.title}
            </button>
          ))}
        </div>
        <form onSubmit={finish} className="grid gap-4">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-azraq-50 text-azraq-700"><CurrentIcon /></div>
            <h2 className="font-display text-2xl font-extrabold">{steps[step].title}</h2>
          </div>
          {step === 0 && (
            <div className="grid gap-3">
              <Input value={form.company_name} onChange={(event) => setForm({ ...form, company_name: event.target.value })} placeholder="اسم الشركة" />
              <Input value={form.support_phone} onChange={(event) => setForm({ ...form, support_phone: event.target.value })} placeholder="رقم الدعم" />
              <Textarea value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} placeholder="عنوان الشركة" rows={3} />
            </div>
          )}
          {step === 1 && (
            <div className="grid gap-3 sm:grid-cols-3">
              {(['primary_color', 'secondary_color', 'accent_color'] as const).map((key) => (
                <label key={key} className="grid gap-2 text-sm font-bold text-slate-600">
                  {key}
                  <input type="color" value={form[key]} onChange={(event) => setForm({ ...form, [key]: event.target.value })} className="h-12 w-full rounded-2xl border border-slate-100" />
                </label>
              ))}
            </div>
          )}
          {step === 2 && <Input value={form.paymob_api_key} onChange={(event) => setForm({ ...form, paymob_api_key: event.target.value })} placeholder="Paymob API Key أو اتركه فارغ" dir="ltr" />}
          {step === 3 && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Input type="number" value={form.delivery_fee} onChange={(event) => setForm({ ...form, delivery_fee: event.target.value })} placeholder="رسوم التوصيل" />
              <Input type="number" value={form.min_order} onChange={(event) => setForm({ ...form, min_order: event.target.value })} placeholder="أقل طلب" />
            </div>
          )}
          {step === 4 && (
            <div className="grid gap-3">
              <Input value={form.category_name} onChange={(event) => setForm({ ...form, category_name: event.target.value })} placeholder="اسم أول قسم" />
              <Input value={form.product_name} onChange={(event) => setForm({ ...form, product_name: event.target.value })} placeholder="اسم منتج تجريبي" />
              <Input type="number" value={form.product_price} onChange={(event) => setForm({ ...form, product_price: event.target.value })} placeholder="سعر المنتج" />
            </div>
          )}
          <div className="flex gap-2">
            {step > 0 && <Button type="button" onClick={() => setStep(step - 1)} className="bg-slate-500 hover:bg-slate-600">السابق</Button>}
            {step < steps.length - 1 ? <Button type="button" onClick={() => setStep(step + 1)}>التالي</Button> : <Button disabled={saving}>{saving ? 'جاري الحفظ...' : 'إنهاء الإعداد'}</Button>}
          </div>
        </form>
      </Card>
    </div>
  );
}
