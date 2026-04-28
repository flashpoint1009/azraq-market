export type Role = 'customer' | 'admin' | 'warehouse' | 'delivery';
export type UnitType = 'carton' | 'dozen' | 'piece';
export type OrderStatus = 'new' | 'preparing' | 'ready_for_delivery' | 'with_delivery' | 'delivered' | 'rejected' | 'cancelled';
export type PaymentMethod = 'cash_on_delivery';

export type Profile = {
  id: string;
  phone: string | null;
  full_name: string | null;
  role: Role;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
};

export type Category = {
  id: string;
  name: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
};

export type Subcategory = {
  id: string;
  category_id: string;
  name: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  categories?: Pick<Category, 'id' | 'name'> | null;
};

export type Product = {
  id: string;
  category_id: string | null;
  subcategory_id: string | null;
  name: string;
  description: string | null;
  price: number;
  cost_price: number;
  unit_type: UnitType;
  image_1_url: string | null;
  image_2_url: string | null;
  stock_quantity: number;
  is_available: boolean;
  created_at: string;
  updated_at: string;
  categories?: Pick<Category, 'id' | 'name'> | null;
  subcategories?: Pick<Subcategory, 'id' | 'name'> | null;
};

export type Order = {
  id: string;
  customer_id: string;
  status: OrderStatus;
  total_amount: number;
  paid_amount: number;
  debt_amount: number;
  payment_method: PaymentMethod;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  profiles?: Pick<Profile, 'full_name' | 'phone' | 'address' | 'latitude' | 'longitude'> | null;
  order_items?: OrderItem[];
  order_status_history?: OrderStatusHistory[];
};

export type PurchaseInvoice = {
  id: string;
  supplier_name: string | null;
  total_amount: number;
  created_by: string | null;
  created_at: string;
  purchase_invoice_items?: PurchaseInvoiceItem[];
};

export type PurchaseInvoiceItem = {
  id: string;
  invoice_id: string;
  product_id: string;
  quantity: number;
  purchase_price: number;
  line_total: number;
};

export type CustomerDebt = {
  id: string;
  customer_id: string;
  order_id: string | null;
  amount: number;
  paid_amount: number;
  remaining_amount: number;
  status: 'open' | 'paid' | 'partial';
  created_at: string;
  profiles?: Pick<Profile, 'full_name' | 'phone'> | null;
};

export type OrderItem = {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name_snapshot: string;
  unit_type_snapshot: UnitType;
  unit_price_snapshot: number;
  quantity: number;
  line_total: number;
};

export type Notification = {
  id: string;
  user_id: string;
  title: string;
  body: string;
  is_read: boolean;
  related_order_id: string | null;
  created_at: string;
};

export type OrderStatusHistory = {
  id: string;
  order_id: string;
  status: OrderStatus;
  changed_by: string | null;
  created_at: string;
  profiles?: Pick<Profile, 'full_name' | 'role'> | null;
};

export type Database = {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Partial<Profile>; Update: Partial<Profile>; Relationships: [] };
      categories: { Row: Category; Insert: Partial<Category>; Update: Partial<Category>; Relationships: [] };
      subcategories: { Row: Subcategory; Insert: Partial<Subcategory>; Update: Partial<Subcategory>; Relationships: [] };
      products: { Row: Product; Insert: Partial<Product>; Update: Partial<Product>; Relationships: [] };
      orders: { Row: Order; Insert: Partial<Order>; Update: Partial<Order>; Relationships: [] };
      order_items: { Row: OrderItem; Insert: Partial<OrderItem>; Update: Partial<OrderItem>; Relationships: [] };
      notifications: { Row: Notification; Insert: Partial<Notification>; Update: Partial<Notification>; Relationships: [] };
      order_status_history: { Row: OrderStatusHistory; Insert: Partial<OrderStatusHistory>; Update: Partial<OrderStatusHistory>; Relationships: [] };
      purchase_invoices: { Row: PurchaseInvoice; Insert: Partial<PurchaseInvoice>; Update: Partial<PurchaseInvoice>; Relationships: [] };
      purchase_invoice_items: { Row: PurchaseInvoiceItem; Insert: Partial<PurchaseInvoiceItem>; Update: Partial<PurchaseInvoiceItem>; Relationships: [] };
      customer_debts: { Row: CustomerDebt; Insert: Partial<CustomerDebt>; Update: Partial<CustomerDebt>; Relationships: [] };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      user_role: Role;
      unit_type: UnitType;
      order_status: OrderStatus;
    };
    CompositeTypes: Record<string, never>;
  };
};
