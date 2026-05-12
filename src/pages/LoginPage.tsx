import { FormEvent, useState } from 'react';
import { Navigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { LockKeyhole, Phone, UserPlus } from 'lucide-react';
import { SplashScreen } from '../components/Brand';
import { Button, Card, Input, Textarea } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { normalizeEgyptPhone } from '../lib/auth';
import { checkRateLimit, recordAttempt, resetAttempts } from '../lib/rateLimiter';
import { sanitizePhone, sanitizeText } from '../lib/sanitize';
import { isSupabaseConfigured } from '../lib/supabase';
import { roleHome } from '../routes/ProtectedRoute';

type AuthMode = 'login' | 'signup';

function getAuthErrorMessage(error: unknown, fallback: string) {
  if (!(error instanceof Error)) return fallback;
  const message = error.message.toLowerCase();
  if (message.includes('rate limit')) return 'فيه ضغط على التسجيل. جرب تاني بعد شوية.';
  if (message.includes('invalid login credentials')) return 'رقم الموبايل أو الباسورد غير صحيح';
  if (message.includes('already registered')) return 'الرقم متسجل قبل كده. جرب تدخل حسابك.';
  if (message.includes('email not confirmed')) return 'الحساب محتاج تفعيل. كلم الإدارة لو المشكلة فضلت موجودة.';
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

  if (session && !profileResolved) return <SplashScreen />;
  if (session && role) return <Navigate to={roleHome(role)} replace />;

  const submitLogin = async (event: FormEvent) => {
    event.preventDefault();
    if (!isSupabaseConfigured) {
      toast.error('إعدادات الاتصال ناقصة');
      return;
    }

    const sanitizedPhone = sanitizePhone(phone);
    const rateLimitKey = `login_${sanitizedPhone}`;
    const { allowed, retryAfterSeconds } = checkRateLimit(rateLimitKey);
    if (!allowed) {
      toast.error(`محاولات كتير. جرب تاني بعد ${retryAfterSeconds} ثانية.`);
      return;
    }

    setLoading(true);
    try {
      await signIn(sanitizedPhone, password);
      resetAttempts(rateLimitKey);
      if (rememberMe) localStorage.setItem('azraq_remember_phone', normalizeEgyptPhone(sanitizedPhone));
      toast.success('دخلت حسابك بنجاح');
    } catch (error) {
      recordAttempt(rateLimitKey);
      const message = error instanceof Error && error.message.includes('رقم موبايل صحيح')
        ? error.message
        : getAuthErrorMessage(error, 'رقم الموبايل أو الباسورد غير صحيح');
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
      toast.error('الباسورد وتأكيده مختلفين');
      return;
    }

    const sanitizedPhone = sanitizePhone(phone);
    const rateLimitKey = `signup_${sanitizedPhone}`;
    const { allowed, retryAfterSeconds } = checkRateLimit(rateLimitKey);
    if (!allowed) {
      toast.error(`محاولات كتير. جرب تاني بعد ${retryAfterSeconds} ثانية.`);
      return;
    }

    setLoading(true);
    try {
      const signedIn = await signUp({
        fullName: sanitizeText(fullName),
        phone: sanitizedPhone,
        password,
        address: sanitizeText(address),
      });
      resetAttempts(rateLimitKey);
      toast.success(signedIn ? 'حسابك اتعمل ودخلناك عليه' : 'حسابك اتعمل. ادخل بعد التفعيل.');
    } catch (error) {
      recordAttempt(rateLimitKey);
      toast.error(getAuthErrorMessage(error, 'معرفناش نعمل الحساب'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-azraq-950">
      <img src="/assets/brand/login-hero-720.jpg" alt="" className="absolute inset-0 h-full w-full object-cover object-center" />
      <div className="absolute inset-0 bg-gradient-to-b from-azraq-950/20 via-azraq-950/30 to-azraq-950/85 lg:bg-gradient-to-l lg:from-azraq-950/80 lg:via-azraq-950/30 lg:to-transparent" />
      <div className="relative z-10 grid min-h-screen items-end p-3 sm:p-5 lg:items-center lg:justify-end lg:p-8">
        <Card className="mx-auto w-full max-w-md animate-rise border-white/30 bg-white/95 p-5 shadow-2xl lg:mx-0 lg:ml-12">
          <div className="mb-5 grid h-14 w-14 place-items-center rounded-3xl bg-azraq-50 text-azraq-700">
            {mode === 'login' ? <LockKeyhole size={26} /> : <UserPlus size={26} />}
          </div>
          <h1 className="font-display text-3xl font-extrabold text-ink">{mode === 'login' ? 'ادخل حسابك' : 'اعمل حساب جديد'}</h1>
          {mode === 'signup' && <p className="mt-2 text-sm leading-6 text-slate-500">اكتب بياناتك الأساسية واعمل حساب جديد.</p>}

          {mode === 'login' ? (
            <form onSubmit={submitLogin} className="mt-5 space-y-3">
              <Input required dir="ltr" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="010xxxxxxxx" />
              <Input required type="password" minLength={6} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="الباسورد" />
              <label className="flex items-center gap-2 text-sm font-bold text-slate-600">
                <input type="checkbox" checked={rememberMe} onChange={(event) => setRememberMe(event.target.checked)} />
                افتكرني
              </label>
              <Button disabled={loading} className="w-full">
                <Phone size={18} />
                {loading ? 'جاري الدخول...' : 'تسجيل الدخول'}
              </Button>
              <button type="button" onClick={() => setMode('signup')} className="w-full text-sm font-extrabold text-azraq-700">
                معندكش حساب؟ اعمل حساب جديد
              </button>
            </form>
          ) : (
            <form onSubmit={submitSignup} className="mt-5 space-y-3">
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
