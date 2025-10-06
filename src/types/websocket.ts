// Tipos para comandos e eventos do WebSocket

// ==================== COMANDOS ENVIADOS PELO TABLET ====================

export interface WSCommand {
  type: 'get_machine_data' | 'start_session' | 'end_session';
}

export interface GetMachineDataCommand extends WSCommand {
  type: 'get_machine_data';
  id_maquina: number;
}

export interface StartSessionCommand extends WSCommand {
  type: 'start_session';
  id_maquina: number;
  id_operador: number;
  id_sessao: number;
}

export interface EndSessionCommand extends WSCommand {
  type: 'end_session';
  id_maquina: number;
}

export type WebSocketCommand = GetMachineDataCommand | StartSessionCommand | EndSessionCommand;

// ==================== EVENTOS RECEBIDOS DO SERVIDOR ====================

export interface WSEvent {
  type: string;
  id_maquina?: number;
}

// Dados da sessão do operador
export interface SessionOperatorData {
  id_sessao: number | null;
  id_operador: number | null;
  sinais: number;
  rejeitos: number;
  tempo_decorrido_segundos: number;
}

// Dados de produção do turno
export interface ProductionTurnData {
  id_turno: number;
  sinais: number;
  rejeitos: number;
  tempo_decorrido_segundos: number;
}

// Dados de velocidade
export interface VelocityData {
  valor: number | null;
  dataHora: number | null;
}

// Dados de parada
export interface StopData {
  em_curso: {
    id: number | null;
    inicio_unix: number | null;
  };
  ultima_fim_unix: number | null;
}

// Dados completos de uma máquina
export interface MachineData {
  id: number;
  nome: string;
  status: 'disponivel' | 'em_producao' | 'parada' | 'manutencao';
  multipostos: boolean;
  maquina_pai: number | null;
  sessao_operador: SessionOperatorData;
  producao_turno: ProductionTurnData;
  velocidade: VelocityData;
  paradas: StopData;
}

// Evento: Dados da máquina
export interface MachineDataEvent extends WSEvent {
  type: 'machine_data';
  id_maquina: number;
  is_multipostos: boolean;
  parent: MachineData;
  children: MachineData[];
}

// Evento: Confirmação de início de sessão
export interface StartSessionAckEvent extends WSEvent {
  type: 'start_session_ack';
  id_maquina: number;
  id_sessao: number;
}

// Evento: Confirmação de fim de sessão
export interface SessionSummary {
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

export interface EndSessionAckEvent extends WSEvent {
  type: 'end_session_ack';
  id_maquina: number;
  sessao: SessionSummary;
}

// Evento: Sinal de produção
export interface SignalEvent extends WSEvent {
  type: 'sinal';
  id_maquina: number;
  from_child?: number;
  child_name?: string;
  timestamp: number;
  sessao_operador: { 
    sinais: number;
    rejeitos: number;
    tempo_decorrido_segundos: number;
    tempo_paradas_segundos: number;
    tempo_valido_segundos: number;
  };
  producao_turno: { 
    sinais: number;
    rejeitos: number;
    tempo_decorrido_segundos: number;
    tempo_paradas_segundos: number;
    tempo_valido_segundos: number;
  };
  producao_mapa: { sinais: number };
}

// Evento: Rejeito
export interface RejectEvent extends WSEvent {
  type: 'rejeito';
  id_maquina: number;
  from_child?: number;
  child_name?: string;
  timestamp: number;
  sessao_operador: { 
    sinais: number;
    rejeitos: number;
    tempo_decorrido_segundos: number;
    tempo_paradas_segundos: number;
    tempo_valido_segundos: number;
  };
  producao_turno: { 
    sinais: number;
    rejeitos: number;
    tempo_decorrido_segundos: number;
    tempo_paradas_segundos: number;
    tempo_valido_segundos: number;
  };
  producao_mapa: { rejeitos: number };
}

// Evento: Velocidade
export interface VelocityEvent extends WSEvent {
  type: 'velocidade';
  id_maquina: number;
  velocidade: number;
  dataHora: number;
}

// Evento: Parada
export interface StopEvent extends WSEvent {
  type: 'parada';
  id_maquina: number;
  status: 'parada';
  motivo: string;
}

// Evento: Retomada
export interface ResumeEvent extends WSEvent {
  type: 'retomada';
  id_maquina: number;
  status: 'em_producao';
  duracao: number;
}

// Evento: Ping do servidor
export interface PingEvent extends WSEvent {
  type: 'ping';
  ts: number;
}

// Evento: Erro
export interface ErrorEvent extends WSEvent {
  type: 'error';
  message: string;
  id_maquina?: number;
}

// Comandos de parada e retomada forçada
export interface ForcedStopCommand extends WSCommand {
  type: 'forced_stop';
  id_maquina: number;
  motivo_id: number;
  forced_by: string;
  description: string;
}

export interface ForcedResumeCommand extends WSCommand {
  type: 'forced_resume';
  id_maquina: number;
  resumed_by: string;
}

// Eventos de parada e retomada forçada
export interface ForcedStopAckEvent extends WSEvent {
  type: 'forced_stop_ack';
  id_maquina: number;
  status: string;
}

export interface ForcedStopEvent extends WSEvent {
  type: 'forced_stop';
  id_maquina: number;
  status: string;
  motivo_id: number;
  parada_id: number;
}

export interface ForcedResumeAckEvent extends WSEvent {
  type: 'forced_resume_ack';
  id_maquina: number;
  status: string;
}

export interface ForcedResumeEvent extends WSEvent {
  type: 'forced_resume';
  id_maquina: number;
  status: string;
}

// União de todos os eventos possíveis
export type WebSocketEvent = 
  | MachineDataEvent
  | StartSessionAckEvent
  | EndSessionAckEvent
  | SignalEvent
  | RejectEvent
  | VelocityEvent
  | StopEvent
  | ResumeEvent
  | ForcedStopAckEvent
  | ForcedStopEvent
  | ForcedResumeAckEvent
  | ForcedResumeEvent
  | PingEvent
  | ErrorEvent;

// ==================== ESTADO DA CONEXÃO ====================

export interface WebSocketState {
  connected: boolean;
  connecting: boolean;
  error: string | null;
  lastPing: number | null;
}

