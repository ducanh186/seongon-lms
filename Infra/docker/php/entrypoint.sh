#!/bin/sh
set -eu

php artisan migrate --force
php artisan app:seed-demo-once
php artisan optimize

exec "$@"
