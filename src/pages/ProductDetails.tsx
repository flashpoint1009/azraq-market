import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Minus, Plus, ShoppingCart } from 'lucide-react';
import { Button, ErrorState, LoadingState, SecondaryButton } from '../components/ui';
import { useCart } from '../context/CartContext';
import { formatCurrency, unitLabels } from '../lib/labels';
import { supabase } from '../lib/supabase';
import { useSupabaseQuery } from '../hooks/useSupabaseQuery';
import type { Product } from '../types/database';

export function ProductDetails() {
  const { id } = useParams();
  const [quantity, setQuantity] = useState(1);
  const { addItem } = useCart();
  const navigate = useNavigate();
  const { data: product, loading, error } = useSupabaseQuery(async () => {
    if (!id) throw new Error('المنتج مش موجود');
    const { data, error } = await supabase.from('products').select('*, categories(id,name)').eq('id', id).single();
    if (error) throw error;
    return data as Product;
  }, [id]);

  if (loading) return <LoadingState />;
  if (error || !product) return <ErrorState message={error || 'المنتج مش موجود'} />;

  const image = product.image_1_url || product.image_2_url;
  const canBuy = product.is_available && (product.stock_quantity ?? 1) > 0;

  return (
    <div className="pb-24">
      <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
        <div className="h-72 bg-azraq-50 sm:h-96">
          {image ? (
            <img src={image} alt={product.name} className="h-full w-full object-cover" />
          ) : (
            <div className="grid h-full place-items-center text-sm font-bold text-azraq-700">صورة المنتج</div>
          )}
        </div>
        <div className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-400">{product.categories?.name || 'تفاصيل المنتج'}</p>
              <h1 className="mt-1 font-display text-2xl font-extrabold leading-8 text-ink">{product.name}</h1>
            </div>
            <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-extrabold ${canBuy ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
              {canBuy ? 'متوفر' : 'مش متاح دلوقتي'}
            </span>
          </div>

          <div className="mt-4 rounded-2xl bg-slate-50 p-3">
            <p className="font-display text-2xl font-extrabold text-azraq-900">{formatCurrency(product.price)}</p>
            <p className="mt-1 text-sm font-bold text-slate-500">الوحدة: {unitLabels[product.unit_type]}</p>
          </div>

          <p className="mt-4 text-sm leading-7 text-slate-600">{product.description || 'مفيش وصف للمنتج دلوقتي.'}</p>

          <div className="mt-5 flex items-center justify-between rounded-2xl border border-slate-100 bg-white p-2">
            <span className="text-sm font-extrabold text-slate-600">الكمية</span>
            <div className="flex items-center gap-3">
              <SecondaryButton className="h-10 w-10 p-0" onClick={() => setQuantity(Math.max(1, quantity - 1))}>
                <Minus size={16} />
              </SecondaryButton>
              <strong className="min-w-8 text-center text-lg">{quantity}</strong>
              <SecondaryButton className="h-10 w-10 p-0" onClick={() => setQuantity(quantity + 1)}>
                <Plus size={16} />
              </SecondaryButton>
            </div>
          </div>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-100 bg-white/95 p-3 shadow-soft backdrop-blur lg:right-72">
        <Button
          disabled={!canBuy}
          onClick={() => {
            addItem(product, quantity);
            toast.success('المنتج اتضاف');
            navigate('/cart');
          }}
          className="h-12 w-full rounded-2xl"
        >
          <ShoppingCart size={18} />
          زوّد للطلب - {formatCurrency(product.price * quantity)}
        </Button>
      </div>
    </div>
  );
}
