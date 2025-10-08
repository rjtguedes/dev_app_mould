import { useState, useEffect, useCallback, useRef } from 'react';
import { webSocketManager, WebSocketCommands } from './useWebSocketManager';
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
  const [state, setState] = useState<WebSocketState>({
    connected: webSocketManager.isConnected() && webSocketManager.getSubscribedMachines().includes(machineId),
    error: null,
    machineData: null
  });
  
  // Referência para rastrear se o componente está montado
  const isMountedRef = useRef(true);
  
  // Atualizar estado de conexão
  const handleConnectionChange = useCallback((data: any) => {
    if (isMountedRef.current) {
      const connected = data.connected !== undefined ? data.connected : true;
      console.log('🔌 WebSocket estado atualizado:', connected);
      setState(prev => ({ ...prev, connected }));
      
      // Notificar sobre mudanças de conexão
      if (connected) {
        onMachineData?.({
          type: 'connection_established',
          id_maquina: machineId,
          timestamp: new Date().toISOString()
        });
      }
    }
  }, [machineId, onMachineData]);
  
  // ✅ NOVA IMPLEMENTAÇÃO - usando machine_update
  const handleMachineUpdate = useCallback((data: MachineUpdateEvent) => {
    if (isMountedRef.current && data.target_machine_id === machineId) {
      console.log('📨 WebSocket machine_update recebido para máquina:', machineId);
      
      // ✅ Verificar se é update de estação filha (child machine/posto)
      const isChildStation = data.is_child_update === true || data.source_machine_id !== data.target_machine_id;
      
      if (isChildStation) {
        // É uma estação filha (posto) - enviar dados específicos da estação
        console.log('👶 [NOVA] Update de ESTAÇÃO FILHA:', data.source_machine_id, data.machine_data.nome);
        
        // Converter para formato compatível com o dashboard atual
        const childStationEvent = {
          type: 'sinal',
          id_maquina: machineId,
          from_child: data.source_machine_id,
          child_name: data.machine_data.nome,
          sessao_operador: data.machine_data.sessao_operador,
          producao_mapa: data.machine_data.producao_mapa,
          additional_data: data.additional_data
        };
        
        // Enviar evento de sinal para a estação filha
        onSignal?.(childStationEvent);
        
        // Se for sinal, também enviar como machine_data para compatibilidade
        if (data.update_type === 'sinal') {
          const legacyEvent = {
            type: 'machine_data',
            id_maquina: machineId,
            is_multipostos: true,
            children: [data.machine_data], // Array com dados da estação específica
            timestamp: data.timestamp
          };
          
          onMachineData?.(legacyEvent);
        }
      } else {
        // É a máquina principal - atualizar seus dados
        console.log('🏭 [NOVA] Update da MÁQUINA PRINCIPAL:', data.target_machine_id);
        setState(prev => ({ 
          ...prev, 
          connected: true, 
          error: null,
          machineData: data.machine_data 
        }));
        
        // Converter para formato antigo para compatibilidade
        const legacyEvent = {
          type: 'machine_data',
          id_maquina: data.target_machine_id,
          dados_maquina: data.machine_data,
          timestamp: data.timestamp
        };
        
        onMachineData?.(legacyEvent);
      }
    }
  }, [machineId, onMachineData, onSignal]);

  // ✅ NOVA IMPLEMENTAÇÃO - usando production_alert
  const handleProductionAlert = useCallback((data: ProductionAlertEvent) => {
    if (isMountedRef.current && data.target_machine_id === machineId) {
      // Converter alertas para eventos específicos
      switch (data.alert_type) {
        case 'meta_atingida':
        case 'proximo_meta':
          onMachineData?.(data);
          break;
        default:
          // Evento genérico
          onMachineData?.(data);
      }
    }
  }, [machineId, onMachineData]);
  
  // Atualizar estado de erro
  const handleError = useCallback((data: { error: any }) => {
    if (isMountedRef.current) {
      setState(prev => ({ ...prev, error: 'Erro na conexão WebSocket' }));
    }
    
    // Chamar handler personalizado se fornecido
    if (onError) {
      onError({ type: 'error', message: 'Erro na conexão WebSocket' });
    }
  }, [onError]);

  // Receber dados completos de máquina vindos como resposta de comando (normaliza payload)
  const handleMachineDataResponse = useCallback((data: any) => {
    if (!isMountedRef.current || !data) return;
    const payload: MachineDataNew | undefined = (data as any)?.machine_data || (data as any);
    if (payload && payload.id === machineId) {
      console.log('📦 Dados de máquina recebidos via resposta de comando (normalizado)');
      setState(prev => ({ ...prev, connected: true, error: null, machineData: payload }));
      onMachineData?.({ type: 'machine_data', id_maquina: machineId, dados_maquina: payload, timestamp: Date.now() });
    }
  }, [machineId, onMachineData]);

  // ✅ Removido consultar_maquina: backend não responde, evitar derrubar conexão

  // Handler para comandos de sucesso (como subscribe)
  const handleCommandSuccess = useCallback((data: any) => {
    if (isMountedRef.current) {
      console.log('✅ WebSocket comando executado com sucesso:', data.message);
      
      // Se for subscribe bem-sucedido, marcar como conectado
      if (data.message && data.message.includes('Inscrito na máquina')) {
        console.log('🔌 WebSocket marcando como conectado após subscribe bem-sucedido');
        setState(prev => {
          console.log('🔌 Estado anterior:', prev);
          const newState = { ...prev, connected: true, error: null };
          console.log('🔌 Novo estado:', newState);

          return newState;
        });
      }
    }
  }, []);
  
  // Conectar ao WebSocket
  const connect = useCallback(() => {
    webSocketManager.connect(shouldReconnect);
    // Inscrição será feita após mensagem de conexão
  }, [machineId, shouldReconnect]);
  
  // Desconectar do WebSocket
  const disconnect = useCallback(() => {
    webSocketManager.disconnect();
  }, [machineId]);

  // Inscrever quando a conexão for confirmada
  const handleConnectionEstablished = useCallback((data: any) => {
    const connected = data.connected !== undefined ? data.connected : true;
    if (connected) {
      setTimeout(() => {
        webSocketManager.subscribe(machineId);
      }, 300);
    }
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
  
  // Registrar listeners (evitar desinscrição em mudanças de dependências)
  useEffect(() => {
    webSocketManager.addListener('connection', handleConnectionChange);
    webSocketManager.addListener('connection', handleConnectionEstablished);
    webSocketManager.addListener('machine_data', handleMachineDataResponse);
    webSocketManager.addListener('machine_update', handleMachineUpdate);
    webSocketManager.addListener('production_alert', handleProductionAlert);
    webSocketManager.addListener('command_success', handleCommandSuccess);
    webSocketManager.addListener('error', handleError);

    // Conectar automaticamente se habilitado
    if (autoConnect) {
      connect();
    }

    // Cleanup (não desconectar aqui para evitar derrubar a conexão em re-render)
    return () => {
      webSocketManager.removeListener('connection', handleConnectionChange);
      webSocketManager.removeListener('connection', handleConnectionEstablished);
      webSocketManager.removeListener('machine_data', handleMachineDataResponse);
      webSocketManager.removeListener('machine_update', handleMachineUpdate);
      webSocketManager.removeListener('production_alert', handleProductionAlert);
      webSocketManager.removeListener('command_success', handleCommandSuccess);
      webSocketManager.removeListener('error', handleError);
    };
  }, [
    handleConnectionChange,
    handleConnectionEstablished,
    handleMachineUpdate,
    handleProductionAlert,
    handleCommandSuccess,
    handleError,
    autoConnect,
    connect
  ]);

  // Cleanup exclusivo para unmount: desinscrever
  useEffect(() => {
    return () => {
      webSocketManager.unsubscribe(machineId);
    };
  }, []);

  // Cleanup ao desmontar
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

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