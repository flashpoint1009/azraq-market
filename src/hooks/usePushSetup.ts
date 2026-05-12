import { useEffect, useRef } from 'react';
import { canUsePushNotifications, isPushNotificationsConfigured, subscribeToPushNotifications } from '../lib/pushNotifications';

const PUSH_PROMPTED_KEY = 'azraq_push_prompted';
const PROMPT_DELAY_MS = 10_000; // Wait 10s after login before prompting

/**
 * Hook that auto-subscribes the user to push notifications
 * after their first successful login, with a delay to avoid
 * interrupting the initial experience.
 */
export function usePushSetup(userId: string | undefined) {
  const prompted = useRef(false);

  useEffect(() => {
    if (!userId || prompted.current) return;
    if (!canUsePushNotifications() || !isPushNotificationsConfigured()) return;

    // Don't prompt if already prompted in this browser
    const alreadyPrompted = localStorage.getItem(`${PUSH_PROMPTED_KEY}_${userId}`);
    if (alreadyPrompted) return;

    // Check if already subscribed
    if (Notification.permission === 'granted') {
      // Already granted — silently ensure subscription is saved
      subscribeToPushNotifications().catch(() => {/* ignore */});
      localStorage.setItem(`${PUSH_PROMPTED_KEY}_${userId}`, '1');
      prompted.current = true;
      return;
    }

    if (Notification.permission === 'denied') {
      // User previously denied — don't ask again
      localStorage.setItem(`${PUSH_PROMPTED_KEY}_${userId}`, '1');
      prompted.current = true;
      return;
    }

    // Permission is 'default' — prompt after delay
    const timer = setTimeout(() => {
      prompted.current = true;
      localStorage.setItem(`${PUSH_PROMPTED_KEY}_${userId}`, '1');
      subscribeToPushNotifications().catch(() => {/* user dismissed */});
    }, PROMPT_DELAY_MS);

    return () => clearTimeout(timer);
  }, [userId]);
}
