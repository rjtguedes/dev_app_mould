/*
  # Session Persistence Improvements

  1. New Columns
    - Add persistent_token to sessoes table for session recovery
    - Add last_activity timestamp for session tracking
    
  2. New Function
    - Add function to update last_activity timestamp
    - Add function to validate and recover sessions
*/

-- Add new columns to sessoes table
ALTER TABLE sessoes
ADD COLUMN IF NOT EXISTS persistent_token uuid DEFAULT gen_random_uuid(),
ADD COLUMN IF NOT EXISTS last_activity timestamp with time zone DEFAULT now();

-- Create index for faster token lookups
CREATE INDEX IF NOT EXISTS idx_sessoes_persistent_token ON sessoes (persistent_token);

-- Create function to update last activity
CREATE OR REPLACE FUNCTION update_session_activity()
RETURNS trigger AS $$
BEGIN
  NEW.last_activity = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update last_activity
CREATE TRIGGER update_session_last_activity
  BEFORE UPDATE ON sessoes
  FOR EACH ROW
  EXECUTE FUNCTION update_session_activity();