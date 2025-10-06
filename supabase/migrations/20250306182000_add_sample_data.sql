/*
  # Add Sample Data for Testing Machine Groups

  This migration adds sample data to test the machine group filtering functionality.
*/

-- Insert sample machine groups
INSERT INTO grupos_maquinas (id, descricao, id_empresa) VALUES
  (1, 'Injeção', 1),
  (2, 'Extrusão', 1),
  (3, 'Acabamento', 1),
  (4, 'Embalagem', 1)
ON CONFLICT (id) DO NOTHING;

-- Insert sample stop reasons with groups
INSERT INTO motivos_parada (descricao, contabiliza_oee, id_empresa, grupo_maquina) VALUES
  -- Motivos específicos para Injeção (grupo 1)
  ('Troca de molde', false, 1, 1),
  ('Ajuste de temperatura', true, 1, 1),
  ('Limpeza de bico injetor', true, 1, 1),
  ('Troca de material', false, 1, 1),
  ('Manutenção preventiva', false, 1, 1),
  ('Ajuste de pressão', true, 1, 1),
  ('Problema no sistema hidráulico', true, 1, 1),
  ('Falha no sistema elétrico', true, 1, 1),
  
  -- Motivos específicos para Extrusão (grupo 2)
  ('Troca de rosca', false, 1, 2),
  ('Ajuste de velocidade', true, 1, 2),
  ('Limpeza de cabeçote', true, 1, 2),
  ('Troca de filtro', false, 1, 2),
  ('Ajuste de temperatura do cilindro', true, 1, 2),
  ('Problema no sistema de refrigeração', true, 1, 2),
  ('Falha no sistema de tração', true, 1, 2),
  
  -- Motivos específicos para Acabamento (grupo 3)
  ('Troca de ferramenta', false, 1, 3),
  ('Ajuste de corte', true, 1, 3),
  ('Limpeza de esteira', true, 1, 3),
  ('Troca de lâmina', false, 1, 3),
  ('Ajuste de pressão de ar', true, 1, 3),
  ('Problema no sistema de aspiração', true, 1, 3),
  
  -- Motivos específicos para Embalagem (grupo 4)
  ('Troca de bobina', false, 1, 4),
  ('Ajuste de selagem', true, 1, 4),
  ('Limpeza de sensor', true, 1, 4),
  ('Troca de etiqueta', false, 1, 4),
  ('Ajuste de velocidade da esteira', true, 1, 4),
  ('Problema no sistema de impressão', true, 1, 4),
  
  -- Motivos gerais (sem grupo específico)
  ('Pausa para almoço', false, 1, NULL),
  ('Pausa para café', false, 1, NULL),
  ('Reunião', false, 1, NULL),
  ('Falta de energia', true, 1, NULL),
  ('Falta de ar comprimido', true, 1, NULL),
  ('Falta de água', true, 1, NULL),
  ('Aguardando material', true, 1, NULL),
  ('Aguardando transporte', true, 1, NULL),
  ('Problema de qualidade', true, 1, NULL),
  ('Manutenção corretiva', false, 1, NULL),
  ('Falta de operador', true, 1, NULL),
  ('Outros', true, 1, NULL)
ON CONFLICT DO NOTHING;

-- Update a sample machine to have a group (assuming machine ID 1 exists)
UPDATE "Maquinas" 
SET grupo_maquina = 1 
WHERE id_maquina = 1; 