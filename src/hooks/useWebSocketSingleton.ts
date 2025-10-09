import { useState, useEffect, useCallback, useRef } from 'react';
import { webSocketManager, WebSocketCommands } from './useWebSocketManager';
import { useWebSocketStorage } from '../lib/websocketStorage';
import type {
  MachineUpdateEvent,
  ProductionAlertEvent,
  MachineDataNew
} from '../types/websocket-new';

interface UseWebSocketSingletonOptions {
  machineId: number;
  // ✅ MANTIDO PARA COMPATIBILIDADE - mas usando nova implementação internamente
  onMachineData?: (event: any) => void;
  onSignal?: (event: any) => void;
  onReject?: (event: any) => void;
  onVelocity?: (event: any) => void;
  onStop?: (event: any) => void;
  onResume?: (event: any) => void;
  onStartSessionAck?: (event: any) => void;
  onEndSessionAck?: (event: any) => void;
  onForcedStop?: (event: any) => void;
  onForcedResume?: (event: any) => void;
  onForcedStopAck?: (event: any) => void;
  onForcedResumeAck?: (event: any) => void;
  onError?: (event: any) => void;
  autoConnect?: boolean;
  shouldReconnect?: boolean;
}

interface WebSocketState {
  connected: boolean;
  error: string | null;
  machineData: MachineDataNew | null;
}

export function useWebSocketSingleton({
  machineId,
  onMachineData,
  onSignal,
  onReject,
  onVelocity,
  onStop,
  onResume,
  onStartSessionAck,
  onEndSessionAck,
  onForcedStop,
  onForcedResume,
  onForcedStopAck,
  onForcedResumeAck,
  onError,
  autoConnect = true,
  shouldReconnect = true
}: UseWebSocketSingletonOptions) {
  
  // ✅ NOVO: Sistema de armazenamento local
  const storage = useWebSocketStorage();
  
  const [state, setState] = useState<WebSocketState>({
    connected: webSocketManager.isConnected() && webSocketManager.getSubscribedMachines().includes(machineId),
    error: null,
    machineData: null
  });
  
  // Referência para rastrear se o componente está montado
  const isMountedRef = useRef(true);
  
  // Conectar ao WebSocket
  const connect = useCallback(() => {
    webSocketManager.connect(shouldReconnect);
    // Inscrição será feita após mensagem de conexão
  }, [machineId, shouldReconnect]);
  
  // Desconectar do WebSocket
  const disconnect = useCallback(() => {
    webSocketManager.disconnect();
  }, [machineId]);
  
  const iniciarSessaoOperador = useCallback((operatorId: number, turnoId: number, sessionId?: number) => {
    console.log('🔌 iniciarSessaoOperador - Parâmetros:', { machineId, operatorId, turnoId, sessionId });
    const command = WebSocketCommands.iniciarSessaoOperador(machineId, operatorId, turnoId, sessionId);
    return webSocketManager.sendCommand(command);
  }, [machineId]);

  const finalizarSessaoOperador = useCallback(() => {
    const command = WebSocketCommands.finalizarSessaoOperador(machineId);
    return webSocketManager.sendCommand(command);
  }, [machineId]);

  const consultarSessao = useCallback(() => {
    const command = WebSocketCommands.consultarSessao(machineId);
    return webSocketManager.sendCommand(command);
  }, [machineId]);

  const iniciarProducaoMapa = useCallback((gradeId: number, quantidade: number) => {
    const command = WebSocketCommands.iniciarProducaoMapa(machineId, gradeId, quantidade);
    return webSocketManager.sendCommand(command);
  }, [machineId]);

  const finalizarProducaoMapaParcial = useCallback(() => {
    const command = WebSocketCommands.finalizarProducaoMapaParcial(machineId);
    return webSocketManager.sendCommand(command);
  }, [machineId]);

  const finalizarProducaoMapaCompleta = useCallback(() => {
    const command = WebSocketCommands.finalizarProducaoMapaCompleta(machineId);
    return webSocketManager.sendCommand(command);
  }, [machineId]);

  const adicionarRejeitos = useCallback((targetMachineId: number) => {
    const command = WebSocketCommands.adicionarRejeitos(targetMachineId);
    return webSocketManager.sendCommand(command);
  }, []);

  const atribuirMotivoParada = useCallback((idParada: number, idMotivo: number) => {
    const command = WebSocketCommands.atribuirMotivoParada(idParada, idMotivo);
    return webSocketManager.sendCommand(command);
  }, []);

  // ✅ Removido getMachineData (não enviaremos consultar_maquina)
  
  const startSession = useCallback((operatorId: number, sessionId: number) => {
    console.log('🔌 startSession chamado com:', { operatorId, sessionId });
    return iniciarSessaoOperador(operatorId, 1, sessionId); // turno padrão + id_sessao
  }, [iniciarSessaoOperador]);
  
  const endSession = useCallback(() => {
    return finalizarSessaoOperador();
  }, [finalizarSessaoOperador]);
  
  // ✅ Usar refs para callbacks - evita re-registros de listeners
  const callbacksRef = useRef({
    onMachineData,
    onSignal,
    onReject,
    onVelocity,
    onStop,
    onResume,
    onError
  });

  // Atualizar refs quando props mudarem (sem causar re-render)
  useEffect(() => {
    callbacksRef.current = {
      onMachineData,
      onSignal,
      onReject,
      onVelocity,
      onStop,
      onResume,
      onError
    };
  });

  // ✅ Marcar componente como montado
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // ✅ Registrar listeners UMA VEZ apenas
  useEffect(() => {
    console.log(`🎧 Registrando listeners para máquina ${machineId}`);
    
    // Wrappers que chamam handlers via refs
    const connectionHandler = (data: any) => {
      if (!isMountedRef.current) {
        console.log('⚠️ Ignorando connection - componente desmontado');
        return;
      }
      const connected = data.connected !== undefined ? data.connected : true;
      console.log('🔌 WebSocket estado atualizado:', connected);
      setState(prev => ({ ...prev, connected }));
      
      if (connected) {
        callbacksRef.current.onMachineData?.({
          type: 'connection_established',
          id_maquina: machineId,
          timestamp: new Date().toISOString()
        });
      }
    };

    const connectionEstHandler = (data: any) => {
      const connected = data.connected !== undefined ? data.connected : true;
      if (connected) {
        setTimeout(() => {
          webSocketManager.subscribe(machineId);
        }, 300);
      }
    };

    const machineDataHandler = (data: any) => {
      if (!isMountedRef.current) {
        console.log('⚠️ Ignorando machine_data - componente desmontado');
        return;
      }
      if (!data) return;
      
      const payload: MachineDataNew | undefined = (data as any)?.machine_data || (data as any);
      if (payload && payload.id === machineId) {
        console.log('📦 Dados de máquina recebidos via resposta de comando');
        setState(prev => ({ ...prev, connected: true, error: null, machineData: payload }));
        callbacksRef.current.onMachineData?.({ 
          type: 'machine_data', 
          id_maquina: machineId, 
          dados_maquina: payload, 
          timestamp: Date.now() 
        });
      }
    };

    const machineUpdateHandler = (data: MachineUpdateEvent) => {
      // ✅ Verificar se está montado E se é da máquina correta
      if (!isMountedRef.current) {
        console.log('⚠️ Ignorando machine_update - componente desmontado');
        return;
      }
      
      if (data.target_machine_id !== machineId) return;
      
      console.log('📨 WebSocket machine_update recebido para máquina:', machineId);
      
      // ✅ NOVO: Armazenar mensagem WebSocket
      storage.storeMessage({
        type: data.type,
        target_machine_id: data.target_machine_id,
        source_machine_id: data.source_machine_id,
        machine_data: data.machine_data,
        additional_data: data.additional_data,
        timestamp: data.timestamp,
        raw_message: data
      });
      
      // ✅ NOVO: Atualizar dados da estação no armazenamento local
      storage.updateStationFromMessage(data);
      
      const isChildStation = data.is_child_update === true || data.source_machine_id !== data.target_machine_id;
      
      if (isChildStation) {
        console.log('👶 [NOVA] Update de ESTAÇÃO FILHA:', data.source_machine_id, data.machine_data.nome);
        
        const childStationEvent = {
          type: 'sinal',
          id_maquina: machineId,
          from_child: data.source_machine_id,
          child_name: data.machine_data.nome,
          sessao_operador: data.machine_data.sessao_operador,
          producao_mapa: data.machine_data.producao_mapa,
          additional_data: data.additional_data
        };
        
        callbacksRef.current.onSignal?.(childStationEvent);
        
        if (data.update_type === 'sinal') {
          callbacksRef.current.onMachineData?.({
            type: 'machine_data',
            id_maquina: machineId,
            is_multipostos: true,
            children: [data.machine_data],
            timestamp: data.timestamp
          });
        }
      } else {
        console.log('🏭 [NOVA] Update da MÁQUINA PRINCIPAL:', data.target_machine_id);
        
        // ✅ Verificar novamente antes de setState
        if (!isMountedRef.current) return;
        
        setState(prev => ({ 
          ...prev, 
          connected: true, 
          error: null,
          machineData: data.machine_data 
        }));
        
        if (data.update_type === 'sinal') {
          console.log('📊 [NOVA] Evento de SINAL detectado para máquina principal:', data.additional_data);
          callbacksRef.current.onSignal?.({
            type: 'sinal',
            id_maquina: data.target_machine_id,
            from_child: null,
            child_name: null,
            sessao_operador: data.machine_data.sessao_operador,
            producao_mapa: data.machine_data.producao_mapa,
            additional_data: data.additional_data,
            timestamp: data.timestamp
          });
        } else if (data.update_type === 'parada') {
          console.log('⛔ [NOVA] Evento de PARADA detectado:', data.additional_data);
          callbacksRef.current.onStop?.({
            type: 'parada',
            id_maquina: data.target_machine_id,
            parada_id: data.additional_data?.parada_id,
            motivo: data.additional_data?.motivo_id,
            timestamp: data.timestamp
          });
        } else if (data.update_type === 'retomada') {
          console.log('▶️ [NOVA] Evento de RETOMADA detectado:', data.additional_data);
          callbacksRef.current.onResume?.({
            type: 'retomada',
            id_maquina: data.target_machine_id,
            duracao: data.additional_data?.duracao_segundos,
            timestamp: data.timestamp
          });
        } else if (data.update_type === 'velocidade') {
          console.log('⚡ [NOVA] Evento de VELOCIDADE detectado:', data.additional_data);
          callbacksRef.current.onVelocity?.({
            type: 'velocidade',
            id_maquina: data.target_machine_id,
            velocidade: data.additional_data?.velocidade || data.machine_data.velocidade,
            timestamp: data.timestamp
          });
        }
        
        callbacksRef.current.onMachineData?.({
          type: 'machine_data',
          id_maquina: data.target_machine_id,
          dados_maquina: data.machine_data,
          timestamp: data.timestamp
        });
      }
    };

    const productionAlertHandler = (data: ProductionAlertEvent) => {
      if (!isMountedRef.current) {
        console.log('⚠️ Ignorando production_alert - componente desmontado');
        return;
      }
      if (data.target_machine_id !== machineId) return;
      
      switch (data.alert_type) {
        case 'meta_atingida':
        case 'proximo_meta':
          callbacksRef.current.onMachineData?.(data);
          break;
        default:
          callbacksRef.current.onMachineData?.(data);
      }
    };

    const commandSuccessHandler = (data: any) => {
      // ✅ Sempre verificar se está montado antes de setState
      if (!isMountedRef.current) {
        console.log('⚠️ Ignorando command_success - componente desmontado');
        return;
      }
      
      console.log('✅ WebSocket comando executado com sucesso:', data.message);
      
      if (data.message && data.message.includes('Inscrito na máquina')) {
        console.log('🔌 WebSocket marcando como conectado após subscribe');
        setState(prev => ({ ...prev, connected: true, error: null }));
      }
    };

    const errorHandler = (data: { error: any }) => {
      // ✅ Sempre verificar se está montado antes de setState
      if (!isMountedRef.current) {
        console.log('⚠️ Ignorando error - componente desmontado');
        return;
      }
      setState(prev => ({ ...prev, error: 'Erro na conexão WebSocket' }));
      callbacksRef.current.onError?.({ type: 'error', message: 'Erro na conexão WebSocket' });
    };
    
    webSocketManager.addListener('connection', connectionHandler);
    webSocketManager.addListener('connection', connectionEstHandler);
    webSocketManager.addListener('machine_data', machineDataHandler);
    webSocketManager.addListener('machine_update', machineUpdateHandler);
    webSocketManager.addListener('production_alert', productionAlertHandler);
    webSocketManager.addListener('command_success', commandSuccessHandler);
    webSocketManager.addListener('error', errorHandler);

    // Conectar automaticamente se habilitado
    if (autoConnect) {
      setTimeout(() => {
        if (isMountedRef.current) {
          connect();
        }
      }, 100);
    }

    // Cleanup - remover listeners ao desmontar
    return () => {
      console.log(`🧹 Removendo listeners da máquina ${machineId}`);
      webSocketManager.removeListener('connection', connectionHandler);
      webSocketManager.removeListener('connection', connectionEstHandler);
      webSocketManager.removeListener('machine_data', machineDataHandler);
      webSocketManager.removeListener('machine_update', machineUpdateHandler);
      webSocketManager.removeListener('production_alert', productionAlertHandler);
      webSocketManager.removeListener('command_success', commandSuccessHandler);
      webSocketManager.removeListener('error', errorHandler);
      
      // Desinscrever da máquina
      webSocketManager.unsubscribe(machineId);
    };
  }, [machineId, autoConnect, connect]);

  return {
    // Estado
    connected: state.connected,
    error: state.error,
    machineData: state.machineData,
    
    // Métodos de conexão
    connect,
    disconnect,
    
    // ✅ NOVOS COMANDOS
    iniciarSessaoOperador,
    finalizarSessaoOperador,
    consultarSessao,
    iniciarProducaoMapa,
    finalizarProducaoMapaParcial,
    finalizarProducaoMapaCompleta,
    adicionarRejeitos,
    atribuirMotivoParada,
    
    // ✅ COMANDOS LEGADOS (compatibilidade)
    startSession,
    endSession,
    reject: adicionarRejeitos // Alias para compatibilidade
  };
}