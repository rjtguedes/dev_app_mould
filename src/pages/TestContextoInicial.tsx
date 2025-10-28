// 🧪 Componente de teste para contexto inicial

import React, { useState } from 'react';
import { useSSEManager } from '../hooks/useSSEManager';

// Exemplo de payload de contexto inicial para teste
const exemploContextoInicial = {
  // Dados da máquina principal
  id_maquina: 130,
  nome: "Máquina Principal - EVA",
  multipostos: true,
  ativa: true,
  status: true,
  velocidade: 0,
  
  // Array de máquinas filhas (estações)
  contextos_filhas: [
    {
      id_maquina: 141,
      contexto: {
        id: 141,
        nome: "Posto 6 - MATRIZ ESQUERDA",
        ativa: false,
        id_empresa: 5,
        last_updated: 1760779360,
        maquina_pai: 130,
        multipostos: false,
        status: false,
        velocidade: 0,
        
        // Dados de produção
        producao_mapa: {
          id_cor: null,
          id_item_mapa: null,
          id_mapa: null,
          id_matriz: null,
          id_produto: null,
          inicio: null,
          qt_produzir: 0,
          rejeitos: 0,
          saldo_a_produzir: 0,
          sessoes: [],
          sinais: 246,
          sinais_validos: 246,
          tempo_decorrido_segundos: 0,
          tempo_paradas_nao_conta_oee: 0,
          tempo_paradas_segundos: 0,
          tempo_paradas_validas: 0,
          tempo_valido_segundos: 0
        },
        
        producao_turno: {
          id_turno: null,
          id_producao_turno: null,
          inicio: null,
          sinais: 30,
          rejeitos: 0,
          tempo_decorrido_segundos: 0,
          tempo_paradas_segundos: 0,
          tempo_valido_segundos: 0
        },
        
        // Dados da sessão do operador (PRINCIPAIS)
        sessao_operador: {
          id_maquina: 141,
          id_operador: null,
          id_sessao: null,
          inicio: null,
          rejeitos: 0,
          sinais: 246,
          sinais_validos: 246, // ← ESTE É O VALOR PRINCIPAL
          tempo_decorrido_segundos: 0,
          tempo_paradas_nao_conta_oee: 0,
          tempo_paradas_segundos: 0,
          tempo_paradas_validas: 0,
          tempo_valido_segundos: 0,
          turno: null
        },
        
        turnos: {}
      }
    },
    {
      id_maquina: 142,
      contexto: {
        id: 142,
        nome: "Posto 7 - MATRIZ ESQUERDA",
        ativa: true,
        id_empresa: 5,
        last_updated: 1760779360,
        maquina_pai: 130,
        multipostos: false,
        status: true,
        velocidade: 15,
        
        producao_mapa: {
          id_cor: 1,
          id_item_mapa: 1,
          id_mapa: 1,
          id_matriz: 1,
          id_produto: 1,
          inicio: "2024-01-15T08:00:00Z",
          qt_produzir: 1000,
          rejeitos: 5,
          saldo_a_produzir: 500,
          sessoes: [1, 2],
          sinais: 500,
          sinais_validos: 495,
          tempo_decorrido_segundos: 3600,
          tempo_paradas_nao_conta_oee: 0,
          tempo_paradas_segundos: 300,
          tempo_paradas_validas: 300,
          tempo_valido_segundos: 3300
        },
        
        producao_turno: {
          id_turno: 1,
          id_producao_turno: 1,
          inicio: "2024-01-15T08:00:00Z",
          sinais: 500,
          rejeitos: 5,
          tempo_decorrido_segundos: 3600,
          tempo_paradas_segundos: 300,
          tempo_valido_segundos: 3300
        },
        
        sessao_operador: {
          id_maquina: 142,
          id_operador: 1,
          id_sessao: 1,
          inicio: "2024-01-15T08:00:00Z",
          rejeitos: 5, // ← ESTE É O VALOR PRINCIPAL
          sinais: 500,
          sinais_validos: 495, // ← ESTE É O VALOR PRINCIPAL
          tempo_decorrido_segundos: 3600,
          tempo_paradas_nao_conta_oee: 0,
          tempo_paradas_segundos: 300,
          tempo_paradas_validas: 300,
          tempo_valido_segundos: 3300,
          turno: 1
        },
        
        turnos: {
          id: 1,
          descricao: "Turno Manhã",
          hora_inicio: "08:00",
          hora_fim: "16:00"
        }
      }
    },
    {
      id_maquina: 143,
      contexto: {
        id: 143,
        nome: "Posto 8 - MATRIZ DIREITA",
        ativa: true,
        id_empresa: 5,
        last_updated: 1760779360,
        maquina_pai: 130,
        multipostos: false,
        status: true,
        velocidade: 20,
        
        producao_mapa: {
          id_cor: 2,
          id_item_mapa: 2,
          id_mapa: 2,
          id_matriz: 2,
          id_produto: 2,
          inicio: "2024-01-15T08:30:00Z",
          qt_produzir: 800,
          rejeitos: 3,
          saldo_a_produzir: 200,
          sessoes: [3],
          sinais: 600,
          sinais_validos: 597,
          tempo_decorrido_segundos: 2700,
          tempo_paradas_nao_conta_oee: 0,
          tempo_paradas_segundos: 150,
          tempo_paradas_validas: 150,
          tempo_valido_segundos: 2550
        },
        
        producao_turno: {
          id_turno: 1,
          id_producao_turno: 2,
          inicio: "2024-01-15T08:30:00Z",
          sinais: 600,
          rejeitos: 3,
          tempo_decorrido_segundos: 2700,
          tempo_paradas_segundos: 150,
          tempo_valido_segundos: 2550
        },
        
        sessao_operador: {
          id_maquina: 143,
          id_operador: 2,
          id_sessao: 2,
          inicio: "2024-01-15T08:30:00Z",
          rejeitos: 3, // ← ESTE É O VALOR PRINCIPAL
          sinais: 600,
          sinais_validos: 597, // ← ESTE É O VALOR PRINCIPAL
          tempo_decorrido_segundos: 2700,
          tempo_paradas_nao_conta_oee: 0,
          tempo_paradas_segundos: 150,
          tempo_paradas_validas: 150,
          tempo_valido_segundos: 2550,
          turno: 1
        },
        
        turnos: {
          id: 1,
          descricao: "Turno Manhã",
          hora_inicio: "08:00",
          hora_fim: "16:00"
        }
      }
    }
  ]
};

// Função para testar o processamento
const testarProcessamentoContexto = () => {
  console.log('🧪 Testando processamento do contexto inicial...');
  
  // Simular o processamento que acontece no useSSEManager
  const contextos_filhas = exemploContextoInicial.contextos_filhas;
  const newChildMachinesData = new Map();
  
  contextos_filhas.forEach((childContext: any) => {
    const { id_maquina, contexto } = childContext;
    
    if (contexto && contexto.sessao_operador) {
      console.log(`✅ Processando máquina filha ${id_maquina}:`, {
        nome: contexto.nome,
        sinais_validos: contexto.sessao_operador.sinais_validos,
        rejeitos: contexto.sessao_operador.rejeitos,
        sinais: contexto.sessao_operador.sinais
      });
      
      newChildMachinesData.set(id_maquina, {
        id_maquina,
        nome: contexto.nome,
        ativa: contexto.ativa,
        status: contexto.status,
        velocidade: contexto.velocidade,
        sessao_operador: {
          sinais: contexto.sessao_operador.sinais || 0,
          sinais_validos: contexto.sessao_operador.sinais_validos || 0,
          rejeitos: contexto.sessao_operador.rejeitos || 0,
          tempo_decorrido_segundos: contexto.sessao_operador.tempo_decorrido_segundos || 0,
          tempo_paradas_segundos: contexto.sessao_operador.tempo_paradas_segundos || 0,
          tempo_valido_segundos: contexto.sessao_operador.tempo_valido_segundos || 0
        },
        producao_mapa: contexto.producao_mapa,
        producao_turno: contexto.producao_turno,
        last_updated: contexto.last_updated
      });
    }
  });
  
  console.log(`📊 ${newChildMachinesData.size} máquinas filhas processadas`);
  console.log('📋 Dados processados:', Array.from(newChildMachinesData.entries()));
  
  return newChildMachinesData;
};

export function TestContextoInicial() {
  const [machineId, setMachineId] = useState(130);
  const [enabled, setEnabled] = useState(true);
  const [showExample, setShowExample] = useState(false);

  const {
    machineData,
    childMachinesData,
    isConnected,
    isLoading,
    error,
    consultarContexto
  } = useSSEManager({
    machineId,
    enabled
  });

  const handleTestExample = () => {
    console.log('🧪 Testando com exemplo de payload...');
    const result = testarProcessamentoContexto();
    console.log('✅ Resultado do teste:', result);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">🧪 Teste Contexto Inicial</h1>
          <p className="text-gray-400">
            Testar processamento do contexto inicial com máquinas filhas
          </p>
        </div>

        {/* Configuração */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">⚙️ Configuração</h2>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">
                ID da Máquina Principal
              </label>
              <input
                type="number"
                value={machineId}
                onChange={(e) => setMachineId(parseInt(e.target.value))}
                className="w-full px-4 py-2 bg-gray-700 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div className="flex items-end gap-3">
              <button
                onClick={() => setEnabled(!enabled)}
                className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                  enabled
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {enabled ? '🟢 SSE Ativo' : '🔴 SSE Inativo'}
              </button>
              
              <button
                onClick={() => consultarContexto()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors font-semibold"
              >
                🔄 Consultar Contexto
              </button>
            </div>
          </div>
        </div>

        {/* Status */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">📡 Status</h2>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-400 mb-1">Conexão SSE:</p>
              <p className={`font-semibold ${isConnected ? 'text-green-400' : 'text-red-400'}`}>
                {isConnected ? '✅ Conectado' : '❌ Desconectado'}
              </p>
            </div>
            
            <div>
              <p className="text-sm text-gray-400 mb-1">Carregando:</p>
              <p className={`font-semibold ${isLoading ? 'text-yellow-400' : 'text-gray-400'}`}>
                {isLoading ? '⏳ Sim' : '✅ Não'}
              </p>
            </div>
            
            <div>
              <p className="text-sm text-gray-400 mb-1">Máquinas Filhas:</p>
              <p className="font-semibold text-blue-400">
                {childMachinesData.size} encontradas
              </p>
            </div>
            
            <div>
              <p className="text-sm text-gray-400 mb-1">Erro:</p>
              <p className={`font-semibold ${error ? 'text-red-400' : 'text-green-400'}`}>
                {error ? `❌ ${error}` : '✅ Nenhum'}
              </p>
            </div>
          </div>
        </div>

        {/* Teste com Exemplo */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">🧪 Teste com Exemplo</h2>
          
          <div className="flex gap-3 mb-4">
            <button
              onClick={handleTestExample}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors font-semibold"
            >
              🧪 Testar Processamento
            </button>
            
            <button
              onClick={() => setShowExample(!showExample)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors font-semibold"
            >
              {showExample ? '🙈 Ocultar' : '👁️ Mostrar'} Exemplo
            </button>
          </div>
          
          {showExample && (
            <div className="bg-gray-900 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-3 text-blue-400">Exemplo de Payload:</h3>
              <pre className="text-sm overflow-auto max-h-64">
                {JSON.stringify(exemploContextoInicial, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Dados da Máquina Principal */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">📊 Dados da Máquina Principal</h2>
          
          {machineData ? (
            <pre className="bg-gray-900 rounded-lg p-4 overflow-auto max-h-64 text-sm">
              {JSON.stringify(machineData, null, 2)}
            </pre>
          ) : (
            <p className="text-gray-400">
              Aguardando dados da máquina principal...
            </p>
          )}
        </div>

        {/* Dados das Máquinas Filhas */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">👶 Dados das Máquinas Filhas</h2>
          
          {childMachinesData.size > 0 ? (
            <div className="space-y-4">
              {Array.from(childMachinesData.entries()).map(([id, data]) => (
                <div key={id} className="bg-gray-900 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold text-blue-400">
                      {data.nome} (ID: {id})
                    </h3>
                    <div className="flex gap-2">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        data.ativa ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
                      }`}>
                        {data.ativa ? 'Ativa' : 'Inativa'}
                      </span>
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        data.status ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
                      }`}>
                        {data.status ? 'Funcionando' : 'Parada'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 mb-3">
                    <div>
                      <p className="text-sm text-gray-400">Sinais Válidos:</p>
                      <p className="text-xl font-bold text-green-400">
                        {data.sessao_operador?.sinais_validos || 0}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Rejeitos:</p>
                      <p className="text-xl font-bold text-red-400">
                        {data.sessao_operador?.rejeitos || 0}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Velocidade:</p>
                      <p className="text-xl font-bold text-blue-400">
                        {data.velocidade || 0} peças/min
                      </p>
                    </div>
                  </div>
                  
                  <details className="text-sm">
                    <summary className="cursor-pointer text-gray-400 hover:text-white">
                      Ver dados completos
                    </summary>
                    <pre className="mt-2 bg-gray-800 rounded p-2 overflow-auto max-h-32">
                      {JSON.stringify(data, null, 2)}
                    </pre>
                  </details>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400">
              Aguardando dados das máquinas filhas...
            </p>
          )}
        </div>

        {/* Instruções */}
        <div className="mt-6 bg-blue-500/10 border border-blue-500/50 rounded-lg p-4">
          <h3 className="text-blue-400 font-semibold mb-2">💡 Como testar:</h3>
          <ul className="text-sm text-blue-300 space-y-1">
            <li>1. Configure o ID da máquina principal (ex: 130)</li>
            <li>2. Clique em "Consultar Contexto" para fazer a chamada real</li>
            <li>3. Use "Testar Processamento" para simular com dados de exemplo</li>
            <li>4. Verifique se as máquinas filhas são processadas corretamente</li>
            <li>5. Observe os logs no console do navegador</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
