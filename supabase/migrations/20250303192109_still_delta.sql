/*
  # Remove last_used from device_machine table

  1. Changes
    - Remove last_used column as it's not needed
*/

-- Remove last_used column
ALTER TABLE device_machine 
DROP COLUMN IF EXISTS last_used;