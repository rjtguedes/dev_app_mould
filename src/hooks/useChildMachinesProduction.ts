import { useState, useEffect } from 'react';
import { supabase, handleJWTError } from '../lib/supabase';
import type { ChildMachineProduction } from '../types/production';

export function useChildMachinesProduction(parentMachineId: number, useWebSocketOnly: boolean = false) {
  const [productions, setProductions] = useState<ChildMachineProduction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    let subscription: any;
    let intervalId: NodeJS.Timeout;

    const fetchData = async () => {
      try {
        // Buscar máquinas filhas
        const { data: childMachines, error: childMachinesError } = await supabase
          .from('Maquinas')
          .select('id_maquina, nome, numero_estacao, maquina_pai, maquina_filha')
          .eq('maquina_filha', true)
          .eq('maquina_pai', parentMachineId)
          .order('numero_estacao', { ascending: true });

        if (childMachinesError) {
          const isJWTError = await handleJWTError(childMachinesError);
          if (isJWTError) return;
          throw childMachinesError;
        }

        const productionsData: ChildMachineProduction[] = [];

        for (const machine of childMachines || []) {
          try {
            // Buscar machine_stats
            let stats = null;
            const { data: statsData, error: statsError } = await supabase
              .from('machine_stats')
              .select('*')
              .eq('id_maquina', machine.id_maquina)
              .single();

            if (statsError && statsError.code === 'PGRST116') {
              // Criar registro inicial apenas uma vez
              await supabase
                .from('machine_stats')
                .insert({
                  id_maquina: machine.id_maquina,
                  velocidade: 0,
                  disponibilidade: 100,
                  produzido: 0,
                  rejeitos: 0,
                  minutos_disponivel: 0,
                  minutos_parada: 0,
                  producao_teorica: 0,
                  desempenho: 0,
                  qualidade: 0,
                  ultimo_sinal: Math.floor(Date.now() / 1000)
                });
              
              // Buscar novamente após criação
              const { data: newStats } = await supabase
                .from('machine_stats')
                .select('*')
                .eq('id_maquina', machine.id_maquina)
                .single();
              
              if (newStats) {
                stats = newStats;
              }
            } else if (statsData) {
              stats = statsData;
            }

            // Buscar machine_parameters
            let params = null;
            const { data: paramsData, error: paramsError } = await supabase
              .from('machine_parameters')
              .select('*, produto:produto(*)')
              .eq('id_maquina', machine.id_maquina)
              .single();

            if (paramsError && paramsError.code === 'PGRST116') {
              // Criar registro inicial apenas uma vez
              await supabase
                .from('machine_parameters')
                .insert({
                  id_maquina: machine.id_maquina,
                  producao_ativa: false
                });
              
              // Buscar novamente após criação
              const { data: newParams } = await supabase
                .from('machine_parameters')
                .select('*, produto:produto(*)')
                .eq('id_maquina', machine.id_maquina)
                .single();
              
              if (newParams) {
                params = newParams;
              }
            } else if (paramsData) {
              params = paramsData;
            }

            if (!stats || !params) {
              continue;
            }


            productionsData.push({
              stats,
              parameters: params,
              machine,
              grade: null,
              produto: null
            });

          } catch (machineError) {
            console.error(`Error processing machine ${machine.id_maquina}:`, machineError);
          }
        }

        if (isMounted) {
          // Preservar dados do WebSocket ao atualizar produções
          setProductions(prevProductions => {
            return productionsData.map(newProd => {
              // Procurar a produção anterior correspondente para preservar dados do WebSocket
              const prevProd = prevProductions.find(p => p.machine.id_maquina === newProd.machine.id_maquina);
              
              // Se encontrou produção anterior e ela tem dados do WebSocket, preservá-los
              if (prevProd && prevProd.websocket_data) {
                return {
                  ...newProd,
                  websocket_data: prevProd.websocket_data
                };
              }
              
              // Caso contrário, usar a nova produção sem alterações
              return newProd;
            });
          });
        }

        // ✅ DESABILITADO: Subscription máquinas filhas via Supabase - dados devem vir via SSE
        console.log('⚠️ Subscription child machines desabilitada - dados devem vir via SSE');

      } catch (err) {
        console.error('Error fetching child machines production:', err);
        setError(err instanceof Error ? err.message : 'Erro ao carregar dados de produção');
      } finally {
        setLoading(false);
      }
    };

    // Buscar dados iniciais apenas uma vez
    fetchData();

    // Configurar polling e subscriptions apenas se não estiver usando WebSocket exclusivamente
    if (!useWebSocketOnly) {
      // Polling a cada 60 segundos para machine_stats
      intervalId = setInterval(fetchData, 60000);
    }

    return () => {
      isMounted = false;
      if (subscription && !useWebSocketOnly) {
        subscription.unsubscribe();
      }
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [parentMachineId]);

  return { productions, loading, error };
} 