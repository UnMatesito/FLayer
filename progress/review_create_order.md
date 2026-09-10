# Review — create_order (R8-R24, 2026-09-09)

> **Resolved & re-review approved** — 2026-09-09. Finding 1 fixed (R18/R19 test added); see `progress/impl_create_order.md` reviewer verdict.

## Verdict: REJECTED

---

### Findings

#### Finding 1 — R18 / R19 have no automated test (BLOCKING)

The spec requires `R18` (delivery-cost button visible for `Delivery` orders) and
`R19` (delivery-cost button hidden for `Presencial acordado` orders) to be
tested with automated tests. No test file covers the order detail page
(`src/frontend/src/app/dashboard/orders/[id]/page.tsx`).

The impl doc's traceability row for R18/R19 reads:

> R18/R19 (delivery action state + button) | `OrderDetailResponse.type_of_delivery` (backend) + `page.tsx` render | ✅

This is not a test — it references the production component itself. The button
rendering logic (`order.type_of_delivery === 'Delivery'`) is correct in
`page.tsx:172` but is never asserted by any Vitest test.

**Action required:** Add a test file (e.g.
`src/frontend/src/app/dashboard/orders/[id]/page.test.tsx`) that:

1. Renders the order detail page with `type_of_delivery: 'Delivery'` and
   asserts the `Agregar costo de Entrega` button is present.
2. Renders the order detail page with `type_of_delivery: 'Presencial acordado'`
   and asserts the button is **absent**.

These are the R18/R19 acceptance tests the spec requires.

#### Finding 2 — R15 has weak backend-side test coverage (non-blocking, hardening note)

R15 requires "the order stores the submitted Dimensions value." The backend
test `test_create_order_print_persists_new_fields` asserts this via the API
response JSON, which is good. However it also asserts via the ORM query, so
coverage is actually solid. No action needed.

---

### Verification Results (all pass)

| Check | Result |
|---|---|
| `pytest` (backend) | 230 passed, 6.95s |
| Backend coverage (total) | **89%** |
| `orders.py` (API) | 74% (untouched legacy code) |
| `order.py` (model) | 100% |
| `schemas/order.py` | 98% |
| `pnpm test` (frontend Vitest) | 20 passed, 4 files |
| `npx tsc --noEmit` | clean |
| `pnpm build` | success |
| `ruff check` (touched backend files) | All checks passed |
| `init.sh` | ✓ Verification OK |
| Specs edited by implementer? | **No** — `requirements.md` last touched by spec_author at commit `2106f6c` (R7); `design.md` unchanged in git; `tasks.md` only has `[x]` toggles |
| All R8-R24 tasks checked? | **Yes** — all 16 revision tasks are `[x]` |

### Migration (021) Correctness

All 7 required columns present, correct types, no `peso` column:

| Column | Type | Nullable | Default |
|---|---|---|---|
| `order_category` | `String(20)` | NOT NULL | `'print'` |
| `needs_3d_printing` | `Boolean` | NOT NULL | `false` |
| `needs_3d_modelling` | `Boolean` | NOT NULL | `false` |
| `dimensions` | `Text` | nullable | — |
| `type_of_delivery` | `String(30)` | NOT NULL | `'Presencial acordado'` |
| `delivery_embalaje` | `Numeric(12,2)` | nullable | — |
| `delivery_precio_envio` | `Numeric(12,2)` | nullable | — |

Backfill logic: `needs_3d_printing = true` where `work_type = 'impresion_3d'`;
`needs_3d_modelling = true` where `work_type = 'diseno_3d'`. ✓

Check constraints: `ck_orders_order_category_valid`, `ck_orders_delivery_type_valid`,
`ck_orders_delivery_embalaje_non_negative`, `ck_orders_delivery_envio_non_negative`. ✓
