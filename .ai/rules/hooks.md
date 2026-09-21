---
paths:
  - 'resources/js/hooks/**'
---

# Hooks

## Treat realtime as notification and reconcile state
Use WebSocket events to notify clients of changes, then reconcile authoritative state through Inertia polling or reload after reconnect or missed events. Do not assume a client received every event.
