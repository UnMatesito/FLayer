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

export type WorkType = 'impresion_3d' | 'diseno_3d' | 'product';

export interface LineItem {
  product_id: string;
  name: string;
  quantity: number;
  unit_price: number;
}

export interface OrderPayload {
  customer: CustomerData;
  work_type: WorkType;
  description: string;
  token?: string;
  files?: FileInfo[];
  line_items?: LineItem[];
}

export interface InternalOrderPayload extends OrderPayload {
  skip_client_notification?: boolean;
  status?: string;
  fixed_product_id?: string;
  total?: number;
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
  fixed_product_id?: string | null;
  line_items?: LineItem[] | null;
  total?: number | null;
  has_budget?: boolean;
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

// Product types
export interface Product {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  price: number;
  stock_quantity: number;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductCreate {
  name: string;
  price: number;
  description?: string | null;
  stock_quantity?: number;
}

export interface ProductUpdate {
  name?: string;
  price?: number;
  description?: string | null;
  stock_quantity?: number;
  is_active?: boolean;
}

export interface ProductStockMovement {
  id: string;
  product_id: string;
  movement_type: string;
  quantity: number;
  order_id: string | null;
  notes: string | null;
  created_at: string;
}

export interface ProductStockAdjust {
  delta_quantity: number;
  notes?: string | null;
}

export interface ProductStockAdjustResponse {
  id: string;
  stock_quantity: number;
  movement_id: string;
}

export async function fetchProducts(showInactive = false): Promise<Product[]> {
  const res = await fetch(`${API_BASE}/products?show_inactive=${showInactive}`, {
    credentials: 'include',
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).detail || 'Failed to fetch products');
  return res.json();
}

export async function fetchProduct(id: string): Promise<Product> {
  const res = await fetch(`${API_BASE}/products/${id}`, { credentials: 'include' });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).detail || 'Failed to fetch product');
  return res.json();
}

export async function createProduct(payload: ProductCreate): Promise<Product> {
  const res = await fetch(`${API_BASE}/products`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    credentials: 'include',
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).detail || 'Failed to create product');
  return res.json();
}

export async function updateProduct(id: string, payload: ProductUpdate): Promise<Product> {
  const res = await fetch(`${API_BASE}/products/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    credentials: 'include',
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).detail || 'Failed to update product');
  return res.json();
}

export async function uploadProductImage(id: string, file: File): Promise<Product> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${API_BASE}/products/${id}/image`, {
    method: 'POST',
    body: formData,
    credentials: 'include',
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).detail || 'Failed to upload image');
  return res.json();
}

export async function fetchProductStockMovements(id: string): Promise<ProductStockMovement[]> {
  const res = await fetch(`${API_BASE}/products/${id}/stock-movements`, {
    credentials: 'include',
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).detail || 'Failed to fetch stock movements');
  return res.json();
}

export async function adjustProductStock(id: string, payload: ProductStockAdjust): Promise<ProductStockAdjustResponse> {
  const res = await fetch(`${API_BASE}/products/${id}/adjust`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    credentials: 'include',
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).detail || 'Failed to adjust stock');
  return res.json();
}

export async function deleteProduct(id: string): Promise<Product> {
  const res = await fetch(`${API_BASE}/products/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).detail || 'Failed to delete product');
  return res.json();
}

// Budget types
export interface FilamentItemInput {
  product_id?: string | null;
  product_name?: string | null;
  grams: number;
}

export interface FilamentItemResponse {
  product_id: string | null;
  product_name: string;
  sku: string;
  grams: number;
  price_per_kg: number;
  cost: number;
}

export interface BudgetCreate {
  currency: 'ARS' | 'USD';
  printer_id?: string | null;
  filament_items: FilamentItemInput[];
  manual_filament_cost?: number | null;
  manual_grams?: number | null;
  hours: number;
  minutes: number;
  margin_type: 'wholesale' | 'retail' | 'keychain';
  extra_costs?: number;
  manual_price?: number | null;
  notes?: string;
}

export interface BudgetUpdate {
  currency?: 'ARS' | 'USD';
  printer_id?: string | null;
  filament_items?: FilamentItemInput[];
  manual_filament_cost?: number | null;
  manual_grams?: number | null;
  hours?: number;
  minutes?: number;
  margin_type?: 'wholesale' | 'retail' | 'keychain';
  extra_costs?: number;
  manual_price?: number | null;
  notes?: string;
}

export interface BudgetResponse {
  id: string;
  order_id: string;
  version: number;
  currency: 'ARS' | 'USD';
  printer_id: string | null;
  printer_name: string | null;
  power_watts: number | null;
  lifespan_hours: number | null;
  spare_parts_cost: number | null;
  filament_items: FilamentItemResponse[];
  manual_filament_cost: number | null;
  manual_grams: number | null;
  hours: number;
  minutes: number;
  margin_type: 'wholesale' | 'retail' | 'keychain';
  extra_costs: number;
  error_margin_percent: number;
  margin_multiplier: number;
  final_price: number;
  manual_price: number | null;
  ml_price: number;
  filament_total: number;
  electricity_cost: number;
  amortization_cost: number;
  subtotal: number;
  subtotal_with_error: number;
  total_before_margin: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Request failed');
  }
  return res.json();
}

export async function fetchBudget(orderId: string): Promise<BudgetResponse> {
  const res = await fetch(`${API_BASE}/orders/${orderId}/budget`, { credentials: 'include' });
  return handleResponse<BudgetResponse>(res);
}

export async function createBudget(orderId: string, data: BudgetCreate): Promise<BudgetResponse> {
  const res = await fetch(`${API_BASE}/orders/${orderId}/budget`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse<BudgetResponse>(res);
}

export async function updateBudget(orderId: string, data: BudgetUpdate): Promise<BudgetResponse> {
  const res = await fetch(`${API_BASE}/orders/${orderId}/budget`, {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse<BudgetResponse>(res);
}

export async function previewBudget(orderId: string, data: BudgetCreate): Promise<BudgetResponse> {
  const res = await fetch(`${API_BASE}/orders/${orderId}/budget/preview`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse<BudgetResponse>(res);
}

export async function fetchPublicProducts(token?: string): Promise<Product[]> {
  const params = token ? `?token=${encodeURIComponent(token)}` : '';
  const res = await fetch(`${API_BASE}/public/products${params}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to fetch products');
  }
  return res.json();
}

export async function fetchStoreToken(): Promise<{ token: string; url: string }> {
  const res = await fetch(`${API_BASE}/store-token`, { credentials: 'include' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to fetch store token');
  }
  return res.json();
}

export async function regenerateStoreToken(): Promise<{ token: string; url: string }> {
  const res = await fetch(`${API_BASE}/store-token/regenerate`, {
    method: 'POST',
    credentials: 'include',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to regenerate store token');
  }
  return res.json();
}

// Printer types
export interface Printer {
  id: string;
  user_id: string;
  name: string;
  brand: string | null;
  model: string | null;
  nozzle_sizes: string[];
  power_watts: number | null;
  lifespan_hours: number | null;
  spare_parts_cost: number | null;
  image_url: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PrinterCreate {
  name: string;
  brand?: string | null;
  model?: string | null;
  nozzle_sizes?: string[];
  power_watts?: number | null;
  lifespan_hours?: number | null;
  spare_parts_cost?: number | null;
  image_url?: string | null;
  notes?: string | null;
}

export interface PrinterUpdate {
  name?: string;
  brand?: string | null;
  model?: string | null;
  nozzle_sizes?: string[];
  power_watts?: number | null;
  lifespan_hours?: number | null;
  spare_parts_cost?: number | null;
  image_url?: string | null;
  notes?: string | null;
}

export type MaintenanceType = 'calibration' | 'cleaning' | 'repair';

export interface MaintenanceRecord {
  id: string;
  printer_id: string;
  maintenance_type: MaintenanceType;
  maintenance_date: string;
  description: string;
  cost: number | null;
  created_at: string;
}

export interface MaintenanceCreate {
  maintenance_type: MaintenanceType;
  maintenance_date: string;
  description: string;
  cost?: number | null;
}

export interface PrinterCatalogBrand {
  brand: string;
  models: string[];
}

export interface PrinterCatalog {
  brands: PrinterCatalogBrand[];
}

export async function fetchPrinters(): Promise<Printer[]> {
  const res = await fetch(`${API_BASE}/printers`, { credentials: 'include' });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).detail || 'Failed to fetch printers');
  return res.json();
}

export async function fetchPrinter(id: string): Promise<Printer> {
  const res = await fetch(`${API_BASE}/printers/${id}`, { credentials: 'include' });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).detail || 'Failed to fetch printer');
  return res.json();
}

export async function createPrinter(payload: PrinterCreate): Promise<Printer> {
  const res = await fetch(`${API_BASE}/printers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    credentials: 'include',
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).detail || 'Failed to create printer');
  return res.json();
}

export async function updatePrinter(id: string, payload: PrinterUpdate): Promise<Printer> {
  const res = await fetch(`${API_BASE}/printers/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    credentials: 'include',
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).detail || 'Failed to update printer');
  return res.json();
}

export async function deletePrinter(id: string): Promise<{ id: string; is_active: boolean }> {
  const res = await fetch(`${API_BASE}/printers/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).detail || 'Failed to delete printer');
  return res.json();
}

export async function fetchPrinterMaintenance(id: string): Promise<MaintenanceRecord[]> {
  const res = await fetch(`${API_BASE}/printers/${id}/maintenance`, { credentials: 'include' });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).detail || 'Failed to fetch maintenance');
  return res.json();
}

export async function createPrinterMaintenance(id: string, payload: MaintenanceCreate): Promise<MaintenanceRecord> {
  const res = await fetch(`${API_BASE}/printers/${id}/maintenance`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    credentials: 'include',
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).detail || 'Failed to create maintenance');
  return res.json();
}

export async function fetchPrinterCatalog(): Promise<PrinterCatalog> {
  const res = await fetch(`${API_BASE}/printers/catalog`, { credentials: 'include' });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).detail || 'Failed to fetch catalog');
  return res.json();
}
