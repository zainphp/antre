---
paths:
  - 'app/Events/**'
---

# Events

## Broadcast server state changes immediately
Represent queue and device changes with explicit ShouldBroadcastNow events. Broadcast notifications after the authoritative write; clients update presentation and reconcile state rather than synchronizing peer-to-peer.
