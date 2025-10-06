/*
  # Fix machine_stats ligada column

  This migration ensures that the 'ligada' column in machine_stats table
  can be properly updated when sessions are created and ended.

  1. Check if column exists and has correct type
  2. Set default value to false
  3. Ensure no constraints prevent updates
*/

-- Check if ligada column exists and has correct type
DO $$
BEGIN
  -- Check if column exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'machine_stats' 
    AND column_name = 'ligada'
  ) THEN
    -- Add column if it doesn't exist
    ALTER TABLE public.machine_stats ADD COLUMN ligada boolean DEFAULT false;
    RAISE NOTICE 'Added ligada column to machine_stats table';
  ELSE
    -- Check column type
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'machine_stats' 
      AND column_name = 'ligada'
      AND data_type = 'boolean'
    ) THEN
      -- Alter column type if incorrect
      ALTER TABLE public.machine_stats ALTER COLUMN ligada TYPE boolean USING ligada::boolean;
      RAISE NOTICE 'Fixed ligada column type in machine_stats table';
    END IF;
    
    -- Set default value
    ALTER TABLE public.machine_stats ALTER COLUMN ligada SET DEFAULT false;
    RAISE NOTICE 'Set default value for ligada column in machine_stats table';
  END IF;
END $$;

-- Ensure the column can be updated
ALTER TABLE public.machine_stats ALTER COLUMN ligada DROP NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.machine_stats.ligada IS 'Indicates if the machine is currently active in a session (true) or not (false)';
