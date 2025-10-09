/**
 * Sistema de Armazenamento Local para Dados WebSocket
 * 
 * Este módulo gerencia o armazenamento local de dados recebidos via WebSocket,
 * incluindo valores das estações, histórico de mensagens e cache de dados.
 */

export interface StationData {
  id_maquina: number;
  nome: string;
  sinais: number;
  rejeitos: number;
  sinais_validos: number;
  tempo_decorrido_segundos: number;
  tempo_paradas_segundos: number;
  tempo_valido_segundos: number;
  last_update: number;
  parent_machine_id?: number;
}

export interface WebSocketMessage {
  type: string;
  target_machine_id: number;
  source_machine_id?: number;
  machine_data?: any;
  additional_data?: any;
  timestamp: number;
  raw_message: any;
}

export interface StorageStats {
  total_messages: number;
  stations_count: number;
  last_update: number;
  memory_usage: number;
}

class WebSocketStorage {
  private stations: Map<number, StationData> = new Map();
  private messages: WebSocketMessage[] = [];
  private maxMessages: number = 1000; // Limite de mensagens em memória
  private maxAge: number = 24 * 60 * 60 * 1000; // 24 horas em ms

  constructor() {
    this.loadFromLocalStorage();
    this.setupCleanupInterval();
  }

  /**
   * Armazena dados de uma estação
   */
  storeStationData(stationData: StationData): void {
    const now = Date.now();
    
    // Atualizar ou criar dados da estação
    const existingData = this.stations.get(stationData.id_maquina);
    const updatedData: StationData = {
      ...existingData,
      ...stationData,
      last_update: now
    };

    this.stations.set(stationData.id_maquina, updatedData);
    
    console.log(`💾 [Storage] Dados da estação ${stationData.nome} (ID: ${stationData.id_maquina}) armazenados:`, {
      sinais: updatedData.sinais,
      rejeitos: updatedData.rejeitos,
      timestamp: new Date(now).toLocaleTimeString()
    });

    this.saveToLocalStorage();
  }

  /**
   * Recupera dados de uma estação específica
   */
  getStationData(stationId: number): StationData | null {
    const data = this.stations.get(stationId);
    if (data && this.isDataFresh(data.last_update)) {
      return data;
    }
    return null;
  }

  /**
   * Recupera dados de todas as estações de uma máquina pai
   */
  getStationsByParent(parentMachineId: number): StationData[] {
    const stations: StationData[] = [];
    
    for (const [stationId, data] of this.stations.entries()) {
      if (data.parent_machine_id === parentMachineId && this.isDataFresh(data.last_update)) {
        stations.push(data);
      }
    }

    return stations.sort((a, b) => a.nome.localeCompare(b.nome));
  }

  /**
   * Armazena uma mensagem WebSocket
   */
  storeMessage(message: WebSocketMessage): void {
    this.messages.push(message);
    
    // Manter apenas as últimas mensagens
    if (this.messages.length > this.maxMessages) {
      this.messages = this.messages.slice(-this.maxMessages);
    }

    console.log(`📨 [Storage] Mensagem WebSocket armazenada:`, {
      type: message.type,
      target_machine: message.target_machine_id,
      timestamp: new Date(message.timestamp * 1000).toLocaleTimeString()
    });
  }

  /**
   * Recupera mensagens por tipo
   */
  getMessagesByType(type: string, limit: number = 50): WebSocketMessage[] {
    return this.messages
      .filter(msg => msg.type === type)
      .slice(-limit)
      .reverse();
  }

  /**
   * Recupera mensagens de uma máquina específica
   */
  getMessagesByMachine(machineId: number, limit: number = 50): WebSocketMessage[] {
    return this.messages
      .filter(msg => msg.target_machine_id === machineId || msg.source_machine_id === machineId)
      .slice(-limit)
      .reverse();
  }

  /**
   * Atualiza dados de uma estação a partir de uma mensagem WebSocket
   */
  updateStationFromMessage(message: WebSocketMessage): void {
    if (!message.machine_data?.sessao_operador) {
      return;
    }

    const sessaoData = message.machine_data.sessao_operador;
    const stationData: StationData = {
      id_maquina: message.source_machine_id || message.target_machine_id,
      nome: message.machine_data.nome || `Estação ${message.source_machine_id || message.target_machine_id}`,
      sinais: sessaoData.sinais || 0,
      rejeitos: sessaoData.rejeitos || 0,
      sinais_validos: sessaoData.sinais_validos || 0,
      tempo_decorrido_segundos: sessaoData.tempo_decorrido_segundos || 0,
      tempo_paradas_segundos: sessaoData.tempo_paradas_segundos || 0,
      tempo_valido_segundos: sessaoData.tempo_valido_segundos || 0,
      parent_machine_id: message.target_machine_id !== message.source_machine_id ? message.target_machine_id : undefined
    };

    this.storeStationData(stationData);
  }

  /**
   * Obtém estatísticas do armazenamento
   */
  getStats(): StorageStats {
    const now = Date.now();
    let freshStations = 0;
    
    for (const data of this.stations.values()) {
      if (this.isDataFresh(data.last_update)) {
        freshStations++;
      }
    }

    return {
      total_messages: this.messages.length,
      stations_count: freshStations,
      last_update: now,
      memory_usage: this.calculateMemoryUsage()
    };
  }

  /**
   * Limpa dados antigos
   */
  cleanup(): void {
    const now = Date.now();
    let cleanedStations = 0;
    let cleanedMessages = 0;

    // Limpar estações antigas
    for (const [stationId, data] of this.stations.entries()) {
      if (!this.isDataFresh(data.last_update)) {
        this.stations.delete(stationId);
        cleanedStations++;
      }
    }

    // Limpar mensagens antigas
    const cutoffTime = now - this.maxAge;
    const initialLength = this.messages.length;
    this.messages = this.messages.filter(msg => msg.timestamp * 1000 > cutoffTime);
    cleanedMessages = initialLength - this.messages.length;

    if (cleanedStations > 0 || cleanedMessages > 0) {
      console.log(`🧹 [Storage] Limpeza realizada:`, {
        stations_removidas: cleanedStations,
        mensagens_removidas: cleanedMessages
      });
      this.saveToLocalStorage();
    }
  }

  /**
   * Salva dados no localStorage
   */
  private saveToLocalStorage(): void {
    try {
      const data = {
        stations: Array.from(this.stations.entries()),
        messages: this.messages.slice(-100), // Salvar apenas últimas 100 mensagens
        timestamp: Date.now()
      };
      
      localStorage.setItem('websocket_storage', JSON.stringify(data));
    } catch (error) {
      console.warn('⚠️ [Storage] Erro ao salvar no localStorage:', error);
    }
  }

  /**
   * Carrega dados do localStorage
   */
  private loadFromLocalStorage(): void {
    try {
      const stored = localStorage.getItem('websocket_storage');
      if (!stored) return;

      const data = JSON.parse(stored);
      
      // Carregar estações
      if (data.stations) {
        this.stations = new Map(data.stations);
      }

      // Carregar mensagens
      if (data.messages) {
        this.messages = data.messages;
      }

      console.log(`📂 [Storage] Dados carregados do localStorage:`, {
        stations: this.stations.size,
        messages: this.messages.length
      });
    } catch (error) {
      console.warn('⚠️ [Storage] Erro ao carregar do localStorage:', error);
    }
  }

  /**
   * Verifica se os dados ainda são válidos (não muito antigos)
   */
  private isDataFresh(timestamp: number): boolean {
    const now = Date.now();
    const age = now - timestamp;
    return age < this.maxAge;
  }

  /**
   * Calcula uso aproximado de memória
   */
  private calculateMemoryUsage(): number {
    const jsonString = JSON.stringify({
      stations: Array.from(this.stations.entries()),
      messages: this.messages
    });
    
    return new Blob([jsonString]).size;
  }

  /**
   * Configura limpeza automática a cada hora
   */
  private setupCleanupInterval(): void {
    setInterval(() => {
      this.cleanup();
    }, 60 * 60 * 1000); // 1 hora
  }

  /**
   * Limpa todo o armazenamento
   */
  clear(): void {
    this.stations.clear();
    this.messages = [];
    localStorage.removeItem('websocket_storage');
    console.log('🗑️ [Storage] Armazenamento limpo completamente');
  }

  /**
   * Exporta dados para debug
   */
  exportData(): any {
    return {
      stations: Array.from(this.stations.entries()),
      messages: this.messages,
      stats: this.getStats(),
      timestamp: Date.now()
    };
  }
}

// Instância singleton
export const webSocketStorage = new WebSocketStorage();

// Hook para usar o storage em componentes React
export function useWebSocketStorage() {
  return {
    storeStationData: webSocketStorage.storeStationData.bind(webSocketStorage),
    getStationData: webSocketStorage.getStationData.bind(webSocketStorage),
    getStationsByParent: webSocketStorage.getStationsByParent.bind(webSocketStorage),
    storeMessage: webSocketStorage.storeMessage.bind(webSocketStorage),
    getMessagesByType: webSocketStorage.getMessagesByType.bind(webSocketStorage),
    getMessagesByMachine: webSocketStorage.getMessagesByMachine.bind(webSocketStorage),
    updateStationFromMessage: webSocketStorage.updateStationFromMessage.bind(webSocketStorage),
    getStats: webSocketStorage.getStats.bind(webSocketStorage),
    clear: webSocketStorage.clear.bind(webSocketStorage),
    exportData: webSocketStorage.exportData.bind(webSocketStorage)
  };
}
