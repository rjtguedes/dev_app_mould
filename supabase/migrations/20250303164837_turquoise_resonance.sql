/*
  # Add Production Tracking Columns

  1. New Columns
    - semana_maquina:
      - `quantidade_produzida` (integer) - Track produced quantity
      - `saldo` (integer) - Track remaining balance
    - grade_semana_maquina:
      - `quantidade_produzida` (integer) - Track produced quantity per size
      - `saldo` (integer) - Track remaining balance per size

  2. Changes
    - Add default values of 0 for new columns
    - Add computed saldo columns
*/

-- Add columns to semana_maquina
ALTER TABLE semana_maquina 
ADD COLUMN IF NOT EXISTS quantidade_produzida integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS saldo integer GENERATED ALWAYS AS (quantidade - COALESCE(quantidade_produzida, 0)) STORED;

-- Add columns to grade_semana_maquina
ALTER TABLE grade_semana_maquina 
ADD COLUMN IF NOT EXISTS quantidade_produzida integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS saldo integer GENERATED ALWAYS AS (quantidade - COALESCE(quantidade_produzida, 0)) STORED;