import React from 'react';
import { useState, useEffect } from 'react';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { NumPad } from './components/NumPad';
import { MachineSelection } from './pages/MachineSelection';
import { Settings } from './pages/Settings';
import { supabase, handleJWTError } from './lib/supabase';
import { decryptCredentials } from './lib/crypto';
import { useWakeLock } from './hooks/useWakeLock';
import { getDeviceId } from './lib/device';
import type { Machine } from './types/machine';

function App() {
  const [pin, setPin] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [currentMachine, setCurrentMachine] = useState<Machine | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [secondaryOperator, setSecondaryOperator] = useState<{ id: number; nome: string } | null>(null);
  const [twoOperators, setTwoOperators] = useState(false);
  useWakeLock();

  useEffect(() => {
    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') {
        setAuthenticated(true);
        checkMachine();
      } else if (event === 'SIGNED_OUT') {
        setAuthenticated(false);
        setCurrentMachine(null);
        setSecondaryOperator(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkSession = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      setAuthenticated(true);
      checkMachine();
    }
    setInitialLoading(false);
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
    if (pin.length < maxLength && !loading && !success) {
      setPin(prev => prev + number);
    }
  };

  const handleDelete = () => {
    setPin(prev => prev.slice(0, -1));
    setError('');
    setSuccess(false);
    setSecondaryOperator(null);
  };

  const handleToggleChange = (newValue: boolean) => {
    setTwoOperators(newValue);
    setPin('');
    setError('');
    setSuccess(false);
    setSecondaryOperator(null);
  };

  const handleLogin = async () => {
    try {
      setLoading(true);
      setError('');
      setSecondaryOperator(null);

      const expectedLength = twoOperators ? 8 : 4;
      if (pin.length !== expectedLength) {
        throw new Error(`PIN deve ter ${expectedLength} dígitos`);
      }

      const primaryPin = pin.slice(0, 4);
      const secondaryPin = twoOperators ? pin.slice(4, 8) : null;

      console.log('Iniciando login com PINs:', { primaryPin, secondaryPin, twoOperators });

      // Verificar se é modo admin (PIN 5777)
      if (primaryPin === '5777') {
        console.log('Modo admin ativado com PIN 5777');
        
        try {
          // Usar o PIN 5777 para descriptografar as credenciais reais do admin
          const credentials = await decryptCredentials('5777');
          console.log('Credenciais admin descriptografadas:', { email: credentials.email });

          const { error: loginError } = await supabase.auth.signInWithPassword({
            email: credentials.email,
            password: credentials.password,
          });

          if (loginError) {
            console.error('Erro no login admin:', loginError);
            throw new Error('Erro ao acessar modo admin');
          }

          console.log('Modo admin ativado com sucesso');
          setSuccess(true);
          setTimeout(() => {
            setAuthenticated(true);
            checkMachine();
          }, 1000);
          return;
        } catch (adminError) {
          console.error('Erro ao descriptografar credenciais admin:', adminError);
          throw new Error('PIN admin inválido ou credenciais não encontradas');
        }
      }

      // Login normal com PIN primário
      const credentials = await decryptCredentials(primaryPin);
      console.log('Credenciais descriptografadas:', { email: credentials.email });

      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      });

      if (loginError) {
        console.error('Erro no login:', loginError);
        throw loginError;
      }

      // Verificar se há segundo operador
      if (twoOperators && secondaryPin && secondaryPin.length === 4) {
        try {
          console.log('=== INÍCIO BUSCA SEGUNDO OPERADOR ===');
          console.log('PIN secundário:', secondaryPin);
          console.log('twoOperators:', twoOperators);
          
          // Verificar se o PIN secundário é válido antes de buscar
          if (secondaryPin === '0000' || secondaryPin === '00000000') {
            console.log('PIN secundário é zero - pulando busca do segundo operador');
          } else {
            // Buscar o segundo operador diretamente na tabela operator_fast_acess
            console.log('Buscando operador na tabela operator_fast_acess por PIN:', secondaryPin);
            const { data: fastAccessData, error: fastAccessError } = await supabase
              .from('operator_fast_acess')
              .select('operador')
              .eq('PIN', parseInt(secondaryPin))
              .single();

            console.log('Resultado da busca em operator_fast_acess:', { fastAccessData, fastAccessError });

            if (fastAccessError) {
              console.log('Segundo operador não encontrado em operator_fast_acess:', fastAccessError);
              // Continua sem segundo operador
            } else if (fastAccessData?.operador) {
              // Buscar os dados completos do operador
              console.log('Buscando dados completos do operador ID:', fastAccessData.operador);
              const { data: operatorData, error: operatorError } = await supabase
                .from('operador')
                .select('id, nome')
                .eq('id', fastAccessData.operador)
                .eq('Delete', false)
                .single();

              console.log('Resultado da busca do operador:', { operatorData, operatorError });

              if (operatorError) {
                console.log('Erro ao buscar dados do operador:', operatorError);
                // Continua sem segundo operador
              } else {
                setSecondaryOperator(operatorData);
                console.log('Segundo operador definido no estado:', operatorData);
                console.log('Estado secondaryOperator após set:', operatorData);
              }
            } else {
              console.log('PIN secundário não tem operador associado');
              // Continua sem segundo operador
            }
          }
        } catch (secondaryErr) {
          console.log('Erro ao buscar segundo operador:', secondaryErr);
          // Continua sem segundo operador
        }
        console.log('=== FIM BUSCA SEGUNDO OPERADOR ===');
      } else {
        console.log('Não há segundo operador:', { twoOperators, secondaryPin });
      }

      console.log('Login realizado com sucesso');
      setSuccess(true);
      setTimeout(() => {
        setAuthenticated(true);
        checkMachine();
      }, 1000);
    } catch (err) {
      console.error('Erro completo no login:', err);
      setError(err instanceof Error ? err.message : 'Erro ao fazer login');
      setPin('');
      setSuccess(false);
      setSecondaryOperator(null);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    const expectedLength = twoOperators ? 8 : 4;
    if (pin.length === expectedLength) {
      handleLogin();
    }
  }, [pin, twoOperators]);

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

  if (authenticated) {
    if (showSettings) {
      return <Settings onBack={() => setShowSettings(false)} onMachineSelect={handleMachineSelect} />;
    }
    
    if (currentMachine) {
      return (
        <MachineSelection 
          initialMachine={currentMachine} 
          onShowSettings={() => setShowSettings(true)}
          secondaryOperator={secondaryOperator}
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

        {loading && (
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
          disabled={loading || success}
        />
      </div>
    </div>
  );
}

export default App;
