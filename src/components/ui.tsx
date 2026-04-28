import type { ButtonHTMLAttributes, InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';

export function Button({ className = '', children, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-2xl bg-azraq-700 px-5 py-3 text-sm font-bold text-white shadow-soft transition hover:-translate-y-0.5 hover:bg-azraq-800 disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function SecondaryButton({ className = '', children, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-2xl border border-azraq-100 bg-white px-5 py-3 text-sm font-bold text-azraq-800 shadow-sm transition hover:-translate-y-0.5 hover:border-azraq-200 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function Card({ className = '', children }: { className?: string; children: React.ReactNode }) {
  return <div className={`rounded-[1.75rem] border border-white/80 bg-white/90 p-5 shadow-soft backdrop-blur ${className}`}>{children}</div>;
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-azraq-400 focus:ring-4 focus:ring-azraq-100 ${props.className ?? ''}`} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-azraq-400 focus:ring-4 focus:ring-azraq-100 ${props.className ?? ''}`} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-azraq-400 focus:ring-4 focus:ring-azraq-100 ${props.className ?? ''}`} />;
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-azraq-500">أزرق ماركت</p>
        <h1 className="mt-1 font-display text-3xl font-extrabold text-ink">{title}</h1>
        {subtitle && <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <Card className="grid min-h-[220px] place-items-center text-center">
      <div>
        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-3xl bg-azraq-50 text-azraq-700">
          <AlertCircle />
        </div>
        <h3 className="font-display text-xl font-extrabold text-ink">{title}</h3>
        <p className="mt-2 text-sm text-slate-500">{body}</p>
      </div>
    </Card>
  );
}

export function LoadingState({ label = 'بنحمّل البيانات...' }: { label?: string }) {
  return (
    <div className="flex min-h-[220px] items-center justify-center gap-3 text-sm font-semibold text-azraq-700">
      <Loader2 className="animate-spin" size={18} />
      {label}
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  return <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm font-semibold text-rose-700">{message}</div>;
}
