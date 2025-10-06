-- Inserir grupos de máquinas
INSERT INTO grupos_maquinas (id, descricao, id_empresa) VALUES
  (1, 'Injeção', 1),
  (2, 'Extrusão', 1),
  (3, 'Acabamento', 1),
  (4, 'Embalagem', 1)
ON CONFLICT (id) DO NOTHING;

-- Inserir motivos de parada específicos para cada grupo
INSERT INTO motivos_parada (descricao, contabiliza_oee, id_empresa, grupo_maquina) VALUES
  -- Motivos específicos para Injeção (grupo 1)
  ('Troca de molde', false, 1, 1),
  ('Ajuste de material', false, 1, 1),
  ('Manutenção canhão', true, 1, 1),
  ('Limpeza molde', false, 1, 1),
  
  -- Motivos específicos para Extrusão (grupo 2)
  ('Troca de matriz', false, 1, 2),
  ('Ajuste temperatura', false, 1, 2),
  ('Manutenção extrusora', true, 1, 2),
  ('Troca de bobina', false, 1, 2),
  
  -- Motivos específicos para Acabamento (grupo 3)
  ('Ajuste corte', false, 1, 3),
  ('Manutenção cortadora', true, 1, 3),
  ('Troca de lâmina', false, 1, 3),
  ('Ajuste acabamento', false, 1, 3),
  
  -- Motivos específicos para Embalagem (grupo 4)
  ('Troca de etiqueta', false, 1, 4),
  ('Ajuste embalagem', false, 1, 4),
  ('Manutenção seladora', true, 1, 4),
  ('Troca de filme', false, 1, 4),
  
  -- Motivos gerais (sem grupo específico)
  ('Pausa para almoço', false, 1, NULL),
  ('Pausa para café', false, 1, NULL),
  ('Reunião', false, 1, NULL),
  ('Falta de energia', true, 1, NULL),
  ('Falta de material', true, 1, NULL),
  ('Falta de operador', true, 1, NULL),
  ('Manutenção preventiva', true, 1, NULL),
  ('Controle de qualidade', false, 1, NULL),
  ('Amostra para teste', false, 1, NULL),
  ('Banheiro', false, 1, NULL)
ON CONFLICT DO NOTHING;

-- Associar a máquina 1 ao grupo Injeção (ID: 1)
UPDATE "Maquinas"
SET grupo = 1
WHERE id_maquina = 1; 