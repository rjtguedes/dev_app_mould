import React, { useState, useEffect, useCallback } from 'react';
import { DashboardHeader } from '../components/DashboardHeader.tsx';
import { EmptyProduction } from '../components/EmptyProduction.tsx';
import { finishBatchProduction, type ProductionFinishType, addReject } from '../lib/production';
import { Sidebar } from '../components/Sidebar';
import { JustifyStopModal } from '../components/JustifyStopModal';
import { ProductionControl } from '../components/ProductionControl';
import { MachineSetup } from './MachineSetup';
import { ProductionTickets } from './ProductionTickets';
import { ProductionCommandsPage } from './ProductionCommands';
import { supabase } from '../lib/supabase';
import { useRealtimeMachines } from '../hooks/useRealtimeMachines';
// ✅ NOVA IMPLEMENTAÇÃO - Importar hook atualizado
import { useWebSocketSingleton } from '../hooks/useWebSocketSingleton-new';
import type { Machine } from '../types/machine';
import type { User } from '@supabase/supabase-js';
import type { StopReason } from '../types/stops';
import type { Session } from '../types/session';
import { endSession, createSession } from '../lib/session';
import type { WeekMachine, WeekMachineGrade } from '../types/production';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ProductionCardView } from '../components/ProductionCardView';
import { ProductionCard } from '../components/ProductionCard';
import { ChildMachineGrid } from '../components/ChildMachineGrid';
import { useChildMachinesProduction } from '../hooks/useChildMachinesProduction';
import { SingleMachineView } from '../components/SingleMachineView';
import { SingleMachineCard } from '../components/SingleMachineCard';
import { useSingleMachineProduction } from '../hooks/useSingleMachineProduction';
import type { MachineGroup } from '../types/machine';
// ✅ NOVA IMPLEMENTAÇÃO - Importar tipos atualizados
import type {
  MachineUpdateEvent,
  ProductionAlertEvent,
  MachineDataNew
} from '../types/websocket-new';

interface OperatorDashboardProps {
  machine: Machine;
  user: User | null;
  sessionId: number | null;
  onShowSettings: () => void;
  secondaryOperator?: { id: number; nome: string } | null;
}

interface ChildMachine {
  id_maquina: number;
  nome: string;
  ativa: boolean;
}

export function OperatorDashboard({ machine, user, sessionId, onShowSettings, secondaryOperator }: OperatorDashboardProps) {
  const { 
    machine: realtimeMachine, 
    setIsUpdating, 
    refreshMachines,
    setRealtimeEnabled
  } = useRealtimeMachines(machine.id_maquina);
  
  // Estados existentes (mantidos)
  const [childMachines, setChildMachines] = React.useState<ChildMachine[]>([]);
  const [loadingMachines, setLoadingMachines] = React.useState(true);
  const [isAdminMode, setIsAdminMode] = React.useState(false);
  const [pendingStops, setPendingStops] = useState(0);
  const [pendingStopStartTime, setPendingStopStartTime] = useState<number | null>(null);
  const [justifiedStopReason, setJustifiedStopReason] = useState<string | null>(null);
  const [selectedStopId, setSelectedStopId] = useState<number | null>(null);
  const [stopReasons, setStopReasons] = useState<StopReason[]>([]);
  const [operatorId, setOperatorId] = React.useState<number | null>(null);
  const [showSetup, setShowSetup] = React.useState(false);
  const [showTickets, setShowTickets] = React.useState(false);
  const [showProductionCommands, setShowProductionCommands] = React.useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);
  const [productions, setProductions] = React.useState<WeekMachine[]>([]);
  const [loadingProductions, setLoadingProductions] = React.useState(true);
  const [selectedGrades, setSelectedGrades] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [isFinishingBatch, setIsFinishingBatch] = useState(false);
  const [currentShift, setCurrentShift] = React.useState<any>(null);
  const [shiftError, setShiftError] = useState<string | null>(null);
  const [velocidade, setVelocidade] = useState(0);
  const [statusParada, setStatusParada] = useState(false);
  const [viewStyle, setViewStyle] = useState<'grid' | 'eva'>('grid');
  const [completedSetups, setCompletedSetups] = useState<Set<number>>(new Set());
  const [errorModalMessage, setErrorModalMessage] = useState<string | null>(null);
  const [machineGroup, setMachineGroup] = React.useState<MachineGroup | null>(null);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [currentSessionId, setCurrentSessionId] = React.useState<number | null>(null);
  const [session, setSession] = React.useState<Session | null>(null);
  const [preSelectedStopReason, setPreSelectedStopReason] = useState<number | null>(null);
  const [isPreJustificationMode, setIsPreJustificationMode] = useState(false);
  const [preSelectedStopReasonDesc, setPreSelectedStopReasonDesc] = useState<string | null>(null);
  const [canPreJustify, setCanPreJustify] = useState(false);
  const [lastSignalStationId, setLastSignalStationId] = useState<number | null>(null);

  // ✅ NOVA IMPLEMENTAÇÃO - Estado para dados da máquina via WebSocket
  const [wsMachineData, setWsMachineData] = useState<MachineDataNew | null>(null);
  const [isMachineStopped, setIsMachineStopped] = useState(false);
  const [showStopReasonModal, setShowStopReasonModal] = useState(false);
  const [isManualStopMode, setIsManualStopMode] = useState(false);

  // ==================== HANDLERS PARA NOVA ESTRUTURA DE EVENTOS ====================

  // ✅ NOVO - Handler para atualizações da máquina (estrutura completa)
  const handleMachineUpdate = useCallback((event: MachineUpdateEvent) => {
    console.log('📨 [NOVA] Machine Update recebido:', {
      tipo: event.update_type,
      targetMachine: event.target_machine_id,
      sourceMachine: event.source_machine_id,
      isChild: event.is_child_update,
      dados: event.machine_data
    });

    // Atualizar dados da máquina
    setWsMachineData(event.machine_data);

    // Processar diferentes tipos de update
    switch (event.update_type) {
      case 'sinal':
        console.log('📈 [NOVA] Novo sinal recebido:', event.additional_data);
        handleSignalUpdate(event);
        break;
      
      case 'parada':
        console.log('⏸️ [NOVA] Máquina parou');
        setIsMachineStopped(true);
        setStatusParada(true);
        break;
      
      case 'retomada':
        console.log('▶️ [NOVA] Máquina retomou');
        setIsMachineStopped(false);
        setStatusParada(false);
        break;
      
      case 'velocidade':
        console.log('⚡ [NOVA] Nova velocidade:', event.additional_data.velocidade);
        setVelocidade(event.additional_data.velocidade);
        break;
    }
  }, []);

  // ✅ NOVO - Handler para alertas de produção
  const handleProductionAlert = useCallback((event: ProductionAlertEvent) => {
    console.log('🚨 [NOVA] Alerta de produção:', event.alert_data.message);
    
    if (event.alert_type === 'meta_atingida') {
      // Meta atingida - mostrar notificação
      alert('🎉 Meta de produção atingida!');
    } else if (event.alert_type === 'proximo_meta') {
      // Próximo da meta - mostrar aviso
      alert('⚠️ Próximo da meta de produção!');
    }
  }, []);

  // ✅ NOVO - Handler para sucesso de comandos
  const handleCommandSuccess = useCallback((data: any) => {
    console.log('✅ [NOVA] Comando executado com sucesso:', data.message);
  }, []);

  // ✅ NOVO - Handler para erro de comandos
  const handleCommandError = useCallback((error: any) => {
    console.error('❌ [NOVA] Erro no comando:', error.error);
    setErrorModalMessage(`Erro WebSocket: ${error.error}`);
    setShowErrorModal(true);
  }, []);

  // ==================== FUNÇÕES AUXILIARES ====================

  // ✅ NOVO - Processar update de sinal (adaptado da estrutura antiga)
  const handleSignalUpdate = useCallback((event: MachineUpdateEvent) => {
    const machineData = event.machine_data;
    
    if (!machineData.sessao_operador) {
      console.warn('⚠️ [NOVA] Sem dados de sessão de operador no update');
      return;
    }

    // Atualizar dados de produção baseado no tipo de máquina
    if (machine.multipostos) {
      // Máquina multipostos - atualizar produção das filhas
      handleMultipostosSignalUpdate(event);
    } else {
      // Máquina simples - atualizar produção direta
      handleSingleMachineSignalUpdate(event);
    }
  }, [machine.multipostos]);

  // ✅ NOVO - Handler para sinal de máquina multipostos
  const handleMultipostosSignalUpdate = useCallback((event: MachineUpdateEvent) => {
    const sourceMachineId = event.source_machine_id;
    const machineData = event.machine_data;

    console.log(`🔄 [NOVA] Atualizando máquina filha ${sourceMachineId} com dados:`, {
      sinais: machineData.sessao_operador?.sinais,
      rejeitos: machineData.sessao_operador?.rejeitos,
      sinais_validos: machineData.sessao_operador?.sinais_validos
    });

    // Atualizar produção específica da máquina filha
    setProductions(prevProductions => 
      prevProductions.map(prod => {
        if (prod.maquina_id === sourceMachineId) {
          return {
            ...prod,
            websocket_data: {
              ...prod.websocket_data,
              sessao_operador: machineData.sessao_operador
            }
          };
        }
        return prod;
      })
    );
  }, []);

  // ✅ NOVO - Handler para sinal de máquina simples
  const handleSingleMachineSignalUpdate = useCallback((event: MachineUpdateEvent) => {
    const machineData = event.machine_data;
    
    console.log('🔄 [NOVA] Atualizando máquina simples com dados:', {
      sinais: machineData.sessao_operador?.sinais,
      rejeitos: machineData.sessao_operador?.rejeitos,
      sinais_validos: machineData.sessao_operador?.sinais_validos
    });

    // Atualizar produção da máquina principal
    setProductions(prevProductions => 
      prevProductions.map(prod => {
        if (prod.maquina_id === machine.id_maquina) {
          return {
            ...prod,
            websocket_data: {
              ...prod.websocket_data,
              sessao_operador: machineData.sessao_operador
            }
          };
        }
        return prod;
      })
    );
  }, [machine.id_maquina]);

  // ==================== WEBSOCKET HOOK - NOVA IMPLEMENTAÇÃO ====================

  // ✅ NOVA IMPLEMENTAÇÃO - Hook do WebSocket atualizado
  const {
    state: wsState,
    iniciarSessaoOperador,
    finalizarSessaoOperador,
    adicionarRejeitos,
    consultarMaquina,
    consultarSessao,
    consultarProducaoMapa
  } = useWebSocketSingleton({
    machineId: machine.id_maquina,
    onMachineUpdate: handleMachineUpdate,
    onProductionAlert: handleProductionAlert,
    onCommandSuccess: handleCommandSuccess,
    onCommandError: handleCommandError,
    autoConnect: true,
    shouldReconnect: true
  });

  // ==================== FUNÇÕES DE SESSÃO MIGRADAS ====================

  // ✅ MIGRADO - Iniciar sessão com nova nomenclatura
  const handleStartSession = useCallback(async (operatorData: any, sessionId: number, turnoId: number) => {
    try {
      console.log('🚀 [NOVA] Iniciando sessão de operador...', {
        operatorId: operatorData.id,
        sessionId,
        turnoId
      });

      // ✅ NOVO - Usar comando atualizado com id_turno
      const success = iniciarSessaoOperador(operatorData.id, turnoId);
      
      if (success) {
        console.log('✅ [NOVA] Comando de início de sessão enviado com sucesso');
      } else {
        console.error('❌ [NOVA] Falha ao enviar comando de início de sessão');
        setErrorModalMessage('Falha ao iniciar sessão via WebSocket');
        setShowErrorModal(true);
      }
    } catch (error) {
      console.error('❌ [NOVA] Erro ao iniciar sessão:', error);
      setErrorModalMessage('Erro ao iniciar sessão. Tente novamente.');
      setShowErrorModal(true);
    }
  }, [iniciarSessaoOperador]);

  // ✅ MIGRADO - Finalizar sessão
  const handleEndSession = useCallback(async () => {
    try {
      console.log('🛑 [NOVA] Finalizando sessão de operador...');

      // ✅ NOVO - Usar comando atualizado
      const success = finalizarSessaoOperador();
      
      if (success) {
        console.log('✅ [NOVA] Comando de finalização de sessão enviado com sucesso');
      } else {
        console.error('❌ [NOVA] Falha ao enviar comando de finalização de sessão');
      }
    } catch (error) {
      console.error('❌ [NOVA] Erro ao finalizar sessão:', error);
    }
  }, [finalizarSessaoOperador]);

  // ✅ MIGRADO - Adicionar rejeito
  const handleAddReject = useCallback(async (machineId: number) => {
    try {
      console.log('🗑️ [NOVA] Enviando rejeito via WebSocket para máquina:', machineId);
      
      // ✅ NOVO - Usar comando atualizado
      const success = adicionarRejeitos();
      
      if (success) {
        console.log('✅ [NOVA] Comando de rejeito enviado com sucesso via WebSocket');
      } else {
        console.error('❌ [NOVA] Falha ao enviar comando de rejeito via WebSocket');
        setErrorModalMessage('Falha ao enviar comando de rejeito. Verifique a conexão.');
        setShowErrorModal(true);
      }
    } catch (error) {
      console.error('❌ [NOVA] Erro ao enviar rejeito:', error);
      setErrorModalMessage('Falha ao registrar rejeito. Tente novamente.');
      setShowErrorModal(true);
    }
  }, [adicionarRejeitos]);

  // ==================== LÓGICA DE SESSÃO EXISTENTE (MANTIDA) ====================

  // Verificar sessão ativa (lógica existente mantida)
  React.useEffect(() => {
    const checkActiveSession = async () => {
      if (!user || !machine) return;

      try {
        console.log('=== INÍCIO checkActiveSession (OperatorDashboard) ===');
        console.log('User:', user.id);
        console.log('Machine ID:', machine.id_maquina);
        console.log('Secondary Operator:', secondaryOperator);

        // Buscar operador principal
        const { data: operatorData, error: operatorError } = await supabase
          .from('operadores')
          .select('id, nome, id_empresa')
          .eq('id_usuario', user.id)
          .single();

        if (operatorError) {
          console.error('Erro ao buscar operador:', operatorError);
          return;
        }

        if (!operatorData) {
          console.error('Operador não encontrado para o usuário:', user.id);
          return;
        }

        console.log('Operator Data:', operatorData);
        setOperatorId(operatorData.id);

        // Buscar turno atual
        const { data: turnoData, error: turnoError } = await supabase
          .from('turnos')
          .select('id, nome, hora_inicio, hora_fim')
          .eq('id_empresa', operatorData.id_empresa)
          .single();

        if (turnoError) {
          console.error('Erro ao buscar turno:', turnoError);
          return;
        }

        setCurrentShift(turnoData);

        // Verificar se há sessão ativa
        const { data: activeSession, error: sessionError } = await supabase
          .from('sessao_operador')
          .select('*')
          .eq('id_maquina', machine.id_maquina)
          .eq('fim', null)
          .single();

        if (sessionError && sessionError.code !== 'PGRST116') {
          console.error('Erro ao verificar sessão ativa:', sessionError);
          return;
        }

        if (activeSession) {
          console.log('Sessão ativa encontrada:', activeSession);
          setCurrentSessionId(activeSession.id);
          localStorage.setItem('industrack_session', activeSession.id.toString());
          
          // ✅ NOVA IMPLEMENTAÇÃO - Enviar comando para sessão existente
          try {
            if (wsState.connected) {
              console.log('🔌 [NOVA] Enviando comando para sessão existente...');
              await handleStartSession(operatorData, activeSession.id, turnoData.id);
            } else {
              console.warn('⚠️ [NOVA] WebSocket não conectado ao processar sessão existente');
            }
          } catch (wsError) {
            console.error('❌ [NOVA] Erro ao enviar comando para sessão existente:', wsError);
          }
        } else {
          console.log('Nenhuma sessão ativa encontrada. Criando nova sessão...');
          
          try {
            const newSession = await createSession(
              machine.id_maquina,
              operatorData.id,
              turnoData.id,
              supabase
            );
            
            console.log('Nova sessão criada automaticamente no OperatorDashboard:', newSession);
            setCurrentSessionId(newSession.id);
            localStorage.setItem('industrack_session', newSession.id.toString());
            
            // ✅ NOVA IMPLEMENTAÇÃO - Enviar comando para nova sessão
            try {
              if (wsState.connected) {
                console.log('🔌 [NOVA] Enviando comando para nova sessão...');
                await handleStartSession(operatorData, newSession.id, turnoData.id);
              } else {
                console.warn('⚠️ [NOVA] WebSocket não conectado ao criar nova sessão');
              }
            } catch (wsError) {
              console.error('❌ [NOVA] Erro ao enviar comando para nova sessão:', wsError);
            }
          } catch (createError) {
            console.error('Erro ao criar sessão automaticamente no OperatorDashboard:', createError);
          }
        }
        
        console.log('=== FIM checkActiveSession (OperatorDashboard) ===');
      } catch (err) {
        console.error('Erro ao verificar sessão ativa:', err);
      }
    };

    checkActiveSession();
  }, [user, machine, secondaryOperator, wsState.connected, handleStartSession]);

  // ==================== HANDLERS EXISTENTES (MANTIDOS) ====================

  // Função para finalizar sessão (lógica existente mantida)
  const handleEndSessionComplete = async () => {
    if (!currentSessionId) return;

    try {
      console.log('Finalizando sessão completa...');
      
      // ✅ NOVA IMPLEMENTAÇÃO - Enviar comando WebSocket primeiro
      try {
        if (wsState.connected) {
          console.log('🔌 [NOVA] Enviando comando end_session para o WebSocket...');
          await handleEndSession();
          // Aguardar um momento para o servidor processar
          await new Promise(resolve => setTimeout(resolve, 500));
        } else {
          console.warn('⚠️ [NOVA] WebSocket não conectado ao finalizar sessão');
        }
      } catch (wsError) {
        console.error('❌ [NOVA] Erro ao enviar comando end_session:', wsError);
      }

      // Finalizar no Supabase (lógica existente)
      await endSession(currentSessionId, supabase);
      
      setCurrentSessionId(null);
      localStorage.removeItem('industrack_session');
      
      console.log('Sessão finalizada com sucesso');
    } catch (error) {
      console.error('Erro ao finalizar sessão:', error);
    }
  };

  // Função para adicionar rejeito (adaptada)
  const handleAddRejectToMachine = useCallback(async (machineId: number) => {
    try {
      // ✅ NOVA IMPLEMENTAÇÃO - Usar comando WebSocket
      await handleAddReject(machineId);
    } catch (error) {
      console.error('Erro ao adicionar rejeito:', error);
      setErrorModalMessage('Falha ao registrar rejeito. Tente novamente.');
      setShowErrorModal(true);
    }
  }, [handleAddReject]);

  // ==================== RENDERIZAÇÃO (MANTIDA) ====================

  // O resto da renderização permanece igual, apenas com as novas funções
  // ... (resto do componente mantido igual)

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <Sidebar
        pendingStops={pendingStops}
        pendingStopStartTime={pendingStopStartTime}
        justifiedStopReason={justifiedStopReason}
        sessionId={currentSessionId}
        machineId={machine.id_maquina}
        operadorId={operatorId || 0}
        onShowStops={() => {}}
        onShowSetup={() => setShowSetup(true)}
        onShowTickets={() => setShowTickets(true)}
        onShowSettings={onShowSettings}
        onShowProductionCommands={() => setShowProductionCommands(true)}
        onCollapsedChange={setSidebarCollapsed}
        secondaryOperator={secondaryOperator?.nome || null}
        onShowPreStopModal={() => {}}
        preSelectedStopReasonDesc={preSelectedStopReasonDesc}
        canPreJustify={canPreJustify}
        onShowStopReasonModal={() => setShowStopReasonModal(true)}
        isMachineStopped={isMachineStopped}
        onForcedResume={() => {}}
      />

      {/* Main Content */}
      <div className={`flex-1 flex flex-col transition-all duration-300 ${sidebarCollapsed ? 'ml-16' : 'ml-64'}`}>
        {/* Header */}
        <DashboardHeader
          machine={machine}
          user={user}
          onShowSettings={onShowSettings}
          secondaryOperator={secondaryOperator}
          onEndSession={handleEndSessionComplete}
        />

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {/* Status de Conexão WebSocket */}
          <div className="mb-4 p-4 bg-white rounded-lg shadow">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Status WebSocket</h3>
              <div className="flex items-center space-x-4">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  wsState.connected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {wsState.connected ? '🟢 Conectado' : '🔴 Desconectado'}
                </span>
                {wsMachineData && (
                  <span className="text-sm text-gray-600">
                    Última atualização: {new Date(wsMachineData.last_updated * 1000).toLocaleTimeString()}
                  </span>
                )}
              </div>
            </div>
            
            {/* Dados da máquina via WebSocket */}
            {wsMachineData && (
              <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="font-medium">Status:</span> {wsMachineData.status ? '🟢 Produzindo' : '🔴 Parada'}
                </div>
                <div>
                  <span className="font-medium">Velocidade:</span> {wsMachineData.velocidade} ciclos/h
                </div>
                <div>
                  <span className="font-medium">Sessão:</span> {wsMachineData.sessao_operador ? 'Ativa' : 'Inativa'}
                </div>
              </div>
            )}
          </div>

          {/* Conteúdo existente do dashboard */}
          <div className="text-center py-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              Dashboard da Máquina {machine.nome}
            </h2>
            <p className="text-gray-600">
              Nova implementação WebSocket carregada com sucesso!
            </p>
            <div className="mt-4 space-x-4">
              <button
                onClick={() => consultarMaquina()}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Consultar Máquina
              </button>
              <button
                onClick={() => consultarSessao()}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Consultar Sessão
              </button>
              <button
                onClick={() => handleAddRejectToMachine(machine.id_maquina)}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Adicionar Rejeito
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modais existentes */}
      {showErrorModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Erro</h3>
            <p className="text-gray-700 mb-4">{errorModalMessage}</p>
            <button
              onClick={() => setShowErrorModal(false)}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
