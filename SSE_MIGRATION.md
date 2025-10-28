# 🔄 Migração WebSocket → SSE + API REST

## 📋 **Resumo da Migração**

Este documento descreve a migração do sistema de comunicação em tempo real de **WebSocket** para **SSE (Server-Sent Events) + API REST**.

### **Por que migrar?**
- ✅ **Firewall corporativo** bloqueando WebSocket
- ✅ **SSE funciona sobre HTTP/HTTPS** (portas 80/443)
- ✅ **Reconexão automática** nativa do SSE
- ✅ **Mais simples** de implementar e debugar

---

## 🏗️ **Arquitetura Nova**

### **Antes (WebSocket):**
```
Frontend ←────────────────→ Backend
        (WebSocket bidirecional)
```

### **Agora (SSE + API):**
```
Frontend ←──────── Backend (SSE - apenas recebe)
         ────────→ Backend (API REST - envia comandos)
```

---

## 📁 **Arquivos Criados**

### **1. Configuração**
- `src/config/sse.ts` - URLs e configurações SSE

### **2. Serviços**
- `src/services/apiService.ts` - Cliente API REST para comandos

### **3. Hooks**
- `src/hooks/useSSEConnection.ts` - Hook baixo nível para SSE
- `src/hooks/useSSEManager.ts` - Hook principal (SSE + API)

### **4. Componentes**
- `src/pages/OperatorDashboard-sse.tsx` - Dashboard adaptado para SSE

---

## 🔌 **Como Usar**

### **Importar o hook:**
```typescript
import { useSSEManager } from '../hooks/useSSEManager';

function MeuComponente() {
  const {
    machineData,      // Dados da máquina (atualizados via SSE)
    isConnected,      // Status da conexão SSE
    isLoading,        // Carregando dados iniciais
    error,            // Erro (se houver)
    
    // Comandos via API REST
    iniciarSessao,
    finalizarSessao,
    iniciarProducao,
    pausarProducao,
    retomarProducao,
    finalizarProducao,
    adicionarRejeitos,
    forcarParada,
    consultarContexto
  } = useSSEManager({
    machineId: 135,
    enabled: true
  });

  return (
    <div>
      <p>Status: {isConnected ? 'Conectado' : 'Desconectado'}</p>
      <pre>{JSON.stringify(machineData, null, 2)}</pre>
    </div>
  );
}
```

---

## 📡 **Endpoints API REST**

Conforme documentação em `API_REST_CHEATSHEET.md`:

| Comando | Endpoint | Método | Body |
|---------|----------|--------|------|
| Iniciar Sessão | `/api/sessao/iniciar` | POST | `{id_maquina, id_operador, id_turno}` |
| Finalizar Sessão | `/api/sessao/finalizar` | POST | `{id_maquina}` |
| Iniciar Produção | `/api/producao/iniciar` | POST | `{id_maquina, id_mapa, tempo_ciclo}` |
| Pausar Produção | `/api/producao/pausar` | POST | `{id_maquina}` |
| Retomar Produção | `/api/producao/retomar` | POST | `{id_maquina}` |
| Finalizar Produção | `/api/producao/finalizar` | POST | `{id_maquina}` |
| Adicionar Rejeitos | `/api/rejeitos/adicionar` | POST | `{id_maquina, quantidade, id_motivo_rejeito}` |
| Forçar Parada | `/api/parada/forcar` | POST | `{id_maquina, id_motivo}` |
| Consultar Contexto | `/api/maquina/{id}/contexto` | GET | - |
| **SSE Updates** | `/api/sse/updates/{id}` | GET | - |

---

## 🔄 **Fluxo de Dados**

### **1. Conexão Inicial:**
```typescript
// 1. Hook conecta ao SSE
const sse = new EventSource('http://10.200.0.184:8000/api/sse/updates/135');

// 2. Consulta contexto inicial via API REST
const response = await fetch('http://10.200.0.184:8000/api/maquina/135/contexto');
```

### **2. Receber Atualizações:**
```typescript
// SSE envia atualizações automáticas
sse.onmessage = (event) => {
  const data = JSON.parse(event.data);
  // Atualizar estado local
  setMachineData(data);
};
```

### **3. Enviar Comandos:**
```typescript
// Usar API REST para comandos
const response = await fetch('http://10.200.0.184:8000/api/producao/iniciar', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    id_maquina: 135,
    id_mapa: 1,
    tempo_ciclo: 15
  })
});

// Backend processa e envia update via SSE para todos os clientes
```

---

## 🚦 **Status da Migração**

### ✅ **Concluído:**
- [x] Configuração SSE
- [x] Serviço API REST
- [x] Hook `useSSEConnection`
- [x] Hook `useSSEManager`
- [x] Dashboard SSE básico

### 🔄 **Em Progresso:**
- [ ] Testar conexão SSE
- [ ] Integrar com MachineSelection
- [ ] Migrar todos os comandos
- [ ] Remover código WebSocket antigo

### 📝 **Próximos Passos:**
1. Testar SSE no navegador
2. Atualizar `MachineSelection.tsx` para usar `OperatorDashboard-sse`
3. Implementar modais de rejeitos e paradas
4. Migrar comandos de produção mapa (parcial/total)
5. Testes completos

---

## 🔧 **Configuração Backend**

O backend já está configurado para SSE. Endpoints disponíveis:

- **Base URL:** `http://10.200.0.184:8000`
- **Docs Interativa:** `http://10.200.0.184:8000/docs`
- **SSE Endpoint:** `/api/sse/updates/{machine_id}`

---

## 🐛 **Troubleshooting**

### **SSE não conecta:**
1. Verificar se backend está rodando: `curl http://10.200.0.184:8000/docs`
2. Testar SSE manualmente: `curl -N http://10.200.0.184:8000/api/sse/updates/135`
3. Verificar firewall local/corporativo

### **Comandos não funcionam:**
1. Verificar payload do request
2. Consultar logs do backend
3. Usar `http://10.200.0.184:8000/docs` para testar endpoints

### **Reconexão constante:**
1. Verificar estabilidade da rede
2. Ajustar `reconnectInterval` em `src/config/sse.ts`
3. Verificar se backend está enviando heartbeats

---

## 📚 **Referências**

- [API_REST_CHEATSHEET.md](./API_REST_CHEATSHEET.md) - Documentação completa da API
- [MDN: Server-Sent Events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events)
- [EventSource API](https://developer.mozilla.org/en-US/docs/Web/API/EventSource)

---

## ⚡ **Performance**

### **Vantagens do SSE:**
- ✅ Menor overhead que WebSocket
- ✅ Usa HTTP/2 quando disponível
- ✅ Reconexão automática
- ✅ Suporte nativo em navegadores

### **Comparação:**
- **WebSocket:** ~2KB overhead por conexão, bidirecional
- **SSE:** ~1KB overhead, unidirecional (servidor → cliente)
- **API REST:** ~500B overhead por request, stateless

---

**🎉 Migração em progresso! SSE é a solução para o problema de firewall!**


