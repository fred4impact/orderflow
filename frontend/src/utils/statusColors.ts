import { OrderStatus } from '../types/order';

export function getStatusColor(status: OrderStatus): string {
  switch (status) {
    case OrderStatus.PLACED:
      return 'bg-blue-100 text-blue-800';
    case OrderStatus.PAID:
      return 'bg-green-100 text-green-800';
    case OrderStatus.PROCESSING:
      return 'bg-yellow-100 text-yellow-800';
    case OrderStatus.SHIPPED:
      return 'bg-purple-100 text-purple-800';
    case OrderStatus.COMPLETED:
      return 'bg-emerald-100 text-emerald-800';
    case OrderStatus.CANCELLED:
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

export function getStatusBadge(status: OrderStatus): string {
  switch (status) {
    case OrderStatus.PLACED:
      return '📦 Placed';
    case OrderStatus.PAID:
      return '💳 Paid';
    case OrderStatus.PROCESSING:
      return '⚙️ Processing';
    case OrderStatus.SHIPPED:
      return '🚚 Shipped';
    case OrderStatus.COMPLETED:
      return '✅ Completed';
    case OrderStatus.CANCELLED:
      return '❌ Cancelled';
    default:
      return status;
  }
}














