import { supabase } from './supabase';
import type { Session, MachineParameters } from '../types/session';

// ✅ NOVO: Sistema simplificado com duas chaves
const SESSION_ID_KEY = 'id_sessao';
const SESSION_ACTIVE_KEY = 'sessao_ativa';

// Função utilitária para converter timestamp para fuso horário de Brasília
export function toBrasiliaTime(timestamp: number): string {
  // Criar data a partir do timestamp (que está em UTC)
  const date = new Date(timestamp * 1000);
  
  // Converter para fuso horário de Brasília (UTC-3)
  // Usar toLocaleString com timezone específico
  return date.toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).replace(/(\d{2})\/(\d{2})\/(\d{4}), (\d{2}):(\d{2}):(\d{2})/, '$3-$2-$1T$4:$5:$6');
}

// Função para obter timestamp atual no fuso horário de Brasília
export function getBrasiliaTimestamp(): number {
  // Obter data atual em Brasília
  const now = new Date();
  const brasiliaTime = new Date(now.toLocaleString('en-US', {
    timeZone: 'America/Sao_Paulo'
  }));
  
  // Converter para timestamp Unix (segundos desde 1970)
  return Math.floor(brasiliaTime.getTime() / 1000);
}

export async function createSession(
  machineId: number, 
  operatorId: number, 
  turnoId: number | null,
  secondaryOperatorId?: number | null
): Promise<Session> {
  console.log('createSession chamada com:', { machineId, operatorId, turnoId, secondaryOperatorId });
  
  // Verificar se já existe uma sessão ativa para esta máquina
  const { data: existingSessions, error: checkError } = await supabase
    .from('sessoes')
    .select('id')
    .eq('maquina', machineId)
    .is('fim', null);

  if (checkError) {
    console.error('Erro ao verificar sessões existentes:', checkError);
  } else if (existingSessions && existingSessions.length > 0) {
    console.log('Já existe uma sessão ativa para esta máquina:', existingSessions[0].id);
    // Retornar a sessão existente em vez de criar uma nova
    const { data: existingSession, error: fetchError } = await supabase
      .from('sessoes')
      .select('*')
      .eq('id', existingSessions[0].id)
      .single();
      
    if (fetchError) {
      console.error('Erro ao buscar sessão existente:', fetchError);
    } else {
      console.log('Retornando sessão existente:', existingSession);
      return existingSession;
    }
  }
  
  // Usar timestamp de Brasília em vez de UTC
  const inicio = getBrasiliaTimestamp();
  console.log('Timestamp de início (Brasília):', inicio);
  console.log('Data/hora de início (Brasília):', new Date(inicio * 1000).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }));
  
  const sessionData = {
    maquina: machineId,
    operador: operatorId,
    inicio,
    turno: turnoId,
    operador_secundario: secondaryOperatorId || null
  };
  
  console.log('Dados da sessão a serem inseridos:', sessionData);
  
  const { data, error } = await supabase
    .from('sessoes')
    .insert(sessionData)
    .select()
    .single();

  if (error) {
    console.error('Erro ao criar sessão:', error);
    throw error;
  }
  
  console.log('Sessão criada com sucesso:', data);
  
  // Resetar e atualizar machine_stats para nova sessão
  console.log('Atualizando machine_stats para máquina:', machineId);
  
  // Primeiro, verificar se já existe um registro para esta máquina
  const { data: existingStats, error: checkStatsError } = await supabase
    .from('machine_stats')
    .select('id_maquina')
    .eq('id_maquina', machineId)
    .single();

  if (checkStatsError && checkStatsError.code !== 'PGRST116') {
    console.error('Erro ao verificar machine_stats existente:', checkStatsError);
  }

  if (existingStats) {
    // Atualizar registro existente
    console.log('Atualizando registro existente de machine_stats');
    console.log('Dados a serem atualizados:', {
      velocidade: 0,
      disponibilidade: 0,
      produzido: 0,
      rejeitos: 0,
      minutos_disponivel: 0,
      minutos_parada: 0,
      producao_teorica: 0,
      desempenho: 0,
      qualidade: 100,
      sessao: data.id,
      status: false,
      oee: 0,
      ultimo_sinal: null,
      id_parada_atual: null,
      id_turno_atual: turnoId,
      fim_turno_atual: null,
      inicio_turno: inicio,
      ligada: true
    });
    
    const { error: updateError } = await supabase
      .from('machine_stats')
      .update({
        velocidade: 0,
        disponibilidade: 0,
        produzido: 0,
        rejeitos: 0,
        minutos_disponivel: 0,
        minutos_parada: 0,
        producao_teorica: 0,
        desempenho: 0,
        qualidade: 100,
        sessao: data.id,
        status: false,
        oee: 0,
        ultimo_sinal: null,
        id_parada_atual: null,
        id_turno_atual: turnoId,
        fim_turno_atual: null,
        inicio_turno: inicio,
        ligada: true
      })
      .eq('id_maquina', machineId);

    if (updateError) {
      console.error('Erro ao atualizar machine_stats existente:', updateError);
      console.error('Detalhes do erro:', {
        code: updateError.code,
        message: updateError.message,
        details: updateError.details,
        hint: updateError.hint
      });
    } else {
      console.log('Machine_stats existente atualizada com sucesso');
      
      // Verificar se a atualização foi realmente aplicada
      const { data: verifyData, error: verifyError } = await supabase
        .from('machine_stats')
        .select('ligada, sessao, id_maquina')
        .eq('id_maquina', machineId)
        .single();
        
      if (verifyError) {
        console.error('Erro ao verificar atualização:', verifyError);
      } else {
        console.log('Verificação da atualização:', verifyData);
        
        // Se a coluna 'ligada' não foi definida como true, forçar a atualização
        if (verifyData.ligada !== true) {
          console.log('Coluna ligada não foi definida como true, forçando atualização...');
          const { error: forceUpdateError } = await supabase
            .from('machine_stats')
            .update({ ligada: true })
            .eq('id_maquina', machineId);
            
          if (forceUpdateError) {
            console.error('Erro ao forçar atualização da coluna ligada:', forceUpdateError);
          } else {
            console.log('Coluna ligada forçada para true com sucesso');
          }
        }
      }
    }
  } else {
    // Criar novo registro
    console.log('Criando novo registro de machine_stats');
    console.log('Dados a serem inseridos:', {
      id_maquina: machineId,
      velocidade: 0,
      disponibilidade: 0,
      produzido: 0,
      rejeitos: 0,
      minutos_disponivel: 0,
      minutos_parada: 0,
      producao_teorica: 0,
      desempenho: 0,
      qualidade: 100,
      sessao: data.id,
      status: false,
      oee: 0,
      ultimo_sinal: null,
      id_parada_atual: null,
      id_turno_atual: turnoId,
      fim_turno_atual: null,
      inicio_turno: inicio,
      ligada: true
    });
    
    const { error: insertError } = await supabase
      .from('machine_stats')
      .insert({
        id_maquina: machineId,
        velocidade: 0,
        disponibilidade: 0,
        produzido: 0,
        rejeitos: 0,
        minutos_disponivel: 0,
        minutos_parada: 0,
        producao_teorica: 0,
        desempenho: 0,
        qualidade: 100,
        sessao: data.id,
        status: false,
        oee: 0,
        ultimo_sinal: null,
        id_parada_atual: null,
        id_turno_atual: turnoId,
        fim_turno_atual: null,
        inicio_turno: inicio,
        ligada: true
      });

    if (insertError) {
      console.error('Erro ao criar novo machine_stats:', insertError);
      console.error('Detalhes do erro:', {
        code: insertError.code,
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint
      });
    } else {
      console.log('Novo machine_stats criado com sucesso');
      
      // Verificar se a inserção foi realmente aplicada
      const { data: verifyData, error: verifyError } = await supabase
        .from('machine_stats')
        .select('ligada, sessao, id_maquina')
        .eq('id_maquina', machineId)
        .single();
        
      if (verifyError) {
        console.error('Erro ao verificar inserção:', verifyError);
      } else {
        console.log('Verificação da inserção:', verifyData);
        
        // Se a coluna 'ligada' não foi definida como true, forçar a atualização
        if (verifyData.ligada !== true) {
          console.log('Coluna ligada não foi definida como true, forçando atualização...');
          const { error: forceUpdateError } = await supabase
            .from('machine_stats')
            .update({ ligada: true })
            .eq('id_maquina', machineId);
            
          if (forceUpdateError) {
            console.error('Erro ao forçar atualização da coluna ligada:', forceUpdateError);
          } else {
            console.log('Coluna ligada forçada para true com sucesso');
          }
        }
      }
    }
  }
  
  // ✅ Store session ID locally (chaves corretas)
  localStorage.setItem(SESSION_ID_KEY, data.id.toString());
  localStorage.setItem(SESSION_ACTIVE_KEY, 'true');
  console.log('ID da sessão armazenado no localStorage:', data.id);
  
  return data;
}

export async function recoverSession(): Promise<Session | null> {
  const sessionId = localStorage.getItem(SESSION_ID_KEY);
  const sessionActive = localStorage.getItem(SESSION_ACTIVE_KEY);
  
  if (!sessionId || sessionActive !== 'true') return null;

  try {
    const { data, error } = await supabase
      .from('sessoes')
      .select('*')
      .eq('id', sessionId)
      .is('fim', null)
      .single();

    if (error || !data) {
      localStorage.removeItem(SESSION_ID_KEY);
      localStorage.removeItem(SESSION_ACTIVE_KEY);
      return null;
    }

    return data;
  } catch (err) {
    console.error('Error recovering session:', err);
    localStorage.removeItem(SESSION_ID_KEY);
    localStorage.removeItem(SESSION_ACTIVE_KEY);
    return null;
  }
}

export async function updateMachineParameters(
  machineId: number,
  operatorId: number,
  sessionId: number,
  childMachines: number[] = []
) {
  const machines = [machineId, ...childMachines];
  
  const updates = machines.map(id => ({
    id_maquina: id,
    operador: operatorId,
    sessao: sessionId
  }));

  const { error } = await supabase
    .from('machine_parameters')
    .upsert(updates, {
      onConflict: 'id_maquina'
    });

  if (error) throw error;
}

export async function endSession(sessionId: number) {
  console.log('=== INÍCIO endSession ===');
  console.log('endSession chamada com sessionId:', sessionId);
  
  if (!sessionId) {
    console.error('sessionId é null ou undefined');
    return;
  }
  
  // Usar timestamp de Brasília em vez de UTC
  const fim = getBrasiliaTimestamp();
  console.log('Timestamp de fim (Brasília):', fim);
  console.log('Data/hora de fim (Brasília):', new Date(fim * 1000).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }));
  
  console.log('Executando UPDATE na tabela sessoes...');
  const { data, error } = await supabase
    .from('sessoes')
    .update({ fim })
    .eq('id', sessionId)
    .select();

  if (error) {
    console.error('Erro ao encerrar sessão:', error);
    throw error;
  }
  
  console.log('Sessão encerrada com sucesso:', data);
  console.log('Número de registros atualizados:', data?.length || 0);

  // ✅ Clear session token (chaves corretas)
  console.log('Removendo token do localStorage...');
  localStorage.removeItem(SESSION_ID_KEY);
  localStorage.removeItem(SESSION_ACTIVE_KEY);
  // Limpar chaves antigas também
  localStorage.removeItem('industrack_session');
  localStorage.removeItem('industrack_active_session');
  console.log('Token da sessão removido do localStorage');

  // Buscar o ID da máquina da sessão para limpar machine_stats e criar encerramento_sessao
  console.log('Buscando ID da máquina da sessão...');
  const { data: sessionData, error: sessionError } = await supabase
    .from('sessoes')
    .select('maquina')
    .eq('id', sessionId)
    .single();

  if (sessionError) {
    console.error('Erro ao buscar dados da sessão para encerramento:', sessionError);
  } else if (sessionData?.maquina) {
    // Limpar machine_stats para a máquina
    console.log('Limpando machine_stats para a máquina...');
    const { error: statsError } = await supabase
      .from('machine_stats')
      .update({
        velocidade: 0,
        disponibilidade: 0,
        produzido: 0,
        rejeitos: 0,
        minutos_disponivel: 0,
        minutos_parada: 0,
        producao_teorica: 0,
        desempenho: 0,
        qualidade: 100,
        sessao: null,
        status: false,
        oee: 0,
        ultimo_sinal: null,
        id_parada_atual: null,
        id_turno_atual: null,
        fim_turno_atual: fim,
        inicio_turno: null,
        ligada: false
      })
      .eq('id_maquina', sessionData.maquina);

    if (statsError) {
      console.error('Erro ao limpar machine_stats:', statsError);
    } else {
      console.log('Machine_stats limpa com sucesso');
    }

    // Criar registro na tabela encerramento_sessao
    console.log('Criando registro na tabela encerramento_sessao...');
    const { data: encerramentoRecord, error: encerramentoError } = await supabase
      .from('encerramento_sessao')
      .insert({
        id_maquina: sessionData.maquina,
        id_sessao: sessionId,
        processado: false,
        hora_processado: null
      })
      .select()
      .single();

    if (encerramentoError) {
      console.error('Erro ao criar registro de encerramento:', encerramentoError);
    } else {
      console.log('Registro de encerramento criado com sucesso:', encerramentoRecord.id);
    }
  } else {
    console.log('Nenhum ID de máquina encontrado na sessão');
  }

  console.log('=== FIM endSession ===');
}