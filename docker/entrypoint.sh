#!/bin/sh

set -eu

mkdir -p \
    bootstrap/cache \
    storage/app/private \
    storage/framework/cache/data \
    storage/framework/sessions \
    storage/framework/views \
    storage/logs

if [ "${RUN_MIGRATIONS:-false}" = "true" ]; then
    php artisan migrate --force
fi

if [ "${RUN_OPTIMIZE:-true}" = "true" ]; then
    php artisan optimize
fi

chown -R www-data:www-data bootstrap/cache storage

exec "$@"
