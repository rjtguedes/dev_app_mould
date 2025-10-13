# 🔧 Exemplo: Como Integrar o Diagnóstico WebSocket

## 📍 Opção 1: Adicionar na Página de Settings

### Arquivo: `src/pages/Settings.tsx`

```tsx
// 1️⃣ Adicionar import no topo do arquivo
import { WebSocketDiagnostic } from '../components/WebSocketDiagnostic';

export function Settings({ onBack, onMachineSelect }: SettingsProps) {
  // ... código existente ...

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <nav className="bg-slate-800/50 backdrop-blur-sm border-b border-white/10">
        {/* ... nav existente ... */}
      </nav>

      <main className="max-w-3xl mx-auto p-4">
        {/* Seção de Identificação do Dispositivo (EXISTENTE) */}
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 mb-6 border border-white/10">
          <h2 className="text-xl font-semibold text-white mb-2">Identificação do Dispositivo</h2>
          <p className="text-blue-200 font-mono">{deviceId}</p>
        </div>

        {/* 2️⃣ ADICIONAR SEÇÃO DE DIAGNÓSTICO WEBSOCKET (NOVO) */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-white mb-4">Diagnóstico de Conexão</h2>
          <WebSocketDiagnostic />
        </div>

        {/* Seção de Selecionar Máquina (EXISTENTE) */}
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-white">Selecionar Máquina</h2>
          {/* ... código existente ... */}
        </div>

        {/* ... resto do código ... */}
      </main>
    </div>
  );
}
```

---

## 📍 Opção 2: Criar Página Dedicada de Debug

### Criar novo arquivo: `src/pages/Debug.tsx`

```tsx
import { ArrowLeft } from 'lucide-react';
import { WebSocketDiagnostic } from '../components/WebSocketDiagnostic';
import { WebSocketStorageDebug } from '../components/WebSocketStorageDebug'; // se quiser incluir também

interface DebugProps {
  onBack: () => void;
}

export function Debug({ onBack }: DebugProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <nav className="bg-slate-800/50 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-3xl mx-auto px-4">
          <div className="flex items-center gap-4 h-16">
            <button
              onClick={onBack}
              className="text-white hover:bg-white/10 p-2 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h1 className="text-xl font-bold text-white">🔧 Debug e Diagnóstico</h1>
          </div>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto p-4 space-y-6">
        {/* Diagnóstico WebSocket */}
        <div>
          <h2 className="text-xl font-semibold text-white mb-4">Diagnóstico WebSocket</h2>
          <WebSocketDiagnostic />
        </div>

        {/* Outros componentes de debug */}
        <div>
          <h2 className="text-xl font-semibold text-white mb-4">Storage e Cache</h2>
          <WebSocketStorageDebug />
        </div>

        {/* Informações do Sistema */}
        <div className="bg-slate-800 rounded-lg p-4 space-y-2">
          <h3 className="text-white font-semibold mb-3">Informações do Sistema</h3>
          
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-400">User Agent:</span>
              <span className="text-blue-300 text-right ml-4 max-w-md truncate">
                {navigator.userAgent}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-slate-400">Plataforma:</span>
              <span className="text-blue-300">{navigator.platform}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-slate-400">Idioma:</span>
              <span className="text-blue-300">{navigator.language}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-slate-400">Online:</span>
              <span className={navigator.onLine ? 'text-green-400' : 'text-red-400'}>
                {navigator.onLine ? '✅ Sim' : '❌ Não'}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-slate-400">Viewport:</span>
              <span className="text-blue-300">
                {window.innerWidth}x{window.innerHeight}
              </span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
```

### Adicionar rota no `App.tsx`:

```tsx
import { Debug } from './pages/Debug';

function App() {
  const [currentView, setCurrentView] = useState<'selection' | 'dashboard' | 'settings' | 'debug'>('selection');

  // ... código existente ...

  if (currentView === 'debug') {
    return <Debug onBack={() => setCurrentView('settings')} />;
  }

  // ... resto do código ...
}
```

### Adicionar botão de Debug nas Settings:

```tsx
// Em Settings.tsx, adicionar um botão:
<button
  onClick={() => onDebug()} // ou navegar para página de debug
  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
>
  🔧 Abrir Diagnóstico
</button>
```

---

## 📍 Opção 3: Modal/Drawer de Diagnóstico

### Criar componente de Modal:

```tsx
import { X } from 'lucide-react';
import { WebSocketDiagnostic } from './WebSocketDiagnostic';

interface DiagnosticModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DiagnosticModal({ isOpen, onClose }: DiagnosticModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-slate-900 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-slate-800 border-b border-slate-700 p-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">🔧 Diagnóstico WebSocket</h2>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/10 p-2 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        {/* Content */}
        <div className="p-4">
          <WebSocketDiagnostic />
        </div>
      </div>
    </div>
  );
}
```

### Usar o Modal:

```tsx
// Em qualquer componente:
import { useState } from 'react';
import { DiagnosticModal } from '../components/DiagnosticModal';

export function MyComponent() {
  const [showDiagnostic, setShowDiagnostic] = useState(false);

  return (
    <>
      <button onClick={() => setShowDiagnostic(true)}>
        🔧 Diagnóstico
      </button>

      <DiagnosticModal 
        isOpen={showDiagnostic}
        onClose={() => setShowDiagnostic(false)}
      />
    </>
  );
}
```

---

## 📍 Opção 4: Atalho Secreto (Tap 7x para Debug)

```tsx
// Em qualquer componente principal (ex: Settings ou Dashboard)
import { useState, useRef } from 'react';
import { DiagnosticModal } from '../components/DiagnosticModal';

export function MyComponent() {
  const [showDiagnostic, setShowDiagnostic] = useState(false);
  const tapCount = useRef(0);
  const tapTimeout = useRef<NodeJS.Timeout>();

  const handleSecretTap = () => {
    tapCount.current += 1;

    if (tapCount.current >= 7) {
      setShowDiagnostic(true);
      tapCount.current = 0;
    }

    // Reset contador após 2 segundos sem tap
    clearTimeout(tapTimeout.current);
    tapTimeout.current = setTimeout(() => {
      tapCount.current = 0;
    }, 2000);
  };

  return (
    <div>
      {/* Logo ou título que pode ser clicado 7x */}
      <h1 
        onClick={handleSecretTap}
        className="text-2xl font-bold text-white cursor-pointer"
      >
        IHM Mould
      </h1>

      {/* Modal de diagnóstico */}
      <DiagnosticModal 
        isOpen={showDiagnostic}
        onClose={() => setShowDiagnostic(false)}
      />

      {/* Resto do componente... */}
    </div>
  );
}
```

---

## 🎨 Customizações Opcionais

### Alterar Cores do Diagnóstico:

```tsx
// Criar um wrapper personalizado
export function CustomWebSocketDiagnostic() {
  return (
    <div className="custom-diagnostic-theme">
      <WebSocketDiagnostic />
    </div>
  );
}

// Adicionar CSS customizado
<style>
.custom-diagnostic-theme .bg-slate-800 {
  background-color: #1e3a8a; /* Azul customizado */
}
</style>
```

### Adicionar Apenas se Houver Erro:

```tsx
import { useState, useEffect } from 'react';
import { diagnoseWebSocketURL } from '../lib/websocketConfig';
import { WebSocketDiagnostic } from '../components/WebSocketDiagnostic';

export function ConditionalDiagnostic() {
  const [hasWarnings, setHasWarnings] = useState(false);

  useEffect(() => {
    const diagnosis = diagnoseWebSocketURL();
    setHasWarnings(diagnosis.warnings.length > 0);
  }, []);

  if (!hasWarnings) return null;

  return (
    <div className="mb-6">
      <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-3 mb-4">
        <p className="text-yellow-200 text-sm">
          ⚠️ Foram detectados possíveis problemas de conexão. Veja o diagnóstico abaixo.
        </p>
      </div>
      <WebSocketDiagnostic />
    </div>
  );
}
```

---

## 🚀 Recomendação

**Para debugging rápido durante desenvolvimento:**
- Use **Opção 1** (adicionar direto em Settings) ✅

**Para produção:**
- Use **Opção 3** (Modal) ou **Opção 4** (Atalho secreto) 👍
- Ou crie uma página de Debug protegida por senha

**Para testes em campo:**
- Use **Opção 2** (Página dedicada) com acesso fácil 🔧

---

## 📝 Exemplo Completo (Settings.tsx)

```tsx
import React, { useState, useEffect } from 'react';
import { ArrowLeft, Box, AlertCircle, Power, Gauge, Activity } from 'lucide-react';
import { useRealtimeMachines } from '../hooks/useRealtimeMachines';
import { getDeviceId } from '../lib/device';
import { WebSocketDiagnostic } from '../components/WebSocketDiagnostic'; // ← ADICIONAR
import type { Machine } from '../types/machine';
import { supabase } from '../lib/supabase';

// ... interfaces e código existente ...

export function Settings({ onBack, onMachineSelect }: SettingsProps) {
  // ... estado existente ...
  
  // ← ADICIONAR: Estado para controlar visibilidade do diagnóstico
  const [showDiagnostic, setShowDiagnostic] = useState(false);

  // ... resto do código existente ...

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <nav className="bg-slate-800/50 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-3xl mx-auto px-4">
          <div className="flex items-center gap-4 h-16">
            <button onClick={onBack} className="text-white hover:bg-white/10 p-2 rounded-lg transition-colors">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h1 className="text-xl font-bold text-white">Configurações</h1>
          </div>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto p-4">
        {/* Identificação do Dispositivo */}
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 mb-6 border border-white/10">
          <h2 className="text-xl font-semibold text-white mb-2">Identificação do Dispositivo</h2>
          <p className="text-blue-200 font-mono">{deviceId}</p>
        </div>

        {/* ← ADICIONAR: Botão para mostrar/ocultar diagnóstico */}
        <div className="mb-6">
          <button
            onClick={() => setShowDiagnostic(!showDiagnostic)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors w-full justify-center"
          >
            <Activity className="w-5 h-5" />
            {showDiagnostic ? 'Ocultar Diagnóstico' : 'Mostrar Diagnóstico de Conexão'}
          </button>
        </div>

        {/* ← ADICIONAR: Componente de diagnóstico (condicional) */}
        {showDiagnostic && (
          <div className="mb-6">
            <WebSocketDiagnostic />
          </div>
        )}

        {/* Resto do código existente... */}
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-white">Selecionar Máquina</h2>
          {/* ... código existente ... */}
        </div>
      </main>
    </div>
  );
}
```

---

**✅ Pronto! Agora você tem várias opções para integrar o diagnóstico WebSocket no seu app.**

