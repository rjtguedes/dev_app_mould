/*
  # Add production control columns

  1. Changes
    - Add data_inicio and data_fim columns to producao_maquina_estacao table
    - Add id_operador column to producao_maquina_estacao table
    - Add quantidade_rejeitada column to producao_maquina_estacao table
    - Add foreign key constraint for id_operador
    - Add indexes for performance optimization

  2. Notes
    - All new columns are nullable to maintain compatibility with existing records
    - Timestamps use timestamptz to handle timezone information properly
*/

-- Add new columns to producao_maquina_estacao
ALTER TABLE producao_maquina_estacao 
ADD COLUMN IF NOT EXISTS data_inicio timestamptz,
ADD COLUMN IF NOT EXISTS data_fim timestamptz,
ADD COLUMN IF NOT EXISTS id_operador bigint,
ADD COLUMN IF NOT EXISTS quantidade_rejeitada integer DEFAULT 0;

-- Add foreign key constraint
ALTER TABLE producao_maquina_estacao
ADD CONSTRAINT producao_maquina_estacao_id_operador_fkey 
FOREIGN KEY (id_operador) 
REFERENCES operador(id) 
ON DELETE SET NULL;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_producao_maquina_estacao_data_inicio 
ON producao_maquina_estacao(data_inicio);

CREATE INDEX IF NOT EXISTS idx_producao_maquina_estacao_data_fim 
ON producao_maquina_estacao(data_fim);

CREATE INDEX IF NOT EXISTS idx_producao_maquina_estacao_id_operador 
ON producao_maquina_estacao(id_operador);