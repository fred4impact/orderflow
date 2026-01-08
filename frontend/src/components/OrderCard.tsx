import { Link } from 'react-router-dom';
import { Order } from '../types/order';
import { formatCurrency, formatDate } from '../utils/format';
import { StatusBadge } from './StatusBadge';

interface OrderCardProps {
  order: Order;
}

export function OrderCard({ order }: OrderCardProps) {
  return (
    <Link
      to={`/orders/${order.id}`}
      className="block bg-white rounded-xl shadow-wise hover:shadow-wise-lg transition-all duration-200 p-6 border border-gray-100 hover:border-primary-200 group"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-3">
            <h3 className="text-lg font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">
              Order #{order.id}
            </h3>
            <StatusBadge status={order.status} />
          </div>
          <div className="space-y-1.5 mb-4">
            <p className="text-sm text-gray-600">
              Account: <span className="font-medium text-gray-900">{order.accountId}</span>
            </p>
            <p className="text-sm text-gray-600">
              Items: <span className="font-medium text-gray-900">{order.items.length} item{order.items.length !== 1 ? 's' : ''}</span>
            </p>
            <p className="text-sm text-gray-500">
              {formatDate(order.createdAt)}
            </p>
          </div>
        </div>
        <div className="text-right ml-4">
          <p className="text-3xl font-bold text-primary-600 mb-1">
            {formatCurrency(order.totalAmount)}
          </p>
          <p className="text-xs text-gray-500">Total</p>
        </div>
      </div>
      <div className="mt-4 pt-4 border-t border-gray-100 flex items-center text-sm text-primary-600 group-hover:text-primary-700">
        <span className="font-medium">View details</span>
        <svg className="w-4 h-4 ml-2 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </Link>
  );
}

