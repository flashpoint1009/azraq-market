import { FormEvent, useState } from 'react';
import toast from 'react-hot-toast';
import { Plus } from 'lucide-react';
import { Button, Card, EmptyState, ErrorState, Input, LoadingState, PageHeader } from '../components/ui';
import { supabase } from '../lib/supabase';
import { useSupabaseQuery } from '../hooks/useSupabaseQuery';
import type { Category } from '../types/database';

const emptyCategory = { name: '', sort_order: '0' };

export function AdminCategoriesPage() {
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState(emptyCategory);
  const { data, loading, error, reload } = useSupabaseQuery(async () => {
    const { data, error } = await supabase.from('categories').select('*').order('sort_order');
    if (error) throw error;
    return data as Category[];
  }, []);

  const startEdit = (category: Category) => {
    setEditing(category);
    setForm({ name: category.name, sort_order: String(category.sort_order) });
  };

  const reset = () => {
    setEditing(null);
    setForm(emptyCategory);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const payload = {
      name: form.name.trim(),
      sort_order: Number(form.sort_order) || 0,
    };

    const result = editing
      ? await supabase.from('categories').update(payload).eq('id', editing.id)
      : await supabase.from('categories').insert(payload);

    if (result.error) {
      toast.error(result.error.message);
      return;
    }

    toast.success(editing ? 'القسم اتعدل' : 'القسم اتضاف');
    reset();
    reload();
  };

  const remove = async (category: Category) => {
    if (!confirm(`تحذف قسم "${category.name}"؟ المنتجات المرتبطة هتبقى بدون قسم.`)) return;
    const { error } = await supabase.from('categories').delete().eq('id', category.id);
    if (error) toast.error(error.message);
    else {
      toast.success('القسم اتحذف');
      reload();
    }
  };

  return (
    <div>
      <PageHeader title="الأقسام" subtitle="رتّب الأقسام وضيف أو عدّل اللي بيظهر للعميل." />
      <div className="grid gap-5 xl:grid-cols-[380px_1fr]">
        <Card>
          <h2 className="mb-4 font-display text-2xl font-extrabold">{editing ? 'تعديل قسم' : 'قسم جديد'}</h2>
          <form onSubmit={submit} className="space-y-3">
            <Input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="اسم القسم" />
            <Input required type="number" value={form.sort_order} onChange={(event) => setForm({ ...form, sort_order: event.target.value })} placeholder="الترتيب" />
            <Button className="w-full"><Plus size={17} /> {editing ? 'احفظ التعديل' : 'ضيف القسم'}</Button>
            {editing && (
              <button type="button" onClick={reset} className="w-full rounded-2xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-600">
                إلغاء
              </button>
            )}
          </form>
        </Card>
        <div className="grid gap-3">
          {loading && <LoadingState />}
          {error && <ErrorState message={error} />}
          {!loading && !error && data?.length === 0 && <EmptyState title="مفيش أقسام" body="ضيف أول قسم عشان يظهر للعميل." />}
          {data?.map((category) => (
            <Card key={category.id} className="grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
              <div>
                <h3 className="font-display text-lg font-extrabold">{category.name}</h3>
                <p className="text-sm text-slate-500">الترتيب: {category.sort_order}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => startEdit(category)} className="rounded-2xl bg-azraq-50 px-4 py-2 text-sm font-bold text-azraq-800">تعديل</button>
                <button onClick={() => remove(category)} className="rounded-2xl bg-rose-50 px-4 py-2 text-sm font-bold text-rose-700">حذف</button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
