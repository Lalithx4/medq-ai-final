#!/bin/sh
# Apply pending Prisma migrations to the current database.
# Usage (from project root):
#   sh scripts/db-deploy.sh

set -e

echo "==> Applying pending migrations"
./node_modules/.bin/prisma migrate deploy

echo "==> Migration status"
./node_modules/.bin/prisma migrate status
