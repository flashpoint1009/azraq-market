export const APP_VERSION = '1.0.0';

export async function checkForUpdate() {
  const url = import.meta.env.VITE_VERSION_MANIFEST_URL;
  if (!url) return null;
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) return null;
  const data = await response.json() as { version?: string; notes?: string; url?: string };
  if (!data.version || data.version === APP_VERSION) return null;
  return data;
}
