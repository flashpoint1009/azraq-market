import { FormEvent, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Image, Plus, Upload } from 'lucide-react';
import { Button, Card, EmptyState, ErrorState, Input, LoadingState, PageHeader, Select } from '../components/ui';
import { supabase } from '../lib/supabase';
import { useSupabaseQuery } from '../hooks/useSupabaseQuery';
import type { Category, Subcategory } from '../types/database';

const emptyCategory = { name: '', sort_order: '0', image_url: '', is_active: true };
const emptySubcategory = { category_id: '', name: '', sort_order: '0', is_active: true };

function isMissingColumn(error: unknown, column: string) {
  return Boolean(error && typeof error === 'object' && 'message' in error && String((error as { message?: unknown }).message).includes(`'${column}' column`));
}

export function AdminCategoriesPage() {
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingSubcategory, setEditingSubcategory] = useState<Subcategory | null>(null);
  const [categoryForm, setCategoryForm] = useState(emptyCategory);
  const [subcategoryForm, setSubcategoryForm] = useState(emptySubcategory);
  const [categoryImage, setCategoryImage] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const { data, loading, error, reload } = useSupabaseQuery(async () => {
    const [categories, subcategories] = await Promise.all([
      supabase.from('categories').select('*').order('sort_order'),
      supabase.from('subcategories').select('*, categories(id,name)').order('sort_order'),
    ]);
    if (categories.error) throw categories.error;
    if (subcategories.error) throw subcategories.error;
    return { categories: categories.data as Category[], subcategories: subcategories.data as Subcategory[] };
  }, []);

  const subcategoriesByCategory = useMemo(() => {
    const groups = new Map<string, Subcategory[]>();
    (data?.subcategories || []).forEach((s) => { groups.set(s.category_id, [...(groups.get(s.category_id) || []), s]); });
    return groups;
  }, [data?.subcategories]);

  const resetCategory = () => { setEditingCategory(null); setCategoryForm(emptyCategory); setCategoryImage(null); };
  const resetSubcategory = () => { setEditingSubcategory(null); setSubcategoryForm(emptySubcategory); };

  const startCategoryEdit = (category: Category) => {
    setEditingCategory(category);
    setCategoryForm({ name: category.name, sort_order: String(category.sort_order), image_url: category.image_url || '', is_active: category.is_active ?? true });
    setCategoryImage(null);
  };

  const startSubcategoryEdit = (subcategory: Subcategory) => {
    setEditingSubcategory(subcategory);
    setSubcategoryForm({ category_id: subcategory.category_id, name: subcategory.name, sort_order: String(subcategory.sort_order), is_active: subcategory.is_active ?? true });
  };

  const uploadCategoryImage = async () => {
    if (!categoryImage) return categoryForm.image_url || null;
    setUploading(true);
    const safeName = categoryImage.name.replace(/[^\w.-]+/g, '-');
    const path = `categories/${Date.now()}-${crypto.randomUUID()}-${safeName}`;
    const { error: uploadError } = await supabase.storage.from('product-images').upload(path, categoryImage, { upsert: true });
    setUploading(false);
    if (uploadError) throw uploadError;
    const { data: publicData } = supabase.storage.from('product-images').getPublicUrl(path);
    return publicData.publicUrl;
  };

  const saveCategory = async (event: FormEvent) => {
    event.preventDefault();
    let imageUrl: string | null = categoryForm.image_url || null;
    try { imageUrl = await uploadCategoryImage(); } catch { toast.error('تعذر رفع صورة القسم'); return; }
    const payload = { name: categoryForm.name.trim(), sort_order: Number(categoryForm.sort_order) || 0, image_url: imageUrl, is_active: categoryForm.is_active };
    let result = editingCategory ? await supabase.from('categories').update(payload).eq('id', editingCategory.id) : await supabase.from('categories').insert(payload);
    const missingImageColumn = result.error && isMissingColumn(result.error, 'image_url');
    const missingActiveColumn = result.error && isMissingColumn(result.error, 'is_active');
    if (result.error && (missingImageColumn || missingActiveColumn)) {
      const legacyPayload: Partial<Category> = { name: payload.name, sort_order: payload.sort_order };
      if (!missingActiveColumn) legacyPayload.is_active = payload.is_active;
      result = editingCategory ? await supabase.from('categories').update(legacyPayload).eq('id', editingCategory.id) : await supabase.from('categories').insert(legacyPayload);
    }
    if (result.error) { toast.error(result.error.message); return; }
    toast.success(editingCategory ? 'القسم اتعدل' : 'القسم اتضاف');
    resetCategory(); reload();
  };

  const saveSubcategory = async (event: FormEvent) => {
    event.preventDefault();
    const payload = { category_id: subcategoryForm.category_id, name: subcategoryForm.name.trim(), sort_order: Number(subcategoryForm.sort_order) || 0, is_active: subcategoryForm.is_active };
    let result = editingSubcategory ? await supabase.from('subcategories').update(payload).eq('id', editingSubcategory.id) : await supabase.from('subcategories').insert(payload);
    if (result.error && isMissingColumn(result.error, 'is_active')) {
      result = editingSubcategory ? await supabase.from('subcategories').update({ category_id: payload.category_id, name: payload.name, sort_order: payload.sort_order }).eq('id', editingSubcategory.id) : await supabase.from('subcategories').insert({ category_id: payload.category_id, name: payload.name, sort_order: payload.sort_order });
    }
    if (result.error) { toast.error(result.error.message); return; }
    toast.success(editingSubcategory ? 'القسم الفرعي اتعدل' : 'القسم الفرعي اتضاف');
    resetSubcategory(); reload();
  };

  const removeCategory = async (category: Category) => {
    if (!confirm(`تحذف قسم "${category.name}"؟`)) return;
    const { error } = await supabase.from('categories').delete().eq('id', category.id);
    if (error) toast.error(error.message); else { toast.success('القسم اتحذف'); reload(); }
  };

  const removeSubcategory = async (subcategory: Subcategory) => {
    if (!confirm(`تحذف القسم الفرعي "${subcategory.name}"؟`)) return;
    const { error } = await supabase.from('subcategories').delete().eq('id', subcategory.id);
    if (error) toast.error(error.message); else { toast.success('القسم الفرعي اتحذف'); reload(); }
  };

  return (
    <div className="pb-24">
      <PageHeader title="الأقسام" subtitle="رتب الأقسام الرئيسية والفرعية." />
      <div className="grid gap-3 lg:grid-cols-[320px_1fr]">
        <div className="grid gap-3">
          <Card>
            <h2 className="mb-2 font-display text-base font-extrabold">{editingCategory ? 'تعديل قسم' : 'قسم جديد'}</h2>
            <form onSubmit={saveCategory} className="grid gap-2">
              <Input required value={categoryForm.name} onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })} placeholder="اسم القسم" />
              <Input required type="number" value={categoryForm.sort_order} onChange={(e) => setCategoryForm({ ...categoryForm, sort_order: e.target.value })} placeholder="الترتيب" />
              <Input dir="ltr" value={categoryForm.image_url} onChange={(e) => setCategoryForm({ ...categoryForm, image_url: e.target.value })} placeholder="رابط صورة القسم" />
              <label className="block rounded-xl border border-dashed border-azraq-200 bg-azraq-50/60 px-3 py-2 text-xs font-bold text-azraq-800">
                <span className="flex items-center gap-2"><Upload size={14} /> ارفع صورة للقسم</span>
                <input type="file" accept="image/*" onChange={(e) => setCategoryImage(e.target.files?.[0] ?? null)} className="mt-1 block w-full text-xs text-slate-500" />
              </label>
              {categoryForm.image_url && (
                <div className="h-20 overflow-hidden rounded-xl bg-azraq-50">
                  <img src={categoryForm.image_url} alt="" className="h-full w-full object-cover" />
                </div>
              )}
              <label className="flex items-center gap-2 text-xs font-bold text-slate-600">
                <input type="checkbox" checked={categoryForm.is_active} onChange={(e) => setCategoryForm({ ...categoryForm, is_active: e.target.checked })} />
                القسم شغال
              </label>
              <Button disabled={uploading} className="w-full"><Plus size={15} /> {uploading ? 'جاري رفع الصورة...' : editingCategory ? 'احفظ التعديل' : 'ضيف القسم'}</Button>
              {editingCategory && <button type="button" onClick={resetCategory} className="w-full rounded-xl bg-slate-100 py-2 text-xs font-bold text-slate-600">إلغاء</button>}
            </form>
          </Card>

          <Card>
            <h2 className="mb-2 font-display text-base font-extrabold">{editingSubcategory ? 'تعديل قسم فرعي' : 'قسم فرعي جديد'}</h2>
            <form onSubmit={saveSubcategory} className="grid gap-2">
              <Select required value={subcategoryForm.category_id} onChange={(e) => setSubcategoryForm({ ...subcategoryForm, category_id: e.target.value })}>
                <option value="">اختار القسم الرئيسي</option>
                {data?.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
              <Input required value={subcategoryForm.name} onChange={(e) => setSubcategoryForm({ ...subcategoryForm, name: e.target.value })} placeholder="اسم القسم الفرعي" />
              <Input required type="number" value={subcategoryForm.sort_order} onChange={(e) => setSubcategoryForm({ ...subcategoryForm, sort_order: e.target.value })} placeholder="الترتيب" />
              <label className="flex items-center gap-2 text-xs font-bold text-slate-600">
                <input type="checkbox" checked={subcategoryForm.is_active} onChange={(e) => setSubcategoryForm({ ...subcategoryForm, is_active: e.target.checked })} />
                القسم الفرعي شغال
              </label>
              <Button className="w-full"><Plus size={15} /> {editingSubcategory ? 'احفظ التعديل' : 'ضيف قسم فرعي'}</Button>
              {editingSubcategory && <button type="button" onClick={resetSubcategory} className="w-full rounded-xl bg-slate-100 py-2 text-xs font-bold text-slate-600">إلغاء</button>}
            </form>
          </Card>
        </div>

        <div className="grid content-start gap-2">
          {loading && <LoadingState />}
          {error && <ErrorState message={error} />}
          {!loading && !error && data?.categories.length === 0 && <EmptyState title="مفيش أقسام" body="ضيف أول قسم عشان يظهر للعميل." />}
          {data?.categories.map((category) => (
            <Card key={category.id}>
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-xl bg-azraq-50 text-azraq-700">
                  {category.image_url ? <img src={category.image_url} alt={category.name} className="h-full w-full object-cover" /> : <Image size={18} />}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-display text-sm font-extrabold">{category.name}</h3>
                  <p className="text-[11px] text-slate-500">ترتيب: {category.sort_order} · {category.is_active === false ? 'متوقف' : 'شغال'}</p>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <button type="button" onClick={() => startCategoryEdit(category)} className="rounded-xl bg-azraq-50 px-2.5 py-1.5 text-xs font-bold text-azraq-800">تعديل</button>
                  <button type="button" onClick={() => removeCategory(category)} className="rounded-xl bg-rose-50 px-2.5 py-1.5 text-xs font-bold text-rose-700">حذف</button>
                </div>
              </div>

              {(subcategoriesByCategory.get(category.id) || []).length > 0 && (
                <div className="mt-2 grid gap-1.5 border-t border-slate-100 pt-2">
                  {subcategoriesByCategory.get(category.id)?.map((subcategory) => (
                    <div key={subcategory.id} className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2">
                      <div>
                        <p className="text-xs font-extrabold text-slate-700">{subcategory.name}</p>
                        <p className="text-[10px] font-bold text-slate-400">ترتيب: {subcategory.sort_order} · {subcategory.is_active === false ? 'متوقف' : 'شغال'}</p>
                      </div>
                      <div className="flex gap-1.5">
                        <button type="button" onClick={() => startSubcategoryEdit(subcategory)} className="rounded-xl bg-white px-2 py-1 text-[11px] font-bold text-azraq-800">تعديل</button>
                        <button type="button" onClick={() => removeSubcategory(subcategory)} className="rounded-xl bg-rose-50 px-2 py-1 text-[11px] font-bold text-rose-700">حذف</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
