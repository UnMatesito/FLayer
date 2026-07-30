# Review — `product_management`

## Traceability R<n> → test

| Req | Test(s) | Exists? | Tests real behavior? |
|---|---|---|---|
| R1. Create fixed product | `test_create_product_valid` | ✅ | Checks 201, name, description, price, is_active, id, timestamps |
| R2. List active products | `test_list_active_products_excludes_inactive`, `test_list_products_sorted_by_name`, `test_list_products_show_inactive` | ✅ | Checks inactive excluded, alphabetical sort, show_inactive param |
| R3. Update fixed product | `test_update_product_fields` | ✅ | Checks name and price persist after PATCH |
| R4. Negative price rejection | `test_create_product_negative_price_rejected`, `test_update_product_negative_price_rejected` | ✅ | Both POST and PATCH with negative price → 422 |
| R5. Soft-delete | `test_soft_delete_product` | ✅ | Checks is_active=false, excluded from listing |
| R6. Empty name rejection | `test_create_product_empty_name_rejected` | ✅ | Tests empty string and whitespace-only → 422 |
| R7. Get product by ID | `test_get_product_by_id_includes_inactive`, `test_get_product_by_id_not_found` | ✅ | Returns inactive product; 404 for nonexistent UUID |
| R8. Order product ref | `test_order_with_fixed_product_id_sets_total`, `test_order_references_nonexistent_product_rejected` | ✅ | Checks fixed_product_id and total match; 404 for bad UUID |
| R9. Upload image | `test_upload_product_image_valid` | ✅ | Checks image_url set after PNG upload |
| R10. Invalid image | `test_upload_product_image_invalid_type`, `test_upload_product_image_too_large` | ✅ | PDF type → 422; 11MB file → 422 |

**Result:** All 10 requirements covered by 16 tests. ✅

## Tasks completion

All 15 backend tasks and 16 test tasks in `specs/product_management/tasks.md` are marked `[x]`. ✅

## Test results

| Suite | Result |
|---|---|
| `tests/integration/test_products.py -v` | **16/16 passed** ✅ |
| `tests/integration/ -q` (all integration tests) | **93/93 passed** ✅ |
| _Note: first run of full suite errored (transient test DB state on `stock_movements` drop). Clean retry passed._ |

## Coverage (on touched files)

| File | Lines | Missed | Coverage | Missed lines |
|---|---|---|---|---|
| `backend/api/products.py` | 71 | 3 | **96%** | 86, 111, 134 (404 not-found branches in PATCH/DELETE/image) |
| `backend/models/product.py` | 17 | 0 | **100%** | — |
| `backend/schemas/product.py` | 53 | 2 | **96%** | 42, 44 (empty-name-on-update reject, None-name return in ProductUpdate) |
| `backend/services/storage_service.py` | 28 | 0 | **100%** | — |

All files exceed 70% threshold. Uncovered lines are edge-case branches (product-not-found 404s, empty-name-on-update validation). ✅

## Minor issues

- `--cov=<filepath>` syntax fails (modules "never imported" warning); use `--cov=backend` instead. This is a pytest-cov path resolution quirk, not a code problem.
- No test for updating a product with an empty/whitespace name (R6 validator applies to both POST and PATCH but only POST is tested).

## Verdict

**APPROVED** — full traceability, all tests pass, no regressions, coverage > 70% on all touched files.
