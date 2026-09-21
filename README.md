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

## Docker deployment

The production setup is in [compose.yaml](compose.yaml). It contains:

- `db`: MariaDB
- `app`: PHP-FPM Laravel application
- `reverb`: Laravel Reverb WebSocket server
- `web`: Nginx HTTP/WebSocket gateway

The application container runs migrations and `artisan optimize` on startup.
The current queue events are broadcast immediately, so a separate queue worker
is not required by this deployment.

### Synology layout

Keep the Git checkout and persistent data in separate directories:

```text
/volume1/docker/antre-app/  Git checkout and compose.yaml
/volume1/docker/antre/      MariaDB files and customer photos
```

On the Synology, clone the repository and create the environment file:

```bash
cd /volume1/docker
git clone <repository-url> antre-app
cd antre-app
cp .env.docker.example .env
```

Set at least these values in `.env`:

```env
APP_KEY=base64:<random-application-key>
APP_URL=https://antre.example.com
DB_PASSWORD=<database-password>
DB_ROOT_PASSWORD=<different-root-password>
REVERB_APP_KEY=<reverb-key>
REVERB_APP_SECRET=<reverb-secret>
REVERB_ALLOWED_ORIGINS=https://antre.example.com
ANTRE_DATA_DIR=/volume1/docker/antre
```

Generate secrets with a password manager or OpenSSL. Do not commit `.env`.

Build and start the stack:

```bash
docker compose config
docker compose up -d --build
docker compose ps
docker compose logs --tail=100 app reverb web
```

Configure a Synology reverse-proxy rule from the HTTPS domain to
`http://127.0.0.1:8080` and enable WebSocket support. Keep
`VITE_REVERB_HOST` empty when the public application and WebSocket endpoint use
the same HTTPS hostname.

After the first deployment, open `/onboarding` to create the administrator and
configure the application.

### Updating a deployed installation

Containers are rebuilt from Git; do not edit application files inside a
running container.

```bash
cd /volume1/docker/antre-app
git status
git pull --ff-only
docker compose up -d --build
docker compose ps
docker compose logs --tail=100 app reverb web
```

Application and frontend changes require `--build`. Environment changes for
`VITE_*` values also require a rebuild because those values are compiled into
the frontend bundle. Laravel migrations run automatically when the `app`
container starts.

Back up both `${ANTRE_DATA_DIR}/database` and `${ANTRE_DATA_DIR}/storage` before
deploying migrations. Never use `docker compose down -v` for an update; it can
remove persistent volumes.

## Realtime connection

The browser connects to Reverb through the same public HTTPS domain. Synology
handles TLS, Nginx proxies `/app/` WebSocket traffic to Reverb, and Laravel
uses `TRUSTED_PROXIES=REMOTE_ADDR` so generated HTTPS URLs remain correct.
