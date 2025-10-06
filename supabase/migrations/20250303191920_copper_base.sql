/*
  # Update device_machine table

  1. Changes
    - Add column active with default value
    - Update existing records
    - Drop column ativo
*/

-- Add new column
ALTER TABLE device_machine 
ADD COLUMN IF NOT EXISTS active boolean DEFAULT true;

-- Update existing records
UPDATE device_machine 
SET active = ativo 
WHERE ativo IS NOT NULL;

-- Drop old column
ALTER TABLE device_machine 
DROP COLUMN IF EXISTS ativo;

-- Recreate index with new column name
DROP INDEX IF EXISTS idx_device_machine_mac_ativo;
CREATE INDEX IF NOT EXISTS idx_device_machine_mac_active ON public.device_machine ("MAC", active);