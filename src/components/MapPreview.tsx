import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export function MapPreview({ latitude, longitude }: { latitude: number | null; longitude: number | null }) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!ref.current || latitude == null || longitude == null) return;
    const map = L.map(ref.current, { zoomControl: false }).setView([latitude, longitude], 14);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
    }).addTo(map);
    L.marker([latitude, longitude]).addTo(map);
    return () => {
      map.remove();
    };
  }, [latitude, longitude]);

  if (latitude == null || longitude == null) {
    return <div className="grid h-52 place-items-center rounded-[1.5rem] bg-slate-100 text-sm font-bold text-slate-500">مفيش موقع محفوظ</div>;
  }

  const googleMapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
  const wazeUrl = `https://waze.com/ul?ll=${latitude},${longitude}&navigate=yes`;

  return (
    <div>
      <div ref={ref} className="h-56 overflow-hidden rounded-[1.5rem]" />
      <div className="mt-3 flex gap-2">
        <a
          className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-2xl bg-azraq-50 px-4 py-2.5 text-sm font-bold text-azraq-800 hover:bg-azraq-100 transition"
          href={googleMapsUrl}
          target="_blank"
          rel="noreferrer"
        >
          📍 Google Maps
        </a>
        <a
          className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-2xl bg-blue-50 px-4 py-2.5 text-sm font-bold text-blue-700 hover:bg-blue-100 transition"
          href={wazeUrl}
          target="_blank"
          rel="noreferrer"
        >
          🔵 Waze
        </a>
      </div>
    </div>
  );
}
