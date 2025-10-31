// 🔊 Gerenciador de Sons do App
// Biblioteca: Howler.js (leve e performática)

import { Howl } from 'howler';

// Configuração global
const volumes = {
  notification: 0.7,
  error: 0.8,
  success: 0.6,
  click: 0.3,
  stop: 0.7,
  resume: 0.5
};

// Helper para criar sons (com fallback para gerar sons via Web Audio API se arquivo não existir)
function createSound(src: string, options: { volume?: number; loop?: boolean } = {}) {
  return new Howl({
    src: [src],
    volume: options.volume ?? volumes.notification,
    loop: options.loop ?? false,
    // HTML5 para melhor performance em tablets
    html5: true,
    // Pré-carregamento
    preload: true,
    // Callback de erro - se arquivo não existir, criar som sintético
    onloaderror: () => {
      console.warn(`⚠️ Arquivo de som não encontrado: ${src}. Criando som sintético como fallback.`);
      // Gerar som sintético via Web Audio API
      generateFallbackSound(src);
    }
  });
}

// Função para gerar sons sintéticos como fallback
function generateFallbackSound(soundName: string) {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    
    const ctx = new AudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    // Frequências e durações diferentes para cada tipo de som
    if (soundName.includes('alert') || soundName.includes('stop')) {
      // Alerta: 2 tons curtos e agudos
      oscillator.frequency.value = 800;
      gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      oscillator.start();
      oscillator.stop(ctx.currentTime + 0.3);
      
      setTimeout(() => {
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.frequency.value = 600;
        gain2.gain.setValueAtTime(0.3, ctx.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc2.start();
        osc2.stop(ctx.currentTime + 0.3);
      }, 300);
    } else if (soundName.includes('success')) {
      // Sucesso: 3 tons ascendentes
      oscillator.frequency.value = 523; // C5
      gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      oscillator.start();
      oscillator.stop(ctx.currentTime + 0.15);
      
      setTimeout(() => {
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.frequency.value = 659; // E5
        gain2.gain.setValueAtTime(0.2, ctx.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
        osc2.start();
        osc2.stop(ctx.currentTime + 0.15);
      }, 150);
      
      setTimeout(() => {
        const osc3 = ctx.createOscillator();
        const gain3 = ctx.createGain();
        osc3.connect(gain3);
        gain3.connect(ctx.destination);
        osc3.frequency.value = 784; // G5
        gain3.gain.setValueAtTime(0.2, ctx.currentTime);
        gain3.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
        osc3.start();
        osc3.stop(ctx.currentTime + 0.2);
      }, 300);
    } else if (soundName.includes('resume')) {
      // Retomada: som mais suave e crescente
      oscillator.frequency.value = 440; // A4
      gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.2);
      gainNode.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      oscillator.start();
      oscillator.stop(ctx.currentTime + 0.4);
    } else if (soundName.includes('click')) {
      // Click: som muito curto e suave
      oscillator.frequency.value = 800;
      gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);
      oscillator.start();
      oscillator.stop(ctx.currentTime + 0.05);
    } else {
      // Default: som genérico
      oscillator.frequency.value = 440;
      gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
      oscillator.start();
      oscillator.stop(ctx.currentTime + 0.2);
    }
  } catch (error) {
    console.error('Erro ao gerar som sintético:', error);
  }
}

// Sons disponíveis
export const sounds = {
  // Notificações
  notification: createSound('/sounds/notification.mp3', { volume: volumes.notification }),
  
  // Sucesso e erro
  success: createSound('/sounds/success.mp3', { volume: volumes.success }),
  error: createSound('/sounds/error.mp3', { volume: volumes.error }),
  
  // Interações
  click: createSound('/sounds/click.mp3', { volume: volumes.click }),
  click2: createSound('/sounds/click2.mp3', { volume: volumes.click }),
  
  // Produção
  stop: createSound('/sounds/stop.mp3', { volume: volumes.stop }),
  resume: createSound('/sounds/resume.mp3', { volume: volumes.resume }),
  
  // Alertas
  alert: createSound('/sounds/alert.mp3', { volume: volumes.notification }),
  warning: createSound('/sounds/warning.mp3', { volume: volumes.notification })
};

// Play sound helper (com fallback para som sintético)
export function playSound(soundName: keyof typeof sounds) {
  try {
    sounds[soundName].play();
  } catch (error) {
    console.warn(`Erro ao tocar som ${soundName}:`, error);
    // Se Howler falhar, tentar fallback sintético
    generateFallbackSound(soundName);
  }
}

// Exportar função de fallback para uso externo
export { generateFallbackSound };

// Parar todos os sons
export function stopAllSounds() {
  Object.values(sounds).forEach(sound => sound.stop());
}
