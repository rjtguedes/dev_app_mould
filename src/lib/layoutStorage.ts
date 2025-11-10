// 💾 Gerenciamento de Layout de Telas no LocalStorage

import type { LayoutConfig, LayoutType } from '../types/layout';

const STORAGE_KEY_PREFIX = 'industrack_layout_';

class LayoutStorageManager {
  
  /**
   * Obtém a configuração de layout salva para uma máquina
   */
  getLayout(machineId: number): LayoutConfig | null {
    try {
      const key = `${STORAGE_KEY_PREFIX}${machineId}`;
      const stored = localStorage.getItem(key);
      
      if (!stored) return null;
      
      const config: LayoutConfig = JSON.parse(stored);
      console.log(`📖 Layout carregado para máquina ${machineId}:`, config.type);
      
      return config;
    } catch (error) {
      console.error('❌ Erro ao carregar layout:', error);
      return null;
    }
  }
  
  /**
   * Salva a configuração de layout para uma máquina
   */
  saveLayout(config: LayoutConfig): void {
    try {
      const key = `${STORAGE_KEY_PREFIX}${config.machineId}`;
      localStorage.setItem(key, JSON.stringify(config));
      console.log(`💾 Layout salvo para máquina ${config.machineId}:`, config.type);
    } catch (error) {
      console.error('❌ Erro ao salvar layout:', error);
    }
  }
  
  /**
   * Remove a configuração de layout de uma máquina
   */
  clearLayout(machineId: number): void {
    try {
      const key = `${STORAGE_KEY_PREFIX}${machineId}`;
      localStorage.removeItem(key);
      console.log(`🗑️ Layout removido para máquina ${machineId}`);
    } catch (error) {
      console.error('❌ Erro ao remover layout:', error);
    }
  }
  
  /**
   * Obtém o tipo de layout padrão baseado no nome da máquina
   */
  getDefaultLayoutType(machineName: string): LayoutType {
    const nameLower = machineName.toLowerCase();
    
    // Detectar automaticamente layout EVA 16 estações
    if (nameLower.includes('eva') && nameLower.includes('2')) {
      return 'eva_16_stations';
    }
    
    return 'default';
  }
}

export const layoutStorage = new LayoutStorageManager();

