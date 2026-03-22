export type OrderStatus = "new" | "preparing" | "ready" | "completed";
export type PaymentStatus = "unpaid" | "paid" | "voided" | "refunded";
export type PaymentMethod = "cash" | "qr" | "transfer";
export type UserRole = "cashier" | "kitchen" | "manager" | null;

export interface MenuItem {
  id: string;
  name: string;
  price: number;
  image: string;
}

export interface OrderItem {
  id: string;
  menuItemId: string;
  name: string;
  qty: number;
  price: number;
}

export interface Order {
  id: string;
  orderNumber: number;
  createdAt: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  totalAmount: number;
  items: OrderItem[];
}

export interface Inventory {
  potatoStock: number;
  openingPotatoStock: number;
  flavorStocks: Record<string, number>;
  openingFlavorStocks: Record<string, number>;
  thresholds: {
    potato: number;
    flavor: number;
  };
}
