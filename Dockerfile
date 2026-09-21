# syntax=docker/dockerfile:1.7

FROM oven/bun:1.4.2 AS bun

FROM composer:2 AS composer

FROM php:8.5-cli-bookworm AS build

ARG VITE_APP_NAME=Antre
ARG VITE_REVERB_APP_KEY
ARG VITE_REVERB_HOST=
ARG VITE_REVERB_PORT=443
ARG VITE_REVERB_SCHEME=https

ENV APP_ENV=production \
    APP_KEY=base64:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA= \
    DB_CONNECTION=sqlite \
    DB_DATABASE=:memory: \
    BROADCAST_CONNECTION=null \
    VITE_APP_NAME=${VITE_APP_NAME} \
    VITE_REVERB_APP_KEY=${VITE_REVERB_APP_KEY} \
    VITE_REVERB_HOST=${VITE_REVERB_HOST} \
    VITE_REVERB_PORT=${VITE_REVERB_PORT} \
    VITE_REVERB_SCHEME=${VITE_REVERB_SCHEME}

WORKDIR /var/www/html

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        libcurl4-openssl-dev \
        libicu-dev \
        libonig-dev \
        libsqlite3-dev \
        libxml2-dev \
        libzip-dev \
        unzip \
    && docker-php-ext-install -j"$(nproc)" \
        bcmath \
        curl \
        intl \
        mbstring \
        opcache \
        pcntl \
        pdo_mysql \
        pdo_sqlite \
        sockets \
        zip \
    && rm -rf /var/lib/apt/lists/*

COPY --from=bun /usr/local/bin/bun /usr/local/bin/bun
RUN ln -s /usr/local/bin/bun /usr/local/bin/bunx

COPY --from=composer /usr/bin/composer /usr/bin/composer

COPY composer.json composer.lock ./
RUN composer install \
    --no-dev \
    --no-interaction \
    --no-progress \
    --no-scripts \
    --prefer-dist \
    --optimize-autoloader

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .

RUN composer dump-autoload \
        --no-dev \
        --no-interaction \
        --no-progress \
        --optimize-autoloader \
    && php artisan wayfinder:generate --with-form --no-interaction \
    && bun run build \
    && rm -rf node_modules

FROM php:8.5-fpm-bookworm AS runtime

WORKDIR /var/www/html

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        libcurl4-openssl-dev \
        libicu-dev \
        libonig-dev \
        libsqlite3-dev \
        libxml2-dev \
        libzip-dev \
    && docker-php-ext-install -j"$(nproc)" \
        bcmath \
        curl \
        intl \
        mbstring \
        opcache \
        pcntl \
        pdo_mysql \
        pdo_sqlite \
        sockets \
        zip \
    && rm -rf /var/lib/apt/lists/*

COPY --from=build /var/www/html /var/www/html
COPY docker/entrypoint.sh /usr/local/bin/antre-entrypoint
COPY docker/php.ini /usr/local/etc/php/conf.d/zz-antre.ini

RUN sed -i 's/^;clear_env = no/clear_env = no/' /usr/local/etc/php-fpm.d/www.conf \
    && chmod +x /usr/local/bin/antre-entrypoint \
    && mkdir -p \
        bootstrap/cache \
        storage/app/private \
        storage/framework/cache/data \
        storage/framework/sessions \
        storage/framework/views \
        storage/logs \
    && chown -R www-data:www-data /var/www/html

EXPOSE 9000

ENTRYPOINT ["/usr/local/bin/antre-entrypoint"]
CMD ["php-fpm", "-F"]

FROM nginx:1.29-alpine AS web

COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=runtime /var/www/html/public /var/www/html/public

EXPOSE 80
