import { normalizeApiError } from './error-normalizer';

const API_BASE = '/api';

async function errorFromResponse(res: Response, fallback: string): Promise<Error> {
  const detail = await res.json().catch(() => ({ status: res.status, statusText: res.statusText }));
  return new Error(normalizeApiError(detail, fallback));
}

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
  filament_id?: string | null;
  filament_color_name?: string | null;
  supply_id?: string | null;
  supply_name?: string | null;
  movement_type: 'consumption' | 'adjustment' | 'reversal';
  quantity_grams?: number | null;
  quantity?: number | null;
  unit?: string | null;
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

export interface MovementItemOption {
  key: string;
  id: string;
  type: 'product' | 'filament' | 'supply';
  type_label: string;
  label: string;
}

export interface UnifiedMovement {
  id: string;
  source: 'product' | 'stock_movement';
  item_id: string;
  item_type: 'product' | 'filament' | 'supply';
  item_type_label: string;
  item_name: string;
  movement_type: string;
  quantity: number;
  unit: string;
  order_id: string | null;
  created_by_user_id: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface PaginatedUnifiedMovements {
  items: UnifiedMovement[];
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

export interface LowStockProduct {
  id: string;
  name: string;
  stock_quantity: number;
  threshold: number;
}

export interface LowStockItem {
  id: string;
  type: 'product' | 'filament' | 'supply';
  label: string;
  current_stock: number;
  threshold: number;
  unit: string;
  href: string;
}

export interface LowStockResponse {
  filaments: LowStockFilament[];
  supplies: LowStockSupply[];
  products: LowStockProduct[];
  items: LowStockItem[];
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

export type OrderCategory = 'print' | 'product';

export type DeliveryType = 'Presencial acordado' | 'Delivery';

export const DELIVERY_TYPE_OPTIONS: { value: DeliveryType; label: string }[] = [
  { value: 'Presencial acordado', label: 'Presencial acordado' },
  { value: 'Delivery', label: 'Delivery' },
];

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
  order_category: OrderCategory;
  needs_3d_printing: boolean;
  needs_3d_modelling: boolean;
  dimensions?: string | null;
  type_of_delivery: DeliveryType;
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
  customer_name?: string | null;
  work_type: string;
  description: string;
  files: { filename: string; url: string }[] | null;
  status: string;
  client_notified: boolean;
  order_category: OrderCategory;
  needs_3d_printing: boolean;
  needs_3d_modelling: boolean;
  dimensions?: string | null;
  type_of_delivery: DeliveryType;
  delivery_embalaje?: number | null;
  delivery_precio_envio?: number | null;
  filament_id?: string | null;
  grams_estimated?: number | null;
  fixed_product_id?: string | null;
  line_items?: LineItem[] | null;
  total?: number | null;
  has_budget?: boolean;
  created_at: string;
  updated_at: string;
}

export type Currency = 'ARS' | 'USD' | 'EUR' | 'BRL' | 'GBP' | 'MXN';

export const CURRENCY_OPTIONS: { value: Currency; label: string; symbol: string }[] = [
  { value: 'ARS', label: 'ARS ($)', symbol: '$' },
  { value: 'USD', label: 'USD (US$)', symbol: 'US$' },
  { value: 'EUR', label: 'EUR (€)', symbol: '€' },
  { value: 'BRL', label: 'BRL (R$)', symbol: 'R$' },
  { value: 'GBP', label: 'GBP (£)', symbol: '£' },
  { value: 'MXN', label: 'MXN (MX$)', symbol: 'MX$' },
];

export function currencySymbol(currency: Currency): string {
  return CURRENCY_OPTIONS.find((c) => c.value === currency)?.symbol ?? '$';
}

export const MACHINE_DEFAULT_FALLBACKS: Record<Currency, { lifespan_hours: number; spare_parts_cost: number }> = {
  ARS: { lifespan_hours: 4320, spare_parts_cost: 150000 },
  USD: { lifespan_hours: 5000, spare_parts_cost: 400 },
  EUR: { lifespan_hours: 5000, spare_parts_cost: 400 },
  BRL: { lifespan_hours: 5000, spare_parts_cost: 2200 },
  GBP: { lifespan_hours: 5000, spare_parts_cost: 320 },
  MXN: { lifespan_hours: 5000, spare_parts_cost: 8000 },
};

export interface User {
  id: string;
  email: string;
  name: string;
  business_name: string | null;
  primary_color: string | null;
  logo_url: string | null;
  favicon_url: string | null;
  currency: Currency;
}

export interface ProfileUpdate {
  name?: string;
  business_name?: string | null;
  primary_color?: string | null;
  currency?: Currency;
}

export interface LoginResponse {
  user: User;
  otp_required: boolean;
}

export async function updateProfile(payload: ProfileUpdate): Promise<User> {
  const res = await fetch(`${API_BASE}/auth/me`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    credentials: 'include',
  });
  if (!res.ok) {
    throw await errorFromResponse(res, 'No se pudo guardar el perfil');
  }
  return res.json();
}

export async function uploadLogo(file: File): Promise<User> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${API_BASE}/auth/me/logo`, {
    method: 'POST',
    body: formData,
    credentials: 'include',
  });
  if (!res.ok) {
    throw await errorFromResponse(res, 'No se pudo subir el logo');
  }
  return res.json();
}

export async function removeLogo(): Promise<User> {
  const res = await fetch(`${API_BASE}/auth/me/logo`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!res.ok) {
    throw await errorFromResponse(res, 'No se pudo quitar el logo');
  }
  return res.json();
}

export async function uploadFavicon(file: File): Promise<User> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${API_BASE}/auth/me/favicon`, {
    method: 'POST',
    body: formData,
    credentials: 'include',
  });
  if (!res.ok) {
    throw await errorFromResponse(res, 'No se pudo subir el favicon');
  }
  return res.json();
}

export async function removeFavicon(): Promise<User> {
  const res = await fetch(`${API_BASE}/auth/me/favicon`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!res.ok) {
    throw await errorFromResponse(res, 'No se pudo quitar el favicon');
  }
  return res.json();
}

export interface BudgetParameters {
  currency: Currency;
  electricity_price_kwh: number;
  error_margin_percent: number;
  is_default: boolean;
}

export interface BudgetParametersBundle {
  parameters: Record<Currency, BudgetParameters>;
}

export interface BudgetParametersUpdate {
  electricity_price_kwh: number;
  error_margin_percent: number;
}

export async function fetchBudgetParameters(): Promise<BudgetParametersBundle> {
  const res = await fetch(`${API_BASE}/budget-parameters`, { credentials: 'include' });
  return handleResponse<BudgetParametersBundle>(res);
}

export async function updateBudgetParameters(
  currency: Currency,
  payload: BudgetParametersUpdate,
): Promise<BudgetParameters> {
  const res = await fetch(`${API_BASE}/budget-parameters/${currency}`, {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse<BudgetParameters>(res);
}

export async function updateUserCurrency(currency: Currency): Promise<User> {
  return updateProfile({ currency });
}

// Dashboard summary
export interface DashboardKpis {
  orders_month: number;
  revenue_month: number;
  pending_orders: number;
  printing_orders: number;
  budgeted_value_quoting: number;
  low_stock_filaments: number;
  low_stock_supplies: number;
  low_stock_products: number;
  printers_active: number;
  maintenance_month: number;
}

export interface ActivityPoint {
  date: string;
  orders: number;
  revenue: number;
}

export interface RecentOrderItem {
  id: string;
  short_id: string;
  customer_name: string;
  work_type: string;
  status: string;
  final_value: number;
  created_at: string;
}

export interface PrinterBayItem {
  id: string;
  name: string;
  brand: string | null;
  model: string | null;
  maintenance_month: number;
}

export interface DashboardSummary {
  as_of: string;
  kpis: DashboardKpis;
  activity: ActivityPoint[];
  recent_orders: RecentOrderItem[];
  low_stock: LowStockResponse;
  printers: PrinterBayItem[];
}

export async function fetchDashboardSummary(): Promise<DashboardSummary> {
  const res = await fetch(`${API_BASE}/dashboard/summary`, { credentials: 'include' });
  if (!res.ok) throw await errorFromResponse(res, 'No se pudo cargar la vista general');
  return res.json();
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
    credentials: 'include',
  });
  if (!res.ok) {
    throw await errorFromResponse(res, 'No se pudo iniciar sesión');
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
    throw await errorFromResponse(res, 'No se pudo verificar el código');
  }
}

export async function sendOtp(): Promise<void> {
  const res = await fetch(`${API_BASE}/auth/otp/send`, {
    method: 'POST',
    credentials: 'include',
  });
  if (!res.ok) {
    throw await errorFromResponse(res, 'No se pudo enviar el código');
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
    throw await errorFromResponse(res, 'No se pudo crear el pedido');
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
    throw await errorFromResponse(res, 'No se pudo crear el pedido');
  }
  return res.json();
}

export async function fetchAllOrders(): Promise<Order[]> {
  const res = await fetch(`${API_BASE}/orders`, {
    credentials: 'include',
  });
  if (!res.ok) {
    throw await errorFromResponse(res, 'No se pudieron cargar los pedidos');
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
    throw await errorFromResponse(res, 'No se pudo cargar el pedido');
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
    throw await errorFromResponse(res, 'No se pudo cambiar el estado');
  }
  return res.json();
}

export interface DeliveryCostPayload {
  embalaje: number;
  precio_envio: number;
}

export async function updateDeliveryCost(
  orderId: string,
  payload: DeliveryCostPayload,
): Promise<OrderDetail> {
  const res = await fetch(`${API_BASE}/orders/${orderId}/delivery-cost`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    credentials: 'include',
  });
  if (!res.ok) {
    throw await errorFromResponse(res, 'No se pudo guardar el costo de entrega');
  }
  return res.json();
}

export async function fetchFilaments(includeInactive = false): Promise<Filament[]> {
  const res = await fetch(`${API_BASE}/filaments?include_inactive=${includeInactive}`, {
    credentials: 'include',
  });
  if (!res.ok) throw await errorFromResponse(res, 'No se pudieron cargar los filamentos');
  return res.json();
}

export async function createFilament(payload: FilamentCreate): Promise<Filament> {
  const res = await fetch(`${API_BASE}/filaments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    credentials: 'include',
  });
  if (!res.ok) throw await errorFromResponse(res, 'No se pudo crear el filamento');
  return res.json();
}

export async function fetchFilament(id: string): Promise<Filament> {
  const res = await fetch(`${API_BASE}/filaments/${id}`, { credentials: 'include' });
  if (!res.ok) throw await errorFromResponse(res, 'No se pudo cargar el filamento');
  return res.json();
}

export async function updateFilament(id: string, payload: FilamentUpdate): Promise<Filament> {
  const res = await fetch(`${API_BASE}/filaments/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    credentials: 'include',
  });
  if (!res.ok) throw await errorFromResponse(res, 'No se pudo actualizar el filamento');
  return res.json();
}

export async function adjustFilamentWeight(id: string, payload: FilamentAdjust): Promise<FilamentAdjustResponse> {
  const res = await fetch(`${API_BASE}/filaments/${id}/adjust`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    credentials: 'include',
  });
  if (!res.ok) throw await errorFromResponse(res, 'No se pudo ajustar el peso');
  return res.json();
}

export async function fetchSupplies(includeInactive = false): Promise<Supply[]> {
  const res = await fetch(`${API_BASE}/supplies?include_inactive=${includeInactive}`, {
    credentials: 'include',
  });
  if (!res.ok) throw await errorFromResponse(res, 'No se pudieron cargar los insumos');
  return res.json();
}

export async function createSupply(payload: SupplyCreate): Promise<Supply> {
  const res = await fetch(`${API_BASE}/supplies`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    credentials: 'include',
  });
  if (!res.ok) throw await errorFromResponse(res, 'No se pudo crear el insumo');
  return res.json();
}

export async function updateSupply(id: string, payload: SupplyUpdate): Promise<Supply> {
  const res = await fetch(`${API_BASE}/supplies/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    credentials: 'include',
  });
  if (!res.ok) throw await errorFromResponse(res, 'No se pudo actualizar el insumo');
  return res.json();
}

export interface SupplyAdjust {
  delta: number;
  notes?: string;
}

export interface SupplyAdjustResult {
  id: string;
  quantity: number;
  movement_id: string;
}

export async function adjustSupply(id: string, payload: SupplyAdjust): Promise<SupplyAdjustResult> {
  const res = await fetch(`${API_BASE}/supplies/${id}/adjust`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    credentials: 'include',
  });
  if (!res.ok) throw await errorFromResponse(res, 'No se pudo ajustar el insumo');
  return res.json();
}

export async function fetchStockMovements(params?: {
  filament_id?: string;
  supply_id?: string;
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
  if (!res.ok) throw await errorFromResponse(res, 'No se pudo cargar el historial');
  return res.json();
}

export async function fetchMovementItems(q?: string): Promise<MovementItemOption[]> {
  const qs = q ? `?q=${encodeURIComponent(q)}` : '';
  const res = await fetch(`${API_BASE}/stock/movement-items${qs}`, { credentials: 'include' });
  if (!res.ok) throw await errorFromResponse(res, 'No se pudieron cargar los elementos del historial');
  return res.json();
}

export async function fetchUnifiedMovements(params?: {
  item_keys?: string[];
  movement_type?: string;
  order_id?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
  per_page?: number;
}): Promise<PaginatedUnifiedMovements> {
  const qs = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (Array.isArray(v)) v.forEach((item) => qs.append(k, item));
      else if (v !== undefined) qs.set(k, String(v));
    });
  }
  const res = await fetch(`${API_BASE}/stock/movements/unified?${qs}`, { credentials: 'include' });
  if (!res.ok) throw await errorFromResponse(res, 'No se pudo cargar el historial');
  return res.json();
}

export async function fetchLowStock(): Promise<LowStockResponse> {
  const res = await fetch(`${API_BASE}/stock/low-stock`, { credentials: 'include' });
  if (!res.ok) throw await errorFromResponse(res, 'No se pudo cargar el stock bajo');
  return res.json();
}

export async function fetchOrderStatuses(): Promise<OrderStatus[]> {
  const res = await fetch(`${API_BASE}/order-statuses`, {
    credentials: 'include',
  });
  if (!res.ok) {
    throw await errorFromResponse(res, 'No se pudieron cargar los estados');
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
  if (!res.ok) throw await errorFromResponse(res, 'No se pudieron cargar los productos');
  return res.json();
}

export async function fetchProduct(id: string): Promise<Product> {
  const res = await fetch(`${API_BASE}/products/${id}`, { credentials: 'include' });
  if (!res.ok) throw await errorFromResponse(res, 'No se pudo cargar el producto');
  return res.json();
}

export async function createProduct(payload: ProductCreate): Promise<Product> {
  const res = await fetch(`${API_BASE}/products`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    credentials: 'include',
  });
  if (!res.ok) throw await errorFromResponse(res, 'No se pudo crear el producto');
  return res.json();
}

export async function updateProduct(id: string, payload: ProductUpdate): Promise<Product> {
  const res = await fetch(`${API_BASE}/products/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    credentials: 'include',
  });
  if (!res.ok) throw await errorFromResponse(res, 'No se pudo actualizar el producto');
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
  if (!res.ok) throw await errorFromResponse(res, 'No se pudo subir la imagen');
  return res.json();
}

export async function fetchProductStockMovements(id: string): Promise<ProductStockMovement[]> {
  const res = await fetch(`${API_BASE}/products/${id}/stock-movements`, {
    credentials: 'include',
  });
  if (!res.ok) throw await errorFromResponse(res, 'No se pudieron cargar los movimientos de stock');
  return res.json();
}

export async function adjustProductStock(id: string, payload: ProductStockAdjust): Promise<ProductStockAdjustResponse> {
  const res = await fetch(`${API_BASE}/products/${id}/adjust`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    credentials: 'include',
  });
  if (!res.ok) throw await errorFromResponse(res, 'No se pudo ajustar el stock');
  return res.json();
}

export async function deleteProduct(id: string): Promise<Product> {
  const res = await fetch(`${API_BASE}/products/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!res.ok) throw await errorFromResponse(res, 'No se pudo archivar el producto');
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

export type BudgetMarginType =
  | 'high_volume'
  | 'medium_volume'
  | 'wholesale'
  | 'intermediate'
  | 'retail'
  | 'keychain'
  | 'custom';

export const BUDGET_MARGIN_OPTIONS: Array<{
  value: BudgetMarginType;
  multiplier: number;
  label: string;
  reference: string;
}> = [
  { value: 'high_volume', multiplier: 2.0, label: '×2.0', reference: 'Alto volumen / descuento' },
  { value: 'medium_volume', multiplier: 2.5, label: '×2.5', reference: 'Volumen medio' },
  { value: 'wholesale', multiplier: 3.0, label: '×3.0', reference: 'Mayorista' },
  { value: 'intermediate', multiplier: 3.5, label: '×3.5', reference: 'Intermedio' },
  { value: 'retail', multiplier: 4.0, label: '×4.0', reference: 'Minorista' },
  { value: 'keychain', multiplier: 5.0, label: '×5.0', reference: 'Llaveros / piezas chicas' },
];

export interface BudgetCreate {
  currency: Currency | null;
  printer_id?: string | null;
  filament_items: FilamentItemInput[];
  manual_filament_cost?: number | null;
  manual_grams?: number | null;
  hours: number;
  minutes: number;
  margin_type: BudgetMarginType;
  margin_multiplier?: number | null;
  extra_costs?: number;
  assembly_cost?: number;
  sanding_cost?: number;
  painting_cost?: number;
  manual_price?: number | null;
  notes?: string;
}

export interface BudgetUpdate {
  currency?: Currency;
  printer_id?: string | null;
  filament_items?: FilamentItemInput[];
  manual_filament_cost?: number | null;
  manual_grams?: number | null;
  hours?: number;
  minutes?: number;
  margin_type?: BudgetMarginType;
  margin_multiplier?: number | null;
  extra_costs?: number;
  assembly_cost?: number;
  sanding_cost?: number;
  painting_cost?: number;
  manual_price?: number | null;
  notes?: string;
}

export interface BudgetResponse {
  id: string;
  order_id: string;
  version: number;
  currency: Currency;
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
  margin_type: BudgetMarginType;
  extra_costs: number;
  assembly_cost: number;
  sanding_cost: number;
  painting_cost: number;
  error_margin_percent: number;
  margin_multiplier: number;
  final_price: number;
  manual_price: number | null;
  filament_total: number;
  electricity_cost: number;
  amortization_cost: number;
  subtotal: number;
  subtotal_with_error: number;
  post_processing_total: number;
  total_before_margin: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    throw await errorFromResponse(res, 'No se pudo completar la operación');
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
    throw await errorFromResponse(res, 'No se pudieron cargar los productos');
  }
  return res.json();
}

export async function fetchStoreToken(): Promise<{ token: string; url: string }> {
  const res = await fetch(`${API_BASE}/store-token`, { credentials: 'include' });
  if (!res.ok) {
    throw await errorFromResponse(res, 'No se pudo cargar el link de tienda');
  }
  return res.json();
}

export async function regenerateStoreToken(): Promise<{ token: string; url: string }> {
  const res = await fetch(`${API_BASE}/store-token/regenerate`, {
    method: 'POST',
    credentials: 'include',
  });
  if (!res.ok) {
    throw await errorFromResponse(res, 'No se pudo regenerar el link de tienda');
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
  if (!res.ok) throw await errorFromResponse(res, 'No se pudieron cargar las impresoras');
  return res.json();
}

export async function fetchPrinter(id: string): Promise<Printer> {
  const res = await fetch(`${API_BASE}/printers/${id}`, { credentials: 'include' });
  if (!res.ok) throw await errorFromResponse(res, 'No se pudo cargar la impresora');
  return res.json();
}

export async function createPrinter(payload: PrinterCreate): Promise<Printer> {
  const res = await fetch(`${API_BASE}/printers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    credentials: 'include',
  });
  if (!res.ok) throw await errorFromResponse(res, 'No se pudo crear la impresora');
  return res.json();
}

export async function updatePrinter(id: string, payload: PrinterUpdate): Promise<Printer> {
  const res = await fetch(`${API_BASE}/printers/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    credentials: 'include',
  });
  if (!res.ok) throw await errorFromResponse(res, 'No se pudo actualizar la impresora');
  return res.json();
}

export async function deletePrinter(id: string): Promise<{ id: string; is_active: boolean }> {
  const res = await fetch(`${API_BASE}/printers/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!res.ok) throw await errorFromResponse(res, 'No se pudo archivar la impresora');
  return res.json();
}

export async function fetchPrinterMaintenance(id: string): Promise<MaintenanceRecord[]> {
  const res = await fetch(`${API_BASE}/printers/${id}/maintenance`, { credentials: 'include' });
  if (!res.ok) throw await errorFromResponse(res, 'No se pudo cargar el mantenimiento');
  return res.json();
}

export async function createPrinterMaintenance(id: string, payload: MaintenanceCreate): Promise<MaintenanceRecord> {
  const res = await fetch(`${API_BASE}/printers/${id}/maintenance`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    credentials: 'include',
  });
  if (!res.ok) throw await errorFromResponse(res, 'No se pudo crear el mantenimiento');
  return res.json();
}

export async function fetchPrinterCatalog(): Promise<PrinterCatalog> {
  const res = await fetch(`${API_BASE}/printers/catalog`, { credentials: 'include' });
  if (!res.ok) throw await errorFromResponse(res, 'No se pudo cargar el catálogo de impresoras');
  return res.json();
}
