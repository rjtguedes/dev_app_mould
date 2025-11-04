# 🔄 Guia de Migração WebSocket - IHM para Nova Documentação

## 📋 Resumo das Mudanças

Este guia documenta todas as mudanças necessárias para migrar o app IHM da implementação atual de WebSocket para a nova documentação conforme `websocket-commands.md` e `websocket-subscriptions.md`.

## 🚨 **MUDANÇAS CRÍTICAS**

### 1. **URL e Endpoint**
```typescript
// ❌ ANTES
const WS_URL = 'ws://localhost:8000/ws';
const ws = new WebSocket(`${WS_URL}?machine_id=${machineId}`);

// ✅ DEPOIS  
const WS_URL = 'ws://localhost:8765'; // Porta 8765
const ws = new WebSocket(WS_URL);
// Depois enviar subscribe: {"type": "subscribe", "id_maquina": 147}
```

### 2. **Sistema de Subscriptions**
```typescript
// ❌ ANTES - Conexão direta por máquina
const ws = new WebSocket(`${WS_URL}/${machineId}`);

// ✅ DEPOIS - Sistema de subscribe/unsubscribe
const ws = new WebSocket(WS_URL);
ws.send(JSON.stringify({type: 'subscribe', id_maquina: machineId}));
```

### 3. **Nomenclatura dos Comandos**
| **Comando Antigo** | **Comando Novo** | **Mudança** |
|-------------------|------------------|-------------|
| `get_machine_data` | `consultar_maquina` | ✅ Renomeado |
| `start_session` | `iniciar_sessao_operador` | ✅ Renomeado + campos |
| `end_session` | `finalizar_sessao_operador` | ✅ Renomeado |
| `rejeito` | `adicionar_rejeitos` | ✅ Renomeado |
| ❌ Não existia | `iniciar_producao_mapa` | ✅ Novo comando |
| ❌ Não existia | `finalizar_producao_mapa_parcial` | ✅ Novo comando |
| ❌ Não existia | `finalizar_producao_mapa_completa` | ✅ Novo comando |
| ❌ Não existia | `subscribe` | ✅ Novo comando |
| ❌ Não existia | `unsubscribe` | ✅ Novo comando |
| ❌ Não existia | `consultar_sessao` | ✅ Novo comando |
| ❌ Não existia | `consultar_producao_mapa` | ✅ Novo comando |

## 📦 **ESTRUTURA DE PAYLOADS**

### **Comandos de Sessão**

#### ❌ ANTES:
```typescript
// start_session
{
  "type": "start_session",
  "id_maquina": 135,
  "id_operador": 42,
  "id_sessao": 123  // ❌ Campo incorreto
}
```

#### ✅ DEPOIS:
```typescript
// iniciar_sessao_operador
{
  "type": "iniciar_sessao_operador",
  "id_maquina": 135,
  "id_operador": 42,
  "id_turno": 23  // ✅ Usa id_turno, não id_sessao
}
```

### **Comandos de Produção Mapa (NOVOS)**

```typescript
// iniciar_producao_mapa
{
  "type": "iniciar_producao_mapa",
  "id_maquina": 135,
  "id_mapa": 1,
  "id_item_mapa": 56,     // opcional
  "id_produto": 5678,
  "id_cor": 789,          // opcional
  "id_matriz": 435987,    // opcional
  "qt_produzir": 500      // opcional, padrão: 0
}

// finalizar_producao_mapa_parcial
{
  "type": "finalizar_producao_mapa_parcial",
  "id_maquina": 135
}

// finalizar_producao_mapa_completa
{
  "type": "finalizar_producao_mapa_completa", 
  "id_maquina": 135
}
```

### **Comandos de Subscription (NOVOS)**

```typescript
// subscribe
{
  "type": "subscribe",
  "id_maquina": 147
}

// unsubscribe
{
  "type": "unsubscribe",
  "id_maquina": 147
}
```

## 📨 **ESTRUTURA DE EVENTOS**

### **❌ ANTES - Eventos Simples**
```typescript
{
  "type": "sinal",
  "id_maquina": 135,
  "timestamp": 1234567890,
  "sessao_operador": { /* dados limitados */ }
}
```

### **✅ DEPOIS - Eventos Completos**
```typescript
{
  "type": "machine_update",
  "update_type": "sinal",
  "target_machine_id": 147,
  "source_machine_id": 148,
  "is_child_update": true,
  "machine_data": {
    // ✅ Dados completos da máquina
    "id": 148,
    "nome": "Estação 1",
    "status": true,
    "velocidade": 100,
    "sessao_operador": { /* dados completos */ },
    "producao_turno": { /* dados do turno */ },
    "producao_mapa": { /* dados do mapa */ }
  },
  "additional_data": {
    "sinais": 1501,
    "rejeitos": 50,
    "sinais_validos": 1451
  },
  "timestamp": 1728142200,
  "timestamp_formatted": "05/10/2025 14:30:00"
}
```

### **🚨 NOVO - Alertas de Produção**
```typescript
{
  "type": "production_alert",
  "alert_type": "meta_atingida", // ou "proximo_meta"
  "target_machine_id": 147,
  "source_machine_id": 148,
  "is_child_alert": true,
  "alert_data": {
    "sinais_validos": 500,
    "qt_produzir": 500,
    "percentual": 100.0,
    "message": "Meta de produção atingida! 500/500"
  },
  "timestamp": 1728142200,
  "timestamp_formatted": "05/10/2025 14:30:00"
}
```

## 🔧 **IMPLEMENTAÇÃO**

### **1. Arquivos Criados/Modificados**

#### ✅ **Novos Arquivos:**
- `src/types/websocket-new.ts` - Tipos da nova documentação
- `src/hooks/useWebSocketSingleton-new.ts` - Hook atualizado
- `src/examples/websocket-migration-example.tsx` - Exemplo de uso

#### ✅ **Arquivos Modificados:**
- `src/hooks/useWebSocketManager.ts` - Gerenciador atualizado

### **2. Como Usar a Nova Implementação**

```typescript
import { useWebSocketSingleton } from '../hooks/useWebSocketSingleton-new';
import type { MachineUpdateEvent, ProductionAlertEvent } from '../types/websocket-new';

function MyComponent({ machineId, operatorId, turnoId }) {
  // Handler para updates da máquina
  const handleMachineUpdate = useCallback((event: MachineUpdateEvent) => {
    console.log('Update:', event.update_type);
    console.log('Dados:', event.machine_data);
    
    // Processar diferentes tipos
    switch (event.update_type) {
      case 'sinal':
        // Atualizar contadores
        break;
      case 'parada':
        // Mostrar parada
        break;
      case 'retomada':
        // Mostrar retomada
        break;
      case 'velocidade':
        // Atualizar velocidade
        break;
    }
  }, []);

  // Handler para alertas
  const handleProductionAlert = useCallback((event: ProductionAlertEvent) => {
    if (event.alert_type === 'meta_atingida') {
      alert('🎉 Meta atingida!');
    }
  }, []);

  // Hook do WebSocket
  const {
    state,
    iniciarSessaoOperador,
    finalizarSessaoOperador,
    iniciarProducaoMapa,
    adicionarRejeitos,
    consultarMaquina
  } = useWebSocketSingleton({
    machineId,
    onMachineUpdate: handleMachineUpdate,
    onProductionAlert: handleProductionAlert,
    autoConnect: true
  });

  // Usar comandos
  const handleStartSession = () => {
    iniciarSessaoOperador(operatorId, turnoId);
  };

  const handleAddReject = () => {
    adicionarRejeitos();
  };

  return (
    <div>
      <p>Status: {state.connected ? 'Conectado' : 'Desconectado'}</p>
      <button onClick={handleStartSession}>Iniciar Sessão</button>
      <button onClick={handleAddReject}>Adicionar Rejeito</button>
    </div>
  );
}
```

## 🔄 **PLANO DE MIGRAÇÃO**

### **Fase 1: Configuração Básica** ✅
- [x] Atualizar URL para porta 8765
- [x] Implementar sistema de subscribe/unsubscribe
- [x] Renomear comandos existentes

### **Fase 2: Novos Comandos** 🔄
- [ ] Implementar comandos de produção mapa
- [ ] Adicionar comandos de consulta
- [ ] Testar novos comandos

### **Fase 3: Eventos e Alertas** 🔄
- [ ] Atualizar handlers para nova estrutura
- [ ] Implementar alertas de produção
- [ ] Melhorar suporte a multipostos

### **Fase 4: Migração de Componentes** 🔄
- [ ] Migrar OperatorDashboard
- [ ] Migrar componentes de produção
- [ ] Testar integração completa

## 🧪 **TESTANDO A MIGRAÇÃO**

### **1. Teste de Conexão**
```bash
# Verificar se porta 8765 está acessível
telnet localhost 8765
# ou
nc -zv localhost 8765
```

### **2. Teste com websocat**
```bash
# Instalar websocat
brew install websocat  # macOS
# ou
cargo install websocat  # Linux

# Conectar e testar
websocat ws://localhost:8765

# Enviar subscribe
{"type":"subscribe","id_maquina":135}

# Enviar comando
{"type":"iniciar_sessao_operador","id_maquina":135,"id_operador":42,"id_turno":23}
```

### **3. Teste no Browser**
```javascript
const ws = new WebSocket('ws://localhost:8765');

ws.onopen = () => {
  console.log('Conectado');
  
  // Subscribe
  ws.send(JSON.stringify({type: 'subscribe', id_maquina: 135}));
  
  // Comando
  ws.send(JSON.stringify({
    type: 'iniciar_sessao_operador',
    id_maquina: 135,
    id_operador: 42,
    id_turno: 23
  }));
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Recebido:', data);
};
```

## ⚠️ **PONTOS DE ATENÇÃO**

### **1. Campos Obrigatórios**
- `id_turno` é obrigatório em `iniciar_sessao_operador` (não `id_sessao`)
- `id_mapa` e `id_produto` são obrigatórios em `iniciar_producao_mapa`

### **2. Valores Nulos**
- `sessao_operador` pode ser `null` se não houver operador logado
- `producao_mapa` pode ser `null` se não houver mapa ativo

### **3. Multipostos**
- `target_machine_id` = máquina onde você está inscrito (pai)
- `source_machine_id` = máquina que realmente mudou (filha)
- `is_child_update` = `true` se for update de máquina filha

### **4. Reconexão**
- Sistema automaticamente reinscreve em máquinas após reconexão
- Mantém lista de máquinas inscritas internamente

## 📞 **SUPORTE**

Para dúvidas ou problemas:
1. Verificar logs do servidor WebSocket
2. Testar conexão com `websocat`
3. Validar formato JSON dos comandos
4. Confirmar que máquina existe no sistema
5. Verificar se porta 8765 está acessível

---

**Status da Migração:** 🔄 Em andamento  
**Próxima Fase:** Implementar comandos de produção mapa  
**Data:** Janeiro 2025









