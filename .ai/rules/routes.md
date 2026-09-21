---
paths:
  - 'routes/**'
---

# Routes

## Keep routes named and controller-backed
Define application routes with named controller actions and assign middleware at route or route-group boundaries. Avoid route closures for application behavior so Wayfinder and authorization remain explicit.

## Keep public and display experiences separate
Keep / as the responsive read-only public monitor and /display as the registered large-screen experience. They may share authoritative queue data, but must keep their audience, payload, controls, and presentation requirements distinct.
