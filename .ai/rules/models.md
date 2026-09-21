---
paths:
  - 'app/Models/**'
---

# Models

## Use UUIDs for domain records
Use HasUuids for devices, queue sessions, queue entries, counters, and audit events. Keep the Laravel users/authentication records on their existing integer keys unless a domain requirement changes that boundary.
