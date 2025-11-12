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
  
  // ⚠️ DEBUG: Monitorar mudanças CRÍTICAS em childMachinesData (apenas problemas)
  useEffect(() => {
    const size = childMachinesData.size;
    const ids = Array.from(childMachinesData.keys());
    
    // ⚠️ ALERTA CRÍTICO: childMachinesData com tamanho inesperado ou IDs inválidos
    if (size > 0 && (size === 1 || ids.some(id => !id || isNaN(id)))) {
      console.error('❌ CRÍTICO: childMachinesData com dados inválidos!', {
        tamanho: size,
        ids: ids,
        dados_invalidos: ids.filter(id => !id || isNaN(id)),
        stack: new Error().stack
      });
    }
    // ✅ Log reduzido: Só logar mudanças significativas (não a cada update)
  }, [childMachinesData]);

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
    
    // ✅ Log reduzido: Removido log repetitivo a cada chamada de mapProducaoAtiva
    // Descomentar apenas se precisar debugar mapeamento de produtos
    
    return mapped;
  }, []);

  // ⚠️ DEBUG: Monitorar APENAS problemas críticos em machineData (logs reduzidos)
  useEffect(() => {
    if (machineData) {
      const logData = {
        id: machineData.contexto?.id || machineData.contexto?.id_maquina,
        nome: machineData.contexto?.nome
      };
      
      // ⚠️ ALERTA CRÍTICO: Detectar se machineData está vindo sem ID ou nome
      if (!logData.id || !logData.nome) {
        console.error('❌ CRÍTICO: machineData SEM ID OU NOME!', {
          id: logData.id,
          nome: logData.nome,
          machineData_completo: machineData,
          stack: new Error().stack
        });
      }
      // ✅ Log reduzido: Removidos logs repetitivos de atualização normal
    }
  }, [machineData]);

  // ==================== BUSCAR MÁQUINAS FILHAS (DESABILITADO) ====================
  
  // ⚠️ FUNÇÃO DESABILITADA: NÃO USAR!
  // A API /api/maquinas retorna apenas metadados (sem sessao_operador, producao_turno, etc.)
  // e sobrescreve os dados completos que vêm via SSE, causando bug de "Estação undefined"
  // 
  // SOLUÇÃO: Confiar APENAS nos dados do SSE (context_update e initial_context)
  // O backend deve sempre enviar maquinas_filhas com dados completos via SSE
  
  /* FALLBACK DESABILITADO - NÃO DESCOMENTAR!
  const buscarMaquinasFilhas = useCallback(async (parentMachineId: number) => {
    try {
      console.log(`🔍 Buscando máquinas filhas para máquina pai ${parentMachineId}...`);
      
      const response = await apiService.listarMaquinas();
      if (response.success && response.data) {
        const childMachines = response.data.filter((machine: any) => 
          machine.maquina_pai === parentMachineId && machine.maquina_filha === true
        );
        
        if (childMachines.length > 0) {
          const simulatedChildMachinesData = new Map<number, any>();
          
          childMachines.forEach((childMachine: any, index: number) => {
            const simulatedData = {
              id_maquina: childMachine.id_maquina,
              nome: childMachine.nome,
              ativa: childMachine.ativa || false,
              status: childMachine.status || false,
              velocidade: 0,
              numero_estacao: index + 1,
              sinais: 0, // ❌ PROBLEMA: Dados vazios sobrescrevem dados reais do SSE!
              sinais_validos: 0,
              rejeitos: 0,
              sessao_operador: { sinais: 0, sinais_validos: 0, rejeitos: 0 },
              producao_mapa: null,
              producao_turno: null,
              parada_ativa: null,
              last_updated: Date.now()
            };
            
            simulatedChildMachinesData.set(childMachine.id_maquina, simulatedData);
          });
          
          // ❌ ISSO SOBRESCREVE DADOS REAIS COM DADOS VAZIOS!
          setChildMachinesData(simulatedChildMachinesData);
        }
      }
    } catch (error) {
      console.error(`❌ Erro ao buscar máquinas filhas:`, error);
    }
  }, []);
  */

  // ==================== PROCESSAMENTO DE CONTEXTO INICIAL ====================

  // Processar contexto inicial e atualizar máquinas filhas OU máquina simples
  const processInitialContext = useCallback((context: any) => {
    // ✅ CRÍTICO: Unwrap pode retornar { success: true, data: {...} }
    // Precisamos garantir que estamos trabalhando com o objeto interno 'data'
    let contextData = unwrap(context);
    
    // Se vier wrapped com success/data, extrair o data
    if (contextData && contextData.success === true && contextData.data) {
      console.log('🔓 SSE Manager: Desempacotando wrapper { success: true, data: {...} }');
      contextData = contextData.data;
    }
    
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
    
    // ⚠️ PROTEÇÃO: Verificar se contexto é válido para multipostos
    const isMultipostos = contextData.multipostos === true || contextData.maquina?.multipostos === true;
    const hasChildMachinesData = (contextData.maquinas_filhas && contextData.maquinas_filhas.length > 0) || 
                                  (contextData.contextos_filhas && contextData.contextos_filhas.length > 0);
    
    console.log(`🔒 SSE Manager: Validação multipostos - isMultipostos: ${isMultipostos}, hasChildMachinesData: ${hasChildMachinesData}`);
    
    // ❌ DIAGNÓSTICO: Para máquinas multipostos, backend deve incluir contextos_filhas ou maquinas_filhas
    if (isMultipostos && !hasChildMachinesData) {
      console.error(`❌ PROBLEMA NO BACKEND: Máquina ${contextData.nome} (ID: ${contextData.id}) é multipostos, mas maquinas_filhas está vazio!`);
      console.error(`❌ Backend deveria retornar: { ..., maquinas_filhas: [{ id: X, nome: "...", sessao_operador: {...}, ... }, ...] }`);
      console.error(`❌ Mas retornou:`, Object.keys(contextData));
      
      // ⚠️ NÃO buscar via API REST! A API /api/maquinas retorna apenas metadados
      // e sobrescreve os dados completos do SSE. Aguardar context_update do backend.
      console.warn(`⚠️ Aguardando context_update com dados completos das máquinas filhas via SSE...`);
      // NÃO chamar buscarMaquinasFilhas() - isso causa o bug!
    }
    
    // ✅ NOVO: Caso 1A: Nova estrutura - maquinas_filhas (formato novo do backend)
    if (contextData.maquinas_filhas && Array.isArray(contextData.maquinas_filhas)) {
      console.log(`📊 SSE Manager: NOVA ESTRUTURA - Máquina MULTIPOSTOS - ${contextData.maquinas_filhas.length} máquinas filhas encontradas`);
      
      const newChildMachinesData = new Map<number, any>();
      
      contextData.maquinas_filhas.forEach((childMachine: any, index: number) => {
        // ✅ CORRIGIDO: Usar os nomes corretos dos campos enviados pelo backend
        // Backend envia: { id, nome, sessao_operador, producao_mapa, ... }
        // NÃO: { id_maquina, sessao_ativa, producao_ativa }
        const childId = childMachine.id || childMachine.id_maquina;
        const childNome = childMachine.nome;
        const childStatus = childMachine.status;
        const childAtiva = childMachine.ativa;
        const sessaoOperador = childMachine.sessao_operador; // ✅ NÃO sessao_ativa
        const producaoTurno = childMachine.producao_turno;
        const producaoMapa = childMachine.producao_mapa; // ✅ NÃO producao_ativa
        
        // ⚠️ VALIDAÇÃO: Pular se ID for inválido
        if (!childId || typeof childId !== 'number') {
          console.error(`❌ Máquina filha [${index}] com ID inválido:`, childMachine);
          return;
        }
        
        // ✅ Log reduzido: Apenas log resumido, não detalhado para cada máquina
        
        // Armazenar dados da máquina filha (nova estrutura)
        const childMachineData = {
          id_maquina: childId, // ✅ ID validado
          nome: childNome || `Estação ${childId}`, // ✅ Fallback
          ativa: childAtiva ?? false,
          status: childStatus ?? false,
          velocidade: childMachine.velocidade ?? 0,
          numero_estacao: index + 1, // EVA: baseado na posição
          sinais: sessaoOperador?.sinais || producaoTurno?.sinais || 0,
          sinais_validos: sessaoOperador?.sinais_validos || producaoTurno?.sinais_validos || producaoTurno?.sinais || 0,
          rejeitos: sessaoOperador?.rejeitos || producaoTurno?.rejeitos || 0,
          sessao_operador: {
            id_sessao: sessaoOperador?.id_sessao ?? null,
            sinais: sessaoOperador?.sinais ?? 0,
            sinais_validos: sessaoOperador?.sinais_validos ?? sessaoOperador?.sinais ?? 0,
            rejeitos: sessaoOperador?.rejeitos ?? 0,
            tempo_decorrido_segundos: sessaoOperador?.tempo_decorrido_segundos ?? 0,
            tempo_paradas_segundos: sessaoOperador?.tempo_paradas_segundos ?? 0,
            tempo_valido_segundos: sessaoOperador?.tempo_valido_segundos ?? 0
          },
          producao_mapa: producaoMapa ? mapProducaoAtiva(producaoMapa) : null, // ✅ Normalizar
          producao_turno: producaoTurno ? {
            ...producaoTurno,
            sinais: producaoTurno.sinais ?? 0,
            sinais_validos: producaoTurno.sinais_validos ?? producaoTurno.sinais ?? 0,
            rejeitos: producaoTurno.rejeitos ?? 0
          } : null,
          parada_ativa: childMachine.parada_ativa ?? null,
          last_updated: childMachine.last_updated || Date.now()
        };
        
        // ✅ Log reduzido: Removido log repetitivo de cada máquina
        newChildMachinesData.set(childId, childMachineData); // ✅ Usar childId validado
      });
      
      // ✅ Log resumido: Uma linha apenas
      console.log(`📊 SSE Manager: ${newChildMachinesData.size} máquinas filhas processadas (initial_context) - IDs: [${Array.from(newChildMachinesData.keys()).join(', ')}]`);
      setChildMachinesData(newChildMachinesData);
      
      // Definir dados da máquina principal (nova estrutura)
      // ✅ CORRIGIDO: Backend envia dados diretamente no contextData, não em contextData.maquina
      let paradaAtivaMain = contextData.parada_ativa ?? null;
      const paradaForcadaMain = contextData.parada_forcada;
      let statusMain = contextData.status ?? true; // ✅ NÃO contextData.maquina.status
      
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
          id: contextData.id, // ✅ CORRIGIDO: contextData.id, não contextData.maquina.id_maquina
          id_maquina: contextData.id, // ✅ Adicionar também id_maquina
          nome: contextData.nome, // ✅ CORRIGIDO: contextData.nome, não contextData.maquina.nome
          velocidade: contextData.velocidade ?? 0, // ✅ CORRIGIDO
          ativa: contextData.ativa ?? true, // ✅ Adicionar campo ativa
          status: statusMain,
          sessao_operador: contextData.sessao_operador || { // ✅ CORRIGIDO: sessao_operador, não sessao_ativa
            id_sessao: null,
            sinais: 0,
            sinais_validos: 0,
            rejeitos: 0,
            tempo_decorrido_segundos: 0,
            tempo_paradas_segundos: 0,
            tempo_valido_segundos: 0
          },
          producao_mapa: mapProducaoAtiva(contextData.producao_mapa), // ✅ CORRIGIDO: producao_mapa, não producao_ativa
          producao_turno: contextData.producao_turno || null,
          parada_ativa: paradaAtivaMain,
          parada_forcada: paradaForcadaMain ?? null,
          multipostos: contextData.multipostos ?? false // ✅ Adicionar flag
        }
      };
      
      console.log(`✅ SSE Manager: Dados da máquina principal (nova estrutura):`, mainMachineData);
      
      // ✅ NOVO: Salvar sessão no localStorage quando receber do SSE
      if (contextData.sessao_operador && contextData.sessao_operador.id_sessao) {
        saveSessaoToLocalStorage(contextData.sessao_operador, machineId);
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
  }, [machineId, mapProducaoAtiva]); // buscarMaquinasFilhas removido - função desabilitada

  // Handler para mensagens SSE
  const handleSSEMessage = useCallback((data: any) => {
    // ✅ Log reduzido: Apenas tipo da mensagem, não o objeto completo
    console.log('📊 SSE Manager: Processando mensagem:', data.type);
    
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
      
      // ⚠️ PROTEÇÃO CRÍTICA: Não processar eventos sem dados válidos de máquina principal
      // Isso evita sobrescrever childMachinesData com dados vazios
      if (!rawPayload || (typeof rawPayload === 'object' && Object.keys(rawPayload).length === 0)) {
        console.warn('⚠️ SSE Manager: Evento machine_data/update sem payload válido, ignorando para preservar dados existentes');
        return; // NÃO atualizar nada, manter dados existentes
      }

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
      
      // ⚠️ PROTEÇÃO ADICIONAL: Verificar se tem ID válido antes de processar
      const machineIdInPayload = machineDataPayload?.contexto?.id_maquina || machineDataPayload?.id_maquina || machineDataPayload?.id;
      if (!machineIdInPayload) {
        console.warn('⚠️ SSE Manager: Evento sem ID de máquina válido, ignorando para preservar dados existentes:', machineDataPayload);
        return; // NÃO atualizar, ID inválido
      }

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
      
      // ⚠️ PROTEÇÃO: Validar ID da máquina alvo
      if (!targetMachineId || typeof targetMachineId !== 'number') {
        console.warn('⚠️ SSE Manager: Evento rejeitos_adicionados sem ID de máquina válido, ignorando:', unwrapped);
        return; // NÃO processar, ID inválido
      }
      
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
            console.log(`🔄 Atualizando rejeitos para estação ${targetMachineId} (${childData.nome}):`, {
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
            console.log(`✅ Estação ${targetMachineId} (${childData.nome}) atualizada com novos rejeitos:`, updatedChildData.sessao_operador);
          } else {
            console.warn(`⚠️ Máquina filha ${targetMachineId} não encontrada no childMachinesData (size: ${prev.size})`);
            console.warn(`⚠️ IDs disponíveis:`, Array.from(prev.keys()));
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
      
      // ✅ NOVO: Processar máquinas filhas se for multipostos
      if (contextUpdate.multipostos && contextUpdate.maquinas_filhas && Array.isArray(contextUpdate.maquinas_filhas)) {
        console.log(`📊 SSE Manager: context_update MULTIPOSTOS - ${contextUpdate.maquinas_filhas.length} máquinas filhas encontradas`);
        
        const newChildMachinesData = new Map<number, any>();
        
        contextUpdate.maquinas_filhas.forEach((childMachine: any, index: number) => {
          // ⚠️ PROTEÇÃO CRÍTICA: Validar ID antes de processar
          const childId = childMachine.id || childMachine.id_maquina;
          if (!childId || typeof childId !== 'number') {
            console.error(`❌ SSE Manager: Máquina filha na posição ${index} tem ID inválido:`, childMachine);
            return; // PULAR esta máquina filha
          }
          
          // ✅ Log reduzido: Apenas para primeira carga ou erros (não a cada update)
          
          // Normalizar dados da máquina filha
          const childMachineData = {
            id_maquina: childId, // ✅ Usar ID validado
            nome: childMachine.nome || `Estação ${childId}`, // ✅ Fallback para nome
            ativa: childMachine.ativa ?? false,
            status: childMachine.status ?? false,
            velocidade: childMachine.velocidade ?? 0,
            numero_estacao: index + 1, // Baseado na posição no array
            
            // Contadores da sessão do operador
            sinais: childMachine.sessao_operador?.sinais ?? 0,
            sinais_validos: childMachine.sessao_operador?.sinais_validos ?? childMachine.sessao_operador?.sinais ?? 0,
            rejeitos: childMachine.sessao_operador?.rejeitos ?? 0,
            
            // Sessão completa do operador
            sessao_operador: {
              id_sessao: childMachine.sessao_operador?.id_sessao ?? null,
              sinais: childMachine.sessao_operador?.sinais ?? 0,
              sinais_validos: childMachine.sessao_operador?.sinais_validos ?? childMachine.sessao_operador?.sinais ?? 0,
              rejeitos: childMachine.sessao_operador?.rejeitos ?? 0,
              tempo_decorrido_segundos: childMachine.sessao_operador?.tempo_decorrido_segundos ?? 0,
              tempo_paradas_segundos: childMachine.sessao_operador?.tempo_paradas_segundos ?? 0,
              tempo_valido_segundos: childMachine.sessao_operador?.tempo_valido_segundos ?? 0
            },
            
            // Produção do turno
            producao_turno: childMachine.producao_turno ? {
              ...childMachine.producao_turno,
              sinais: childMachine.producao_turno.sinais ?? 0,
              sinais_validos: childMachine.producao_turno.sinais_validos ?? childMachine.producao_turno.sinais ?? 0,
              rejeitos: childMachine.producao_turno.rejeitos ?? 0
            } : null,
            
            // Produção do mapa (normalizada)
            producao_mapa: childMachine.producao_mapa ? mapProducaoAtiva(childMachine.producao_mapa) : null,
            
            // Parada ativa
            parada_ativa: childMachine.parada_ativa ?? null,
            
            // Timestamp de atualização
            last_updated: childMachine.last_updated || Date.now()
          };
          
          // ✅ Log reduzido: Removido log repetitivo de cada máquina processada
          newChildMachinesData.set(childId, childMachineData); // ✅ Usar ID validado
        });
        
        // ✅ Log resumido: Uma linha apenas com o total
        console.log(`📊 SSE Manager: ${newChildMachinesData.size} máquinas filhas processadas via context_update - IDs: [${Array.from(newChildMachinesData.keys()).join(', ')}]`);
        
        // ⚠️ PROTEÇÃO CRÍTICA: Não sobrescrever dados existentes com Map vazio
        if (newChildMachinesData.size === 0) {
          console.warn('⚠️ SSE Manager: context_update não trouxe máquinas filhas válidas. Preservando dados existentes.');
          // NÃO atualizar childMachinesData, manter dados existentes
        } else {
          // Atualizar childMachinesData com merge inteligente
          setChildMachinesData(prev => {
            // Se não há dados anteriores, usar os novos
            if (prev.size === 0) {
              console.log(`✅ SSE Manager: Primeira carga de máquinas filhas - ${newChildMachinesData.size} estações`);
              return newChildMachinesData;
            }
            
            // ⚠️ OTIMIZAÇÃO: Verificar se REALMENTE houve mudanças antes de atualizar
            // Isso evita re-renders desnecessários quando SSE envia os mesmos dados
            let hasChanges = false;
            
            if (prev.size !== newChildMachinesData.size) {
              hasChanges = true;
              console.log(`🔄 SSE Manager: Tamanho mudou - Anterior: ${prev.size}, Novo: ${newChildMachinesData.size}`);
            }
            
            if (!hasChanges) {
              // Verificar se algum dado mudou
              for (const [childId, newData] of newChildMachinesData.entries()) {
                const prevData = prev.get(childId);
                
                if (!prevData) {
                  hasChanges = true;
                  console.log(`🔄 SSE Manager: Nova máquina filha detectada: ${childId}`);
                  break;
                }
                
                // Verificar mudanças em campos importantes
                if (
                  prevData.sinais !== newData.sinais ||
                  prevData.sinais_validos !== newData.sinais_validos ||
                  prevData.rejeitos !== newData.rejeitos ||
                  prevData.status !== newData.status ||
                  prevData.ativa !== newData.ativa ||
                  prevData.velocidade !== newData.velocidade ||
                  prevData.sessao_operador?.sinais !== newData.sessao_operador?.sinais ||
                  prevData.producao_turno?.sinais !== newData.producao_turno?.sinais ||
                  prevData.producao_mapa?.sinais !== newData.producao_mapa?.sinais
                ) {
                  hasChanges = true;
                  console.log(`🔄 SSE Manager: Mudanças detectadas na máquina filha ${childId}`);
                  break;
                }
              }
            }
            
            if (!hasChanges) {
              console.log(`⏭️ SSE Manager: Nenhuma mudança detectada em childMachinesData, mantendo objeto anterior (evita re-render)`);
              return prev; // ✅ Retornar o MESMO objeto, não criar novo
            }
            
            console.log(`🔄 SSE Manager: Fazendo merge de máquinas filhas - Anterior: ${prev.size}, Novo: ${newChildMachinesData.size}`);
          
          // Merge: preservar contadores se os novos vierem zerados
          const mergedMap = new Map<number, any>();
          
          newChildMachinesData.forEach((newData, childId) => {
            const prevData = prev.get(childId);
            
            if (!prevData) {
              // Máquina filha nova, adicionar
              mergedMap.set(childId, newData);
              return;
            }
            
            // Merge inteligente: evitar zerar contadores recentemente atualizados
            const now = Date.now();
            const prevUpdated = prevData.last_updated || now;
            const freshWindowMs = 2 * 60 * 1000; // 2 min
            
            const prevSessao = prevData.sessao_operador || {};
            const nextSessao = newData.sessao_operador || {};
            
            const shouldKeepSessionCounts =
              (prevSessao.sinais > 0 || prevSessao.sinais_validos > 0 || prevSessao.rejeitos > 0) &&
              (nextSessao.sinais === 0 && nextSessao.sinais_validos === 0 && nextSessao.rejeitos === 0) &&
              (now - prevUpdated < freshWindowMs);
            
            mergedMap.set(childId, {
              ...prevData,
              ...newData,
              // Preservar contadores de sessão se necessário
              sessao_operador: shouldKeepSessionCounts ? { ...nextSessao, ...prevSessao } : nextSessao,
              sinais: shouldKeepSessionCounts ? prevSessao.sinais : nextSessao.sinais,
              sinais_validos: shouldKeepSessionCounts ? prevSessao.sinais_validos : nextSessao.sinais_validos,
              rejeitos: shouldKeepSessionCounts ? prevSessao.rejeitos : nextSessao.rejeitos,
              last_updated: newData.last_updated || now
            });
          });
          
            return mergedMap;
          });
        }
      }
      
      // Normalizar estrutura do contexto da máquina principal
      // O backend envia: context { producao_mapa, producao_turno, sessao_operador, ... }
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
        
        // ✅ NOVO: sessao_operador vem direto do backend
        sessao_operador: contextUpdate.sessao_operador ? {
          ...contextUpdate.sessao_operador,
          sinais: contextUpdate.sessao_operador.sinais ?? 0,
          sinais_validos: contextUpdate.sessao_operador.sinais_validos ?? contextUpdate.sessao_operador.sinais ?? 0,
          rejeitos: contextUpdate.sessao_operador.rejeitos ?? 0
        } : null,
        
        // ✅ context_update TRAZ parada_ativa
        parada_ativa: contextUpdate.parada_ativa || null,
        multipostos: contextUpdate.multipostos ?? false
      };
      
      // Atualizar dados da máquina com merge inteligente (evitar zerar contadores)
      setMachineData(prev => {
        if (!prev || !prev.contexto) {
          // Primeira atualização, criar estrutura completa
          console.log('✅ SSE Manager: Primeira atualização de machineData (máquina principal)');
          return {
            contexto: normalizedContext
          };
        }
        
        // ⚠️ OTIMIZAÇÃO: Verificar se REALMENTE houve mudanças antes de atualizar
        // Isso evita re-renders desnecessários quando SSE envia os mesmos dados
        const prevCtx = prev.contexto;
        const now = Date.now();
        const prevUpdated = prevCtx.last_updated || now;
        const freshWindowMs = 2 * 60 * 1000; // 2 min
        
        const prevSessao = prevCtx.sessao_operador || {};
        const nextSessao = normalizedContext.sessao_operador || {};
        
        const prevMapa = prevCtx.producao_mapa || {};
        const nextMapa = normalizedContext.producao_mapa || {};
        
        // Verificar se houve mudanças reais
        const hasChanges = (
          prevCtx.status !== normalizedContext.status ||
          prevCtx.ativa !== normalizedContext.ativa ||
          prevCtx.velocidade !== normalizedContext.velocidade ||
          prevSessao.sinais !== nextSessao.sinais ||
          prevSessao.sinais_validos !== nextSessao.sinais_validos ||
          prevSessao.rejeitos !== nextSessao.rejeitos ||
          prevCtx.producao_turno?.sinais !== normalizedContext.producao_turno?.sinais ||
          prevMapa.sinais !== nextMapa.sinais ||
          prevMapa.sinais_validos !== nextMapa.sinais_validos ||
          prevMapa.rejeitos !== nextMapa.rejeitos ||
          prevCtx.parada_ativa?.id !== normalizedContext.parada_ativa?.id
        );
        
        if (!hasChanges) {
          console.log('⏭️ SSE Manager: Nenhuma mudança detectada em machineData, mantendo objeto anterior (evita re-render)');
          return prev; // ✅ Retornar o MESMO objeto, não criar novo
        }
        
        const shouldKeepSessionCounts =
          (prevSessao.sinais > 0 || prevSessao.sinais_validos > 0 || prevSessao.rejeitos > 0) &&
          (nextSessao.sinais === 0 && (nextSessao.sinais_validos ?? 0) === 0 && (nextSessao.rejeitos ?? 0) === 0) &&
          (now - prevUpdated < freshWindowMs);
        
        const shouldKeepMapaCounts =
          (prevMapa.sinais > 0 || prevMapa.sinais_validos > 0 || prevMapa.rejeitos > 0) &&
          (nextMapa && nextMapa.sinais === 0 && (nextMapa.sinais_validos ?? 0) === 0 && (nextMapa.rejeitos ?? 0) === 0) &&
          (now - prevUpdated < freshWindowMs);
        
        console.log('🔄 SSE Manager: Atualizando contexto da máquina principal com context_update (mudanças detectadas):', {
          id: normalizedContext.id_maquina,
          nome: normalizedContext.nome,
          multipostos: normalizedContext.multipostos,
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
            velocidade: normalizedContext.velocidade ?? prevCtx.velocidade ?? 0,
            status: normalizedContext.status ?? prevCtx.status ?? true,
            // Usar parada_ativa do novo contexto ou manter a anterior
            parada_ativa: normalizedContext.parada_ativa ?? prevCtx.parada_ativa,
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
        // ✅ Limpar sessão salva para permitir novo login (chaves corretas)
        localStorage.removeItem('id_sessao');
        localStorage.removeItem('sessao_ativa');
        localStorage.removeItem('industrack_active_session'); // Limpar chave antiga
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
          // ✅ Limpar sessão salva (chaves corretas)
          localStorage.removeItem('id_sessao');
          localStorage.removeItem('sessao_ativa');
          localStorage.removeItem('industrack_active_session'); // Limpar chave antiga
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
        // ✅ Limpar sessão salva (chaves corretas)
        localStorage.removeItem('id_sessao');
        localStorage.removeItem('sessao_ativa');
        localStorage.removeItem('industrack_active_session'); // Limpar chave antiga
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
      // ✅ NOVO: Detectar desalinhamento de sessão (backend não tem sessão ativa)
      const errorMsg = response.error || '';
      const isSessionMismatch = errorMsg.includes('Não há sessão ativa') || 
                                 errorMsg.includes('sessão ativa para finalizar') ||
                                 errorMsg.includes('400:');
      
      if (isSessionMismatch) {
        console.warn('⚠️ useSSEManager: Desalinhamento de sessão detectado - limpando localStorage');
        // Não mostrar erro, apenas limpar localStorage e prosseguir
      } else {
        setError(response.error || 'Erro ao finalizar sessão');
      }
    }
    
    // ✅ Limpar sessão salva quando finalizar (chaves corretas) - independente de sucesso/erro
    console.log('🧹 Limpando sessão salva do localStorage após finalização');
    localStorage.removeItem('id_sessao');
    localStorage.removeItem('sessao_ativa');
    localStorage.removeItem('industrack_active_session'); // Limpar chave antiga
    
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

  // Adicionar rejeitos (permite especificar id_maquina para estações)
  const adicionarRejeitos = useCallback(async (request: Omit<AdicionarRejeitosRequest, 'id_maquina'> & { id_maquina?: number }) => {
    // ✅ Se id_maquina for fornecido, usar ele (para estações filhas)
    // Caso contrário, usar machineId do hook (máquina principal)
    const targetMachineId = request.id_maquina ?? machineId;
    
    console.log(`📤 adicionarRejeitos chamado:`, {
      target_machine_id: targetMachineId,
      machine_id_hook: machineId,
      eh_estacao_filha: targetMachineId !== machineId,
      quantidade: request.quantidade
    });
    
    const response = await apiService.adicionarRejeitos({
      id_maquina: targetMachineId,
      quantidade: request.quantidade,
      id_motivo_rejeito: request.id_motivo_rejeito
    });
    
    if (!response.success) {
      setError(response.error || 'Erro ao adicionar rejeitos');
    } else {
      // ✅ ATUALIZAÇÃO INSTANTÂNEA (Otimista) - Baseada na resposta do servidor
      console.log('📥 Resposta completa do servidor (adicionarRejeitos):', response);
      
      try {
        const payload: any = response.data || {};
        console.log('📦 Payload extraído de response.data:', payload);
        
        const targetId: number = payload.id_maquina ?? machineId;
        console.log('🎯 ID da máquina alvo:', targetId, '(machineId principal:', machineId, ')');
        
        const counters: any = payload.contadores || {};
        console.log('🔢 Objeto contadores:', counters);
        
        // Extrair contadores da resposta do servidor
        const sessaoRej = counters.sessao_rejeitos;
        const turnoRej = counters.turno_rejeitos;
        const mapaRej = counters.mapa_rejeitos;
        
        console.log(`✅ Contadores extraídos para Máquina ${targetId}:`, {
          sessao_rejeitos: sessaoRej,
          turno_rejeitos: turnoRej,
          mapa_rejeitos: mapaRej,
          todos_undefined: sessaoRej === undefined && turnoRej === undefined && mapaRej === undefined
        });

        if (targetId === machineId) {
          // Atualizar máquina principal
          console.log('🔄 Atualizando rejeitos da máquina principal');
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
          // ✅ Atualizar estação (máquina filha)
          console.log(`🔄 Atualizando rejeitos da estação ${targetId} instantaneamente`);
          console.log(`📊 Contadores recebidos do servidor:`, {
            sessao_rejeitos: sessaoRej,
            turno_rejeitos: turnoRej,
            mapa_rejeitos: mapaRej
          });
          
          setChildMachinesData(prev => {
            console.log(`📋 childMachinesData antes da atualização:`, {
              tamanho: prev.size,
              ids: Array.from(prev.keys()),
              tem_estacao_alvo: prev.has(targetId)
            });
            
            const updated = new Map(prev);
            const child = updated.get(targetId);
            
            if (!child) {
              console.error(`❌ CRÍTICO: Estação ${targetId} NÃO encontrada no childMachinesData!`, {
                targetId,
                ids_disponiveis: Array.from(prev.keys()),
                tamanho_map: prev.size
              });
              return prev;
            }
            
            console.log(`📊 Dados ANTES da atualização - Estação ${targetId}:`, {
              nome: child.nome,
              sessao_rejeitos_antes: child.sessao_operador?.rejeitos,
              turno_rejeitos_antes: child.producao_turno?.rejeitos,
              mapa_rejeitos_antes: child.producao_mapa?.rejeitos
            });
            
            const updatedChild = {
              ...child,
              // Atualizar contadores de sessão
              sessao_operador: child.sessao_operador ? {
                ...child.sessao_operador,
                rejeitos: sessaoRej !== undefined ? sessaoRej : child.sessao_operador.rejeitos
              } : child.sessao_operador,
              // Atualizar contadores de turno
              producao_turno: child.producao_turno ? {
                ...child.producao_turno,
                rejeitos: turnoRej !== undefined ? turnoRej : child.producao_turno.rejeitos
              } : child.producao_turno,
              // Atualizar contadores de mapa
              producao_mapa: child.producao_mapa ? {
                ...child.producao_mapa,
                rejeitos: mapaRej !== undefined ? mapaRej : child.producao_mapa.rejeitos
              } : child.producao_mapa,
              // Atualizar também os contadores no nível raiz (usado pelo Eva16StationsView)
              rejeitos: turnoRej ?? sessaoRej ?? mapaRej ?? child.rejeitos,
              last_updated: Date.now()
            };
            
            updated.set(targetId, updatedChild);
            
            console.log(`✅ Estação ${targetId} ATUALIZADA instantaneamente:`, {
              nome: updatedChild.nome,
              sessao_rejeitos_depois: updatedChild.sessao_operador?.rejeitos,
              turno_rejeitos_depois: updatedChild.producao_turno?.rejeitos,
              mapa_rejeitos_depois: updatedChild.producao_mapa?.rejeitos,
              rejeitos_raiz_depois: updatedChild.rejeitos
            });
            
            console.log(`📋 childMachinesData DEPOIS da atualização - Tamanho: ${updated.size}`);
            
            return updated;
          });
        }
      } catch (e) {
        console.warn('⚠️ Falha ao aplicar atualização instantânea de rejeitos:', e);
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

