---
paths:
  - 'app/Http/Controllers/**'
  - app/Http/Controllers/PublicController.php
  - app/Http/Controllers/QueueController.php
  - app/Http/Controllers/DeviceController.php
---

# Controllers

## Keep controllers as HTTP coordinators
Use controllers to translate HTTP input into responses and delegate multi-step queue, device, pairing, audit, and onboarding workflows to injected services. Keep simple presentation queries and response mapping in controllers.

## Keep public queue payloads minimal
Public queue responses expose only the information needed to monitor the queue. Keep callable operator data, customer photos, device identity, credentials, and administrative data in authorized private responses.

## Keep customer photos private and session-bound
Accept customer photos through authenticated HTTPS and server storage. Expose a photo only to an authorized operator for the current called or serving entry, retain it through the session, and remove it when the session is reset.

## Preserve device history through revocation
Revoking a device removes its roles and access without erasing its identity or audit history. Attempt a hard delete only when safe; otherwise retain the record through soft deletion and keep deletion auditable.
