import type { ButtonHTMLAttributes, InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';

export function Button({ className = '', children, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-2xl bg-azraq-700 px-4 py-2.5 text-sm font-bold text-white shadow-soft transition hover:-translate-y-0.5 hover:bg-azraq-800 disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function SecondaryButton({ className = '', children, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-2xl border border-azraq-100 bg-white px-4 py-2.5 text-sm font-bold text-azraq-800 shadow-sm transition hover:-translate-y-0.5 hover:border-azraq-200 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function Card({ className = '', children }: { className?: string; children: React.ReactNode }) {
  return <div className={`rounded-2xl border border-white/80 bg-white/90 p-3 shadow-soft backdrop-blur sm:p-4 ${className}`}>{children}</div>;
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-azraq-400 focus:ring-2 focus:ring-azraq-100 ${props.className ?? ''}`} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-azraq-400 focus:ring-2 focus:ring-azraq-100 ${props.className ?? ''}`} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-azraq-400 focus:ring-2 focus:ring-azraq-100 ${props.className ?? ''}`} />;
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-3 flex flex-row items-start justify-between gap-2">
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-azraq-500">أزرق ماركت</p>
        <h1 className="mt-0.5 font-display text-xl font-extrabold text-ink sm:text-2xl">{title}</h1>
        {subtitle && <p className="mt-0.5 text-xs leading-5 text-slate-500">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <Card className="grid min-h-[100px] place-items-center text-center">
      <div>
        <div className="mx-auto mb-2 grid h-10 w-10 place-items-center rounded-2xl bg-azraq-50 text-azraq-700">
          <AlertCircle size={18} />
        </div>
        <h3 className="font-display text-sm font-extrabold text-ink">{title}</h3>
        <p className="mt-1 text-xs text-slate-500">{body}</p>
      </div>
    </Card>
  );
}

export function LoadingState({ label = 'بنحمّل البيانات...' }: { label?: string }) {
  return (
    <div className="flex min-h-[80px] items-center justify-center gap-2 text-xs font-semibold text-azraq-700">
      <Loader2 className="animate-spin" size={16} />
      {label}
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  return <div className="rounded-xl border border-rose-100 bg-rose-50 p-3 text-xs font-semibold text-rose-700">{message}</div>;
}
