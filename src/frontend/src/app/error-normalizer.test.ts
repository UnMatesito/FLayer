import { describe, expect, it } from 'vitest';
import { normalizeApiError, normalizeBudgetMarginError } from './error-normalizer';

describe('normalizeApiError', () => {
  it('formats common API and thrown error shapes without object serialization', () => {
    const cases: unknown[] = [
      'Error legible',
      new Error('Falló la operación'),
      { detail: 'Detalle del backend' },
      { detail: [{ loc: ['body', 'name'], msg: 'Field required', type: 'missing' }] },
      [{ msg: 'Lista inválida' }],
      { arbitrary: { nested: true } },
      new TypeError('fetch failed'),
      undefined,
    ];

    for (const item of cases) {
      expect(normalizeApiError(item, 'Mensaje seguro')).not.toContain('[object Object]');
      expect(normalizeApiError(item, 'Mensaje seguro').length).toBeGreaterThan(0);
    }
  });

  it('returns a specific earnings margin message for empty or invalid margin validation', () => {
    const message = normalizeBudgetMarginError({ detail: [{ loc: ['body', 'margin_multiplier'], msg: {}, type: 'float_parsing' }] });

    expect(message).toBe('El margen de ganancia debe ser un número válido mayor a 0.');
    expect(message).not.toContain('[object Object]');
  });
});
