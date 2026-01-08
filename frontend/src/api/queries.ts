import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './client';
import { CreateOrderRequest, OrderStatus } from '../types/order';

// Query keys
export const orderKeys = {
  all: ['orders'] as const,
  lists: () => [...orderKeys.all, 'list'] as const,
  list: (accountId: string) => [...orderKeys.lists(), accountId] as const,
  details: () => [...orderKeys.all, 'detail'] as const,
  detail: (id: number) => [...orderKeys.details(), id] as const,
};

// Queries
export function useOrder(id: number) {
  return useQuery({
    queryKey: orderKeys.detail(id),
    queryFn: () => apiClient.getOrderById(id),
    enabled: !!id,
  });
}

export function useOrdersByAccount(accountId: string) {
  return useQuery({
    queryKey: orderKeys.list(accountId),
    queryFn: () => apiClient.getOrdersByAccount(accountId),
    enabled: !!accountId,
  });
}

// Mutations
export function useCreateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: CreateOrderRequest) => apiClient.createOrder(request),
    onSuccess: (data) => {
      // Invalidate and refetch orders list for the account
      queryClient.invalidateQueries({ queryKey: orderKeys.list(data.accountId) });
      // Add the new order to cache
      queryClient.setQueryData(orderKeys.detail(data.id), data);
    },
  });
}

export function useCancelOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => apiClient.cancelOrder(id),
    onSuccess: (data) => {
      // Update the order in cache
      queryClient.setQueryData(orderKeys.detail(data.id), data);
      // Invalidate the account's orders list
      queryClient.invalidateQueries({ queryKey: orderKeys.list(data.accountId) });
    },
  });
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: OrderStatus }) =>
      apiClient.updateOrderStatus(id, status),
    onSuccess: (data) => {
      // Update the order in cache
      queryClient.setQueryData(orderKeys.detail(data.id), data);
      // Invalidate the account's orders list
      queryClient.invalidateQueries({ queryKey: orderKeys.list(data.accountId) });
    },
  });
}

