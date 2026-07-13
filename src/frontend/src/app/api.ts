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
  token: string
): Promise<Order> {
  const res = await fetch(`${API_BASE}/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to create order');
  }
  return res.json();
}

export async function fetchActiveOrders(
  token: string
): Promise<Order[]> {
  const res = await fetch(`${API_BASE}/orders?status=active`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to fetch orders');
  }
  return res.json();
}
