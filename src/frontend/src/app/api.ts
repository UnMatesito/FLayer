const API_BASE = '/api';

export interface FileInfo {
  filename: string;
  url: string;
}

export interface CustomerData {
  name: string;
  email: string;
  phone?: string;
}

export interface OrderPayload {
  customer: CustomerData;
  work_type: 'impresion_3d' | 'diseno_3d';
  description: string;
  files?: FileInfo[];
}

export interface InternalOrderPayload extends OrderPayload {
  skip_client_notification?: boolean;
  status?: string;
}

export interface Order {
  id: string;
  customer_id: string;
  work_type: string;
  description: string;
  files: { filename: string; url: string }[] | null;
  status: string;
  client_notified: boolean;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
}

export interface LoginResponse {
  user: User;
  otp_required: boolean;
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
    credentials: 'include',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Login failed');
  }
  return res.json();
}

export async function verifyOtp(code: string): Promise<void> {
  const res = await fetch(`${API_BASE}/auth/otp/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
    credentials: 'include',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'OTP verification failed');
  }
}

export async function sendOtp(): Promise<void> {
  const res = await fetch(`${API_BASE}/auth/otp/send`, {
    method: 'POST',
    credentials: 'include',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to send OTP');
  }
}

export async function fetchMe(): Promise<User> {
  const res = await fetch(`${API_BASE}/auth/me`, {
    credentials: 'include',
  });
  if (!res.ok) {
    throw new Error('Not authenticated');
  }
  return res.json();
}

export async function logout(): Promise<void> {
  await fetch(`${API_BASE}/auth/logout`, {
    method: 'POST',
    credentials: 'include',
  });
}

export async function createPublicOrder(
  payload: OrderPayload
): Promise<Order> {
  const res = await fetch(`${API_BASE}/public/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to create order');
  }
  return res.json();
}

export async function createInternalOrder(
  payload: InternalOrderPayload,
): Promise<Order> {
  const res = await fetch(`${API_BASE}/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    credentials: 'include',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to create order');
  }
  return res.json();
}

export async function fetchAllOrders(): Promise<Order[]> {
  const res = await fetch(`${API_BASE}/orders`, {
    credentials: 'include',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to fetch orders');
  }
  return res.json();
}

export interface OrderDetail extends Order {
  customer_name: string;
  customer_email: string;
}

export interface StatusChangeResponse {
  id: string;
  status: string;
}

export interface OrderStatus {
  id: string;
  name: string;
}

export async function fetchOrderDetail(orderId: string): Promise<OrderDetail> {
  const res = await fetch(`${API_BASE}/orders/${orderId}`, {
    credentials: 'include',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to fetch order detail');
  }
  return res.json();
}

export async function updateOrderStatus(
  orderId: string,
  status: string,
): Promise<StatusChangeResponse> {
  const res = await fetch(`${API_BASE}/orders/${orderId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
    credentials: 'include',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to update order status');
  }
  return res.json();
}

export async function fetchOrderStatuses(): Promise<OrderStatus[]> {
  const res = await fetch(`${API_BASE}/order-statuses`, {
    credentials: 'include',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to fetch order statuses');
  }
  return res.json();
}
