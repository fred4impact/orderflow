export enum OrderStatus {
  PLACED = 'PLACED',
  PAID = 'PAID',
  PROCESSING = 'PROCESSING',
  SHIPPED = 'SHIPPED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export interface OrderItem {
  productId: string;
  quantity: number;
  price: number;
}

export interface Order {
  id: number;
  accountId: string;
  items: OrderItem[];
  totalAmount: number;
  shippingAddress: string;
  paymentId?: string;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOrderRequest {
  accountId: string;
  items: OrderItem[];
  shippingAddress: string;
  paymentMethod?: string;
}

export interface ErrorResponse {
  message: string;
  timestamp: string;
  path?: string;
}














