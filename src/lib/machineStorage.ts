// 💾 Gerenciamento de Máquinas no LocalStorage

import type { Machine } from '../types/machine';
import { apiService } from '../services/apiService';

const STORAGE_KEYS = {
  CURRENT_MACHINE: 'ihm_current_machine',
  MACHINES_LIST: 'ihm_machines_list',
  MACHINES_LAST_UPDATE: 'ihm_machines_last_update'
} as const;

// Tempo de cache em milissegundos (30 minutos)
const CACHE_DURATION = 30 * 60 * 1000;

export class MachineStorage {
  
  /**
   * Salva a máquina atual no localStorage
   */
  saveCurrentMachine(machine: Machine): void {
    try {
      localStorage.setItem(STORAGE_KEYS.CURRENT_MACHINE, JSON.stringify(machine));
      console.log(`💾 Máquina salva no localStorage:`, machine.nome);
    } catch (error) {
      console.error('❌ Erro ao salvar máquina no localStorage:', error);
    }
  }

  /**
   * Carrega a máquina atual do localStorage
   */
  getCurrentMachine(): Machine | null {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.CURRENT_MACHINE);
      if (!stored) return null;
      
      const machine: Machine = JSON.parse(stored);
      console.log(`📖 Máquina carregada do localStorage:`, machine.nome);
      return machine;
    } catch (error) {
      console.error('❌ Erro ao carregar máquina do localStorage:', error);
      return null;
    }
  }

  /**
   * Remove a máquina atual do localStorage
   */
  clearCurrentMachine(): void {
    try {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_MACHINE);
      console.log(`🗑️ Máquina atual removida do localStorage`);
    } catch (error) {
      console.error('❌ Erro ao remover máquina do localStorage:', error);
    }
  }

  /**
   * Salva lista de máquinas no cache local
   */
  private saveMachinesCache(machines: Machine[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.MACHINES_LIST, JSON.stringify(machines));
      localStorage.setItem(STORAGE_KEYS.MACHINES_LAST_UPDATE, Date.now().toString());
      console.log(`💾 Cache de máquinas atualizado:`, machines.length, 'máquinas');
    } catch (error) {
      console.error('❌ Erro ao salvar cache de máquinas:', error);
    }
  }

  /**
   * Carrega lista de máquinas do cache local
   */
  private getCachedMachines(): { machines: Machine[]; isExpired: boolean } {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.MACHINES_LIST);
      const lastUpdate = localStorage.getItem(STORAGE_KEYS.MACHINES_LAST_UPDATE);
      
      if (!stored || !lastUpdate) {
        return { machines: [], isExpired: true };
      }

      const machines: Machine[] = JSON.parse(stored);
      const isExpired = Date.now() - parseInt(lastUpdate) > CACHE_DURATION;
      
      console.log(`📖 Cache de máquinas carregado:`, machines.length, 'máquinas', isExpired ? '(expirado)' : '(válido)');
      
      return { machines, isExpired };
    } catch (error) {
      console.error('❌ Erro ao carregar cache de máquinas:', error);
      return { machines: [], isExpired: true };
    }
  }

  /**
   * Busca lista de máquinas (cache ou API)
   */
  async fetchMachines(forceRefresh: boolean = false): Promise<Machine[]> {
    try {
      // Verificar cache primeiro (se não forçar atualização)
      if (!forceRefresh) {
        const { machines, isExpired } = this.getCachedMachines();
        if (machines.length > 0 && !isExpired) {
          return machines;
        }
      }

      console.log(`🔄 Buscando máquinas da API...`);
      
      // Buscar da API (todas as máquinas, não apenas ativas)
      const response = await apiService.listarMaquinas();
      
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Erro ao buscar máquinas');
      }

      // ✅ FILTRAR: Apenas máquinas principais (não filhas) para tablet IHM
      const allMachines = response.data;
      const machines = allMachines.filter(machine => !machine.maquina_filha);
      
      console.log(`🔍 Filtro aplicado: ${machines.length} máquinas principais (maquina_filha=false) de ${allMachines.length} total`);
      console.log('📋 Máquinas filtradas:', machines.map(m => `${m.id_maquina}: ${m.nome} (filha: ${m.maquina_filha})`));
      
      // Salvar no cache (apenas máquinas principais)
      this.saveMachinesCache(machines);
      
      console.log(`✅ Máquinas carregadas da API:`, machines.length, 'máquinas');
      return machines;
      
    } catch (error) {
      console.error('❌ Erro ao buscar máquinas:', error);
      
      // Em caso de erro, tentar usar cache mesmo que expirado
      const { machines } = this.getCachedMachines();
      if (machines.length > 0) {
        console.warn(`⚠️ Usando cache expirado:`, machines.length, 'máquinas');
        return machines;
      }
      
      throw error;
    }
  }

  /**
   * Verifica se precisa atualizar máquinas
   */
  async ensureMachineId(): Promise<Machine | null> {
    try {
      // 1. Verificar se já tem máquina salva
      const currentMachine = this.getCurrentMachine();
      if (currentMachine?.id_maquina) {
        console.log(`✅ Máquina já configurada:`, currentMachine.nome);
        return currentMachine;
      }

      console.log(`📋 Nenhuma máquina configurada. Buscando lista de máquinas...`);
      
      // 2. Buscar lista de máquinas
      const machines = await this.fetchMachines();
      
      if (machines.length === 0) {
        console.warn(`⚠️ Nenhuma máquina encontrada`);
        return null;
      }

      // 3. Se só tem uma máquina, selecionar automaticamente
      if (machines.length === 1) {
        const machine = machines[0];
        this.saveCurrentMachine(machine);
        console.log(`✅ Máquina selecionada automaticamente:`, machine.nome);
        return machine;
      }

      // 4. Múltiplas máquinas - usuário deve escolher
      console.log(`📋 Múltiplas máquinas encontradas (${machines.length}). Usuário deve escolher.`);
      return null;
      
    } catch (error) {
      console.error('❌ Erro ao garantir ID da máquina:', error);
      throw error;
    }
  }

  /**
   * Limpar todos os dados de máquinas
   */
  clearAll(): void {
    try {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_MACHINE);
      localStorage.removeItem(STORAGE_KEYS.MACHINES_LIST);
      localStorage.removeItem(STORAGE_KEYS.MACHINES_LAST_UPDATE);
      console.log(`🗑️ Todos os dados de máquinas removidos do localStorage`);
    } catch (error) {
      console.error('❌ Erro ao limpar dados de máquinas:', error);
    }
  }
}

// Exportar instância singleton
export const machineStorage = new MachineStorage();
