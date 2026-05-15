/**
 * Categories API — all Supabase queries for categories and subcategories.
 */
import { supabase } from '../lib/supabase';
import type { Category, Subcategory } from '../types/database';

export async function fetchCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('sort_order');
  if (error) throw error;
  return (data || []) as Category[];
}

export async function fetchActiveCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('is_active', true)
    .order('sort_order');
  if (error) throw error;
  return (data || []) as Category[];
}

export async function fetchSubcategories(categoryId?: string): Promise<Subcategory[]> {
  let query = supabase
    .from('subcategories')
    .select('*, categories(id, name)')
    .order('sort_order');

  if (categoryId) {
    query = query.eq('category_id', categoryId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as unknown as Subcategory[];
}

export async function fetchCategoriesWithSubcategories(): Promise<{ categories: Category[]; subcategories: Subcategory[] }> {
  const [categoriesRes, subcategoriesRes] = await Promise.all([
    supabase.from('categories').select('*').order('sort_order'),
    supabase.from('subcategories').select('*, categories(id, name)').order('sort_order'),
  ]);
  if (categoriesRes.error) throw categoriesRes.error;
  if (subcategoriesRes.error) throw subcategoriesRes.error;

  return {
    categories: categoriesRes.data as Category[],
    subcategories: subcategoriesRes.data as unknown as Subcategory[],
  };
}
