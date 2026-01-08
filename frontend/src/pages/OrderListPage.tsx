import { useState } from 'react';
import { useOrdersByAccount } from '../api/queries';
import { OrderCard } from '../components/OrderCard';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';

export function OrderListPage() {
  const [accountId, setAccountId] = useState('');
  const [searchAccountId, setSearchAccountId] = useState('');

  const { data: orders, isLoading, error, refetch } = useOrdersByAccount(searchAccountId);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchAccountId(accountId);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl shadow-wise-lg p-8 md:p-12 mb-8 border border-gray-100">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Order List</h1>
          <p className="text-gray-600 text-lg mb-8">Search for orders by account ID</p>
          
          <form onSubmit={handleSearch} className="mb-6">
            <div className="flex gap-4">
              <input
                type="text"
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                placeholder="Enter Account ID (e.g., acc-123)"
                className="flex-1 rounded-lg border-2 border-gray-300 shadow-wise focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 px-4 py-3 text-base transition-all"
              />
              <button
                type="submit"
                className="px-8 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 font-semibold text-base shadow-wise-md hover:shadow-wise-lg transition-all transform hover:-translate-y-0.5"
              >
                Search Orders
              </button>
            </div>
          </form>
        </div>

        {!searchAccountId && (
          <div className="bg-primary-50 border-2 border-primary-200 rounded-xl p-6 mb-6">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-primary-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-primary-800 font-medium">Enter an Account ID to view orders</p>
            </div>
          </div>
        )}

        {isLoading && (
          <div className="bg-white rounded-2xl shadow-wise-lg p-12 border border-gray-100">
            <LoadingSpinner />
          </div>
        )}

        {error && (
          <div className="mb-6">
            <ErrorMessage
              message={error instanceof Error ? error.message : 'Failed to load orders'}
              onRetry={() => refetch()}
            />
          </div>
        )}

        {orders && orders.length === 0 && searchAccountId && (
          <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-6">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-yellow-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-yellow-800 font-medium">
                No orders found for account: <span className="font-semibold">{searchAccountId}</span>
              </p>
            </div>
          </div>
        )}

        {orders && orders.length > 0 && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl shadow-wise p-6 mb-6 border border-gray-100">
              <p className="text-base text-gray-700">
                Found <span className="font-bold text-primary-600 text-lg">{orders.length}</span> order{orders.length !== 1 ? 's' : ''} for account:{' '}
                <span className="font-semibold text-gray-900">{searchAccountId}</span>
              </p>
            </div>
            {orders.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

