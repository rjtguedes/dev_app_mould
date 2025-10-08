// ==================== NOVA DOCUMENTAÇÃO WEBSOCKET ====================
// Baseado em: websocket-commands.md e websocket-subscriptions.md

// ==================== COMANDOS ENVIADOS PELO TABLET ====================

// 1. COMANDOS DE SESSÃO DE OPERADOR
export interface IniciarSessaoOperadorCommand {
  type: 'iniciar_sessao_operador';
  id_maquina: number;
  id_operador: number;
  id_turno: number;
  id_sessao?: number; // Opcional: usado quando reconectando uma sessão existente
}

export interface FinalizarSessaoOperadorCommand {
  type: 'finalizar_sessao_operador';
  id_maquina: number;
}

// 2. COMANDOS DE PRODUÇÃO MAPA
export interface IniciarProducaoMapaCommand {
  type: 'iniciar_producao_mapa';
  id_maquina: number;
  id_mapa: number;
  id_item_mapa?: number;
  id_produto: number;
  id_cor?: number;
  id_matriz?: number;
  qt_produzir?: number; // padrão: 0
}

export interface FinalizarProducaoMapaParcialCommand {
  type: 'finalizar_producao_mapa_parcial';
  id_maquina: number;
}

export interface FinalizarProducaoMapaCompletaCommand {
  type: 'finalizar_producao_mapa_completa';
  id_maquina: number;
}

// 3. COMANDOS DE REJEITOS
export interface AdicionarRejeitosCommand {
  type: 'adicionar_rejeitos';
  id_maquina: number;
}

// 3.1. COMANDOS DE JUSTIFICAÇÃO DE PARADA
export interface AtribuirMotivoParadaCommand {
  type: 'atribuir_motivo_parada';
  id_parada: number;
  id_motivo: number;
}

// 4. COMANDOS DE SUBSCRIPTION
export interface SubscribeCommand {
  type: 'subscribe';
  id_maquina: number;
}

export interface UnsubscribeCommand {
  type: 'unsubscribe';
  id_maquina: number;
}

// 5. COMANDOS DE CONSULTA
export interface ConsultarMaquinaCommand {
  type: 'consultar_maquina';
  id_maquina: number;
}

export interface ConsultarSessaoCommand {
  type: 'consultar_sessao';
  id_maquina: number;
}

export interface ConsultarProducaoMapaCommand {
  type: 'consultar_producao_mapa';
  id_maquina: number;
}

// União de todos os comandos
export type WebSocketCommandNew = 
  | IniciarSessaoOperadorCommand
  | FinalizarSessaoOperadorCommand
  | IniciarProducaoMapaCommand
  | FinalizarProducaoMapaParcialCommand
  | FinalizarProducaoMapaCompletaCommand
  | AdicionarRejeitosCommand
  | AtribuirMotivoParadaCommand
  | SubscribeCommand
  | UnsubscribeCommand
  | ConsultarMaquinaCommand
  | ConsultarSessaoCommand
  | ConsultarProducaoMapaCommand;

// ==================== RESPOSTAS DO SERVIDOR ====================

export interface WebSocketResponse {
  success: boolean;
  message: string;
  data?: any;
  timestamp: string;
}

export interface WebSocketErrorResponse {
  success: false;
  error: string;
  timestamp: string;
}

// ==================== EVENTOS RECEBIDOS (SUBSCRIPTIONS) ====================

// 1. MACHINE UPDATE - Atualização de máquina
export interface MachineUpdateEvent {
  type: 'machine_update';
  update_type: 'sinal' | 'parada' | 'retomada' | 'velocidade';
  target_machine_id: number;
  source_machine_id: number;
  is_child_update: boolean;
  machine_data: MachineDataNew;
  additional_data: Record<string, any>;
  timestamp: number;
  timestamp_formatted: string;
}

// 2. PRODUCTION ALERT - Alerta de produção
export interface ProductionAlertEvent {
  type: 'production_alert';
  alert_type: 'meta_atingida' | 'proximo_meta';
  target_machine_id: number;
  source_machine_id: number;
  is_child_alert: boolean;
  alert_data: {
    sinais_validos: number;
    qt_produzir: number;
    percentual: number;
    saldo?: number;
    message: string;
  };
  timestamp: number;
  timestamp_formatted: string;
}

// 3. CONNECTION - Mensagem de conexão
export interface ConnectionEvent {
  type: 'connection';
  status: 'connected';
  message: string;
  timestamp: string;
  server_time: number;
}

// ==================== ESTRUTURAS DE DADOS ====================

export interface ShiftInfo {
  id: number;
  nome: string;
  hora_inicio: string;
  hora_fim: string;
  dias_semana: number[];
}

export interface OperatorSession {
  id_sessao: number;
  id_maquina: number;
  id_operador: number;
  inicio: number;
  turno: number;
  sinais: number;
  rejeitos: number;
  sinais_validos: number;
  tempo_decorrido_segundos: number;
  tempo_paradas_segundos: number;
  tempo_paradas_nao_conta_oee: number;
  tempo_paradas_validas: number;
  tempo_valido_segundos: number;
}

export interface ActiveStop {
  id: number;
  inicio: number; // timestamp unix
  motivo_id: number | null;
}

export interface ShiftProduction {
  id_turno: number;
  id_maquina: number;
  id_operador: number;
  inicio: number;
  turno: number;
  sinais: number;
  rejeitos: number;
  sinais_validos: number;
  tempo_decorrido_segundos: number;
  tempo_paradas_segundos: number;
  tempo_paradas_nao_conta_oee: number;
  tempo_paradas_validas: number;
  tempo_valido_segundos: number;
}

export interface ProductionMap {
  id_mapa: number;
  id_item_mapa: number;
  id_produto: number;
  id_cor: number;
  id_matriz: number;
  qt_produzir: number;
  sinais: number;
  rejeitos: number;
  sinais_validos: number;
  saldo_a_produzir: number;
  inicio: number;
  sessoes: number[];
  tempo_decorrido_segundos: number;
  tempo_paradas_segundos: number;
  tempo_paradas_nao_conta_oee: number;
  tempo_paradas_validas: number;
  tempo_valido_segundos: number;
}

export interface MachineDataNew {
  id: number;
  nome: string;
  multipostos: boolean;
  velocidade: number;
  maquina_pai: number | null;
  id_empresa: number;
  status: boolean; // true = EM PRODUÇÃO, false = PARADA
  last_updated: number;
  turnos: ShiftInfo;
  sessao_operador: OperatorSession | null; // ⚠️ Pode ser null
  producao_turno: ShiftProduction;
  producao_mapa: ProductionMap | null; // ⚠️ Pode ser null
  parada_ativa: ActiveStop | null; // ⚠️ Se não for null, máquina está parada
}

// União de todos os eventos
export type WebSocketEventNew = 
  | MachineUpdateEvent
  | ProductionAlertEvent
  | ConnectionEvent;

// ==================== ESTADO DA CONEXÃO ====================

export interface WebSocketStateNew {
  connected: boolean;
  connecting: boolean;
  error: string | null;
  lastPing: number | null;
}

// ==================== CONFIGURAÇÃO ====================

export interface WebSocketConfig {
  url: string;
  port: number;
  reconnectAttempts: number;
  reconnectInterval: number;
  pingTimeout: number;
}

// Configuração padrão conforme nova documentação
export const DEFAULT_WS_CONFIG: WebSocketConfig = {
  url: 'ws://10.200.0.184:8765', // Servidor WebSocket correto
  port: 8765,
  reconnectAttempts: 5,
  reconnectInterval: 5000,
  pingTimeout: 60000
};
