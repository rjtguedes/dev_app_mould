// Configurações do MQTT para o sistema IHM Mould
export const MQTT_CONFIG = {
  // Configurações do broker
  broker: {
    host: (import.meta.env.VITE_MQTT_HOST as string) || 'localhost',
    port: parseInt((import.meta.env.VITE_MQTT_PORT as string) || '9001'),
    protocol: 'ws' as const,
    clientId: `ihm_mould_${Math.random().toString(16).substr(2, 8)}`,
    clean: true,
    reconnectPeriod: 5000,
    connectTimeout: 30 * 1000,
    username: (import.meta.env.VITE_MQTT_USERNAME as string) || '',
    password: (import.meta.env.VITE_MQTT_PASSWORD as string) || '',
  },

  // Tópicos MQTT
  topics: {
    // Comandos enviados para o backend
    commands: (machineId: number) => `ihm/commands/${machineId}`,
    
    // Respostas recebidas do backend
    responses: (machineId: number) => `ihm/responses/${machineId}`,
    
    // Status geral das máquinas
    status: (machineId: number) => `ihm/status/${machineId}`,
    
    // Dados de telemetria
    telemetry: (machineId: number) => `ihm/telemetry/${machineId}`,
    
    // Alertas e notificações
    alerts: (machineId: number) => `ihm/alerts/${machineId}`,
  },

  // Configurações de QoS
  qos: {
    commands: 1, // Pelo menos uma vez
    responses: 1, // Pelo menos uma vez
    status: 0, // Máximo uma vez
    telemetry: 0, // Máximo uma vez
  },

  // Configurações de reconexão
  reconnection: {
    maxAttempts: 5,
    initialDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 2,
  },

  // Configurações de heartbeat
  heartbeat: {
    interval: 30000, // 30 segundos
    timeout: 10000, // 10 segundos
  }
};

// Tipos de comandos MQTT suportados
export const MQTT_COMMAND_TYPES = {
  // Controle de produção
  START_PRODUCTION: 'start_production',
  STOP_PRODUCTION: 'stop_production',
  PAUSE_PRODUCTION: 'pause_production',
  RESUME_PRODUCTION: 'resume_production',
  
  // Controle de máquina
  START_MACHINE: 'start_machine',
  STOP_MACHINE: 'stop_machine',
  PAUSE_MACHINE: 'pause_machine',
  RESUME_MACHINE: 'resume_machine',
  
  // Configurações
  SET_SPEED: 'set_speed',
  SET_PARAMETERS: 'set_parameters',
  RESET_COUNTERS: 'reset_counters',
  
  // Status e monitoramento
  GET_STATUS: 'get_status',
  GET_TELEMETRY: 'get_telemetry',
  PING: 'ping',
  
  // Manutenção
  CALIBRATE: 'calibrate',
  DIAGNOSTIC: 'diagnostic',
  MAINTENANCE: 'maintenance',
} as const;

// Configurações específicas por tipo de máquina
export const MACHINE_MQTT_CONFIG = {
  // Máquinas EVA (multipostos)
  EVA: {
    supportsSpeedControl: true,
    supportsParameterControl: true,
    supportsCounterReset: true,
    maxSpeed: 200,
    minSpeed: 0,
    defaultSpeed: 100,
  },
  
  // Máquinas tradicionais
  TRADITIONAL: {
    supportsSpeedControl: true,
    supportsParameterControl: false,
    supportsCounterReset: true,
    maxSpeed: 150,
    minSpeed: 0,
    defaultSpeed: 80,
  },
  
  // Máquinas de teste
  TEST: {
    supportsSpeedControl: false,
    supportsParameterControl: false,
    supportsCounterReset: false,
    maxSpeed: 100,
    minSpeed: 0,
    defaultSpeed: 50,
  }
} as const;

// Validação de comandos MQTT
export const validateMQTTCommand = (command: any): boolean => {
  if (!command || typeof command !== 'object') return false;
  if (!command.command || typeof command.command !== 'string') return false;
  if (!command.machineId || typeof command.machineId !== 'number') return false;
  if (!command.timestamp || typeof command.timestamp !== 'number') return false;
  
  // Verificar se o comando é válido
  const validCommands = Object.values(MQTT_COMMAND_TYPES);
  if (!validCommands.includes(command.command)) return false;
  
  return true;
};

// Geração de client ID único
export const generateClientId = (): string => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 5);
  return `ihm_mould_${timestamp}_${random}`;
};

