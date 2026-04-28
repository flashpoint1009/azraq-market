import { FormEvent, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { LockKeyhole, Phone, UserPlus } from 'lucide-react';
import { LogoMark, SplashScreen } from '../components/Brand';
import { Button, Card, Input, Textarea } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { normalizeEgyptPhone } from '../lib/auth';
import { isSupabaseConfigured } from '../lib/supabase';
import { roleHome } from '../routes/ProtectedRoute';

type AuthMode = 'login' | 'signup';

function getAuthErrorMessage(error: unknown, fallback: string) {
  if (!(error instanceof Error)) return fallback;
  const message = error.message.toLowerCase();

  if (message.includes('email rate limit') || message.includes('rate limit')) {
    return 'فيه ضغط على التسجيل. جرّب تاني بعد شوية.';
  }

  if (message.includes('invalid login credentials')) {
    return 'رقم الموبايل أو الباسورد مش مظبوط';
  }

  if (message.includes('user already registered') || message.includes('already registered')) {
    return 'الرقم متسجل قبل كده. جرّب تدخل حسابك.';
  }

  if (message.includes('email not confirmed')) {
    return 'الحساب محتاج تفعيل. كلم الإدارة لو المشكلة فضلت موجودة.';
  }

  return error.message || fallback;
}

export function LoginPage() {
  const { session, role, profileResolved, signIn, signUp } = useAuth();
  const [mode, setMode] = useState<AuthMode>('login');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [fullName, setFullName] = useState('');
  const [address, setAddress] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Disabled temporarily to avoid stale service worker issues during Netlify rollout.
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((items) => items.forEach((item) => item.unregister()));
    }
  }, []);

  if (session && !profileResolved) return <SplashScreen />;
  if (session && role) return <Navigate to={roleHome(role)} replace />;

  const submitLogin = async (event: FormEvent) => {
    event.preventDefault();
    if (!isSupabaseConfigured) {
      toast.error('إعدادات الاتصال ناقصة');
      return;
    }
    setLoading(true);
    try {
      await signIn(phone, password);
      if (rememberMe) localStorage.setItem('azraq_remember_phone', normalizeEgyptPhone(phone));
      toast.success('دخلت حسابك بنجاح');
    } catch (error) {
      const message = error instanceof Error && error.message.includes('رقم موبايل صحيح')
        ? error.message
        : getAuthErrorMessage(error, 'رقم الموبايل أو الباسورد مش مظبوط');
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const submitSignup = async (event: FormEvent) => {
    event.preventDefault();
    if (!isSupabaseConfigured) {
      toast.error('إعدادات الاتصال ناقصة');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('الباسورد وتأكيده مش زي بعض');
      return;
    }
    setLoading(true);
    try {
      const signedIn = await signUp({ fullName, phone, password, address });
      toast.success(signedIn ? 'حسابك اتعمل ودخلناك عليه' : 'حسابك اتعمل. ادخل بعد ما المستخدم يتفعل لو التأكيد مطلوب.');
    } catch (error) {
      toast.error(getAuthErrorMessage(error, 'معرفناش نعمل الحساب'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_15%_20%,#b8e2ff,transparent_28%),linear-gradient(140deg,#f7fbff,#eaf5ff_50%,#ffffff)] p-4">
      <div className="mx-auto grid min-h-screen max-w-6xl items-center gap-8 lg:grid-cols-[1fr_.8fr]">
        <section className="hidden animate-rise lg:block">
          <LogoMark />
          <h1 className="mt-8 font-display text-5xl font-extrabold leading-tight text-ink md:text-7xl">طلباتك أوامر</h1>
          <p className="mt-5 max-w-xl text-lg leading-8 text-slate-600">
            ادخل حسابك وكمّل شغلك بسرعة من غير تفاصيل كتير.
          </p>
        </section>
        <Card className="animate-rise p-6">
          <div className="mb-6">
            <LogoMark />
          </div>
          <div className="mb-6 grid h-16 w-16 place-items-center rounded-3xl bg-azraq-50 text-azraq-700">
            {mode === 'login' ? <LockKeyhole size={28} /> : <UserPlus size={28} />}
          </div>
          <h2 className="font-display text-3xl font-extrabold text-ink">{mode === 'login' ? 'ادخل حسابك' : 'اعمل حساب جديد'}</h2>
          {mode === 'signup' && <p className="mt-2 text-sm leading-6 text-slate-500">اكتب بياناتك الأساسية واعمل حساب جديد.</p>}

          {mode === 'login' ? (
            <form onSubmit={submitLogin} className="mt-6 space-y-4">
              <Input required dir="ltr" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="010xxxxxxxx" />
              <Input required type="password" minLength={6} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="الباسورد" />
              <label className="flex items-center gap-2 text-sm font-bold text-slate-600">
                <input type="checkbox" checked={rememberMe} onChange={(event) => setRememberMe(event.target.checked)} />
                افتكرني
              </label>
              <Button disabled={loading} className="w-full">
                <Phone size={18} />
                {loading ? 'جاري التسجيل...' : 'تسجيل الدخول'}
              </Button>
              <button type="button" onClick={() => setMode('signup')} className="w-full text-sm font-extrabold text-azraq-700">
                معندكش حساب؟ اعمل حساب جديد
              </button>
            </form>
          ) : (
            <form onSubmit={submitSignup} className="mt-6 space-y-4">
              <Input required value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="الاسم بالكامل" />
              <Input required dir="ltr" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="010xxxxxxxx" />
              <Input required type="password" minLength={6} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="الباسورد" />
              <Input required type="password" minLength={6} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="أكد الباسورد" />
              <Textarea required value={address} onChange={(event) => setAddress(event.target.value)} placeholder="العنوان" rows={3} />
              <Button disabled={loading} className="w-full">{loading ? 'بنعمل الحساب...' : 'اعمل حساب جديد'}</Button>
              <button type="button" onClick={() => setMode('login')} className="w-full text-sm font-extrabold text-azraq-700">
                عندك حساب؟ ادخل حسابك
              </button>
            </form>
          )}

          {!isSupabaseConfigured && (
            <div className="mt-5 rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm font-semibold leading-6 text-amber-700">
              محتاج تضيف بيانات الاتصال في ملف `.env`.
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
