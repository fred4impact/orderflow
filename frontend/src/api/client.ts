import axios, { AxiosError, AxiosInstance } from 'axios';
import { CreateOrderRequest, Order, OrderStatus } from '../types/order';

// Use environment variable or default to relative URL for production (nginx proxy)
// In development, Vite proxy handles /api -> localhost:8080
// In production (Docker), nginx proxy handles /api -> order-service:8080
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor for future auth token
    this.client.interceptors.request.use(
      (config) => {
        // Add auth token here when implemented
        // const token = localStorage.getItem('token');
        // if (token) {
        //   config.headers.Authorization = `Bearer ${token}`;
        // }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response) {
          // Server responded with error
          const message = (error.response.data as { message?: string })?.message || error.message;
          return Promise.reject(new Error(message));
        } else if (error.request) {
          // Request made but no response
          return Promise.reject(new Error('Network error. Please check your connection.'));
        } else {
          // Something else happened
          return Promise.reject(error);
        }
      }
    );
  }

  async createOrder(request: CreateOrderRequest): Promise<Order> {
    const response = await this.client.post<Order>('/orders', request);
    return response.data;
  }

  async getOrderById(id: number): Promise<Order> {
    const response = await this.client.get<Order>(`/orders/${id}`);
    return response.data;
  }

  async getOrdersByAccount(accountId: string): Promise<Order[]> {
    const response = await this.client.get<Order[]>(`/orders/account/${accountId}`);
    return response.data;
  }

  async cancelOrder(id: number): Promise<Order> {
    const response = await this.client.post<Order>(`/orders/${id}/cancel`);
    return response.data;
  }

  async updateOrderStatus(id: number, status: OrderStatus): Promise<Order> {
    const response = await this.client.put<Order>(`/orders/${id}/status`, null, {
      params: { status },
    });
    return response.data;
  }
}

export const apiClient = new ApiClient();

