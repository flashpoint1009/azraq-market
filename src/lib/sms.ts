import { supabase } from './supabase';

export type SmsMessage = {
  to: string;
  body: string;
  fallbackWhatsapp?: boolean;
};

export async function sendSms(message: SmsMessage) {
  const { data, error } = await supabase.functions.invoke('send-sms', {
    body: message,
  });
  if (error) throw error;
  return data as { ok: boolean; provider?: string; fallback?: boolean };
}
