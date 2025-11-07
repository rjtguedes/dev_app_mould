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
  ForcarParadaRequest,
  RetomarParadaRequest
} from '../services/apiService';

// ✅ NOVO: Função auxiliar para salvar sessão no localStorage
function saveSessaoToLocalStorage(sessao: any, id_maquina: number) {
  if (!sessao || !sessao.id_sessao) return;
  
  try {
    // ✅ SIMPLIFICADO: Salvar apenas ID e flag ativa
    localStorage.setItem('id_sessao', String(sessao.id_sessao));
    localStorage.setItem('sessao_ativa', 'true');
    
    console.log('💾 Sessão salva no localStorage (via SSE) - ID:', sessao.id_sessao);
  } catch (error) {
    console.error('❌ Erro ao salvar sessão no localStorage:', error);
  }
}

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

  // ==================== UTIL ====================
  const unwrap = useCallback((payload: any) => {
    if (payload && typeof payload === 'object' && 'success' in payload && 'data' in payload) {
      return payload.data;
    }
    return payload;
  }, []);

  // ==================== HELPERS ====================
  // Normalizar estrutura de producao_ativa do backend para o formato esperado pela UI
  const mapProducaoAtiva = useCallback((producaoAtiva: any) => {
    if (!producaoAtiva) return null;
    const referencia = producaoAtiva.referencia || producaoAtiva.produto_referencia || null;
    const qt = (producaoAtiva.qt_produzir ?? producaoAtiva.quantidade_programada ?? producaoAtiva.quantidade) ?? 0;
    
    const mapped = {
      ...producaoAtiva, // ✅ Preserva TODOS os campos do backend
      // Aliases usados na UI
      referencia,
      codmapa: producaoAtiva.codmapa || referencia,
      qt_produzir: qt,
      quantidade: qt,
      // Garantir contadores numéricos
      sinais: producaoAtiva.sinais ?? 0,
      sinais_validos: producaoAtiva.sinais_validos ?? producaoAtiva.sinais ?? 0,
      rejeitos: producaoAtiva.rejeitos ?? 0,
      // ✅ Garantir campos de produto e cor
      produto_referencia: producaoAtiva.produto_referencia ?? null,
      cor_descricao: producaoAtiva.cor_descricao ?? null,
      id_produto: producaoAtiva.id_produto ?? null,
      id_cor: producaoAtiva.id_cor ?? null,
      id_matriz: producaoAtiva.id_matriz ?? null
    };
    
    console.log('🎨 mapProducaoAtiva:', {
      tem_produto: !!mapped.produto_referencia,
      tem_cor: !!mapped.cor_descricao,
      produto: mapped.produto_referencia,
      cor: mapped.cor_descricao
    });
    
    return mapped;
  }, []);

  // ✅ DEBUG: Log quando machineData é atualizado
  useEffect(() => {
    if (machineData) {
      console.log('🔄 SSE Manager: machineData atualizado para a UI:', {
        tipo: 'dados_mapeados',
        id: machineData.contexto?.id,
        nome: machineData.contexto?.nome,
        velocidade: machineData.contexto?.velocidade, // ← LOG IMPORTANTE
        status: machineData.contexto?.status, // ← LOG IMPORTANTE
        parada_ativa: machineData.contexto?.parada_ativa, // ← LOG IMPORTANTE
        sinais_sessao: machineData.contexto?.sessao_operador?.sinais,
        sinais_validos: machineData.contexto?.sessao_operador?.sinais_validos,
        rejeitos_sessao: machineData.contexto?.sessao_operador?.rejeitos
      });
      
      // ⚠️ ALERTA se velocidade for 0 mas máquina tiver produção ativa
      if (machineData.contexto?.velocidade === 0 && machineData.contexto?.producao_mapa) {
        console.warn('⚠️ INCONSISTÊNCIA: Velocidade = 0 mas há produção ativa!', {
          velocidade: machineData.contexto.velocidade,
          producao_mapa: machineData.contexto.producao_mapa,
          parada_ativa: machineData.contexto.parada_ativa,
          status: machineData.contexto.status
        });
      }
    }
  }, [machineData]);

  // ==================== BUSCAR MÁQUINAS FILHAS ====================
  
  // Função para buscar máquinas filhas quando o backend não as inclui no contexto
  const buscarMaquinasFilhas = useCallback(async (parentMachineId: number) => {
    try {
      console.log(`🔍 Buscando máquinas filhas para máquina pai ${parentMachineId}...`);
      
      const response = await apiService.listarMaquinas();
      if (response.success && response.data) {
        // Filtrar máquinas filhas da máquina pai
        const childMachines = response.data.filter((machine: any) => 
          machine.maquina_pai === parentMachineId && machine.maquina_filha === true
        );
        
        console.log(`📊 Encontradas ${childMachines.length} máquinas filhas:`, childMachines.map(m => ({
          id: m.id_maquina,
          nome: m.nome,
          numero_estacao: m.numero_estacao
        })));
        
        if (childMachines.length > 0) {
          // Criar dados simulados para as máquinas filhas
          const simulatedChildMachinesData = new Map<number, any>();
          
          childMachines.forEach((childMachine: any, index: number) => {
            const simulatedData = {
              id_maquina: childMachine.id_maquina,
              nome: childMachine.nome,
              ativa: childMachine.ativa || false,
              status: childMachine.status || false,
              velocidade: childMachine.velocidade_atual || 0,
              numero_estacao: childMachine.numero_estacao || index + 1,
              sinais: 0, // Dados não disponíveis sem contexto
              sinais_validos: 0,
              rejeitos: 0,
              sessao_operador: {
                sinais: 0,
                sinais_validos: 0,
                rejeitos: 0,
                tempo_decorrido_segundos: 0,
                tempo_paradas_segundos: 0,
                tempo_valido_segundos: 0
              },
              producao_mapa: null,
              producao_turno: null,
              parada_ativa: null,
              last_updated: Date.now()
            };
            
            console.log(`💾 Criando dados simulados para máquina filha ${childMachine.id_maquina}:`, simulatedData);
            simulatedChildMachinesData.set(childMachine.id_maquina, simulatedData);
          });
          
          console.log(`✅ ${simulatedChildMachinesData.size} máquinas filhas adicionadas via fallback`);
          setChildMachinesData(simulatedChildMachinesData);
        }
      }
    } catch (error) {
      console.error(`❌ Erro ao buscar máquinas filhas:`, error);
    }
  }, []);

  // ==================== PROCESSAMENTO DE CONTEXTO INICIAL ====================

  // Processar contexto inicial e atualizar máquinas filhas OU máquina simples
  const processInitialContext = useCallback((context: any) => {
    const contextData = unwrap(context);
    console.log('🔄 SSE Manager: Processando contexto inicial:', contextData);
    console.log('🔍 SSE Manager: Estrutura do contextData:', {
      has_contextos_filhas: !!contextData.contextos_filhas,
      contextos_filhas_array: Array.isArray(contextData.contextos_filhas),
      contextos_filhas_length: contextData.contextos_filhas?.length,
      has_maquinas_filhas: !!contextData.maquinas_filhas,
      maquinas_filhas_array: Array.isArray(contextData.maquinas_filhas),
      maquinas_filhas_length: contextData.maquinas_filhas?.length,
      has_contexto: !!contextData.contexto,
      has_maquina: !!contextData.maquina,
      contexto_keys: contextData.contexto ? Object.keys(contextData.contexto) : null,
      contextData_keys: Object.keys(contextData),
      is_multipostos: contextData.multipostos || contextData.maquina?.multipostos,
      machine_name: contextData.nome || contextData.maquina?.nome
    });
    
    // ❌ DIAGNÓSTICO: Para máquinas multipostos, backend deve incluir contextos_filhas
    if (contextData.multipostos === true && (!contextData.contextos_filhas || contextData.contextos_filhas.length === 0)) {
      console.error(`❌ PROBLEMA NO BACKEND: Máquina ${contextData.nome} (ID: ${contextData.id}) é multipostos, mas contextos_filhas está vazio!`);
      console.error(`❌ Backend deveria retornar: { ..., contextos_filhas: [{ id_maquina: X, contexto: {...} }, ...] }`);
      console.error(`❌ Mas retornou:`, Object.keys(contextData));
      
      // 🔧 SOLUÇÃO TEMPORÁRIA: Buscar máquinas filhas via API REST
      console.log(`🔧 Tentando buscar máquinas filhas via API REST...`);
      buscarMaquinasFilhas(contextData.id).catch(err => {
        console.error(`❌ Erro ao buscar máquinas filhas:`, err);
      });
    }
    
    // ✅ NOVO: Caso 1A: Nova estrutura - maquinas_filhas (formato novo do backend)
    if (contextData.maquinas_filhas && Array.isArray(contextData.maquinas_filhas)) {
      console.log(`📊 SSE Manager: NOVA ESTRUTURA - Máquina MULTIPOSTOS - ${contextData.maquinas_filhas.length} máquinas filhas encontradas`);
      
      const newChildMachinesData = new Map<number, any>();
      
      contextData.maquinas_filhas.forEach((childMachine: any, index: number) => {
        console.log(`🔍 SSE Manager: Processando máquina filha [${index}]:`, childMachine);
        
        const { id_maquina, nome, status, sessao_ativa, producao_turno, producao_ativa } = childMachine;
        
        console.log(`✅ SSE Manager: Processando máquina filha ${id_maquina}:`, {
          nome,
          status,
          sessao_sinais: sessao_ativa?.sinais || 0,
          sessao_rejeitos: sessao_ativa?.rejeitos || 0,
          turno_sinais: producao_turno?.sinais || 0
        });
        
        // Armazenar dados da máquina filha (nova estrutura)
        const childMachineData = {
          id_maquina,
          nome,
          ativa: status === 'ativo' || status === true,
          status: status === 'ativo' || status === true,
          velocidade: childMachine.velocidade || 0,
          numero_estacao: index + 1, // EVA: baseado na posição
          sinais: sessao_ativa?.sinais || producao_turno?.sinais || 0,
          sinais_validos: sessao_ativa?.sinais_validos || producao_turno?.sinais_validos || producao_turno?.sinais || 0,
          rejeitos: sessao_ativa?.rejeitos || producao_turno?.rejeitos || 0,
          sessao_operador: {
            sinais: sessao_ativa?.sinais || 0,
            sinais_validos: sessao_ativa?.sinais_validos || sessao_ativa?.sinais || 0,
            rejeitos: sessao_ativa?.rejeitos || 0,
            tempo_decorrido_segundos: 0,
            tempo_paradas_segundos: 0,
            tempo_valido_segundos: 0
          },
          producao_mapa: producao_ativa,
          producao_turno: producao_turno,
          parada_ativa: childMachine.parada_ativa,
          last_updated: childMachine.last_updated || Date.now()
        };
        
        console.log(`💾 SSE Manager: Dados processados para máquina filha ${id_maquina}:`, childMachineData);
        newChildMachinesData.set(id_maquina, childMachineData);
      });
      
      console.log(`📊 SSE Manager: ${newChildMachinesData.size} máquinas filhas processadas (nova estrutura)`);
      setChildMachinesData(newChildMachinesData);
      
      // Definir dados da máquina principal (nova estrutura)
      // ✅ Detectar parada forçada
      let paradaAtivaMain = contextData.parada_ativa ?? null;
      const paradaForcadaMain = contextData.parada_forcada;
      let statusMain = contextData.maquina?.status || true;
      
      if (paradaForcadaMain && paradaForcadaMain.ativa === true) {
        console.log('🛑 SSE Manager: Parada forçada detectada na máquina principal (multipostos):', paradaForcadaMain);
        paradaAtivaMain = {
          id: paradaForcadaMain.id_parada,
          inicio: paradaForcadaMain.inicio,
          motivo_id: paradaForcadaMain.id_motivo,
          bloqueio_sinais: paradaForcadaMain.bloqueio_sinais || false
        };
        statusMain = false; // Parada forçada = status false
      }
      
      const mainMachineData = {
        contexto: {
          id: contextData.maquina?.id_maquina,
          nome: contextData.maquina?.nome,
          velocidade: contextData.maquina?.velocidade || 0,
          status: statusMain,
          sessao_operador: contextData.sessao_ativa || {
            sinais: 0,
            sinais_validos: 0,
            rejeitos: 0
          },
          producao_mapa: mapProducaoAtiva(contextData.producao_ativa),
          producao_turno: contextData.producao_turno,
          parada_ativa: paradaAtivaMain,
          parada_forcada: paradaForcadaMain ?? null
        }
      };
      
      console.log(`✅ SSE Manager: Dados da máquina principal (nova estrutura):`, mainMachineData);
      
      // ✅ NOVO: Salvar sessão no localStorage quando receber do SSE
      if (contextData.sessao_ativa && contextData.sessao_ativa.id_sessao) {
        saveSessaoToLocalStorage(contextData.sessao_ativa, machineId);
      }
      
      // 🔒 Não sobrescrever contadores com zeros logo após reinício de sessão
      setMachineData(prev => {
        if (!prev || !prev.contexto) return mainMachineData;
        const prevCtx = prev.contexto;
        const nextCtx = (mainMachineData as any).contexto || {};

        const prevSessao = prevCtx.sessao_operador || {};
        const nextSessao = nextCtx.sessao_operador || {};
        const prevMapa = prevCtx.producao_mapa || {};
        const nextMapa = nextCtx.producao_mapa || {};

        const now = Date.now();
        const prevUpdated = prevCtx.last_updated || now;
        const freshWindowMs = 2 * 60 * 1000; // 2 min

        const shouldKeepSessionCounts =
          (prevSessao.sinais > 0 || prevSessao.sinais_validos > 0 || prevSessao.rejeitos > 0) &&
          (nextSessao.sinais === 0 && (nextSessao.sinais_validos ?? 0) === 0 && (nextSessao.rejeitos ?? 0) === 0) &&
          (now - prevUpdated < freshWindowMs);

        const shouldKeepMapaCounts =
          (prevMapa.sinais > 0 || prevMapa.sinais_validos > 0 || prevMapa.rejeitos > 0) &&
          (nextMapa && nextMapa.sinais === 0 && (nextMapa.sinais_validos ?? 0) === 0 && (nextMapa.rejeitos ?? 0) === 0) &&
          (now - prevUpdated < freshWindowMs);

        const merged = {
          contexto: {
            ...prevCtx,
            ...nextCtx,
            // Preservar contadores recentes se os novos vierem zerados
            sessao_operador: shouldKeepSessionCounts ? { ...nextSessao, ...prevSessao } : nextSessao,
            producao_mapa: shouldKeepMapaCounts ? { ...nextMapa, sinais: prevMapa.sinais, sinais_validos: prevMapa.sinais_validos, rejeitos: prevMapa.rejeitos } : nextMapa,
            last_updated: nextCtx.last_updated || now
          }
        };
        return merged;
      });
    }
    // Caso 1B: Estrutura antiga - contextos_filhas (compatibilidade)
    else if (contextData.contextos_filhas && Array.isArray(contextData.contextos_filhas)) {
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
          const childMachineData = {
            id_maquina,
            nome: contexto.nome,
            ativa: contexto.ativa,
            status: contexto.status,
            velocidade: contexto.velocidade,
            numero_estacao: contexto.numero_estacao || null,
            sinais: contexto.sessao_operador.sinais || 0,
            sinais_validos: contexto.sessao_operador.sinais_validos || 0,
            rejeitos: contexto.sessao_operador.rejeitos || 0,
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
            parada_ativa: contexto.parada_ativa,
            last_updated: contexto.last_updated
          };
          
          console.log(`💾 SSE Manager: Dados processados para máquina filha ${id_maquina}:`, childMachineData);
          newChildMachinesData.set(id_maquina, childMachineData);
        }
      });
      
      console.log(`📊 SSE Manager: ${newChildMachinesData.size} máquinas filhas processadas`);
      setChildMachinesData(newChildMachinesData);
    }
    // Caso 2: Máquina simples - PASSAR DADOS DIRETAMENTE SEM PROCESSAR
    // O backend já envia tudo pronto, não devemos calcular nada
    else {
      console.log(`📊 SSE Manager: Máquina SIMPLES - passando dados diretamente do backend`);
      console.log(`✅ SSE Manager: Estrutura recebida do backend:`, Object.keys(contextData));
      console.log(`📊 SSE Manager: Dados da sessão recebidos:`, {
        sessao_sinais: contextData.sessao_ativa?.sinais ?? contextData.sessao_operador?.sinais,
        sessao_sinais_validos: contextData.sessao_ativa?.sinais_validos ?? contextData.sessao_operador?.sinais_validos,
        sessao_rejeitos: contextData.sessao_ativa?.rejeitos ?? contextData.sessao_operador?.rejeitos,
        turno_sinais: contextData.producao_turno?.sinais,
        mapa_sinais: contextData.producao_ativa?.sinais ?? contextData.producao_mapa?.sinais
      });

      // ✅ Normalizar estrutura do backend (nova: maquina/sessao_ativa/producao_ativa)
      const maquina = contextData.maquina || {};

      // ✅ Detectar parada forçada e converter para parada_ativa se necessário
      let paradaAtiva = contextData.parada_ativa ?? null;
      const paradaForcada = contextData.parada_forcada;
      let statusReal = maquina.status ?? contextData.status ?? true;
      
      // Se tem parada forçada ativa, usar ela como parada_ativa
      if (paradaForcada && paradaForcada.ativa === true) {
        console.log('🛑 SSE Manager: Parada forçada detectada no contexto inicial:', paradaForcada);
        paradaAtiva = {
          id: paradaForcada.id_parada,
          inicio: paradaForcada.inicio,
          motivo_id: paradaForcada.id_motivo,
          bloqueio_sinais: paradaForcada.bloqueio_sinais || false
        };
        // Se tem parada forçada ativa, status deve ser false (parada)
        statusReal = false;
        console.log('🛑 SSE Manager: Status ajustado para false devido a parada forçada');
      }

      const dadosParaExibir = {
        contexto: {
          id_maquina: maquina.id_maquina ?? maquina.id ?? contextData.id_maquina ?? contextData.id,
          nome: maquina.nome ?? contextData.nome,
          velocidade: maquina.velocidade ?? contextData.velocidade ?? 0,
          status: statusReal,
          parada_ativa: paradaAtiva,
          parada_forcada: paradaForcada ?? null, // Manter também o original
          ultima_parada: (contextData as any).ultima_parada ?? null,
          // ✅ Mapear campos novos para os esperados pela UI
          sessao_operador: contextData.sessao_ativa ?? contextData.sessao_operador ?? null,
          producao_turno: contextData.producao_turno ?? null,
          producao_mapa: mapProducaoAtiva(contextData.producao_ativa ?? contextData.producao_mapa) ?? null
        }
      } as any;

      console.log(`✅ SSE Manager: Dados passados para UI (normalizados):`, dadosParaExibir);
      
      // ✅ NOVO: Salvar sessão no localStorage quando receber do SSE (máquina simples)
      const sessaoRecebida = contextData.sessao_ativa ?? contextData.sessao_operador;
      if (sessaoRecebida && sessaoRecebida.id_sessao) {
        saveSessaoToLocalStorage(sessaoRecebida, machineId);
      }
      // 🔒 Não sobrescrever contadores com zeros logo após reinício de sessão
      setMachineData(prev => {
        if (!prev || !prev.contexto) return dadosParaExibir;
        const prevCtx = prev.contexto;
        const nextCtx = (dadosParaExibir as any).contexto || {};

        const prevSessao = prevCtx.sessao_operador || {};
        const nextSessao = nextCtx.sessao_operador || {};
        const prevMapa = prevCtx.producao_mapa || {};
        const nextMapa = nextCtx.producao_mapa || {};

        const now = Date.now();
        const prevUpdated = prevCtx.last_updated || now;
        const freshWindowMs = 2 * 60 * 1000; // 2 min

        const shouldKeepSessionCounts =
          (prevSessao.sinais > 0 || prevSessao.sinais_validos > 0 || prevSessao.rejeitos > 0) &&
          (nextSessao.sinais === 0 && (nextSessao.sinais_validos ?? 0) === 0 && (nextSessao.rejeitos ?? 0) === 0) &&
          (now - prevUpdated < freshWindowMs);

        const shouldKeepMapaCounts =
          (prevMapa.sinais > 0 || prevMapa.sinais_validos > 0 || prevMapa.rejeitos > 0) &&
          (nextMapa && nextMapa.sinais === 0 && (nextMapa.sinais_validos ?? 0) === 0 && (nextMapa.rejeitos ?? 0) === 0) &&
          (now - prevUpdated < freshWindowMs);

        const merged = {
          contexto: {
            ...prevCtx,
            ...nextCtx,
            // Preservar contadores recentes se os novos vierem zerados
            sessao_operador: shouldKeepSessionCounts ? { ...nextSessao, ...prevSessao } : nextSessao,
            producao_mapa: shouldKeepMapaCounts ? { ...nextMapa, sinais: prevMapa.sinais, sinais_validos: prevMapa.sinais_validos, rejeitos: prevMapa.rejeitos } : nextMapa,
            last_updated: nextCtx.last_updated || now
          }
        };
        return merged;
      });
      return;
    }
  }, [machineId, buscarMaquinasFilhas, mapProducaoAtiva]);

  // Handler para mensagens SSE
  const handleSSEMessage = useCallback((data: any) => {
    console.log('📊 SSE Manager: Processando mensagem:', data.type, data);
    
    // ✅ NOVO: Processar evento 'connected' com initial_context
    if (data.type === 'connected' && data.initial_context) {
      console.log('🔌 SSE Manager: Evento de conexão com contexto inicial recebido');
      processInitialContext(data.initial_context);
      return;
    }
    
    // ✅ IGNORAR mensagens vazias ou sem dados relevantes
    if (!data || (!data.type && !data.data && Object.keys(data).length === 0)) {
      console.warn('⚠️ SSE Manager: Mensagem vazia ignorada');
      return;
    }
    
    // ✅ Atualizar dados da máquina com base no tipo de evento
    // IMPORTANTE: Só atualizar se vierem dados completos do backend
    if (data.type === 'machine_data' || data.type === 'update' || data.type === 'machine_update') {
      const unwrapped = unwrap(data);
      const rawPayload = unwrapped.dados_maquina || unwrapped.machine_data || unwrapped.data || unwrapped;

      // ✅ Normalizar se vier no formato novo (maquina/sessao_ativa/producao_ativa)
      let machineDataPayload: any = (rawPayload && (rawPayload.maquina || rawPayload.sessao_ativa || rawPayload.producao_ativa || rawPayload.sessao_operador || rawPayload.producao_mapa))
        ? {
            contexto: {
              id_maquina: rawPayload.maquina?.id_maquina ?? rawPayload.maquina?.id ?? rawPayload.id_maquina ?? rawPayload.id,
              nome: rawPayload.maquina?.nome ?? rawPayload.nome,
              velocidade: rawPayload.maquina?.velocidade ?? rawPayload.velocidade ?? 0,
              status: rawPayload.maquina?.status ?? rawPayload.status ?? true,
              parada_ativa: rawPayload.parada_ativa ?? null,
              ultima_parada: rawPayload.ultima_parada ?? null,
              sessao_operador: rawPayload.sessao_ativa ?? rawPayload.sessao_operador ?? null,
              producao_turno: rawPayload.producao_turno ?? null,
              producao_mapa: rawPayload.producao_ativa ?? rawPayload.producao_mapa ?? null
            }
          }
        : rawPayload;

      // 🔧 ENRIQUECER: Se contexto de sessão não trouxe contadores, usar 'estatisticas' (preferencial) ou 'producao_turno' como fallback
      const ctx = machineDataPayload?.contexto ? machineDataPayload.contexto : machineDataPayload;
      if (ctx) {
        const sessao = ctx.sessao_operador || null;
        const estat = ctx.estatisticas || null;
        const turno = ctx.producao_turno || null;
        const needsSessionCounters = sessao && (sessao.sinais === undefined && sessao.sinais_validos === undefined && sessao.rejeitos === undefined);
        if (needsSessionCounters) {
          const src = estat || turno || null;
          if (src) {
            const enrichedSessao = {
              ...sessao,
              sinais: src.sinais ?? sessao.sinais ?? 0,
              sinais_validos: src.sinais_validos ?? src.sinais ?? sessao.sinais_validos ?? 0,
              rejeitos: src.rejeitos ?? sessao.rejeitos ?? 0
            };
            if (machineDataPayload.contexto) {
              machineDataPayload = { contexto: { ...ctx, sessao_operador: enrichedSessao } };
            } else {
              machineDataPayload = { ...ctx, sessao_operador: enrichedSessao };
            }
          }
        }
      }
      
      // ✅ VALIDAR: Só atualizar se tiver dados mínimos
      const temDadosValidos = machineDataPayload?.sessao_operador || 
                               machineDataPayload?.producao_turno || 
                               machineDataPayload?.producao_mapa ||
                               (machineDataPayload?.contexto && (machineDataPayload.contexto.sessao_operador || machineDataPayload.contexto.producao_turno));
      
      if (temDadosValidos) {
        // ✅ VALIDAR: Não sobrescrever dados existentes com dados zerados em mensagens subsequentes
        setMachineData(prev => {
          // Se não há dados anteriores, aceitar os novos (mesmo zerados - pode ser início de sessão)
          if (!prev || !prev.contexto) {
            console.log('✅ SSE Manager: Primeira atualização, aceitando dados:', machineDataPayload);
            return machineDataPayload.contexto ? machineDataPayload : { contexto: machineDataPayload };
          }
          
          // Se já existem dados, verificar se os novos dados não estão zerando valores existentes
          const sessaoAnterior = prev.contexto.sessao_operador;
          const sessaoNova = machineDataPayload?.contexto?.sessao_operador || machineDataPayload?.sessao_operador;
          
          // Se dados anteriores tinham sinais > 0 e os novos têm sinais = 0, pode ser mensagem incorreta
          if (sessaoAnterior && sessaoAnterior.sinais > 0 && sessaoNova && sessaoNova.sinais === 0 && sessaoNova.sinais_validos === 0 && sessaoNova.rejeitos === 0) {
            console.warn('⚠️ SSE Manager: Tentativa de zerar dados existentes detectada. Mantendo dados anteriores:', {
              anterior: sessaoAnterior,
              novo: sessaoNova
            });
            return prev; // Não atualizar, manter dados anteriores
          }
          
          // Caso contrário, atualizar normalmente
          console.log('✅ SSE Manager: Dados completos recebidos, atualizando:', machineDataPayload);
          return machineDataPayload.contexto ? machineDataPayload : { contexto: machineDataPayload };
        });
      } else {
        console.warn('⚠️ SSE Manager: Mensagem machine_data sem dados válidos, ignorando:', machineDataPayload);
      }
      return;
    } 
    // ✅ Processar eventos de sinal - MERGE COM DADOS EXISTENTES (não sobrescrever)
    else if (data.type === 'sinal') {
      console.log('📊 SSE Manager: Processando evento de sinal (merge parcial):', data);
      
      // ✅ FAZER MERGE com dados existentes, não sobrescrever tudo
      setMachineData(prev => {
        if (!prev || !prev.contexto) {
          console.warn('⚠️ SSE Manager: Evento sinal recebido mas não há dados anteriores. Aguardando initial_context...');
          return prev; // Não criar dados vazios, aguardar initial_context
        }
        const sseData = unwrap(data).data || unwrap(data) || {};
        
        // ✅ MERGE: Manter dados existentes e atualizar apenas o que veio no sinal
        return {
          ...prev,
          contexto: {
            ...prev.contexto,
            // Atualizar sessao_operador apenas se vieram dados válidos
            sessao_operador: sseData.sessao ? {
              ...prev.contexto.sessao_operador,
              ...sseData.sessao // Merge dos novos dados
            } : prev.contexto.sessao_operador,
            // Atualizar producao_mapa apenas se vieram dados válidos
            producao_mapa: sseData.mapa ? {
              ...prev.contexto.producao_mapa,
              ...sseData.mapa // Merge dos novos dados
            } : prev.contexto.producao_mapa,
            // Atualizar producao_turno apenas se vieram dados válidos
            producao_turno: sseData.turno ? {
              ...prev.contexto.producao_turno,
              ...sseData.turno // Merge dos novos dados
            } : prev.contexto.producao_turno,
            // Se enviou sinal, não está parada
            parada_ativa: null,
            status: true
          }
        };
      });
      return;
    }
    else if (data.type === 'rejeitos_adicionados') {
      console.log('📊 SSE Manager: Processando evento de rejeitos:', data);
      
      // Verificar se é rejeito para máquina principal ou filha
      const unwrapped = unwrap(data);
      const targetMachineId = unwrapped.target_machine_id || unwrapped.id_maquina;
      const isChildMachine = targetMachineId !== machineId;
      
      console.log(`🎯 Rejeito para máquina ${targetMachineId} (é filha: ${isChildMachine})`);
      
      // Helper para obter contadores com chaves alternativas
      const getCount = (obj: any, keys: string[], fallback?: number) => {
        for (const k of keys) {
          if (obj && obj[k] !== undefined && obj[k] !== null) return obj[k];
        }
        return fallback;
      };

      if (isChildMachine) {
        // Atualizar dados da máquina filha específica
        setChildMachinesData(prev => {
          const updatedMap = new Map(prev);
          const childData = updatedMap.get(targetMachineId);
          
          if (childData) {
            console.log(`🔄 Atualizando rejeitos para estação ${targetMachineId}:`, {
              rejeitos_anterior: childData.sessao_operador?.rejeitos,
              rejeitos_novo: getCount(unwrapped.data || unwrapped, ['total_rejeitos_sessao','rejeitos_sessao'])
            });
            
            // Atualizar dados da estação específica
            const updatedChildData = {
              ...childData,
              sessao_operador: {
                ...childData.sessao_operador,
                rejeitos: getCount(unwrapped.data || unwrapped, ['total_rejeitos_sessao','rejeitos_sessao'], (childData.sessao_operador?.rejeitos || 0) + 1)
              },
              producao_mapa: childData.producao_mapa ? {
                ...childData.producao_mapa,
                rejeitos: getCount(unwrapped.data || unwrapped, ['total_rejeitos_mapa','rejeitos_producao'], childData.producao_mapa.rejeitos || 0)
              } : null,
              producao_turno: childData.producao_turno ? {
                ...childData.producao_turno,
                rejeitos: getCount(unwrapped.data || unwrapped, ['total_rejeitos_turno','rejeitos_turno'], childData.producao_turno.rejeitos || 0)
              } : null,
              last_updated: Date.now()
            };
            
            updatedMap.set(targetMachineId, updatedChildData);
            console.log(`✅ Estação ${targetMachineId} atualizada com novos rejeitos:`, updatedChildData.sessao_operador);
          } else {
            console.warn(`⚠️ Máquina filha ${targetMachineId} não encontrada no childMachinesData`);
          }
          
          return updatedMap;
        });
      } else {
        // Atualizar dados da máquina principal
      setMachineData(prev => {
        if (!prev || !prev.contexto) return prev;
        
        const src = unwrapped.data || unwrapped;
        return {
          ...prev,
          contexto: {
            ...prev.contexto,
            sessao_operador: {
              ...prev.contexto.sessao_operador,
              rejeitos: getCount(src, ['total_rejeitos_sessao','rejeitos_sessao'], prev.contexto.sessao_operador.rejeitos)
            },
            producao_mapa: {
              ...prev.contexto.producao_mapa,
              rejeitos: getCount(src, ['total_rejeitos_mapa','rejeitos_producao'], prev.contexto.producao_mapa?.rejeitos || 0)
            },
            producao_turno: {
              ...prev.contexto.producao_turno,
              rejeitos: getCount(src, ['total_rejeitos_turno','rejeitos_turno'], prev.contexto.producao_turno?.rejeitos || 0)
            }
          }
        };
      });
    }
    }
    // ✅ NOVO: Processar eventos de parada - MERGE (não sobrescrever tudo)
    else if (data.type === 'parada' || data.type === 'stop') {
      console.log('🛑 SSE Manager: Processando evento de parada (merge parcial):', data);
      
      setMachineData(prev => {
        // ✅ Se não há dados anteriores, aguardar initial_context
        if (!prev || !prev.contexto) {
          console.warn('⚠️ SSE Manager: Evento parada recebido mas não há dados anteriores. Aguardando initial_context...');
          return prev; // Não criar dados vazios
        }
        
        // ✅ MERGE: Manter todos os dados existentes, apenas atualizar parada
        const payload = data.data || data;
        const idParada = payload.id_parada_atual || payload.parada_id || Date.now();
        const inicioUnix = payload.inicio_unix_segundos || payload.inicio || Math.floor(Date.now() / 1000);
        const motivoId = payload.id_motivo || payload.motivo_id || null;
        
        console.log('🛑 PARADA DETECTADA - Atualizando contexto:', {
          velocidade_antes: prev.contexto.velocidade,
          status_antes: prev.contexto.status,
          id_parada: idParada,
          motivo: motivoId
        });
        
        return {
          ...prev,
          contexto: {
            ...prev.contexto, // Manter tudo que já existe
            status: false, // Máquina PARADA
            velocidade: 0, // ✅ Zerar velocidade quando parada (backend não envia velocidade em evento parada)
            parada_ativa: {
              id: idParada,
              inicio_unix_segundos: inicioUnix,
              motivo_id: motivoId
            }
            // ✅ Manter sessao_operador, producao_mapa, producao_turno como estão
          }
        };
      });
      return;
    }
    // ✅ NOVO: Processar eventos de parada forçada
    else if (data.type === 'parada_forcada' || data.type === 'forced_stop') {
      console.log('🛑 SSE Manager: Processando evento de parada forçada (merge parcial):', data);
      
      setMachineData(prev => {
        // ✅ Se não há dados anteriores, aguardar initial_context
        if (!prev || !prev.contexto) {
          console.warn('⚠️ SSE Manager: Evento parada_forcada recebido mas não há dados anteriores. Aguardando initial_context...');
          return prev; // Não criar dados vazios
        }
        
        const paradaData = data.data || data || {};
        
        // ✅ MERGE: Manter todos os dados existentes, apenas atualizar parada
        return {
          ...prev,
          contexto: {
            ...prev.contexto, // Manter tudo que já existe
            status: false, // Máquina PARADA
            velocidade: prev.contexto.velocidade || 0, // Manter velocidade existente ou 0
            parada_ativa: {
              id: paradaData.id_parada_atual || paradaData.id_parada || Date.now(),
              inicio_unix_segundos: paradaData.inicio_unix_segundos || paradaData.inicio || data.timestamp || Math.floor(Date.now() / 1000),
              motivo_id: paradaData.id_motivo || null,
              bloqueio_sinais: paradaData.bloqueio_sinais || false,
              inicio_formatado: paradaData.inicio_formatado || null
            }
            // ✅ Manter sessao_operador, producao_mapa, producao_turno como estão
          }
        };
      });
      return;
    }
    // ✅ NOVO: Processar eventos de retomada (normal e forçada)
    else if (data.type === 'retomada' || data.type === 'resume' || data.type === 'retomada_forcada' || data.type === 'forced_resume') {
      console.log('▶️ SSE Manager: Processando evento de retomada:', data);
      
      setMachineData(prev => {
        if (!prev || !prev.contexto) {
          console.warn('⚠️ SSE Manager: Evento retomada recebido mas não há dados anteriores');
          return prev; // Não criar dados vazios
        }
        const payload = data.data || data;
        const ultimaParada = payload.ultima_parada || null;
        const ultimaInicio = payload.ultima_parada_inicio || null;
        const ultimaFim = payload.ultima_parada_fim || null;
        const ultimaDuracao = payload.ultima_parada_duracao || null;

        return {
          ...prev,
          contexto: {
            ...prev.contexto,
            status: true, // Máquina em funcionamento
            parada_ativa: null, // Não há parada ativa
            ...(ultimaParada || ultimaInicio || ultimaFim || ultimaDuracao ? {
              ultima_parada: ultimaParada || {
                id: prev.contexto.ultima_parada?.id || null,
                inicio_unix_segundos: ultimaInicio,
                fim_unix_segundos: ultimaFim,
                duracao_segundos: ultimaDuracao
              },
              ultima_parada_justificada: false
            } : {})
          }
        };
      });
      return;
    }
    else if (data.type === 'parada_justificada') {
      console.log('✅ SSE Manager: Processando evento de parada justificada:', data);
      setMachineData(prev => {
        if (!prev || !prev.contexto) return prev;
        const payload = data.data || data;
        return {
          ...prev,
          contexto: {
            ...prev.contexto,
            ultima_parada_justificada: true,
            ultima_parada_motivo: payload.ultima_parada_motivo || payload.motivo_parada || prev.contexto.ultima_parada_motivo,
            ultima_parada_observacoes: payload.ultima_parada_observacoes || prev.contexto.ultima_parada_observacoes,
            ultima_parada_contabiliza_oee: payload.ultima_parada_contabiliza_oee ?? prev.contexto.ultima_parada_contabiliza_oee
          }
        };
      });
      return;
    }
    // ✅ NOVO: Processar eventos de velocidade - MERGE (não sobrescrever tudo)
    else if (data.type === 'velocidade') {
      console.log('⚡ SSE Manager: Processando evento de velocidade (merge parcial):', data);
      
      setMachineData(prev => {
        if (!prev || !prev.contexto) {
          console.warn('⚠️ SSE Manager: Evento velocidade recebido mas não há dados anteriores. Aguardando initial_context...');
          return prev; // Não criar dados vazios, aguardar initial_context
        }
        
        // Extrair velocidade dos dados recebidos (pode vir em data.velocidade ou data.data.velocidade)
        let novaVelocidade = 0;
        if (typeof data.data === 'number') {
          novaVelocidade = data.data;
        } else if (data.data?.velocidade !== undefined) {
          novaVelocidade = data.data.velocidade;
        } else if (data.velocidade !== undefined) {
          novaVelocidade = data.velocidade;
        }
        
        console.log('⚡ SSE Manager: Velocidade extraída:', novaVelocidade, 'de:', data);
        
        // ✅ MERGE: Manter todos os dados existentes, apenas atualizar velocidade
        return {
          ...prev,
          contexto: {
            ...prev.contexto, // Manter tudo que já existe
            velocidade: novaVelocidade // Atualizar apenas a velocidade
            // ✅ Manter sessao_operador, producao_mapa, producao_turno, status, parada_ativa, etc. como estão
          }
        };
      });
      return;
    }
    else if (data.type === 'connected') {
      // Mensagem de conexão, não precisa atualizar dados
      console.log('🔗 SSE Manager: Mensagem de conexão recebida');
      return;
    }
    // ✅ NOVO: Handler para evento producao_iniciada
    else if (data.type === 'producao_iniciada') {
      console.log('🎯 SSE Manager: Produção iniciada via SSE:', data);
      
      // Atualizar dados da máquina com informações da produção iniciada
      setMachineData(prev => {
        if (!prev || !prev.contexto) return prev;
        
        const producaoData = data.data || {};
        
        return {
          ...prev,
          contexto: {
            ...prev.contexto,
            // Atualizar producao_mapa com dados da produção iniciada
            producao_mapa: {
              id_mapa: producaoData.id_mapa || prev.contexto.producao_mapa?.id_mapa,
              sinais: prev.contexto.producao_mapa?.sinais || 0,
              rejeitos: prev.contexto.producao_mapa?.rejeitos || 0,
              sinais_validos: prev.contexto.producao_mapa?.sinais_validos || 0,
              qt_produzir: prev.contexto.producao_mapa?.qt_produzir,
              // Se tiver talões no evento, calcular total a produzir
              ...(producaoData.taloes && {
                qt_produzir: producaoData.taloes.reduce((sum: number, t: any) => sum + (t.quantidade || 0), 0)
              }),
              inicio: producaoData.inicio || Date.now() / 1000
            }
          }
        };
      });
      
      return;
    }
    // ✅ NOVO: Handler para evento context_update
    else if (data.type === 'context_update') {
      console.log('🔄 SSE Manager: Processando atualização de contexto:', data);
      
      // Validar estrutura da mensagem
      if (!data.context || !data.id_maquina) {
        console.warn('⚠️ SSE Manager: context_update sem context ou id_maquina, ignorando:', data);
        return;
      }
      
      const contextUpdate = data.context;
      const targetMachineId = data.id_maquina;
      
      // Verificar se é para a máquina atual
      if (targetMachineId !== machineId) {
        console.log(`ℹ️ SSE Manager: context_update para máquina diferente (${targetMachineId} vs ${machineId}), ignorando`);
        return;
      }
      
      // Normalizar estrutura do contexto recebido
      // O backend envia: context { producao_mapa, producao_turno, ... }
      // Precisamos adaptar para o formato esperado pela UI
      const normalizedContext = {
        id_maquina: contextUpdate.id || targetMachineId,
        nome: contextUpdate.nome,
        ativa: contextUpdate.ativa ?? true, // Se máquina está ligada
        status: contextUpdate.status ?? true, // ✅ status do backend (true = produzindo, false = parada)
        velocidade: contextUpdate.velocidade ?? 0, // ✅ Velocidade do backend
        last_updated: contextUpdate.last_updated || Math.floor(Date.now() / 1000),
        
        // Normalizar producao_mapa usando helper existente
        producao_mapa: contextUpdate.producao_mapa ? mapProducaoAtiva(contextUpdate.producao_mapa) : null,
        
        // Normalizar producao_turno
        producao_turno: contextUpdate.producao_turno ? {
          ...contextUpdate.producao_turno,
          sinais: contextUpdate.producao_turno.sinais ?? 0,
          sinais_validos: contextUpdate.producao_turno.sinais_validos ?? contextUpdate.producao_turno.sinais ?? 0,
          rejeitos: contextUpdate.producao_turno.rejeitos ?? 0
        } : null,
        
        // Extrair sessao_operador dos sinais/sinais_validos do contexto
        // Os sinais da sessão vêm de context.sinais e context.sinais_validos
        // Os rejeitos da sessão podem vir de producao_mapa.rejeitos ou serem calculados
        sessao_operador: {
          id_sessao: contextUpdate.sessoes && contextUpdate.sessoes.length > 0 ? contextUpdate.sessoes[0] : null,
          sinais: contextUpdate.sinais ?? 0,
          sinais_validos: contextUpdate.sinais_validos ?? contextUpdate.sinais ?? 0,
          // Rejeitos podem vir de producao_mapa.rejeitos (se for sessão atual) ou ser 0
          rejeitos: contextUpdate.producao_mapa?.rejeitos ?? 0,
          tempo_decorrido_segundos: contextUpdate.producao_mapa?.tempo_decorrido_segundos ?? 0,
          tempo_paradas_segundos: contextUpdate.producao_mapa?.tempo_paradas_segundos ?? 0,
          tempo_valido_segundos: contextUpdate.producao_mapa?.tempo_valido_segundos ?? 0
        },
        
        // ✅ ATUALIZADO: context_update TRAZ parada_ativa e sessao_operador
        parada_ativa: contextUpdate.parada_ativa || null,
        sessao_operador: contextUpdate.sessao_operador || null,
        multipostos: contextUpdate.multipostos ?? false
      };
      
      // Atualizar dados da máquina com merge inteligente (evitar zerar contadores)
      setMachineData(prev => {
        if (!prev || !prev.contexto) {
          // Primeira atualização, criar estrutura completa
          return {
            contexto: normalizedContext
          };
        }
        
        // Merge inteligente: manter valores anteriores se os novos estiverem zerados
        const prevCtx = prev.contexto;
        const now = Date.now();
        const prevUpdated = prevCtx.last_updated || now;
        const freshWindowMs = 2 * 60 * 1000; // 2 min
        
        const prevSessao = prevCtx.sessao_operador || {};
        const nextSessao = normalizedContext.sessao_operador || {};
        
        const prevMapa = prevCtx.producao_mapa || {};
        const nextMapa = normalizedContext.producao_mapa || {};
        
        const shouldKeepSessionCounts =
          (prevSessao.sinais > 0 || prevSessao.sinais_validos > 0 || prevSessao.rejeitos > 0) &&
          (nextSessao.sinais === 0 && (nextSessao.sinais_validos ?? 0) === 0 && (nextSessao.rejeitos ?? 0) === 0) &&
          (now - prevUpdated < freshWindowMs);
        
        const shouldKeepMapaCounts =
          (prevMapa.sinais > 0 || prevMapa.sinais_validos > 0 || prevMapa.rejeitos > 0) &&
          (nextMapa && nextMapa.sinais === 0 && (nextMapa.sinais_validos ?? 0) === 0 && (nextMapa.rejeitos ?? 0) === 0) &&
          (now - prevUpdated < freshWindowMs);
        
        console.log('🔄 SSE Manager: Atualizando contexto com context_update:', {
          id: normalizedContext.id_maquina,
          nome: normalizedContext.nome,
          sinais: normalizedContext.sessao_operador?.sinais,
          sinais_validos: normalizedContext.sessao_operador?.sinais_validos,
          preservando_sessao: shouldKeepSessionCounts,
          preservando_mapa: shouldKeepMapaCounts
        });
        
        return {
          contexto: {
            ...prevCtx,
            ...normalizedContext,
            // Preservar contadores se necessário
            sessao_operador: shouldKeepSessionCounts ? { ...nextSessao, ...prevSessao } : nextSessao,
            producao_mapa: shouldKeepMapaCounts ? { ...nextMapa, sinais: prevMapa.sinais, sinais_validos: prevMapa.sinais_validos, rejeitos: prevMapa.rejeitos } : nextMapa,
            // Manter velocidade e status se não vierem no update
            velocidade: normalizedContext.velocidade || prevCtx.velocidade || 0,
            status: normalizedContext.status ?? prevCtx.status ?? true,
            // Manter parada_ativa se existir (não vem no context_update)
            parada_ativa: prevCtx.parada_ativa || normalizedContext.parada_ativa,
            last_updated: normalizedContext.last_updated || now
          }
        };
      });
      
      return;
    }
    // ✅ IGNORAR fallbacks que podem estar vazios - só atualizar se for initial_context completo
    else {
      console.warn(`⚠️ SSE Manager: Tipo de mensagem desconhecido ou sem handler: ${data.type}. Ignorando para evitar perda de dados.`);
      // NÃO fazer setMachineData aqui - pode estar vazio ou parcial e sobrescrever dados bons
      return;
    }
  }, [processInitialContext, machineId, unwrap, mapProducaoAtiva]);

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
      
      // ✅ NOVO: Se o erro for 401/403 (não autorizado), limpar sessão salva
      // O EventSource não expõe status HTTP diretamente, mas podemos verificar se é erro de autenticação
      const errorEvent = error as any;
      if (errorEvent?.target?.readyState === EventSource.CLOSED) {
        console.warn('⚠️ SSE Manager: Conexão fechada - pode ser erro de autenticação');
        // Limpar sessão salva para permitir novo login
        localStorage.removeItem('industrack_active_session');
        console.log('🧹 SSE Manager: Sessão salva removida devido a erro de conexão');
      }
    }
  });

  // ==================== COMANDOS API ====================

  // Consultar contexto inicial
  const consultarContexto = useCallback(async () => {
    if (!machineId) {
      console.log('⚠️ SSE Manager: consultarContexto chamado sem machineId');
      return;
    }
    
    console.log(`🔍 SSE Manager: Consultando contexto para máquina ${machineId}...`);
    setIsLoading(true);
    try {
      const response = await apiService.consultarContexto(machineId);
      console.log(`📡 SSE Manager: Resposta do consultarContexto:`, response);
      
      if (response.success && response.data) {
        console.log(`✅ SSE Manager: Contexto recebido com sucesso:`, response.data);
        // Processar contexto inicial e atualizar máquinas filhas
        processInitialContext(response.data);
        setError(null);
      } else {
        console.error(`❌ SSE Manager: Erro na resposta do contexto:`, response.error);
        const errorMsg = response.error || 'Erro ao consultar contexto';
        setError(errorMsg);
        
        // ✅ NOVO: Se erro for de autenticação (401/403), limpar sessão salva
        const isAuthError = response.status === 401 || response.status === 403 || 
                           errorMsg.includes('401') || errorMsg.includes('403') || 
                           errorMsg.includes('não autorizado') || errorMsg.includes('autenticação') ||
                           errorMsg.includes('Unauthorized') || errorMsg.includes('Forbidden');
        
        if (isAuthError) {
          console.warn('⚠️ SSE Manager: Erro de autenticação detectado, limpando sessão salva');
          localStorage.removeItem('industrack_active_session');
          console.log('🧹 SSE Manager: Sessão salva removida devido a erro de autenticação');
        }
      }
    } catch (err: any) {
      console.error('❌ SSE Manager: Erro ao consultar contexto:', err);
      const errorMsg = err?.message || 'Erro ao consultar contexto';
      setError(errorMsg);
      
      // ✅ NOVO: Se erro for de autenticação (401/403), limpar sessão salva
      if (errorMsg.includes('401') || errorMsg.includes('403') || errorMsg.includes('não autorizado') || errorMsg.includes('autenticação')) {
        console.warn('⚠️ SSE Manager: Erro de autenticação detectado no catch, limpando sessão salva');
        localStorage.removeItem('industrack_active_session');
        console.log('🧹 SSE Manager: Sessão salva removida devido a erro de autenticação');
      }
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
  const finalizarSessao = useCallback(async (idSessao?: number) => {
    const response = await apiService.finalizarSessao({
      id_maquina: machineId,
      ...(idSessao ? { id_sessao: idSessao } : {})
    });
    
    if (!response.success) {
      setError(response.error || 'Erro ao finalizar sessão');
    } else {
      // ✅ NOVO: Limpar sessão salva quando finalizar
      console.log('🧹 Limpando sessão salva do localStorage após finalização');
      localStorage.removeItem('industrack_active_session');
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
    } else {
      // ✅ Atualização instantânea dos contadores locais com base no retorno da API
      try {
        const payload: any = response.data || {};
        const targetId: number = payload.id_maquina ?? machineId;
        const counters: any = payload.contadores || {};
        const sessaoRej = counters.sessao_rejeitos;
        const turnoRej = counters.turno_rejeitos;
        const mapaRej = counters.mapa_rejeitos;

        if (targetId === machineId) {
          setMachineData(prev => {
            if (!prev || !prev.contexto) return prev;
            return {
              ...prev,
              contexto: {
                ...prev.contexto,
                sessao_operador: prev.contexto.sessao_operador ? {
                  ...prev.contexto.sessao_operador,
                  ...(sessaoRej !== undefined ? { rejeitos: sessaoRej } : {})
                } : prev.contexto.sessao_operador,
                producao_turno: prev.contexto.producao_turno ? {
                  ...prev.contexto.producao_turno,
                  ...(turnoRej !== undefined ? { rejeitos: turnoRej } : {})
                } : prev.contexto.producao_turno,
                producao_mapa: prev.contexto.producao_mapa ? {
                  ...prev.contexto.producao_mapa,
                  ...(mapaRej !== undefined ? { rejeitos: mapaRej } : {})
                } : prev.contexto.producao_mapa
              }
            };
          });
        } else {
          // Pode ser uma estação (máquina filha)
          setChildMachinesData(prev => {
            const updated = new Map(prev);
            const child = updated.get(targetId);
            if (!child) return prev;
            updated.set(targetId, {
              ...child,
              sessao_operador: child.sessao_operador ? {
                ...child.sessao_operador,
                ...(sessaoRej !== undefined ? { rejeitos: sessaoRej } : {})
              } : child.sessao_operador,
              producao_turno: child.producao_turno ? {
                ...child.producao_turno,
                ...(turnoRej !== undefined ? { rejeitos: turnoRej } : {})
              } : child.producao_turno,
              producao_mapa: child.producao_mapa ? {
                ...child.producao_mapa,
                ...(mapaRej !== undefined ? { rejeitos: mapaRej } : {})
              } : child.producao_mapa,
              last_updated: Date.now()
            });
            return updated;
          });
        }
      } catch (e) {
        console.warn('⚠️ Falha ao aplicar atualização local de rejeitos:', e);
      }
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
    } else if (response.data) {
      // ✅ Atualizar estado local com dados da parada forçada
      try {
        console.log('🛑 Aplicando atualização local - parada forçada:', response.data);
        setMachineData(prev => {
          if (!prev) return prev;
          
          return {
            ...prev,
            contexto: {
              ...prev.contexto,
              status: false, // Máquina parada
              parada_ativa: {
                id: response.data.id_parada,
                inicio: response.data.inicio,
                motivo_id: response.data.id_motivo,
                bloqueio_sinais: response.data.bloqueio_sinais || false
              }
            }
          };
        });
      } catch (e) {
        console.warn('⚠️ Falha ao aplicar atualização local de parada forçada:', e);
      }
    }
    
    return response;
  }, [machineId]);

  // Retomar parada forçada
  const retomarParada = useCallback(async () => {
    const response = await apiService.retomarParada({
      id_maquina: machineId
    });
    
    if (!response.success) {
      setError(response.error || 'Erro ao retomar parada');
    } else {
      // ✅ Atualizar estado local - remover parada ativa
      try {
        console.log('▶️ Aplicando atualização local - parada retomada');
        setMachineData(prev => {
          if (!prev) return prev;
          
          return {
            ...prev,
            contexto: {
              ...prev.contexto,
              status: true, // Máquina em produção
              parada_ativa: null // Remove parada ativa
            }
          };
        });
      } catch (e) {
        console.warn('⚠️ Falha ao aplicar atualização local de retomada:', e);
      }
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
    forcarParada,
    retomarParada
  };
}

