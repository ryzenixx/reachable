FROM php:8.3-fpm-alpine AS runtime

ENV COMPOSER_ALLOW_SUPERUSER=1
ENV PHP_OPCACHE_VALIDATE_TIMESTAMPS=0

RUN apk add --no-cache \
    bash \
    curl \
    git \
    icu-dev \
    libzip-dev \
    linux-headers \
    nginx \
    oniguruma-dev \
    postgresql-client \
    postgresql-dev \
    supervisor \
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

COPY composer.json composer.lock ./
RUN composer install --no-dev --prefer-dist --no-interaction --optimize-autoloader --no-scripts

COPY . .

RUN php artisan package:discover --ansi \
    && composer dump-autoload --optimize --classmap-authoritative \
    && mkdir -p storage/logs bootstrap/cache \
    && chown -R www-data:www-data storage bootstrap/cache \
    && chmod -R ug+rwx storage bootstrap/cache

COPY docker/nginx/default.conf /etc/nginx/http.d/default.conf
COPY docker/supervisor/supervisord.conf /etc/supervisor/conf.d/supervisord.conf
COPY docker/entrypoint.sh /usr/local/bin/entrypoint

RUN chmod +x /usr/local/bin/entrypoint

EXPOSE 80
EXPOSE 8080

ENTRYPOINT ["/usr/local/bin/entrypoint"]
CMD ["supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
