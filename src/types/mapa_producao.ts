// Types para Mapas de Produção

export interface MapaProducao {
  id: number;
  created_at: string;
  codmapa: string;
  ciclos_calculados: number | null;
  paradas_calculadas_segundos: number | null;
  duracao_calculada_segundos: number | null;
  data_inicio: number | null;
  data_fim: number | null;
  paradas_real_segundos: number | null;
  duracao_real_s: number | null;
  concluido: boolean | null;
  quebra_porcentagem: number | null;
  created_by: string | null;
  maquina_id: number | null;
  prioridade: 'baixa' | 'media' | 'alta' | 'urgente';
  grupo_maquina_id: number | null;
  cor_descricao: string | null;
}

export interface EstacaoMapa {
  id: number;
  mapa_producao_id: number;
  numero_estacao: number;
  grupo_maquina_id: number;
  ativa: boolean;
  posicao_ordem: number;
  created_at: string;
  updated_at: string;
}

export interface TalaoEstacao {
  id: number;
  estacao_mapa_id: number;
  talao_referencia: string;
  talao_tamanho: string;
  quantidade: number;
  posicao_ordem: number;
  matriz_alocada_id: number | null;
  tempo_ciclo_segundos: number | null;
  created_at: string;
  updated_at: string;
}

export interface MapaAlocadoMaquina {
  id: number;
  mapa_producao_id: number;
  maquina_id: number;
  posicao_ordem: number;
  prioridade: 'baixa' | 'media' | 'alta' | 'urgente';
  data_inicio: number | null;
  data_fim: number | null;
  concluido: boolean;
  created_at: string;
  updated_at: string;
}

// Alocação de talão em estação física
export interface TalaoEstacaoFisica {
  id: number;
  talao_estacao_id: number;
  maquina_id: number;
  numero_estacao_fisica: number;
  ativa: boolean;
  data_inicio: number | null;
  data_fim: number | null;
  quantidade_produzida: number;
  created_at: string;
  updated_at: string;
}

// Type completo com relações
export interface MapaProducaoCompleto extends MapaProducao {
  estacoes: (EstacaoMapa & {
    taloes: TalaoEstacao[];
  })[];
  alocacao?: MapaAlocadoMaquina;
}

// Talão completo com informações do mapa e estação
export interface TalaoComMapa extends TalaoEstacao {
  mapa_codmapa: string;
  mapa_cor: string | null;
  mapa_prioridade: 'baixa' | 'media' | 'alta' | 'urgente';
  estacao_numero: number;
}

