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

  return (
    <div>
      <div ref={ref} className="h-56 overflow-hidden rounded-[1.5rem]" />
      <a className="mt-3 inline-flex rounded-2xl bg-azraq-50 px-4 py-2 text-sm font-bold text-azraq-800" href={`https://www.openstreetmap.org/directions?to=${latitude}%2C${longitude}`} target="_blank" rel="noreferrer">
        افتح الخريطة
      </a>
    </div>
  );
}
