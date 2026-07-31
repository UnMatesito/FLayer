# Requirements — printer_profiles

## R1. Create printer profile

GIVEN an authenticated operator on the dashboard
WHEN they create a printer with a name (required) and optional brand, model,
    nozzle size, bed width/depth/height, and notes
THEN a new `printers` record is created with `is_active=true` and `user_id` of the operator
AND the response includes the created printer with its `id`

## R2. List active printers

GIVEN one or more printers exist (some active, some inactive)
WHEN the authenticated operator requests `GET /api/printers`
THEN only printers with `is_active=true` are returned
AND the list is sorted by name alphabetically

## R3. Get printer detail

GIVEN a printer exists (active or inactive)
WHEN the authenticated operator requests `GET /api/printers/{id}`
THEN the printer is returned regardless of `is_active`
AND it includes all its fields

## R4. Update printer

GIVEN an existing active printer
WHEN the authenticated operator updates any of its fields (name, brand, model,
    nozzle size, bed dimensions, notes)
THEN the updated fields are persisted in the database
AND the printer's `updated_at` timestamp refreshes

## R5. Soft-delete printer

GIVEN an existing active printer with maintenance records
WHEN the authenticated operator deletes it
THEN `printers.is_active` is set to `false`
AND the printer is excluded from the default listing
AND its maintenance records remain intact and queryable

## R6. Tenant isolation

GIVEN printers and maintenance records belonging to another user
WHEN the authenticated operator tries to list, read, update, delete, or add
    maintenance to them
THEN the request returns 404 Not Found (no data leak)
AND list operations return only the operator's own printers

## R7. Duplicate printer name rejected

GIVEN the operator already has an active printer named "Printer A"
WHEN they create a printer named "Printer A" (or rename another printer to "Printer A")
THEN the request is rejected with HTTP 409 Conflict
AND no printer is created or renamed

## R8. Empty name rejected

GIVEN the operator is creating or updating a printer
WHEN they submit a name that is empty or only whitespace
THEN the request is rejected with HTTP 422
AND no printer is created or modified

## R9. Add maintenance record

GIVEN an existing printer
WHEN the operator adds a maintenance record with date, type
    (`calibration`, `cleaning`, `repair`), description, and optional cost
THEN a `printer_maintenance` record is created with `user_id` of the operator
AND it appears in the printer's maintenance history

## R10. Invalid maintenance type rejected

GIVEN the operator is adding a maintenance record
WHEN the type is not one of `calibration`, `cleaning`, `repair`
THEN the request is rejected with HTTP 422
AND no record is created

## R11. Negative maintenance cost rejected

GIVEN the operator is adding a maintenance record
WHEN `cost` is negative
THEN the request is rejected with HTTP 422
AND no record is created

## R12. List maintenance history

GIVEN a printer with one or more maintenance records
WHEN the authenticated operator requests `GET /api/printers/{id}/maintenance`
THEN all records for that printer are returned, ordered by date descending
AND newer records appear first

## R13. UI — printer list page

GIVEN the operator opens the Printers section in the dashboard
WHEN the page loads
THEN a table shows all active printers (name, brand, model, nozzle, bed size)
    with create, edit, and delete actions
AND the create/edit dialog rejects a submit with empty or whitespace name
    (frontend validation, same rule as R8)
AND delete asks for confirmation before removing

## R14. UI — printer detail page

GIVEN the operator opens a printer's detail page
WHEN the page loads
THEN the full printer info is displayed
AND the maintenance history table (date, type, description, cost) is shown
AND an "Add maintenance" dialog lets the operator record a new entry with the
    same validation as the backend (types from R10, non-negative cost from R11)

## Out of scope

- Maintenance calendar / reminders (scheduled maintenance notifications) → future feature
- Linking print jobs to printers → future feature
- Printer network status / firmware / remote monitoring → future feature
- Printer image upload → future feature
- Restore / reactivate archived printers → future feature (archive is one-way in MVP)
