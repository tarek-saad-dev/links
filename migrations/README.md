# Database Migrations

This folder contains PostgreSQL migrations for the Links Archive app.

## Running Migrations

### Option 1: Using psql directly
```bash
# Set your database URL
export DATABASE_URL="postgresql://user:pass@localhost:5432/linksdb"

# Run specific migration
psql $DATABASE_URL -f migrations/001_update_style_ref_to_array.sql
```

### Option 2: Using the migration runner
```bash
# Run all pending migrations
npx ts-node migrations/run-migration.ts

# Run specific migration
npx ts-node migrations/run-migration.ts migrations/001_update_style_ref_to_array.sql
```

## Current Migrations

| File | Description | Date |
|------|-------------|------|
| `001_update_style_ref_to_array.sql` | Convert style_ref_id to style_ref_ids (JSON array) | 2026-04-27 |

## Migration Rules

1. Name format: `NNN_description.sql` (e.g., `001_add_users_table.sql`)
2. Always wrap migrations in transactions when possible
3. Include both "up" and "down" if complex
4. Test on backup data first
