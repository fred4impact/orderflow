import { OrderStatus } from '../types/order';
import { getStatusColor, getStatusBadge } from '../utils/statusColors';

interface StatusBadgeProps {
  status: OrderStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-semibold shadow-wise ${getStatusColor(
        status
      )}`}
    >
      {getStatusBadge(status)}
    </span>
  );
}

