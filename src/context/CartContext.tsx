import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { getProductPricing } from '../lib/pricing';
import { useAuth } from './AuthContext';
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

const CART_KEY_PREFIX = 'azraq_cart_';

function getStorageKey(userId: string | undefined) {
  return userId ? `${CART_KEY_PREFIX}${userId}` : null;
}

function loadCartFromStorage(userId: string | undefined): CartItem[] {
  const key = getStorageKey(userId);
  if (!key) return [];
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    // corrupted data — ignore
  }
  return [];
}

function saveCartToStorage(userId: string | undefined, items: CartItem[]) {
  const key = getStorageKey(userId);
  if (!key) return;
  try {
    if (items.length === 0) {
      localStorage.removeItem(key);
    } else {
      localStorage.setItem(key, JSON.stringify(items));
    }
  } catch {
    // storage full or unavailable — ignore
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const userId = session?.user?.id;
  const [items, setItems] = useState<CartItem[]>(() => loadCartFromStorage(userId));
  const prevUserIdRef = useRef(userId);

  // When user changes, load their cart (or clear if logged out)
  useEffect(() => {
    if (prevUserIdRef.current !== userId) {
      prevUserIdRef.current = userId;
      setItems(loadCartFromStorage(userId));
    }
  }, [userId]);

  // Persist cart to localStorage whenever it changes
  useEffect(() => {
    saveCartToStorage(userId, items);
  }, [items, userId]);

  const addItem = useCallback((product: Product, quantity = 1) => {
    setItems((current) => {
      const existing = current.find((item) => item.product.id === product.id);
      if (existing) {
        return current.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + quantity } : item,
        );
      }
      return [...current, { product, quantity }];
    });
  }, []);

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    setItems((current) =>
      quantity <= 0
        ? current.filter((item) => item.product.id !== productId)
        : current.map((item) => (item.product.id === productId ? { ...item, quantity } : item)),
    );
  }, []);

  const removeItem = useCallback((productId: string) => {
    setItems((current) => current.filter((item) => item.product.id !== productId));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const fillFromOrder = useCallback((nextItems: CartItem[]) => setItems(nextItems), []);

  const value = useMemo<CartContextValue>(() => {
    const total = items.reduce((sum, item) => sum + getProductPricing(item.product).finalPrice * item.quantity, 0);
    const count = items.reduce((sum, item) => sum + item.quantity, 0);

    return {
      items,
      total,
      count,
      addItem,
      updateQuantity,
      removeItem,
      clear,
      fillFromOrder,
    };
  }, [items, addItem, updateQuantity, removeItem, clear, fillFromOrder]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within CartProvider');
  return context;
}
