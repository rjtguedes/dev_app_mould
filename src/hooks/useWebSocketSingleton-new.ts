import { useState, useEffect, useCallback, useRef } from 'react';
import { webSocketManager, WebSocketCommandsNew } from './useWebSocketManager';
import type {
  MachineUpdateEvent,
  ProductionAlertEvent,
  MachineDataNew,
  WebSocketStateNew
} from '../types/websocket-new';

interface UseWebSocketSingletonOptions {
  machineId: number;
  onMachineUpdate?: (event: MachineUpdateEvent) => void;
  onProductionAlert?: (event: ProductionAlertEvent) => void;
  onCommandSuccess?: (data: any) => void;
  onCommandError?: (error: any) => void;
  onError?: (error: any) => void;
  autoConnect?: boolean;
  shouldReconnect?: boolean;
}

interface WebSocketState {
  connected: boolean;
  error: string | null;
}

export function useWebSocketSingleton({
  machineId,
  onMachineUpdate,
  onProductionAlert,
  onCommandSuccess,
  onCommandError,
  onError,
  autoConnect = true,
  shouldReconnect = true
}: UseWebSocketSingletonOptions) {
  const [state, setState] = useState<WebSocketState>({
    connected: webSocketManager.isConnected(),
    error: null
  });
  
  // Referência para rastrear se o componente está montado
  const isMountedRef = useRef(true);
  
  // Atualizar estado de conexão
  const handleConnectionChange = useCallback((data: { connected: boolean }) => {
    if (isMountedRef.current) {
      setState(prev => ({ ...prev, connected: data.connected }));
    }
  }, []);
  
  // Atualizar estado de erro
  const handleError = useCallback((data: { error: any }) => {
    if (isMountedRef.current) {
      setState(prev => ({ ...prev, error: 'Erro na conexão WebSocket' }));
    }
    
    // Chamar handler personalizado se fornecido
    if (onError) {
      onError(data.error);
    }
  }, [onError]);
  
  // Conectar ao WebSocket
  const connect = useCallback(() => {
    webSocketManager.connect(shouldReconnect);
    // Inscrição será feita após mensagem de conexão no handler de conexão
  }, [machineId, shouldReconnect]);
  
  // Desconectar do WebSocket
  const disconnect = useCallback(() => {
    webSocketManager.disconnect();
  }, [machineId]);

  // Inscrever quando a conexão for confirmada pelo servidor
  const handleConnectionEstablished = useCallback((data: { connected: boolean }) => {
    if (data.connected) {
      setTimeout(() => {
        webSocketManager.subscribe(machineId);
      }, 300);
    }
  }, [machineId]);

  // Receber dados completos de máquina vindos como resposta de comando
  const handleMachineDataResponse = useCallback((data: any) => {
    if (isMountedRef.current && data && data.id === machineId) {
      setState(prev => ({ ...prev, connected: true, error: null }));
      // Opcionalmente, encaminhar via onMachineUpdate no formato de evento
      onMachineUpdate?.({
        type: 'machine_update',
        update_type: 'sinal',
        target_machine_id: machineId,
        source_machine_id: machineId,
        is_child_update: false,
        machine_data: data,
        additional_data: {},
        timestamp: Date.now(),
        timestamp_formatted: new Date().toISOString()
      } as any);
    }
  }, [machineId, onMachineUpdate]);
  
  // COMANDOS DE SESSÃO DE OPERADOR
  const iniciarSessaoOperador = useCallback((operatorId: number, turnoId: number) => {
    const command = WebSocketCommandsNew.iniciarSessaoOperador(machineId, operatorId, turnoId);
    return webSocketManager.sendCommand(command);
  }, [machineId]);
  
  const finalizarSessaoOperador = useCallback(() => {
    const command = WebSocketCommandsNew.finalizarSessaoOperador(machineId);
    return webSocketManager.sendCommand(command);
  }, [machineId]);
  
  // COMANDOS DE PRODUÇÃO MAPA
  const iniciarProducaoMapa = useCallback((
    mapaId: number, 
    produtoId: number,
    options: {
      itemMapaId?: number;
      corId?: number;
      matrizId?: number;
      qtProduzir?: number;
    } = {}
  ) => {
    const command = WebSocketCommandsNew.iniciarProducaoMapa(machineId, mapaId, produtoId, options);
    return webSocketManager.sendCommand(command);
  }, [machineId]);
  
  const finalizarProducaoMapaParcial = useCallback(() => {
    const command = WebSocketCommandsNew.finalizarProducaoMapaParcial(machineId);
    return webSocketManager.sendCommand(command);
  }, [machineId]);
  
  const finalizarProducaoMapaCompleta = useCallback(() => {
    const command = WebSocketCommandsNew.finalizarProducaoMapaCompleta(machineId);
    return webSocketManager.sendCommand(command);
  }, [machineId]);
  
  // COMANDOS DE REJEITOS
  const adicionarRejeitos = useCallback(() => {
    const command = WebSocketCommandsNew.adicionarRejeitos(machineId);
    return webSocketManager.sendCommand(command);
  }, [machineId]);
  
  // COMANDOS DE CONSULTA (removido consultar_maquina)
  
  const consultarSessao = useCallback(() => {
    const command = WebSocketCommandsNew.consultarSessao(machineId);
    return webSocketManager.sendCommand(command);
  }, [machineId]);
  
  const consultarProducaoMapa = useCallback(() => {
    const command = WebSocketCommandsNew.consultarProducaoMapa(machineId);
    return webSocketManager.sendCommand(command);
  }, [machineId]);
  
  // Configurar listeners ao montar o componente (evitar desinscrever em mudanças de dependências)
  useEffect(() => {
    // Marcar componente como montado
    isMountedRef.current = true;
    
    // Registrar handlers para eventos específicos (nova documentação)
    if (onMachineUpdate) webSocketManager.addListener('machine_update', onMachineUpdate);
    if (onProductionAlert) webSocketManager.addListener('production_alert', onProductionAlert);
    if (onCommandSuccess) webSocketManager.addListener('command_success', onCommandSuccess);
    if (onCommandError) webSocketManager.addListener('command_error', onCommandError);
    
    // Registrar handlers para eventos de conexão e erro
    webSocketManager.addListener('connection', handleConnectionChange);
    webSocketManager.addListener('connection', handleConnectionEstablished);
    webSocketManager.addListener('machine_data', handleMachineDataResponse);
    webSocketManager.addListener('error', handleError);
    
    // Conectar automaticamente se necessário
    if (autoConnect) {
      // Pequeno delay para garantir que o componente está completamente montado
      setTimeout(() => {
        if (isMountedRef.current) {
          connect();
        }
      }, 500);
    }
    
    // Limpar listeners ao desmontar o componente
    return () => {
      // Marcar componente como desmontado
      isMountedRef.current = false;
      
      // Remover todos os listeners
      if (onMachineUpdate) webSocketManager.removeListener('machine_update', onMachineUpdate);
      if (onProductionAlert) webSocketManager.removeListener('production_alert', onProductionAlert);
      if (onCommandSuccess) webSocketManager.removeListener('command_success', onCommandSuccess);
      if (onCommandError) webSocketManager.removeListener('command_error', onCommandError);
      
      webSocketManager.removeListener('connection', handleConnectionChange);
      webSocketManager.removeListener('connection', handleConnectionEstablished);
      webSocketManager.removeListener('machine_data', handleMachineDataResponse);
      webSocketManager.removeListener('error', handleError);
    };
  }, [onMachineUpdate, onProductionAlert, onCommandSuccess, onCommandError, handleConnectionChange, handleConnectionEstablished, handleError, connect, autoConnect]);

  // Cleanup exclusivo para unmount: desinscrever da máquina
  useEffect(() => {
    return () => {
      webSocketManager.unsubscribe(machineId);
    };
  }, []);
  
  return {
    state,
    connect,
    disconnect,
    // Comandos de sessão
    iniciarSessaoOperador,
    finalizarSessaoOperador,
    // Comandos de produção mapa
    iniciarProducaoMapa,
    finalizarProducaoMapaParcial,
    finalizarProducaoMapaCompleta,
    // Comandos de rejeitos
    adicionarRejeitos,
    // Comandos de consulta
    consultarSessao,
    consultarProducaoMapa
  };
}
