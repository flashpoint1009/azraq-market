import { useEffect, useState } from 'react';
import { Megaphone, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { AppAnnouncement as AppAnnouncementType } from '../types/database';

export function AppAnnouncement() {
  const [announcement, setAnnouncement] = useState<AppAnnouncementType | null>(null);

  useEffect(() => {
    let mounted = true;

    supabase
      .from('app_announcements')
      .select('*')
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!mounted || error || !data) return;
        const storageKey = `market-announcement-${data.id}-${data.updated_at}`;
        if (localStorage.getItem(storageKey)) return;
        setAnnouncement(data as AppAnnouncementType);
      });

    return () => {
      mounted = false;
    };
  }, []);

  if (!announcement) return null;

  const close = () => {
    localStorage.setItem(`market-announcement-${announcement.id}-${announcement.updated_at}`, 'seen');
    setAnnouncement(null);
  };

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-slate-950/45 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-[28px] bg-white p-5 text-center shadow-2xl">
        <button type="button" onClick={close} className="mr-auto grid h-9 w-9 place-items-center rounded-2xl bg-slate-100 text-slate-500" aria-label="اقفل الإعلان">
          <X size={18} />
        </button>
        <div className="mx-auto mt-2 grid h-16 w-16 place-items-center rounded-3xl bg-orange-50 text-orange-500">
          <Megaphone size={30} />
        </div>
        <h2 className="mt-4 font-display text-2xl font-extrabold text-ink">{announcement.title}</h2>
        <p className="mt-3 whitespace-pre-wrap text-sm font-bold leading-7 text-slate-600">{announcement.body}</p>
        <button type="button" onClick={close} className="mt-5 w-full rounded-2xl bg-azraq-700 px-5 py-3 text-sm font-extrabold text-white shadow-soft">
          تمام
        </button>
      </div>
    </div>
  );
}
