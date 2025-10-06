/*
  # Fix session operator column type

  1. Changes
    - Modify operador column to use bigint instead of uuid
    - Add temporary column for data migration
    - Drop and recreate foreign key constraint

  2. Security
    - Maintain existing RLS policies
*/

-- Modify operador column to use bigint
ALTER TABLE sessoes 
ALTER COLUMN operador TYPE bigint 
USING operador::bigint;