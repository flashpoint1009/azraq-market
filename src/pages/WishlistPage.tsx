import toast from 'react-hot-toast';
import { EmptyState, ErrorState, LoadingState, PageHeader } from '../components/ui';
import { ProductCard } from '../components/ProductCard';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useSupabaseQuery } from '../hooks/useSupabaseQuery';
import { supabase } from '../lib/supabase';
import type { Product, Wishlist } from '../types/database';

export function WishlistPage() {
  const { profile } = useAuth();
  const { addItem } = useCart();
  const { data, loading, error } = useSupabaseQuery(async () => {
    if (!profile?.id) return [] as Wishlist[];
    const result = await supabase
      .from('wishlists')
      .select('*, products(*, categories(id,name), subcategories(id,name))')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false });
    if (result.error) throw result.error;
    return (result.data || []) as Wishlist[];
  }, [profile?.id]);

  const add = (product: Product) => {
    addItem(product, 1);
    toast.success('اتضاف للطلب');
  };

  return (
    <div>
      <PageHeader title="المفضلة" subtitle="المنتجات اللي العميل حفظها للرجوع لها بسرعة." />
      {loading && <LoadingState />}
      {error && <ErrorState message={error} />}
      {!loading && !data?.length && <EmptyState title="المفضلة فاضية" body="اضغط على القلب في أي منتج علشان تحفظه هنا." />}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
        {data?.map((item) => item.products && <ProductCard key={item.id} product={item.products} onAdd={add} />)}
      </div>
    </div>
  );
}
