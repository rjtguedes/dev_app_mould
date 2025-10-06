import React, { useState, useEffect } from 'react';
import { ArrowLeft, Box, AlertCircle, Power, Gauge } from 'lucide-react';
import { useRealtimeMachines } from '../hooks/useRealtimeMachines';
import { getDeviceId } from '../lib/device';
import type { Machine } from '../types/machine';
import { supabase } from '../lib/supabase';

interface SettingsProps {
  onBack: () => void;
  onMachineSelect: (machine: Machine) => void;
}

interface Parameter {
  id: number;
  descricao: string;
  valor: number;
  unidade: string;
}

export function Settings({ onBack, onMachineSelect }: SettingsProps) {
  const { machines, loading: loadingMachines, error: machinesError } = useRealtimeMachines();
  const [deviceId, setDeviceId] = React.useState<string>('');
  const [parameters, setParameters] = useState<Parameter[]>([]);
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Novo: Buscar velocidade da machine_stats
  const [machineStats, setMachineStats] = useState<Record<number, number>>({}); // id_maquina -> velocidade

  React.useEffect(() => {
    async function loadDeviceId() {
      try {
        const id = await getDeviceId();
        setDeviceId(id);
      } catch (err) {
        console.error('Error getting device id:', err);
      }
    }
    loadDeviceId();
  }, []);

  useEffect(() => {
    async function loadParameters() {
      if (!selectedMachine) return;
      
      try {
        setLoading(true);
        setError(null);

        const { data, error } = await supabase
          .from('machine_parameters')
          .select(`
            id_maquina,
            operador,
            sessao,
            produto,
            semana_maquina,
            grade_semana_maquina,
            estacoes,
            id_matriz
          `)
          .eq('id_maquina', selectedMachine.id_maquina);

        if (error) throw error;
        setParameters(data || []);
      } catch (err) {
        console.error('Error loading parameters:', err);
        setError('Erro ao carregar parâmetros');
      } finally {
        setLoading(false);
      }
    }

    loadParameters();
  }, [selectedMachine?.id_maquina]);

  useEffect(() => {
    async function fetchStats() {
      if (!machines || machines.length === 0) return;
      try {
        const ids = machines.map(m => m.id_maquina);
        const { data, error } = await supabase
          .from('machine_stats')
          .select('id_maquina, velocidade')
          .in('id_maquina', ids);
        if (error) throw error;
        const statsMap: Record<number, number> = {};
        (data || []).forEach((row: any) => {
          statsMap[row.id_maquina] = row.velocidade;
        });
        setMachineStats(statsMap);
      } catch (err) {
        console.error('Erro ao buscar stats das máquinas:', err);
      }
    }
    fetchStats();
  }, [machines]);

  // Pooling para machine_stats a cada 60 segundos
  useEffect(() => {
    if (!machines || machines.length === 0) return;
    
    let intervalId: NodeJS.Timeout;
    
    const fetchStats = async () => {
      try {
        const ids = machines.map(m => m.id_maquina);
        const { data, error } = await supabase
          .from('machine_stats')
          .select('id_maquina, velocidade')
          .in('id_maquina', ids);
        if (error) throw error;
        const statsMap: Record<number, number> = {};
        (data || []).forEach((row: any) => {
          statsMap[row.id_maquina] = row.velocidade;
        });
        setMachineStats(statsMap);
      } catch (err) {
        console.error('Erro ao buscar stats das máquinas:', err);
      }
    };
    
    // Pooling a cada 60 segundos
    intervalId = setInterval(fetchStats, 60000);
    
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [machines]);

  const handleUpdateParameter = async (parameterId: number, newValue: number) => {
    try {
      setError(null);
      
      const { error } = await supabase
        .from('parametros_maquina')
        .update({ valor: newValue })
        .eq('id', parameterId);

      if (error) throw error;

      setParameters(prev => 
        prev.map(param => 
          param.id === parameterId 
            ? { ...param, valor: newValue }
            : param
        )
      );
    } catch (err) {
      console.error('Error updating parameter:', err);
      setError('Erro ao atualizar parâmetro');
    }
  };

  const handleMachineSelect = async (machine: Machine) => {
    setSelectedMachine(machine);
    try {
      if (!deviceId) return;
      // Atualiza o device_machine no Supabase para associar o novo id_maquina ao device_id atual
      const { data: existingDevice } = await supabase
        .from('device_machine')
        .select('id')
        .eq('device_id', deviceId)
        .single();

      if (existingDevice?.id) {
        // Atualiza o registro existente
        const { error } = await supabase
          .from('device_machine')
          .update({ id_maquina: machine.id_maquina, active: true })
          .eq('device_id', deviceId);
        if (error) throw error;
      } else {
        // Cria novo registro
        const { error } = await supabase
          .from('device_machine')
          .insert({ device_id: deviceId, id_maquina: machine.id_maquina, active: true });
        if (error) throw error;
      }
    } catch (err) {
      setError('Erro ao atualizar máquina no dispositivo');
      console.error('Erro ao atualizar máquina no dispositivo:', err);
    }
    onMachineSelect(machine);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900">
      <nav className="bg-white/10 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            >
              <ArrowLeft className="w-6 h-6 text-white" />
            </button>
            <h1 className="text-xl font-bold text-white">Configurações</h1>
          </div>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto p-4">
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 mb-6 border border-white/10">
          <h2 className="text-xl font-semibold text-white mb-2">Identificação do Dispositivo</h2>
          <p className="text-blue-200 font-mono">{deviceId}</p>
        </div>

        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-white">Selecionar Máquina</h2>
          
          {loadingMachines ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
            </div>
          ) : machinesError ? (
            <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-6 text-white">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-5 h-5" />
                <h2 className="font-semibold">Erro ao carregar máquinas</h2>
              </div>
              <p>{machinesError}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {machines?.map((machine) => (
                <button
                  key={machine.id_maquina}
                  onClick={() => handleMachineSelect(machine)}
                  className="bg-white/10 backdrop-blur-sm rounded-xl p-6 text-left transition-all duration-200 
                           hover:bg-white/20 border border-white/10 group"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-semibold text-white mb-1">{machine.nome}</h3>
                      {machine.referencia && (
                        <p className="text-blue-200 text-sm">Ref: {machine.referencia}</p>
                      )}
                    </div>
                    <div className={`rounded-full p-2 ${machine.ativa ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                      <Power className={`w-5 h-5 ${machine.ativa ? 'text-green-400' : 'text-red-400'}`} />
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                      <Gauge className="w-5 h-5 text-blue-300" />
                      <span className="text-blue-100">{machineStats[machine.id_maquina] ?? 0} RPM</span>
                    </div>
                    {machine.multipostos && (
                      <div className="flex items-center gap-2">
                        <Box className="w-5 h-5 text-blue-300" />
                        <span className="text-blue-100">{machine.quantidade_estacoes} estações</span>
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {selectedMachine && (
          <div className="mt-8 space-y-6">
            <h2 className="text-xl font-semibold text-white">Parâmetros da Máquina</h2>
            
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
              </div>
            ) : error ? (
              <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-6 text-white">
                <p>{error}</p>
              </div>
            ) : parameters.length === 0 ? (
              <div className="text-white/60 text-center py-8">
                Nenhum parâmetro encontrado para esta máquina
              </div>
            ) : (
              <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/10">
                {parameters.map(param => (
                  <div 
                    key={param.id}
                    className="p-4 border-b border-white/10 last:border-0"
                  >
                    {/* ... conteúdo do parâmetro ... */}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}