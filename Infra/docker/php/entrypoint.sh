#!/bin/sh
set -eu

php artisan migrate --force
php artisan app:seed-demo-once
# Reconcile additive popularity fixtures on existing Docker volumes. The full
# demo seed intentionally runs only once, but this sync is idempotent and must
# also reach customers who already have a persistent database volume.
php artisan db:seed --class=DemoPopularCoursesSeeder --force
php artisan optimize

exec "$@"
