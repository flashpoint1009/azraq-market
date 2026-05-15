import { useEffect, useRef, useState } from 'react';
import { MapPin, Phone, Truck, Wifi, WifiOff } from 'lucide-react';
import { Card, LoadingState, PageHeader } from '../components/ui';
import { useDriversRealtime } from '../hooks/useDriversRealtime';
import type { DriverLocation } from '../hooks/useDriversRealtime';

function formatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'الآن';
  if (diffMin < 60) return `منذ ${diffMin} دقيقة`;
  return d.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
}

function DriverCard({ driver }: { driver: DriverLocation }) {
  const googleUrl = `https://www.google.com/maps?q=${driver.latitude},${driver.longitude}`;
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-azraq-50 text-azraq-700">
        <Truck size={18} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-extrabold text-ink truncate">{driver.profiles?.full_name || 'مندوب'}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="inline-flex items-center gap-1 text-2xs font-bold text-emerald-600">
            <Wifi size={10} /> متصل
          </span>
          <span className="text-2xs text-slate-500">{formatTime(driver.last_updated_at)}</span>
          {driver.speed != null && driver.speed > 0 && (
            <span className="text-2xs text-slate-500">{Math.round(driver.speed * 3.6)} كم/س</span>
          )}
        </div>
      </div>
      <div className="flex shrink-0 gap-1.5">
        {driver.profiles?.phone && (
          <a href={`tel:${driver.profiles.phone}`} className="grid h-8 w-8 place-items-center rounded-xl bg-azraq-50 text-azraq-700 transition hover:bg-azraq-100">
            <Phone size={14} />
          </a>
        )}
        <a href={googleUrl} target="_blank" rel="noreferrer" className="grid h-8 w-8 place-items-center rounded-xl bg-emerald-50 text-emerald-700 transition hover:bg-emerald-100">
          <MapPin size={14} />
        </a>
      </div>
    </div>
  );
}

function LiveMap({ drivers }: { drivers: DriverLocation[] }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<unknown>(null);
  const markersRef = useRef<Map<string, unknown>>(new Map());
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!mapRef.current) return;
    let map: unknown;

    (async () => {
      const L = (await import('leaflet')).default;
      await import('leaflet/dist/leaflet.css');
      if (!mapRef.current) return;

      // Center on Egypt (Cairo)
      const m = L.map(mapRef.current, { zoomControl: true }).setView([30.0444, 31.2357], 11);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap',
      }).addTo(m);
      map = m;
      mapInstanceRef.current = m;
      setLoaded(true);
    })();

    return () => {
      if (map && typeof (map as { remove: () => void }).remove === 'function') {
        (map as { remove: () => void }).remove();
      }
      markersRef.current.clear();
    };
  }, []);

  // Update markers when drivers change
  useEffect(() => {
    if (!loaded || !mapInstanceRef.current) return;

    (async () => {
      const L = (await import('leaflet')).default;
      const map = mapInstanceRef.current as L.Map;

      // Remove stale markers
      const currentIds = new Set(drivers.map((d) => d.driver_id));
      markersRef.current.forEach((marker, id) => {
        if (!currentIds.has(id)) {
          (marker as L.Marker).remove();
          markersRef.current.delete(id);
        }
      });

      // Update or add markers
      for (const driver of drivers) {
        const existing = markersRef.current.get(driver.driver_id) as L.Marker | undefined;
        const latlng: [number, number] = [driver.latitude, driver.longitude];

        if (existing) {
          existing.setLatLng(latlng);
          existing.setPopupContent(
            `<strong>${driver.profiles?.full_name || 'مندوب'}</strong><br/><small>${formatTime(driver.last_updated_at)}</small>`
          );
        } else {
          const icon = L.divIcon({
            html: `<div style="background:#2b5b74;color:white;width:32px;height:32px;border-radius:50%;display:grid;place-items:center;font-size:14px;box-shadow:0 2px 8px rgba(0,0,0,0.2);border:2px solid white;">🚚</div>`,
            iconSize: [32, 32],
            className: '',
          });
          const marker = L.marker(latlng, { icon })
            .addTo(map)
            .bindPopup(`<strong>${driver.profiles?.full_name || 'مندوب'}</strong><br/><small>${formatTime(driver.last_updated_at)}</small>`);
          markersRef.current.set(driver.driver_id, marker);
        }
      }

      // Fit bounds if we have drivers
      if (drivers.length > 0) {
        const bounds = L.latLngBounds(drivers.map((d) => [d.latitude, d.longitude] as [number, number]));
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
      }
    })();
  }, [drivers, loaded]);

  return (
    <div ref={mapRef} className="h-[400px] sm:h-[500px] w-full rounded-2xl overflow-hidden border border-slate-200">
      {!loaded && (
        <div className="grid h-full place-items-center text-sm text-slate-500">جاري تحميل الخريطة...</div>
      )}
    </div>
  );
}

export function AdminLiveTrackingPage() {
  const { drivers, loading } = useDriversRealtime();
  const onlineCount = drivers.length;

  return (
    <div className="space-y-4">
      <PageHeader
        title="تتبع المندوبين مباشر"
        subtitle="شاهد موقع كل مندوب على الخريطة لحظة بلحظة."
        action={
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-extrabold text-emerald-700">
              <Wifi size={12} /> {onlineCount} متصل
            </span>
          </div>
        }
      />

      {loading && <LoadingState label="جاري تحميل بيانات المندوبين..." />}

      {!loading && (
        <>
          {/* Map */}
          <Card className="p-0 overflow-hidden">
            <LiveMap drivers={drivers} />
          </Card>

          {/* Driver list */}
          <div className="grid gap-2 sm:grid-cols-2">
            {drivers.length === 0 && (
              <div className="col-span-full rounded-2xl bg-slate-50 p-6 text-center">
                <WifiOff size={24} className="mx-auto text-slate-300 mb-2" />
                <p className="text-sm font-bold text-slate-500">لا يوجد مندوبين متصلين حاليًا</p>
                <p className="text-xs text-slate-500 mt-1">المندوبين هيظهروا هنا لما يفتحوا التطبيق ويبدأوا التوصيل</p>
              </div>
            )}
            {drivers.map((driver) => (
              <DriverCard key={driver.driver_id} driver={driver} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
