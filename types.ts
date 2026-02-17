
export interface Category {
  id: string;
  name: string;
  icon?: string;
  description?: string;
}

export interface Product {
  id: string;
  category_id: string | null;
  name: string;
  description?: string;
  price: number;
  cost_price?: number;
  image_url?: string;
  is_active: boolean;
  stock?: StockItem; // Joined stock data
}

export interface StockItem {
  id: string;
  product_id: string;
  quantity: number;
  min_quantity: number;
  max_quantity?: number;
  unit?: string;
}

export type MenuType = 'tradicional' | 'desconto' | 'quantidade' | 'especial';

export interface Menu {
  id: string;
  name: string;
  description?: string;
  type: MenuType;
  discount_percent?: number;
  active: boolean;
  created_at?: string;
}

export interface MenuItem {
  id: string;
  menu_id: string;
  product_id?: string | null;
  price: number;
  custom_name?: string;
  custom_description?: string;
  product?: Product;
}

export type OrderStatus = 'Aberto' | 'Pago' | 'Cancelado';

export interface Order {
  id: string;
  client_name: string;
  client_phone?: string;
  status: OrderStatus;
  total: number;
  created_at?: string;
  updated_at?: string;
  order_items?: OrderItem[];
}

export interface OrderItem {
  id: string;
  order_id: string;
  menu_id?: string | null;
  menu_item_id?: string | null;
  product_name: string;
  price: number;
  quantity: number;
  menu_type?: string | null;
  menu_name?: string | null;
  created_at?: string;
}

export interface CartItem {
  menuItemId: string;
  menuId: string;
  productName: string;
  price: number;
  quantity: number;
  menuType: MenuType;
  menuName: string;
}
