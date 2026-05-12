/**
 * Hook for the delivery driver to broadcast their GPS location.
 * Sends position to Supabase every INTERVAL_MS milliseconds.
 */
import { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

const INTERVAL_MS = 15_000; // every 15 seconds
const HISTORY_INTERVAL_MS = 60_000; // save to history every 60 seconds

export function useDriverGPS(driverId: string | undefined, enabled = true) {
  const watchIdRef = useRef<number | null>(null);
  const historyTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastPositionRef = useRef<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!driverId || !enabled || !('geolocation' in navigator)) return;

    let alive = true;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const sendPosition = async (position: GeolocationPosition) => {
      if (!alive) return;
      const { latitude, longitude, accuracy, heading, speed } = position.coords;
      lastPositionRef.current = { lat: latitude, lng: longitude };

      await supabase.from('driver_locations').upsert({
        driver_id: driverId,
        latitude,
        longitude,
        accuracy: accuracy ?? null,
        heading: heading ?? null,
        speed: speed ?? null,
        is_online: true,
        last_updated_at: new Date().toISOString(),
      }, { onConflict: 'driver_id' });
    };

    const saveHistory = async () => {
      if (!lastPositionRef.current || !driverId) return;
      await supabase.from('driver_location_history').insert({
        driver_id: driverId,
        latitude: lastPositionRef.current.lat,
        longitude: lastPositionRef.current.lng,
        speed: null,
      });
    };

    // Watch position
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => sendPosition(pos),
      (err) => console.error('GPS_ERROR', err),
      { enableHighAccuracy: true, maximumAge: 10_000, timeout: 30_000 }
    );

    // Also poll at intervals (watchPosition doesn't always fire regularly)
    intervalId = setInterval(() => {
      navigator.geolocation.getCurrentPosition(
        (pos) => sendPosition(pos),
        () => {},
        { enableHighAccuracy: true, maximumAge: INTERVAL_MS }
      );
    }, INTERVAL_MS);

    // Save to history periodically
    historyTimerRef.current = setInterval(saveHistory, HISTORY_INTERVAL_MS);

    // Cleanup: mark as offline
    return () => {
      alive = false;
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      if (intervalId) clearInterval(intervalId);
      if (historyTimerRef.current) clearInterval(historyTimerRef.current);

      // Mark driver as offline
      supabase.from('driver_locations').update({ is_online: false, last_updated_at: new Date().toISOString() }).eq('driver_id', driverId);
    };
  }, [driverId, enabled]);
}
