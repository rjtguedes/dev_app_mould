// 🏭 Visualização Rotativas - Layout em 2 Colunas Automáticas (Dividido por Quantidade)

import React, { useMemo } from 'react';
import type { ChildMachineProduction } from '../types/production';

interface RotativasStationsViewProps {
  machineData: any; // Dados da máquina principal
  childProductions: ChildMachineProduction[];
  contextoAtivo: 'sessao' | 'turno' | 'taloes';
  onAddReject?: (machineId: number) => void;
}

interface StationData {
  posto: number;
  id_maquina: number;
  nome: string;
  produzido: number;
  rejeitos: number;
  saldo: number;
  total_a_produzir: number; // ✅ NOVO: Total do talão alocado
  // Informações da produção alocada
  tamanho?: string | null;
  produto?: string | null;
  cor?: string | null;
}

export function RotativasStationsView({
  machineData,
  childProductions,
  contextoAtivo,
  onAddReject
}: RotativasStationsViewProps) {
  
  // Organizar estações em sequência numérica e dividir em 2 colunas automaticamente
  const { coluna1, coluna2, totalProduzido, totalRejeitos } = useMemo(() => {
    const allStations: StationData[] = [];
    let totalProd = 0;
    let totalRej = 0;
    
    childProductions.forEach(production => {
      const nome = production.machine.nome || '';
      
      // Extrair número do posto (ex: "Posto 2", "Estação 5", etc)
      const postoMatch = nome.match(/(?:posto|estacao|estação)\s+(\d+)/i);
      const postoNumero = postoMatch ? parseInt(postoMatch[1]) : production.machine.numero_estacao || 0;
      
      // ✅ Extrair producao_mapa ANTES do switch (escopo global)
      const producaoMapa = production.websocket_data?.producao_mapa;
      
      // Extrair dados baseado no contexto ativo
      let produzido = 0;
      let rejeitos = 0;
      let saldo = 0;
      
      switch (contextoAtivo) {
        case 'sessao':
          produzido = production.websocket_data?.sessao_operador?.sinais_validos || 
                     production.websocket_data?.sessao_operador?.sinais || 
                     production.stats?.produzido || 0;
          rejeitos = production.websocket_data?.sessao_operador?.rejeitos || 
                    production.stats?.rejeitos || 0;
          break;
        case 'turno':
          produzido = production.websocket_data?.producao_turno?.sinais_validos || 
                     production.websocket_data?.producao_turno?.sinais || 
                     production.stats?.produzido || 0;
          rejeitos = production.websocket_data?.producao_turno?.rejeitos || 
                    production.stats?.rejeitos || 0;
          break;
        case 'taloes':
          // ✅ CORREÇÃO: Só usar dados se tiver produção ativa (id_mapa não null)
          const temProducaoAtiva = producaoMapa?.id_mapa !== null && producaoMapa?.id_mapa !== undefined;
          
          if (temProducaoAtiva) {
            produzido = producaoMapa?.sinais_validos || producaoMapa?.sinais || 0;
            rejeitos = producaoMapa?.rejeitos || 0;
            saldo = producaoMapa?.saldo_a_produzir || 0;
          } else {
            produzido = 0;
            rejeitos = 0;
            saldo = 0;
          }
          break;
      }
      
      // ✅ CORREÇÃO: No contexto 'taloes', só somar estações com produção ativa
      if (contextoAtivo !== 'taloes' || producaoMapa?.id_mapa) {
        totalProd += produzido;
        totalRej += rejeitos;
      }
      
      // Extrair informações da produção alocada (tamanho, produto, cor)
      const tamanho = producaoMapa?.talao_tamanho || null;
      const produto = producaoMapa?.produto_referencia || producaoMapa?.talao_referencia || null;
      const cor = producaoMapa?.descricao_cor || null;
      const totalAProduzir = producaoMapa?.qt_produzir || 0; // ✅ NOVO
      
      allStations.push({
        posto: postoNumero,
        id_maquina: production.machine.id_maquina,
        nome,
        produzido,
        rejeitos,
        saldo,
        total_a_produzir: totalAProduzir, // ✅ NOVO
        tamanho,
        produto,
        cor
      });
    });
    
    // Ordenar por número do posto
    allStations.sort((a, b) => a.posto - b.posto);
    
    // Dividir automaticamente em 2 colunas (metade em cada)
    const totalPostos = allStations.length;
    const postosPorColuna = Math.ceil(totalPostos / 2);
    
    const col1 = allStations.slice(0, postosPorColuna);
    const col2 = allStations.slice(postosPorColuna);
    
    console.log(`📊 [Rotativas] Total postos: ${totalPostos}, Coluna 1: ${col1.length}, Coluna 2: ${col2.length}`);
    
    return {
      coluna1: col1,
      coluna2: col2,
      totalProduzido: totalProd,
      totalRejeitos: totalRej
    };
  }, [childProductions, contextoAtivo]);
  
  // Componente para renderizar uma linha de posto
  const StationRow = ({ station, showSaldo }: { station: StationData; showSaldo: boolean }) => {
    const hasValidId = station.id_maquina > 0;
    
    // Formatar texto de produto (TAMANHO-PRODUTO - COR)
    const produtoInfo = React.useMemo(() => {
      const parts: string[] = [];
      
      if (station.tamanho) parts.push(station.tamanho);
      if (station.produto) parts.push(station.produto);
      
      const produtoText = parts.join('-');
      
      if (station.cor) {
        return produtoText ? `${produtoText} - ${station.cor}` : station.cor;
      }
      
      return produtoText || null;
    }, [station.tamanho, station.produto, station.cor]);
    
    return (
      <div className="border-b border-blue-400/20 hover:bg-blue-700/20 transition-colors">
        {/* Linha principal com números e botão */}
        <div className="flex items-center gap-2 py-1.5">
          {/* Número do posto */}
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-400/30 text-white font-bold text-lg shrink-0">
            {station.posto}
          </div>
          
          {/* Nome do posto/estação */}
          <div className="flex-1 text-left min-w-[100px]">
            <div className="text-xs font-semibold text-white truncate" title={station.nome}>
              {station.nome}
            </div>
          </div>
          
          {/* Produzido */}
          <div className="flex-1 text-center min-w-[60px]">
            <div className="text-2xl font-bold text-green-400">
              {station.produzido}
            </div>
          </div>
          
          {/* Rejeitos */}
          <div className="flex-1 text-center min-w-[60px]">
            <div className="text-2xl font-bold text-red-400">
              {station.rejeitos}
            </div>
          </div>
          
          {/* Saldo (apenas se contexto for talões) */}
          {showSaldo && (
            <div className="flex-1 text-center min-w-[70px]">
              <div className="text-2xl font-bold text-orange-400">
                {station.saldo}
              </div>
            </div>
          )}
          
          {/* Botão Adicionar Rejeito */}
          <div className="shrink-0 ml-2">
            {hasValidId ? (
              <button
                onClick={() => onAddReject?.(station.id_maquina)}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white text-sm font-semibold rounded-lg transition-colors shadow-lg border border-red-400/30"
                title={`Adicionar rejeito - ${station.nome}`}
              >
                + Rejeito
              </button>
            ) : (
              <div className="px-3 py-1.5 text-xs text-gray-500">
                -
              </div>
            )}
          </div>
        </div>
        
        {/* ✅ Linha de informações da produção */}
        {(station.tamanho || station.produto) && (
          <div className="pb-1 px-3 flex justify-center items-center gap-1">
            {/* Tamanho SOLTO com DESTAQUE */}
            {station.tamanho && (
              <span className="text-white font-black text-sm">{station.tamanho}</span>
            )}
            {/* Separador */}
            {station.tamanho && station.produto && (
              <span className="text-white/50 font-medium text-sm">-</span>
            )}
            {/* Produto */}
            {station.produto && (
              <span className="text-white/80 font-medium text-sm">{station.produto}</span>
            )}
            {/* Cor */}
            {station.cor && (
              <span className="text-blue-300/80 font-medium text-sm"> - {station.cor}</span>
            )}
            {/* Total a Produzir */}
            {showSaldo && station.total_a_produzir > 0 && (
              <span className="text-blue-400/80 font-medium text-sm ml-1">(Total: {station.total_a_produzir})</span>
            )}
          </div>
        )}
      </div>
    );
  };
  
  const showSaldoColumn = contextoAtivo === 'taloes';
  
  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 p-6">
      
      {/* Totais Gerais */}
      <div className="mb-6 bg-blue-800/40 backdrop-blur-sm rounded-xl p-6 border border-blue-400/30">
        <div className="text-center mb-4">
          <h2 className="text-4xl font-bold text-white mb-2">
            {machineData?.contexto?.nome || machineData?.nome || 'ROTATIVAS'}
          </h2>
          <p className="text-blue-300 text-sm">
            {coluna1.length + coluna2.length} Estações Ativas
          </p>
        </div>
        
        <div className="flex justify-center gap-16">
          {/* Total Produzido */}
          <div className="text-center">
            <div className="text-sm text-blue-300 mb-1 font-semibold">Produzido</div>
            <div className="text-5xl font-bold text-green-400">
              {totalProduzido}
            </div>
          </div>
          
          {/* Total Rejeitos */}
          <div className="text-center">
            <div className="text-sm text-blue-300 mb-1 font-semibold">Rejeitos</div>
            <div className="text-5xl font-bold text-red-400">
              {totalRejeitos}
            </div>
          </div>
        </div>
      </div>
      
      {/* Grid de 2 Colunas Automáticas */}
      <div className="flex-1 grid grid-cols-2 gap-6">
        
        {/* Coluna 1 */}
        <div className="bg-blue-800/40 backdrop-blur-sm rounded-xl p-6 border border-blue-400/30">
          {/* Header */}
          <div className="mb-4 pb-3 border-b-2 border-blue-400/50">
            <div className="flex items-center gap-3 px-3">
              <div className="w-10 shrink-0"></div> {/* Espaço para número */}
              <div className="flex-1 text-left text-sm font-semibold text-blue-200 min-w-[120px]">
                Estação
              </div>
              <div className="flex-1 text-center text-xs font-semibold text-blue-200 min-w-[60px]">
                Produzido
              </div>
              <div className="flex-1 text-center text-xs font-semibold text-blue-200 min-w-[60px]">
                Rejeitos
              </div>
              {showSaldoColumn && (
                <>
                  <div className="flex-1 text-center text-xs font-semibold text-blue-200 min-w-[55px]">
                    Total
                  </div>
                  <div className="flex-1 text-center text-xs font-semibold text-blue-200 min-w-[55px]">
                    Saldo
                  </div>
                </>
              )}
              <div className="shrink-0 ml-2 w-[80px]"></div> {/* Espaço para botão */}
            </div>
          </div>
          
          {/* Linhas da Coluna 1 */}
          <div className="space-y-1">
            {coluna1.length > 0 ? (
              coluna1.map(station => (
                <StationRow 
                  key={station.id_maquina || station.posto} 
                  station={station} 
                  showSaldo={showSaldoColumn}
                />
              ))
            ) : (
              <div className="text-center text-white/50 py-8">
                Nenhuma estação
              </div>
            )}
          </div>
        </div>
        
        {/* Coluna 2 */}
        <div className="bg-blue-800/40 backdrop-blur-sm rounded-xl p-6 border border-blue-400/30">
          {/* Header */}
          <div className="mb-4 pb-3 border-b-2 border-blue-400/50">
            <div className="flex items-center gap-3 px-3">
              <div className="w-10 shrink-0"></div> {/* Espaço para número */}
              <div className="flex-1 text-left text-sm font-semibold text-blue-200 min-w-[120px]">
                Estação
              </div>
              <div className="flex-1 text-center text-xs font-semibold text-blue-200 min-w-[60px]">
                Produzido
              </div>
              <div className="flex-1 text-center text-xs font-semibold text-blue-200 min-w-[60px]">
                Rejeitos
              </div>
              {showSaldoColumn && (
                <>
                  <div className="flex-1 text-center text-xs font-semibold text-blue-200 min-w-[55px]">
                    Total
                  </div>
                  <div className="flex-1 text-center text-xs font-semibold text-blue-200 min-w-[55px]">
                    Saldo
                  </div>
                </>
              )}
              <div className="shrink-0 ml-2 w-[80px]"></div> {/* Espaço para botão */}
            </div>
          </div>
          
          {/* Linhas da Coluna 2 */}
          <div className="space-y-1">
            {coluna2.length > 0 ? (
              coluna2.map(station => (
                <StationRow 
                  key={station.id_maquina || station.posto} 
                  station={station} 
                  showSaldo={showSaldoColumn}
                />
              ))
            ) : (
              <div className="text-center text-white/50 py-8">
                Nenhuma estação
              </div>
            )}
          </div>
        </div>
        
      </div>
    </div>
  );
}


