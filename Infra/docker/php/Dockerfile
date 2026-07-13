FROM composer:2.8 AS composer-bin

FROM php:8.3-fpm-alpine AS runtime

RUN apk add --no-cache \
        fcgi \
        freetype \
        icu-libs \
        libjpeg-turbo \
        libpng \
        libxml2 \
        libzip \
        oniguruma \
    && apk add --no-cache --virtual .build-deps \
        $PHPIZE_DEPS \
        freetype-dev \
        icu-dev \
        libjpeg-turbo-dev \
        libpng-dev \
        libxml2-dev \
        libzip-dev \
        oniguruma-dev \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j"$(nproc)" \
        bcmath \
        dom \
        gd \
        intl \
        mbstring \
        opcache \
        pdo_mysql \
        zip \
    && apk del .build-deps

WORKDIR /var/www/html

COPY --from=composer-bin /usr/bin/composer /usr/bin/composer
COPY BE/composer.json BE/composer.lock ./

RUN composer install \
    --no-dev \
    --no-interaction \
    --no-progress \
    --no-scripts \
    --prefer-dist \
    --classmap-authoritative

COPY BE/ ./
COPY Infra/docker/php/opcache.ini /usr/local/etc/php/conf.d/opcache.ini
COPY Infra/docker/php/entrypoint.sh /usr/local/bin/app-entrypoint

RUN rm -f bootstrap/cache/*.php \
    && composer dump-autoload --no-dev --classmap-authoritative --no-scripts \
    && php artisan package:discover --ansi \
    && mkdir -p storage/framework/cache/data storage/framework/sessions storage/framework/views storage/logs bootstrap/cache \
    && chown -R www-data:www-data storage bootstrap/cache \
    && chmod +x /usr/local/bin/app-entrypoint

USER www-data

EXPOSE 9000

ENTRYPOINT ["app-entrypoint"]
CMD ["php-fpm", "-F"]
