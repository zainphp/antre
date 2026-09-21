---
paths:
  - 'app/Services/**'
  - app/Services/DeviceRegistry.php
---

# Services

## Use service objects for application workflows
Place reusable application workflows in final service classes under app/Services and inject their dependencies. Query Eloquent directly in these services; do not introduce a repository layer without a concrete need.

## Keep queue state authoritative on Laravel
Execute queue commands and state transitions in QueueService on the server. Protect sequence allocation and concurrent operator actions with transactions, row locks, idempotency keys, and centralized transition rules; React never owns authoritative queue state.

## Audit important domain operations
Record important queue, device, pairing, user, and settings operations through the shared AuditLogger. Keep audit metadata useful and avoid storing sensitive credentials or customer photo data.

## Treat device identity as a server-validated credential
Persist terminal identity with the device credential cookie and validate it against Laravel before resolving roles. Client storage identifies a device only; it never grants a role or capability by itself.

## Keep queue history inside sessions
Every queue entry belongs to a queue session. Ending or resetting a session starts a new sequence while retaining historical queue records; do not silently delete session history during rollover.
