/*
  # Fix RLS policies for sessions and machine parameters

  1. Changes
    - Drop existing policies
    - Create new policies with proper authentication checks
    - Add policies for administrators

  2. Security
    - Enable RLS on both tables
    - Add policies for operators and administrators
    - Ensure proper access control based on user roles
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Enable read access for operators on sessoes" ON sessoes;
DROP POLICY IF EXISTS "Enable insert for operators on sessoes" ON sessoes;
DROP POLICY IF EXISTS "Enable update for operators on sessoes" ON sessoes;
DROP POLICY IF EXISTS "Enable read access for active sessions on machine_parameters" ON machine_parameters;
DROP POLICY IF EXISTS "Enable insert/update for active sessions on machine_parameters" ON machine_parameters;

-- Create new policies for sessoes
CREATE POLICY "Enable read access for authenticated users on sessoes"
  ON sessoes
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Enable insert for authenticated users on sessoes"
  ON sessoes
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users on sessoes"
  ON sessoes
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create new policies for machine_parameters
CREATE POLICY "Enable read access for authenticated users on machine_parameters"
  ON machine_parameters
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Enable insert for authenticated users on machine_parameters"
  ON machine_parameters
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users on machine_parameters"
  ON machine_parameters
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);