import { FormEvent, useState } from 'react';
import toast from 'react-hot-toast';
import { Crosshair, Loader2, MapPin, UserRound } from 'lucide-react';
import { Button, Card, Input, PageHeader, Textarea } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

export function ProfilePage() {
  const { profile, refreshProfile } = useAuth();
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [address, setAddress] = useState(profile?.address || '');
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationCoords, setLocationCoords] = useState<{ lat: number; lng: number } | null>(
    profile?.latitude && profile?.longitude ? { lat: profile.latitude, lng: profile.longitude } : null,
  );

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!profile) return;
    setLoading(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: fullName,
        address,
        ...(locationCoords ? { latitude: locationCoords.lat, longitude: locationCoords.lng } : {}),
      })
      .eq('id', profile.id);
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    await refreshProfile();
    toast.success('بياناتك اتحفظت');
  };

  const sendLocation = () => {
    if (!navigator.geolocation) {
      toast.error('المتصفح مش بيدعم تحديد الموقع');
      return;
    }
    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = { lat: position.coords.latitude, lng: position.coords.longitude };
        setLocationCoords(coords);
        setLocationLoading(false);
        toast.success('تم تحديد موقعك — اضغط احفظ لحفظ البيانات');
      },
      (err) => {
        setLocationLoading(false);
        if (err.code === err.PERMISSION_DENIED) {
          toast.error('اسمح للمتصفح بالوصول للموقع ثم حاول مرة ثانية');
        } else {
          toast.error('تعذر تحديد الموقع');
        }
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  return (
    <div>
      <PageHeader title="حسابي" subtitle="صفحة الحساب والعناوين لتحديث بياناتك وعنوان التوصيل." />
      <div className="mb-4 max-w-2xl rounded-[24px] bg-azraq-900 p-4 text-white shadow-soft">
        <div className="flex items-center gap-3">
          <img src="/assets/brand/login-hero-720.jpg" alt="" className="h-16 w-16 rounded-3xl object-cover" />
          <div className="min-w-0">
            <p className="text-xs font-bold text-azraq-200">عميل</p>
            <h2 className="truncate font-display text-xl font-extrabold">{profile?.full_name || 'أزرق ماركت'}</h2>
            {profile?.phone && <p className="mt-1 text-xs font-bold text-white/70" dir="ltr">{profile.phone}</p>}
          </div>
          <div className="mr-auto grid h-12 w-12 place-items-center rounded-2xl bg-white/15">
            <UserRound size={22} />
          </div>
        </div>
        {profile?.address && <p className="mt-3 line-clamp-2 text-sm font-bold text-white/70">{profile.address}</p>}
      </div>
      <Card className="max-w-2xl">
        <form onSubmit={submit} className="space-y-4">
          <Input value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="الاسم بالكامل" />
          <Input value={profile?.phone || ''} disabled placeholder="رقم الموبايل" />
          <Textarea value={address} onChange={(event) => setAddress(event.target.value)} placeholder="العنوان (مثال: شارع التحرير، القاهرة)" rows={3} />

          {/* Location sender */}
          <div className="rounded-[20px] border border-slate-100 bg-slate-50 p-4">
            <p className="mb-3 text-sm font-extrabold text-slate-700">موقعي الجغرافي</p>
            {locationCoords ? (
              <div className="mb-3 flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
                <MapPin size={16} />
                <span>تم تحديد الموقع ({locationCoords.lat.toFixed(5)}, {locationCoords.lng.toFixed(5)})</span>
              </div>
            ) : (
              <p className="mb-3 text-xs font-bold text-slate-400">لم يتم تحديد الموقع بعد</p>
            )}
            <button
              type="button"
              onClick={sendLocation}
              disabled={locationLoading}
              className="inline-flex items-center gap-2 rounded-2xl bg-azraq-700 px-5 py-2.5 text-sm font-extrabold text-white transition hover:bg-azraq-800 disabled:opacity-60"
            >
              {locationLoading ? <Loader2 size={16} className="animate-spin" /> : <Crosshair size={16} />}
              {locationLoading ? 'جاري التحديد...' : locationCoords ? 'تحديث الموقع' : 'أرسل موقعي الحالي'}
            </button>
            <p className="mt-2 text-[11px] font-bold text-slate-400">يساعد المندوب في الوصول إليك بدقة</p>
          </div>

          <Button disabled={loading}>{loading ? 'بنحفظ...' : 'احفظ البيانات'}</Button>
        </form>
      </Card>
    </div>
  );
}
