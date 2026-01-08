import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CreateOrderRequest } from '../types/order';
import { useCreateOrder } from '../api/queries';

const orderItemSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  quantity: z.number().min(1, 'Quantity must be at least 1'),
  price: z.number().min(0.01, 'Price must be greater than 0'),
});

const createOrderSchema = z.object({
  accountId: z.string().min(1, 'Account ID is required'),
  items: z.array(orderItemSchema).min(1, 'At least one item is required'),
  shippingAddress: z.string().min(1, 'Shipping address is required'),
  paymentMethod: z.string().optional(),
});

export function OrderForm() {
  const createOrder = useCreateOrder();
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<CreateOrderRequest>({
    resolver: zodResolver(createOrderSchema),
    defaultValues: {
      accountId: '',
      items: [{ productId: '', quantity: 1, price: 0 }],
      shippingAddress: '',
      paymentMethod: '',
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  });

  const onSubmit = (data: CreateOrderRequest) => {
    createOrder.mutate(data, {
      onSuccess: () => {
        reset();
        alert('Order created successfully!');
      },
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      <div>
        <label htmlFor="accountId" className="block text-sm font-semibold text-gray-900 mb-2">
          Account ID <span className="text-red-500">*</span>
        </label>
        <input
          {...register('accountId')}
          type="text"
          id="accountId"
          className="mt-1 block w-full rounded-lg border-gray-300 shadow-wise focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 px-4 py-3 text-base transition-all"
          placeholder="acc-123"
        />
        {errors.accountId && (
          <p className="mt-2 text-sm text-red-600 flex items-center">
            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {errors.accountId.message}
          </p>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <label className="block text-sm font-semibold text-gray-900">
            Order Items <span className="text-red-500">*</span>
          </label>
          <button
            type="button"
            onClick={() => append({ productId: '', quantity: 1, price: 0 })}
            className="text-sm text-primary-600 hover:text-primary-700 font-semibold flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-primary-50 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add Item
          </button>
        </div>
        <div className="space-y-4">
          {fields.map((field, index) => (
            <div key={field.id} className="flex gap-4 items-start p-5 border-2 border-gray-200 rounded-xl bg-gray-50 hover:border-primary-300 transition-colors">
              <div className="flex-1">
                <label className="block text-xs font-semibold text-gray-700 mb-2">
                  Product ID
                </label>
                <input
                  {...register(`items.${index}.productId`)}
                  type="text"
                  className="block w-full rounded-lg border-gray-300 shadow-wise focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 px-3 py-2.5 text-sm transition-all bg-white"
                  placeholder="prod-123"
                />
                {errors.items?.[index]?.productId && (
                  <p className="mt-1.5 text-xs text-red-600 flex items-center">
                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {errors.items[index]?.productId?.message}
                  </p>
                )}
              </div>
              <div className="w-28">
                <label className="block text-xs font-semibold text-gray-700 mb-2">
                  Quantity
                </label>
                <input
                  {...register(`items.${index}.quantity`, { valueAsNumber: true })}
                  type="number"
                  min="1"
                  className="block w-full rounded-lg border-gray-300 shadow-wise focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 px-3 py-2.5 text-sm transition-all bg-white"
                />
                {errors.items?.[index]?.quantity && (
                  <p className="mt-1.5 text-xs text-red-600 flex items-center">
                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {errors.items[index]?.quantity?.message}
                  </p>
                )}
              </div>
              <div className="w-36">
                <label className="block text-xs font-semibold text-gray-700 mb-2">
                  Price ($)
                </label>
                <input
                  {...register(`items.${index}.price`, { valueAsNumber: true })}
                  type="number"
                  step="0.01"
                  min="0.01"
                  className="block w-full rounded-lg border-gray-300 shadow-wise focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 px-3 py-2.5 text-sm transition-all bg-white"
                />
                {errors.items?.[index]?.price && (
                  <p className="mt-1.5 text-xs text-red-600 flex items-center">
                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {errors.items[index]?.price?.message}
                  </p>
                )}
              </div>
              {fields.length > 1 && (
                <button
                  type="button"
                  onClick={() => remove(index)}
                  className="mt-8 text-gray-400 hover:text-red-600 transition-colors p-1 rounded-lg hover:bg-red-50"
                  title="Remove item"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>
        {errors.items && typeof errors.items === 'object' && 'message' in errors.items && (
          <p className="mt-2 text-sm text-red-600 flex items-center">
            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {errors.items.message}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="shippingAddress" className="block text-sm font-semibold text-gray-900 mb-2">
          Shipping Address <span className="text-red-500">*</span>
        </label>
        <textarea
          {...register('shippingAddress')}
          id="shippingAddress"
          rows={3}
          className="mt-1 block w-full rounded-lg border-gray-300 shadow-wise focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 px-4 py-3 text-base transition-all resize-none"
          placeholder="123 Main St, City, State 12345"
        />
        {errors.shippingAddress && (
          <p className="mt-2 text-sm text-red-600 flex items-center">
            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {errors.shippingAddress.message}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="paymentMethod" className="block text-sm font-semibold text-gray-900 mb-2">
          Payment Method ID <span className="text-gray-400 text-xs font-normal">(optional)</span>
        </label>
        <input
          {...register('paymentMethod')}
          type="text"
          id="paymentMethod"
          className="mt-1 block w-full rounded-lg border-gray-300 shadow-wise focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 px-4 py-3 text-base transition-all"
          placeholder="pmt-456"
        />
      </div>

      <div className="flex gap-4 pt-4">
        <button
          type="submit"
          disabled={createOrder.isPending}
          className="flex-1 bg-primary-600 text-white px-6 py-3.5 rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-base shadow-wise-md hover:shadow-wise-lg transition-all transform hover:-translate-y-0.5"
        >
          {createOrder.isPending ? (
            <span className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></div>
              Creating Order...
            </span>
          ) : (
            'Create Order'
          )}
        </button>
        <button
          type="button"
          onClick={() => reset()}
          className="px-6 py-3.5 border-2 border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 font-semibold text-base transition-all"
        >
          Reset
        </button>
      </div>

      {createOrder.isError && (
        <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-red-600 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <p className="text-sm text-red-800">
              <span className="font-semibold">Error:</span> {createOrder.error instanceof Error ? createOrder.error.message : 'Failed to create order'}
            </p>
          </div>
        </div>
      )}
    </form>
  );
}

