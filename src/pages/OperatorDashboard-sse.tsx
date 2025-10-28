// 📊 Operator Dashboard com SSE + API REST

import React, { useState, useEffect } from 'react';
import { useSSEManager } from '../hooks/useSSEManager';
import { SingleMachineViewNew } from '../components/SingleMachineView-new';
import { DashboardHeader } from '../components/DashboardHeader';
import { Sidebar } from '../components/Sidebar';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';
import type { Machine } from '../types/machine';
import type { User } from '@supabase/supabase-js';

interface OperatorDashboardSSEProps {
  machine: Machine;
  user: User | null;
  sessionId: number | null;
  onShowSettings: () => void;
  secondaryOperator?: { id: number; nome: string } | null;
}

export function OperatorDashboardSSE({
  machine,
  user,
  sessionId,
  onShowSettings,
  secondaryOperator
}: OperatorDashboardSSEProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isAdminMode, setIsAdminMode] = useState(false);

  // Gerenciador SSE
  const {
    machineData,
    isConnected,
    isLoading,
    error,
    iniciarSessao,
    finalizarSessao,
    iniciarProducao,
    pausarProducao,
    retomarProducao,
    finalizarProducao,
    adicionarRejeitos,
    forcarParada,
    consultarContexto
  } = useSSEManager({
    machineId: machine.id_maquina,
    enabled: true
  });

  // Verificar modo admin
  useEffect(() => {
    const checkAdminMode = async () => {
      if (!user?.email) return;
      
      const adminEmails = [
        'joao.cardoso@industrack.com.br',
        'juan.guedessp@gmail.com',
        'industrack.automacao@gmail.com'
      ];
      
      const isAdmin = adminEmails.includes(user.email.toLowerCase());
      setIsAdminMode(isAdmin);
      console.log('Modo admin:', isAdmin);
    };

    checkAdminMode();
  }, [user]);

  // Handler para adicionar rejeitos
  const handleAddRejeito = async () => {
    try {
      // TODO: Implementar modal para selecionar quantidade e motivo
      const result = await adicionarRejeitos({
        quantidade: 1,
        id_motivo_rejeito: 1
      });

      if (result.success) {
        console.log('✅ Rejeito adicionado com sucesso');
      } else {
        console.error('❌ Erro ao adicionar rejeito:', result.error);
      }
    } catch (error) {
      console.error('❌ Erro ao adicionar rejeito:', error);
    }
  };

  // Handler para encerrar parcial
  const handleEncerrarParcial = async () => {
    try {
      // TODO: Implementar lógica de finalização parcial via API
      console.log('🔄 Encerrar parcial - implementar');
    } catch (error) {
      console.error('❌ Erro ao encerrar parcial:', error);
    }
  };

  // Handler para encerrar total
  const handleEncerrarTotal = async () => {
    try {
      // TODO: Implementar lógica de finalização total via API
      console.log('🔄 Encerrar total - implementar');
    } catch (error) {
      console.error('❌ Erro ao encerrar total:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-gray-900 overflow-hidden">
      {/* Sidebar */}
      <Sidebar
        onShowSettings={onShowSettings}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        isAdminMode={isAdminMode}
        userName={user?.email || 'Operador'}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <DashboardHeader
          machineName={machine.nome}
          machineId={machine.id_maquina}
          isConnected={isConnected}
          connectionType="SSE"
        />

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <ErrorMessage message={error} />
          )}

          {/* Status de Conexão */}
          <div className="mb-4 flex items-center gap-2 text-sm">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-gray-400">
              {isConnected ? '🟢 Conectado via SSE' : '🔴 Desconectado'}
            </span>
          </div>

          {/* Machine View */}
          <SingleMachineViewNew
            machineData={machineData}
            onAddReject={async (gradeId) => {
              // TODO: Implementar lógica de rejeito por grade
              console.log('Adicionar rejeito para grade:', gradeId);
            }}
            onAddRejeito={handleAddRejeito}
            statusParada={machineData?.parada_ativa !== null}
            onEncerrarParcial={handleEncerrarParcial}
            onEncerrarTotal={handleEncerrarTotal}
          />

          {/* Debug Info (apenas em modo admin) */}
          {isAdminMode && (
            <div className="mt-6 p-4 bg-gray-800 rounded-lg">
              <h3 className="text-white font-semibold mb-2">🔧 Debug SSE</h3>
              <pre className="text-xs text-gray-300 overflow-auto max-h-40">
                {JSON.stringify(machineData, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


