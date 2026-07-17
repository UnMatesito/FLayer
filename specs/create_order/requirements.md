# Requirements — create_order

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

## Out of scope for this feature

- Budget calculation → feature `generate_budget`
- Status transitions beyond `new` → feature `order_status`
- ArquiMinis special case → feature `arquiminis`
