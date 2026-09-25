---
paths:
  - 'resources/js/**'
  - resources/js/app.tsx
---

# Js

## Use Wayfinder for Laravel routes
Call Laravel routes and controller actions through generated Wayfinder helpers from @/routes or @/actions. Do not duplicate backend URL strings throughout React pages and components.

## Use direct MUI subpath imports
Import MUI components and icons from their package subpaths, such as @mui/material/Button and @mui/icons-material/CheckRounded. Do not import from the @mui/material or @mui/icons-material barrels.

## Keep frontend filenames in kebab-case
Name frontend JavaScript and TypeScript files with kebab-case. Oxlint enforces this through `unicorn/filename-case` in `vite.config.ts`.

## Do not reintroduce browser authority
Use Laravel and the database as the source of truth for queue, roles, devices, and registration. Do not add WebRTC, peer-to-peer synchronization, client-authoritative queue state, or a global client store for server domain state.

## Let the app own the Antre title suffix
Pages pass concise human-readable titles to Inertia Head. The application shell appends the standard — Antre suffix centrally; do not repeat the suffix in individual page titles.

## Keep offline support presentation-only
Offline or PWA behavior may cache the application shell and show connection state, but authoritative queue commands, device registration, and synchronization require the Laravel server. Do not add an offline command queue without an explicit domain requirement.
