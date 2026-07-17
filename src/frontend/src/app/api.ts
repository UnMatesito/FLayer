const API_BASE = '/api';

export interface FilamentSettings {
  recommended_nozzle_temp_min?: number | null;
  recommended_nozzle_temp_max?: number | null;
  flow_ratio?: number | null;
  nozzle_temperature?: number | null;
  max_volumetric_speed?: number | null;
  pressure_advance?: number | null;
  nominal_diameter?: number | null;
  plate_temperature?: number | null;
}

export interface Filament {
  id: string;
  user_id: string;
  color_name: string;
  color_hex: string;
  brand: string;
  filament_type: string;
  weight_grams: number;
  price_per_kg: number;
  min_stock_warning_grams: number;
  settings?: FilamentSettings | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface FilamentCreate {
  color_name: string;
  color_hex: string;
  brand?: string;
  filament_type: string;
  weight_grams?: number;
  price_per_kg?: number;
  min_stock_warning_grams?: number;
  settings?: FilamentSettings | null;
}

export interface FilamentUpdate {
  color_name?: string;
  color_hex?: string;
  brand?: string;
  filament_type?: string;
  price_per_kg?: number;
  min_stock_warning_grams?: number;
  settings?: FilamentSettings | null;
  is_active?: boolean;
}

export interface FilamentAdjust {
  delta_grams: number;
  notes?: string;
}

export interface FilamentAdjustResponse {
  id: string;
  weight_grams: number;
  movement_id: string;
}

export interface Supply {
  id: string;
  user_id: string;
  name: string;
  quantity: number;
  unit: string;
  min_stock_warning: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SupplyCreate {
  name: string;
  quantity?: number;
  unit: string;
  min_stock_warning?: number;
}

export interface SupplyUpdate {
  name?: string;
  quantity?: number;
  unit?: string;
  min_stock_warning?: number;
  is_active?: boolean;
}

export interface StockMovement {
  id: string;
  filament_id: string;
  filament_color_name?: string | null;
  movement_type: 'consumption' | 'adjustment' | 'reversal';
  quantity_grams: number;
  order_id?: string | null;
  order_reference?: string | null;
  created_by_user_id: string;
  notes?: string | null;
  created_at: string;
}

export interface PaginatedStockMovements {
  items: StockMovement[];
  total: number;
  page: number;
  per_page: number;
}

export interface LowStockFilament {
  id: string;
  color_name: string;
  weight_grams: number;
  min_stock_warning_grams: number;
}

export interface LowStockSupply {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  min_stock_warning: number;
}

export interface LowStockResponse {
  filaments: LowStockFilament[];
  supplies: LowStockSupply[];
}

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
  filament_id?: string | null;
  grams_estimated?: number | null;
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
  filamentId?: string,
  grams?: number,
): Promise<StatusChangeResponse> {
  const body: Record<string, unknown> = { status };
  if (filamentId !== undefined) body.filament_id = filamentId;
  if (grams !== undefined) body.grams = grams;
  const res = await fetch(`${API_BASE}/orders/${orderId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    credentials: 'include',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to update order status');
  }
  return res.json();
}

export async function fetchFilaments(includeInactive = false): Promise<Filament[]> {
  const res = await fetch(`${API_BASE}/filaments?include_inactive=${includeInactive}`, {
    credentials: 'include',
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).detail || 'Failed to fetch filaments');
  return res.json();
}

export async function createFilament(payload: FilamentCreate): Promise<Filament> {
  const res = await fetch(`${API_BASE}/filaments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    credentials: 'include',
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).detail || 'Failed to create filament');
  return res.json();
}

export async function fetchFilament(id: string): Promise<Filament> {
  const res = await fetch(`${API_BASE}/filaments/${id}`, { credentials: 'include' });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).detail || 'Failed to fetch filament');
  return res.json();
}

export async function updateFilament(id: string, payload: FilamentUpdate): Promise<Filament> {
  const res = await fetch(`${API_BASE}/filaments/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    credentials: 'include',
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).detail || 'Failed to update filament');
  return res.json();
}

export async function adjustFilamentWeight(id: string, payload: FilamentAdjust): Promise<FilamentAdjustResponse> {
  const res = await fetch(`${API_BASE}/filaments/${id}/adjust`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    credentials: 'include',
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).detail || 'Failed to adjust weight');
  return res.json();
}

export async function fetchSupplies(includeInactive = false): Promise<Supply[]> {
  const res = await fetch(`${API_BASE}/supplies?include_inactive=${includeInactive}`, {
    credentials: 'include',
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).detail || 'Failed to fetch supplies');
  return res.json();
}

export async function createSupply(payload: SupplyCreate): Promise<Supply> {
  const res = await fetch(`${API_BASE}/supplies`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    credentials: 'include',
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).detail || 'Failed to create supply');
  return res.json();
}

export async function updateSupply(id: string, payload: SupplyUpdate): Promise<Supply> {
  const res = await fetch(`${API_BASE}/supplies/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    credentials: 'include',
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).detail || 'Failed to update supply');
  return res.json();
}

export async function fetchStockMovements(params?: {
  filament_id?: string;
  movement_type?: string;
  order_id?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
  per_page?: number;
}): Promise<PaginatedStockMovements> {
  const qs = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([k, v]) => { if (v !== undefined) qs.set(k, String(v)); });
  }
  const res = await fetch(`${API_BASE}/stock-movements?${qs}`, { credentials: 'include' });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).detail || 'Failed to fetch movements');
  return res.json();
}

export async function fetchLowStock(): Promise<LowStockResponse> {
  const res = await fetch(`${API_BASE}/stock/low-stock`, { credentials: 'include' });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).detail || 'Failed to fetch low stock');
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
