import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';

function playNotificationSound() {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(800, ctx.currentTime);
    oscillator.frequency.setValueAtTime(600, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.4);
  } catch {
    // sound not supported
  }
}

export function useRealtimeOrders(onNewOrder?: () => void) {
  const [newOrderCount, setNewOrderCount] = useState(0);
  const onNewOrderRef = useRef(onNewOrder);
  onNewOrderRef.current = onNewOrder;

  useEffect(() => {
    const channel = supabase
      .channel('realtime:orders:new')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders' },
        (payload) => {
          const order = payload.new as { id: string; status: string };
          if (order.status === 'new') {
            setNewOrderCount((c) => c + 1);
            playNotificationSound();
            toast('🛒 طلب جديد وصل!', {
              duration: 6000,
              style: {
                background: '#1e3a5f',
                color: '#fff',
                fontWeight: 'bold',
                fontFamily: 'inherit',
                borderRadius: '16px',
                padding: '12px 16px',
              },
            });
            onNewOrderRef.current?.();
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const resetCount = () => setNewOrderCount(0);
  return { newOrderCount, resetCount };
}
