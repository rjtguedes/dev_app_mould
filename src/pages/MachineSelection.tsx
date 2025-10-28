import React from 'react';
import { useState, useEffect } from 'react';
import { Loader2, Power, Gauge, Box, RefreshCcw } from 'lucide-react';
import { OperatorDashboard } from './OperatorDashboard';
import { TestSSEInline } from './TestSSEInline';
import { useRealtimeMachines } from '../hooks/useRealtimeMachines';
import { supabase } from '../lib/supabase';
import { getMacAddress } from '../lib/device';
import { createSession, updateMachineParameters } from '../lib/session';
import type { Machine } from '../types/machine';
import type { User } from '@supabase/supabase-js';

interface MachineSelectionProps {
  initialMachine: Machine;
  onShowSettings: () => void;
  secondaryOperator?: { id: number; nome: string } | null;
  operator?: { id_operador: number; nome: string } | null; // ✅ NOVO: Dados do operador da API REST
}

export function MachineSelection({ initialMachine, onShowSettings, secondaryOperator, operator }: MachineSelectionProps) {
  const [selectionError, setSelectionError] = useState<string | null>(null);
  const [selectedMachine, setSelectedMachine] = useState<Machine>(initialMachine);
  const [user, setUser] = useState<User | null>(null);
  const [operatorId, setOperatorId] = useState<number | null>(null);
  const [showAllMachines, setShowAllMachines] = useState(false);
  const [currentShift, setCurrentShift] = useState<any>(null);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [macAddress, setMacAddress] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [lastUsedMachine, setLastUsedMachine] = useState<Machine | null>(null);
  const [isAdminMode, setIsAdminMode] = useState<boolean | undefined>(undefined);

  const { machines: realtimeMachines, loading: loadingMachines, error: machinesError } = useRealtimeMachines();

  // Log quando sessionId mudar
  React.useEffect(() => {
    console.log('MachineSelection - sessionId atualizado:', sessionId);
  }, [sessionId]);

  // Log quando selectedMachine mudar
  React.useEffect(() => {
    console.log('MachineSelection - selectedMachine atualizado:', selectedMachine);
  }, [selectedMachine]);

  // Log para debug do secondaryOperator
  React.useEffect(() => {
    console.log('=== MachineSelection - secondaryOperator ===');
    console.log('secondaryOperator recebido:', secondaryOperator);
    console.log('Tipo:', typeof secondaryOperator);
    console.log('ID:', secondaryOperator?.id);
    console.log('Nome:', secondaryOperator?.nome);
  }, [secondaryOperator]);

  useEffect(() => {
    async function loadMacAddress() {
      const mac = await getMacAddress();
      setMacAddress(mac);
    }
    loadMacAddress();
  }, []);

  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser();
      console.log('Usuário carregado:', user);
      setUser(user);
    }
    loadUser();
  }, []);

  // Recuperar sessão do localStorage
  useEffect(() => {
    const savedSessionId = localStorage.getItem('industrack_session');
    if (savedSessionId) {
      console.log('Sessão encontrada no localStorage:', savedSessionId);
      setSessionId(parseInt(savedSessionId));
    }
  }, []);

  // Função para buscar o turno atual
  const fetchCurrentShift = async (machineId: number) => {
    try {
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

      console.log(`Carregando turno para máquina: ${machineId}`);
      console.log(`Hora atual: ${currentHour}:${currentMinute} Dia da semana: ${currentDay}`);

      // 1. Buscar o grupo da máquina
      const { data: machineData, error: machineError } = await supabase
        .from('Maquinas')
        .select('grupo')
        .eq('id_maquina', machineId)
        .single();

      if (machineError) {
        console.error('Erro ao buscar grupo da máquina:', machineError);
        return null;
      }

      const machineGroupId = machineData?.grupo;

      // 2. Buscar turnos associados à máquina ou ao seu grupo
      const { data: maquinasTurnoData, error: maquinasTurnoError } = await supabase
        .from('maquinas_turno')
        .select('id_turno, turnos (id, hora_inicio, hora_fim, descricao, dias_semana)')
        .or(`id_maquina.eq.${machineId},id_grupo.eq.${machineGroupId}`);

      if (maquinasTurnoError) {
        console.error('Erro ao buscar maquinas_turno:', maquinasTurnoError);
        return null;
      }

      if (!maquinasTurnoData || maquinasTurnoData.length === 0) {
        console.log('Nenhum turno configurado para esta máquina ou grupo.');
        return null;
      }

      let foundShift = null;

      for (const mt of maquinasTurnoData) {
        const shift = mt.turnos;
        if (!shift) continue;

        // Verificar se o dia da semana corresponde
        const diasSemana = shift.dias_semana;
        const isDayMatch = diasSemana === null || diasSemana.length === 0 || diasSemana.includes(currentDay);
        
        console.log(`Turno: ${shift.descricao}, Dias da semana: ${diasSemana}, Dia atual: ${currentDay}, Match: ${isDayMatch}`);

        if (isDayMatch) {
          // Parsear horas de início e fim
          const [startHour, startMinute] = shift.hora_inicio.split(':').map(Number);
          const [endHour, endMinute] = shift.hora_fim.split(':').map(Number);

          // Criar objetos Date para comparação (apenas com hora e minuto)
          const startTime = new Date();
          startTime.setHours(startHour, startMinute, 0, 0);
          const endTime = new Date();
          endTime.setHours(endHour, endMinute, 0, 0);
          const currentTime = new Date();
          currentTime.setHours(currentHour, currentMinute, 0, 0);

          console.log(`Verificando turno: ${shift.descricao} (${shift.hora_inicio} - ${shift.hora_fim})`);
          console.log(`Hora atual: ${currentHour}:${currentMinute}`);
          console.log(`Início: ${startHour}:${startMinute}, Fim: ${endHour}:${endMinute}`);

          // Lógica para turnos que viram a noite (ex: 22:00 - 06:00)
          if (startTime.getTime() > endTime.getTime()) {
            // Turno vira a noite
            const isActive = currentTime.getTime() >= startTime.getTime() || currentTime.getTime() <= endTime.getTime();
            console.log(`Turno noturno (${shift.descricao}), ativo: ${isActive}`);
            if (isActive) {
              foundShift = shift;
              break;
            }
          } else {
            // Turno no mesmo dia
            const isActive = currentTime.getTime() >= startTime.getTime() && currentTime.getTime() <= endTime.getTime();
            console.log(`Turno diurno (${shift.descricao}), ativo: ${isActive}`);
            if (isActive) {
              foundShift = shift;
              break;
            }
          }
        }
      }

      if (foundShift) {
        console.log('Turno atual encontrado:', foundShift.descricao, foundShift.id);
        setCurrentShift(foundShift);
        return foundShift;
      } else {
        console.log('Nenhum turno ativo encontrado para a hora e dia atuais - enviando null');
        setCurrentShift(null);
        return null;
      }

    } catch (error) {
      console.error('Erro ao buscar turno atual:', error);
      return null;
    }
  };

  // Verificar modo admin ANTES de qualquer criação de sessão
  useEffect(() => {
    const checkAdminMode = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          // Buscar o operador associado ao usuário
          const { data: operatorData, error: operatorError } = await supabase
            .from('operador')
            .select('id')
            .eq('user', user.id)
            .eq('Delete', false)
            .single();

          if (!operatorError && operatorData) {
            // Verificar se este operador tem o PIN 5777
            const { data: fastAccessData, error: fastAccessError } = await supabase
              .from('operator_fast_acess')
              .select('PIN')
              .eq('operador', operatorData.id)
              .eq('PIN', 5777)
              .single();

            if (!fastAccessError && fastAccessData) {
              console.log('Modo admin detectado ANTES da verificação de sessão');
              setIsAdminMode(true);
            }
          }
        }
      } catch (err) {
        console.error('Erro ao verificar modo admin:', err);
      }
    };

    checkAdminMode();
  }, []); // Executar apenas uma vez ao montar o componente

  // Verificar sessão ativa APENAS se não for modo admin
  useEffect(() => {
    // Se ainda não verificou o modo admin, aguardar
    if (isAdminMode === undefined) {
      console.log('Aguardando verificação de modo admin...');
      return;
    }

    const checkActiveSession = async () => {
      console.log('=== checkActiveSession executando ===');
      console.log('isAdminMode:', isAdminMode);
      console.log('operatorId:', operatorId);
      
      // Se for modo admin, não verificar sessão
      if (isAdminMode) {
        console.log('Modo admin ativo - pulando verificação de sessão COMPLETAMENTE');
        return;
      }

      console.log('Modo normal - verificando sessão ativa...');

      // Se não for admin, verificar se há operatorId
      if (!operatorId) {
        console.log('Sem operatorId - aguardando...');
        return;
      }

      try {
        // Verificar se há sessão ativa para este operador
        const { data: sessions, error } = await supabase
          .from('sessoes')
          .select('id, created_at, maquina, operador, inicio, fim, turno')
          .eq('operador', operatorId)
          .is('fim', null)
          .order('created_at', { ascending: false })
          .limit(1);

        if (error) {
          console.error('Erro ao verificar sessão ativa:', error);
          return;
        }

        if (!sessions || sessions.length === 0) {
          // Não há sessão ativa, deslogar automaticamente
          console.log('Nenhuma sessão ativa encontrada, deslogando automaticamente...');
          await supabase.auth.signOut();
          window.location.reload();
        } else {
          const session = sessions[0];
          console.log('Sessão ativa encontrada no banco:', session);
          setSessionId(session.id);
          localStorage.setItem('industrack_session', session.id.toString());
        }
      } catch (err) {
        console.error('Erro ao verificar sessão ativa:', err);
      }
    };

    checkActiveSession();
  }, [isAdminMode, operatorId]); // Executar quando isAdminMode ou operatorId mudar

  // ✅ NOVO: Usar dados do operador da API REST
  useEffect(() => {
    if (operator) {
      console.log('✅ Usando operador da API REST:', operator);
      setOperatorId(operator.id_operador);
    } else {
      // ⚠️ Fallback para modo admin (Supabase)
      async function loadOperatorFromSupabase() {
        if (!user) return;
        
        try {
          console.log('⚠️ Fallback: Buscando operador no Supabase para usuário:', user.id);
          const { data, error } = await supabase
            .from('operador')
            .select('id')
            .eq('user', user.id)
            .eq('Delete', false)
            .single();

          if (error) {
            console.error('Erro ao buscar operador:', error);
            throw error;
          }
          
          if (data) {
            setOperatorId(data.id);
          } else {
            console.log('Nenhum operador encontrado para o usuário');
          }
        } catch (err) {
          console.error('Error loading operator:', err);
          setSelectionError('Erro ao carregar operador');
        }
      }

      loadOperatorFromSupabase();
    }
  }, [operator, user]);

  // Carregar máquinas e definir última máquina usada
  useEffect(() => {
    if (realtimeMachines.length > 0) {
      setMachines(realtimeMachines);
      setLastUsedMachine(initialMachine);
      setLoading(false);
    }
  }, [realtimeMachines, initialMachine]);

  // Definir loading baseado no estado das máquinas
  useEffect(() => {
    setLoading(loadingMachines);
  }, [loadingMachines]);

  // Definir error baseado no estado das máquinas
  useEffect(() => {
    setError(machinesError);
  }, [machinesError]);

  const handleMachineSelection = async (machine: Machine) => {
    setSelectedMachine(machine);
    setSelectionError(null);
    setLoadingSession(true);

    // Recarregar o turno para a máquina selecionada
    const shift = await fetchCurrentShift(machine.id_maquina);

    // Se estiver no modo admin, não criar sessão e ir direto para o dashboard
    if (isAdminMode) {
      console.log('Modo admin ativo - não criando sessão, indo direto para o dashboard');
      setLoadingSession(false);
      return; // Retorna aqui, permitindo que o dashboard seja renderizado
    }

    // Verificar se já existe uma sessão ativa para este operador e máquina
    if (operatorId) {
      try {
        const { data: sessions, error } = await supabase
          .from('sessoes')
          .select('id, created_at, maquina, operador, inicio, fim, turno')
          .eq('operador', operatorId)
          .eq('maquina', machine.id_maquina)
          .is('fim', null)
          .order('created_at', { ascending: false })
          .limit(1);

        if (error) {
          console.error('Erro ao verificar sessão ativa:', error);
          setSelectionError('Erro ao verificar sessão ativa.');
          setLoadingSession(false);
          return;
        }

        if (sessions && sessions.length > 0) {
          const session = sessions[0];
          console.log('Sessão ativa encontrada no banco:', session);
          setSessionId(session.id);
          localStorage.setItem('industrack_session', session.id.toString());
        } else {
          console.log('Nenhuma sessão ativa encontrada no banco - aguardando criação pelo OperatorDashboard');
          // NÃO criar sessão aqui - deixar o OperatorDashboard fazer isso
          // Apenas aguardar que uma sessão seja criada automaticamente
        }
      } catch (err) {
        console.error('Erro ao selecionar máquina e verificar sessão:', err);
        setSelectionError('Erro ao verificar sessão.');
      } finally {
        setLoadingSession(false);
      }
      } else {
      setLoadingSession(false);
    }
  };

  // Show dashboard if machine is selected
  if (selectedMachine) {
    return (
      <>
        <OperatorDashboard 
          machine={selectedMachine} 
          user={user}
          sessionId={isAdminMode ? null : sessionId} // Para admin, sempre null
          onShowSettings={onShowSettings}
          secondaryOperator={secondaryOperator}
          operator={operator} // ✅ NOVO: Passando dados do operador da API REST
        />
        
        {/* 🧪 Teste SSE Inline */}
        <TestSSEInline machineId={selectedMachine.id_maquina} />
      </>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-900 flex items-center justify-center">
        <div className="flex items-center gap-3 text-white">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Carregando máquinas...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-900 p-6">
      <header className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Selecione a Máquina</h1>
          <div className="flex flex-col gap-1">
            <p className="text-blue-200">Escolha a máquina para iniciar a operação</p>
            <p className="text-blue-300 text-sm font-mono">MAC: {macAddress}</p>
          </div>
        </div>
        <Box className="w-12 h-12 text-white opacity-80" />
      </header>

      {error || selectionError ? (
        <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 text-white mb-6">
          {error || selectionError}
        </div>
      ) : null}

      {!showAllMachines && lastUsedMachine ? (
        <div className="max-w-lg mx-auto">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 text-left border border-white/20">
            <div className="text-center mb-4">
              <h2 className="text-xl font-semibold text-white">Última Máquina Utilizada</h2>
              <p className="text-blue-200 text-sm mt-1">Deseja continuar com esta máquina?</p>
            </div>

            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-2xl font-bold text-white">{lastUsedMachine.nome}</h3>
                  {lastUsedMachine.referencia && (
                    <p className="text-blue-200">Ref: {lastUsedMachine.referencia}</p>
                  )}
                </div>
                <div className={`rounded-full p-2 ${lastUsedMachine.ativa ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                  <Power className={`w-6 h-6 ${lastUsedMachine.ativa ? 'text-green-400' : 'text-red-400'}`} />
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Gauge className="w-5 h-5 text-blue-300" />
                  <span className="text-blue-100">{lastUsedMachine.velocidade_atual || 0} RPM</span>
                </div>
                {lastUsedMachine.multipostos && (
                  <div className="flex items-center gap-2">
                    <Box className="w-5 h-5 text-blue-300" />
                    <span className="text-blue-100">{lastUsedMachine.quantidade_estacoes} estações</span>
                  </div>
                )}
              </div>

              <div className="flex gap-4 mt-6">
                <button
                  onClick={() => handleMachineSelection(lastUsedMachine)}
                  className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg
                           transition-colors duration-200"
                >
                  Continuar
                </button>
                <button
                  onClick={() => setShowAllMachines(true)}
                  className="flex-1 bg-white/10 hover:bg-white/20 text-white py-2 px-4 rounded-lg
                           transition-colors duration-200 flex items-center justify-center gap-2"
                >
                  <RefreshCcw className="w-4 h-4" />
                  Trocar Máquina
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {machines.map((machine) => (
            <button
              key={machine.id_maquina}
              onClick={() => handleMachineSelection(machine)}
              className="bg-white/10 backdrop-blur-sm rounded-xl p-6 text-left transition-all duration-200 
                       hover:bg-white/20 hover:scale-102 border border-white/10 group"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-xl font-semibold text-white mb-1">{machine.nome}</h2>
                  {machine.referencia && (
                    <p className="text-blue-200 text-sm">Ref: {machine.referencia}</p>
                  )}
                </div>
                <div className={`rounded-full p-2 ${machine.ativa ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                  <Power className={`w-5 h-5 ${machine.ativa ? 'text-green-400' : 'text-red-400'}`} />
                </div>
              </div>

              <div className="flex items-center gap-6 mt-4">
                <div className="flex items-center gap-2">
                  <Gauge className="w-5 h-5 text-blue-300" />
                  <span className="text-blue-100">{machine.velocidade_atual || 0} RPM</span>
                </div>
                {machine.multipostos && (
                  <div className="flex items-center gap-2">
                    <Box className="w-5 h-5 text-blue-300" />
                  <span className="text-blue-100">{machine.quantidade_estacoes} estações</span>
                </div>
              )}
            </div>

            {machine.oee && (
              <div className="mt-4 pt-4 border-t border-white/10">
                <div className="text-sm text-blue-200">Performance OEE</div>
                <div className="w-full bg-white/10 rounded-full h-2 mt-2">
                  <div
                    className="bg-blue-400 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${(machine.oee.performance || 0) * 100}%` }}
                  />
                </div>
              </div>
            )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}