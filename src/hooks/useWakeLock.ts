import { useEffect, useRef } from 'react';

export function useWakeLock() {
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  const acquireWakeLock = async () => {
    try {
      // Verificar se Wake Lock API está disponível
      if (!('wakeLock' in navigator)) {
        console.warn('⚠️ Wake Lock API não suportada neste navegador');
        return null;
      }

      // Só requisitar se a página estiver visível
      if (document.visibilityState !== 'visible') {
        console.log('📱 Página não visível, Wake Lock será requisitado quando voltar');
        return null;
      }

      // Liberar wake lock anterior se existir
      if (wakeLockRef.current) {
        try {
          await wakeLockRef.current.release();
          wakeLockRef.current = null;
        } catch (e) {
          console.debug('Erro ao liberar Wake Lock anterior:', e);
        }
      }

      // Requisitar novo wake lock
      const wakeLock = await navigator.wakeLock.request('screen');
      wakeLockRef.current = wakeLock;
      
      console.log('✅ Wake Lock ativado - tela permanecerá ligada');

      // Listener para quando o wake lock for liberado
      wakeLock.addEventListener('release', () => {
        console.log('⚠️ Wake Lock foi liberado - tentando reativar...');
        wakeLockRef.current = null;
        // Tentar reativar automaticamente
        setTimeout(() => {
          if (document.visibilityState === 'visible') {
            acquireWakeLock();
          }
        }, 1000);
      });

      return wakeLock;
    } catch (err: any) {
      console.error('❌ Erro ao requisitar Wake Lock:', err?.message || err);
      // Se falhar, tentar novamente em 5 segundos
      setTimeout(() => {
        if (document.visibilityState === 'visible') {
          acquireWakeLock();
        }
      }, 5000);
      return null;
    }
  };

  useEffect(() => {
    console.log('🔒 Inicializando sistema de Wake Lock...');

    // Função para lidar com mudanças de visibilidade
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        console.log('👀 Página visível - ativando Wake Lock');
        await acquireWakeLock();
      } else {
        console.log('🙈 Página oculta - Wake Lock será liberado automaticamente');
      }
    };

    // Requisitar wake lock inicial
    acquireWakeLock();

    // Re-requisitar wake lock quando a página voltar a ficar visível
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Tentar manter wake lock ativo a cada 30 segundos (redundância)
    const keepAliveInterval = setInterval(() => {
      if (document.visibilityState === 'visible' && !wakeLockRef.current) {
        console.log('🔄 Verificação periódica - reativando Wake Lock');
        acquireWakeLock();
      }
    }, 30000);

    // Cleanup
    return () => {
      console.log('🧹 Limpando Wake Lock...');
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(keepAliveInterval);
      
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(console.debug);
        wakeLockRef.current = null;
      }
    };
  }, []);

  // Retornar função para forçar reativação manual se necessário
  return {
    reacquire: acquireWakeLock
  };
}