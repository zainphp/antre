---
paths:
  - 'app/Enums/**'
---

# Enums

## Keep user roles and device roles separate
UserRole represents human permissions and DeviceRole represents terminal capabilities. Devices may have multiple DeviceRole values; do not use a device role as a substitute for an authenticated user role.

## Use string-backed enums for domain states
Define queue, device, session, and user states as string-backed enums under app/Enums. Use PascalCase enum cases with stable uppercase persisted values and keep stable human labels on the enum when needed.
