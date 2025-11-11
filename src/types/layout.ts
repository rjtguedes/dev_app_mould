// 🖥️ Tipos para configuração de layout/telas

export type LayoutType = 'default' | 'eva_16_stations' | 'rotativas';

export interface LayoutConfig {
  type: LayoutType;
  machineId: number;
  machineName: string;
  timestamp: number;
}

export interface LayoutStorageManager {
  getLayout(machineId: number): LayoutConfig | null;
  saveLayout(config: LayoutConfig): void;
  clearLayout(machineId: number): void;
}

