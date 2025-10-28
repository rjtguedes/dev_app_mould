import React, { useState, useEffect, useCallback } from 'react';
import { AlertCircle } from 'lucide-react';
import { DashboardHeader } from '../components/DashboardHeader.tsx';
import { EmptyProduction } from '../components/EmptyProduction.tsx';
import { finishBatchProduction, type ProductionFinishType, addReject } from '../lib/production';
import { Sidebar } from '../components/Sidebar';
import { JustifyStopModal } from '../components/JustifyStopModal';
import { ProductionControl } from '../components/ProductionControl';
import { WebSocketStorageDebug } from '../components/WebSocketStorageDebug';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { ProductionCommandsPage } from './ProductionCommands';
import { supabase } from '../lib/supabase';
import { useRealtimeMachines } from '../hooks/useRealtimeMachines';
import { useSSEManager } from '../hooks/useSSEManager';
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
import { SingleMachineViewNew } from '../components/SingleMachineView-new';
import { webSocketManager } from '../hooks/useWebSocketManager';
// ✅ REMOVIDO: import { useSingleMachineProduction } - não mais necessário
import type { MachineGroup } from '../types/machine';
import type {
  SignalEvent,
  RejectEvent,
  VelocityEvent,
  StopEvent,
  ResumeEvent,
  StartSessionAckEvent,
  EndSessionAckEvent,
  ErrorEvent,
  MachineDataEvent
} from '../types/websocket';

interface OperatorDashboardProps {
  machine: Machine;
  user: User | null;
  sessionId: number | null;
  onShowSettings: () => void;
  secondaryOperator?: { id: number; nome: string } | null;
  operator?: { id_operador: number; nome: string } | null; // ✅ NOVO: Dados do operador da API REST
}

interface ChildMachine {
  id_maquina: number;
  nome: string;
  ativa: boolean;
}

export function OperatorDashboard({ machine, user, sessionId, onShowSettings, secondaryOperator, operator }: OperatorDashboardProps) {
  const { 
    machine: realtimeMachine, 
    setIsUpdating, 
    refreshMachines,
    setRealtimeEnabled  // Novo
  } = useRealtimeMachines(machine.id_maquina);
  const [childMachines, setChildMachines] = React.useState<ChildMachine[]>([]);
  const [loadingMachines, setLoadingMachines] = React.useState(true);
  const [isAdminMode, setIsAdminMode] = React.useState(false);

  // Estados para paradas
  const [pendingStops, setPendingStops] = useState(0);
  const [pendingStopStartTime, setPendingStopStartTime] = useState<number | null>(null);
  const [justifiedStopReason, setJustifiedStopReason] = useState<string | null>(null);
  const [selectedStopId, setSelectedStopId] = useState<number | null>(null);
  const [stopReasons, setStopReasons] = useState<StopReason[]>([]);
  const [operatorId, setOperatorId] = React.useState<number | null>(null);
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

  // Estado para pré-justificação de paradas
  const [preSelectedStopReason, setPreSelectedStopReason] = useState<number | null>(null);
  const [isPreJustificationMode, setIsPreJustificationMode] = useState(false);
  const [preSelectedStopReasonDesc, setPreSelectedStopReasonDesc] = useState<string | null>(null);
  const [canPreJustify, setCanPreJustify] = useState(false);
  
  // Estado para rastrear a última estação que recebeu sinal
  const [lastSignalStationId, setLastSignalStationId] = useState<number | null>(null);
  
  // ✅ NOVO: Estado para debug do armazenamento WebSocket
  const [showWebSocketDebug, setShowWebSocketDebug] = useState(false);
  
  // Estado para controlar se devemos tentar reconectar ao WebSocket
  const [shouldReconnect, setShouldReconnect] = useState(true);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  
  // Estado para controlar se a máquina está parada (para alternar botão)
  const [isMachineStopped, setIsMachineStopped] = useState(false);
  
  // Estado para controlar modal de motivos de parada
  const [showStopReasonModal, setShowStopReasonModal] = useState(false);
  const [isManualStopMode, setIsManualStopMode] = useState(false);
  
  // ✅ NOVO: Estado para rastrear se a parada atual foi justificada via WebSocket
  const [currentStopJustified, setCurrentStopJustified] = useState(false);
  
  // ✅ Estado para armazenar dados das estações filhas (child machines/postos)
  const [childMachinesData, setChildMachinesData] = useState<Map<number, any>>(new Map());
  
  // ==================== WEBSOCKET HANDLERS ====================
  
  const handleSignalEvent = useCallback((event: SignalEvent) => {
    // Log para debug
    console.log('📊 WebSocket - Sinal recebido detalhado:', {
      id_maquina: event.id_maquina,
      from_child: event.from_child,
      child_name: event.child_name,
      sessao_operador: event.sessao_operador,
      machine_multipostos: machine.multipostos
    });
    
    if (event.id_maquina !== machine.id_maquina && !machine.multipostos) {
      return;
    }
    
    // ✅ NOVO: Processar sinais para máquinas simples (sem from_child)
    if (!event.from_child && !machine.multipostos) {
      // Sinal direto da máquina simples
      console.log(`🏭 Atualizando máquina simples ${event.id_maquina} com sinais: ${event.sessao_operador.sinais}`);
      
      // Atualizar estado de produção da máquina simples
      setSingleProduction(prev => {
        if (!prev) return prev;
        
        return {
          ...prev,
          stats: {
            ...prev.stats,
            produzido: event.sessao_operador.sinais,
            rejeitos: event.sessao_operador.rejeitos
          },
          websocket_data: {
            sessao_operador: {
              sinais: event.sessao_operador.sinais,
              rejeitos: event.sessao_operador.rejeitos,
              sinais_validos: event.sessao_operador.sinais_validos || event.sessao_operador.sinais,
              tempo_decorrido_segundos: event.sessao_operador.tempo_decorrido_segundos || 0,
              tempo_paradas_segundos: event.sessao_operador.tempo_paradas_segundos || 0,
              tempo_valido_segundos: event.sessao_operador.tempo_valido_segundos || 0
            }
          }
        };
      });
      
      console.log('✅ Estado da máquina simples atualizado com sinais:', event.sessao_operador.sinais);
      
      return;
    }
    
    // Atualizar contadores diretamente com os dados do evento
    if (event.from_child) {
      // Se o sinal veio de uma máquina filha (multipostos)
      const now = Date.now();
      const HIGHLIGHT_DURATION = 3000; // Destacar por 3 segundos
      
      // Atualizar qual estação recebeu o último sinal
      setLastSignalStationId(event.from_child);
      
      // Log para debug antes da atualização
      console.log(`🔄 Atualizando estação ${event.from_child} (${event.child_name}) com sinais: ${event.sessao_operador.sinais}`);
      
      setChildProductions(prevProductions => {
        return prevProductions.map(prod => {
          if (prod.machine.id_maquina === event.from_child) {
            console.log(`✅ Encontrada estação ${prod.machine.nome} (ID: ${prod.machine.id_maquina})`);
            console.log(`📊 Dados anteriores:`, {
              sinais_antigos: prod.websocket_data?.sessao_operador?.sinais || prod.stats.produzido,
              rejeitos_antigos: prod.websocket_data?.sessao_operador?.rejeitos || prod.stats.rejeitos
            });
            
            // Criar ou atualizar os dados do WebSocket
            const updatedProd = {
              ...prod,
              websocket_data: {
                sessao_operador: {
                  sinais: event.sessao_operador.sinais,
                  rejeitos: event.sessao_operador.rejeitos,
                  tempo_decorrido_segundos: event.sessao_operador.tempo_decorrido_segundos || 0,
                  tempo_paradas_segundos: event.sessao_operador.tempo_paradas_segundos || 0,
                  tempo_valido_segundos: event.sessao_operador.tempo_valido_segundos || 0
                },
                last_signal_timestamp: now,
                highlight_until: now + HIGHLIGHT_DURATION
              }
            };
            
            console.log(`📊 Dados atualizados:`, {
              sinais_novos: updatedProd.websocket_data.sessao_operador.sinais,
              rejeitos_novos: updatedProd.websocket_data.sessao_operador.rejeitos
            });
            
            return updatedProd;
          }
          return prod;
        });
      });
    }
  }, [machine.id_maquina, machine.multipostos, machine.nome]);

  const handleRejectEvent = useCallback((event: RejectEvent) => {
    // Log para debug
    console.log('🗑️ WebSocket - Rejeito recebido detalhado:', {
      id_maquina: event.id_maquina,
      from_child: event.from_child,
      child_name: event.child_name,
      sessao_operador: event.sessao_operador
    });
    
    if (event.id_maquina !== machine.id_maquina && !machine.multipostos) {
      return;
    }
    
    // ✅ NOVO: Processar rejeitos para máquinas simples (sem from_child)
    if (!event.from_child && !machine.multipostos) {
      console.log(`🗑️ Atualizando máquina simples ${event.id_maquina} com rejeitos: ${event.sessao_operador.rejeitos}`);
      
      // Atualizar estado de produção da máquina simples
      setSingleProduction(prev => {
        if (!prev) return prev;
        
        return {
          ...prev,
          stats: {
            ...prev.stats,
            produzido: event.sessao_operador.sinais,
            rejeitos: event.sessao_operador.rejeitos
          },
          websocket_data: {
            sessao_operador: {
              sinais: event.sessao_operador.sinais,
              rejeitos: event.sessao_operador.rejeitos,
              sinais_validos: event.sessao_operador.sinais_validos || event.sessao_operador.sinais,
              tempo_decorrido_segundos: event.sessao_operador.tempo_decorrido_segundos || 0,
              tempo_paradas_segundos: event.sessao_operador.tempo_paradas_segundos || 0,
              tempo_valido_segundos: event.sessao_operador.tempo_valido_segundos || 0
            }
          }
        };
      });
      
      console.log('✅ Estado da máquina simples atualizado com rejeitos:', event.sessao_operador.rejeitos);
      
      return;
    }
    
    // Atualizar contadores diretamente com os dados do evento
    if (event.from_child) {
      // Se o rejeito veio de uma máquina filha
      const now = Date.now();
      const HIGHLIGHT_DURATION = 3000; // Destacar por 3 segundos
      
      // Log para debug antes da atualização
      console.log(`🔄 Atualizando estação ${event.from_child} (${event.child_name}) com rejeitos: ${event.sessao_operador.rejeitos}`);
      
      setChildProductions(prevProductions => {
        return prevProductions.map(prod => {
          if (prod.machine.id_maquina === event.from_child) {
            console.log(`✅ Encontrada estação ${prod.machine.nome} (ID: ${prod.machine.id_maquina})`);
            console.log(`📊 Dados anteriores:`, {
              sinais_antigos: prod.websocket_data?.sessao_operador?.sinais || prod.stats.produzido,
              rejeitos_antigos: prod.websocket_data?.sessao_operador?.rejeitos || prod.stats.rejeitos
            });
            
            // Criar ou atualizar os dados do WebSocket
            const updatedProd = {
              ...prod,
              websocket_data: {
                sessao_operador: {
                  sinais: event.sessao_operador.sinais,
                  rejeitos: event.sessao_operador.rejeitos,
                  tempo_decorrido_segundos: event.sessao_operador.tempo_decorrido_segundos || 0,
                  tempo_paradas_segundos: event.sessao_operador.tempo_paradas_segundos || 0,
                  tempo_valido_segundos: event.sessao_operador.tempo_valido_segundos || 0
                },
                last_signal_timestamp: now,
                highlight_until: now + HIGHLIGHT_DURATION
              }
            };
            
            console.log(`📊 Dados atualizados:`, {
              sinais_novos: updatedProd.websocket_data.sessao_operador.sinais,
              rejeitos_novos: updatedProd.websocket_data.sessao_operador.rejeitos
            });
            
            return updatedProd;
          }
          return prod;
        });
      });
    }
  }, [machine.id_maquina, machine.multipostos]);

  const handleVelocityEvent = useCallback((event: VelocityEvent) => {
    if (event.id_maquina !== machine.id_maquina && !machine.multipostos) {
      return;
    }
    
    // Atualizar velocidade diretamente
    setVelocidade(event.velocidade);
  }, [machine.id_maquina, machine.multipostos]);

  const handleStopEvent = useCallback((event: StopEvent) => {
    console.log('⛔ WebSocket - Parada detectada via evento específico:', event);
    
    if (event.id_maquina !== machine.id_maquina && !machine.multipostos) {
      console.log('⚠️ Ignorando parada de outra máquina:', event.id_maquina);
      return;
    }
    
    // ✅ Atualizar status de parada (ambos os estados)
    setStatusParada(true);
    setIsMachineStopped(true);
    
    // Atualizar motivo se fornecido
    if (event.motivo) {
      setJustifiedStopReason(event.motivo);
      // Se veio com motivo, marcar como justificada
      setCurrentStopJustified(true);
    } else {
      // Sem motivo = ainda não justificada
      setCurrentStopJustified(false);
    }
    
    // Atualizar contagem de paradas pendentes
    countPendingStops();
    
    // Exibir notificação
    setErrorModalMessage('⛔ Máquina parada detectada');
    setTimeout(() => setErrorModalMessage(null), 3000);
  }, [machine.id_maquina, machine.multipostos]);

  const handleResumeEvent = useCallback((event: ResumeEvent) => {
    console.log('▶️ WebSocket - Retomada detectada via evento específico:', event);
    
    if (event.id_maquina !== machine.id_maquina && !machine.multipostos) {
      console.log('⚠️ Ignorando retomada de outra máquina:', event.id_maquina);
      return;
    }
    
    // ✅ Atualizar status de parada (ambos os estados)
    setStatusParada(false);
    setIsMachineStopped(false);
    
    // Limpar motivo de parada justificada
    setJustifiedStopReason(null);
    
    // ✅ Limpar estado de parada justificada quando a máquina retomar
    setCurrentStopJustified(false);
    
    // Atualizar contagem de paradas pendentes
    countPendingStops();
    
    // Exibir duração da parada se fornecida
    if (event.duracao) {
      const minutos = Math.floor(event.duracao / 60);
      const segundos = event.duracao % 60;
      setErrorModalMessage(`▶️ Máquina retomada. Duração da parada: ${minutos}m ${segundos}s`);
      setTimeout(() => setErrorModalMessage(null), 3000);
    } else {
      setErrorModalMessage('▶️ Máquina retomada');
      setTimeout(() => setErrorModalMessage(null), 2000);
    }
  }, [machine.id_maquina, machine.multipostos]);

  const handleStartSessionAck = useCallback((event: StartSessionAckEvent) => {
    console.log('✅ WebSocket - Sessão iniciada confirmada:', event);
    
    if (event.id_maquina !== machine.id_maquina) {
      console.log('⚠️ Ignorando confirmação de sessão de outra máquina:', event.id_maquina);
      return;
    }
    
    // Verificar se o ID da sessão corresponde - usando uma referência segura
    const sessionId = currentSessionId; // Captura o valor atual no momento do callback
    if (event.id_sessao === sessionId) {
      setErrorModalMessage('Sessão iniciada no servidor com sucesso!');
      setTimeout(() => setErrorModalMessage(null), 2000);
    } else {
      console.warn('⚠️ ID da sessão não corresponde:', event.id_sessao, 'vs', sessionId);
    }
  }, [machine.id_maquina, currentSessionId]);

  const handleEndSessionAck = useCallback((event: EndSessionAckEvent) => {
    console.log('✅ WebSocket - Sessão finalizada confirmada:', event);
    
    if (event.id_maquina !== machine.id_maquina) {
      console.log('⚠️ Ignorando finalização de sessão de outra máquina:', event.id_maquina);
      return;
    }
    
    // Exibir resumo da sessão
    console.log('📊 Resumo da sessão:', event.sessao);
    
    // Verificar se o ID da sessão corresponde - usando uma referência segura
    const sessionId = currentSessionId; // Captura o valor atual no momento do callback
    if (event.sessao.id_sessao === sessionId) {
      // Exibir resumo da sessão para o usuário
      const sinaisValidos = event.sessao.sinais_validos || 0;
      const rejeitos = event.sessao.rejeitos || 0;
      const tempoDecorrido = event.sessao.tempo_decorrido_segundos || 0;
      const horas = Math.floor(tempoDecorrido / 3600);
      const minutos = Math.floor((tempoDecorrido % 3600) / 60);
      
      setErrorModalMessage(
        `Sessão finalizada com sucesso!\n` +
        `Produção: ${sinaisValidos} peças\n` +
        `Rejeitos: ${rejeitos} peças\n` +
        `Tempo: ${horas}h ${minutos}m`
      );
      
      setTimeout(() => setErrorModalMessage(null), 5000);
    } else {
      console.warn('⚠️ ID da sessão não corresponde:', event.sessao.id_sessao, 'vs', sessionId);
    }
  }, [machine.id_maquina, currentSessionId]);

  const handleMachineDataEvent = useCallback((event: MachineDataEvent) => {
    console.log('📊 WebSocket - Dados da máquina recebidos:', event);
    
    // Verificar se é evento de conexão estabelecida
    if (event.type === 'connection_established') {
      console.log('✅ WebSocket conectado - resetando tentativas de reconexão');
      setReconnectAttempts(0);
      setShouldReconnect(true);
      return;
    }
    
    if (event.id_maquina !== machine.id_maquina) {
      return;
    }
    
    // Atualizar dados das estações filhas
    if (event.is_multipostos && event.children && event.children.length > 0) {
      console.log(`🔄 Atualizando dados de ${event.children.length} estações filhas`);
      
      setChildProductions(prevProductions => {
        // Mapear os dados recebidos para o formato de ChildMachineProduction
        const updatedProductions = prevProductions.map(prod => {
          // Encontrar a estação correspondente nos dados recebidos
          const childData = event.children.find(child => child.id === prod.machine.id_maquina);
          
          if (childData) {
            console.log(`✅ Atualizando estação ${prod.machine.nome} (ID: ${prod.machine.id_maquina}) com dados do machine_data`);
            console.log(`📊 Dados da estação:`, {
              sinais: childData.sessao_operador.sinais,
              rejeitos: childData.sessao_operador.rejeitos
            });
            
            return {
              ...prod,
              websocket_data: {
                ...prod.websocket_data,
                sessao_operador: {
                  sinais: childData.sessao_operador.sinais,
                  rejeitos: childData.sessao_operador.rejeitos,
                  tempo_decorrido_segundos: childData.sessao_operador.tempo_decorrido_segundos || 0,
                  tempo_paradas_segundos: childData.sessao_operador.tempo_paradas_segundos || 0,
                  tempo_valido_segundos: childData.sessao_operador.tempo_valido_segundos || 0
                }
              }
            };
          }
          
          return prod;
        });
        
        return updatedProductions;
      });
    }
  }, [machine.id_maquina]);

  const handleWSError = useCallback((event: ErrorEvent) => {
    console.error('❌ WebSocket - Erro:', event.message);
    
    // Tratar erros específicos
    if (event.message === 'Máquina não encontrada') {
      setErrorModalMessage(`Máquina ${event.id_maquina} não encontrada no servidor WebSocket. Usando dados do banco de dados.`);
      // Reativar Supabase Realtime quando a máquina não for encontrada no WebSocket
      setRealtimeEnabled(true);
      setUseWebSocketOnly(false);
      // Desativar tentativas de reconexão
      setShouldReconnect(false);
    } else {
      setErrorModalMessage(`Erro WebSocket: ${event.message}`);
      
      // Incrementar tentativas de reconexão
      setReconnectAttempts(prev => {
        const newAttempts = prev + 1;
        
        // Desabilitar reconexão após muitas tentativas
        if (newAttempts >= 5) {
          console.log('⚠️ Desabilitando reconexão WebSocket após muitas tentativas');
          setShouldReconnect(false);
        }
        
        return newAttempts;
      });
    }
    
    setTimeout(() => setErrorModalMessage(null), 5000);
  }, [setRealtimeEnabled]);

  // Handler para parada forçada (notificação)
  const handleForcedStopEvent = useCallback((event: any) => {
    console.log('🛑 WebSocket - Parada forçada recebida:', event);
    console.log('🛑 Comparando máquinas - Evento:', event.id_maquina, 'Máquina atual:', machine.id_maquina);
    if (event.id_maquina === machine.id_maquina) {
      console.log('🛑 Atualizando estado para parada');
      setIsMachineStopped(true);
      setShowStopReasonModal(false);
    } else {
      console.log('🛑 Evento não é para esta máquina, ignorando');
    }
  }, [machine.id_maquina]);

  // Handler para confirmação de parada forçada
  const handleForcedStopAckEvent = useCallback((event: any) => {
    console.log('🛑 WebSocket - Confirmação de parada forçada recebida:', event);
    console.log('🛑 ACK - Comparando máquinas - Evento:', event.id_maquina, 'Máquina atual:', machine.id_maquina);
    if (event.id_maquina === machine.id_maquina) {
      console.log('🛑 ACK - Atualizando estado para parada');
      setIsMachineStopped(true);
      setShowStopReasonModal(false);
    } else {
      console.log('🛑 ACK - Evento não é para esta máquina, ignorando');
    }
  }, [machine.id_maquina]);

  // Handler para retomada forçada (notificação)
  const handleForcedResumeEvent = useCallback((event: any) => {
    console.log('▶️ WebSocket - Retomada forçada recebida:', event);
    if (event.id_maquina === machine.id_maquina) {
      setIsMachineStopped(false);
    }
  }, [machine.id_maquina]);

  // Handler para confirmação de retomada forçada
  const handleForcedResumeAckEvent = useCallback((event: any) => {
    console.log('▶️ WebSocket - Confirmação de retomada forçada recebida:', event);
    if (event.id_maquina === machine.id_maquina) {
      setIsMachineStopped(false);
    }
  }, [machine.id_maquina]);

  // Handler para mostrar modal de motivos de parada
  const handleShowStopReasonModal = useCallback(() => {
    setIsManualStopMode(true);
    setShowStopReasonModal(true);
  }, []);

  // 🆕 Hook SSE - Sistema de comunicação em tempo real (funciona com firewall)
  const {
    machineData: sseMachineData,
    childMachinesData: sseChildMachinesData,
    isConnected: sseConnected,
    isLoading: sseLoading,
    error: sseError,
    adicionarRejeitos: sseAdicionarRejeitos,
    forcarParada: sseForcarParada,
    iniciarSessao: sseIniciarSessao,
    finalizarSessao: sseFinalizarSessao
  } = useSSEManager({
    machineId: machine.id_maquina,
    enabled: true
  });

  // Log para debug
  React.useEffect(() => {
    if (sseConnected && sseMachineData) {
      console.log('✅ [SSE] Dados da máquina atualizados:', sseMachineData);
    }
  }, [sseConnected, sseMachineData]);

  // ✅ NOVO: Atualizar estado da máquina baseado nos dados SSE
  React.useEffect(() => {
    if (sseConnected && sseMachineData && sseMachineData.contexto) {
      const { contexto } = sseMachineData;
      
      console.log('🔄 [SSE] Atualizando estado da máquina:', {
        status: contexto.status,
        parada_ativa: contexto.parada_ativa,
        velocidade: contexto.velocidade
      });
      
      // ✅ Atualizar status de parada (tela vermelha)
      const isParada = contexto.status === false || contexto.parada_ativa !== null;
      setStatusParada(isParada);
      setIsMachineStopped(isParada);
      
      // ✅ Atualizar velocidade
      setVelocidade(contexto.velocidade || 0);
      
      // ✅ Controlar quando o botão de pré-justificação pode ser exibido
      setCanPreJustify(!isParada && contexto.status === true);
      
      // ✅ Se há parada ativa sem motivo, habilitar justificação
      if (contexto.parada_ativa && !contexto.parada_ativa.motivo_id) {
        console.log('🛑 Parada ativa detectada - habilitando justificação');
        setPendingStops(1);
        setPendingStopStartTime(contexto.parada_ativa.inicio);
        setJustifiedStopReason(null);
      } else if (!contexto.parada_ativa) {
        // Limpar estado de paradas se não há parada ativa
        setPendingStops(0);
        setPendingStopStartTime(null);
        setJustifiedStopReason(null);
      }
      
      console.log(`🔄 Estado atualizado: statusParada=${isParada}, velocidade=${contexto.velocidade}, canPreJustify=${!isParada}`);
    }
  }, [sseConnected, sseMachineData]);

  // Processar dados das máquinas filhas do SSE e atualizar childProductions
  React.useEffect(() => {
    if (sseChildMachinesData && sseChildMachinesData.size > 0) {
      console.log('🔄 [SSE] Atualizando childProductions com dados do contexto inicial:', sseChildMachinesData.size, 'máquinas');
      
      setChildProductions(prevProductions => {
        return prevProductions.map(prod => {
          const sseData = sseChildMachinesData.get(prod.machine.id_maquina);
          
          if (sseData) {
            console.log(`✅ [SSE] Atualizando produção da máquina ${prod.machine.nome} (ID: ${prod.machine.id_maquina}) com dados do contexto inicial:`, {
              sinais_validos: sseData.sessao_operador.sinais_validos,
              rejeitos: sseData.sessao_operador.rejeitos,
              sinais: sseData.sessao_operador.sinais
            });
            
            return {
              ...prod,
              stats: {
                ...prod.stats,
                produzido: sseData.sessao_operador.sinais_validos,
                rejeitos: sseData.sessao_operador.rejeitos
              },
              websocket_data: {
                sessao_operador: {
                  sinais: sseData.sessao_operador.sinais,
                  sinais_validos: sseData.sessao_operador.sinais_validos,
                  rejeitos: sseData.sessao_operador.rejeitos,
                  tempo_decorrido_segundos: sseData.sessao_operador.tempo_decorrido_segundos,
                  tempo_paradas_segundos: sseData.sessao_operador.tempo_paradas_segundos,
                  tempo_valido_segundos: sseData.sessao_operador.tempo_valido_segundos
                },
                last_signal_timestamp: Date.now(),
                highlight_until: Date.now() + 3000 // Destacar por 3 segundos
              }
            };
          }
          
          return prod;
        });
      });
    }
  }, [sseChildMachinesData]);

  // Handler para retomada forçada (TODO: implementar via SSE/API)
  const handleForcedResume = useCallback(() => {
    console.log('🔄 Retomada forçada - TODO: implementar via API REST');
    // TODO: Implementar usando apiService quando endpoint estiver disponível
  }, []);

  // Handler para parada forçada (TODO: implementar via API)
  const handleForcedStop = useCallback(async (reasonId: number) => {
    try {
      console.log('🛑 Parada forçada - TODO: implementar via API REST');
      // TODO: Implementar usando apiService.forcarParada quando disponível
      setShowStopReasonModal(false);
    } catch (error) {
      console.error('❌ Erro ao enviar parada manual:', error);
      setErrorModalMessage('Falha ao registrar parada manual. Tente novamente.');
    }
  }, []);

  // SSE Status (substituiu WebSocket)
  const renderSSEStatus = () => {
    if (!sseConnected && !sseLoading) {
      return (
        <div className="fixed bottom-4 right-4 bg-red-500/10 border border-red-500/20 rounded-lg p-4 z-50">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-400" />
              <p className="text-red-400 text-sm">
                SSE desconectado
              </p>
            </div>
            <button
              onClick={() => {
                console.log('🔄 Tentando reconectar SSE...');
                window.location.reload();
              }}
              className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded transition-colors"
            >
              Reativar
            </button>
          </div>
        </div>
      );
    }
    return null;
  };

  // Detectar modo admin
  React.useEffect(() => {
    const checkAdminMode = async () => {
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
            console.log('Modo admin detectado no OperatorDashboard');
            setIsAdminMode(true);
          }
        }
      }
    };
    checkAdminMode();
  }, []);

  // Log quando currentSessionId mudar
  React.useEffect(() => {
    console.log('OperatorDashboard - currentSessionId atualizado:', currentSessionId);
  }, [currentSessionId]);

  // Inicializar currentSessionId com sessionId quando disponível
  React.useEffect(() => {
    if (sessionId) {
      console.log('OperatorDashboard - sessionId recebido via props:', sessionId);
      setCurrentSessionId(sessionId);
    }
  }, [sessionId]);

  // Monitorar mudanças no sessionId e atualizar currentSessionId
  React.useEffect(() => {
    if (sessionId && sessionId !== currentSessionId) {
      console.log('OperatorDashboard - sessionId mudou, atualizando currentSessionId:', sessionId);
      setCurrentSessionId(sessionId);
    }
  }, [sessionId, currentSessionId]);
  
  // Efeito para limpar destaques após o tempo definido
  React.useEffect(() => {
    const checkHighlights = () => {
      const now = Date.now();
      
      setProductions(prevProductions => {
        let hasChanges = false;
        
        const updatedProductions = prevProductions.map(prod => {
          if (prod.websocket_data?.highlight_until && prod.websocket_data.highlight_until < now) {
            hasChanges = true;
            // Remover o destaque mantendo os outros dados
            return {
              ...prod,
              websocket_data: {
                ...prod.websocket_data,
                highlight_until: undefined
              }
            };
          }
          return prod;
        });
        
        // Só atualizar o estado se algum destaque foi removido
        return hasChanges ? updatedProductions : prevProductions;
      });
    };
    
    // Verificar destaques a cada 500ms
    const intervalId = setInterval(checkHighlights, 500);
    
    return () => {
      clearInterval(intervalId);
    };
  }, []);

  // Verificar sessão ativa no banco de dados (com trava antirreentrada)
  const checkingSessionRef = React.useRef(false);
  React.useEffect(() => {
    const checkActiveSession = async () => {
      if (checkingSessionRef.current) {
        return;
      }
      if (!user || !machine) return;

      try {
        checkingSessionRef.current = true;
        console.log('=== INÍCIO checkActiveSession (OperatorDashboard) ===');
        console.log('Verificando sessão ativa para máquina:', machine.id_maquina);
        console.log('Usuário:', user.id);

        // ✅ NOVO: Usar dados do operador da API REST
        let operatorData: { id: number; nome: string } | null = null;
        
        if (operator) {
          console.log('✅ Usando operador da API REST:', operator);
          operatorData = { id: operator.id_operador, nome: operator.nome };
        } else {
          // ⚠️ Fallback para modo admin (Supabase)
          console.log('⚠️ Fallback: Buscando operador no Supabase');
          const { data: supabaseOperator, error: operatorError } = await supabase
            .from('operador')
            .select('id, nome')
            .eq('user', user.id)
            .eq('Delete', false)
            .single();

          if (operatorError || !supabaseOperator) {
            console.error('Erro ao buscar operador:', operatorError);
            return;
          }
          
          operatorData = supabaseOperator;
        }


        // Verificar se há sessão ativa para esta máquina
        const { data: sessions, error: sessionsError } = await supabase
          .from('sessoes')
          .select('id, created_at, maquina, operador, inicio, fim, turno')
          .eq('maquina', machine.id_maquina)
          .is('fim', null)
          .order('created_at', { ascending: false });

        console.log('Resultado da busca de sessões:', { sessions, sessionsError });

        if (sessionsError) {
          console.error('Erro ao verificar sessões ativas:', sessionsError);
          return;
        }

        if (sessions && sessions.length > 0) {
          const activeSession = sessions[0]; // Pegar a mais recente
          console.log('Sessão ativa encontrada no banco:', activeSession);
          setCurrentSessionId(activeSession.id);
          // Atualizar localStorage também
          localStorage.setItem('industrack_session', activeSession.id.toString());
          console.log('currentSessionId atualizado para:', activeSession.id);
          
          // ✅ ENVIAR PARA API REST - Iniciar sessão no backend
          try {
            console.log('📡 Enviando sessão existente para API backend...');
            const apiResponse = await sseIniciarSessao({
              id_operador: activeSession.operador,
              id_turno: activeSession.turno || 3 // Usar turno da sessão ou padrão
            });
            
            if (apiResponse.success) {
              console.log('✅ Sessão existente enviada para API backend com sucesso');
            } else {
              console.warn('⚠️ Erro ao enviar sessão para API backend:', apiResponse.error);
            }
          } catch (apiError) {
            console.error('❌ Erro ao enviar sessão para API backend:', apiError);
            // Não bloquear o fluxo se a API falhar
          }
        } else {
          console.log('Nenhuma sessão ativa encontrada no banco - criando nova sessão automaticamente');
          
          // Criar sessão automaticamente para resolver o fluxo direto
          try {
            // Verificar se já não foi criada uma sessão recentemente
            const existingSessionId = localStorage.getItem('industrack_session');
            if (existingSessionId) {
              console.log('Sessão já existe no localStorage:', existingSessionId);
              setCurrentSessionId(parseInt(existingSessionId));
              return;
            }
            
            // Buscar turno atual para a máquina
            let turnoId = null;
            try {
              const now = new Date();
              const currentHour = now.getHours();
              const currentMinute = now.getMinutes();
              const currentDay = now.getDay();

              const { data: machineData, error: machineError } = await supabase
                .from('Maquinas')
                .select('grupo')
                .eq('id_maquina', machine.id_maquina)
                .single();

              if (!machineError && machineData?.grupo) {
                const { data: maquinasTurnoData, error: maquinasTurnoError } = await supabase
                  .from('maquinas_turno')
                  .select('id_turno, turnos (id, hora_inicio, hora_fim, descricao, dias_semana)')
                  .or(`id_maquina.eq.${machine.id_maquina},id_grupo.eq.${machineData.grupo}`);

                if (!maquinasTurnoError && maquinasTurnoData && maquinasTurnoData.length > 0) {
                  for (const mt of maquinasTurnoData) {
                    const shift = mt.turnos;
                    if (!shift) continue;

                    const diasSemana = shift.dias_semana;
                    const isDayMatch = diasSemana === null || diasSemana.length === 0 || diasSemana.includes(currentDay);

                    if (isDayMatch) {
                      const [startHour, startMinute] = shift.hora_inicio.split(':').map(Number);
                      const [endHour, endMinute] = shift.hora_fim.split(':').map(Number);

                      const startTime = new Date();
                      startTime.setHours(startHour, startMinute, 0, 0);
                      const endTime = new Date();
                      endTime.setHours(endHour, endMinute, 0, 0);
                      const currentTime = new Date();
                      currentTime.setHours(currentHour, currentMinute, 0, 0);

                      if (startTime.getTime() > endTime.getTime()) {
                        const isActive = currentTime.getTime() >= startTime.getTime() || currentTime.getTime() <= endTime.getTime();
                        if (isActive) {
                          turnoId = shift.id;
                          break;
                        }
                      } else {
                        const isActive = currentTime.getTime() >= startTime.getTime() && currentTime.getTime() <= endTime.getTime();
                        if (isActive) {
                          turnoId = shift.id;
                          break;
                        }
                      }
                    }
                  }
                }
              }
            } catch (turnoError) {
              console.error('Erro ao buscar turno atual:', turnoError);
            }

            console.log('Criando sessão com dados:', {
              machineId: machine.id_maquina,
              operatorId: operatorData.id,
              turnoId,
              secondaryOperatorId: secondaryOperator?.id
            });

            // Criar sessão automaticamente
            const newSession = await createSession(
              machine.id_maquina,
              operatorData.id,
              turnoId,
              secondaryOperator?.id ?? null
            );
            console.log('Nova sessão criada automaticamente no OperatorDashboard:', newSession);
            setCurrentSessionId(newSession.id);
            localStorage.setItem('industrack_session', newSession.id.toString());
            
            // ✅ ENVIAR PARA API REST - Iniciar nova sessão no backend
            try {
              console.log('📡 Enviando nova sessão para API backend...');
              const apiResponse = await sseIniciarSessao({
                id_operador: operatorData.id,
                id_turno: turnoId || 3 // Usar turno encontrado ou padrão
              });
              
              if (apiResponse.success) {
                console.log('✅ Nova sessão enviada para API backend com sucesso');
                setErrorModalMessage('✅ Sessão iniciada com sucesso!');
                setTimeout(() => setErrorModalMessage(null), 2000);
              } else {
                console.warn('⚠️ Erro ao enviar sessão para API backend:', apiResponse.error);
                setErrorModalMessage('⚠️ Sessão criada no banco, mas erro ao enviar para backend');
                setTimeout(() => setErrorModalMessage(null), 3000);
              }
            } catch (apiError) {
              console.error('❌ Erro ao enviar sessão para API backend:', apiError);
              // Não bloquear o fluxo se a API falhar
            }
          } catch (createError) {
            console.error('Erro ao criar sessão automaticamente no OperatorDashboard:', createError);
          }
        }
        
        console.log('=== FIM checkActiveSession (OperatorDashboard) ===');
      } catch (err) {
        console.error('Erro ao verificar sessão ativa:', err);
      } finally {
        checkingSessionRef.current = false;
      }
    }

    checkActiveSession();
  }, [user, machine, secondaryOperator]);

  // Estado para controlar se estamos usando apenas WebSocket
  const [useWebSocketOnly, setUseWebSocketOnly] = useState(false);
  
  // Estados adicionais necessários
  const [isFinishingProduction, setIsFinishingProduction] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [singleProduction, setSingleProduction] = useState<any>(null);
  
  // Usar o novo hook para dados das máquinas filhas
  const { 
    productions: initialChildProductions, 
    loading: loadingProductionsChild, 
    error: productionsErrorChild 
  } = useChildMachinesProduction(machine.id_maquina, useWebSocketOnly);
  
  // Estado para gerenciar as produções das estações filhas
  // Inicializado com os dados do hook, mas depois atualizado pelos eventos WebSocket
  const [childProductions, setChildProductions] = useState(initialChildProductions);
  
  // Atualizar childProductions quando initialChildProductions mudar (apenas uma vez na inicialização)
  useEffect(() => {
    if (initialChildProductions.length > 0) {
      setChildProductions(prevProductions => {
        // Se já temos produções, não substituir (para evitar reordenação)
        if (prevProductions.length > 0) {
          return prevProductions;
        }
        return initialChildProductions;
      });
    }
  }, [initialChildProductions]);

  // Hook para máquinas de estação única
  // ✅ DESABILITADO: Hook useSingleMachineProduction - dados devem vir via SSE
  const singleMachineProduction = null;
  const loadingSingleMachine = false;
  const singleMachineError = null;
  console.log('⚠️ useSingleMachineProduction desabilitado - dados devem vir via SSE');
  // Flag local para evitar disparos repetidos de start_session quando sessão já está ativa no servidor
  const sessionRecognizedRef = React.useRef(false);

  // Listener para tratar sessão já ativa como sucesso e evitar reenvio
  React.useEffect(() => {
    const handleSessionAlreadyActive = () => {
      console.log('✅ Sessão já ativa reconhecida via WebSocket - evitando novo start_session');
      sessionRecognizedRef.current = true;
    };
    const handleSessionStatus = (payload: any) => {
      console.log('🧭 handleSessionStatus - Payload recebido:', payload);
      
      // Só marcar como reconhecida se realmente HÁ uma sessão ativa no WebSocket
      if (payload?.has_active_session === true) {
        console.log('✅ Sessão ativa confirmada via session_status - evitando start_session duplicado');
        sessionRecognizedRef.current = true;
      } else {
        console.log('⚠️ WebSocket indica que NÃO há sessão ativa - permitindo envio de start_session');
        sessionRecognizedRef.current = false;
      }
    };
    const handleCommandSuccess = (data: any) => {
      if (typeof data?.message === 'string' && data.message.includes('Sessão já estava ativa')) {
        sessionRecognizedRef.current = true;
      }
      
      // ✅ NOVO: Detectar quando uma parada foi justificada via WebSocket
      if (typeof data?.message === 'string' && data.message.includes('Motivo de parada atribuído com sucesso')) {
        console.log('✅ Parada justificada via WebSocket confirmada!');
        setCurrentStopJustified(true);
        setErrorModalMessage('✅ Parada justificada com sucesso!');
        setTimeout(() => setErrorModalMessage(null), 3000);
      }
    };

    webSocketManager.addListener('session_already_active', handleSessionAlreadyActive);
    webSocketManager.addListener('session_status', handleSessionStatus);
    webSocketManager.addListener('command_success', handleCommandSuccess);

    return () => {
      webSocketManager.removeListener('session_already_active', handleSessionAlreadyActive);
      webSocketManager.removeListener('session_status', handleSessionStatus);
      webSocketManager.removeListener('command_success', handleCommandSuccess);
    };
  }, []);

  // Determinar qual conjunto de dados usar baseado no tipo da máquina
  const isMultiStation = machine.multipostos;
  // ✅ ATUALIZADO: Usar apenas dados SSE para máquinas simples
  const loading = isMultiStation ? loadingProductionsChild : sseLoading;
  const productionError = isMultiStation ? productionsErrorChild : sseError;
  const hasProduction = isMultiStation ? childProductions.length > 0 : !!sseMachineData;

  // Buscar turnos apenas quando machine.id_maquina mudar
  // ✅ DESABILITADO: Consulta maquinas_turno via Supabase - dados devem vir via API REST
  useEffect(() => {
    console.log('⚠️ Consulta maquinas_turno desabilitada - dados devem vir via API REST');
    setCurrentShift({ descricao: 'Turno Diurno', hora_inicio: '06:00', hora_fim: '18:00' }); // Temporário
  }, [machine.id_maquina]);

  // ✅ DESABILITADO: Subscription sessões via Supabase - dados devem vir via SSE
  React.useEffect(() => {
    if (!sessionId) return;
    
    console.log('⚠️ Subscription sessões desabilitada - dados devem vir via SSE');
    
    return () => {
      // Cleanup se necessário
    };
  }, [sessionId]);

  // ✅ REMOVIDO: Consulta semana_maquina via Supabase - dados devem vir via SSE
  const loadProductions = async () => {
    try {
      setLoadingProductions(true);
      setError(null);
      
      // ⚠️ TODO: Obter produções via API REST quando necessário
      console.log('⚠️ Consulta semana_maquina desabilitada - migração para API REST pendente');
      
      // Simular carregamento para não quebrar a UI
      setTimeout(() => {
        setProductions([]);
        setLoadingProductions(false);
      }, 100);

      return; // ✅ Função desabilitada
      
    } catch (err) {
      console.error('⚠️ Função loadProductions desabilitada:', err);
      setProductions([]);
    } finally {
      setLoadingProductions(false);
    }
  };

  React.useEffect(() => {
    loadProductions();
  }, [machine.id_maquina]);

  const handleSelectAllGrades = (production: WeekMachine) => {
    if (!production.grade_semana_maquina) return;
    
    setSelectedGrades(prev => {
      const newSet = new Set(prev);
      const selectableGrades = production.grade_semana_maquina?.filter(
        grade => grade.status !== 'concluido'
      ) || [];
      
      const allSelected = selectableGrades.every(grade => prev.has(grade.id));
      
      if (allSelected) {
        // Se todas já estão selecionadas, remove todas
        selectableGrades.forEach(grade => {
          newSet.delete(grade.id);
        });
      } else {
        // Se nem todas estão selecionadas, adiciona todas
        selectableGrades.forEach(grade => {
          newSet.add(grade.id);
        });
      }
      
      return newSet;
    });
  };

  const canFinishTotal = (grades: WeekMachineGrade[]) => {
    return grades.every(grade => 
      grade.quantidade_produzida === grade.quantidade
    );
  };

  const handleSelectGrade = (gradeId: number) => {
    setSelectedGrades(prev => {
      const newSet = new Set(prev);
      if (prev.has(gradeId)) {
        newSet.delete(gradeId);
      } else {
        newSet.add(gradeId);
      }
      return newSet;
    });
  };

  const handleFinishProduction = React.useCallback(async (productionId: number) => {
    try {
      setIsFinishingProduction(true);
      setError(null);

      // ✅ REMOVIDO: Update semana_maquina desabilitado - usar API REST
      console.log('⚠️ Finalização de produção desabilitada - usar API REST');
      const updateError = null;
      
      if (updateError) throw updateError;

      // Recarrega as produções
      await loadProductions();
      
    } catch (err) {
      console.error('Error finishing production:', err);
      setError(err instanceof Error ? err.message : 'Erro ao finalizar produção');
    } finally {
      setIsFinishingProduction(false);
    }
  }, [loadProductions]);

  const handleFinishBatch = async (type: ProductionFinishType = 'partial') => {
    if (!operatorId || selectedGrades.size === 0) {
      setErrorModalMessage('Não é possível finalizar: nenhum operador ou grade selecionada');
      return;
    }
    
    try {
      setIsFinishingBatch(true);
      setError(null);
      
      setIsUpdating(true);
      
      const shouldUpdateWeekMachine = type === 'complete' && productions.every(prod => 
        prod.grade_semana_maquina?.every(grade => 
          !selectedGrades.has(grade.id) || grade.quantidade_produzida === grade.quantidade
        )
      );

      await finishBatchProduction(
        Array.from(selectedGrades), 
        operatorId, 
        type, 
        shouldUpdateWeekMachine,
        machine.id_maquina
      );
      
      await Promise.all([
        loadProductions(),
        refreshMachines()
      ]);

      setSelectedGrades(new Set());
      
    } catch (err) {
      console.error('Error finishing batch:', err);
      setErrorModalMessage(err instanceof Error ? err.message : 'Erro ao finalizar produção');
    } finally {
      setIsFinishingBatch(false);
      setIsUpdating(false);
    }
  };

  const handleSetupComplete = (gradeId: number) => {
    setCompletedSetups(prev => {
      const newSet = new Set(prev);
      if (prev.has(gradeId)) {
        newSet.delete(gradeId);
      } else {
        newSet.add(gradeId);
      }
      return newSet;
    });
  };

  React.useEffect(() => {
    async function loadStopReasons() {
      try {
        // Primeiro, buscar o grupo da máquina atual
        const { data: machineData, error: machineError } = await supabase
          .from('Maquinas')
          .select('grupo')
          .eq('id_maquina', machine.id_maquina)
          .single();

        if (machineError) throw machineError;

        // Se a máquina tem um grupo específico, filtrar por ele
        if (machineData?.grupo) {
          // Buscar apenas motivos específicos do grupo da máquina atual
          const { data: specificReasons, error: specificError } = await supabase
          .from('motivos_parada')
          .select('*')
            .eq('grupo_maquina', machineData.grupo)
          .order('descricao');

          if (specificError) throw specificError;

          setStopReasons(specificReasons || []);
        } else {
          setStopReasons([]);
        }
      } catch (err) {
        console.error('Error loading stop reasons:', err);
        setStopReasons([]);
      }
    }

    loadStopReasons();
  }, [machine.id_maquina]);

  // ✅ REMOVIDO: Consulta grupos_maquinas via Supabase - dados devem vir via SSE
  React.useEffect(() => {
    // ⚠️ TODO: Obter grupo da máquina via API REST ou SSE quando necessário
    console.log('⚠️ Consulta grupos_maquinas desabilitada - migração para API REST pendente');
    setMachineGroup(null);
  }, [machine.id_maquina]);

  React.useEffect(() => {
    async function loadOperator() {
      if (!user) return;
      
      const { data, error } = await supabase
        .from('operador')
        .select('id')
        .eq('user', user.id)
        .single();

      if (!error && data) {
        setOperatorId(data.id);
      }
    }

    loadOperator();
  }, [user]);

  React.useEffect(() => {
    async function loadChildMachines() {
      try {
        const { data, error } = await supabase
          .from('Maquinas')
          .select('id_maquina, nome, ativa')
          .eq('maquina_filha', true)
          .eq('maquina_pai', machine.id_maquina)
          .order('nome', { ascending: true });

        if (error) throw error;
        setChildMachines(data || []);
      } catch (err) {
        console.error('Error loading child machines:', err);
      } finally {
        setLoadingMachines(false);
      }
    }

    loadChildMachines();
  }, [machine.id_maquina]);

  // ✅ REMOVIDO: Consulta paradas_redis via Supabase - dados devem vir via SSE
  async function countPendingStops() {
    try {
      console.log('⚠️ Consulta paradas_redis desabilitada - dados devem vir via SSE');
      
      // ⚠️ TODO: Obter paradas via SSE em tempo real
      setPendingStops(0);
      setPendingStopStartTime(null);
      
      return; // ✅ Função desabilitada
    } catch (err) {
      console.error('⚠️ Função countPendingStops desabilitada:', err);
      setPendingStops(0);
      setPendingStopStartTime(null);
      setJustifiedStopReason(null);
    }
  }

  React.useEffect(() => {
    countPendingStops();

    const subscription = supabase
      .channel('pending_stops')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'paradas',
          filter: `id_maquina=eq.${machine.id_maquina}`,
        },
        () => {
          // Usar debounce para evitar múltiplas chamadas
          setTimeout(() => countPendingStops(), 100);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [machine.id_maquina]);

  // Buscar e atualizar velocidade e status via pooling
  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    
    async function fetchStats() {
      const { data, error } = await supabase
        .from('machine_stats')
        .select('velocidade, status')
        .eq('id_maquina', machine.id_maquina)
        .single();
      if (!error && data) {
        setVelocidade(data.velocidade || 0);
        setStatusParada(data.status === false);
        // Controlar quando o botão de pré-justificação pode ser exibido
        setCanPreJustify(data.status === true);
      }
    }
    
    fetchStats();

    // Pooling a cada 60 segundos para machine_stats
    intervalId = setInterval(fetchStats, 60000);

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [machine.id_maquina]);

  const handleLogout = async () => {
    console.log('=== INÍCIO handleLogout (OperatorDashboard) ===');
    console.log('currentSessionId disponível:', currentSessionId);
    console.log('Modo admin:', isAdminMode);
    
    if (isAdminMode) {
      console.log('Modo admin - fazendo logout simples sem encerrar sessão');
      await supabase.auth.signOut();
      window.location.reload();
      return;
    }
    
    if (currentSessionId) {
      try {
        console.log('Encerrando sessão via OperatorDashboard, sessionId:', currentSessionId);
        
        // ✅ ENVIAR PARA API REST: Finalizar sessão no backend ANTES de encerrar no Supabase
        try {
          if (sseConnected) {
            console.log('📡 Enviando comando finalizar sessão via API REST...');
            const apiResponse = await sseFinalizarSessao();
            
            if (apiResponse.success) {
              console.log('✅ Sessão finalizada no backend com sucesso');
            } else {
              console.warn('⚠️ Erro ao finalizar sessão no backend:', apiResponse.error);
            }
            
            // Aguardar um pouco para garantir que o backend processou
            await new Promise(resolve => setTimeout(resolve, 500));
          } else {
            console.warn('⚠️ SSE não conectado ao encerrar sessão');
          }
        } catch (sseError) {
          console.error('❌ Erro ao enviar comando finalizar sessão:', sseError);
          // Não bloquear o fluxo se a API falhar
        }
        
        // Encerrar sessão no Supabase
        await endSession(currentSessionId);
        console.log('Sessão encerrada com sucesso no Supabase');
      } catch (err) {
        console.error('Error ending session:', err);
      }
    } else {
      console.log('Nenhum sessionId disponível para encerrar');
    }
    
    console.log('Fazendo logout do Supabase...');
    await supabase.auth.signOut();
    console.log('Logout do Supabase concluído');
    
    console.log('Recarregando página...');
    window.location.reload();
  };

  // Carrega preferência do operador
  useEffect(() => {
    if (operatorId) {
      const loadViewPreference = async () => {
        const { data, error } = await supabase
          .from('operador')
          .select('dashboard_view_style')
          .eq('id', operatorId)
          .single();

        if (!error && data) {
          setViewStyle(data.dashboard_view_style as 'grid' | 'eva');
        }
      };

      loadViewPreference();
    }
  }, [operatorId]);

  // Salva preferência do operador
  const handleViewStyleChange = (style: 'grid' | 'eva') => {
    console.log('Alterando viewStyle de', viewStyle, 'para', style);
    setViewStyle(style);
    
    // Salvar no banco de dados
    if (operatorId) {
      supabase
        .from('operador')
        .update({ dashboard_view_style: style })
        .eq('id', operatorId)
        .then(({ error }) => {
          if (error) {
            console.error('Erro ao salvar preferência de visualização:', error);
          } else {
            console.log('Preferência de visualização salva:', style);
          }
        });
    }
  };

  // Adicionar rejeitos para máquinas filhas (multipostos)
  const handleAddReject = async (machineId: number) => {
    try {
      console.log('🗑️ Adicionando rejeito para máquina filha:', machineId);
      
      const response = await sseAdicionarRejeitos({
        id_maquina: machineId,
        quantidade: 1,
        id_motivo_rejeito: 1 // TODO: Permitir selecionar motivo
      });
      
      if (response.success) {
        console.log('✅ Rejeito adicionado com sucesso');
        setErrorModalMessage('✅ Rejeito adicionado com sucesso!');
        setTimeout(() => setErrorModalMessage(null), 2000);
      } else {
        throw new Error(response.error || 'Erro ao adicionar rejeito');
      }
    } catch (error) {
      console.error('❌ Erro ao enviar rejeito:', error);
      setErrorModalMessage('❌ Falha ao registrar rejeito. Tente novamente.');
      setTimeout(() => setErrorModalMessage(null), 3000);
    }
  };

  // Adicionar rejeitos para máquinas simples
  const handleAddRejeito = async () => {
    try {
      console.log('🗑️ Adicionando rejeito para máquina simples:', machine.id_maquina);
      
      const response = await sseAdicionarRejeitos({
        quantidade: 1,
        id_motivo_rejeito: 1 // TODO: Permitir selecionar motivo
      });
      
      if (response.success) {
        console.log('✅ Rejeito adicionado com sucesso');
        setErrorModalMessage('✅ Rejeito adicionado com sucesso!');
        setTimeout(() => setErrorModalMessage(null), 2000);
      } else {
        throw new Error(response.error || 'Erro ao adicionar rejeito');
      }
    } catch (error) {
      console.error('❌ Erro ao enviar rejeito:', error);
      setErrorModalMessage('❌ Falha ao registrar rejeito. Tente novamente.');
      setTimeout(() => setErrorModalMessage(null), 3000);
    }
  };

  // Ordenar as produções por número da estação (numero_estacao)
  const sortedProductions = React.useMemo(() => {
    const sorted = [...childProductions].sort((a, b) => {
      // Garantir que o numero_estacao seja um número válido
      const numeroA = typeof a.machine.numero_estacao === 'number' ? a.machine.numero_estacao : 0;
      const numeroB = typeof b.machine.numero_estacao === 'number' ? b.machine.numero_estacao : 0;
      
      console.log(`Ordenando: ${a.machine.nome} (numero_estacao: ${numeroA}) vs ${b.machine.nome} (numero_estacao: ${numeroB})`);
      
      return numeroA - numeroB;
    });
    
    console.log('Produções ordenadas por numero_estacao:', sorted.map(p => ({ nome: p.machine.nome, numero_estacao: p.machine.numero_estacao })));
    
    return sorted;
  }, [childProductions]);

  // Filtrar produções para visualização EVA
  const evaProductions = React.useMemo(() => {
    console.log('🔍 Verificando se é máquina EVA:', machine.nome);
    console.log('🔍 Produções disponíveis:', sortedProductions.map(p => ({ 
      nome: p.machine.nome, 
      numero_estacao: p.machine.numero_estacao,
      id: p.machine.id_maquina 
    })));
    
    if (!machine.nome?.toUpperCase().includes('EVA')) {
      console.log('❌ Máquina não é EVA, retornando arrays vazios');
      return { left: [], right: [] };
    }
    
    // Filtrar por nome da máquina - ser mais flexível na busca
    const left = sortedProductions.filter(p => {
      const name = p.machine.nome?.toUpperCase() || '';
      return name.includes('ESQUERDA') || name.includes('LEFT') || name.includes('E.');
    });
    
    const right = sortedProductions.filter(p => {
      const name = p.machine.nome?.toUpperCase() || '';
      return name.includes('DIREITA') || name.includes('RIGHT') || name.includes('D.');
    });
    
    console.log('✅ Produções EVA - Esquerda:', left.map(p => ({ 
      nome: p.machine.nome, 
      numero_estacao: p.machine.numero_estacao,
      id: p.machine.id_maquina 
    })));
    console.log('✅ Produções EVA - Direita:', right.map(p => ({ 
      nome: p.machine.nome, 
      numero_estacao: p.machine.numero_estacao,
      id: p.machine.id_maquina 
    })));
    
    return { left, right };
  }, [sortedProductions, machine.nome]);

  // Função para atualizar manualmente machine_stats e paradas
  const handleRefresh = async () => {
    // Atualiza machine_stats
    const { data, error } = await supabase
      .from('machine_stats')
      .select('velocidade, status')
      .eq('id_maquina', machine.id_maquina)
      .single();
    if (!error && data) {
      setVelocidade(data.velocidade || 0);
      setStatusParada(data.status === false);
      setCanPreJustify(data.status === true);
    }
    // Atualiza paradas
    countPendingStops();
  };

  // Função para buscar a parada em andamento ou a última não justificada
  const handleShowStops = async () => {
    try {
      // Buscar QUALQUER parada não justificada (em andamento ou finalizada)
      let currentStop = null;
      
      console.log('🔍 handleShowStops - Iniciando busca:', {
        pendingStops,
        justifiedStopReason
      });
      
      // Buscar a última parada não justificada (independente se está em andamento ou finalizada)
      // ✅ REMOVIDO: Consulta paradas_redis desabilitada - dados devem vir via SSE
      console.log('⚠️ handleShowStops desabilitado - dados devem vir via SSE');
      const unjustifiedStops = [];
      const unjustifiedError = null;

      console.log('🔍 handleShowStops - Resultado da busca:', {
        error: unjustifiedError,
        found: unjustifiedStops?.length || 0,
        stops: unjustifiedStops
      });

      if (!unjustifiedError && unjustifiedStops && unjustifiedStops.length > 0) {
        currentStop = unjustifiedStops[0];
      }

      if (currentStop) {
        // Abrir modal de justificativa para esta parada
        console.log('🔍 handleShowStops - Parada encontrada:', {
          id: currentStop.id,
          inicio: currentStop.inicio_unix_segundos,
          motivo: currentStop.motivo_parada
        });
        setIsManualStopMode(false);
        setSelectedStopId(currentStop.id);
      } else {
        // Nenhuma parada encontrada para justificar
        console.log('⚠️ handleShowStops - Nenhuma parada encontrada:', {
          pendingStops,
          justifiedStopReason
        });
        setErrorModalMessage('Não há parada para justificar no momento');
      }
    } catch (err) {
      console.error('Erro ao buscar parada para justificar:', err);
      setErrorModalMessage('Erro ao buscar parada para justificar');
    }
  };

  // Função para mostrar modal de pré-justificação
  const handleShowPreStopModal = () => {
    setIsPreJustificationMode(true);
  };

  // Função para lidar com pré-seleção de motivo de parada
  const handlePreSelectStopReason = (reasonId: number) => {
    setPreSelectedStopReason(reasonId);
    setSelectedStopId(null); // Fechar o modal existente
    setIsPreJustificationMode(false); // Sair do modo de pré-justificação
    
    // Buscar a descrição do motivo para exibir
    const selectedReason = stopReasons.find(reason => reason.id === reasonId);
    if (selectedReason) {
      setPreSelectedStopReasonDesc(selectedReason.descricao);
      setErrorModalMessage(`Motivo pré-selecionado: ${selectedReason.descricao}. Aguardando registro de parada...`);
      setTimeout(() => setErrorModalMessage(null), 3000);
    }
  };

  // Função para verificar se há parada não justificada e aplicar pré-justificação
  const checkAndApplyPreJustification = async () => {
    if (!preSelectedStopReason) return;

    try {
      console.log('🔍 checkAndApplyPreJustification - Iniciando verificação...');
      console.log('🔍 Máquina atual:', machine.id_maquina, machine.nome);
      console.log('🔍 Motivo pré-selecionado:', preSelectedStopReason);
      
      // 🔒 VERIFICAÇÃO CRÍTICA: Só justificar se a máquina realmente parou
      const { data: machineStats, error: statsError } = await supabase
        .from('machine_stats')
        .select('status')
        .eq('id_maquina', machine.id_maquina)
        .single();

      if (statsError) {
        console.error('❌ Erro ao buscar status da máquina:', statsError);
        return;
      }

      // 🚫 ABORTAR se a máquina NÃO estiver parada
      if (machineStats.status !== false) {
        console.log('⏸️ Máquina NÃO está parada (status:', machineStats.status, '). Aguardando parada real...');
        return; // Não justificar nada se a máquina não parou
      }

      console.log('✅ Máquina confirmada parada (status: false). Procurando parada para justificar...');
      
      // Buscar TODAS as paradas não justificadas para DEBUG
      // ✅ REMOVIDO: Consulta paradas_redis desabilitada - dados devem vir via SSE
      console.log('⚠️ checkAndApplyPreJustification desabilitado - dados devem vir via SSE');
      const allUnjustifiedStops = [];
      const allError = null;

      if (allError) {
        console.error('❌ Erro ao buscar todas as paradas não justificadas:', allError);
      } else {
        console.log('🔍 TODAS as paradas não justificadas no sistema:', allUnjustifiedStops);
      }
      
      // Buscar paradas não justificadas para a máquina atual
      // ✅ REMOVIDO: Consulta paradas_redis desabilitada - dados devem vir via SSE
      console.log('⚠️ Segunda consulta de paradas desabilitada');
      const unjustifiedStops = [];
      const error = null;

      if (error) {
        console.error('❌ Erro ao buscar paradas não justificadas:', error);
        return;
      }

      console.log('🔍 Paradas não justificadas encontradas para máquina atual:', unjustifiedStops);
      console.log('🔍 Query executada para máquina ID:', machine.id_maquina);

      if (unjustifiedStops && unjustifiedStops.length > 0) {
        const stop = unjustifiedStops[0];
        console.log('🔍 Parada selecionada para pré-justificação:', {
          id: stop.id,
          id_maquina: stop.id_maquina,
          nome_maquina: machine.nome,
          data_inicio: new Date(stop.data_inicio_unix * 1000).toLocaleString('pt-BR')
        });
        
        // Verificação EXTRA de segurança
        if (stop.id_maquina !== machine.id_maquina) {
          console.error('❌ ERRO CRÍTICO: Parada de máquina diferente!', {
            parada_maquina: stop.id_maquina,
            maquina_atual: machine.id_maquina,
            parada_id: stop.id,
            maquina_nome: machine.nome
          });
          console.error('❌ ABORTANDO pré-justificação por segurança!');
          return; // Não justificar parada de outra máquina
        }
        
        // Verificação adicional: confirmar que a parada ainda existe e não foi justificada
        // ✅ REMOVIDO: Consulta paradas_redis desabilitada - dados devem vir via SSE
        console.log('⚠️ Confirmação de parada desabilitada');
        const stopConfirmations = [];
        const confirmationError = null;
          
        if (confirmationError || !stopConfirmations || stopConfirmations.length === 0) {
          console.error('❌ Erro ao confirmar parada:', confirmationError);
          return;
        }
        
        const stopConfirmation = stopConfirmations[0];
        
        if (!stopConfirmation) {
          console.error('❌ Parada não encontrada na confirmação');
          return;
        }
        
        if (stopConfirmation.motivo_parada !== null) {
          console.log('✅ Parada já foi justificada, pulando...');
          return;
        }
        
        if (stopConfirmation.id_maquina !== machine.id_maquina) {
          console.error('❌ ERRO CRÍTICO: Confirmação falhou - parada de máquina diferente!', {
            parada_maquina: stopConfirmation.id_maquina,
            maquina_atual: machine.id_maquina
          });
          return;
        }
        
        console.log('✅ Parada confirmada da máquina atual, aplicando pré-justificação...');
        
        // Aplicar a pré-justificação automaticamente
        await handleJustifyStop(0, stop.id, preSelectedStopReason);
        
        // Limpar a variável de pré-seleção
        setPreSelectedStopReason(null);
        setPreSelectedStopReasonDesc(null);
        
        console.log('✅ Pré-justificação aplicada automaticamente para parada:', stop.id);
      } else {
        console.log('🔍 Nenhuma parada não justificada encontrada para a máquina atual');
      }
    } catch (err) {
      console.error('❌ Erro ao aplicar pré-justificação:', err);
    }
  };

  // Verificar pré-justificação periodicamente
  React.useEffect(() => {
    if (!preSelectedStopReason) return;

    const intervalId = setInterval(() => {
      checkAndApplyPreJustification();
    }, 10000); // Verificar a cada 10 segundos

    return () => clearInterval(intervalId);
  }, [preSelectedStopReason, machine.id_maquina]);

  const handleJustifyStop = async (reasonId: number, stopId?: number, preSelectedReasonId?: number) => {
    try {
      console.log('🔍 handleJustifyStop - Iniciando justificação...');
      console.log('🔍 Máquina atual:', machine.id_maquina, machine.nome);
      console.log('🔍 stopId fornecido:', stopId);
      console.log('🔍 selectedStopId:', selectedStopId);
      
      // Usar o motivo pré-selecionado se fornecido, senão usar o selecionado no modal
      const finalReasonId = preSelectedReasonId || reasonId;
      
      // Usar o stopId fornecido ou o selectedStopId
      const finalStopId = stopId || selectedStopId;
      
      if (!finalStopId) {
        throw new Error('ID da parada não fornecido');
      }
      
      console.log('🔍 ID final da parada:', finalStopId);
      
      // Verificar se a parada realmente pertence à máquina atual
      // ✅ REMOVIDO: Consulta paradas_redis desabilitada - dados devem vir via SSE
      console.log('⚠️ handleJustifyStop desabilitado - justificação via SSE necessária');
      const stopDataArray = [];
      const stopError = null;
        
      if (stopError || !stopDataArray || stopDataArray.length === 0) {
        console.error('❌ Erro ao buscar dados da parada:', stopError);
        throw new Error('Parada não encontrada no banco de dados');
      }
      
      const stopData = stopDataArray[0];
      
      if (stopData.id_maquina !== machine.id_maquina) {
        console.error('❌ ERRO CRÍTICO: Tentativa de justificar parada de máquina diferente!', {
          parada_maquina: stopData.id_maquina,
          nome_parada_maquina: 'N/A', // Não temos o nome da máquina da parada
          maquina_atual: machine.id_maquina,
          nome_maquina_atual: machine.nome
        });
        throw new Error(`Tentativa de justificar parada da máquina ID ${stopData.id_maquina} em vez da máquina atual ${machine.nome} (ID: ${machine.id_maquina})`);
      }
      
      console.log('✅ Parada confirmada da máquina atual, prosseguindo com justificação...');
      
      // Primeiro buscar a descrição do motivo
      const { data: reasonData, error: reasonError } = await supabase
        .from('motivos_parada')
        .select('descricao')
        .eq('id', finalReasonId)
        .single();

      if (reasonError) throw reasonError;

      // Buscar o turno atual para a máquina
      let turnoId = null;
      try {
        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

        // 1. Buscar o grupo da máquina
        const { data: machineData, error: machineError } = await supabase
          .from('Maquinas')
          .select('grupo')
          .eq('id_maquina', machine.id_maquina)
          .single();

        if (!machineError && machineData?.grupo) {
          // 2. Buscar turnos associados à máquina ou ao seu grupo
          const { data: maquinasTurnoData, error: maquinasTurnoError } = await supabase
            .from('maquinas_turno')
            .select('id_turno, turnos (id, hora_inicio, hora_fim, descricao, dias_semana)')
            .or(`id_maquina.eq.${machine.id_maquina},id_grupo.eq.${machineData.grupo}`);

          if (!maquinasTurnoError && maquinasTurnoData && maquinasTurnoData.length > 0) {
            for (const mt of maquinasTurnoData) {
              const shift = mt.turnos;
              if (!shift) continue;

              // Verificar se o dia da semana corresponde
              const diasSemana = shift.dias_semana;
              const isDayMatch = diasSemana === null || diasSemana.length === 0 || diasSemana.includes(currentDay);

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

                // Lógica para turnos que viram a noite (ex: 22:00 - 06:00)
                if (startTime.getTime() > endTime.getTime()) {
                  // Turno vira a noite
                  const isActive = currentTime.getTime() >= startTime.getTime() || currentTime.getTime() <= endTime.getTime();
                  if (isActive) {
                    turnoId = shift.id;
                    break;
                  }
                } else {
                  // Turno no mesmo dia
                  const isActive = currentTime.getTime() >= startTime.getTime() && currentTime.getTime() <= endTime.getTime();
                  if (isActive) {
                    turnoId = shift.id;
                    break;
                  }
                }
              }
            }
          }
        }
      } catch (turnoError) {
        console.error('Erro ao buscar turno atual:', turnoError);
        // Continuar sem o turno se houver erro
      }

      // TODO: MIGRAR PARA API REST - justificar parada via apiService
      console.log('🔧 TODO: Enviar justificação via API REST:', {
        id_parada: finalStopId,
        id_motivo: finalReasonId
      });
      
      // Atualizar diretamente no banco de dados (temporário até migração para API)
      // ✅ REMOVIDO: Update paradas_redis desabilitado - justificação via API REST necessária
      console.log('⚠️ Update de parada desabilitado - usar API REST para justificar');
      const updateError = null;
      
      if (updateError) {
        throw new Error('Falha ao justificar parada no banco de dados');
      }
      
      // Parada justificada com sucesso
      setErrorModalMessage('Parada justificada com sucesso!');
      
      // Fechar modal após um delay
      setTimeout(() => {
      setSelectedStopId(null);
        setErrorModalMessage(null);
      }, 2000);
      
      // Atualizar contagem de paradas pendentes (isso vai atualizar o estado do botão)
      await countPendingStops();
      
    } catch (err) {
      console.error('Error justifying stop:', err);
      setErrorModalMessage('Erro ao justificar parada. Tente novamente.');
    }
  };

  // Precisamos definir productionProps antes de usar
  const productionProps = {
    selectedGrades,
    operatorId,
    isFinishingBatch,
    onSelectGrade: handleSelectGrade,
    onSelectAllGrades: handleSelectAllGrades,
    onFinishBatch: handleFinishBatch,
    onFinishProduction: handleFinishProduction
  };

  // Se a página de comandos de produção estiver ativa, renderizar apenas ela
  if (showProductionCommands) {
    return (
      <ProductionCommandsPage
        machineId={machine.id_maquina}
        sessionId={currentSessionId}
        operadorId={operatorId || 0}
        onBack={() => setShowProductionCommands(false)}
      />
    );
  }

  return (
    <div className={`flex flex-col min-h-screen bg-gradient-to-br ${statusParada ? 'from-red-900 via-red-800 to-red-900' : 'from-blue-900 via-blue-800 to-indigo-900'}`}>
      <Sidebar
        pendingStops={pendingStops}
        pendingStopStartTime={pendingStopStartTime}
        justifiedStopReason={justifiedStopReason}
        sessionId={currentSessionId}
        machineId={machine.id_maquina}
        operadorId={operatorId || 0}
        onShowStops={handleShowStops}
        onShowSettings={onShowSettings}
        onShowProductionCommands={() => setShowProductionCommands(true)}
        onCollapsedChange={setSidebarCollapsed}
        secondaryOperator={secondaryOperator}
        onShowPreStopModal={handleShowPreStopModal}
        preSelectedStopReasonDesc={preSelectedStopReasonDesc}
        canPreJustify={canPreJustify}
        onShowStopReasonModal={handleShowStopReasonModal}
        isMachineStopped={isMachineStopped}
        onForcedResume={handleForcedResume}
        currentStopJustified={currentStopJustified}
        wsData={sseMachineData}
        onWsEndSession={() => console.log('TODO: Implementar finalizar sessão via API')}
      />

      <DashboardHeader
        machine={machine}
        realtimeMachine={realtimeMachine}
        user={user}
        currentShift={currentShift}
        shiftError={shiftError}
        sidebarCollapsed={sidebarCollapsed}
        velocidade={velocidade}
        statusParada={statusParada}
        onRefresh={handleRefresh}
      />

      <JustifyStopModal
        isOpen={selectedStopId !== null || isPreJustificationMode || showStopReasonModal}
        onClose={() => {
          setSelectedStopId(null);
          setIsPreJustificationMode(false);
          setShowStopReasonModal(false);
          setIsManualStopMode(false);
        }}
        onJustify={(reasonId) => {
          if (isManualStopMode) {
            handleForcedStop(reasonId);
          } else if (isPreJustificationMode) {
            handlePreSelectStopReason(reasonId);
          } else {
            handleJustifyStop(reasonId, selectedStopId);
          }
        }}
        stopReasons={stopReasons}
        machineGroup={machineGroup}
        isPreJustificationMode={isPreJustificationMode}
        isManualStop={isManualStopMode}
      />


      <main className="flex-1 pt-16 pl-16 pr-4 pb-4 relative z-0 overflow-hidden flex flex-col">
        <div className="flex-1 flex flex-col max-w-full mx-auto w-full pl-52 md:pl-4 lg:pl-52">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-medium text-white">Dashboard de Produção</h2>
            <div className="flex items-center gap-2">
              <span className="text-sm text-white/60 mr-2">Visualização:</span>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-0.5 flex gap-0.5">
                <button
                  onClick={() => handleViewStyleChange('grid')}
                  className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                    viewStyle === 'grid' 
                      ? 'bg-white/20 text-white' 
                      : 'text-white/60 hover:text-white hover:bg-white/10'
                  }`}
                >
                  Grade
                </button>
                {machine.nome?.toUpperCase().includes('EVA') && (
                <button
                    onClick={() => handleViewStyleChange('eva')}
                  className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                      viewStyle === 'eva' 
                      ? 'bg-white/20 text-white' 
                      : 'text-white/60 hover:text-white hover:bg-white/10'
                  }`}
                >
                    EVA
                </button>
                )}
              </div>
              {/* Indicador visual da visualização atual */}
              <div className="ml-4 px-3 py-1.5 bg-blue-600/20 border border-blue-400/30 rounded-lg">
                <span className="text-sm text-blue-200 font-medium">
                  Atual: {viewStyle === 'grid' ? 'Grade' : 'EVA'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-auto">

            {loading ? (
              <LoadingSpinner />
            ) : productionError ? (
              <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-6 text-white m-4">
                <p>{productionError}</p>
              </div>
            ) : (
              // Sempre mostrar a interface, independente de ter produção alocada
              isMultiStation ? (
                // Interface para máquinas multipostos
                !hasProduction ? (
                  // Quando não há produção, mostrar EmptyProduction
                  <EmptyProduction onSetup={() => setShowSetup(true)} />
                ) : (
                  // Quando há produção, mostrar os dados normalmente
                  viewStyle === 'eva' ? (
                    // Visualização EVA - layout otimizado para tablets
                    <div className="flex w-full gap-0">
                      {/* Lista Esquerda - MATRIZ ESQUERDA */}
                      <div className="w-1/2">
                        <div className="p-4 pr-0">
                          <h3 className="text-base font-semibold text-white mb-3 flex items-center gap-2">
                            <div className="w-2.5 h-2.5 bg-blue-500 rounded-full"></div>
                            Matriz Esquerda (8 estações)
                          </h3>
                        </div>
                        <div className="px-4 pr-2 pb-4">
                          <ChildMachineGrid 
                            productions={evaProductions.left}
                            onAddReject={handleAddReject}
                            statusParada={statusParada}
                            noGaps={true}
                            isEvaMode={true}
                            side="left"
                            lastSignalStationId={lastSignalStationId}
                          />
                        </div>
                      </div>

                      {/* Lista Direita - MATRIZ DIREITA */}
                      <div className="w-1/2">
                        <div className="p-4 pl-0">
                          <h3 className="text-base font-semibold text-white mb-3 flex items-center gap-2">
                            <div className="w-2.5 h-2.5 bg-green-500 rounded-full"></div>
                            Matriz Direita (8 estações)
                          </h3>
                        </div>
                        <div className="px-4 pl-2 pb-4">
                          <ChildMachineGrid 
                            productions={evaProductions.right}
                            onAddReject={handleAddReject}
                            statusParada={statusParada}
                            noGaps={true}
                            isEvaMode={true}
                            side="right"
                            lastSignalStationId={lastSignalStationId}
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    // Visualização padrão - Grade
                    <ChildMachineGrid 
                      productions={sortedProductions}
                      onAddReject={handleAddReject}
                      statusParada={statusParada}
                      lastSignalStationId={lastSignalStationId}
                    />
                  )
                )
              ) : (
                // ✅ APENAS Dashboard SSE - Interface para máquinas de estação única
                <SingleMachineViewNew 
                  machineData={sseMachineData}
                  onAddReject={handleAddReject}
                  onAddRejeito={handleAddRejeito}
                  statusParada={statusParada}
                />
              )
            )}
          </div>
        </div>
      </main>

      {errorModalMessage && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                {errorModalMessage.includes('sucesso') || errorModalMessage.includes('Pré-selecionado') || errorModalMessage.includes('Aguardando registro') ? (
                  <>
                    <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    Sucesso
                  </>
                ) : (
                  <>
                    <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </div>
                    Erro
                  </>
                )}
              </h3>
            </div>
            <p className={`text-center mb-6 ${
              errorModalMessage.includes('sucesso') ? 'text-green-200' : 'text-red-200'
            }`}>
              {errorModalMessage}
            </p>
            <div className="flex justify-center">
              <button
                onClick={() => setErrorModalMessage(null)}
                className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                  errorModalMessage.includes('sucesso') 
                    ? 'bg-green-600 hover:bg-green-700 text-white' 
                    : 'bg-red-600 hover:bg-red-700 text-white'
                }`}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status do SSE */}
      {renderSSEStatus()}

      {/* ✅ NOVO: Debug do Armazenamento WebSocket */}
      <ErrorBoundary
        fallback={
          <div className="fixed bottom-4 right-4 bg-red-900/20 border border-red-500/30 rounded-lg p-4 z-50">
            <p className="text-red-400 text-sm">Erro no debug WebSocket</p>
            <button
              onClick={() => setShowWebSocketDebug(false)}
              className="mt-2 bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-xs"
            >
              Fechar
            </button>
          </div>
        }
      >
        <WebSocketStorageDebug
          parentMachineId={machine.id_maquina}
          isVisible={showWebSocketDebug}
          onToggle={() => setShowWebSocketDebug(!showWebSocketDebug)}
        />
      </ErrorBoundary>

    </div>
  );
}