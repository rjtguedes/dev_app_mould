/**
 * EXEMPLO DE MIGRAÇÃO PARA NOVA DOCUMENTAÇÃO WEBSOCKET
 * 
 * Este arquivo demonstra como migrar do sistema antigo para o novo
 * conforme a documentação websocket-commands.md e websocket-subscriptions.md
 */

import React, { useState, useCallback } from 'react';
import { useWebSocketSingleton } from '../hooks/useWebSocketSingleton-new';
import type { MachineUpdateEvent, ProductionAlertEvent } from '../types/websocket-new';

// ==================== EXEMPLO DE COMPONENTE MIGRADO ====================

interface MachineDashboardProps {
  machineId: number;
  operatorId: number;
  turnoId: number;
}

export function MachineDashboard({ machineId, operatorId, turnoId }: MachineDashboardProps) {
  const [machineData, setMachineData] = useState<any>(null);
  const [connectionStatus, setConnectionStatus] = useState<string>('Desconectado');

  // Handler para atualizações da máquina (nova estrutura)
  const handleMachineUpdate = useCallback((event: MachineUpdateEvent) => {
    console.log('📨 Update recebido:', {
      tipo: event.update_type,
      maquinaTarget: event.target_machine_id,
      maquinaSource: event.source_machine_id,
      isChild: event.is_child_update
    });

    // Atualizar dados da máquina
    setMachineData(event.machine_data);

    // Processar diferentes tipos de update
    switch (event.update_type) {
      case 'sinal':
        console.log('📈 Novo sinal:', event.additional_data);
        break;
      case 'parada':
        console.log('⏸️ Máquina parou');
        break;
      case 'retomada':
        console.log('▶️ Máquina retomou');
        break;
      case 'velocidade':
        console.log('⚡ Nova velocidade:', event.additional_data.velocidade);
        break;
    }
  }, []);

  // Handler para alertas de produção (novo)
  const handleProductionAlert = useCallback((event: ProductionAlertEvent) => {
    console.log('🚨 Alerta de produção:', event.alert_data.message);
    
    // Mostrar notificação ao usuário
    if (event.alert_type === 'meta_atingida') {
      alert('🎉 Meta de produção atingida!');
    } else if (event.alert_type === 'proximo_meta') {
      alert('⚠️ Próximo da meta de produção!');
    }
  }, []);

  // Handler para sucesso de comandos
  const handleCommandSuccess = useCallback((data: any) => {
    console.log('✅ Comando executado:', data.message);
  }, []);

  // Handler para erro de comandos
  const handleCommandError = useCallback((error: any) => {
    console.error('❌ Erro no comando:', error.error);
    alert(`Erro: ${error.error}`);
  }, []);

  // Hook do WebSocket (nova implementação)
  const {
    state,
    iniciarSessaoOperador,
    finalizarSessaoOperador,
    iniciarProducaoMapa,
    adicionarRejeitos,
    consultarMaquina,
    consultarSessao,
    consultarProducaoMapa
  } = useWebSocketSingleton({
    machineId,
    onMachineUpdate: handleMachineUpdate,
    onProductionAlert: handleProductionAlert,
    onCommandSuccess: handleCommandSuccess,
    onCommandError: handleCommandError,
    autoConnect: true,
    shouldReconnect: true
  });

  // Atualizar status de conexão
  React.useEffect(() => {
    setConnectionStatus(state.connected ? 'Conectado' : 'Desconectado');
  }, [state.connected]);

  // ==================== FUNÇÕES DE EXEMPLO ====================

  const handleIniciarSessao = async () => {
    try {
      console.log('🚀 Iniciando sessão de operador...');
      await iniciarSessaoOperador(operatorId, turnoId);
    } catch (error) {
      console.error('Erro ao iniciar sessão:', error);
    }
  };

  const handleFinalizarSessao = async () => {
    try {
      console.log('🛑 Finalizando sessão de operador...');
      await finalizarSessaoOperador();
    } catch (error) {
      console.error('Erro ao finalizar sessão:', error);
    }
  };

  const handleIniciarProducao = async () => {
    try {
      console.log('🏭 Iniciando produção mapa...');
      await iniciarProducaoMapa(
        1, // id_mapa
        5678, // id_produto
        {
          id_cor: 789,
          id_matriz: 435987,
          qtProduzir: 500
        }
      );
    } catch (error) {
      console.error('Erro ao iniciar produção:', error);
    }
  };

  const handleAdicionarRejeito = async () => {
    try {
      console.log('❌ Adicionando rejeito...');
      await adicionarRejeitos();
    } catch (error) {
      console.error('Erro ao adicionar rejeito:', error);
    }
  };

  const handleConsultarMaquina = async () => {
    try {
      console.log('🔍 Consultando dados da máquina...');
      await consultarMaquina();
    } catch (error) {
      console.error('Erro ao consultar máquina:', error);
    }
  };

  // ==================== RENDERIZAÇÃO ====================

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <h1 className="text-2xl font-bold mb-6">Dashboard da Máquina {machineId}</h1>
      
      {/* Status de Conexão */}
      <div className="mb-4 p-4 bg-white rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-2">Status da Conexão</h2>
        <p className={`text-lg ${state.connected ? 'text-green-600' : 'text-red-600'}`}>
          {connectionStatus}
        </p>
        {state.error && (
          <p className="text-red-500 mt-2">Erro: {state.error}</p>
        )}
      </div>

      {/* Dados da Máquina */}
      {machineData && (
        <div className="mb-4 p-4 bg-white rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-2">Dados da Máquina</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p><strong>Nome:</strong> {machineData.nome}</p>
              <p><strong>Status:</strong> {machineData.status ? '🟢 Produzindo' : '🔴 Parada'}</p>
              <p><strong>Velocidade:</strong> {machineData.velocidade} ciclos/h</p>
            </div>
            <div>
              {machineData.sessao_operador && (
                <>
                  <p><strong>Sinais:</strong> {machineData.sessao_operador.sinais}</p>
                  <p><strong>Rejeitos:</strong> {machineData.sessao_operador.rejeitos}</p>
                  <p><strong>Válidos:</strong> {machineData.sessao_operador.sinais_validos}</p>
                </>
              )}
            </div>
          </div>
          
          {machineData.producao_mapa && (
            <div className="mt-4 p-3 bg-blue-50 rounded">
              <h3 className="font-semibold text-blue-800">Produção Mapa</h3>
              <p><strong>Produto:</strong> {machineData.producao_mapa.id_produto}</p>
              <p><strong>Meta:</strong> {machineData.producao_mapa.qt_produzir}</p>
              <p><strong>Produzido:</strong> {machineData.producao_mapa.sinais_validos}</p>
              <p><strong>Saldo:</strong> {machineData.producao_mapa.saldo_a_produzir}</p>
              
              {/* Barra de progresso */}
              <div className="mt-2 w-full bg-gray-200 rounded-full h-2.5">
                <div 
                  className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                  style={{ 
                    width: `${Math.min((machineData.producao_mapa.sinais_validos / machineData.producao_mapa.qt_produzir) * 100, 100)}%` 
                  }}
                ></div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Botões de Ação */}
      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={handleIniciarSessao}
          className="p-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          🚀 Iniciar Sessão
        </button>
        
        <button
          onClick={handleFinalizarSessao}
          className="p-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          🛑 Finalizar Sessão
        </button>
        
        <button
          onClick={handleIniciarProducao}
          className="p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          🏭 Iniciar Produção
        </button>
        
        <button
          onClick={handleAdicionarRejeito}
          className="p-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
        >
          ❌ Adicionar Rejeito
        </button>
        
        <button
          onClick={handleConsultarMaquina}
          className="p-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          🔍 Consultar Máquina
        </button>
        
        <button
          onClick={() => window.location.reload()}
          className="p-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          🔄 Recarregar
        </button>
      </div>

      {/* Log de Debug */}
      <div className="mt-6 p-4 bg-black text-green-400 rounded-lg font-mono text-sm">
        <h3 className="text-white mb-2">Log de Debug:</h3>
        <p>Abra o console do navegador para ver os logs detalhados</p>
      </div>
    </div>
  );
}

// ==================== COMPARAÇÃO: ANTES vs DEPOIS ====================

/*
❌ ANTES (Sistema Antigo):
const { wsStartSession, wsEndSession, wsReject } = useWebSocketSingleton({
  machineId,
  onSignal: (event) => { /* dados limitados */ },
  onReject: (event) => { /* estrutura simples */ },
  // ... handlers limitados
});

// Comandos com nomes antigos
wsStartSession(operatorId, sessionId); // ❌ Usava id_sessao
wsEndSession(); // ❌ Comando simples
wsReject(); // ❌ Comando básico

✅ DEPOIS (Nova Documentação):
const { iniciarSessaoOperador, finalizarSessaoOperador, adicionarRejeitos } = useWebSocketSingleton({
  machineId,
  onMachineUpdate: (event) => { /* dados completos da máquina */ },
  onProductionAlert: (event) => { /* alertas de produção */ },
  // ... handlers completos
});

// Comandos com nova nomenclatura
iniciarSessaoOperador(operatorId, turnoId); // ✅ Usa id_turno
finalizarSessaoOperador(); // ✅ Comando completo
adicionarRejeitos(); // ✅ Comando padronizado
*/

export default MachineDashboard;


