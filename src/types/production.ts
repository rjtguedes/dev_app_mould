// 🗺️ Tipos para Mapas de Produção

export interface MapaProducao {
  id: number;
  nome: string;
  ativo: boolean;
  id_empresa: number;
}

// Estrutura real retornada pelo backend - Alocações de Mapas
export interface AlocacaoMapa {
  id_alocacao: number;
  id_mapa: number;
  maquina_id: number;
  codmapa: string;
  cor_descricao: string | null;
  posicao_ordem: number;
  prioridade_alocacao: string;
  prioridade: string | null;
  alocacao_concluida: boolean;
  mapa_concluido: boolean | null;
  data_inicio: number | null;
  data_fim: number | null;
  data_inicio_alocacao: number;
  data_fim_alocacao: number | null;
  ciclos_calculados: number | null;
  duracao_calculada_segundos: number | null;
  duracao_real_s: number | null;
  paradas_calculadas_segundos: number | null;
  paradas_real_segundos: number | null;
  quebra_porcentagem: number | null;
  grupo_maquina_id: number | null;
  ordens_origem: Array<{ id_ordem: number }>;
  planos_origem: Array<{ id_plano: number }>;
  debug_mapa_encontrado?: boolean;
  debug_mapa_id_solicitado?: number;
}

export interface EstacaoMapa {
  id: number;
  numero_estacao: number;
  grupo_maquina_id: number;
  posicao_ordem: number;
  taloes: TalaoEstacao[];
}

export interface TalaoEstacao {
  id: number;
  talao_referencia: string;
  talao_tamanho: string;
  quantidade: number;
  tempo_ciclo_segundos: number;
}

export interface MapaDetalhes {
  id: number;
  nome: string;
  ativo: boolean;
  estacoes: EstacaoMapa[];
}

export interface TalaoSelecionado {
  id_talao: number;
  estacao_numero: number;
  quantidade: number;
  tempo_ciclo_segundos?: number;
  talao_referencia: string;
  talao_tamanho: string;
}