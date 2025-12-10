#!/bin/sh
# Baseline Prisma migrations on an existing database without applying SQL.
# Usage (from project root):
#   sh scripts/db-baseline.sh
# Optional: if your DB already contains the "20250122_add_subscription_fields" changes,
#           set APPLY_SUBS=1 to mark it as applied too:
#   APPLY_SUBS=1 sh scripts/db-baseline.sh

set -e

echo "==> Baseline initial migration (0_init) as applied"
./node_modules/.bin/prisma migrate resolve --applied 0_init

if [ "$APPLY_SUBS" = "1" ]; then
  echo "==> Baseline subscription fields migration as applied"
  ./node_modules/.bin/prisma migrate resolve --applied 20250122_add_subscription_fields
else
  echo "(info) Skipping subscription fields baseline. Set APPLY_SUBS=1 to mark it as applied if your DB already has those columns."
fi

echo "==> Done. Now run: sh scripts/db-deploy.sh"
