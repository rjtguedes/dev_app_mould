// Exemplo de dados que vêm do WebSocket para testar a nova interface
import type { MachineDataNew } from '../types/websocket-new';

export const exampleMachineData: MachineDataNew = {
  id: 76,
  nome: "Horizontal 18",
  multipostos: false,
  velocidade: 85,
  maquina_pai: null,
  id_empresa: 5,
  status: true, // EM PRODUÇÃO
  last_updated: Date.now(),
  
  turnos: {
    current: "1º Turno",
    next: "2º Turno",
    shifts: [
      { id: 1, nome: "1º Turno", inicio: "06:00", fim: "14:00" },
      { id: 2, nome: "2º Turno", inicio: "14:00", fim: "22:00" },
      { id: 3, nome: "3º Turno", inicio: "22:00", fim: "06:00" }
    ]
  },
  
  // Dados da sessão do operador
  sessao_operador: {
    id_sessao: 1014,
    id_maquina: 76,
    id_operador: 86,
    inicio: Date.now() - (2 * 60 * 60 * 1000), // 2 horas atrás
    turno: 1,
    sinais: 1250, // Total de sinais
    rejeitos: 25, // Rejeitos da sessão
    sinais_validos: 1225, // Sinais válidos da sessão
    tempo_decorrido_segundos: 7200, // 2 horas
    tempo_paradas_segundos: 300, // 5 minutos de paradas
    tempo_paradas_nao_conta_oee: 60, // 1 minuto de paradas não contam OEE
    tempo_paradas_validas: 240, // 4 minutos de paradas válidas
    tempo_valido_segundos: 6900 // Tempo válido de produção
  },
  
  // Dados da produção mapa (ordem de produção)
  producao_mapa: {
    id_mapa: 789,
    id_item_mapa: 456,
    id_produto: 123,
    id_cor: 1,
    id_matriz: 5,
    qt_produzir: 5000, // Meta da ordem
    sinais: 1200, // Total de sinais da ordem
    rejeitos: 20, // Rejeitos da ordem
    sinais_validos: 1180, // Sinais válidos da ordem
    saldo_a_produzir: 3820, // Saldo restante (5000 - 1180)
    inicio: Date.now() - (4 * 60 * 60 * 1000), // 4 horas atrás
    sessoes: [1014], // IDs das sessões que trabalharam nesta ordem
    tempo_decorrido_segundos: 14400, // 4 horas
    tempo_paradas_segundos: 600, // 10 minutos de paradas
    tempo_paradas_nao_conta_oee: 120, // 2 minutos não contam OEE
    tempo_paradas_validas: 480, // 8 minutos de paradas válidas
    tempo_valido_segundos: 13800 // Tempo válido de produção
  },
  
  // Dados do turno (produção geral do turno)
  producao_turno: {
    id_turno: 1,
    id_maquina: 76,
    id_operador: 86,
    inicio: Date.now() - (6 * 60 * 60 * 1000), // 6 horas atrás
    turno: 1,
    sinais: 2000, // Total do turno
    rejeitos: 40, // Rejeitos do turno
    sinais_validos: 1960, // Válidos do turno
    tempo_decorrido_segundos: 21600, // 6 horas
    tempo_paradas_segundos: 900, // 15 minutos de paradas
    tempo_paradas_nao_conta_oee: 180, // 3 minutos não contam OEE
    tempo_paradas_validas: 720, // 12 minutos de paradas válidas
    tempo_valido_segundos: 20700 // Tempo válido do turno
  }
};

// Exemplo de máquina sem sessão ativa
export const exampleMachineDataNoSession: MachineDataNew = {
  ...exampleMachineData,
  sessao_operador: null,
  status: false // PARADA
};

// Exemplo de máquina sem ordem de produção ativa
export const exampleMachineDataNoProduction: MachineDataNew = {
  ...exampleMachineData,
  producao_mapa: null
};

// Exemplo de máquina sem dados (aguardando configuração)
export const exampleMachineDataEmpty: MachineDataNew = {
  ...exampleMachineData,
  sessao_operador: null,
  producao_mapa: null,
  status: false
};


