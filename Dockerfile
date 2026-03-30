FROM node:22-alpine AS frontend-deps

WORKDIR /build/frontend

COPY frontend/package.json frontend/package-lock.json ./

RUN npm ci


FROM node:22-alpine AS frontend-builder

WORKDIR /build/frontend

COPY --from=frontend-deps /build/frontend/node_modules ./node_modules
COPY frontend ./

RUN npm run build


FROM php:8.3-fpm-alpine AS api-deps

ENV COMPOSER_ALLOW_SUPERUSER=1

RUN apk add --no-cache \
    git \
    icu-dev \
    libzip-dev \
    linux-headers \
    oniguruma-dev \
    postgresql-dev \
    unzip \
    zip

RUN docker-php-ext-install -j"$(nproc)" \
    bcmath \
    intl \
    opcache \
    pcntl \
    pdo_pgsql

RUN apk add --no-cache --virtual .phpize-deps $PHPIZE_DEPS \
    && pecl install redis \
    && docker-php-ext-enable redis \
    && apk del .phpize-deps

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

COPY api/composer.json api/composer.lock ./

RUN composer install --no-dev --prefer-dist --no-interaction --optimize-autoloader --no-scripts


FROM api-deps AS runtime

ENV PHP_OPCACHE_VALIDATE_TIMESTAMPS=0
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN apk add --no-cache \
    bash \
    curl \
    nginx \
    nodejs \
    npm \
    postgresql-client \
    supervisor \
    unzip \
    zip

WORKDIR /var/www/html

COPY --from=api-deps /var/www/html/vendor ./vendor
COPY api ./

RUN rm -f bootstrap/cache/*.php \
    && php artisan package:discover --ansi \
    && composer dump-autoload --optimize --classmap-authoritative \
    && mkdir -p storage/logs bootstrap/cache \
    && chown -R www-data:www-data storage bootstrap/cache \
    && chmod -R ug+rwx storage bootstrap/cache

WORKDIR /opt/reachable/frontend

COPY --from=frontend-builder /build/frontend/.next ./.next
COPY --from=frontend-builder /build/frontend/public ./public
COPY --from=frontend-builder /build/frontend/package.json ./package.json
COPY --from=frontend-builder /build/frontend/package-lock.json ./package-lock.json
COPY --from=frontend-builder /build/frontend/node_modules ./node_modules
COPY --from=frontend-builder /build/frontend/next.config.ts ./next.config.ts

WORKDIR /var/www/html

COPY docker/reachable/nginx-api.conf /etc/nginx/http.d/default.conf
COPY docker/reachable/supervisord.conf /etc/supervisor/conf.d/supervisord.conf
COPY docker/reachable/entrypoint.sh /usr/local/bin/entrypoint

RUN chmod +x /usr/local/bin/entrypoint

EXPOSE 80
EXPOSE 3000
EXPOSE 8080

ENTRYPOINT ["/usr/local/bin/entrypoint"]
CMD ["supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
