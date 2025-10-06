/*
  # Production History Security Policies

  1. Security
    - Enable RLS on production_historico table
    - Add policies for:
      - Authenticated users can read production history for their company
      - Operators can insert production history records
      - Admins can manage all records
*/

-- Enable RLS
ALTER TABLE producao_historico ENABLE ROW LEVEL SECURITY;

-- Policy for reading production history (authenticated users)
CREATE POLICY "Users can read production history from their company"
  ON producao_historico
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM operador o
      WHERE o.user = auth.uid()
      AND o.id_empresa = (
        SELECT p.id_empresa 
        FROM producao_maquina_estacao p 
        WHERE p.id = producao_historico.id_producao
      )
    )
  );

-- Policy for inserting production history (operators)
CREATE POLICY "Operators can insert production history"
  ON producao_historico
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM operador o
      WHERE o.user = auth.uid()
      AND o.id = producao_historico.id_operador
    )
  );

-- Policy for managing production history (admins)
CREATE POLICY "Admins can manage production history"
  ON producao_historico
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM operador o
      WHERE o.user = auth.uid()
      AND o.admin = true
      AND o.id_empresa = (
        SELECT p.id_empresa 
        FROM producao_maquina_estacao p 
        WHERE p.id = producao_historico.id_producao
      )
    )
  );