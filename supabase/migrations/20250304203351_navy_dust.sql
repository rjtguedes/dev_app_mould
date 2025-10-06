/*
  # Create Production Tickets Table

  1. New Tables
    - `taloes_op`
      - `IdTalao` (bigint, primary key)
      - `NroOP` (integer, foreign key to ordem_producao)
      - `SeqOP` (bigint)
      - `NroTalao` (bigint)
      - `CCusto` (bigint)
      - `OcoGrd` (text)
      - `RegProducao` (bigint)
      - `Tamanho` (text)
      - `Qtd` (bigint)
      - `status` (boolean, default false)

  2. Security
    - Enable RLS on `taloes_op` table
    - Add policies for authenticated users
*/

CREATE TABLE IF NOT EXISTS public.taloes_op (
  "IdTalao" bigint NOT NULL,
  "NroOP" integer NULL,
  "SeqOP" bigint NULL,
  "NroTalao" bigint NULL,
  "CCusto" bigint NULL,
  "OcoGrd" text NULL,
  "RegProducao" bigint NULL,
  "Tamanho" text NULL,
  "Qtd" bigint NULL,
  status boolean NULL DEFAULT false,
  CONSTRAINT taloes_op_pkey PRIMARY KEY ("IdTalao"),
  CONSTRAINT taloes_op_NroOP_fkey FOREIGN KEY ("NroOP") REFERENCES ordem_producao (id_ordem)
) TABLESPACE pg_default;

-- Enable RLS
ALTER TABLE taloes_op ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow read access for authenticated users"
  ON taloes_op
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow update for authenticated users"
  ON taloes_op
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);