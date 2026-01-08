import { Link, useLocation } from 'react-router-dom';

export function Navigation() {
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-8">
            <Link
              to="/"
              className="flex items-center text-xl font-semibold text-gray-900 hover:text-primary-600 transition-colors"
            >
              <span className="text-primary-600">Order</span>
              <span className="text-gray-700">Manager</span>
            </Link>
            <div className="hidden md:flex md:space-x-1">
              <Link
                to="/"
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive('/')
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                Home
              </Link>
              <Link
                to="/orders"
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive('/orders')
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                Orders
              </Link>
              <Link
                to="/orders/create"
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive('/orders/create')
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                Create Order
              </Link>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}

