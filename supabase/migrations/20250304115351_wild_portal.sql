/*
  # Add status column to semana_maquina table

  1. Changes
    - Add status column to semana_maquina table with valid states
    - Set default value to 'pendente'
    - Add check constraint to ensure valid status values
    - Update existing records to have default status
*/

-- Add status column with check constraint
ALTER TABLE semana_maquina 
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pendente'
CHECK (status IN ('pendente', 'em_producao', 'finalizado'));

-- Update any existing records to have the default status if needed
UPDATE semana_maquina 
SET status = 'pendente' 
WHERE status IS NULL;