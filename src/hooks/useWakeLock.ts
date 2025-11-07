import { useEffect, useRef } from 'react';

export function useWakeLock() {
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const useFallback = useRef<boolean>(false);
  const userInteracted = useRef<boolean>(false);
  const fallbackEnabled = useRef<boolean>(false);

  // Função para criar e ativar vídeo invisível (fallback para navegadores sem Wake Lock API)
  const enableVideoFallback = async () => {
    if (videoRef.current && fallbackEnabled.current) return; // Já existe e está ativo

    console.log('🎥 Ativando fallback com vídeo invisível...');

    // Criar vídeo invisível se não existir
    if (!videoRef.current) {
      const video = document.createElement('video');
      video.setAttribute('title', 'NoSleep');
      video.setAttribute('playsinline', '');
      video.setAttribute('muted', '');
      video.setAttribute('loop', '');
      video.style.position = 'fixed';
      video.style.left = '-100%';
      video.style.top = '-100%';
      video.style.width = '1px';
      video.style.height = '1px';
      video.style.opacity = '0.01';
      video.style.pointerEvents = 'none';

      // Vídeo em base64 (WebM vazio de 1 segundo)
      const webmData = 'data:video/webm;base64,GkXfo59ChoEBQveBAULygQRC84EIQoKEd2VibUKHgQRChYECGFOAZwH/////////FUmpZpkq17GDD0JATYCGQ2hyb21lV0GGQ2hyb21lFlSua7+uvdeBAXPFh1WGQ2hyb29tZWVLgYB3ZWJtYWRrV0GGQ2hyb21lV0GGQ2hyb2mBlSIBFiEBAQoYDCkBAVSub7////////w8AQAAAGAAAABj1WGQVSAQAd/////AwAAAAAAABP1WGQVSAQAf/////jAAAAUV1BUGGrldBl0BPQAAAAAAJVgBAVSub//////////AQAABP1WGQVSAQAAAAAA////////nAAAABTUEAYbsFVwBAVSub/////////+DAAAAAAAFFQQBhuwVXAEBVK5v//////////0AAAAAU1BAGG7BVcAQFUrm/////////+cAAAAABRYEAY';

      video.src = webmData;
      document.body.appendChild(video);
      videoRef.current = video;
    }

    // Só tentar reproduzir se o usuário já interagiu
    if (!userInteracted.current) {
      console.log('⏸️ Aguardando interação do usuário para ativar fallback...');
      return;
    }

    // Tentar reproduzir o vídeo
    try {
      await videoRef.current.play();
      fallbackEnabled.current = true;
      console.log('✅ Vídeo fallback ativado - tela permanecerá ligada');
    } catch (err) {
      console.error('❌ Erro ao ativar vídeo fallback:', err);
      fallbackEnabled.current = false;
    }
  };

  // Função para desativar vídeo fallback
  const disableVideoFallback = () => {
    if (videoRef.current) {
      try {
        videoRef.current.pause();
        videoRef.current.remove();
      } catch (e) {
        console.debug('Erro ao remover vídeo:', e);
      }
      videoRef.current = null;
      fallbackEnabled.current = false;
      console.log('🛑 Vídeo fallback desativado');
    }
  };

  // Função para tentar usar Wake Lock API
  const acquireWakeLock = async () => {
    // Se já está usando fallback, não tentar Wake Lock
    if (useFallback.current) {
      return null;
    }

    try {
      // Verificar se Wake Lock API está disponível
      if (!('wakeLock' in navigator)) {
        console.warn('⚠️ Wake Lock API não suportada - usando fallback');
        useFallback.current = true;
        enableVideoFallback();
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
      
      console.log('✅ Wake Lock API ativado - tela permanecerá ligada');

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
      // Se falhar, usar fallback
      console.log('🔄 Mudando para fallback com vídeo...');
      useFallback.current = true;
      enableVideoFallback();
      return null;
    }
  };

  useEffect(() => {
    console.log('🔒 Inicializando sistema de Wake Lock...');

    // Função para lidar com primeira interação do usuário
    const handleFirstInteraction = async () => {
      if (!userInteracted.current) {
        console.log('👆 Primeira interação detectada');
        userInteracted.current = true;
        
        // Se estamos usando fallback, tentar ativar agora
        if (useFallback.current) {
          await enableVideoFallback();
        }
      }
    };

    // Função para lidar com mudanças de visibilidade
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        console.log('👀 Página visível - ativando Wake Lock');
        if (useFallback.current) {
          await enableVideoFallback();
        } else {
          await acquireWakeLock();
        }
      } else {
        console.log('🙈 Página oculta - Wake Lock será liberado automaticamente');
        if (useFallback.current) {
          disableVideoFallback();
        }
      }
    };

    // Listeners para detectar primeira interação
    const interactionEvents = ['click', 'touchstart', 'keydown'];
    interactionEvents.forEach(event => {
      document.addEventListener(event, handleFirstInteraction, { once: true, passive: true });
    });

    // Requisitar wake lock inicial
    acquireWakeLock();

    // Re-requisitar wake lock quando a página voltar a ficar visível
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Tentar manter wake lock ativo a cada 30 segundos (redundância)
    const keepAliveInterval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        if (useFallback.current && !videoRef.current) {
          console.log('🔄 Verificação periódica - reativando fallback');
          enableVideoFallback();
        } else if (!useFallback.current && !wakeLockRef.current) {
          console.log('🔄 Verificação periódica - reativando Wake Lock');
          acquireWakeLock();
        }
      }
    }, 30000);

    // Cleanup
    return () => {
      console.log('🧹 Limpando Wake Lock...');
      
      // Remover listeners de interação
      interactionEvents.forEach(event => {
        document.removeEventListener(event, handleFirstInteraction);
      });
      
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(keepAliveInterval);
      
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(console.debug);
        wakeLockRef.current = null;
      }
      
      disableVideoFallback();
    };
  }, []);

  // Retornar função para forçar reativação manual se necessário
  return {
    reacquire: acquireWakeLock
  };
}
