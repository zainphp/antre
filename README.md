# Antre

Antre is a centralized queue-management PWA for physical service locations.
Laravel is the source of truth for devices, queue sessions, queue entries,
settings, and queue operations. React/Inertia renders the client experiences,
while Laravel Reverb distributes local realtime changes and Ably distributes
production realtime changes.

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
   └── Realtime: Reverb locally, Ably in production
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

Start Reverb in a second terminal:

```bash
php artisan reverb:start
```

The first visit redirects to `/onboarding` when no administrator exists.

## Quality

Apply the project's automatic code fixes before committing:

```bash
composer quality
```

CI runs `composer quality`, builds the frontend, and runs `composer test`.

Frontend files use kebab-case. Use direct MUI subpath imports, for example
`@mui/material/Button`, and use generated Wayfinder functions for Laravel
routes.

## Deployment

The application requires a PHP 8.5 runtime, a supported relational database,
and a web server serving the `public` directory. Local development uses a
long-running Laravel Reverb process. Production uses Ably with Pusher protocol
support enabled in the Ably app, so Reverb is not required there.

Set these production variables before building the frontend:

```ini
BROADCAST_CONNECTION=ably
ABLY_KEY=public-key:secret-key
ABLY_PUBLIC_KEY=public-key
VITE_BROADCAST_CONNECTION=ably
VITE_ABLY_PUBLIC_KEY=public-key
```

`ABLY_KEY` is server-only. `ABLY_PUBLIC_KEY` is the portion before `:` and is
safe to expose to the browser through the Vite build.
