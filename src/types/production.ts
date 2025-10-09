interface Product {
  id: number;
  referencia: string;
  descricao: string | null;
  consumo_signal: number | null;
  UM: string | null;
  cod_produto: number | null;
}

interface Color {
  id: number;
  descricao: string | null;
  cod: number | null;
}

export interface WeekMachine {
  id: number;
  created_at: string;
  semana: number;
  id_maquina: number;
  produto: Product;
  quantidade: number;
  planos: any;
  ops: any;
  quantidade_produzida: number;
  saldo: number;
  sequencia: number;
  minutos_estimado: number;
  id_empresa: number;
  status: string;
  grade_semana_maquina?: WeekMachineGrade[];
}

export interface WeekMachineGrade {
  id: number;
  id_semana_maquina: number;
  tamanho: string;
  quantidade: number;
  status: 'pendente' | 'em_producao' | 'concluido';
  created_at: string;
  tempo_total_maquina: number;
  sequence: number;
  numero_estacao: number;
  id_maquina: number;
  id_matriz: number | null;
  matriz_pai: number | null;
  matriz_repetida: boolean;
  repetitions: number;
  quantidade_produzida: number;
  saldo: number;
  matriz?: {
    id: number;
    identificador: string;
    tamanho: string;
  };
  data_inicio?: string;
  data_fim?: string;
}

export interface ProductionTicket {
  IdTalao: number;
  NroOP: number | null;
  SeqOP: number | null;
  NroTalao: number | null;
  CCusto: number | null;
  OcoGrd: string | null;
  RegProducao: number | null;
  Tamanho: string | null;
  Qtd: number | null;
  status: boolean | null;
}

export type ProductionFinishType = 'partial' | 'complete';

export interface ChildMachineProduction {
  stats: {
    id_maquina: number;
    velocidade: number;
    disponibilidade: number;
    produzido: number;
    rejeitos: number;
    minutos_disponivel: number;
    ultimo_sinal: number;
  };
  parameters: {
    id_maquina: number;
    producao_ativa: boolean;
    grade_semana_maquina: number | null;
    produto?: Product;
  };
  machine: {
    id_maquina: number;
    numero_estacao: number;
    nome: string;
    maquina_pai: number | null;
  };
  grade: WeekMachineGrade | null;
  produto?: Product;
  // Dados do WebSocket para a sessão do operador
  websocket_data?: {
    sessao_operador?: {
      sinais: number;
      rejeitos: number;
      tempo_decorrido_segundos: number;
      tempo_paradas_segundos: number;
      tempo_valido_segundos: number;
    };
    last_signal_timestamp?: number; // Timestamp do último sinal recebido
    highlight_until?: number; // Timestamp até quando deve destacar a estação
  };
}

export interface SingleMachineProduction {
  stats: any;
  parameters: any;
  machine: any;
  grade: WeekMachineGrade | null;
  produto: Product | null;
  // Dados do WebSocket para a sessão do operador
  websocket_data?: {
    sessao_operador?: {
      sinais: number;
      rejeitos: number;
      sinais_validos: number;
      tempo_decorrido_segundos: number;
      tempo_paradas_segundos: number;
      tempo_valido_segundos: number;
    };
  };
}