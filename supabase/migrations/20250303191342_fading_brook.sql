/*
  # Fix device machine active column

  1. Changes
    - Rename 'active' column to 'ativo' to match naming convention
    - Update indexes to use new column name

  2. Security
    - Recreate indexes with correct column name
*/

-- Rename column from active to ativo
ALTER TABLE device_machine RENAME COLUMN active TO ativo;

-- Drop old indexes
DROP INDEX IF EXISTS idx_device_machine_mac_active;

-- Create new index with correct column name
CREATE INDEX IF NOT EXISTS idx_device_machine_mac_ativo ON public.device_machine ("MAC", ativo);