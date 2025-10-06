import React from 'react';
import { ArrowLeft, Box, Search, Filter, QrCode, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { DataMatrixScanner } from '../components/DataMatrixScanner';
import type { Machine } from '../types/machine';
import type { ProductionTicket } from '../types/production';

interface ProductionTicketsProps {
  machine: Machine;
  onBack: () => void;
}

export function ProductionTickets({ machine, onBack }: ProductionTicketsProps) {
  const [showScanner, setShowScanner] = React.useState(false);
  const [scannedCode, setScannedCode] = React.useState<string | null>(null);
  const [tickets, setTickets] = React.useState<ProductionTicket[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [searchLoading, setSearchLoading] = React.useState(false);

  const handleScan = async (result: string) => {
    setShowScanner(false);
    setScannedCode(result);
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('taloes_op')
        .select('*')
        .eq('NroTalao', parseInt(result))
        .single();

      if (error) throw error;

      if (data) {
        setTickets(prev => {
          const exists = prev.some(ticket => ticket.IdTalao === data.IdTalao);
          return exists ? prev : [data, ...prev];
        });
        setError(null);
      } else {
        setError('Talão não encontrado');
      }
    } catch (err) {
      console.error('Error processing scanned code:', err);
      setError('Talão não encontrado');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchTerm.trim()) return;
    
    setSearchLoading(true);
    setError(null);

    try {
      const searchValue = searchTerm.trim();
      const isNumeric = !isNaN(Number(searchValue));
      
      let query = supabase.from('taloes_op').select('*');
      
      if (isNumeric) {
        // Se for numérico, busca por número do talão ou OP
        query = query.or(`NroTalao.eq.${searchValue},NroOP.eq.${searchValue}`);
      } else {
        // Se for texto, busca por tamanho
        query = query.ilike('Tamanho', `%${searchValue}%`);
      }
      
      const { data, error } = await query.order('NroOP', { ascending: true }).order('SeqOP', { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        setTickets(prev => {
          // Remove duplicatas e adiciona novos resultados
          const existingIds = new Set(prev.map(t => t.IdTalao));
          const newTickets = data.filter(t => !existingIds.has(t.IdTalao));
          return [...newTickets, ...prev];
        });
        setError(null);
      } else {
        setError('Nenhum talão encontrado');
      }
    } catch (err) {
      console.error('Error searching tickets:', err);
      setError('Erro ao buscar talões');
    } finally {
      setSearchLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const clearResults = () => {
    setTickets([]);
    setScannedCode(null);
    setError(null);
    setSearchTerm('');
  };

  const filteredTickets = React.useMemo(() => {
    if (!searchTerm) return tickets;
    
    const term = searchTerm.toLowerCase();
    return tickets.filter(ticket => 
      ticket.NroTalao?.toString().includes(term) ||
      ticket.NroOP?.toString().includes(term) ||
      ticket.Tamanho?.toLowerCase().includes(term)
    );
  }, [tickets, searchTerm]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900">
      <nav className="bg-white/10 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            >
              <ArrowLeft className="w-6 h-6 text-white" />
            </button>
            <h1 className="text-xl font-bold text-white">Talões de Produção</h1>
          </div>
          <div className="flex items-center gap-2 text-blue-200">
            <Box className="w-5 h-5" />
            <span>{machine.nome}</span>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-4">
        {/* Search and Filter Bar */}
        <div className="flex gap-4 mb-6">
          <div className="flex-1 relative flex items-center gap-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-300" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Buscar por número do talão, OP ou tamanho..."
              className="flex-1 bg-white/10 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-white
                       placeholder:text-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleSearch}
              disabled={searchLoading || !searchTerm.trim()}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-400 disabled:cursor-not-allowed text-white rounded-lg
                       transition-colors flex items-center gap-2"
            >
              {searchLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Search className="w-5 h-5" />
              )}
              Buscar
            </button>
            <button
              onClick={() => setShowScanner(true)}
              className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg
                       transition-colors flex items-center gap-2"
            >
              <QrCode className="w-5 h-5" />
              Scanner
            </button>
            {tickets.length > 0 && (
              <button
                onClick={clearResults}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg
                         transition-colors"
              >
                Limpar
              </button>
            )}
          </div>
        </div>

        <div className="space-y-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="flex items-center gap-3 text-white">
                <Loader2 className="w-6 h-6 animate-spin" />
                <span>Processando código escaneado...</span>
              </div>
            </div>
          ) : scannedCode ? (
            <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/10 p-6 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">Código Escaneado</h3>
                  <p className="text-blue-200 font-mono">{scannedCode}</p>
                </div>
                {error && (
                  <div className="text-red-300">{error}</div>
                )}
              </div>
            </div>
          ) : null}

          {error && !loading && (
            <div className="bg-red-500/10 backdrop-blur-sm rounded-xl border border-red-500/20 p-4">
              <p className="text-red-300">{error}</p>
            </div>
          )}

          {filteredTickets.length === 0 ? (
            <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/10 p-8 text-center">
              <QrCode className="w-12 h-12 text-blue-300 mx-auto mb-4" />
              <p className="text-blue-200">
                {tickets.length === 0 
                  ? 'Use a busca ou o scanner para encontrar talões de produção'
                  : 'Nenhum talão encontrado com os filtros aplicados'
                }
              </p>
            </div>
          ) : (
            <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden">
              <div className="p-4 border-b border-white/10">
                <h3 className="text-white font-medium">
                  {filteredTickets.length} talão{filteredTickets.length !== 1 ? 'es' : ''} encontrado{filteredTickets.length !== 1 ? 's' : ''}
                </h3>
              </div>
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b border-white/10 bg-white/5">
                    <th className="py-3 px-4 text-blue-200 font-medium">Status</th>
                    <th className="py-3 px-4 text-blue-200 font-medium">Talão</th>
                    <th className="py-3 px-4 text-blue-200 font-medium">OP</th>
                    <th className="py-3 px-4 text-blue-200 font-medium">Seq</th>
                    <th className="py-3 px-4 text-blue-200 font-medium">Tamanho</th>
                    <th className="py-3 px-4 text-blue-200 font-medium text-right">Qtd</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTickets.map((ticket) => (
                    <tr 
                      key={ticket.IdTalao}
                      className="border-b border-white/10 hover:bg-white/5 transition-colors"
                    >
                      <td className="py-3 px-4">
                        {ticket.status ? (
                          <CheckCircle2 className="w-5 h-5 text-green-400" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-400" />
                        )}
                      </td>
                      <td className="py-3 px-4 text-white font-medium">
                        {ticket.NroTalao}
                      </td>
                      <td className="py-3 px-4 text-white">
                        {ticket.NroOP}
                      </td>
                      <td className="py-3 px-4 text-blue-200">
                        {ticket.SeqOP}
                      </td>
                      <td className="py-3 px-4 text-white">
                        {ticket.Tamanho}
                      </td>
                      <td className="py-3 px-4 text-white text-right">
                        {ticket.Qtd}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {showScanner && (
          <DataMatrixScanner
            onScan={handleScan}
            onClose={() => setShowScanner(false)}
          />
        )}
      </main>
    </div>
  );
}