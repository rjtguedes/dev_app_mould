import { useState, useEffect } from 'react';
import { supabase, handleJWTError } from '../lib/supabase';
import type { SingleMachineProduction } from '../types/production';

export function useSingleMachineProduction(machineId: number | null) {
  const [production, setProduction] = useState<SingleMachineProduction | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!machineId) {
      setLoading(false);
      return;
    }

    let isMounted = true;
    let intervalId: NodeJS.Timeout;

    const fetchData = async () => {
      try {
        if (!isMounted) return;

        // Declarar variáveis
        let stats: any = null;
        let params: any = null;

        // Buscar dados da máquina
        const { data: machine, error: machineError } = await supabase
          .from('Maquinas')
          .select('*')
          .eq('id_maquina', machineId)
          .single();

        if (machineError) {
          const isJWTError = await handleJWTError(machineError);
          if (isJWTError) return;
          throw machineError;
        }

        // Buscar machine_stats
        const { data: statsData, error: statsError } = await supabase
          .from('machine_stats')
          .select('*')
          .eq('id_maquina', machineId)
          .single();

        if (statsError) {
          const isJWTError = await handleJWTError(statsError);
          if (isJWTError) return;
          throw statsError;
        }

        // Se não existe, criar um registro inicial
        if (statsError && statsError.code === 'PGRST116') {
          const { data: newStats, error: createStatsError } = await supabase
            .from('machine_stats')
            .insert({
              id_maquina: machineId,
              velocidade: 0,
              disponibilidade: 0,
              produzido: 0,
              rejeitos: 0,
              minutos_disponivel: 0,
              minutos_parada: 0,
              producao_teorica: 0,
              desempenho: 0,
              qualidade: 0,
              oee: 0,
              status: false,
              ultimo_sinal: null,
              id_parada_atual: null,
              id_turno_atual: null,
              fim_turno_atual: null,
              inicio_turno: null,
              sessao: null,
              ligada: false
            })
            .select()
            .single();

          if (createStatsError) {
            const isJWTError = await handleJWTError(createStatsError);
            if (isJWTError) return;
            throw createStatsError;
          }

          stats = newStats;
        } else if (statsData) {
          stats = statsData;
        }

        // Buscar machine_parameters
        const { data: paramsData, error: paramsError } = await supabase
          .from('machine_parameters')
          .select('*, produto:produto(*)')
          .eq('id_maquina', machineId)
          .single();

        if (paramsError && paramsError.code !== 'PGRST116') {
          const isJWTError = await handleJWTError(paramsError);
          if (isJWTError) return;
          throw paramsError;
        }

        // Se machine_parameters não existe, criar um registro inicial
        if (paramsError && paramsError.code === 'PGRST116') {
          const { data: newParams, error: createParamsError } = await supabase
            .from('machine_parameters')
            .insert({
              id_maquina: machineId,
              operador: null,
              sessao: null,
              produto: null,
              semana_maquina: null,
              grade_semana_maquina: null,
              estacoes: null,
              id_matriz: null
            })
            .select('*, produto:produto(*)')
            .single();

          if (createParamsError) {
            const isJWTError = await handleJWTError(createParamsError);
            if (isJWTError) return;
            throw createParamsError;
          }

          params = newParams;
        } else if (paramsData) {
          params = paramsData;
        }

        if (!stats || !params) {
          if (isMounted) {
            setProduction(null);
          }
          return;
        }


        if (isMounted) {
          const productionData = {
            stats,
            parameters: params,
            machine,
            grade: null,
            produto: null
          };
          
          setProduction(productionData);
        }
      } catch (err) {
        console.error('Error fetching single machine production:', err);
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Erro ao carregar dados de produção');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchData();

    // Polling a cada 60 segundos para machine_stats
    intervalId = setInterval(fetchData, 60000);

    // Realtime apenas para machine_parameters (não para machine_stats)
    const subscription = supabase
      .channel('single_machine_production')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'machine_parameters',
          filter: `id_maquina=eq.${machineId}`
        },
        () => {
          // Recarregar dados quando houver mudanças
          fetchData();
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      if (intervalId) {
        clearInterval(intervalId);
      }
      subscription.unsubscribe();
    };
  }, [machineId]);

  return { production, loading, error };
} 