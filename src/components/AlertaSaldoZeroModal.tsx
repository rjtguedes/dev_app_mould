// 🚨 Modal de Alerta Automático - Saldo Zerado

import React from 'react';
import { X, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';

interface ProducaoComSaldoZero {
  id_maquina: number;
  nome_maquina: string;
  numero_estacao?: number;
  talao_referencia: string;
  talao_tamanho: string;
  produto: string | null;
  cor: string | null;
  total_produzido: number;
  total_a_produzir: number;
}

interface AlertaSaldoZeroModalProps {
  isOpen: boolean;
  onClose: () => void;
  producoes: ProducaoComSaldoZero[];
  onFinalizar: () => void;
  onIniciarNova: () => void;
}

export function AlertaSaldoZeroModal({
  isOpen,
  onClose,
  producoes,
  onFinalizar,
  onIniciarNova
}: AlertaSaldoZeroModalProps) {
  if (!isOpen || producoes.length === 0) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 z-50">
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl max-w-3xl w-full overflow-hidden shadow-2xl border-2 border-orange-500/50 animate-pulse-slow">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-orange-600 to-red-600 border-b-2 border-orange-500/50">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center animate-bounce">
              <AlertCircle className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white">🎉 Produção Concluída!</h2>
              <p className="text-orange-100 text-sm font-semibold">
                {producoes.length} talão(ões) chegou(chegaram) ao saldo zero
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-lg transition-all flex items-center justify-center"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Lista de Produções Concluídas */}
          <div className="space-y-3 mb-6">
            {producoes.map((producao, index) => (
              <div
                key={`${producao.id_maquina}-${producao.talao_referencia}-${index}`}
                className="p-4 bg-gradient-to-r from-green-500/20 to-emerald-600/20 border-2 border-green-500/50 rounded-xl"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                      <CheckCircle2 className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-white font-bold text-lg">{producao.talao_referencia}</span>
                        <div className="px-3 py-0.5 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg">
                          <span className="text-white font-black text-xl">{producao.talao_tamanho}</span>
                        </div>
                        {producao.cor && (
                          <span className="text-slate-300 text-sm">• {producao.cor}</span>
                        )}
                      </div>
                      <div className="text-sm text-slate-300">
                        {producao.nome_maquina}
                        {producao.numero_estacao && ` • Estação ${producao.numero_estacao}`}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-green-400 font-bold text-2xl">{producao.total_produzido}</div>
                    <div className="text-slate-400 text-xs">de {producao.total_a_produzir}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Mensagem de Instrução */}
          <div className="bg-blue-500/20 border border-blue-400/50 rounded-lg p-4 mb-6">
            <p className="text-blue-200 text-sm font-medium text-center">
              💡 Finalize esta produção para liberar as estações. Você poderá retomar produções parciais posteriormente.
            </p>
          </div>
        </div>

        {/* Footer - Botões de Ação */}
        <div className="px-6 py-4 bg-slate-800 border-t-2 border-slate-700 flex items-center justify-between gap-4">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-semibold transition-colors border border-slate-600 flex items-center gap-2"
          >
            <XCircle className="w-5 h-5" />
            <span>Ignorar Agora</span>
          </button>

          <div className="flex gap-3">
            <button
              onClick={onFinalizar}
              className="px-8 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg font-bold shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>Finalizar Produções</span>
            </button>

            <button
              onClick={onIniciarNova}
              className="px-8 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg font-bold shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
            >
              <span>Iniciar Nova Produção</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

