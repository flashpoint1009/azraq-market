import { PackageCheck, ShoppingCart } from 'lucide-react';

export function LogoMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="relative grid h-12 w-12 place-items-center rounded-3xl bg-gradient-to-br from-azraq-500 to-azraq-800 text-white shadow-glow">
        <PackageCheck size={24} />
        <ShoppingCart className="absolute -bottom-1 -left-1 rounded-full bg-white p-1 text-azraq-700 shadow-soft" size={22} />
      </div>
      {!compact && (
        <div>
          <p className="font-display text-2xl font-extrabold text-ink">أزرق ماركت</p>
          <p className="-mt-1 text-xs font-semibold uppercase tracking-[0.3em] text-azraq-500">Azraq Market</p>
        </div>
      )}
    </div>
  );
}

export function SplashScreen() {
  return (
    <div className="grid min-h-screen place-items-center overflow-hidden bg-[radial-gradient(circle_at_20%_20%,#d7efff,transparent_28%),linear-gradient(135deg,#f7fbff,#eef7ff_45%,#ffffff)] p-6">
      <div className="absolute inset-x-8 top-12 h-32 rounded-full bg-azraq-200/50 blur-3xl" />
      <div className="animate-rise rounded-[2rem] border border-white/80 bg-white/80 p-8 text-center shadow-soft backdrop-blur-xl">
        <div className="mx-auto mb-6 flex justify-center">
          <LogoMark />
        </div>
        <p className="text-sm font-semibold text-slate-500">بنجهزلك التطبيق... ثواني بس</p>
        <div className="mt-6 h-2 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full w-2/3 animate-shimmer rounded-full bg-[linear-gradient(90deg,#0f78d2,#88d1ff,#0f78d2)] bg-[length:200%_100%]" />
        </div>
      </div>
    </div>
  );
}
