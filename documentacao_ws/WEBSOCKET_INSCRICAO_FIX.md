# 🔧 Fix - Problema de Inscrição WebSocket

## 🚨 Problema Reportado

**Sintoma:** Tablet não consegue manter conexão de inscrição

**Logs observados:**
```
✅ Cliente conectado
🔔 Cliente inscrito na máquina 75
📊 Total de inscritos: 1
🔕 Cliente desinscrito da máquina 75  ⬅️ PROBLEMA
❌ Cliente desconectado
```

---

## 🎯 Causas Prováveis

### **1️⃣ Cliente está enviando `unsubscribe` sem querer**

Verifique se o código do tablet está chamando `unsubscribe` em algum momento:

```typescript
// ❌ PROBLEMA: Desinscrevendo sem querer
useEffect(() => {
    // Inscreve
    ws.send(JSON.stringify({ type: "subscribe", id_maquina: 75 }));
    
    return () => {
        // ISTO está sendo chamado muito cedo!
        ws.send(JSON.stringify({ type: "unsubscribe", id_maquina: 75 }));
    };
}, [someState]); // ⬅️ Se someState muda, desinscreve e re-inscreve!
```

**SOLUÇÃO:**
```typescript
// ✅ CORRETO: Só desinscrever ao desmontar componente
useEffect(() => {
    ws.send(JSON.stringify({ type: "subscribe", id_maquina: 75 }));
    
    return () => {
        // Só executa quando componente desmonta
        ws.send(JSON.stringify({ type: "unsubscribe", id_maquina: 75 }));
    };
}, []); // ⬅️ Array vazio = só roda uma vez
```

---

### **2️⃣ WebSocket está se reconectando constantemente**

Se o WebSocket fica se reconectando, as inscrições são perdidas.

**Verificar:**
```typescript
ws.onclose = (event) => {
    console.log('🔌 WebSocket fechou:', event.code, event.reason);
    
    // Verificar motivo:
    // 1000 = Fechamento normal
    // 1001 = Going away
    // 1006 = Abnormal closure (conexão perdida)
};
```

**SOLUÇÃO:**
```typescript
let reconnectAttempts = 0;
const MAX_RECONNECTS = 5;

ws.onclose = (event) => {
    if (event.code === 1000) {
        // Fechamento normal, não reconectar
        return;
    }
    
    if (reconnectAttempts < MAX_RECONNECTS) {
        reconnectAttempts++;
        setTimeout(() => {
            reconnect();
        }, 2000 * reconnectAttempts);
    }
};

function reconnect() {
    ws = new WebSocket('ws://192.168.1.76:8765');
    // Reconfigurar handlers
    ws.onmessage = (e) => {
        const msg = JSON.parse(e.data);
        if (msg.type === 'connection') {
            // RE-INSCREVER após reconectar
            ws.send(JSON.stringify({
                type: "subscribe",
                id_maquina: currentMachineId
            }));
        }
    };
}
```

---

### **3️⃣ Inscrição antes da mensagem de boas-vindas**

Se inscrever ANTES de receber a mensagem `type: "connection"`, pode não funcionar.

**PROBLEMA:**
```typescript
// ❌ ERRADO
ws.onopen = () => {
    // MUITO CEDO!
    ws.send(JSON.stringify({ type: "subscribe", id_maquina: 75 }));
};
```

**SOLUÇÃO:**
```typescript
// ✅ CORRETO
ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    
    // AGUARDAR mensagem de boas-vindas
    if (msg.type === 'connection' && msg.status === 'connected') {
        // AGORA SIM pode inscrever
        ws.send(JSON.stringify({
            type: "subscribe",
            id_maquina: 75
        }));
    }
};
```

---

### **4️⃣ Estado `connected` não está sendo gerenciado corretamente**

```typescript
// ❌ PROBLEMA
const [connected, setConnected] = useState(false);

// Não está atualizando o estado corretamente
ws.onopen = () => {
    // Faltando: setConnected(true);
};

// Tentando inscrever quando não está conectado
if (machineId) {
    ws.send(JSON.stringify({ type: "subscribe", id_maquina: machineId }));
    // ⬆️ Pode falhar se não estiver conectado!
}
```

**SOLUÇÃO:**
```typescript
// ✅ CORRETO
const [connected, setConnected] = useState(false);
const [machineId, setMachineId] = useState<number | null>(null);

ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    
    if (msg.type === 'connection' && msg.status === 'connected') {
        setConnected(true);
        
        // Se tem máquina pendente, inscrever
        if (machineId) {
            subscribeToMachine(machineId);
        }
    }
};

ws.onclose = () => {
    setConnected(false);
};

function subscribeToMachine(id: number) {
    if (!connected) {
        console.warn('Não conectado ainda, guardando para depois');
        setMachineId(id); // Guardar para quando conectar
        return;
    }
    
    ws.send(JSON.stringify({
        type: "subscribe",
        id_maquina: id
    }));
}
```

---

## 🧪 Código de Teste - Verificar Inscrições

Cole no Console do navegador:

```javascript
const ws = new WebSocket('ws://192.168.1.76:8765');
let subscriptionActive = false;

ws.onopen = () => {
    console.log('🔌 WebSocket aberto');
};

ws.onmessage = (e) => {
    const msg = JSON.parse(e.data);
    console.log('📨', msg.type, msg);
    
    // 1. Aguardar conexão
    if (msg.type === 'connection' && msg.status === 'connected') {
        console.log('✅ CONECTADO! Inscrevendo...');
        
        ws.send(JSON.stringify({
            type: "subscribe",
            id_maquina: 75
        }));
    }
    
    // 2. Confirmar inscrição
    if (msg.type === 'subscribe') {
        if (msg.success) {
            console.log('✅ INSCRITO COM SUCESSO!');
            subscriptionActive = true;
        } else {
            console.error('❌ ERRO AO INSCREVER:', msg.error);
        }
    }
    
    // 3. Receber atualizações
    if (msg.type === 'update') {
        console.log('🔔 ATUALIZAÇÃO RECEBIDA:', msg);
    }
};

ws.onclose = (e) => {
    console.log('🔌 WebSocket fechou:', e.code, e.reason);
    subscriptionActive = false;
    
    // Verificar se foi fechamento anormal
    if (e.code === 1006) {
        console.error('❌ Conexão perdida inesperadamente!');
    }
};

ws.onerror = (error) => {
    console.error('❌ ERRO:', error);
};

// Função para verificar status
function checkStatus() {
    console.log('Status da conexão:', ws.readyState);
    console.log('0 = CONNECTING, 1 = OPEN, 2 = CLOSING, 3 = CLOSED');
    console.log('Inscrição ativa:', subscriptionActive);
}

// Chamar após 5 segundos
setTimeout(checkStatus, 5000);
```

---

## 📝 Checklist de Debug

Execute estes passos no código do tablet:

### **Passo 1: Adicionar Logs Detalhados**

```typescript
ws.onopen = () => {
    console.log('🔌 [1/4] WebSocket ABERTO');
};

ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    console.log('📨 [2/4] MENSAGEM RECEBIDA:', msg.type);
    
    if (msg.type === 'connection') {
        console.log('✅ [3/4] CONEXÃO CONFIRMADA');
        // Inscrever aqui
    }
    
    if (msg.type === 'subscribe') {
        console.log('✅ [4/4] INSCRIÇÃO CONFIRMADA:', msg.success);
    }
};

ws.onclose = (event) => {
    console.log('🔌 FECHOU - Código:', event.code, 'Motivo:', event.reason);
};
```

### **Passo 2: Verificar se `unsubscribe` está sendo chamado**

```typescript
// Adicionar log antes de enviar unsubscribe
function unsubscribe(machineId: number) {
    console.log('🔕 CHAMANDO UNSUBSCRIBE:', machineId);
    console.trace(); // Mostra de onde veio a chamada
    
    ws.send(JSON.stringify({
        type: "unsubscribe",
        id_maquina: machineId
    }));
}
```

### **Passo 3: Verificar reconexões**

```typescript
let connectionCount = 0;

ws.onopen = () => {
    connectionCount++;
    console.log(`🔌 Conexão #${connectionCount}`);
    
    if (connectionCount > 1) {
        console.warn('⚠️ RECONECTOU! Motivo:');
        console.trace();
    }
};
```

---

## ✅ Solução Final Recomendada

```typescript
import { useEffect, useRef, useState } from 'react';

export function useWebSocketSubscription(machineId: number | null) {
    const ws = useRef<WebSocket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [isSubscribed, setIsSubscribed] = useState(false);
    const pendingMachineId = useRef<number | null>(null);

    useEffect(() => {
        // Conectar ao WebSocket
        connectWebSocket();

        // Cleanup: só desconectar quando componente desmontar
        return () => {
            if (ws.current) {
                // Desinscrever primeiro
                if (isSubscribed && machineId) {
                    ws.current.send(JSON.stringify({
                        type: "unsubscribe",
                        id_maquina: machineId
                    }));
                }
                ws.current.close(1000, 'Component unmounting');
            }
        };
    }, []); // ⬅️ Array vazio: só roda uma vez!

    // Efeito separado para mudanças de máquina
    useEffect(() => {
        if (!machineId) return;

        if (isConnected) {
            // Se já está conectado, inscrever imediatamente
            subscribeToMachine(machineId);
        } else {
            // Se não está conectado, guardar para depois
            pendingMachineId.current = machineId;
        }
    }, [machineId, isConnected]);

    function connectWebSocket() {
        ws.current = new WebSocket('ws://192.168.1.76:8765');

        ws.current.onopen = () => {
            console.log('🔌 WebSocket aberto');
        };

        ws.current.onmessage = (event) => {
            const msg = JSON.parse(event.data);

            // Mensagem de conexão
            if (msg.type === 'connection' && msg.status === 'connected') {
                console.log('✅ Conectado ao servidor');
                setIsConnected(true);

                // Se tem máquina pendente, inscrever
                if (pendingMachineId.current) {
                    subscribeToMachine(pendingMachineId.current);
                    pendingMachineId.current = null;
                }
                return;
            }

            // Confirmação de inscrição
            if (msg.type === 'subscribe') {
                setIsSubscribed(msg.success);
                if (!msg.success) {
                    console.error('❌ Erro ao inscrever:', msg.error);
                }
                return;
            }

            // Processar atualizações
            if (msg.type === 'update') {
                console.log('🔔 Atualização:', msg);
                // Atualizar UI aqui
            }
        };

        ws.current.onclose = (event) => {
            console.log('🔌 WebSocket fechou:', event.code);
            setIsConnected(false);
            setIsSubscribed(false);

            // Reconectar se não foi fechamento intencional
            if (event.code !== 1000) {
                console.log('🔄 Reconectando em 2s...');
                setTimeout(connectWebSocket, 2000);
            }
        };

        ws.current.onerror = (error) => {
            console.error('❌ Erro WebSocket:', error);
        };
    }

    function subscribeToMachine(id: number) {
        if (!ws.current || !isConnected) {
            console.warn('⚠️ WebSocket não conectado');
            pendingMachineId.current = id;
            return;
        }

        console.log(`🔔 Inscrevendo na máquina ${id}`);
        ws.current.send(JSON.stringify({
            type: "subscribe",
            id_maquina: id
        }));
    }

    return { isConnected, isSubscribed };
}
```

---

## 📞 Como Usar no Componente

```typescript
function MachineMonitor() {
    const [currentMachineId, setCurrentMachineId] = useState<number>(75);
    const { isConnected, isSubscribed } = useWebSocketSubscription(currentMachineId);

    return (
        <div>
            <div>
                Conexão: {isConnected ? '🟢 Conectado' : '🔴 Desconectado'}
            </div>
            <div>
                Inscrição: {isSubscribed ? '🔔 Inscrito' : '🔕 Não inscrito'}
            </div>
            <button onClick={() => setCurrentMachineId(75)}>
                Máquina 75
            </button>
        </div>
    );
}
```

---

## 🎯 Resumo da Solução

1. ✅ **Aguardar** mensagem de conexão antes de inscrever
2. ✅ **Não** chamar `unsubscribe` em `useEffect` com dependências que mudam
3. ✅ **Implementar** reconexão automática
4. ✅ **Re-inscrever** após reconexão
5. ✅ **Gerenciar** estado de conexão corretamente
6. ✅ **Adicionar** logs para debug

---

**Status:** ✅ Instruções atualizadas  
**Teste:** Console do navegador funcionando  
**Próximo passo:** Implementar no código do tablet

