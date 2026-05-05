import { supabase } from './supabase';

const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

export function canUsePushNotifications() {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

export function isPushNotificationsConfigured() {
  return Boolean(vapidPublicKey);
}

export async function subscribeToPushNotifications() {
  if (!canUsePushNotifications()) {
    throw new Error('المتصفح لا يدعم إشعارات التطبيق');
  }

  if (!vapidPublicKey) {
    throw new Error('الإشعارات تحتاج إضافة VITE_VAPID_PUBLIC_KEY قبل التشغيل');
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error('لم يتم السماح بالإشعارات');
  }

  const registration = await navigator.serviceWorker.ready;
  let subscription = await registration.pushManager.getSubscription();

  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    });
  }

  const subscriptionJson = subscription.toJSON();
  const { data } = await supabase.auth.getUser();
  const endpoint = subscription.endpoint;
  const p256dh = subscriptionJson.keys?.p256dh;
  const auth = subscriptionJson.keys?.auth;

  if (!data.user || !endpoint || !p256dh || !auth) {
    throw new Error('تعذر حفظ بيانات الإشعارات');
  }

  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      user_id: data.user.id,
      endpoint,
      p256dh,
      auth,
      user_agent: navigator.userAgent,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'endpoint' },
  );

  if (error) throw error;
  return subscription;
}
