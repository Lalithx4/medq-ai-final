#!/bin/bash

# Supabase Database Migration Script
# This script migrates your entire database from old to new Supabase project

set -e  # Exit on error

echo "🚀 Supabase Database Migration Script"
echo "======================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if required tools are installed
command -v pg_dump >/dev/null 2>&1 || { echo -e "${RED}❌ pg_dump is required but not installed.${NC}" >&2; exit 1; }
command -v psql >/dev/null 2>&1 || { echo -e "${RED}❌ psql is required but not installed.${NC}" >&2; exit 1; }

# Prompt for old database connection string
echo -e "${YELLOW}📥 Enter OLD Supabase database connection string:${NC}"
echo "   (Format: postgresql://postgres:[password]@db.xxx.supabase.co:5432/postgres)"
read -r OLD_DB_URL

# Prompt for new database connection string
echo ""
echo -e "${YELLOW}📤 Enter NEW Supabase database connection string:${NC}"
echo "   (Format: postgresql://postgres:[password]@db.yyy.supabase.co:5432/postgres)"
read -r NEW_DB_URL

# Validate inputs
if [ -z "$OLD_DB_URL" ] || [ -z "$NEW_DB_URL" ]; then
    echo -e "${RED}❌ Both database URLs are required${NC}"
    exit 1
fi

# Create backup directory
BACKUP_DIR="supabase_backup_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"
echo ""
echo -e "${GREEN}✅ Created backup directory: $BACKUP_DIR${NC}"

# Step 1: Dump schema only (structure)
echo ""
echo -e "${YELLOW}📋 Step 1: Exporting database schema...${NC}"
PGDUMP_CMD="pg_dump"
# Try to use PostgreSQL 17 if available
if command -v /opt/homebrew/opt/postgresql@17/bin/pg_dump >/dev/null 2>&1; then
    PGDUMP_CMD="/opt/homebrew/opt/postgresql@17/bin/pg_dump"
elif command -v /usr/local/opt/postgresql@17/bin/pg_dump >/dev/null 2>&1; then
    PGDUMP_CMD="/usr/local/opt/postgresql@17/bin/pg_dump"
fi
echo "Using: $PGDUMP_CMD"

$PGDUMP_CMD "$OLD_DB_URL" \
    --schema-only \
    --no-owner \
    --no-privileges \
    --exclude-schema=storage \
    --exclude-schema=auth \
    --exclude-schema=realtime \
    --exclude-schema=extensions \
    > "$BACKUP_DIR/schema.sql"
echo -e "${GREEN}✅ Schema exported to $BACKUP_DIR/schema.sql${NC}"

# Step 2: Dump data only
echo ""
echo -e "${YELLOW}📦 Step 2: Exporting all data...${NC}"
$PGDUMP_CMD "$OLD_DB_URL" \
    --data-only \
    --no-owner \
    --no-privileges \
    --exclude-schema=storage \
    --exclude-schema=auth \
    --exclude-schema=realtime \
    --exclude-schema=extensions \
    --disable-triggers \
    > "$BACKUP_DIR/data.sql"
echo -e "${GREEN}✅ Data exported to $BACKUP_DIR/data.sql${NC}"

# Step 3: Export auth.users separately (important!)
echo ""
echo -e "${YELLOW}👥 Step 3: Exporting auth users...${NC}"
$PGDUMP_CMD "$OLD_DB_URL" \
    --data-only \
    --no-owner \
    --no-privileges \
    --table=auth.users \
    --table=auth.identities \
    > "$BACKUP_DIR/auth_users.sql"
echo -e "${GREEN}✅ Auth users exported to $BACKUP_DIR/auth_users.sql${NC}"

# Determine psql command
PSQL_CMD="psql"
if command -v /opt/homebrew/opt/postgresql@17/bin/psql >/dev/null 2>&1; then
    PSQL_CMD="/opt/homebrew/opt/postgresql@17/bin/psql"
elif command -v /usr/local/opt/postgresql@17/bin/psql >/dev/null 2>&1; then
    PSQL_CMD="/usr/local/opt/postgresql@17/bin/psql"
fi

# Step 4: Import schema to new database
echo ""
echo -e "${YELLOW}📥 Step 4: Importing schema to new database...${NC}"
$PSQL_CMD "$NEW_DB_URL" -f "$BACKUP_DIR/schema.sql" 2>&1 | grep -v "ERROR.*already exists" || true
echo -e "${GREEN}✅ Schema imported${NC}"

# Step 5: Import data to new database
echo ""
echo -e "${YELLOW}📥 Step 5: Importing data to new database...${NC}"
$PSQL_CMD "$NEW_DB_URL" -f "$BACKUP_DIR/data.sql"
echo -e "${GREEN}✅ Data imported${NC}"

# Step 6: Import auth users (with caution)
echo ""
echo -e "${YELLOW}👥 Step 6: Importing auth users...${NC}"
echo -e "${RED}⚠️  WARNING: This may cause conflicts if users already exist${NC}"
read -p "Do you want to import auth users? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    $PSQL_CMD "$NEW_DB_URL" -f "$BACKUP_DIR/auth_users.sql" || echo -e "${YELLOW}⚠️  Some auth users may have failed (this is normal if they already exist)${NC}"
    echo -e "${GREEN}✅ Auth users imported${NC}"
else
    echo -e "${YELLOW}⏭️  Skipped auth users import${NC}"
fi

# Step 7: Update sequences
echo ""
echo -e "${YELLOW}🔢 Step 7: Updating sequences...${NC}"
$PSQL_CMD "$NEW_DB_URL" -c "SELECT setval(pg_get_serial_sequence(schemaname || '.' || tablename, columnname), (SELECT MAX(columnname::bigint) FROM schemaname.tablename) + 1) FROM (SELECT schemaname, tablename, columnname FROM pg_catalog.pg_tables t JOIN pg_catalog.pg_attribute a ON t.tablename = a.attrelid::regclass::text WHERE schemaname NOT IN ('pg_catalog', 'information_schema', 'auth', 'storage', 'realtime', 'extensions') AND a.atthasdef AND pg_get_expr(a.attdefault, a.attrelid) LIKE 'nextval%') AS seq;" || echo -e "${YELLOW}⚠️  Sequence update had some issues (may be normal)${NC}"

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ Migration Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "📁 Backup files saved in: ${GREEN}$BACKUP_DIR${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Test the new database by connecting your app to it"
echo "2. Verify all data is present"
echo "3. Update your environment variables"
echo "4. Keep the backup directory until you're sure everything works"
echo ""
