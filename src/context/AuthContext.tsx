import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import toast from 'react-hot-toast';
import { signInWithPhonePassword, signUpCustomer, type SignUpCustomerInput } from '../lib/auth';
import { supabase } from '../lib/supabase';
import type { Profile, Role } from '../types/database';

type AuthContextValue = {
  session: Session | null;
  profile: Profile | null;
  role: Role | null;
  loading: boolean;
  profileResolved: boolean;
  signIn: (phone: string, password: string) => Promise<void>;
  signUp: (input: SignUpCustomerInput) => Promise<boolean>;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);
const BOOT_SPLASH_TIMEOUT_MS = 2000;
const AUTH_QUERY_TIMEOUT_MS = 3000;

function timeoutError(label: string) {
  return new Error(`${label} timed out`);
}

async function withTimeout<T>(promise: PromiseLike<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(timeoutError(label)), ms);
  });

  try {
    return await Promise.race([Promise.resolve(promise), timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function fallbackProfile(session: Session): Profile {
  const metadata = session.user.user_metadata;
  const role = ['customer', 'admin', 'warehouse', 'delivery'].includes(metadata?.role) ? metadata.role as Role : 'customer';

  return {
    id: session.user.id,
    phone: metadata?.phone ?? null,
    full_name: metadata?.full_name ?? session.user.email ?? 'عميل أزرق',
    role,
    address: metadata?.address ?? null,
    latitude: null,
    longitude: null,
    created_at: new Date().toISOString(),
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileResolved, setProfileResolved] = useState(false);

  const loadProfile = useCallback(async (nextSession: Session) => {
    const userId = nextSession.user.id;
    const { data, error } = await withTimeout(
      supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
      AUTH_QUERY_TIMEOUT_MS,
      'PROFILE LOADED',
    );
    if (error) throw error;
    if (data) {
      setProfile(data);
      console.info('PROFILE LOADED', { userId, role: data.role });
      return data;
    }

    const fallback = fallbackProfile(nextSession);
    setProfile(fallback);
    console.info('PROFILE LOADED', { userId, role: fallback.role, fallback: true });

    supabase.from('profiles').upsert(fallback, { onConflict: 'id' }).then(({ error }) => {
      if (error) console.error('PROFILE UPSERT FAILED', error);
    });

    return fallback;
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!session?.user.id) return;
    setProfileResolved(false);
    try {
      await loadProfile(session);
    } finally {
      setProfileResolved(true);
    }
  }, [loadProfile, session]);

  useEffect(() => {
    let alive = true;
    let bootEnded = false;

    const endBoot = (reason: string) => {
      if (!alive || bootEnded) return;
      bootEnded = true;
      console.info('BOOT END', { reason });
      setLoading(false);
    };

    console.info('BOOT START');

    const splashTimer = setTimeout(() => {
      console.warn('BOOT END', { reason: 'splash-timeout' });
      endBoot('splash-timeout');
    }, BOOT_SPLASH_TIMEOUT_MS);

    withTimeout(supabase.auth.getSession(), AUTH_QUERY_TIMEOUT_MS, 'SESSION LOADED')
      .then(async ({ data }) => {
        if (!alive) return;
        setSession(data.session);
        console.info('SESSION LOADED', { hasSession: Boolean(data.session) });
        try {
          if (data.session) {
            setProfileResolved(false);
            await loadProfile(data.session);
            setProfileResolved(true);
          } else {
            setProfile(null);
            setProfileResolved(true);
          }
        } catch (error) {
          toast.error('معرفناش نحمل بيانات الحساب');
          console.error('PROFILE LOAD FAILED', error);
          if (data.session) setProfile(fallbackProfile(data.session));
          setProfileResolved(true);
        } finally {
          clearTimeout(splashTimer);
          endBoot('session-complete');
        }
      })
      .catch((error) => {
        console.error('SESSION LOADED', error);
        setSession(null);
        setProfile(null);
        setProfileResolved(true);
        clearTimeout(splashTimer);
        endBoot('session-error');
      });

    const { data: listener } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession);
      console.info('SESSION LOADED', { event, hasSession: Boolean(nextSession) });
      if (nextSession?.user.id) {
        setProfileResolved(false);
        loadProfile(nextSession)
          .catch((error) => {
            toast.error('معرفناش نحدث بيانات الحساب');
            console.error('PROFILE REFRESH FAILED', error);
            setProfile(fallbackProfile(nextSession));
          })
          .finally(() => setProfileResolved(true));
      } else {
        setProfile(null);
        setProfileResolved(true);
      }
      if (event !== 'INITIAL_SESSION') endBoot(`auth-event-${event}`);
    });

    return () => {
      alive = false;
      clearTimeout(splashTimer);
      listener.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      profile,
      role: profile?.role ?? null,
      loading,
      profileResolved,
      signIn: async (phone, password) => {
        const { error } = await signInWithPhonePassword(phone, password);
        if (error) throw error;
      },
      signUp: async (input) => {
        const data = await signUpCustomer(input);
        return Boolean(data.session);
      },
      refreshProfile,
      signOut: async () => {
        await supabase.auth.signOut();
        setSession(null);
        setProfile(null);
        setProfileResolved(true);
        setLoading(false);
      },
    }),
    [session, profile, loading, profileResolved, refreshProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
