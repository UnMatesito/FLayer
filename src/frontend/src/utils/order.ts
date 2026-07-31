'use client';

export const PRINT_STATUS_TRANSITIONS: Record<string, string[]> = {
  new: ['quoting', 'cancelled'],
  quoting: ['printing', 'cancelled'],
  printing: ['ready', 'cancelled'],
  ready: ['delivered', 'cancelled'],
  delivered: [],
  cancelled: [],
};

export const PRODUCT_STATUS_TRANSITIONS: Record<string, string[]> = {
  new: ['ready', 'cancelled'],
  ready: ['delivered', 'cancelled'],
  delivered: [],
  cancelled: [],
};

export function getStatusTransitions(workType: string): Record<string, string[]> {
  return workType === 'product' ? PRODUCT_STATUS_TRANSITIONS : PRINT_STATUS_TRANSITIONS;
}

export function statusColor(status: string): 'info' | 'warning' | 'success' | 'error' | 'default' {
  switch (status) {
    case 'new': return 'info';
    case 'quoting': return 'warning';
    case 'printing': return 'info';
    case 'ready': return 'success';
    case 'delivered': return 'success';
    case 'cancelled': return 'error';
    default: return 'default';
  }
}

export function statusLabel(status: string): string {
  switch (status) {
    case 'new': return 'Nuevo';
    case 'quoting': return 'Presupuestando';
    case 'printing': return 'Imprimiendo';
    case 'ready': return 'Listo';
    case 'delivered': return 'Entregado';
    case 'cancelled': return 'Cancelado';
    default: return status;
  }
}

export function workTypeLabel(workType: string): string {
  switch (workType) {
    case 'impresion_3d': return 'Impresión 3D';
    case 'diseno_3d': return 'Diseño 3D';
    case 'product': return 'Producto';
    default: return workType;
  }
}

export interface StatusAction {
  label: string;
  targetStatus: string;
  color: 'primary' | 'error' | 'success';
}

export function getStatusActions(workType: string): Record<string, StatusAction[]> {
  if (workType === 'product') {
    return {
      new: [
        { label: 'Marcar como Listo', targetStatus: 'ready', color: 'success' },
        { label: 'Cancelar', targetStatus: 'cancelled', color: 'error' },
      ],
      ready: [
        { label: 'Marcar como Entregado', targetStatus: 'delivered', color: 'success' },
        { label: 'Cancelar', targetStatus: 'cancelled', color: 'error' },
      ],
      delivered: [],
      cancelled: [],
    };
  }
  return {
    new: [
      { label: 'Presupuestar', targetStatus: 'quoting', color: 'primary' },
      { label: 'Cancelar', targetStatus: 'cancelled', color: 'error' },
    ],
    quoting: [
      { label: 'Iniciar impresión', targetStatus: 'printing', color: 'primary' },
      { label: 'Cancelar', targetStatus: 'cancelled', color: 'error' },
    ],
    printing: [
      { label: 'Marcar como Listo', targetStatus: 'ready', color: 'success' },
      { label: 'Cancelar', targetStatus: 'cancelled', color: 'error' },
    ],
    ready: [
      { label: 'Marcar como Entregado', targetStatus: 'delivered', color: 'success' },
      { label: 'Cancelar', targetStatus: 'cancelled', color: 'error' },
    ],
    delivered: [],
    cancelled: [],
  };
}

export type WorkType = 'impresion_3d' | 'diseno_3d' | 'product';
