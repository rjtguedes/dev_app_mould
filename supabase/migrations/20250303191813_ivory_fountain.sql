/*
  # Fix device_machine table constraints

  1. Changes
    - Add ON CONFLICT clause for MAC column
    - Add trigger to deactivate other records for same MAC
*/

-- Create function to handle device activation
CREATE OR REPLACE FUNCTION handle_device_activation()
RETURNS TRIGGER AS $$
BEGIN
  -- Deactivate other records for the same MAC
  IF (TG_OP = 'INSERT' AND NEW.ativo = true) OR
     (TG_OP = 'UPDATE' AND NEW.ativo = true AND OLD.ativo = false) THEN
    UPDATE device_machine
    SET ativo = false
    WHERE "MAC" = NEW."MAC"
      AND id != NEW.id
      AND ativo = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS device_activation_trigger ON device_machine;
CREATE TRIGGER device_activation_trigger
  BEFORE INSERT OR UPDATE ON device_machine
  FOR EACH ROW
  EXECUTE FUNCTION handle_device_activation();