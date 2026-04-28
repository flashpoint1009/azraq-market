import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ShoppingCart } from 'lucide-react';
import { Button, Card, ErrorState, LoadingState, PageHeader, SecondaryButton } from '../components/ui';
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

  const images = [product.image_1_url, product.image_2_url].filter(Boolean) as string[];
  const canBuy = product.is_available && (product.stock_quantity ?? 1) > 0;

  return (
    <div>
      <PageHeader title={product.name} subtitle={product.categories?.name || 'تفاصيل المنتج'} />
      <div className="grid gap-5 lg:grid-cols-[1fr_.8fr]">
        <div className="grid gap-4 sm:grid-cols-2">
          {(images.length ? images : [null, null]).map((image, index) => (
            <Card key={index} className="h-72 overflow-hidden p-0">
              {image ? <img src={image} alt={`${product.name} ${index + 1}`} className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center bg-azraq-50 text-azraq-700">صورة {index + 1}</div>}
            </Card>
          ))}
        </div>
        <Card>
          <span className="rounded-full bg-azraq-50 px-3 py-1 text-xs font-extrabold text-azraq-700">{canBuy ? 'متوفر' : 'مش متاح دلوقتي'}</span>
          <h2 className="mt-4 font-display text-3xl font-extrabold text-ink">{formatCurrency(product.price)}</h2>
          <p className="mt-1 text-sm font-bold text-slate-500">الوحدة: {unitLabels[product.unit_type]}</p>
          <p className="mt-6 leading-8 text-slate-600">{product.description || 'مفيش وصف للمنتج دلوقتي.'}</p>
          <div className="mt-8 flex items-center gap-3">
            <SecondaryButton onClick={() => setQuantity(Math.max(1, quantity - 1))}>-</SecondaryButton>
            <strong className="min-w-12 text-center text-xl">{quantity}</strong>
            <SecondaryButton onClick={() => setQuantity(quantity + 1)}>+</SecondaryButton>
          </div>
          <Button
            disabled={!canBuy}
            onClick={() => {
              addItem(product, quantity);
              toast.success('المنتج اتضاف');
              navigate('/cart');
            }}
            className="mt-6 w-full"
          >
            <ShoppingCart size={18} />
            زوّد
          </Button>
        </Card>
      </div>
    </div>
  );
}
