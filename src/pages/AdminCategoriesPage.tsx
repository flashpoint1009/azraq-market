import { FormEvent, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Plus } from 'lucide-react';
import { Button, Card, EmptyState, ErrorState, Input, LoadingState, PageHeader, Select } from '../components/ui';
import { supabase } from '../lib/supabase';
import { useSupabaseQuery } from '../hooks/useSupabaseQuery';
import type { Category, Subcategory } from '../types/database';

const emptyCategory = { name: '', sort_order: '0', is_active: true };
const emptySubcategory = { category_id: '', name: '', sort_order: '0', is_active: true };

function isMissingColumn(error: unknown, column: string) {
  return Boolean(error && typeof error === 'object' && 'message' in error && String((error as { message?: unknown }).message).includes(`'${column}' column`));
}

export function AdminCategoriesPage() {
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingSubcategory, setEditingSubcategory] = useState<Subcategory | null>(null);
  const [categoryForm, setCategoryForm] = useState(emptyCategory);
  const [subcategoryForm, setSubcategoryForm] = useState(emptySubcategory);

  const { data, loading, error, reload } = useSupabaseQuery(async () => {
    const [categories, subcategories] = await Promise.all([
      supabase.from('categories').select('*').order('sort_order'),
      supabase.from('subcategories').select('*, categories(id,name)').order('sort_order'),
    ]);
    if (categories.error) throw categories.error;
    if (subcategories.error) throw subcategories.error;
    return {
      categories: categories.data as Category[],
      subcategories: subcategories.data as Subcategory[],
    };
  }, []);

  const subcategoriesByCategory = useMemo(() => {
    const groups = new Map<string, Subcategory[]>();
    (data?.subcategories || []).forEach((subcategory) => {
      groups.set(subcategory.category_id, [...(groups.get(subcategory.category_id) || []), subcategory]);
    });
    return groups;
  }, [data?.subcategories]);

  const resetCategory = () => {
    setEditingCategory(null);
    setCategoryForm(emptyCategory);
  };

  const resetSubcategory = () => {
    setEditingSubcategory(null);
    setSubcategoryForm(emptySubcategory);
  };

  const startCategoryEdit = (category: Category) => {
    setEditingCategory(category);
    setCategoryForm({ name: category.name, sort_order: String(category.sort_order), is_active: category.is_active ?? true });
  };

  const startSubcategoryEdit = (subcategory: Subcategory) => {
    setEditingSubcategory(subcategory);
    setSubcategoryForm({
      category_id: subcategory.category_id,
      name: subcategory.name,
      sort_order: String(subcategory.sort_order),
      is_active: subcategory.is_active ?? true,
    });
  };

  const saveCategory = async (event: FormEvent) => {
    event.preventDefault();
    const payload = {
      name: categoryForm.name.trim(),
      sort_order: Number(categoryForm.sort_order) || 0,
      is_active: categoryForm.is_active,
    };

    let result = editingCategory
      ? await supabase.from('categories').update(payload).eq('id', editingCategory.id)
      : await supabase.from('categories').insert(payload);

    if (result.error && isMissingColumn(result.error, 'is_active')) {
      const legacyPayload = {
        name: payload.name,
        sort_order: payload.sort_order,
      };
      result = editingCategory
        ? await supabase.from('categories').update(legacyPayload).eq('id', editingCategory.id)
        : await supabase.from('categories').insert(legacyPayload);
    }

    if (result.error) {
      toast.error(result.error.message);
      return;
    }

    toast.success(editingCategory ? 'القسم اتعدل' : 'القسم اتضاف');
    resetCategory();
    reload();
  };

  const saveSubcategory = async (event: FormEvent) => {
    event.preventDefault();
    const payload = {
      category_id: subcategoryForm.category_id,
      name: subcategoryForm.name.trim(),
      sort_order: Number(subcategoryForm.sort_order) || 0,
      is_active: subcategoryForm.is_active,
    };

    let result = editingSubcategory
      ? await supabase.from('subcategories').update(payload).eq('id', editingSubcategory.id)
      : await supabase.from('subcategories').insert(payload);

    if (result.error && isMissingColumn(result.error, 'is_active')) {
      const legacyPayload = {
        category_id: payload.category_id,
        name: payload.name,
        sort_order: payload.sort_order,
      };
      result = editingSubcategory
        ? await supabase.from('subcategories').update(legacyPayload).eq('id', editingSubcategory.id)
        : await supabase.from('subcategories').insert(legacyPayload);
    }

    if (result.error) {
      toast.error(result.error.message);
      return;
    }

    toast.success(editingSubcategory ? 'القسم الفرعي اتعدل' : 'القسم الفرعي اتضاف');
    resetSubcategory();
    reload();
  };

  const removeCategory = async (category: Category) => {
    if (!confirm(`تحذف قسم "${category.name}"؟ المنتجات المرتبطة هتبقى بدون قسم.`)) return;
    const { error } = await supabase.from('categories').delete().eq('id', category.id);
    if (error) toast.error(error.message);
    else {
      toast.success('القسم اتحذف');
      reload();
    }
  };

  const removeSubcategory = async (subcategory: Subcategory) => {
    if (!confirm(`تحذف القسم الفرعي "${subcategory.name}"؟ المنتجات المرتبطة هتبقى بدون قسم فرعي.`)) return;
    const { error } = await supabase.from('subcategories').delete().eq('id', subcategory.id);
    if (error) toast.error(error.message);
    else {
      toast.success('القسم الفرعي اتحذف');
      reload();
    }
  };

  return (
    <div>
      <PageHeader title="الأقسام" subtitle="رتب الأقسام الرئيسية والفرعية اللي بتظهر للعميل." />
      <div className="grid gap-5 xl:grid-cols-[420px_1fr]">
        <div className="grid gap-4">
          <Card>
            <h2 className="mb-4 font-display text-2xl font-extrabold">{editingCategory ? 'تعديل قسم' : 'قسم جديد'}</h2>
            <form onSubmit={saveCategory} className="space-y-3">
              <Input required value={categoryForm.name} onChange={(event) => setCategoryForm({ ...categoryForm, name: event.target.value })} placeholder="اسم القسم" />
              <Input required type="number" value={categoryForm.sort_order} onChange={(event) => setCategoryForm({ ...categoryForm, sort_order: event.target.value })} placeholder="الترتيب" />
              <label className="flex items-center gap-2 text-sm font-bold text-slate-600">
                <input type="checkbox" checked={categoryForm.is_active} onChange={(event) => setCategoryForm({ ...categoryForm, is_active: event.target.checked })} />
                القسم شغال
              </label>
              <Button className="w-full"><Plus size={17} /> {editingCategory ? 'احفظ التعديل' : 'ضيف القسم'}</Button>
              {editingCategory && (
                <button type="button" onClick={resetCategory} className="w-full rounded-2xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-600">
                  إلغاء
                </button>
              )}
            </form>
          </Card>

          <Card>
            <h2 className="mb-4 font-display text-2xl font-extrabold">{editingSubcategory ? 'تعديل قسم فرعي' : 'قسم فرعي جديد'}</h2>
            <form onSubmit={saveSubcategory} className="space-y-3">
              <Select required value={subcategoryForm.category_id} onChange={(event) => setSubcategoryForm({ ...subcategoryForm, category_id: event.target.value })}>
                <option value="">اختار القسم الرئيسي</option>
                {data?.categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
              </Select>
              <Input required value={subcategoryForm.name} onChange={(event) => setSubcategoryForm({ ...subcategoryForm, name: event.target.value })} placeholder="اسم القسم الفرعي" />
              <Input required type="number" value={subcategoryForm.sort_order} onChange={(event) => setSubcategoryForm({ ...subcategoryForm, sort_order: event.target.value })} placeholder="الترتيب" />
              <label className="flex items-center gap-2 text-sm font-bold text-slate-600">
                <input type="checkbox" checked={subcategoryForm.is_active} onChange={(event) => setSubcategoryForm({ ...subcategoryForm, is_active: event.target.checked })} />
                القسم الفرعي شغال
              </label>
              <Button className="w-full"><Plus size={17} /> {editingSubcategory ? 'احفظ التعديل' : 'ضيف قسم فرعي'}</Button>
              {editingSubcategory && (
                <button type="button" onClick={resetSubcategory} className="w-full rounded-2xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-600">
                  إلغاء
                </button>
              )}
            </form>
          </Card>
        </div>

        <div className="grid content-start gap-3">
          {loading && <LoadingState />}
          {error && <ErrorState message={error} />}
          {!loading && !error && data?.categories.length === 0 && <EmptyState title="مفيش أقسام" body="ضيف أول قسم عشان يظهر للعميل." />}
          {data?.categories.map((category) => (
            <Card key={category.id} className="grid gap-4">
              <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
                <div>
                  <h3 className="font-display text-lg font-extrabold">{category.name}</h3>
                  <p className="text-sm text-slate-500">
                    الترتيب: {category.sort_order} - {category.is_active === false ? 'متوقف' : 'شغال'}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => startCategoryEdit(category)} className="rounded-2xl bg-azraq-50 px-4 py-2 text-sm font-bold text-azraq-800">تعديل</button>
                  <button onClick={() => removeCategory(category)} className="rounded-2xl bg-rose-50 px-4 py-2 text-sm font-bold text-rose-700">حذف</button>
                </div>
              </div>

              <div className="grid gap-2 border-t border-slate-100 pt-3">
                {(subcategoriesByCategory.get(category.id) || []).length ? (
                  subcategoriesByCategory.get(category.id)?.map((subcategory) => (
                    <div key={subcategory.id} className="grid gap-2 rounded-2xl bg-slate-50 p-3 text-sm md:grid-cols-[1fr_auto] md:items-center">
                      <div>
                        <p className="font-extrabold text-slate-700">{subcategory.name}</p>
                        <p className="text-xs font-bold text-slate-500">
                          فرعي - الترتيب: {subcategory.sort_order} - {subcategory.is_active === false ? 'متوقف' : 'شغال'}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => startSubcategoryEdit(subcategory)} className="rounded-2xl bg-white px-3 py-2 text-xs font-bold text-azraq-800">تعديل</button>
                        <button onClick={() => removeSubcategory(subcategory)} className="rounded-2xl bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">حذف</button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="rounded-2xl bg-slate-50 p-3 text-sm font-bold text-slate-400">مفيش أقسام فرعية تحت القسم ده.</p>
                )}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
