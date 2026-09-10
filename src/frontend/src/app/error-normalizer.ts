export function normalizeApiError(error: unknown, fallback = 'Ocurrió un error'): string {
  const marginMessage = 'El margen de ganancia debe ser un número válido mayor a 0.';

  const fromUnknown = (value: unknown): string | null => {
    if (typeof value === 'string') return value.trim() || null;
    if (value instanceof TypeError && /fetch|network|failed/i.test(value.message)) {
      return 'No se pudo conectar con el servidor. Verificá tu conexión o reintentá.';
    }
    if (value instanceof Error) return fromUnknown(value.message);
    if (Array.isArray(value)) {
      const messages = value.map(fromUnknown).filter(Boolean) as string[];
      return messages.length ? messages.join(' ') : null;
    }
    if (value && typeof value === 'object') {
      const record = value as Record<string, unknown>;
      if (record.detail !== undefined) return fromUnknown(record.detail);
      if (record.msg !== undefined) {
        const loc = Array.isArray(record.loc) ? record.loc.join('.') : String(record.loc ?? '');
        if (/margin|margen|multiplier|ganancia/i.test(loc)) return marginMessage;
        return fromUnknown(record.msg);
      }
      if (record.message !== undefined) return fromUnknown(record.message);
      if (record.status === 503 || record.statusText === 'Service Unavailable') {
        return 'Servidor no disponible. Reintentá en unos segundos.';
      }
      return null;
    }
    return null;
  };

  const normalized = fromUnknown(error) ?? fallback;
  return normalized.includes('[object Object]') ? fallback : normalized;
}

export function normalizeBudgetMarginError(error: unknown): string {
  const message = normalizeApiError(error, 'El margen de ganancia debe ser un número válido mayor a 0.');
  if (/margin|margen|multiplier|ganancia/i.test(message) || !message.trim()) {
    return 'El margen de ganancia debe ser un número válido mayor a 0.';
  }
  return message;
}
