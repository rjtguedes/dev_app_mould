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
    id: 1,
    nome: "1º Turno",
    hora_inicio: "06:00:00",
    hora_fim: "14:00:00",
    dias_semana: [1, 2, 3, 4, 5] // Segunda a Sexta
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
    // IDs de identificação
    id_mapa: 789,
    id_producao_talao_mapa: 456,
    id_talao_estacao: 411,
    
    // IDs de produto/matriz/cor
    id_produto: 123,
    id_cor: 1,
    id_matriz: 5,
    
    // Descrições textuais
    produto_referencia: "2140 FLOW (INT/EXT)",
    cor_descricao: "Azul Royal",
    
    // Quantidades e contadores
    quantidade_programada: 5000,
    qt_produzir: 5000, // Meta da ordem
    saldo_a_produzir: 3820, // Saldo restante (5000 - 1180)
    sinais: 1200, // Total de sinais da ordem
    rejeitos: 20, // Rejeitos da ordem
    sinais_validos: 1180, // Sinais válidos da ordem
    
    // Tempos
    inicio: Math.floor((Date.now() - (4 * 60 * 60 * 1000)) / 1000), // 4 horas atrás (unix timestamp)
    tempo_produto: 45, // Tempo de ciclo do produto (45 segundos)
    tempo_estimado: 225000, // Tempo estimado total (5000 * 45 = 225000 segundos)
    tempo_decorrido_segundos: 14400, // 4 horas
    tempo_paradas_segundos: 600, // 10 minutos de paradas
    tempo_paradas_nao_conta_oee: 120, // 2 minutos não contam OEE
    tempo_paradas_validas: 480, // 8 minutos de paradas válidas
    tempo_valido_segundos: 13800, // Tempo válido de produção
    
    // Array de talões/estações
    taloes: [
      {
        id_talao: 411,
        estacao_numero: 1,
        quantidade: 2500,
        tempo_ciclo_segundos: 45,
        quantidade_produzida: 590,
        rejeitos: 10,
        saldo_pendente: 1910,
        concluida_total: false,
        concluida_parcial: false,
        pode_retomar: false,
        iniciada: true,
        inicio_unix: Math.floor((Date.now() - (4 * 60 * 60 * 1000)) / 1000),
        fim_unix: null
      },
      {
        id_talao: 412,
        estacao_numero: 2,
        quantidade: 2500,
        tempo_ciclo_segundos: 45,
        quantidade_produzida: 590,
        rejeitos: 10,
        saldo_pendente: 1910,
        concluida_total: false,
        concluida_parcial: false,
        pode_retomar: false,
        iniciada: true,
        inicio_unix: Math.floor((Date.now() - (4 * 60 * 60 * 1000)) / 1000),
        fim_unix: null
      }
    ],
    
    // Sessões relacionadas
    sessoes: [1014] // IDs das sessões que trabalharam nesta ordem
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
  },
  
  // Parada ativa (null = máquina em produção)
  parada_ativa: null
};

// Exemplo de máquina sem sessão ativa (mas com parada ativa)
export const exampleMachineDataNoSession: MachineDataNew = {
  ...exampleMachineData,
  sessao_operador: null,
  status: false, // PARADA
  parada_ativa: {
    id: 11171,
    inicio: Math.floor(Date.now() / 1000) - 300, // 5 minutos atrás
    motivo_id: null
  }
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
  status: false,
  parada_ativa: null
};

// ==================== EXEMPLO DE PRODUÇÃO PARCIAL ====================
// Máquina com talão parcialmente concluído (pode retomar)
export const exampleMachineDataParcial: MachineDataNew = {
  ...exampleMachineData,
  producao_mapa: {
    id_mapa: 790,
    id_producao_talao_mapa: 457,
    id_talao_estacao: 413,
    id_produto: 124,
    id_cor: 2,
    id_matriz: 6,
    produto_referencia: "2150 PREMIUM (INT/EXT)",
    cor_descricao: "Verde Neon",
    quantidade_programada: 1000,
    qt_produzir: 1000,
    saldo_a_produzir: 550, // Produziu 450 de 1000
    sinais: 465,
    rejeitos: 15,
    sinais_validos: 450,
    inicio: Math.floor((Date.now() - (2 * 60 * 60 * 1000)) / 1000),
    tempo_produto: 60,
    tempo_estimado: 60000,
    tempo_decorrido_segundos: 7200,
    tempo_paradas_segundos: 300,
    tempo_paradas_nao_conta_oee: 60,
    tempo_paradas_validas: 240,
    tempo_valido_segundos: 6900,
    taloes: [
      {
        id_talao: 413,
        estacao_numero: 1,
        quantidade: 1000,
        tempo_ciclo_segundos: 60,
        quantidade_produzida: 450,
        rejeitos: 15,
        saldo_pendente: 550,
        concluida_total: false,
        concluida_parcial: true, // ⚠️ PRODUÇÃO PARCIAL
        pode_retomar: true, // ✅ PODE RETOMAR
        iniciada: true,
        inicio_unix: Math.floor((Date.now() - (2 * 60 * 60 * 1000)) / 1000),
        fim_unix: Math.floor(Date.now() / 1000) // Finalizado agora
      }
    ],
    sessoes: [1014]
  }
};









