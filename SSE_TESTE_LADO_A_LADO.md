# 🔬 Teste SSE Lado a Lado com WebSocket

## 🎯 **Situação Atual**

Você tem **dois sistemas rodando em paralelo**:

1. **WebSocket** (atual) - Funcionando normalmente
2. **SSE** (novo) - Card de teste no canto inferior direito

Isso permite **comparar** ambos e validar que SSE funciona corretamente antes de migrar completamente.

---

## 📍 **Onde Está o Card de Teste**

```
┌────────────────────────────────────────────────────┐
│                                                    │
│         DASHBOARD PRINCIPAL (WebSocket)            │
│                                                    │
│                                                    │
│                                                    │
│                                          ┌─────────┤
│                                          │ 🧪 SSE  │
│                                          │ Test    │
│                                          │         │
│                                          │ 🟢      │
│                                          └─────────┤
└────────────────────────────────────────────────────┘
                                                     ↑
                                     Canto inferior direito
```

---

## 🔍 **O Que Observar**

### **1. Console do Navegador (F12)**

Você verá **dois tipos de logs**:

#### **WebSocket (atual):**
```javascript
📊 WebSocket - Sinal recebido: {...}
📊 WebSocket - Dados da máquina: {...}
useWebSocketSingleton.ts:279 📊 [NOVA] Evento de SINAL detectado
OperatorDashboard.tsx:128 📊 WebSocket - Sinal recebido detalhado
```

#### **SSE (novo):**
```javascript
🔌 SSE: Conectando em http://10.200.0.184:8000/api/sse/updates/74...
✅ SSE: Conectado com sucesso à máquina 74
📡 API Request: GET http://10.200.0.184:8000/api/maquina/74/contexto
✅ API Response: {success: true, data: {...}}
📥 SSE: Mensagem recebida: {...}
💓 SSE: Heartbeat recebido
```

### **2. Interface**

#### **Dashboard Principal:**
- Mostra dados do **WebSocket**
- Interface completa
- Funcionando normalmente

#### **Card SSE (canto inferior direito):**
- Mostra dados do **SSE**
- Controles de teste
- Preview dos dados

---

## 🧪 **Como Testar**

### **Passo 1: Verificar Conexão SSE**

1. Abrir o app (já está em `http://localhost:5173`)
2. Fazer login
3. Selecionar máquina 74
4. Verificar **canto inferior direito**
5. Card deve mostrar: **🟢 Conectado**

### **Passo 2: Comparar Dados**

1. **WebSocket:** Ver dados na interface principal
2. **SSE:** Ver dados no card de teste (seção "Dados SSE")
3. **Comparar:** Devem ser os mesmos!

Exemplo de dados esperados:
```json
{
  "id": 74,
  "nome": "Horizontal 20",
  "velocidade": 50,
  "sessao_operador": {
    "id_sessao": 1201,
    "id_operador": 86
  },
  "producao_mapa": { ... }
}
```

### **Passo 3: Testar Comandos**

No card SSE, clicar:

1. **🚀 Iniciar Sessão**
   - Console deve mostrar: `📡 API Request: POST /api/sessao/iniciar`
   - Deve retornar: `✅ API Response: {success: true}`

2. **➕ Adicionar Rejeito**
   - Console deve mostrar: `📡 API Request: POST /api/rejeitos/adicionar`
   - Deve retornar: `✅ API Response: {success: true}`

3. **🔄 Reconectar**
   - SSE desconecta e reconecta
   - Status volta para 🟢

4. **📋 Contexto**
   - Busca dados atuais da máquina
   - Atualiza card com novos dados

---

## 📊 **Comparação em Tempo Real**

| Aspecto | WebSocket | SSE |
|---------|-----------|-----|
| **Conexão** | `ws://10.200.0.184:8765` | `http://10.200.0.184:8000/api/sse/updates/74` |
| **Status Visual** | Não tem indicador | 🟢/🔴 no card |
| **Dados** | Interface principal | Card de teste |
| **Comandos** | Botões principais | Botões de teste |
| **Logs** | `📊 WebSocket - ...` | `🔌 SSE: ...` |
| **Firewall** | ❌ Pode bloquear | ✅ Passa |

---

## ✅ **Checklist de Validação**

Marque cada item após testar:

- [ ] Card SSE visível no canto inferior direito
- [ ] Status mostra: 🟢 Conectado
- [ ] Console mostra logs SSE (começa com 🔌, ✅, 📡)
- [ ] Dados aparecem no card
- [ ] Dados SSE = Dados WebSocket
- [ ] Botão "Iniciar Sessão" funciona
- [ ] Botão "Adicionar Rejeito" funciona
- [ ] Botão "Reconectar" funciona
- [ ] Heartbeats chegam (💓 no console)
- [ ] SSE continua após perder rede (reconexão automática)

---

## 🐛 **Troubleshooting**

### **Card não aparece:**
- Verificar se `TestSSEInline` foi importado em `MachineSelection.tsx`
- Verificar console por erros de TypeScript
- Recarregar página (Ctrl+R)

### **Status: 🔴 Desconectado:**
1. Backend rodando? → `curl http://10.200.0.184:8000/docs`
2. SSE acessível? → `curl -N http://10.200.0.184:8000/api/sse/updates/74`
3. Ver console por mensagens de erro

### **Dados não aparecem:**
- Verificar se backend está enviando updates
- Console deve mostrar: `📥 SSE: Mensagem recebida`
- Se não mostrar, problema está no backend

### **Comandos não funcionam:**
- Abrir `http://10.200.0.184:8000/docs`
- Testar endpoint manualmente
- Verificar payload no console

---

## 🎯 **Próximo Passo**

Depois de validar que SSE funciona:

### **Opção 1: Manter Ambos (Temporário)**
- WebSocket para produção
- SSE para teste/validação

### **Opção 2: Migrar Completamente**
```typescript
// Substituir em MachineSelection.tsx
import { OperatorDashboardSSE } from './OperatorDashboard-sse';

return (
  <OperatorDashboardSSE 
    machine={selectedMachine}
    // ...
  />
);
```

### **Opção 3: Toggle (Escolha do Usuário)**
```typescript
const [useSSE, setUseSSE] = useState(false);

return useSSE ? (
  <OperatorDashboardSSE {...props} />
) : (
  <OperatorDashboard {...props} />
);
```

---

## 💡 **Dicas**

1. **Console Filtrado:** No DevTools, filtrar por "SSE" ou "WebSocket"
2. **Performance:** SSE tem menor overhead que WebSocket
3. **Debugging:** SSE é mais fácil de debugar (`curl`)
4. **Firewall:** SSE funciona onde WebSocket é bloqueado

---

## 📚 **Documentação Relacionada**

- [INICIO_RAPIDO_SSE.md](./INICIO_RAPIDO_SSE.md) - Teste rápido em 5 minutos
- [TESTE_SSE.md](./TESTE_SSE.md) - Guia completo de testes
- [SSE_MIGRATION.md](./SSE_MIGRATION.md) - Documentação técnica
- [API_REST_CHEATSHEET.md](./API_REST_CHEATSHEET.md) - Referência da API

---

## 🎊 **Resumo**

```
AGORA VOCÊ TEM:
✅ WebSocket funcionando (produção)
✅ SSE funcionando (teste)
✅ Card de comparação visual
✅ Logs detalhados de ambos
✅ Comandos de teste SSE

PRÓXIMO PASSO:
→ Validar que SSE funciona corretamente
→ Verificar se firewall permite SSE
→ Decidir quando migrar completamente
```

**O card SSE está visível no canto inferior direito da sua tela agora! 🎉**


