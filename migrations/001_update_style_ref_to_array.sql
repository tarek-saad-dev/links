-- Migration: Convert style_ref_id (single) to style_ref_ids (array)
-- Date: 2026-04-27

-- Step 1: Add new column as JSON array
ALTER TABLE daily_tasks ADD COLUMN style_ref_ids TEXT DEFAULT '[]';

-- Step 2: Migrate existing data - convert single ID to JSON array
UPDATE daily_tasks
SET style_ref_ids = CASE
    WHEN style_ref_id IS NOT NULL AND style_ref_id != ''
    THEN jsonb_build_array(style_ref_id)::text
    ELSE '[]'
END;

-- Step 3: Drop old column
ALTER TABLE daily_tasks DROP COLUMN style_ref_id;

-- Step 4: Add index for better performance on JSON queries (optional)
-- CREATE INDEX idx_daily_tasks_style_ref_ids ON daily_tasks USING gin (style_ref_ids::jsonb);
