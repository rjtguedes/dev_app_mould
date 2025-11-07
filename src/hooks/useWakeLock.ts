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

      // MP4 em base64 (vídeo vazio de 1 segundo - melhor compatibilidade)
      const mp4Data = 'data:video/mp4;base64,AAAAIGZ0eXBpc29tAAACAGlzb21pc28yYXZjMW1wNDEAAAAIZnJlZQAAAu1tZGF0AAACrgYF//+q3EXpvebZSLeWLNgg2SPu73gyNjQgLSBjb3JlIDE0OCByMjc0MyA1Yzg1ZTBlIC0gSC4yNjQvTVBFRy00IEFWQyBjb2RlYyAtIENvcHlsZWZ0IDIwMDMtMjAxNSAtIGh0dHA6Ly93d3cudmlkZW9sYW4ub3JnL3gyNjQuaHRtbCAtIG9wdGlvbnM6IGNhYmFjPTEgcmVmPTMgZGVibG9jaz0xOjA6MCBhbmFseXNlPTB4MzoweDExMyBtZT1oZXggc3VibWU9NyBwc3k9MSBwc3lfcmQ9MS4wMDowLjAwIG1peGVkX3JlZj0xIG1lX3JhbmdlPTE2IGNocm9tYV9tZT0xIHRyZWxsaXM9MSA4eDhkY3Q9MSBjcW09MCBkZWFkem9uZT0yMSwxMSBmYXN0X3Bza2lwPTEgY2hyb21hX3FwX29mZnNldD0tMiB0aHJlYWRzPTMgbG9va2FoZWFkX3RocmVhZHM9MSBzbGljZWRfdGhyZWFkcz0wIG5yPTAgZGVjaW1hdGU9MSBpbnRlcmxhY2VkPTAgYmx1cmF5X2NvbXBhdD0wIGNvbnN0cmFpbmVkX2ludHJhPTAgYmZyYW1lcz0zIGJfcHlyYW1pZD0yIGJfYWRhcHQ9MSBiX2JpYXM9MCBkaXJlY3Q9MSB3ZWlnaHRiPTEgb3Blbl9nb3A9MCB3ZWlnaHRwPTIga2V5aW50PTI1MCBrZXlpbnRfbWluPTEgc2NlbmVjdXQ9NDAgaW50cmFfcmVmcmVzaD0wIHJjX2xvb2thaGVhZD00MCByYz1jcmYgbWJ0cmVlPTEgY3JmPTI4LjAgcWNvbXA9MC42MCBxcG1pbj0wIHFwbWF4PTY5IHFwc3RlcD00IGlwX3JhdGlvPTEuNDAgYXE9MToxLjAwAIAAAAARZYiEACD/2lu4PtiAGCZiIAAAAwRBmiQAX/+64b7gAB3CAANzgQgeqL/+i8lEAAAAA0GaJABf/6f+gAB3CAAAAwRBmiQAX/+n/oAAd4AAADJQZpoAF//6MsEV8AAAABxBmmgAX/+n/oAAd4EAAAAcQZ5oAF//p/6AAAADG0GeaABf/6f+gAA3gAAAAxtBnoQAX/+n/oAANZkAAAAYQZ6kAF//p/6AAAACR0GapABf/6f+gAACf0wAAAAcQZ7EAF//p/6AAAJZTAAAAB0GexgAX/+n/oAAAltEAAAAHEGe5gBf/6f+gAACS0QAAAACAG00ZXRhAAAAAAAAACFoZGxyAAAAAAAAAABtZGlyYXBwbAAAAAAAAAAAAAAAAC1pbHN0AAAAJal0b28AAAAdZGF0YQAAAAEAAAAATGF2ZjU2LjQwLjEwMQ==';

      video.src = mp4Data;
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
      
      // Tentar abordagem alternativa com áudio silencioso
      console.log('🔊 Tentando fallback com áudio silencioso...');
      try {
        const audio = document.createElement('audio');
        audio.setAttribute('loop', '');
        audio.style.display = 'none';
        
        // Áudio silencioso em base64 (MP3 vazio)
        const silentAudio = 'data:audio/mp3;base64,//uQxAAAAAAAAAAAAAAAAAAAAAAASW5mbwAAAA8AAAACAAABhgC7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7//////////////////////////////////////////////////////////////////8AAAA5TEFNRTMuMTAwAZYAAAAAAAAAABQ4JAMGQgAAOAAABYZMTEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//sUxAAADEABOCc0gAIAAA0gAAAABAQBAUExQSGDwIA8GBwOB+f/Ig4Ghg4PA/+fgw+DAPg4ODgYB8H/w4GAf/gYB4HAYBwOBwOBw//8xIEAf/g4B4OAf/g4ODgH/w4OA//5xIEASCgkBASCQkBASDg4JB/84OAf/g4H/84P///84B///5wD///OAf///OD///+f///////w';
        
        audio.src = silentAudio;
        document.body.appendChild(audio);
        
        await audio.play();
        
        // Substituir videoRef por audioRef para limpeza posterior
        if (videoRef.current) {
          videoRef.current.remove();
        }
        videoRef.current = audio as any;
        fallbackEnabled.current = true;
        console.log('✅ Áudio fallback ativado - tela permanecerá ligada');
      } catch (audioErr) {
        console.error('❌ Fallback com áudio também falhou:', audioErr);
        console.warn('⚠️ Não foi possível manter a tela ativa automaticamente');
        console.warn('💡 Dica: Verifique as configurações do navegador ou use HTTPS');
        fallbackEnabled.current = false;
      }
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
        console.warn('⚠️ Wake Lock API não suportada neste navegador');
        console.info('ℹ️ PWA em HTTP - usando fallback automático');
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
      // Wake Lock falhou (comum em HTTP)
      const errorMsg = err?.message || err;
      console.warn('⚠️ Wake Lock não disponível:', errorMsg);
      
      // Verificar se é problema de contexto seguro (HTTP)
      if (errorMsg.includes('secure') || errorMsg.includes('https')) {
        console.info('ℹ️ Wake Lock requer HTTPS - usando fallback para HTTP');
      }
      
      // Usar fallback
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
