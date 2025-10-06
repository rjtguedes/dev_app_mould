// Importar polyfill primeiro para resolver problemas de compatibilidade
import './mqtt-polyfill';
import mqtt, { MqttClient } from 'mqtt';
import React from 'react';
import { MQTT_CONFIG, MQTT_COMMAND_TYPES, validateMQTTCommand, generateClientId } from '../config/mqtt';

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

// Classe para gerenciar conexão MQTT
class MQTTClient {
  private client: MqttClient | null = null;
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  // Conectar ao broker MQTT
  async connect(): Promise<boolean> {
    try {
      console.log('🔌 Conectando ao broker MQTT...');
      
      const config = {
        ...MQTT_CONFIG.broker,
        clientId: generateClientId()
      };
      
      this.client = mqtt.connect(config);
      
      return new Promise((resolve, reject) => {
        if (!this.client) {
          reject(new Error('Cliente MQTT não inicializado'));
          return;
        }

        this.client.on('connect', () => {
          console.log('✅ Conectado ao broker MQTT');
          this.isConnected = true;
          this.reconnectAttempts = 0;
          resolve(true);
        });

        this.client.on('error', (error) => {
          console.error('❌ Erro na conexão MQTT:', error);
          this.isConnected = false;
          reject(error);
        });

        this.client.on('reconnect', () => {
          console.log('🔄 Reconectando ao broker MQTT...');
          this.reconnectAttempts++;
        });

        this.client.on('close', () => {
          console.log('🔌 Conexão MQTT fechada');
          this.isConnected = false;
        });

        this.client.on('offline', () => {
          console.log('📴 Cliente MQTT offline');
          this.isConnected = false;
        });
      });
    } catch (error) {
      console.error('❌ Erro ao conectar MQTT:', error);
      return false;
    }
  }

  // Desconectar do broker
  disconnect(): void {
    if (this.client) {
      console.log('🔌 Desconectando do broker MQTT...');
      this.client.end();
      this.client = null;
      this.isConnected = false;
    }
  }

  // Verificar se está conectado
  isClientConnected(): boolean {
    return this.isConnected && this.client?.connected === true;
  }

  // Enviar comando para o backend
  async sendCommand(command: MQTTCommand): Promise<MQTTResponse> {
    if (!this.isClientConnected()) {
      throw new Error('Cliente MQTT não conectado');
    }

    // Validar comando antes de enviar
    if (!validateMQTTCommand(command)) {
      throw new Error('Comando MQTT inválido');
    }

    const topic = MQTT_CONFIG.topics.commands(command.machineId);
    const message = JSON.stringify(command);

    return new Promise((resolve, reject) => {
      if (!this.client) {
        reject(new Error('Cliente MQTT não disponível'));
        return;
      }

      // Publicar comando
      this.client.publish(topic, message, { qos: 1 }, (error) => {
        if (error) {
          console.error('❌ Erro ao enviar comando MQTT:', error);
          reject(error);
        } else {
          console.log('📤 Comando MQTT enviado:', command);
          resolve({
            success: true,
            message: 'Comando enviado com sucesso',
            timestamp: Date.now()
          });
        }
      });
    });
  }

  // Escutar respostas do backend
  subscribeToResponses(machineId: number, callback: (response: MQTTResponse) => void): void {
    if (!this.isClientConnected()) {
      console.error('❌ Cliente MQTT não conectado para escutar respostas');
      return;
    }

    const topic = MQTT_CONFIG.topics.responses(machineId);
    
    if (!this.client) {
      console.error('❌ Cliente MQTT não disponível para escutar respostas');
      return;
    }

    this.client.subscribe(topic, { qos: 1 }, (error) => {
      if (error) {
        console.error('❌ Erro ao subscrever no tópico MQTT:', error);
      } else {
        console.log('👂 Escutando respostas no tópico:', topic);
      }
    });

    this.client.on('message', (receivedTopic, message) => {
      if (receivedTopic === topic) {
        try {
          const response: MQTTResponse = JSON.parse(message.toString());
          console.log('📥 Resposta MQTT recebida:', response);
          callback(response);
        } catch (error) {
          console.error('❌ Erro ao processar resposta MQTT:', error);
        }
      }
    });
  }

  // Cancelar escuta de respostas
  unsubscribeFromResponses(machineId: number): void {
    if (!this.isClientConnected() || !this.client) {
      return;
    }

    const topic = MQTT_CONFIG.topics.responses(machineId);
    this.client.unsubscribe(topic, (error) => {
      if (error) {
        console.error('❌ Erro ao cancelar escuta MQTT:', error);
      } else {
        console.log('🔇 Cancelada escuta no tópico:', topic);
      }
    });
  }
}

// Instância singleton do cliente MQTT
export const mqttClient = new MQTTClient();

// Funções utilitárias para comandos específicos
export const MQTTCommands = {
  // Comando para iniciar produção
  startProduction: (machineId: number, data: any): MQTTCommand => ({
    command: MQTT_COMMAND_TYPES.START_PRODUCTION,
    machineId,
    data,
    timestamp: Date.now()
  }),

  // Comando para parar produção
  stopProduction: (machineId: number): MQTTCommand => ({
    command: MQTT_COMMAND_TYPES.STOP_PRODUCTION,
    machineId,
    timestamp: Date.now()
  }),

  // Comando para pausar máquina
  pauseMachine: (machineId: number, reason?: string): MQTTCommand => ({
    command: MQTT_COMMAND_TYPES.PAUSE_MACHINE,
    machineId,
    data: { reason },
    timestamp: Date.now()
  }),

  // Comando para retomar máquina
  resumeMachine: (machineId: number): MQTTCommand => ({
    command: MQTT_COMMAND_TYPES.RESUME_MACHINE,
    machineId,
    timestamp: Date.now()
  }),

  // Comando para ajustar velocidade
  setSpeed: (machineId: number, speed: number): MQTTCommand => ({
    command: MQTT_COMMAND_TYPES.SET_SPEED,
    machineId,
    data: { speed },
    timestamp: Date.now()
  }),

  // Comando para resetar contadores
  resetCounters: (machineId: number): MQTTCommand => ({
    command: MQTT_COMMAND_TYPES.RESET_COUNTERS,
    machineId,
    timestamp: Date.now()
  }),

  // Comando para obter status da máquina
  getStatus: (machineId: number): MQTTCommand => ({
    command: MQTT_COMMAND_TYPES.GET_STATUS,
    machineId,
    timestamp: Date.now()
  }),

  // Comando para configurar parâmetros
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
          // Escutar respostas para esta máquina
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
