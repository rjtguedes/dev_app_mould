import React from 'react';
import { useState, useEffect } from 'react';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { NumPad } from './components/NumPad';
import { MachineSelection } from './pages/MachineSelection';
import { Settings } from './pages/Settings';
import { TestSSE } from './pages/TestSSE';
import { TestContextoInicial } from './pages/TestContextoInicial';
import { DiagnosticoConexao } from './pages/DiagnosticoConexao';
import { supabase, handleJWTError } from './lib/supabase';
import { decryptCredentials } from './lib/crypto';
import { useWakeLock } from './hooks/useWakeLock';
import { useAuth } from './hooks/useAuth';
import { machineStorage } from './lib/machineStorage';
import type { Machine } from './types/machine';
import { getCompanyName } from './config/appSettings';

function App() {
  const [pin, setPin] = useState<string>('');
  const [success, setSuccess] = useState(false);
  const [currentMachine, setCurrentMachine] = useState<Machine | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [twoOperators, setTwoOperators] = useState(false);
  const [showTestSSE, setShowTestSSE] = useState(false);
  const [showTestContexto, setShowTestContexto] = useState(false);
  const [showDiagnostico, setShowDiagnostico] = useState(false);
  const [searchingMachines, setSearchingMachines] = useState(false);
  const [showHiddenButton, setShowHiddenButton] = useState(false);
  const [logoClickCount, setLogoClickCount] = useState(0);
  
  // ✅ Usando hook de autenticação simplificado
  const { isAuthenticated, operator, secondaryOperator, isLoading, error, login, logout } = useAuth();
  
  useWakeLock();

  // ✅ Se houver erro crítico de autenticação, fazer logout
  useEffect(() => {
    if (error && (error.includes('401') || error.includes('403') || error.includes('não autorizado') || error.includes('autenticação') || error.includes('sessão inválida'))) {
      console.warn('⚠️ App: Erro de autenticação detectado, fazendo logout');
      logout();
      setCurrentMachine(null);
    }
  }, [error, logout]);

  // 🧪 Atalhos para testes (Ctrl+Shift+S, Ctrl+Shift+C, Ctrl+Shift+D)
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'S') {
        e.preventDefault();
        setShowTestSSE(prev => !prev);
      } else if (e.ctrlKey && e.shiftKey && e.key === 'C') {
        e.preventDefault();
        setShowTestContexto(prev => !prev);
      } else if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        setShowDiagnostico(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  useEffect(() => {
    // ✅ SIMPLIFICADO: useAuth já verifica e restaura sessão automaticamente
    const initializeApp = async () => {
      try {
        console.log('🚀 Inicializando aplicação...');
        
        // ✅ Limpar chaves obsoletas/legadas
        console.log('🧹 Limpando chaves obsoletas do localStorage...');
        localStorage.removeItem('industrack_session'); // Chave antiga
        localStorage.removeItem('industrack_device_id'); // Não mais usado
        
        // Para modo admin, ainda verificamos sessão Supabase
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          console.log('📧 Sessão admin Supabase detectada');
          checkMachine();
          setInitialLoading(false);
          return;
        }

        // ✅ SIMPLIFICADO: Carregar máquina salva
        const savedMachine = machineStorage.getCurrentMachine();
        
        if (savedMachine) {
          console.log('✅ Máquina salva encontrada:', savedMachine.nome);
          setCurrentMachine(savedMachine);
        } else {
          console.log('📋 Nenhuma máquina salva encontrada');
        }
        
      } catch (error) {
        console.error('❌ Erro na inicialização:', error);
      } finally {
        setInitialLoading(false);
        console.log('✅ Inicialização do App concluída');
      }
    };

    initializeApp();

    // ✅ NOVO: Listener apenas para modo admin (compatibilidade temporária)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') {
        console.log('📧 Login admin Supabase detectado');
        checkMachine();
      } else if (event === 'SIGNED_OUT') {
        console.log('📧 Logout Supabase detectado');
        setCurrentMachine(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkSession = async () => {
    // ✅ REMOVIDA: Função não mais necessária, mantida apenas para compatibilidade
    console.log('⚠️ checkSession chamada - funcionalidade migrada para useAuth');
  };

  const checkMachine = async () => {
    try {
      // ✅ NOVO: Usar localStorage ao invés de Supabase para verificar máquina
      const savedMachine = machineStorage.getCurrentMachine();
      if (savedMachine) {
        console.log('✅ Máquina encontrada no localStorage:', savedMachine.nome);
        setCurrentMachine(savedMachine);
      } else {
        console.log('📋 Nenhuma máquina no localStorage, abrindo configurações');
        setShowSettings(true);
      }
      
      // ❌ REMOVIDO: Consulta device_machine desnecessária
      // Mantemos apenas para compatibilidade com modo admin se necessário
      
    } catch (err) {
      console.error('Error checking machine:', err);
      setShowSettings(true);
    }
  };

  const handleMachineSelect = async (machine: Machine) => {
    // ✅ NOVO: Salvar máquina selecionada no localStorage
    machineStorage.saveCurrentMachine(machine);
    setCurrentMachine(machine);
    setShowSettings(false);
    // ✅ NOVO: Limpar estados para permitir novo login
    setPin('');
    setSuccess(false);
    setSearchingMachines(false);
  };

  const handleNumberClick = (number: string) => {
    const maxLength = twoOperators ? 8 : 4;
    if (pin.length < maxLength && !isLoading && !success && !searchingMachines) {
      setPin(prev => prev + number);
    }
  };

  const handleDelete = () => {
    setPin(prev => prev.slice(0, -1));
    setSuccess(false);
    // ✅ NOVO: Error e secondaryOperator agora são gerenciados pelo useAuth
  };

  const handleToggleChange = (newValue: boolean) => {
    setTwoOperators(newValue);
    setPin('');
    setSuccess(false);
    // ✅ NOVO: Error e secondaryOperator agora são gerenciados pelo useAuth
  };

  // ✅ NOVO: Função para revelar botão escondido (toque triplo no logo)
  const handleLogoClick = () => {
    setLogoClickCount(prev => {
      const newCount = prev + 1;
      
      // Resetar contador após 2 segundos
      setTimeout(() => setLogoClickCount(0), 2000);
      
      // Revelar botão após 3 toques
      if (newCount === 3) {
        setShowHiddenButton(true);
        console.log('🔓 Botão de seleção de máquina revelado!');
        
        // Esconder botão automaticamente após 10 segundos
        setTimeout(() => setShowHiddenButton(false), 10000);
      }
      
      return newCount;
    });
  };

  // ✅ NOVO: Navegar diretamente para seleção de máquinas
  const handleGoToMachineSelection = () => {
    console.log('🔘 Botão clicado - iniciando navegação...');
    setShowSettings(true);
    setShowHiddenButton(false);
    setPin('');
    setSuccess(false);
    setSearchingMachines(false);
    console.log('⚙️ Estados atualizados - navegando para seleção de máquinas...');
    console.log('📊 showSettings:', true, 'isAuthenticated:', isAuthenticated);
  };

  // ✅ NOVA função de login usando API REST
  const handleLogin = async () => {
    try {
      console.log('🔐 Iniciando login via API REST');

      // Verificar se é modo admin (PIN 5777) - manter compatibilidade temporária
      const primaryPin = pin.slice(0, 4);
      if (primaryPin === '5777') {
        console.log('⚠️ Modo admin (5777) - mantendo fluxo Supabase temporariamente');
        
        try {
          const credentials = await decryptCredentials('5777');
          const { error: loginError } = await supabase.auth.signInWithPassword({
            email: credentials.email,
            password: credentials.password,
          });

          if (loginError) {
            throw new Error('Erro ao acessar modo admin');
          }

          setSuccess(true);
          setTimeout(() => {
            checkMachine(); // ✅ MANTIDO: Ainda necessário para modo admin
          }, 1000);
          return;
        } catch (adminError) {
          console.error('Erro no modo admin:', adminError);
          throw new Error('PIN admin inválido');
        }
      }

      // ✅ NOVO: Garantir que temos ID da máquina antes do login
      let machineToUse = currentMachine;
      
      if (!machineToUse?.id_maquina) {
        console.log('📋 ID da máquina não disponível. Buscando lista de máquinas...');
        
        try {
          setSearchingMachines(true);
          const ensuredMachine = await machineStorage.ensureMachineId();
          if (ensuredMachine) {
            machineToUse = ensuredMachine;
            setCurrentMachine(ensuredMachine);
          } else {
            // Múltiplas máquinas encontradas - abrir tela de seleção
            console.log('📋 Múltiplas máquinas encontradas. Abrindo tela de seleção...');
            setShowSettings(true);
            setPin(''); // Limpar PIN para que usuário digite novamente após selecionar
            return; // ✅ SAIR SEM ERRO - não tentar fazer login ainda
          }
        } catch (machineError) {
          console.error('❌ Erro ao buscar máquinas:', machineError);
          throw new Error('Erro ao buscar lista de máquinas');
        } finally {
          setSearchingMachines(false);
        }
      }

      // ✅ VALIDAÇÃO FINAL: Garantir que temos ID da máquina válido
      if (!machineToUse?.id_maquina) {
        console.error('❌ ID da máquina ainda não disponível após busca');
        throw new Error('ID da máquina não disponível. Selecione uma máquina nas configurações.');
      }

      // ✅ Login via API REST com ID da máquina
      console.log('🔍 Dados para login:', {
        pin: '****',
        twoOperators,
        id_maquina: machineToUse?.id_maquina,
        machineToUse_exists: !!machineToUse,
        machine_name: machineToUse?.nome
      });

      const result = await login({
        pin,
        twoOperators,
        id_maquina: machineToUse?.id_maquina
      });

      if (result.success) {
        console.log('✅ Login realizado com sucesso via API REST');
        setSuccess(true);
        // ✅ REMOVIDO: checkMachine() - máquina já está definida antes do login
        // A máquina já foi verificada/selecionada antes de chegar aqui
      } else {
        throw new Error(result.error || 'Erro no login');
      }

    } catch (err) {
      console.error('❌ Erro no login:', err);
      setPin('');
      setSuccess(false);
    }
  };

  React.useEffect(() => {
    const expectedLength = twoOperators ? 8 : 4;
    if (pin.length === expectedLength) {
      handleLogin();
    }
  }, [pin, twoOperators]);

  // 🧪 Página de teste SSE (atalho: Ctrl+Shift+S)
  if (showTestSSE) {
    return (
      <div>
        <button
          onClick={() => setShowTestSSE(false)}
          className="fixed top-4 right-4 z-50 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold"
        >
          ✖️ Fechar Teste SSE
        </button>
        <TestSSE />
      </div>
    );
  }

  // 🧪 Página de teste Contexto Inicial (atalho: Ctrl+Shift+C)
  if (showTestContexto) {
    return (
      <div>
        <button
          onClick={() => setShowTestContexto(false)}
          className="fixed top-4 right-4 z-50 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold"
        >
          ✖️ Fechar Teste Contexto
        </button>
        <TestContextoInicial />
      </div>
    );
  }

  // 🧪 Página de diagnóstico (atalho: Ctrl+Shift+D)
  if (showDiagnostico) {
    return (
      <div>
        <button
          onClick={() => setShowDiagnostico(false)}
          className="fixed top-4 right-4 z-50 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold"
        >
          ✖️ Fechar Diagnóstico
        </button>
        <DiagnosticoConexao />
      </div>
    );
  }

  // ✅ Aguardar tanto o useAuth quanto a inicialização do App
  if (initialLoading || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-900 flex items-center justify-center">
        <div className="flex items-center gap-3 text-white">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Carregando...</span>
        </div>
      </div>
    );
  }

  // ✅ NOVO: Permitir Settings mesmo sem autenticação (para seleção de máquinas)
  if (showSettings) {
    return <Settings 
      onBack={() => {
        setShowSettings(false);
        setPin('');
        setSuccess(false);
        setSearchingMachines(false);
      }} 
      onMachineSelect={handleMachineSelect} 
    />;
  }

  // ✅ Se autenticado E tem máquina, mostrar dashboard
  if (isAuthenticated && currentMachine && !showSettings) {
    return (
      <MachineSelection 
        initialMachine={currentMachine} 
        onShowSettings={() => setShowSettings(true)}
        secondaryOperator={secondaryOperator}
        operator={operator}
      />
    );
  }

  // ✅ Se autenticado mas sem máquina, ir para seleção
  if (isAuthenticated && !currentMachine) {
    return <Settings onBack={() => {}} onMachineSelect={handleMachineSelect} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-900 flex flex-col items-center justify-center p-4">
      {/* ✅ NOVO: Indicador de modo desenvolvedor */}
      {showHiddenButton && (
        <div className="fixed top-4 right-4 bg-orange-600 text-white px-3 py-1 rounded-full text-xs font-semibold animate-pulse">
          🔧 DEV MODE
        </div>
      )}
      
      <div className="flex flex-col items-center mb-8 bg-black/20 px-8 py-6 rounded-2xl backdrop-blur-sm relative">
        <img 
          src="https://oixnkjcvkfdimwoikzgl.supabase.co/storage/v1/object/public/Industrack//industrack_versao_dark.svg"
          alt="Industrack Logo"
          className={`h-16 mb-6 cursor-pointer select-none transition-all duration-200 ${
            logoClickCount > 0 ? 'scale-110 brightness-125' : 'hover:scale-105'
          }`}
          onClick={handleLogoClick}
          title="Clique 3x para revelar opções"
        />
        <h1 
          className={`text-4xl font-bold text-white tracking-tight cursor-pointer select-none transition-all duration-200 ${
            logoClickCount > 0 ? 'scale-105 text-orange-200' : ''
          }`}
          onClick={handleLogoClick}
        >
          Operador - {getCompanyName()}
        </h1>
        
        {/* ✅ NOVO: Indicador visual de toques */}
        {logoClickCount > 0 && (
          <div className="flex gap-1 mt-2 mb-1">
            {[1, 2, 3].map(i => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  i <= logoClickCount ? 'bg-orange-400' : 'bg-gray-600'
                }`}
              />
            ))}
          </div>
        )}
        
        <p className="text-blue-200 text-center mt-2">
          {logoClickCount > 0 && logoClickCount < 3 
            ? `Clique mais ${3 - logoClickCount}x no logo` 
            : twoOperators ? 'Login com 2 Operadores' : 'Login com 1 Operador'
          }
        </p>
        
        {/* Toggle Switch */}
        <div className="flex items-center justify-center gap-3 mt-4">
          <span className={`text-sm transition-colors ${!twoOperators ? 'text-white' : 'text-blue-300'}`}>
            1 Operador
          </span>
          <button
            onClick={() => handleToggleChange(!twoOperators)}
            className={`
              relative inline-flex h-6 w-11 items-center rounded-full transition-colors
              ${twoOperators ? 'bg-blue-500' : 'bg-gray-600'}
              focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2
            `}
          >
            <span
              className={`
                inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                ${twoOperators ? 'translate-x-6' : 'translate-x-1'}
              `}
            />
          </button>
          <span className={`text-sm transition-colors ${twoOperators ? 'text-white' : 'text-blue-300'}`}>
            2 Operadores
          </span>
        </div>
        
        <p className="text-blue-300 text-center mt-2 text-xs">
          {twoOperators 
            ? 'Primeiros 4: Operador Principal | Últimos 4: Operador Secundário'
            : 'Digite o PIN de 4 dígitos do operador'
          }
        </p>
      </div>

      <div className={`bg-white/10 rounded-3xl backdrop-blur-sm flex flex-col items-center shadow-2xl border border-white/20 ${
        twoOperators ? 'max-w-2xl w-full p-10' : 'max-w-md w-full p-8'
      }`}>
        <div className={`flex mb-8 ${
          twoOperators ? 'gap-4' : 'gap-3'
        }`}>
          {[...Array(twoOperators ? 8 : 4)].map((_, i) => (
            <div
              key={i}
              className={`
                ${twoOperators ? 'w-14 h-14' : 'w-12 h-12'} 
                rounded-full flex items-center justify-center text-xl font-bold
                ${pin[i] 
                  ? 'bg-gradient-to-br from-white to-white/90 text-blue-900 ring-white/50' 
                  : 'bg-gradient-to-br from-white/20 to-white/10 ring-white/30'
                }
                ${success ? 'bg-gradient-to-br from-green-500 to-green-600 text-white ring-green-400/50' : ''}
                ${twoOperators && i >= 4 ? 'ring-2 ring-blue-400/50' : ''}
                transition-all duration-200 shadow-lg
                ${pin[i] ? 'scale-110' : 'scale-100'}
                ring-2
              `}
            >
              {success ? <CheckCircle2 className={`${twoOperators ? 'w-7 h-7' : 'w-6 h-6'}`} /> : (pin[i] ? '•' : '')}
            </div>
          ))}
        </div>

        {(isLoading || searchingMachines) && (
          <div className="mb-6 text-white flex items-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>{searchingMachines ? 'Buscando máquinas...' : 'Verificando...'}</span>
          </div>
        )}

        {error && (
          <div className="mb-6 text-red-300 text-center animate-shake">
            {error}
          </div>
        )}

        {secondaryOperator && twoOperators && (
          <div className="mb-6 bg-blue-500/20 border border-blue-400/50 rounded-lg p-3 text-center">
            <p className="text-blue-200 text-sm">Operador Secundário:</p>
            <p className="text-white font-semibold">{secondaryOperator.nome}</p>
          </div>
        )}

        {/* ✅ NOVO: Botão escondido para seleção de máquinas */}
        {showHiddenButton && (
          <button
            onClick={handleGoToMachineSelection}
            className="mb-4 px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-semibold 
                     transition-all duration-200 animate-pulse shadow-lg border-2 border-orange-400"
          >
            ⚙️ Selecionar Máquina
          </button>
        )}

        <NumPad
          onNumberClick={handleNumberClick}
          onDelete={handleDelete}
          className={`mt-6 ${
            twoOperators ? 'scale-110' : 'scale-105'
          }`}
          disabled={isLoading || success || searchingMachines}
        />
      </div>
    </div>
  );
}

export default App;
