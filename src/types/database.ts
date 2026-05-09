export type Role = 'customer' | 'admin' | 'warehouse' | 'delivery';
export type UnitType = 'carton' | 'dozen' | 'piece';
export type OrderStatus = 'new' | 'preparing' | 'ready_for_delivery' | 'with_delivery' | 'delivered' | 'rejected' | 'cancelled';
export type PaymentMethod = 'cash_on_delivery';
export type PermissionKey = 'reports' | 'products' | 'purchases' | 'categories' | 'orders' | 'customers' | 'users' | 'offers' | 'developer' | 'settings' | 'data';
export type DiscountType = 'percentage' | 'fixed';
export type PromotionType = 'product' | 'quantity' | 'bundle' | 'order_total';
export type CouponType = 'percent' | 'fixed';

export type Profile = {
  id: string;
  phone: string | null;
  full_name: string | null;
  role: Role;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  app_permissions?: PermissionKey[] | null;
  created_at: string;
};

export type Category = {
  id: string;
  name: string;
  image_url?: string | null;
  sort_order: number;
  is_active?: boolean;
  created_at: string;
};

export type Subcategory = {
  id: string;
  category_id: string;
  name: string;
  sort_order: number;
  is_active?: boolean;
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
  discount_type?: 'none' | 'percent' | 'amount' | null;
  discount_value?: number | null;
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
  discount_amount: number | null;
  delivery_fee: number | null;
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

export type PurchaseReturn = {
  id: string;
  supplier_name: string | null;
  total_amount: number;
  created_by: string | null;
  created_at: string;
  purchase_return_items?: PurchaseReturnItem[];
};

export type PurchaseReturnItem = {
  id: string;
  return_id: string;
  product_id: string;
  quantity: number;
  purchase_price: number;
  line_total: number;
};

export type Promotion = {
  id: string;
  title: string;
  promotion_type: PromotionType;
  product_id: string | null;
  product_ids: string[] | null;
  min_quantity: number | null;
  min_order_amount: number | null;
  discount_type: DiscountType;
  discount_value: number;
  starts_at: string;
  ends_at: string;
  is_active: boolean;
  created_at: string;
  products?: Pick<Product, 'id' | 'name' | 'price' | 'image_1_url' | 'unit_type'> | null;
};

export type AppAnnouncement = {
  id: string;
  title: string;
  body: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type AppSetting = {
  key: string;
  value: unknown;
  description: string | null;
  updated_by: string | null;
  updated_at: string;
};

export type DeveloperReport = {
  id: string;
  title: string;
  description: string | null;
  report_type: 'accounts' | 'customers' | 'orders' | 'products' | 'custom';
  config: Record<string, unknown>;
  allowed_permissions: PermissionKey[] | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
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

export type CustomerReservation = {
  id: string;
  customer_id: string;
  reserved_by: string | null;
  note: string | null;
  created_at: string;
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

export type PushSubscriptionRow = {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  user_agent: string | null;
  created_at: string;
  updated_at: string;
};

export type OrderStatusHistory = {
  id: string;
  order_id: string;
  status: OrderStatus;
  changed_by: string | null;
  created_at: string;
  profiles?: Pick<Profile, 'full_name' | 'role'> | null;
};

export type Coupon = {
  id: string;
  code: string;
  type: CouponType;
  value: number;
  min_order: number;
  max_uses: number | null;
  used_count: number;
  starts_at: string | null;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
};

export type ProductReview = {
  id: string;
  product_id: string;
  user_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  profiles?: Pick<Profile, 'full_name' | 'phone'> | null;
  products?: Pick<Product, 'id' | 'name'> | null;
};

export type Wishlist = {
  id: string;
  user_id: string;
  product_id: string;
  created_at: string;
  products?: Product | null;
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
      push_subscriptions: { Row: PushSubscriptionRow; Insert: Partial<PushSubscriptionRow>; Update: Partial<PushSubscriptionRow>; Relationships: [] };
      order_status_history: { Row: OrderStatusHistory; Insert: Partial<OrderStatusHistory>; Update: Partial<OrderStatusHistory>; Relationships: [] };
      purchase_invoices: { Row: PurchaseInvoice; Insert: Partial<PurchaseInvoice>; Update: Partial<PurchaseInvoice>; Relationships: [] };
      purchase_invoice_items: { Row: PurchaseInvoiceItem; Insert: Partial<PurchaseInvoiceItem>; Update: Partial<PurchaseInvoiceItem>; Relationships: [] };
      purchase_returns: { Row: PurchaseReturn; Insert: Partial<PurchaseReturn>; Update: Partial<PurchaseReturn>; Relationships: [] };
      purchase_return_items: { Row: PurchaseReturnItem; Insert: Partial<PurchaseReturnItem>; Update: Partial<PurchaseReturnItem>; Relationships: [] };
      promotions: { Row: Promotion; Insert: Partial<Promotion>; Update: Partial<Promotion>; Relationships: [] };
      app_announcements: { Row: AppAnnouncement; Insert: Partial<AppAnnouncement>; Update: Partial<AppAnnouncement>; Relationships: [] };
      app_settings: { Row: AppSetting; Insert: Partial<AppSetting>; Update: Partial<AppSetting>; Relationships: [] };
      developer_reports: { Row: DeveloperReport; Insert: Partial<DeveloperReport>; Update: Partial<DeveloperReport>; Relationships: [] };
      customer_debts: { Row: CustomerDebt; Insert: Partial<CustomerDebt>; Update: Partial<CustomerDebt>; Relationships: [] };
      customer_reservations: { Row: CustomerReservation; Insert: Partial<CustomerReservation>; Update: Partial<CustomerReservation>; Relationships: [] };
      coupons: { Row: Coupon; Insert: Partial<Coupon>; Update: Partial<Coupon>; Relationships: [] };
      product_reviews: { Row: ProductReview; Insert: Partial<ProductReview>; Update: Partial<ProductReview>; Relationships: [] };
      wishlists: { Row: Wishlist; Insert: Partial<Wishlist>; Update: Partial<Wishlist>; Relationships: [] };
    };
    Views: Record<string, never>;
    Functions: {
      admin_change_order_status: {
        Args: { order_id_input: string; status_input: OrderStatus; actor_id_input: string | null };
        Returns: boolean;
      };
      admin_create_staff_user: {
        Args: {
          phone_input: string;
          password_input: string;
          full_name_input: string;
          role_input: Role;
          permissions_input: PermissionKey[];
        };
        Returns: Profile;
      };
      admin_create_customer_user: {
        Args: {
          phone_input: string;
          password_input: string;
          full_name_input: string;
          address_input: string | null;
        };
        Returns: Profile;
      };
      customer_create_order: {
        Args: {
          notes_input: string | null;
          items_input: Array<{ product_id: string; quantity: number }>;
        };
        Returns: string;
      };
      process_purchase_invoice: {
        Args: {
          items: Array<{ product_id: string; quantity: number; purchase_price: number }>;
          supplier: string | null;
          notes: string | null;
        };
        Returns: string;
      };
      process_purchase_return: {
        Args: {
          items: Array<{ product_id: string; quantity: number; purchase_price: number }>;
          supplier: string | null;
          notes: string | null;
        };
        Returns: string;
      };
    };
    Enums: {
      user_role: Role;
      unit_type: UnitType;
      order_status: OrderStatus;
    };
    CompositeTypes: Record<string, never>;
  };
};
