---
paths:
  - 'app/Http/**'
---

# Http

## Resolve the current user with CurrentUser
When a controller or Data class needs the current authenticated user, inject Illuminate Container CurrentUser rather than calling auth()->user() or request()->user(). Use Auth explicitly for login and logout operations.
