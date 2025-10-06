export interface Session {
  id: number;
  created_at: string;
  maquina: number;
  operador: number;
  inicio: number;
  fim: number | null;
  turno: number | null;
  operador_secundario: number | null;
}

export interface MachineParameters {
  id_maquina: number;
  created_at: string;
  operador: number | null;
  sessao: number | null;
  produto: number | null;
  semana_maquina: number | null;
  grade_semana_maquina: number | null;
}