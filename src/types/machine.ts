export interface Machine {
  id_maquina: number;
  nome: string | null;
  id_empresa: number | null;
  foto: string | null;
  velocidade_atual: number | null;
  ativa: boolean | null;
  parada_atual: number | null;
  tempo_entre_sinais: number | null;
  maquina_filha: boolean;
  index: number | null;
  multipostos: boolean | null;
  maquina_pai: number | null;
  quantidade_estacoes: number | null;
  tempo_inatividade: number | null;
  maquina_raiz: boolean | null;
  dias_operacao: any | null;
  tempo_inatividade_filhas: number | null;
  produto_id: number | null;
  operador_id: number | null;
  oee: any | null;
  grupo: number | null; // Corrigido de grupo_maquina para grupo
  grade_op: any | null;
  op_tempo_real: any | null;
  referencia: string | null;
  ihm_credentials: string | null;
  matriz_atual: number | null;
  cod_produto: number | null;
  desativada: boolean;
}

export interface MachineGroup {
  id: number;
  descriçao: string | null; // Corrigido para usar o campo correto da tabela
  id_empresa: number | null;
}

export interface MachineResponse {
  data: Machine[] | null;
  error: Error | null;
}