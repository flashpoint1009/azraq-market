import { FormEvent, useState } from 'react';
import toast from 'react-hot-toast';
import { Button, Card, Input, PageHeader, Textarea } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { useSupabaseQuery } from '../hooks/useSupabaseQuery';

export function ProfilePage() {
  const { profile, refreshProfile } = useAuth();
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [address, setAddress] = useState(profile?.address || '');
  const [latitude, setLatitude] = useState(profile?.latitude?.toString() || '');
  const [longitude, setLongitude] = useState(profile?.longitude?.toString() || '');
  const [loading, setLoading] = useState(false);
  const { data: pointsBalance } = useSupabaseQuery(async () => {
    if (!profile?.id) return 0;
    const { data } = await supabase.from('loyalty_points').select('points').eq('user_id', profile.id);
    return (data || []).reduce((sum, item) => sum + Number(item.points || 0), 0);
  }, [profile?.id]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!profile) return;
    setLoading(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: fullName,
        address,
        latitude: latitude ? Number(latitude) : null,
        longitude: longitude ? Number(longitude) : null,
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

  return (
    <div>
      <PageHeader title="حسابي" subtitle="حدّث بياناتك وعنوان التوصيل." />
      <Card className="max-w-2xl">
        <div className="mb-4 rounded-2xl bg-azraq-50 p-4">
          <p className="text-sm font-bold text-slate-500">نقاط الولاء</p>
          <p className="font-display text-2xl font-extrabold text-azraq-900">{pointsBalance || 0} نقطة</p>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <Input value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="الاسم بالكامل" />
          <Input value={profile?.phone || ''} disabled placeholder="رقم الموبايل" />
          <Textarea value={address} onChange={(event) => setAddress(event.target.value)} placeholder="العنوان" rows={4} />
          <div className="grid gap-3 sm:grid-cols-2">
            <Input dir="ltr" value={latitude} onChange={(event) => setLatitude(event.target.value)} placeholder="Latitude" />
            <Input dir="ltr" value={longitude} onChange={(event) => setLongitude(event.target.value)} placeholder="Longitude" />
          </div>
          <Button disabled={loading}>{loading ? 'بنحفظ...' : 'احفظ البيانات'}</Button>
        </form>
      </Card>
    </div>
  );
}
