# Antre

Antre is a centralized queue-management PWA for physical service locations.
Laravel is the source of truth for devices, queue sessions, queue entries,
settings, and queue operations. React/Inertia renders the client experiences,
while Laravel Reverb distributes realtime changes.

## Experiences

| Route                | Purpose                                                 |
| -------------------- | ------------------------------------------------------- |
| `/`                  | Public, read-only queue monitor for customers           |
| `/pair`              | Device pairing and registration state                   |
| `/login`             | Administrator authentication                            |
| `/admin`             | Administrator navigation and overview                   |
| `/admin/devices`     | Device registration, role assignment, and revocation    |
| `/admin/settings`    | Brand, session, numbering, counter, and footer settings |
| `/display`           | Registered display terminal                             |
| `/queue-terminal`    | Registered customer queue-number terminal               |
| `/operator-terminal` | Registered operator terminal                            |

Device roles are `DISPLAY`, `QUEUE_TERMINAL`, and `OPERATOR_TERMINAL`. A device
can have more than one role. User roles and device roles are separate: only
administrators authenticate through `/login`; operator terminals use their
registered device identity.

## Architecture

```text
browser
   │ HTTPS / WSS
   ▼
Laravel
   ├── MariaDB: authoritative persistent state
   ├── HTTP: commands, initial state, uploads, authentication
   └── Reverb: realtime queue and device events
```

Queue operations are validated and persisted by Laravel inside database
transactions. Realtime events notify connected clients; clients reconcile from
server state after reconnecting. The application does not use WebRTC, PeerJS,
browser-authoritative queue state, or peer-to-peer synchronization.

Customer photos are uploaded over HTTPS and stored privately. They are not
included in the public queue API.

## Local development

Requirements:

- PHP 8.5+
- Composer
- Bun 1.4.2+
- SQLite for the default local environment

Install and initialize the application:

```bash
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate
bun install --frozen-lockfile
```

Start Laravel and the Vite development server:

```bash
composer run dev
```

The first visit redirects to `/onboarding` when no administrator exists.

## Checks

Run the project checks before committing:

```bash
composer run test
bun run check
bun run types:check
bun run build
composer audit --no-interaction
```

Frontend files use kebab-case. Use direct MUI subpath imports, for example
`@mui/material/Button`, and use generated Wayfinder functions for Laravel
routes.

## Deployment

The application requires a PHP 8.5 runtime, a supported relational database,
a web server serving the `public` directory, and a long-running Laravel Reverb
process for realtime updates. Platform-specific deployment instructions can be
added once the hosting target is selected.
