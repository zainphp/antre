---
paths:
  - 'database/migrations/**'
---

# Migrations

## Use UUID primary keys for domain tables
Create device, queue, counter, and audit domain tables with UUID primary keys and matching UUID foreign keys. Keep users and framework tables on their Laravel-native key types.

## Persist enum values as strings
Store application roles and statuses in string columns and cast them to PHP backed enums in Eloquent models. Do not introduce database enum columns for these domain values.
