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
import { getDeviceId } from './lib/device';
import { useAuth } from './hooks/useAuth';
import type { Machine } from './types/machine';

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
  
  // ✅ NOVO: Usando hook de autenticação da API REST
  const { isAuthenticated, operator, secondaryOperator, isLoading, error, login, logout } = useAuth();
  
  useWakeLock();

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
    // ✅ NOVO: Verificação simplificada - apenas carregar máquina se necessário
    const initializeApp = async () => {
      // Para modo admin, ainda verificamos sessão Supabase
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        console.log('📧 Sessão admin Supabase detectada');
        checkMachine();
      }
      setInitialLoading(false);
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
      const deviceId = await getDeviceId();
      const { data, error } = await supabase
        .from('device_machine')
        .select('id_maquina, Maquinas!inner(*)')
        .eq('device_id', deviceId)
        .eq('active', true)
        .single();

      if (error) {
        const isJWTError = await handleJWTError(error);
        if (isJWTError) return;
        throw error;
      }

      if (data?.Maquinas) {
        setCurrentMachine(data.Maquinas as unknown as Machine);
      } else {
        setShowSettings(true);
      }
    } catch (err) {
      console.error('Error checking machine:', err);
      setShowSettings(true);
    }
  };

  const handleMachineSelect = async (machine: Machine) => {
    setCurrentMachine(machine);
    setShowSettings(false);
  };

  const handleNumberClick = (number: string) => {
    const maxLength = twoOperators ? 8 : 4;
    if (pin.length < maxLength && !isLoading && !success) {
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
            checkMachine();
          }, 1000);
          return;
        } catch (adminError) {
          console.error('Erro no modo admin:', adminError);
          throw new Error('PIN admin inválido');
        }
      }

      // ✅ Login via API REST 
      const result = await login({
        pin,
        twoOperators,
        id_maquina: currentMachine?.id_maquina
      });

      if (result.success) {
        console.log('✅ Login realizado com sucesso via API REST');
        setSuccess(true);
        setTimeout(() => {
          checkMachine();
        }, 1000);
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

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-900 flex items-center justify-center">
        <div className="flex items-center gap-3 text-white">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Carregando...</span>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    if (showSettings) {
      return <Settings onBack={() => setShowSettings(false)} onMachineSelect={handleMachineSelect} />;
    }
    
    if (currentMachine) {
      return (
        <MachineSelection 
          initialMachine={currentMachine} 
          onShowSettings={() => setShowSettings(true)}
          secondaryOperator={secondaryOperator}
          operator={operator} // ✅ NOVO: Passando dados do operador da API REST
        />
      );
    }

    return <Settings onBack={() => {}} onMachineSelect={handleMachineSelect} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-900 flex flex-col items-center justify-center p-4">
      <div className="flex flex-col items-center mb-8 bg-black/20 px-8 py-6 rounded-2xl backdrop-blur-sm">
        <img 
          src="https://oixnkjcvkfdimwoikzgl.supabase.co/storage/v1/object/public/Industrack//industrack_versao_dark.svg"
          alt="Industrack Logo"
          className="h-16 mb-6"
        />
        <h1 className="text-4xl font-bold text-white tracking-tight">Operador - Mould</h1>
        <p className="text-blue-200 text-center mt-2">
          {twoOperators ? 'Login com 2 Operadores' : 'Login com 1 Operador'}
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

        {isLoading && (
          <div className="mb-6 text-white flex items-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Verificando...</span>
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

        <NumPad
          onNumberClick={handleNumberClick}
          onDelete={handleDelete}
          className={`mt-6 ${
            twoOperators ? 'scale-110' : 'scale-105'
          }`}
          disabled={isLoading || success}
        />
      </div>
    </div>
  );
}

export default App;
