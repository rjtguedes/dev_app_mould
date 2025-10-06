import { useState, useEffect, useCallback } from 'react';
import { supabase, handleJWTError } from '../lib/supabase';
import type { Machine } from '../types/machine';
import debounce from 'lodash/debounce';

export function useRealtimeMachines(machineId?: number) {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [realtimeEnabled, setRealtimeEnabled] = useState(false);

  const fetchMachines = async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('Maquinas')
        .select('*')
        .eq('maquina_filha', false);

      if (machineId) {
        query = query.eq('id_maquina', machineId);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        // Verificar se é erro de JWT expirado
        const isJWTError = await handleJWTError(fetchError);
        if (isJWTError) return;
        throw fetchError;
      }
      
      setMachines(data || []);
    } catch (err) {
      console.error('Error fetching machines:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar máquinas');
    } finally {
      setLoading(false);
    }
  };

  const debouncedUpdate = useCallback(
    debounce((newMachine: Machine) => {
      if (!isUpdating && realtimeEnabled) {
        setMachines(prev => {
          const index = prev.findIndex(m => m.id_maquina === newMachine.id_maquina);
          if (index === -1) return [...prev, newMachine];
          const newMachines = [...prev];
          newMachines[index] = newMachine;
          return newMachines;
        });
      }
    }, 300),
    [isUpdating, realtimeEnabled]
  );

  useEffect(() => {
    fetchMachines();

    if (!realtimeEnabled) return;

    const subscription = supabase
      .channel('machines_changes')
      .on('postgres_changes', 
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'Maquinas',
          filter: machineId ? `id_maquina=eq.${machineId}` : undefined
        },
        (payload) => {
          debouncedUpdate(payload.new as Machine);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
      debouncedUpdate.cancel();
    };
  }, [machineId, debouncedUpdate, realtimeEnabled]);

  return { 
    machines,
    loading,
    error,
    setIsUpdating,
    refreshMachines: fetchMachines,
    realtimeEnabled,
    setRealtimeEnabled
  };
}