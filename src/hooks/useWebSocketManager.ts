import type { 
  WebSocketCommandNew, 
  WebSocketEventNew, 
  WebSocketResponse,
  WebSocketErrorResponse,
  ConnectionEvent,
  MachineUpdateEvent,
  SubscribeCommand,
  UnsubscribeCommand,
  IniciarSessaoOperadorCommand,
  FinalizarSessaoOperadorCommand,
  IniciarProducaoMapaCommand,
  FinalizarProducaoMapaParcialCommand,
  FinalizarProducaoMapaCompletaCommand,
  AdicionarRejeitosCommand,
  ConsultarMaquinaCommand,
  ConsultarSessaoCommand,
  ConsultarProducaoMapaCommand
} from '../types/websocket-new';
import { DEFAULT_WS_CONFIG } from '../types/websocket-new';

// Classe singleton para gerenciar conexão WebSocket
class WebSocketManager {
  private static instance: WebSocketManager;
  private ws: WebSocket | null = null;
  private subscribedMachines: Set<number> = new Set();
  private url: string = DEFAULT_WS_CONFIG.url;
  private listeners: Map<string, Set<(data: any) => void>> = new Map();
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private reconnectAttempts: number = 0;
  private shouldReconnect: boolean = true;
  private readonly MAX_RECONNECT_ATTEMPTS = DEFAULT_WS_CONFIG.reconnectAttempts;
  private readonly BASE_RECONNECT_INTERVAL = DEFAULT_WS_CONFIG.reconnectInterval;
  private readonly MAX_RECONNECT_INTERVAL = 60000;
  
  private constructor() {
    // Singleton - construtor privado
  }
  
  // Obter instância única
  public static getInstance(): WebSocketManager {
    if (!WebSocketManager.instance) {
      WebSocketManager.instance = new WebSocketManager();
    }
    return WebSocketManager.instance;
  }
  
  // Conectar ao WebSocket (nova documentação - conexão direta)
  public connect(shouldReconnect: boolean = true): void {
    // Se já estiver conectado, não fazer nada
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log('🔌 WebSocketManager: Já conectado');
      return;
    }
    
    // Armazenar configuração de reconexão
    this.shouldReconnect = shouldReconnect;
    
    // Conectar ao WebSocket (nova documentação - sem parâmetros na URL)
    try {
      console.log(`🔌 WebSocketManager: Conectando a ${this.url}`);
      console.log(`🌐 WebSocketManager: IP: 192.168.1.76, Porta: 8765`);
      this.ws = new WebSocket(this.url);
      
      // Configurar handlers
      this.ws.onopen = this.handleOpen.bind(this);
      this.ws.onmessage = this.handleMessage.bind(this);
      this.ws.onclose = this.handleClose.bind(this);
      this.ws.onerror = this.handleError.bind(this);
    } catch (error) {
      console.error('❌ WebSocketManager: Erro ao criar WebSocket:', error);
      console.log('⚠️ WebSocketManager: Continuando sem WebSocket (modo offline)');
    }
  }
  
  // Desconectar do WebSocket
  public disconnect(): void {
    if (!this.ws) return;
    
    console.log('🔌 WebSocketManager: Desconectando...');
    
    // Limpar timeout de reconexão
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    // Remover handlers para evitar reconexão automática
    this.ws.onclose = null;
    
    // Fechar conexão
    this.ws.close();
    this.ws = null;
    this.subscribedMachines.clear();
  }
  
  // Enviar comando (nova documentação)
  public sendCommand(command: WebSocketCommandNew): boolean {
    // Se o WebSocket está conectado, enviar imediatamente
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log('📤 WebSocketManager: Enviando comando:', command.type, command);
      this.ws.send(JSON.stringify(command));
      return true;
    }
    
    // Se o WebSocket está conectando, tentar novamente após um curto delay
    if (this.ws && this.ws.readyState === WebSocket.CONNECTING) {
      console.log('⏳ WebSocketManager: WebSocket ainda conectando, aguardando...');
      
      // Tentar novamente após 500ms
      setTimeout(() => {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          console.log('📤 WebSocketManager: Enviando comando após espera:', command.type, command);
          this.ws.send(JSON.stringify(command));
          return true;
        } else {
          console.error('❌ WebSocketManager: WebSocket não está conectado após espera');
          return false;
        }
      }, 500);
      
      return true; // Retorna true pois o comando será tentado novamente
    }
    
    console.error('❌ WebSocketManager: WebSocket não está conectado');
    return false;
  }
  
  // Adicionar listener para eventos
  public addListener(eventType: string, callback: (data: any) => void): void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    
    this.listeners.get(eventType)?.add(callback);
  }
  
  // Remover listener
  public removeListener(eventType: string, callback: (data: any) => void): void {
    if (!this.listeners.has(eventType)) return;
    
    this.listeners.get(eventType)?.delete(callback);
  }
  
  // Handler para conexão aberta
  private handleOpen(): void {
    console.log('✅ WebSocketManager: Conectado com sucesso ao servidor 192.168.1.76:8765');
    console.log('🎉 WebSocketManager: Pronto para enviar comandos');
    this.reconnectAttempts = 0;
    
    // Notificar listeners
    this.notifyListeners('connection', { connected: true });
  }
  
  // Inscrever-se em uma máquina (nova documentação)
  public subscribe(machineId: number): boolean {
    if (!this.subscribedMachines.has(machineId)) {
      const command: SubscribeCommand = {
        type: 'subscribe',
        id_maquina: machineId
      };
      
      const success = this.sendCommand(command);
      if (success) {
        this.subscribedMachines.add(machineId);
        console.log(`🔔 WebSocketManager: Inscrito na máquina ${machineId}`);
      }
      return success;
    }
    
    console.log(`🔔 WebSocketManager: Já inscrito na máquina ${machineId}`);
    return true;
  }
  
  // Desinscrever-se de uma máquina (nova documentação)
  public unsubscribe(machineId: number): boolean {
    if (this.subscribedMachines.has(machineId)) {
      const command: UnsubscribeCommand = {
        type: 'unsubscribe',
        id_maquina: machineId
      };
      
      const success = this.sendCommand(command);
      if (success) {
        this.subscribedMachines.delete(machineId);
        console.log(`🔔 WebSocketManager: Desinscrito da máquina ${machineId}`);
      }
      return success;
    }
    
    console.log(`🔔 WebSocketManager: Não estava inscrito na máquina ${machineId}`);
    return true;
  }
  
  // Handler para mensagens recebidas (nova documentação)
  private handleMessage(event: MessageEvent): void {
    try {
      const data: WebSocketEventNew | WebSocketResponse | WebSocketErrorResponse = JSON.parse(event.data);
      
      // Log de debug para entender a estrutura
      console.log('📥 WebSocketManager: Mensagem recebida:', data);
      
      // Verificar se é uma resposta de comando (success/error)
      if ('success' in data) {
        if (data.success) {
          const successData = data as WebSocketResponse;
          console.log('✅ WebSocketManager: Comando executado com sucesso:', successData.message);
          // Se a resposta trouxer dados adicionais, classificar por tipo
          if (successData.data && typeof successData.data === 'object') {
            const payload: any = successData.data;
            // Sessão de operador
            if ('has_active_session' in payload || 'sessao' in payload) {
              console.log('🧭 WebSocketManager: Status de sessão recebido');
              this.notifyListeners('session_status', payload);
            }
            // Dados de máquina
            if ('machine_data' in payload || 'id' in payload) {
              console.log('📦 WebSocketManager: Dados de máquina recebidos em resposta de comando');
              this.notifyListeners('machine_data', payload);
            }
          }
          this.notifyListeners('command_success', data);
        } else {
          const errorMessage = (data as WebSocketErrorResponse).error;
          console.error('❌ WebSocketManager: Erro no comando:', errorMessage);
          
          // Tratamento específico para erro de sessão já ativa (idempotente)
          if (errorMessage.includes('Já existe sessão ativa')) {
            console.log('ℹ️ WebSocketManager: Sessão já está ativa no servidor - comportamento normal (tratando como sucesso idempotente)');
            // Notificar listeners específicos e tratar como sucesso idempotente
            this.notifyListeners('session_already_active', data);
            this.notifyListeners('command_success', { success: true, message: 'Sessão já estava ativa' });
            return; // Não propagar como erro
          } else if (errorMessage.includes('Máquina') && errorMessage.includes('não encontrada')) {
            console.log('🔍 WebSocketManager: Verifique se a máquina existe no servidor WebSocket');
          }
          
          this.notifyListeners('command_error', data);
        }
        return;
      }
      
      // Verificar se é evento de conexão
      if ('type' in data && data.type === 'connection') {
        console.log('🔌 WebSocketManager: Mensagem de conexão:', (data as ConnectionEvent).message);
        this.notifyListeners('connection', data);
        return;
      }
      
      // Verificar se é evento de subscription
      if ('type' in data && (data.type === 'machine_update' || data.type === 'production_alert')) {
        console.log('📨 WebSocketManager: Evento de subscription:', data.type);
        this.notifyListeners(data.type, data);
        
        // Notificar também listeners específicos do update_type
        if (data.type === 'machine_update') {
          const machineUpdate = data as MachineUpdateEvent;
          this.notifyListeners(`machine_update_${machineUpdate.update_type}`, data);
        }
        return;
      }
      
      // Notificar listeners genéricos
      if ('type' in data) {
        const eventData = data as { type: string };
        this.notifyListeners(eventData.type, data);
      }
      this.notifyListeners('message', data);
    } catch (error) {
      console.error('❌ WebSocketManager: Erro ao processar mensagem:', error);
    }
  }
  
  // Handler para conexão fechada
  private handleClose(event: CloseEvent): void {
    console.log('🔌 WebSocketManager: Desconectado:', event.code, event.reason);
    
    // Limpar WebSocket
    this.ws = null;
    
    // Notificar listeners
    this.notifyListeners('connection', { connected: false });
    
    // Tentar reconectar com backoff exponencial se devemos reconectar
    // Permitir reconexão mesmo sem máquinas inscritas (a inscrição pode ocorrer depois)
    if (this.shouldReconnect && this.reconnectAttempts < this.MAX_RECONNECT_ATTEMPTS) {
      
      // Calcular intervalo com backoff exponencial
      const backoff = Math.min(
        this.BASE_RECONNECT_INTERVAL * Math.pow(2, this.reconnectAttempts),
        this.MAX_RECONNECT_INTERVAL
      );
      
      this.reconnectAttempts++;
      
      console.log(
        `🔄 WebSocketManager: Tentando reconectar (${this.reconnectAttempts}/${this.MAX_RECONNECT_ATTEMPTS}) em ${Math.round(backoff / 1000)}s...`
      );
      
      this.reconnectTimeout = setTimeout(() => {
        this.connect(this.shouldReconnect);
        // Reinscrever em todas as máquinas após reconexão
        setTimeout(() => {
          this.subscribedMachines.forEach(machineId => {
            this.subscribe(machineId);
          });
        }, 1000);
      }, backoff);
    } else if (this.reconnectAttempts >= this.MAX_RECONNECT_ATTEMPTS) {
      console.error('❌ WebSocketManager: Número máximo de tentativas de reconexão atingido');
    } else if (!this.shouldReconnect) {
      console.log('⚠️ WebSocketManager: Reconexão desabilitada (máquina não encontrada)');
    }
  }
  
  // Handler para erros
  private handleError(error: Event): void {
    console.error('❌ WebSocketManager: Erro na conexão:', error);
    console.error('❌ WebSocketManager: URL tentada:', this.url);
    console.error('❌ WebSocketManager: Estado do WebSocket:', this.ws?.readyState);
    
    // Notificar listeners
    this.notifyListeners('error', { error });
  }
  
  // Notificar listeners de um tipo de evento
  private notifyListeners(eventType: string, data: any): void {
    if (!this.listeners.has(eventType)) return;
    
    this.listeners.get(eventType)?.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`❌ WebSocketManager: Erro ao executar callback para evento ${eventType}:`, error);
      }
    });
  }
  
  // Verificar se está conectado
  public isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
  
  // Obter máquinas inscritas
  public getSubscribedMachines(): number[] {
    return Array.from(this.subscribedMachines);
  }
}

// Exportar instância única
export const webSocketManager = WebSocketManager.getInstance();

// Comandos específicos conforme nova documentação
export const WebSocketCommands = {
  // COMANDOS DE SESSÃO DE OPERADOR
  iniciarSessaoOperador: (machineId: number, operatorId: number, turnoId: number): IniciarSessaoOperadorCommand => ({
    type: 'iniciar_sessao_operador',
    id_maquina: machineId,
    id_operador: operatorId,
    id_turno: turnoId
  }),
  
  finalizarSessaoOperador: (machineId: number): FinalizarSessaoOperadorCommand => ({
    type: 'finalizar_sessao_operador',
    id_maquina: machineId
  }),
  
  // COMANDOS DE PRODUÇÃO MAPA
  iniciarProducaoMapa: (
    machineId: number, 
    mapaId: number, 
    produtoId: number,
    options: {
      itemMapaId?: number;
      corId?: number;
      matrizId?: number;
      qtProduzir?: number;
    } = {}
  ): IniciarProducaoMapaCommand => ({
    type: 'iniciar_producao_mapa',
    id_maquina: machineId,
    id_mapa: mapaId,
    id_produto: produtoId,
    id_item_mapa: options.itemMapaId,
    id_cor: options.corId,
    id_matriz: options.matrizId,
    qt_produzir: options.qtProduzir || 0
  }),
  
  finalizarProducaoMapaParcial: (machineId: number): FinalizarProducaoMapaParcialCommand => ({
    type: 'finalizar_producao_mapa_parcial',
    id_maquina: machineId
  }),
  
  finalizarProducaoMapaCompleta: (machineId: number): FinalizarProducaoMapaCompletaCommand => ({
    type: 'finalizar_producao_mapa_completa',
    id_maquina: machineId
  }),
  
  // COMANDOS DE REJEITOS
  adicionarRejeitos: (machineId: number): AdicionarRejeitosCommand => ({
    type: 'adicionar_rejeitos',
    id_maquina: machineId
  }),
  
  // COMANDOS DE SUBSCRIPTION
  subscribe: (machineId: number): SubscribeCommand => ({
    type: 'subscribe',
    id_maquina: machineId
  }),
  
  unsubscribe: (machineId: number): UnsubscribeCommand => ({
    type: 'unsubscribe',
    id_maquina: machineId
  }),
  
  // COMANDOS DE CONSULTA
  consultarMaquina: (machineId: number): ConsultarMaquinaCommand => ({
    type: 'consultar_maquina',
    id_maquina: machineId
  }),
  
  consultarSessao: (machineId: number): ConsultarSessaoCommand => ({
    type: 'consultar_sessao',
    id_maquina: machineId
  }),
  
  consultarProducaoMapa: (machineId: number): ConsultarProducaoMapaCommand => ({
    type: 'consultar_producao_mapa',
    id_maquina: machineId
  })
};
