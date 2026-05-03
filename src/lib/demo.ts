export const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true';

export const demoAccounts = [
  { role: 'admin', phone: '201000000001', password: '123456' },
  { role: 'warehouse', phone: '201000000002', password: '123456' },
  { role: 'delivery', phone: '201000000003', password: '123456' },
  { role: 'customer', phone: '201000000004', password: '123456' },
];

export function blockDemoWrite(action: string) {
  if (!DEMO_MODE) return false;
  console.warn(`Demo mode blocked ${action}`);
  return true;
}
