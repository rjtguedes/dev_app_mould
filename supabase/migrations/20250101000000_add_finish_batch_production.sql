/*
  # Add finish_batch_production RPC function
  
  This function allows batch finishing of production grades with different types:
  - 'partial': Pauses production but keeps grades in 'em_producao' status
  - 'complete': Finalizes all grades and marks them as 'concluido'
*/

-- Create RPC function for batch production finishing
CREATE OR REPLACE FUNCTION finish_batch_production(
  p_grade_ids bigint[],
  p_operator_id bigint,
  p_type text DEFAULT 'partial',
  p_machine_id bigint DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  grade_record record;
  result jsonb := '{"success": true, "processed_grades": 0, "errors": []}';
  error_msg text;
BEGIN
  -- Validate input parameters
  IF p_grade_ids IS NULL OR array_length(p_grade_ids, 1) = 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Nenhuma grade fornecida'
    );
  END IF;

  IF p_operator_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'ID do operador é obrigatório'
    );
  END IF;

  -- Process each grade
  FOR grade_record IN 
    SELECT 
      gsm.id,
      gsm.quantidade,
      gsm.quantidade_produzida,
      gsm.status,
      gsm.id_semana_maquina,
      gsm.numero_estacao
    FROM grade_semana_maquina gsm
    WHERE gsm.id = ANY(p_grade_ids)
  LOOP
    BEGIN
      -- Update grade status based on type
      IF p_type = 'complete' THEN
        -- Mark as completed
        UPDATE grade_semana_maquina 
        SET 
          status = 'concluido',
          data_fim = now()
        WHERE id = grade_record.id;
        
        -- Update semana_maquina if all grades are completed
        UPDATE semana_maquina sm
        SET 
          status = CASE 
            WHEN NOT EXISTS (
              SELECT 1 FROM grade_semana_maquina gsm2 
              WHERE gsm2.id_semana_maquina = sm.id 
              AND gsm2.status != 'concluido'
            ) THEN 'concluido'
            ELSE sm.status
          END,
          data_fim = CASE 
            WHEN NOT EXISTS (
              SELECT 1 FROM grade_semana_maquina gsm2 
              WHERE gsm2.id_semana_maquina = sm.id 
              AND gsm2.status != 'concluido'
            ) THEN now()
            ELSE sm.data_fim
          END
        WHERE sm.id = grade_record.id_semana_maquina;
        
      ELSIF p_type = 'partial' THEN
        -- Keep in production but mark as paused
        UPDATE grade_semana_maquina 
        SET 
          status = 'em_producao',
          data_fim = now()
        WHERE id = grade_record.id;
        
        -- Update semana_maquina to paused
        UPDATE semana_maquina 
        SET 
          status = 'pausada',
          data_fim = now()
        WHERE id = grade_record.id_semana_maquina;
      END IF;

      -- Create history record
      INSERT INTO producao_historico (
        quantidade_produzida,
        quantidade_rejeitada,
        data_inicio,
        data_fim,
        id_operador,
        metadata
      )
      VALUES (
        COALESCE(grade_record.quantidade_produzida, 0),
        0, -- quantidade_rejeitada
        now(),
        now(),
        p_operator_id,
        jsonb_build_object(
          'tipo', p_type,
          'origem', 'finalizacao_batch',
          'id_grade', grade_record.id,
          'id_maquina', p_machine_id,
          'numero_estacao', grade_record.numero_estacao,
          'saldo_restante', grade_record.quantidade - COALESCE(grade_record.quantidade_produzida, 0)
        )
      );

      -- Update result counter
      result := jsonb_set(result, '{processed_grades}', (result->>'processed_grades')::int + 1);

    EXCEPTION WHEN OTHERS THEN
      -- Add error to result
      error_msg := 'Erro na grade ' || grade_record.id || ': ' || SQLERRM;
      result := jsonb_set(
        result, 
        '{errors}', 
        (result->'errors') || to_jsonb(error_msg)
      );
    END;
  END LOOP;

  -- Check if there were any errors
  IF jsonb_array_length(result->'errors') > 0 THEN
    result := jsonb_set(result, '{success}', 'false');
  END IF;

  RETURN result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION finish_batch_production TO authenticated;
