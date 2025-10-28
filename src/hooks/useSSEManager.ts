// 🎯 Hook principal para gerenciar SSE + API REST

import { useState, useCallback, useEffect } from 'react';
import { useSSEConnection } from './useSSEConnection';
import { apiService } from '../services/apiService';
import type {
  IniciarSessaoRequest,
  FinalizarSessaoRequest,
  IniciarProducaoRequest,
  PausarProducaoRequest,
  RetomarProducaoRequest,
  FinalizarProducaoRequest,
  AdicionarRejeitosRequest,
  ForcarParadaRequest
} from '../services/apiService';

interface SSEManagerOptions {
  machineId: number;
  enabled?: boolean;
}

export function useSSEManager(options: SSEManagerOptions) {
  const { machineId, enabled = true } = options;
  
  const [machineData, setMachineData] = useState<any>(null);
  const [childMachinesData, setChildMachinesData] = useState<Map<number, any>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Handler para mensagens SSE
  const handleSSEMessage = useCallback((data: any) => {
    console.log('📊 SSE Manager: Processando mensagem:', data);
    
    // Atualizar dados da máquina com base no tipo de evento
    if (data.type === 'machine_data' || data.type === 'update' || data.type === 'machine_update') {
      // Extrair dados da máquina
      const machineDataPayload = data.dados_maquina || data.machine_data || data.data || data;
      console.log('✅ SSE Manager: Dados da máquina extraídos:', machineDataPayload);
      setMachineData(machineDataPayload);
    } else if (data.type === 'connected') {
      // Mensagem de conexão, não precisa atualizar dados
      console.log('🔗 SSE Manager: Mensagem de conexão recebida');
    } else if (data.data) {
      setMachineData(data.data);
    } else {
      setMachineData(data);
    }
  }, []);

  // Conexão SSE
  const { isConnected, error: sseError, disconnect, reconnect } = useSSEConnection({
    machineId,
    enabled,
    onMessage: handleSSEMessage,
    onOpen: () => {
      console.log('✅ SSE Manager: Conexão estabelecida');
      // Consultar contexto inicial
      consultarContexto();
    },
    onError: (error) => {
      console.error('❌ SSE Manager: Erro de conexão:', error);
      setError('Erro na conexão SSE');
    }
  });

  // ==================== PROCESSAMENTO DE CONTEXTO INICIAL ====================

  // Processar contexto inicial e atualizar máquinas filhas OU máquina simples
  const processInitialContext = useCallback((contextData: any) => {
    console.log('🔄 SSE Manager: Processando contexto inicial:', contextData);
    
    // Caso 1: Máquina multipostos com filhas (contextos_filhas)
    if (contextData.contextos_filhas && Array.isArray(contextData.contextos_filhas)) {
      console.log(`📊 SSE Manager: Máquina MULTIPOSTOS - ${contextData.contextos_filhas.length} máquinas filhas encontradas`);
      
      const newChildMachinesData = new Map<number, any>();
      
      contextData.contextos_filhas.forEach((childContext: any) => {
        const { id_maquina, contexto } = childContext;
        
        if (contexto && contexto.sessao_operador) {
          console.log(`✅ SSE Manager: Processando máquina filha ${id_maquina}:`, {
            nome: contexto.nome,
            sinais_validos: contexto.sessao_operador.sinais_validos,
            rejeitos: contexto.sessao_operador.rejeitos,
            sinais: contexto.sessao_operador.sinais
          });
          
          // Armazenar dados da máquina filha
          newChildMachinesData.set(id_maquina, {
            id_maquina,
            nome: contexto.nome,
            ativa: contexto.ativa,
            status: contexto.status,
            velocidade: contexto.velocidade,
            sessao_operador: {
              sinais: contexto.sessao_operador.sinais || 0,
              sinais_validos: contexto.sessao_operador.sinais_validos || 0,
              rejeitos: contexto.sessao_operador.rejeitos || 0,
              tempo_decorrido_segundos: contexto.sessao_operador.tempo_decorrido_segundos || 0,
              tempo_paradas_segundos: contexto.sessao_operador.tempo_paradas_segundos || 0,
              tempo_valido_segundos: contexto.sessao_operador.tempo_valido_segundos || 0
            },
            producao_mapa: contexto.producao_mapa,
            producao_turno: contexto.producao_turno,
            last_updated: contexto.last_updated
          });
        }
      });
      
      console.log(`📊 SSE Manager: ${newChildMachinesData.size} máquinas filhas processadas`);
      setChildMachinesData(newChildMachinesData);
    }
    // Caso 2: Máquina simples (sem contextos_filhas, mas com contexto direto)
    else if (contextData.contexto && contextData.contexto.sessao_operador) {
      console.log(`📊 SSE Manager: Máquina SIMPLES - processando contexto direto`);
      
      const contexto = contextData.contexto;
      
      console.log(`✅ SSE Manager: Processando máquina simples ${contexto.id}:`, {
        nome: contexto.nome,
        sinais_validos: contexto.sessao_operador.sinais_validos,
        rejeitos: contexto.sessao_operador.rejeitos,
        sinais: contexto.sessao_operador.sinais
      });
      
      // Para máquina simples, o machineData já contém o contexto principal
      // mas vamos garantir que os dados da sessao_operador estejam atualizados
      const processedData = {
        ...contextData,
        contexto: {
          ...contexto,
          sessao_operador: {
            sinais: contexto.sessao_operador.sinais || 0,
            sinais_validos: contexto.sessao_operador.sinais_validos || 0,
            rejeitos: contexto.sessao_operador.rejeitos || 0,
            tempo_decorrido_segundos: contexto.sessao_operador.tempo_decorrido_segundos || 0,
            tempo_paradas_segundos: contexto.sessao_operador.tempo_paradas_segundos || 0,
            tempo_valido_segundos: contexto.sessao_operador.tempo_valido_segundos || 0
          }
        }
      };
      
      setMachineData(processedData);
      return; // Retornar aqui para não processar novamente no final
    }
    
    // Definir dados da máquina principal (para multipostos ou quando não há contexto)
    setMachineData(contextData);
  }, []);

  // ==================== COMANDOS API ====================

  // Consultar contexto inicial
  const consultarContexto = useCallback(async () => {
    if (!machineId) return;
    
    setIsLoading(true);
    try {
      const response = await apiService.consultarContexto(machineId);
      if (response.success && response.data) {
        // Processar contexto inicial e atualizar máquinas filhas
        processInitialContext(response.data);
        setError(null);
      } else {
        setError(response.error || 'Erro ao consultar contexto');
      }
    } catch (err) {
      console.error('❌ Erro ao consultar contexto:', err);
      setError('Erro ao consultar contexto');
    } finally {
      setIsLoading(false);
    }
  }, [machineId, processInitialContext]);

  // Iniciar sessão
  const iniciarSessao = useCallback(async (request: Omit<IniciarSessaoRequest, 'id_maquina'>) => {
    const response = await apiService.iniciarSessao({
      id_maquina: machineId,
      ...request
    });
    
    if (!response.success) {
      setError(response.error || 'Erro ao iniciar sessão');
    }
    
    return response;
  }, [machineId]);

  // Finalizar sessão
  const finalizarSessao = useCallback(async () => {
    const response = await apiService.finalizarSessao({
      id_maquina: machineId
    });
    
    if (!response.success) {
      setError(response.error || 'Erro ao finalizar sessão');
    }
    
    return response;
  }, [machineId]);

  // Iniciar produção
  const iniciarProducao = useCallback(async (request: Omit<IniciarProducaoRequest, 'id_maquina'>) => {
    const response = await apiService.iniciarProducao({
      id_maquina: machineId,
      ...request
    });
    
    if (!response.success) {
      setError(response.error || 'Erro ao iniciar produção');
    }
    
    return response;
  }, [machineId]);

  // Pausar produção
  const pausarProducao = useCallback(async () => {
    const response = await apiService.pausarProducao({
      id_maquina: machineId
    });
    
    if (!response.success) {
      setError(response.error || 'Erro ao pausar produção');
    }
    
    return response;
  }, [machineId]);

  // Retomar produção
  const retomarProducao = useCallback(async () => {
    const response = await apiService.retomarProducao({
      id_maquina: machineId
    });
    
    if (!response.success) {
      setError(response.error || 'Erro ao retomar produção');
    }
    
    return response;
  }, [machineId]);

  // Finalizar produção
  const finalizarProducao = useCallback(async () => {
    const response = await apiService.finalizarProducao({
      id_maquina: machineId
    });
    
    if (!response.success) {
      setError(response.error || 'Erro ao finalizar produção');
    }
    
    return response;
  }, [machineId]);

  // Adicionar rejeitos
  const adicionarRejeitos = useCallback(async (request: Omit<AdicionarRejeitosRequest, 'id_maquina'>) => {
    const response = await apiService.adicionarRejeitos({
      id_maquina: machineId,
      ...request
    });
    
    if (!response.success) {
      setError(response.error || 'Erro ao adicionar rejeitos');
    }
    
    return response;
  }, [machineId]);

  // Forçar parada
  const forcarParada = useCallback(async (request: Omit<ForcarParadaRequest, 'id_maquina'>) => {
    const response = await apiService.forcarParada({
      id_maquina: machineId,
      ...request
    });
    
    if (!response.success) {
      setError(response.error || 'Erro ao forçar parada');
    }
    
    return response;
  }, [machineId]);

  // Consultar contexto inicial ao montar
  useEffect(() => {
    if (enabled && machineId) {
      consultarContexto();
    }
  }, [enabled, machineId, consultarContexto]);

  return {
    // Estado
    machineData,
    childMachinesData,
    isConnected,
    isLoading,
    error: error || sseError,
    
    // Ações de conexão
    disconnect,
    reconnect,
    consultarContexto,
    
    // Comandos
    iniciarSessao,
    finalizarSessao,
    iniciarProducao,
    pausarProducao,
    retomarProducao,
    finalizarProducao,
    adicionarRejeitos,
    forcarParada
  };
}

