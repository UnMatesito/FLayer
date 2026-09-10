# Requirements — create_order

> Revision 2026-08-12: R7 (store-token hardening) appended; the base feature
> (R1–R6) is done.
>
> Revision 2026-09-09: R8-R24 appended for order category selection, print
> service checkboxes, dimensions capture, delivery type, and delivery-cost
> capture after posting. Amended before approval: delivery-cost capture uses
> only `embalaje` and `Precio Envio`, and `print` defaults to `3d printing`
> selected. The base feature (R1-R7) stays intact.

## R1. Public form — 3D Printing type

GIVEN a customer accesses `/order-form`
WHEN they select "3D Printing" as work type and complete Name, Email,
     Phone, Description, and attach a file (STL/3MF/OBJ) or model link
THEN an order is created with `work_type='impresion_3d'`, `status='new'`
AND the "Order Received" email is sent to the customer

## R2. Public form — 3D Design type

GIVEN a customer accesses `/order-form`
WHEN they select "3D Design" as work type and complete Name, Email,
     Phone, and a detailed description of what they need
THEN an order is created with `work_type='diseno_3d'`, `status='new'`
AND the "Order Received" email is sent to the customer

## R3. Required field validation

GIVEN the form has an empty or invalid email field,
     or the name is empty
WHEN the customer tries to submit the form
THEN the form rejects the submit on the client side
AND no order is created in the database

## R4. File size validation

GIVEN a customer attaches a file larger than 200MB
WHEN they try to submit the form
THEN the system rejects the file with a clear message
AND the order is not created until the issue is resolved

## R5. Manual creation by the operator

GIVEN the operator (authenticated) is on the dashboard
WHEN he completes the internal "new order" form with the same
     fields as the public form
THEN an order is created just as if the customer had created it
AND the "Order Received" email is NOT sent twice if the customer
     was already notified by other means (checkbox "already notified the client")

## R6. Immediate dashboard visibility

GIVEN an order was created (by either of the two paths above)
WHEN the operator opens the "Active Orders" table
THEN the new order appears with: ID, customer, work type, status
     "new", creation date
AND it is sorted by creation date descending by default

## R7. Public intake requires a store token (hardening, 2026-08-12)

GIVEN a request to `POST /api/public/orders` or `GET /api/public/products`
WHEN the request carries no store token or an unknown store token
THEN the backend responds 404 "Invalid store token" — identical response in
    both cases, no signal about which case occurred
AND no order is created, no products are listed, and no anonymous user row is
    fabricated
AND when a token resolves to a user that does not exist, the same 404 applies —
    no user is created on the fly
AND intake with a valid store token works exactly as before

## Revision 2026-09-09 — intake category and delivery-cost capture

## R8. Public form — order category choices

GIVEN a customer accesses `/order-form`
WHEN the order form initially renders
THEN the form displays an order category selector with exactly `print` and
     `product` as selectable values

## R9. Public form — category required before order details

GIVEN a customer has not selected an order category on `/order-form`
WHEN the order details step would otherwise be displayed
THEN category-specific order detail inputs are not displayed

## R10. Public form — category required before submit

GIVEN a customer has not selected an order category on `/order-form`
WHEN they try to submit the form
THEN the form rejects the submit on the client side
AND no order is created in the database

## R11. Public form — print service checkboxes

GIVEN a customer selects `print` as the order category
WHEN the order details inputs are displayed
THEN the form displays checkbox inputs labeled `3d printing` and
     `3d modelling`

## R12. Public form — product hides print services

GIVEN a customer selects `product` as the order category
WHEN the order details inputs are displayed
THEN the `3d printing` and `3d modelling` checkbox inputs are not displayed

## R13. Public form — print service required

GIVEN a customer selects `print` as the order category
WHEN they clear the default `3d printing` selection and submit the form with
     neither `3d printing` nor `3d modelling` selected
THEN the form rejects the submit on the client side
AND no order is created in the database

## R14. Public form — dimensions input

GIVEN a customer has selected an order category on `/order-form`
WHEN the order details inputs are displayed
THEN the form displays a free-text `Dimensions` input with reference text
     `largo x ancho x alto en mm (De la pieza mas grande)`

## R15. Order creation — dimensions persistence

GIVEN a customer submits an order with a `Dimensions` value
WHEN the backend creates the order
THEN the order stores the submitted `Dimensions` value

## R16. Public form — delivery type choices

GIVEN a customer has selected an order category on `/order-form`
WHEN the order details inputs are displayed
THEN the form displays a `Type of Delivery` selector with exactly
     `Presencial acordado` and `Delivery` as selectable values

## R17. Order creation — delivery type required

GIVEN a customer has selected an order category on `/order-form`
WHEN they submit the form without selecting `Type of Delivery`
THEN the form rejects the submit on the client side
AND no order is created in the database

## R18. Order details — delivery-cost action visible

GIVEN an order was created with `Type of Delivery` equal to `Delivery`
WHEN the operator opens the order details page after the order is posted
THEN the page displays a button labeled `Agregar costo de Entrega`

## R19. Order details — delivery-cost action hidden

GIVEN an order was created with `Type of Delivery` equal to
      `Presencial acordado`
WHEN the operator opens the order details page after the order is posted
THEN the page does not display a button labeled `Agregar costo de Entrega`

## R20. Delivery-cost modal — numeric delivery fields

GIVEN an order details page displays `Agregar costo de Entrega`
WHEN the operator clicks the button
THEN a modal opens with numeric inputs labeled `embalaje` and `Precio Envio`

## R21. Delivery-cost modal — invalid numeric values rejected

GIVEN the delivery-cost modal is open
WHEN the operator submits a non-numeric value for `embalaje` or `Precio Envio`
THEN the modal rejects the submit on the client side
AND the delivery-cost fields are not saved

## R22. Delivery-cost save — delivery orders only

GIVEN an authenticated operator submits numeric delivery-cost fields for an
      order whose `Type of Delivery` is `Delivery`
WHEN the backend accepts the request
THEN the order stores `embalaje` and `Precio Envio`

## R23. Delivery-cost save — pickup orders rejected

GIVEN an authenticated operator submits delivery-cost fields for an order whose
      `Type of Delivery` is `Presencial acordado`
WHEN the backend receives the request
THEN the backend rejects the request
AND the order's delivery-cost fields are not changed

## R24. Public form — default print service selection

GIVEN a customer selects `print` as the order category
WHEN the order details inputs are displayed
THEN the form initializes print-service selections as
     `needs_3d_printing=true` and `needs_3d_modelling=false`

## Out of scope for this feature

- Budget calculation → feature `generate_budget`
- Status transitions beyond `new` → feature `order_status`
- ArquiMinis special case → feature `arquiminis`
