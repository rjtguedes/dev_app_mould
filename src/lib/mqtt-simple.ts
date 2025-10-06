// Implementação simplificada de MQTT usando WebSocket diretamente
// Esta versão evita problemas de compatibilidade com process.env

import React from 'react';

// Tipos para comandos MQTT
export interface MQTTCommand {
  command: string;
  machineId: number;
  data?: any;
  timestamp: number;
}

export interface MQTTResponse {
  success: boolean;
  message?: string;
  data?: any;
  timestamp: number;
}

// Configurações MQTT simplificadas
const MQTT_CONFIG = {
  host: 'localhost',
  port: 9001,
  protocol: 'ws',
  username: '',
  password: '',
};

// Classe para gerenciar conexão MQTT simplificada
class SimpleMQTTClient {
  private ws: WebSocket | null = null;
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout: number | null = null;
  private subscriptions = new Map<string, (response: MQTTResponse) => void>();

  // Conectar ao broker MQTT via WebSocket
  async connect(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      try {
        console.log('🔌 Conectando ao broker MQTT via WebSocket...');
        
        const wsUrl = `${MQTT_CONFIG.protocol}://${MQTT_CONFIG.host}:${MQTT_CONFIG.port}`;
        this.ws = new WebSocket(wsUrl);
        
        this.ws.onopen = () => {
          console.log('✅ Conectado ao broker MQTT');
          this.isConnected = true;
          this.reconnectAttempts = 0;
          resolve(true);
        };

        this.ws.onerror = (error) => {
          console.error('❌ Erro na conexão MQTT:', error);
          this.isConnected = false;
          reject(error);
        };

        this.ws.onclose = () => {
          console.log('🔌 Conexão MQTT fechada');
          this.isConnected = false;
          this.attemptReconnect();
        };

        this.ws.onmessage = (event) => {
          try {
            const response: MQTTResponse = JSON.parse(event.data);
            console.log('📥 Resposta MQTT recebida:', response);
            
            // Notificar todos os subscribers
            this.subscriptions.forEach((callback) => {
              callback(response);
            });
          } catch (error) {
            console.error('❌ Erro ao processar resposta MQTT:', error);
          }
        };

      } catch (error) {
        console.error('❌ Erro ao conectar MQTT:', error);
        reject(error);
      }
    });
  }

  // Tentar reconectar
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('❌ Máximo de tentativas de reconexão atingido');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    
    console.log(`🔄 Tentativa de reconexão ${this.reconnectAttempts}/${this.maxReconnectAttempts} em ${delay}ms`);
    
    this.reconnectTimeout = window.setTimeout(() => {
      this.connect().catch(() => {
        // Falha na reconexão será tratada pelo attemptReconnect
      });
    }, delay);
  }

  // Desconectar do broker
  disconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      console.log('🔌 Desconectando do broker MQTT...');
      this.ws.close();
      this.ws = null;
      this.isConnected = false;
    }
  }

  // Verificar se está conectado
  isClientConnected(): boolean {
    return this.isConnected && this.ws?.readyState === WebSocket.OPEN;
  }

  // Enviar comando para o backend
  async sendCommand(command: MQTTCommand): Promise<MQTTResponse> {
    if (!this.isClientConnected()) {
      throw new Error('Cliente MQTT não conectado');
    }

    if (!this.ws) {
      throw new Error('WebSocket não disponível');
    }

    const message = JSON.stringify(command);
    
    return new Promise((resolve, reject) => {
      try {
        this.ws!.send(message);
        console.log('📤 Comando MQTT enviado:', command);
        
        resolve({
          success: true,
          message: 'Comando enviado com sucesso',
          timestamp: Date.now()
        });
      } catch (error) {
        console.error('❌ Erro ao enviar comando MQTT:', error);
        reject(error);
      }
    });
  }

  // Escutar respostas do backend
  subscribeToResponses(machineId: number, callback: (response: MQTTResponse) => void): void {
    if (!this.isClientConnected()) {
      console.error('❌ Cliente MQTT não conectado para escutar respostas');
      return;
    }

    const topic = `ihm/responses/${machineId}`;
    this.subscriptions.set(topic, callback);
    console.log('👂 Escutando respostas no tópico:', topic);
  }

  // Cancelar escuta de respostas
  unsubscribeFromResponses(machineId: number): void {
    const topic = `ihm/responses/${machineId}`;
    this.subscriptions.delete(topic);
    console.log('🔇 Cancelada escuta no tópico:', topic);
  }
}

// Instância singleton do cliente MQTT
export const mqttClient = new SimpleMQTTClient();

// Tipos de comandos MQTT suportados
export const MQTT_COMMAND_TYPES = {
  START_PRODUCTION: 'start_production',
  STOP_PRODUCTION: 'stop_production',
  PAUSE_MACHINE: 'pause_machine',
  RESUME_MACHINE: 'resume_machine',
  SET_SPEED: 'set_speed',
  RESET_COUNTERS: 'reset_counters',
  GET_STATUS: 'get_status',
  SET_PARAMETERS: 'set_parameters',
} as const;

// Validação de comandos MQTT
export const validateMQTTCommand = (command: any): boolean => {
  if (!command || typeof command !== 'object') return false;
  if (!command.command || typeof command.command !== 'string') return false;
  if (!command.machineId || typeof command.machineId !== 'number') return false;
  if (!command.timestamp || typeof command.timestamp !== 'number') return false;
  
  const validCommands = Object.values(MQTT_COMMAND_TYPES);
  return validCommands.includes(command.command);
};

// Funções utilitárias para comandos específicos
export const MQTTCommands = {
  startProduction: (machineId: number, data: any): MQTTCommand => ({
    command: MQTT_COMMAND_TYPES.START_PRODUCTION,
    machineId,
    data,
    timestamp: Date.now()
  }),

  stopProduction: (machineId: number): MQTTCommand => ({
    command: MQTT_COMMAND_TYPES.STOP_PRODUCTION,
    machineId,
    timestamp: Date.now()
  }),

  pauseMachine: (machineId: number, reason?: string): MQTTCommand => ({
    command: MQTT_COMMAND_TYPES.PAUSE_MACHINE,
    machineId,
    data: { reason },
    timestamp: Date.now()
  }),

  resumeMachine: (machineId: number): MQTTCommand => ({
    command: MQTT_COMMAND_TYPES.RESUME_MACHINE,
    machineId,
    timestamp: Date.now()
  }),

  setSpeed: (machineId: number, speed: number): MQTTCommand => ({
    command: MQTT_COMMAND_TYPES.SET_SPEED,
    machineId,
    data: { speed },
    timestamp: Date.now()
  }),

  resetCounters: (machineId: number): MQTTCommand => ({
    command: MQTT_COMMAND_TYPES.RESET_COUNTERS,
    machineId,
    timestamp: Date.now()
  }),

  getStatus: (machineId: number): MQTTCommand => ({
    command: MQTT_COMMAND_TYPES.GET_STATUS,
    machineId,
    timestamp: Date.now()
  }),

  setParameters: (machineId: number, parameters: Record<string, any>): MQTTCommand => ({
    command: MQTT_COMMAND_TYPES.SET_PARAMETERS,
    machineId,
    data: { parameters },
    timestamp: Date.now()
  })
};

// Hook para usar MQTT no React
export const useMQTT = (machineId: number) => {
  const [isConnected, setIsConnected] = React.useState(false);
  const [lastResponse, setLastResponse] = React.useState<MQTTResponse | null>(null);

  React.useEffect(() => {
    const connectMQTT = async () => {
      try {
        const connected = await mqttClient.connect();
        setIsConnected(connected);
        
        if (connected) {
          mqttClient.subscribeToResponses(machineId, (response) => {
            setLastResponse(response);
          });
        }
      } catch (error) {
        console.error('Erro ao conectar MQTT:', error);
        setIsConnected(false);
      }
    };

    connectMQTT();

    return () => {
      mqttClient.unsubscribeFromResponses(machineId);
      mqttClient.disconnect();
    };
  }, [machineId]);

  const sendCommand = async (command: MQTTCommand): Promise<MQTTResponse> => {
    return await mqttClient.sendCommand(command);
  };

  return {
    isConnected,
    lastResponse,
    sendCommand
  };
};
