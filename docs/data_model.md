# Data Model — Central Reference

This document is the single source of truth for the complete schema. Each
`specs/<feature>/design.md` references only the tables that feature touches
and must not redefine them — if a new field is needed, propose it here first.

DB: PostgreSQL · ORM: SQLAlchemy 2.0 (async) · Migrations: Alembic

## Entities and Ownership (which feature creates them)

| Table | Created By Feature | Depends On |
|---|---|---|
| `users` | `authentication` | — |
| `sessions`, `otp_codes` | `authentication` | `users` |
| `customers` | `create_order` | `users` |
| `orders` | `create_order` | `users`, `customers` |
| `order_notes` | `create_order` | `orders` |
| `order_status_history` | `order_status` | `orders` |
| `budgets` | `generate_budget` | `orders` |
| `budget_parameters` | `region_parameters` | `users` |
| `filaments`, `stock_movements` | `stock_management` | `users`, `orders` |
| `supplies` | `stock_management` | `users` |
| `arquiminis_orders` | `arquiminis` | `orders` |
| `fixed_products` | `product_management` | `users` |
| `uploads` (SeaweedFS) | `product_management` | — |
| `printers`, `printer_maintenance` | `printer_profiles` | `users` |

## Schema Conventions

- PK: `id UUID DEFAULT gen_random_uuid()`
- Every business table has `user_id` (multi-tenant ready) except child tables
  that inherit the tenant via FK (e.g., `order_notes.order_id → orders.user_id`)
- Timestamps: `created_at`, `updated_at` with `DEFAULT now()`
- Soft-delete: `is_active BOOLEAN` or `is_cancelled BOOLEAN`, never `DELETE`
- Amounts: `DECIMAL(12,2)`, never `FLOAT`
- Variable configs (slicer JSON, price matrix): `JSONB`

## `orders` (intake columns, `create_order`)

Intake fields owned by `create_order` (R8–R24, 2026-09-09):

- `order_category TEXT NOT NULL DEFAULT 'print'` — `print` | `product`
  (CHECK `ck_orders_order_category_valid`)
- `needs_3d_printing BOOLEAN NOT NULL DEFAULT false`
- `needs_3d_modelling BOOLEAN NOT NULL DEFAULT false`
- `dimensions TEXT NULL` — free-text, helper reference
  `largo x ancho x alto en mm (De la pieza mas grande)`
- `type_of_delivery TEXT NOT NULL DEFAULT 'Presencial acordado'` —
  `Presencial acordado` | `Delivery` (CHECK `ck_orders_delivery_type_valid`)
- `delivery_embalaje DECIMAL(12,2) NULL` — CHECK >= 0
  (`ck_orders_delivery_embalaje_non_negative`)
- `delivery_precio_envio DECIMAL(12,2) NULL` — CHECK >= 0
  (`ck_orders_delivery_envio_non_negative`)

Rules: `print` orders require at least one of `needs_3d_printing` /
`needs_3d_modelling`; `product` orders force both print-service booleans to
`false` server-side. `delivery_embalaje` / `delivery_precio_envio` are settable
only for `type_of_delivery = 'Delivery'` (operator endpoint
`PATCH /api/orders/{id}/delivery-cost`). Migration `021` backfills existing rows
with `order_category='print'`, `type_of_delivery='Presencial acordado'`, and
booleans derived from `work_type` (`impresion_3d` → printing, `diseno_3d` →
modelling).

## Relationship Diagram (High Level)

```
users ──┬── customers ──── orders ──┬── order_notes
        │                          ├── order_status_history
        │                          ├── budgets
        │                          └── arquiminis_orders
        │
        ├── budget_parameters
        ├── filaments ──── stock_movements ──(order_id)──> orders
        ├── supplies
        ├── printers ──── printer_maintenance
        └── fixed_products
```

## Critical Query: Stock Deduction (Atomic Transaction)

```sql
BEGIN;
UPDATE filaments SET weight_grams = weight_grams - :grams
  WHERE id = :filament_id AND user_id = :user_id;
INSERT INTO stock_movements (filament_id, movement_type, quantity_grams, order_id, created_by_user_id)
  VALUES (:filament_id, 'consumption', -:grams, :order_id, :user_id);
COMMIT;
```

This transaction is mandatory for `stock_management` and `order_status`
(trigger: order transitions to `ready`). Cancellation reverses with positive
`quantity_grams`, same pattern.

## Budget Formula (Reference — details in `specs/generate_budget/design.md`)

```
filament_cost          = (grams / 1000) × price_per_kg
electricity_cost       = (hours + min/60) × (watts / 1000) × price_kwh
amortization_cost      = (hours + min/60) × (parts_cost / machine_lifespan_hours)
subtotal               = sum of the 3 above
subtotal_with_error    = subtotal × (1 + error_margin_percent / 100)
post_processing_total  = assembly_cost + sanding_cost + painting_cost
total_before_margin    = subtotal_with_error + extra_costs + post_processing_total
final_price            = total_before_margin × margin_multiplier
```

`margin_multiplier` is selected per budget from fixed presets (`2.0` alto
volumen / descuento, `2.5` volumen medio, `3.0` mayorista, `3.5` intermedio,
`4.0` minorista, `5.0` llaveros / piezas chicas) or from a custom value. The
regional `budget_parameters` table now configures only `electricity_price_kwh`
and `error_margin_percent` per `(user_id, currency)`, seeded on first access and
editable via the Perfil page. `users.currency` (default `'ARS'`) drives the
budget currency default when the form omits `currency`. `budgets` snapshots
`electricity_price_kwh`, `error_margin_percent`, `margin_multiplier`, and the
post-processing inputs at calculation time (`NULL` electricity snapshot = a
pre-`region_parameters` budget → falls back to the seeded value at read).
