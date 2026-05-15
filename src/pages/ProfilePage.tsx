import { FormEvent, useState } from 'react';
import toast from 'react-hot-toast';
import { CheckCircle2, Crosshair, Loader2, MapPin, UserRound } from 'lucide-react';
import { Button, Card, Input, Textarea } from '../components/ui';
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
    if (error) { toast.error(error.message); return; }
    await refreshProfile();
    toast.success('بياناتك اتحفظت');
  };

  const sendLocation = () => {
    if (!navigator.geolocation) { toast.error('المتصفح مش بيدعم تحديد الموقع'); return; }
    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocationCoords({ lat: position.coords.latitude, lng: position.coords.longitude });
        setLocationLoading(false);
        toast.success('تم تحديد موقعك — اضغط احفظ لحفظ البيانات');
      },
      (err) => {
        setLocationLoading(false);
        toast.error(err.code === err.PERMISSION_DENIED ? 'اسمح للمتصفح بالوصول للموقع أولاً' : 'تعذر تحديد الموقع');
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  return (
    <div className="pb-24">
      {/* Profile card — compact */}
      <div className="mb-3 rounded-2xl bg-azraq-900 p-3 text-white shadow-soft">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-white/15">
            <UserRound size={22} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-azraq-300">عميل</p>
            <h2 className="truncate font-display text-base font-extrabold">{profile?.full_name || 'أزرق ماركت'}</h2>
            {profile?.phone && <p className="text-xs font-bold text-white/60" dir="ltr">{profile.phone}</p>}
          </div>
        </div>
        {profile?.address && (
          <div className="mt-2 flex items-start gap-1.5 rounded-xl bg-white/10 px-2.5 py-1.5">
            <MapPin size={12} className="mt-0.5 shrink-0 text-azraq-300" />
            <p className="text-xs font-bold text-white/70 line-clamp-1">{profile.address}</p>
          </div>
        )}
      </div>

      <Card className="p-3">
        <form onSubmit={submit} className="grid gap-3">
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-500">الاسم بالكامل</label>
            <Input value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="الاسم بالكامل" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-500">رقم الموبايل</label>
            <Input value={profile?.phone || ''} disabled placeholder="رقم الموبايل" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-500">العنوان</label>
            <Textarea
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              placeholder="مثال: شارع التحرير، القاهرة"
              rows={2}
            />
          </div>

          {/* Location block — compact */}
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
            <p className="mb-2 text-xs font-extrabold text-slate-600">موقعي الجغرافي</p>
            {locationCoords ? (
              <div className="mb-2 flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">
                <CheckCircle2 size={14} />
                <span>تم تحديد الموقع ({locationCoords.lat.toFixed(4)}, {locationCoords.lng.toFixed(4)})</span>
              </div>
            ) : (
              <p className="mb-2 text-xs font-bold text-slate-500">لم يتم تحديد الموقع بعد</p>
            )}
            <button
              type="button"
              onClick={sendLocation}
              disabled={locationLoading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-azraq-700 px-4 py-2.5 text-xs font-extrabold text-white transition hover:bg-azraq-800 disabled:opacity-60"
            >
              {locationLoading ? <Loader2 size={14} className="animate-spin" /> : <Crosshair size={14} />}
              {locationLoading ? 'جاري التحديد...' : locationCoords ? 'تحديث الموقع' : 'أرسل موقعي الحالي'}
            </button>
            <p className="mt-1.5 text-center text-2xs font-bold text-slate-500">يساعد المندوب في الوصول إليك بدقة</p>
          </div>

          <Button disabled={loading} className="w-full">
            {loading ? 'بنحفظ...' : 'احفظ البيانات'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
