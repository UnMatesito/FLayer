# Implementation Progress — generate_budget

## Status

**Backend:** 12/12 tasks done
**Frontend:** 7/7 tasks done
**Tests:** 19/19 tasks done

## Files Modified/Created

### Backend (new files)
| File | Purpose |
|------|---------|
| `src/backend/models/budget.py` | Budget SQLAlchemy model |
| `src/backend/schemas/budget.py` | Pydantic schemas (7 classes) |
| `src/backend/services/budget_service.py` | BudgetCalculator with formula + hardcoded defaults |
| `src/backend/api/budget.py` | 5 endpoints (POST/GET/PUT/PATCH/preview) |

### Backend (modified files)
| File | Change |
|------|--------|
| `src/backend/models/__init__.py` | Added Budget import |
| `src/backend/main.py` | Added budget_router, added "approved" to SEED_STATUSES |
| `src/backend/services/email_service.py` | Added send_budget_provided abstract method + stub |
| `src/alembic/env.py` | Added Budget import |
| `src/alembic/versions/007_create_budgets_table.py` | Migration for budgets table |

### Frontend (new files)
| File | Purpose |
|------|---------|
| `src/frontend/src/components/BudgetForm.tsx` | Budget create/edit dialog with live preview |
| `src/frontend/src/components/BudgetBreakdown.tsx` | Read-only budget display with status actions |

### Frontend (modified files)
| File | Change |
|------|--------|
| `src/frontend/src/app/api.ts` | Added budget types + 5 API functions |
| `src/frontend/src/app/dashboard/orders/[id]/page.tsx` | Added budget section with form/breakdown |
| `src/frontend/src/components/OrdersTable.tsx` | Added "Presupuesto" column with status chip |

### Tests
| File | Status |
|------|--------|
| `src/tests/integration/test_budget.py` | 19 tests, all passing |
| `src/tests/conftest.py` | Added "approved" to SEED_STATUSES |

## R → Test traceability

| Req | Test(s) |
|-----|---------|
| R1. Multi-filament selection | `test_create_budget_with_filament_items`, `test_filament_price_snapshot` |
| R2. Manual filament cost | `test_create_budget_manual_filament_cost` |
| R3. Auto-calculation | `test_create_budget_calculates_correctly`, `test_update_budget_recalculates`, `test_budget_preview_no_persist`, `test_budget_response_has_computed_fields` |
| R4. Manual price override | `test_manual_price_override` |
| R5. Draft status | `test_create_budget_status_draft` |
| R6. Send to client | `test_status_transition_draft_to_sent` (email mock) |
| R7. Approve/Reject | `test_status_transition_sent_to_approved`, `test_status_transition_sent_to_rejected`, `test_status_transition_draft_to_approved` |
| R8. Invalid inputs | `test_create_budget_no_filaments`, `test_create_budget_grams_zero`, `test_create_budget_extra_costs_negative`, `test_create_budget_negative_hours` |
| R9. Budget visibility | `test_budget_response_has_computed_fields` |
| R10. Empty state | `test_get_budget_nonexistent_order`, `test_get_budget_no_budget` |

## pytest results

```
$ pytest tests/ -v --cov=backend
81 passed in 2.71s
Coverage: 90%
```

### Test list (19 budget tests)
```
✓ test_create_budget_with_filament_items
✓ test_create_budget_manual_filament_cost
✓ test_create_budget_no_filaments
✓ test_create_budget_grams_zero
✓ test_create_budget_extra_costs_negative
✓ test_create_budget_negative_hours
✓ test_create_budget_calculates_correctly
✓ test_create_budget_status_draft
✓ test_update_budget_recalculates
✓ test_manual_price_override
✓ test_filament_price_snapshot
✓ test_status_transition_draft_to_sent
✓ test_status_transition_sent_to_approved
✓ test_status_transition_sent_to_rejected
✓ test_status_transition_draft_to_approved
✓ test_get_budget_nonexistent_order
✓ test_get_budget_no_budget
✓ test_budget_preview_no_persist
✓ test_budget_response_has_computed_fields
```

## Manual Verification

Run:
```bash
cd src && poetry run pytest tests/ -v --cov=backend
```

## Blockers

None.
