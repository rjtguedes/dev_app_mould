/*
  # Fix RLS policies for sessions and machine parameters

  1. Changes
    - Drop existing RLS policies
    - Add new policies with proper conditions for operators
    - Add policies for machine parameters linked to sessions

  2. Security
    - Ensure operators can only access their own sessions
    - Allow access to machine parameters for active sessions
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Allow read access for authenticated users on sessoes" ON sessoes;
DROP POLICY IF EXISTS "Allow insert/update for authenticated users on sessoes" ON sessoes;
DROP POLICY IF EXISTS "Allow read access for authenticated users on machine_parameters" ON machine_parameters;
DROP POLICY IF EXISTS "Allow insert/update for authenticated users on machine_parameters" ON machine_parameters;

-- Create new policies for sessoes
CREATE POLICY "Enable read access for operators on sessoes"
  ON sessoes
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM operador 
      WHERE user = auth.uid() 
      AND id = operador
    )
  );

CREATE POLICY "Enable insert for operators on sessoes"
  ON sessoes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM operador 
      WHERE user = auth.uid() 
      AND id = operador
    )
  );

CREATE POLICY "Enable update for operators on sessoes"
  ON sessoes
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM operador 
      WHERE user = auth.uid() 
      AND id = operador
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM operador 
      WHERE user = auth.uid() 
      AND id = operador
    )
  );

-- Create new policies for machine_parameters
CREATE POLICY "Enable read access for active sessions on machine_parameters"
  ON machine_parameters
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sessoes s
      JOIN operador o ON o.id = s.operador
      WHERE s.id = machine_parameters.sessao
      AND o.user = auth.uid()
      AND s.fim IS NULL
    )
  );

CREATE POLICY "Enable insert/update for active sessions on machine_parameters"
  ON machine_parameters
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sessoes s
      JOIN operador o ON o.id = s.operador
      WHERE s.id = machine_parameters.sessao
      AND o.user = auth.uid()
      AND s.fim IS NULL
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sessoes s
      JOIN operador o ON o.id = s.operador
      WHERE s.id = machine_parameters.sessao
      AND o.user = auth.uid()
      AND s.fim IS NULL
    )
  );