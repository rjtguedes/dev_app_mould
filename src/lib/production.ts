import { supabase } from './supabase';
import type { WeekMachine, WeekMachineGrade } from '../types/production';
import type { Machine } from '../types/machine';

export type ProductionFinishType = 'partial' | 'complete';

interface StationSetup {
  stationNumber: number;
  weekMachineId: number;
  gradeId: number;
}

export interface ProductionUpdate {
  id: number;
  quantidade_produzida: number;
  quantidade_rejeitada: number;
}

export interface RejectUpdate {
  quantidade_rejeitada: number;
  id_grade_semana_maquina: number;
  id_semana_maquina: number;
  id_maquina: number;
}

export async function getChildMachineByStation(parentId: number, stationNumber: number): Promise<number | null> {
  try {
    const { data, error } = await supabase
      .from('Maquinas')
      .select('id_maquina')
      .eq('maquina_pai', parentId)
      .eq('maquina_filha', true)
      .eq('index', stationNumber)
      .single();

    if (error) throw error;
    return data?.id_maquina || null;
  } catch (err) {
    console.error('Error getting child machine:', err);
    return null;
  }
}

export async function startProduction(
  stationSetups: StationSetup[], 
  grades: WeekMachineGrade[], 
  parentMachineId: number,
  operadorId: number,
  sessionId: number
) {
  try {
    // 1. Buscar todas as máquinas filhas da máquina principal
    const { data: childMachines, error: childError } = await supabase
      .from('Maquinas')
      .select('id_maquina, index')
      .eq('maquina_pai', parentMachineId)
      .eq('maquina_filha', true);

    if (childError) throw childError;

    // 2. Para cada setup, atualizar os parâmetros da máquina filha correspondente
    for (const setup of stationSetups) {
      const childMachine = childMachines?.find(m => m.index === setup.stationNumber);
      if (!childMachine) continue;

      const grade = grades.find(g => g.id === setup.gradeId);
      if (!grade) continue;

      // Atualizar machine_parameters
      const { error: paramError } = await supabase
        .from('machine_parameters')
        .upsert({
          id_maquina: childMachine.id_maquina,
          operador: operadorId,
          sessao: sessionId,
          produto: grade.id_produto,
          semana_maquina: setup.weekMachineId,
          grade_semana_maquina: setup.gradeId,
          producao_ativa: true,
          estacoes: [{ numero: setup.stationNumber }]
        });

      if (paramError) throw paramError;

      // Inicializar/Resetar machine_stats
      const { error: statsError } = await supabase
        .from('machine_stats')
        .upsert({
          id_maquina: childMachine.id_maquina,
          velocidade: 0,
          disponibilidade: 100,
          produzido: 0,
          rejeitos: 0,
          minutos_disponivel: 0,
          minutos_parada: 0,
          producao_teorica: 0,
          desempenho: 0,
          qualidade: 0,
          sessao: sessionId,
          ligada: true
        });

      if (statsError) throw statsError;

      // Atualizar status da grade
      const { error: gradeError } = await supabase
        .from('grade_semana_maquina')
        .update({ status: 'em_producao' })
        .eq('id', setup.gradeId);

      if (gradeError) throw gradeError;
    }

  } catch (error) {
    console.error('Error starting production:', error);
    throw error;
  }
}

export async function updateProductionQuantity(
  productionId: number,
  quantity: number,
  rejected: number = 0
) {
  const { error } = await supabase
    .from('producao_maquina_estacao')
    .update({
      quantidade_produzida: quantity,
      quantidade_rejeitada: rejected
    })
    .eq('id', productionId);

  if (error) throw error;
}

export async function finishProduction(
  productionId: number,
  operatorId: number,
  quantities: ProductionUpdate,
  finishType: ProductionFinishType = 'complete',
  debug: boolean = true
) {
  try {
    const now = new Date().toISOString();
    if (debug) {
      console.log('Starting production finalization:', {
        productionId,
        operatorId,
        quantities,
        finishType,
        timestamp: now
      });
    }
    
    // Get current production details
    const { data: currentProduction, error: fetchError } = await supabase
      .from('producao_maquina_estacao')
      .select(`
        id,
        id_maquina,
        id_semana_maquina,
        id_grade_semana_maquina,
        quantidade_produzida,
        quantidade_rejeitada
      `)
      .eq('id', productionId)
      .eq('status', 'em_producao')
      .single();

    if (fetchError) {
      console.error('Error fetching current production:', fetchError);
      throw fetchError;
    }
    
    if (!currentProduction) throw new Error('Production not found or already finished');
    
    if (debug) {
      console.log('Current production details:', currentProduction);
    }

    // Update production status
    const updateData = {
      status: finishType === 'complete' ? 'finalizado' : 'em_producao',
      data_inicio: quantities.data_inicio || now,
      data_fim: finishType === 'complete' ? now : null,
      quantidade_produzida: quantities.quantidade_produzida,
      quantidade_rejeitada: quantities.quantidade_rejeitada || 0,
      id_operador: operatorId
    };
    
    if (debug) {
      console.log('Updating production with:', updateData);
    }

    const { error: updateError } = await supabase
      .from('producao_maquina_estacao')
      .update(updateData)
      .eq('id', productionId);

    if (updateError) {
      console.error('Error updating production:', updateError);
      throw updateError;
    }
    
    if (debug) {
      console.log('Production update successful');
    }

    // Create production history record
    if (finishType === 'complete') {
      if (debug) {
        console.log('Creating production history record');
      }
      
      const { error: historyError } = await supabase
        .from('producao_historico')
        .insert({
          id_producao: productionId,
          quantidade_produzida: quantities.quantidade_produzida,
          quantidade_rejeitada: quantities.quantidade_rejeitada,
          data_inicio: quantities.data_inicio || now,
          data_fim: now,
          id_operador: operatorId,
          metadata: {
            id_maquina: currentProduction.id_maquina,
            id_semana_maquina: currentProduction.id_semana_maquina,
            id_grade_semana_maquina: currentProduction.id_grade_semana_maquina
          }
        });

      if (historyError) {
        console.error('Error creating history record:', historyError);
        throw historyError;
      }

      // Update machine parameters
      const { error: paramError } = await supabase
        .from('machine_parameters')
        .update({
          producao_ativa: false,
          produto: null,
          semana_maquina: null,
          grade_semana_maquina: null
        })
        .eq('id_maquina', currentProduction.id_maquina);

      if (paramError) {
        console.error('Error updating machine parameters:', paramError);
        throw paramError;
      }

      // Update week machine and grade totals
      const { error: weekError } = await supabase
        .from('semana_maquina')
        .update({
          quantidade_produzida: supabase.sql`quantidade_produzida + ${quantities.quantidade_produzida}`,
          quantidade_rejeitada: supabase.sql`quantidade_rejeitada + ${quantities.quantidade_rejeitada}`,
          saldo: supabase.sql`quantidade - (quantidade_produzida + ${quantities.quantidade_produzida})`
        })
        .eq('id', currentProduction.id_semana_maquina);

      if (weekError) {
        console.error('Error updating week machine:', weekError);
        throw weekError;
      }

      const { error: gradeError } = await supabase
        .from('grade_semana_maquina')
        .update({
          quantidade_produzida: supabase.sql`quantidade_produzida + ${quantities.quantidade_produzida}`,
          quantidade_rejeitada: supabase.sql`quantidade_rejeitada + ${quantities.quantidade_rejeitada}`,
          saldo: supabase.sql`quantidade - (quantidade_produzida + ${quantities.quantidade_produzida})`
        })
        .eq('id', currentProduction.id_grade_semana_maquina);

      if (gradeError) {
        console.error('Error updating grade:', gradeError);
        throw gradeError;
      }
      
      if (debug) {
        console.log('Complete finalization successful');
      }
    }
  } catch (err) {
    console.error('Error finishing production:', err);
    throw err;
  }
}

export async function finishBatchProduction(
  gradeIds: number[],
  operatorId: number,
  type: ProductionFinishType = 'partial',
  shouldUpdateWeekMachine: boolean = false,
  machineId: number
) {
  try {
    console.log('Starting finishBatchProduction with gradeIds:', gradeIds);

    // 1. Busca as grades selecionadas
    const { data: grades, error: gradesError } = await supabase
      .from('grade_semana_maquina')
      .select(`
        id,
        quantidade,
        quantidade_produzida,
        status,
        semana_maquina (
          id,
          quantidade,
          quantidade_produzida,
          status,
          ops
        )
      `)
      .in('id', gradeIds);

    if (gradesError) throw gradesError;
    if (!grades || grades.length === 0) throw new Error('Nenhuma grade encontrada');

    console.log('Grades encontradas:', grades);

    // 2. Atualiza cada grade
    for (const grade of grades) {
      // Não marca como produzido o total, mantém o saldo
      const { error: gradeError } = await supabase
        .from('grade_semana_maquina')
        .update({
          status: 'em_producao' // Sempre mantém em produção pois tem saldo
        })
        .eq('id', grade.id);

      if (gradeError) throw gradeError;
    }

    // 3. Registra no histórico
    for (const grade of grades) {
      const now = new Date().toISOString();
      const { error: historyError } = await supabase
        .from('producao_historico')
        .insert({
          quantidade_produzida: grade.quantidade_produzida || 0, // Usa quantidade atual
          quantidade_rejeitada: grade.quantidade_rejeitada || 0,
          data_inicio: now,
          data_fim: now,
          id_operador: operatorId,
          metadata: {
            tipo: type,
            origem: 'finalizacao_batch',
            id_grade: grade.id,
            id_maquina: machineId,
            numero_estacao: grade.numero_estacao,
            saldo_restante: grade.quantidade - (grade.quantidade_produzida || 0)
          }
        });

      if (historyError) {
        console.error('Error inserting history:', historyError);
        throw historyError;
      }
    }

    return true;
  } catch (err) {
    console.error('Error in finishBatchProduction:', err);
    throw new Error(err instanceof Error ? err.message : 'Falha ao finalizar produção');
  }
}

export async function addReject(update: RejectUpdate) {
  try {
    const { error } = await supabase.rpc('add_reject', {
      p_quantidade_rejeitada: update.quantidade_rejeitada,
      p_id_grade_semana_maquina: update.id_grade_semana_maquina,
      p_id_semana_maquina: update.id_semana_maquina,
      p_id_maquina: update.id_maquina
    });

    if (error) throw error;
  } catch (error) {
    console.error('Error adding reject:', error);
    throw error;
  }
}

interface SetupProductionParams {
  semanaId: number;
  machineId: number;
  operadorId: number;
  sessionId: number;
  stationSetups: Array<{
    stationNumber: number;
    gradeId: number;
    matrixId: number;
    machineId: number;
  }>;
}

export async function setupProduction({
  semanaId,
  machineId,
  operadorId,
  sessionId,
  stationSetups
}: SetupProductionParams) {
  if (!stationSetups.length) {
    throw new Error("Nenhuma configuração válida de estação fornecida");
  }

  try {
    // 1. Primeiro, vamos verificar se ainda existem grades pendentes
    const { data: grades } = await supabase
      .from('grade_semana_maquina')
      .select('status')
      .eq('id_semana_maquina', semanaId)
      .eq('status', 'pendente');

    const shouldUpdateWeekStatus = !grades || grades.length === stationSetups.length;

    // 2. Atualizar o status da semana_maquina para 'em_producao' apenas se todas as grades forem iniciadas
    if (shouldUpdateWeekStatus) {
      const { error: weekError } = await supabase
        .from('semana_maquina')
        .update({ 
          status: 'em_producao',
          data_inicio: new Date().toISOString()
        })
        .eq('id', semanaId);

      if (weekError) throw weekError;
    }

    // 3. Atualizar o status das grades selecionadas para 'em_producao'
    const selectedGradeIds = stationSetups.map(setup => setup.gradeId);
    
    const { error: gradesError } = await supabase
      .from('grade_semana_maquina')
      .update({ 
        status: 'em_producao',
        data_inicio: new Date().toISOString()
      })
      .in('id', selectedGradeIds);

    if (gradesError) throw gradesError;

    // 4. Atualizar os parâmetros das máquinas filhas
    for (const setup of stationSetups) {
      // Primeiro, limpar qualquer configuração existente para esta máquina
      await supabase
        .from('machine_parameters')
        .delete()
        .eq('id_maquina', setup.machineId);

      // Depois, inserir a nova configuração
      const { error: paramError } = await supabase
        .from('machine_parameters')
        .insert({
          id_maquina: setup.machineId,
          grade_semana_maquina: setup.gradeId,
          id_matriz: setup.matrixId,
          operador: parseInt(operadorId),
          sessao: sessionId,
          status: 'em_producao',
          data_inicio: new Date().toISOString(),
          producao_ativa: true
        });

      if (paramError) throw paramError;
    }

    return true;
  } catch (error) {
    console.error('Erro ao configurar produção:', error);
    throw error;
  }
}