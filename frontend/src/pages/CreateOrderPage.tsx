import { OrderForm } from '../components/OrderForm';

export function CreateOrderPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl shadow-wise-lg p-8 md:p-12 border border-gray-100">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-3">Create New Order</h1>
            <p className="text-gray-600 text-lg">
              Fill in the details below to create a new order
            </p>
          </div>
          <OrderForm />
        </div>
      </div>
    </div>
  );
}

