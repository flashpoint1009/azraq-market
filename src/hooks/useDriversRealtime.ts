/**
 * Hook for the admin/supervisor to watch all driver locations in real-time.
 * Subscribes to Supabase Realtime on driver_locations table.
 */
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export type DriverLocation = {
  driver_id: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  heading: number | null;
  speed: number | null;
  is_online: boolean;
  last_updated_at: string;
  profiles?: { full_name: string | null; phone: string | null } | null;
};

export function useDriversRealtime() {
  const [drivers, setDrivers] = useState<DriverLocation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initial fetch
    const fetchDrivers = async () => {
      const { data, error } = await supabase
        .from('driver_locations')
        .select('*, profiles(full_name, phone)')
        .eq('is_online', true)
        .order('last_updated_at', { ascending: false });

      if (!error && data) {
        setDrivers(data as DriverLocation[]);
      }
      setLoading(false);
    };

    fetchDrivers();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('realtime:driver_locations')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'driver_locations' },
        (payload) => {
          const updated = payload.new as DriverLocation;
          setDrivers((current) => {
            const exists = current.findIndex((d) => d.driver_id === updated.driver_id);
            if (updated.is_online === false) {
              // Remove offline driver
              return current.filter((d) => d.driver_id !== updated.driver_id);
            }
            if (exists >= 0) {
              // Update existing
              const next = [...current];
              next[exists] = { ...next[exists], ...updated };
              return next;
            }
            // Add new
            return [...current, updated];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { drivers, loading };
}
