# Requirements — printer_profiles

## R1. Create printer profile

GIVEN an authenticated operator on the dashboard
WHEN they create a printer with a name (required) and optional brand, model,
    nozzle sizes (multiselect), power consumption in watts, lifespan in hours,
    spare parts cost, image URL, and notes
THEN a new `printers` record is created with `is_active=true` and `user_id` of the operator
AND the response includes the created printer with its `id`

Nozzle sizes is a multiselect of the nozzles the operator actually owns:
presets `0.2`, `0.4`, `0.6`, `0.8`, plus any custom size (R15).
Brand and model are select inputs populated from a curated catalog (R20),
with the option to type a custom value.

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
    nozzle sizes, power consumption, lifespan, spare parts cost, notes)
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
THEN a responsive card grid shows all active printers — each card displays the
    image (or fallback icon), name, brand, model, nozzles, power, lifespan,
    spare parts cost — with create, edit, and delete actions
AND the create/edit dialog rejects a submit with empty or whitespace name
    (frontend validation, same rule as R8)
AND delete asks for confirmation before removing
AND clicking a card navigates to the printer detail page

## R14. UI — printer detail page

GIVEN the operator opens a printer's detail page
WHEN the page loads
THEN the full printer info is displayed
AND the maintenance history table (date, type, description, cost) is shown
AND an "Add maintenance" dialog lets the operator record a new entry with the
    same validation as the backend (types from R10, non-negative cost from R11)

## R15. Nozzle list validated

GIVEN the operator is creating or updating a printer
WHEN `nozzle_sizes` contains duplicates or a value that is not one of the
    presets (`0.2`, `0.4`, `0.6`, `0.8`) nor a positive decimal (custom size)
THEN the request is rejected with HTTP 422
AND no printer is created or modified

## R16. Negative machine parameters rejected

GIVEN the operator is creating or updating a printer
WHEN `power_watts`, `lifespan_hours`, or `spare_parts_cost` is negative
THEN the request is rejected with HTTP 422
AND no printer is created or modified

## R17. Printer image URL input

GIVEN the operator is creating or editing a printer
WHEN they paste an image URL in the dialog (optional field)
THEN the URL is stored as the printer's image
AND an invalid URL (not http/https, or longer than 500 chars) is rejected
    with HTTP 422
AND the dialog shows a live preview of the pasted URL
AND a "Quitar imagen" action clears the field back to `image_url = null`
AND if the URL fails to load in the preview, the fallback icon is shown (R18)

## R18. Printer image fallback icon

GIVEN a printer has no `image_url` (never set, or cleared in R17)
WHEN the UI displays the printer (list row, detail page, dialog)
THEN it shows a fallback FDM printer icon instead of an image

## R19. Printer image display

GIVEN a printer with `image_url` set
WHEN the operator views the printer list or the printer detail page
THEN the printer image is displayed (thumbnail in the list, larger on the
    detail page)
AND the create/edit dialog shows the currently selected image with the
    option to remove it (back to fallback icon)

## R20. Brand and model catalog

GIVEN the operator is creating or editing a printer
WHEN the brand and model fields are rendered
THEN brand is a select input of well-known 3D printer brands (Bambu Lab,
    Creality, Prusa, Anycubic, Elegoo, etc.) served by
    `GET /api/printers/catalog`
AND model is a select input listing the models of the selected brand
AND if no brand is selected, the model select shows all models or is disabled
AND both selects allow typing a custom value not present in the catalog
    (e.g. an obscure brand)
AND selecting a different brand resets the model field
AND `brand` / `model` values are still stored as plain text
    (`VARCHAR(100)`, trimmed, max 100 chars)

## Out of scope

- Maintenance calendar / reminders (scheduled maintenance notifications) → future feature
- Linking print jobs to printers → future feature
- Printer network status / firmware / remote monitoring → future feature
- Printer image upload (own photos / local files) → future feature (R17 covers
  pasting an image URL only)
- Restore / reactivate archived printers → future feature (archive is one-way in MVP)
- Bed dimensions → dropped from the MVP, never used by any formula

## Related

- `power_watts`, `lifespan_hours`, `spare_parts_cost` are consumed by the
  budget generator — see `generate_budget` R11 (printer select in the budget
  form loads these values into the calculation).
