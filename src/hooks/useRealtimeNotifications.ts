import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import type { Notification } from '../types/database';

export function useRealtimeNotifications(userId?: string) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    if (!userId) return;

    supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data, error }) => {
        if (!error && data) setNotifications(data);
      });

    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        (payload) => {
          const next = payload.new as Notification;
          setNotifications((current) => [next, ...current].slice(0, 20));
          toast(next.title, { icon: '🔔' });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const unreadCount = notifications.filter((item) => !item.is_read).length;
  return { notifications, unreadCount };
}
