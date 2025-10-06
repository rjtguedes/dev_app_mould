export interface MachineStop {
  id: number;
  data_inicio_unix: number;
  data_fim_unix: number | null;
  tempo_parada_minutos: number | null;
  motivo_parada: number | null;
  id_empresa: number;
  turno: number | null;
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