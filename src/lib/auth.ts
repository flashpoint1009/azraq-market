import { supabase } from './supabase';
import type { Profile } from '../types/database';

export type SignUpCustomerInput = {
  fullName: string;
  phone: string;
  password: string;
  address: string;
};

export function normalizeEgyptPhone(value: string) {
  const digits = value.replace(/\D/g, '');
  let normalized = digits;

  if (normalized.startsWith('00')) normalized = normalized.slice(2);
  if (normalized.startsWith('0')) normalized = `20${normalized.slice(1)}`;

  if (!/^201[0-9]{9}$/.test(normalized)) {
    throw new Error('اكتب رقم موبايل صحيح زي 010xxxxxxxx أو 2010xxxxxxxx أو +2010xxxxxxxx');
  }

  return normalized;
}

export function phoneToInternalEmail(phone: string) {
  return phoneToInternalEmailWithDomain(phone, 'azraqmarket.app');
}

function phoneToInternalEmailWithDomain(phone: string, domain: string) {
  return `phone${normalizeEgyptPhone(phone)}@${domain}`;
}

const internalEmailDomains = ['azraqmarket.app', 'example.com'];

function internalEmailsForPhone(phone: string) {
  return internalEmailDomains.map((domain) => phoneToInternalEmailWithDomain(phone, domain));
}

function isInvalidInternalEmailError(error: unknown) {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return message.includes('email address') && message.includes('invalid');
}

export async function signInWithPhonePassword(phone: string, password: string) {
  if (password.length < 6) throw new Error('الباسورد لازم يكون 6 حروف أو أكتر');

  let lastError: Error | null = null;
  for (const email of internalEmailsForPhone(phone)) {
    const result = await supabase.auth.signInWithPassword({ email, password });
    if (!result.error) return result;
    lastError = result.error;
    const message = result.error.message.toLowerCase();
    if (!message.includes('invalid login credentials') && !isInvalidInternalEmailError(result.error)) return result;
  }

  return { data: { user: null, session: null }, error: lastError };
}

export async function signUpCustomer({ fullName, phone, password, address }: SignUpCustomerInput) {
  if (password.length < 6) throw new Error('الباسورد لازم يكون 6 حروف أو أكتر');

  const normalizedPhone = normalizeEgyptPhone(phone);
  let signUpResult = await supabase.auth.signUp({
    email: phoneToInternalEmail(normalizedPhone),
    password,
    options: {
      data: {
        phone: normalizedPhone,
        full_name: fullName,
        address,
        role: 'customer',
      },
    },
  });

  if (signUpResult.error && isInvalidInternalEmailError(signUpResult.error)) {
    signUpResult = await supabase.auth.signUp({
      email: phoneToInternalEmailWithDomain(normalizedPhone, 'example.com'),
      password,
      options: {
        data: {
          phone: normalizedPhone,
          full_name: fullName,
          address,
          role: 'customer',
          internal_email_fallback: true,
        },
      },
    });
  }

  const { data, error } = signUpResult;
  if (error) throw error;

  if (!data.session) {
    throw new Error('الحساب اتعمل، بس الدخول التلقائي منفعش. غالبًا Confirm Email شغال في Supabase. اقفله أو فعّل المستخدم يدويًا.');
  }

  if (data.user) {
    const profile: Partial<Profile> = {
      id: data.user.id,
      phone: normalizedPhone,
      full_name: fullName,
      role: 'customer',
      address,
    };

    const { error: profileError } = await supabase.from('profiles').upsert(profile, { onConflict: 'id' });
    if (profileError) throw profileError;
  }

  return data;
}
