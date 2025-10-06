/*
  # Add Transaction Management Functions

  1. New Functions
    - begin_transaction: Starts a new transaction
    - commit_transaction: Commits the current transaction
    - rollback_transaction: Rolls back the current transaction

  2. Security
    - Functions are accessible to authenticated users
*/

-- Create transaction management functions
CREATE OR REPLACE FUNCTION public.begin_transaction()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Start a new transaction
  -- Note: This is mostly a no-op since we're already in a transaction,
  -- but it's included for completeness and future compatibility
  -- Nothing to do here since Postgres automatically starts a transaction
END;
$$;

CREATE OR REPLACE FUNCTION public.commit_transaction()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Commit the current transaction
  COMMIT;
END;
$$;

CREATE OR REPLACE FUNCTION public.rollback_transaction()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Rollback the current transaction
  ROLLBACK;
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.begin_transaction() TO authenticated;
GRANT EXECUTE ON FUNCTION public.commit_transaction() TO authenticated;
GRANT EXECUTE ON FUNCTION public.rollback_transaction() TO authenticated;