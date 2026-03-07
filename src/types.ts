export interface User {
  id: number;
  name: string;
  email: string;
  role: 'super_admin' | 'admin' | 'staff';
}

export interface Item {
  id: number;
  item_code: string;
  name: string;
  category: string;
  uom: string;
  cost_price: number;
  retail_price: number;
  initial_count: number;
  current_stock: number;
  total_in?: number;
  total_out?: number;
  created_at: string;
}

export interface Transaction {
  id: number;
  item_id: number;
  item_name?: string;
  item_code?: string;
  type: 'IN' | 'OUT';
  quantity: number;
  particulars: string;
  cost_price?: number;
  retail_price?: number;
  date: string;
}
