import { createContext, useContext, useMemo, useState } from 'react';
import type { Product } from '../types/database';

export type CartItem = {
  product: Product;
  quantity: number;
};

type CartContextValue = {
  items: CartItem[];
  total: number;
  count: number;
  addItem: (product: Product, quantity?: number) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
  clear: () => void;
  fillFromOrder: (items: CartItem[]) => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  const value = useMemo<CartContextValue>(() => {
    const total = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
    const count = items.reduce((sum, item) => sum + item.quantity, 0);

    return {
      items,
      total,
      count,
      addItem: (product, quantity = 1) => {
        setItems((current) => {
          const existing = current.find((item) => item.product.id === product.id);
          if (existing) {
            return current.map((item) =>
              item.product.id === product.id ? { ...item, quantity: item.quantity + quantity } : item,
            );
          }
          return [...current, { product, quantity }];
        });
      },
      updateQuantity: (productId, quantity) => {
        setItems((current) =>
          quantity <= 0
            ? current.filter((item) => item.product.id !== productId)
            : current.map((item) => (item.product.id === productId ? { ...item, quantity } : item)),
        );
      },
      removeItem: (productId) => setItems((current) => current.filter((item) => item.product.id !== productId)),
      clear: () => setItems([]),
      fillFromOrder: (nextItems) => setItems(nextItems),
    };
  }, [items]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within CartProvider');
  return context;
}
