-- Migration: Add RLS policies for paradas_redis table
-- Created: 2025-03-08
-- Description: Enable RLS and add policies to allow public access to paradas_redis

-- Enable Row Level Security on paradas_redis
ALTER TABLE public.paradas_redis ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Enable read access for all users" ON public.paradas_redis;
DROP POLICY IF EXISTS "Enable insert access for all users" ON public.paradas_redis;
DROP POLICY IF EXISTS "Enable update access for all users" ON public.paradas_redis;
DROP POLICY IF EXISTS "Enable delete access for all users" ON public.paradas_redis;

-- Create policies for paradas_redis
-- Allow SELECT for all users
CREATE POLICY "Enable read access for all users"
ON public.paradas_redis
FOR SELECT
USING (true);

-- Allow INSERT for all users
CREATE POLICY "Enable insert access for all users"
ON public.paradas_redis
FOR INSERT
WITH CHECK (true);

-- Allow UPDATE for all users
CREATE POLICY "Enable update access for all users"
ON public.paradas_redis
FOR UPDATE
USING (true)
WITH CHECK (true);

-- Allow DELETE for all users
CREATE POLICY "Enable delete access for all users"
ON public.paradas_redis
FOR DELETE
USING (true);

-- Grant necessary permissions to authenticated and anon roles
GRANT ALL ON public.paradas_redis TO authenticated;
GRANT ALL ON public.paradas_redis TO anon;

-- Grant usage on the sequence (for inserts)
GRANT USAGE, SELECT ON SEQUENCE public.paradas_redis_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.paradas_redis_id_seq TO anon;

-- Add comment
COMMENT ON TABLE public.paradas_redis IS 'Tabela de paradas gerenciada via Redis/WebSocket - políticas RLS habilitadas';

