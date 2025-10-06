/*
  # Fix RLS policies for production history

  1. Changes
    - Fix operator authentication check in RLS policies
    - Add proper type casting for auth.uid()
    - Ensure proper joins for admin role check

  2. Security
    - Maintain same security model but with correct type handling
    - Operators can still only access their own records
    - Admins retain full access
*/

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Operators can read own records" ON historico_producao;
DROP POLICY IF EXISTS "Operators can insert records" ON historico_producao;
DROP POLICY IF EXISTS "Operators can update own records" ON historico_producao;
DROP POLICY IF EXISTS "Admins have full access" ON historico_producao;

-- Create new policies with correct type handling
CREATE POLICY "Operators can read own records"
ON historico_producao
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM operador 
    WHERE operador.id = historico_producao.id_operador
    AND operador.user::text = auth.uid()::text
  )
);

CREATE POLICY "Operators can insert records"
ON historico_producao
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM operador 
    WHERE operador.id = historico_producao.id_operador
    AND operador.user::text = auth.uid()::text
  )
);

CREATE POLICY "Operators can update own records"
ON historico_producao
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM operador 
    WHERE operador.id = historico_producao.id_operador
    AND operador.user::text = auth.uid()::text
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM operador 
    WHERE operador.id = historico_producao.id_operador
    AND operador.user::text = auth.uid()::text
  )
);

CREATE POLICY "Admins have full access"
ON historico_producao
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM operador 
    WHERE operador.user::text = auth.uid()::text
    AND operador.nivel = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM operador 
    WHERE operador.user::text = auth.uid()::text
    AND operador.nivel = 'admin'
  )
);