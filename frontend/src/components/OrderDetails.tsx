import { Order, OrderStatus } from '../types/order';
import { formatCurrency, formatDate } from '../utils/format';
import { StatusBadge } from './StatusBadge';
import { useCancelOrder, useUpdateOrderStatus } from '../api/queries';
import { useState } from 'react';

interface OrderDetailsProps {
  order: Order;
}

export function OrderDetails({ order }: OrderDetailsProps) {
  const cancelOrder = useCancelOrder();
  const updateStatus = useUpdateOrderStatus();
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus>(order.status);

  const canCancel = order.status !== OrderStatus.SHIPPED && order.status !== OrderStatus.COMPLETED && order.status !== OrderStatus.CANCELLED;

  const handleCancel = () => {
    if (window.confirm('Are you sure you want to cancel this order?')) {
      cancelOrder.mutate(order.id, {
        onSuccess: () => {
          alert('Order cancelled successfully!');
        },
      });
    }
  };

  const handleStatusUpdate = () => {
    updateStatus.mutate(
      { id: order.id, status: selectedStatus },
      {
        onSuccess: () => {
          alert('Order status updated successfully!');
        },
      }
    );
  };

  return (
    <div className="bg-white rounded-2xl shadow-wise-lg p-8 md:p-12 border border-gray-100">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between mb-8 pb-8 border-b-2 border-gray-100">
        <div className="mb-4 md:mb-0">
          <h2 className="text-4xl font-bold text-gray-900 mb-3">
            Order #{order.id}
          </h2>
          <StatusBadge status={order.status} />
        </div>
        <div className="text-left md:text-right">
          <p className="text-4xl font-bold text-primary-600 mb-1">
            {formatCurrency(order.totalAmount)}
          </p>
          <p className="text-sm text-gray-500">Total Amount</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-gray-50 rounded-xl p-5">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Account ID</h3>
          <p className="text-lg font-semibold text-gray-900">{order.accountId}</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-5">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Payment ID</h3>
          <p className="text-lg font-semibold text-gray-900">{order.paymentId || 'Not provided'}</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-5">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Created At</h3>
          <p className="text-lg font-semibold text-gray-900">{formatDate(order.createdAt)}</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-5">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Updated At</h3>
          <p className="text-lg font-semibold text-gray-900">{formatDate(order.updatedAt)}</p>
        </div>
        <div className="md:col-span-2 bg-gray-50 rounded-xl p-5">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Shipping Address</h3>
          <p className="text-lg font-semibold text-gray-900">{order.shippingAddress}</p>
        </div>
      </div>

      <div className="mb-8">
        <h3 className="text-2xl font-bold text-gray-900 mb-6">Order Items</h3>
        <div className="overflow-x-auto rounded-xl border-2 border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Product ID
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Quantity
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Unit Price
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Subtotal
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {order.items.map((item, index) => (
                <tr key={index} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-base font-medium text-gray-900">
                    {item.productId}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-base text-gray-700">
                    {item.quantity}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-base text-gray-700">
                    {formatCurrency(item.price)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-base font-semibold text-primary-600">
                    {formatCurrency(item.price * item.quantity)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="border-t-2 border-gray-100 pt-8 space-y-6">
        <div className="bg-primary-50 rounded-xl p-6 border-2 border-primary-200">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Update Order Status</h4>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <label className="text-sm font-semibold text-gray-700 whitespace-nowrap">Status:</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as OrderStatus)}
              className="flex-1 rounded-lg border-2 border-gray-300 shadow-wise focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 px-4 py-3 text-base font-medium bg-white"
            >
              {Object.values(OrderStatus).map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
            <button
              onClick={handleStatusUpdate}
              disabled={updateStatus.isPending || selectedStatus === order.status}
              className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-base shadow-wise-md hover:shadow-wise-lg transition-all transform hover:-translate-y-0.5 disabled:transform-none"
            >
              {updateStatus.isPending ? (
                <span className="flex items-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></div>
                  Updating...
                </span>
              ) : (
                'Update Status'
              )}
            </button>
          </div>
        </div>

        {canCancel && (
          <button
            onClick={handleCancel}
            disabled={cancelOrder.isPending}
            className="w-full sm:w-auto px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-base shadow-wise-md hover:shadow-wise-lg transition-all transform hover:-translate-y-0.5 disabled:transform-none"
          >
            {cancelOrder.isPending ? (
              <span className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></div>
                Cancelling...
              </span>
            ) : (
              'Cancel Order'
            )}
          </button>
        )}
      </div>
    </div>
  );
}

