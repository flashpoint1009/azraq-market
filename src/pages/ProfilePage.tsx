import { FormEvent, useState } from 'react';
import toast from 'react-hot-toast';
import { UserRound } from 'lucide-react';
import { Button, Card, Input, PageHeader, Textarea } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

export function ProfilePage() {
  const { profile, refreshProfile } = useAuth();
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [address, setAddress] = useState(profile?.address || '');
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!profile) return;
    setLoading(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: fullName,
        address,
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
          <Textarea value={address} onChange={(event) => setAddress(event.target.value)} placeholder="العنوان" rows={4} />
          <Button disabled={loading}>{loading ? 'بنحفظ...' : 'احفظ البيانات'}</Button>
        </form>
      </Card>
    </div>
  );
}
