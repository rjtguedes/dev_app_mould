# ⚡ SSE - Início Rápido (5 minutos)

## 🎯 **O que mudou?**

**ANTES:** WebSocket bloqueado pelo firewall ❌  
**AGORA:** SSE + API REST funcionando ✅

---

## 🚀 **Testar em 3 passos**

### **1️⃣ Iniciar o servidor**
```bash
npm run dev
```

### **2️⃣ Abrir página de teste**
```
Pressione no teclado: Ctrl + Shift + S
```

### **3️⃣ Verificar conexão**
- ✅ Status deve mostrar: **🟢 Conectado**
- ✅ Console deve mostrar: `✅ SSE: Conectado com sucesso`

---

## 🎮 **Testar Comandos**

Na página de teste, clique nos botões:

1. **🚀 Iniciar Sessão**
2. **▶️ Iniciar Produção**
3. **➕ Adicionar Rejeito**

**Resultado esperado:**
- Console mostra logs de API
- Dados são atualizados automaticamente
- JSON na tela muda em tempo real

---

## 🔍 **O que observar**

### **Console do Navegador (F12):**
```
✅ SSE: Conectado com sucesso à máquina 135
📡 API Request: POST /api/sessao/iniciar
✅ API Response: {success: true, ...}
📥 SSE: Mensagem recebida: {...}
💓 SSE: Heartbeat recebido
```

### **Página de Teste:**
- Status: **🟢 Conectado**
- Dados da Máquina: JSON atualizado
- Botões funcionando

---

## ⚠️ **Se não conectar**

### **Teste 1: Backend rodando?**
```bash
curl http://10.200.0.184:8000/docs
```
✅ **Deve abrir documentação da API**

### **Teste 2: SSE acessível?**
```bash
curl -N http://10.200.0.184:8000/api/sse/updates/135
```
✅ **Deve ficar aguardando e mostrar heartbeats**

### **Teste 3: Firewall local?**
- Windows: Desabilitar temporariamente
- Mac: Verificar preferências de segurança

---

## 📊 **Como funciona?**

```
┌─────────────┐                    ┌─────────────┐
│   FRONTEND  │                    │   BACKEND   │
│             │                    │             │
│  1. Connect │──── SSE ─────────→ │   8000      │
│             │                    │             │
│  2. Command │──── POST ────────→ │  Process    │
│             │                    │             │
│  3. Update  │←─── SSE ─────────  │  Broadcast  │
│             │                    │             │
└─────────────┘                    └─────────────┘

SSE: Server-Sent Events (apenas recebe)
POST: API REST (envia comandos)
```

---

## ✅ **Checklist Rápido**

- [ ] `npm run dev` rodando
- [ ] `Ctrl + Shift + S` abre teste
- [ ] Status: 🟢 Conectado
- [ ] Console: logs aparecem
- [ ] Botões funcionam
- [ ] Dados atualizam

**Se todos ✅ → Tudo funcionando!** 🎉

---

## 🔗 **Links Úteis**

- **Docs Backend:** http://10.200.0.184:8000/docs
- **Cheat Sheet:** [API_REST_CHEATSHEET.md](./API_REST_CHEATSHEET.md)
- **Guia Completo:** [TESTE_SSE.md](./TESTE_SSE.md)

---

## 💻 **Usar no Código**

```typescript
import { useSSEManager } from '../hooks/useSSEManager';

function MeuComponente() {
  const { 
    machineData, 
    isConnected,
    iniciarSessao 
  } = useSSEManager({ machineId: 135 });

  return (
    <div>
      <p>Status: {isConnected ? '🟢' : '🔴'}</p>
      <button onClick={() => iniciarSessao({ 
        id_operador: 1, 
        id_turno: 3 
      })}>
        Iniciar
      </button>
    </div>
  );
}
```

---

## 🎯 **Próximo Passo**

Após validar que funciona:

1. Integrar `OperatorDashboard-sse.tsx` no app
2. Remover código WebSocket antigo
3. Deploy!

---

**⏱️ Tempo total: 5 minutos**  
**🎊 Problema de firewall: RESOLVIDO!**


