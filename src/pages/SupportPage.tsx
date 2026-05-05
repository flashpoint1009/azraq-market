import { Headphones, MessageCircle, Phone } from 'lucide-react';
import { Button, Card, PageHeader, SecondaryButton } from '../components/ui';
import { TENANT_CONFIG } from '../config/tenant';

export function SupportPage() {
  const supportPhone = TENANT_CONFIG.supportPhone;
  const whatsappPhone = TENANT_CONFIG.supportWhatsapp || supportPhone.replace(/^0/, '20');
  const whatsappUrl = `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(`السلام عليكم، محتاج دعم في تطبيق ${TENANT_CONFIG.brandName}`)}`;

  return (
    <div className="space-y-4">
      <PageHeader title="الدعم" subtitle="اختار طريقة التواصل المناسبة ليك." />
      <Card className="max-w-2xl">
        <div className="mb-4 grid h-14 w-14 place-items-center rounded-3xl bg-azraq-50 text-azraq-700">
          <Headphones size={26} />
        </div>
        <h2 className="font-display text-2xl font-extrabold text-ink">خدمة عملاء {TENANT_CONFIG.brandName}</h2>
        <p className="mt-2 text-sm font-bold text-slate-500" dir="ltr">{supportPhone}</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <a href={whatsappUrl} target="_blank" rel="noreferrer">
            <Button type="button" className="w-full bg-emerald-600 hover:bg-emerald-700">
              <MessageCircle size={18} />
              واتساب
            </Button>
          </a>
          <a href={`tel:${supportPhone}`}>
            <SecondaryButton type="button" className="w-full">
              <Phone size={18} />
              اتصال
            </SecondaryButton>
          </a>
        </div>
      </Card>
    </div>
  );
}
