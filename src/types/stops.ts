export interface MachineStop {
  id: number;
  inicio_unix_segundos: number;
  fim_unix_segundos: number | null;
  duracao_segundos: number | null;
  motivo_parada: number | null;
  id_maquina: number;
  id_operador: number | null;
}

export interface StopReason {
  id: number;
  descricao: string;
  contabiliza_oee: boolean;
  id_empresa: number | null;
  grupo_maquina: number | null;
  icone: string | null;
  cor: string | null;
}