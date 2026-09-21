---
paths:
  - 'app/Http/Middleware/**'
---

# Middleware

## Enforce user and device authorization separately
Use Laravel session authentication and user-role authorization for administrators. Use validated persistent device credentials and device-role middleware for terminal capabilities; never trust a browser-provided role or URL for authorization.

## Keep first-run onboarding as the installation gate
When no administrator exists, redirect web application requests to /onboarding. Keep the onboarding endpoint itself, public API reads, and health checks available so first-run setup and operational monitoring remain possible.

## Keep operator terminals free of admin login
A registered OPERATOR_TERMINAL uses its server-validated device identity for the operator experience and must not require an administrator username and password. Administrator authentication remains required for admin routes and actions.
