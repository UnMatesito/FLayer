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
| `fixed_products` | `arquiminis` | `users` |
| `printers`, `printer_maintenance` | `printer_profiles` | `users` |

## Schema Conventions

- PK: `id UUID DEFAULT gen_random_uuid()`
- Every business table has `user_id` (multi-tenant ready) except child tables
  that inherit the tenant via FK (e.g., `order_notes.order_id → orders.user_id`)
- Timestamps: `created_at`, `updated_at` with `DEFAULT now()`
- Soft-delete: `is_active BOOLEAN` or `is_cancelled BOOLEAN`, never `DELETE`
- Amounts: `DECIMAL(12,2)`, never `FLOAT`
- Variable configs (slicer JSON, price matrix): `JSONB`

## Relationship Diagram (High Level)

```
users ──┬── customers ──── orders ──┬── order_notes
        │                          ├── order_status_history
        │                          ├── budgets ──── budget_parameters
        │                          └── arquiminis_orders
        │
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
final_price            = subtotal_with_error × margin_multiplier
```

`margin_multiplier` depends on type (wholesale/retail/keychain), comes from
`budget_parameters`.
