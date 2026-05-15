/**
 * Products API — all Supabase queries for product data.
 */
import { supabase } from '../lib/supabase';
import type { Category, Product, Subcategory } from '../types/database';

const PRODUCT_FIELDS = '*, categories(id,name), subcategories(id,name)';

export type ProductListFilters = {
  categoryId?: string;
  subcategoryId?: string;
  available?: boolean;
  limit?: number;
  searchQuery?: string;
};

export async function fetchProducts(filters?: ProductListFilters): Promise<Product[]> {
  let query = supabase
    .from('products')
    .select(PRODUCT_FIELDS)
    .order('created_at', { ascending: false });

  if (filters?.available !== undefined) {
    query = query.eq('is_available', filters.available);
  }
  if (filters?.categoryId && filters.categoryId !== 'all') {
    query = query.eq('category_id', filters.categoryId);
  }
  if (filters?.subcategoryId) {
    query = query.eq('subcategory_id', filters.subcategoryId);
  }
  if (filters?.searchQuery) {
    query = query.ilike('name', `%${filters.searchQuery}%`);
  }
  if (filters?.limit) {
    query = query.limit(filters.limit);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as unknown as Product[];
}

export async function fetchAvailableProducts(limit = 24): Promise<Product[]> {
  return fetchProducts({ available: true, limit });
}

export async function fetchProductById(id: string): Promise<Product> {
  const { data, error } = await supabase
    .from('products')
    .select(PRODUCT_FIELDS)
    .eq('id', id)
    .single();
  if (error) throw error;
  return data as unknown as Product;
}

export async function fetchAllProductsAdmin(): Promise<{ products: Product[]; categories: Category[]; subcategories: Subcategory[] }> {
  const [categoriesRes, subcategoriesRes, productsRes] = await Promise.all([
    supabase.from('categories').select('*').order('sort_order'),
    supabase.from('subcategories').select('*, categories(id,name)').order('sort_order'),
    supabase.from('products').select(`${PRODUCT_FIELDS}`).order('created_at', { ascending: false }),
  ]);
  if (categoriesRes.error) throw categoriesRes.error;
  if (subcategoriesRes.error) throw subcategoriesRes.error;
  if (productsRes.error) throw productsRes.error;

  return {
    products: productsRes.data as unknown as Product[],
    categories: categoriesRes.data as Category[],
    subcategories: subcategoriesRes.data as unknown as Subcategory[],
  };
}
