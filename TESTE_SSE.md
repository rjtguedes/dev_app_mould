# 🧪 Guia de Teste SSE

## 🚀 **Como Testar a Nova Implementação SSE**

### **1️⃣ Acessar a Página de Teste**

Existem 2 formas de acessar:

#### **Opção A: Atalho de Teclado**
```
Pressione: Ctrl + Shift + S
```
Isso abrirá a página de teste SSE de qualquer lugar da aplicação.

#### **Opção B: Navegação Direta**
Adicione ao final da URL:
```
http://localhost:5173/?test=sse
```

---

### **2️⃣ Configurar o Teste**

Na página de teste você verá:

1. **Campo ID da Máquina**: Digite o ID (padrão: 135)
2. **Botão SSE Ativo/Inativo**: Liga/desliga a conexão
3. **Status da Conexão**: 🟢 Conectado ou 🔴 Desconectado

---

### **3️⃣ Verificar Conexão SSE**

#### **O que observar:**
- ✅ Status mostra "🟢 Conectado" após alguns segundos
- ✅ Console mostra: `✅ SSE: Conectado com sucesso à máquina X`
- ✅ Dados da máquina aparecem na seção inferior

#### **Se não conectar:**
1. Verifique se o backend está rodando:
   ```bash
   curl http://10.200.0.184:8000/docs
   ```

2. Teste SSE manualmente no terminal:
   ```bash
   curl -N http://10.200.0.184:8000/api/sse/updates/135
   ```

3. Verifique o console do navegador para erros

---

### **4️⃣ Testar Comandos API**

Use os botões de teste:

#### **🚀 Iniciar Sessão**
```javascript
// Envia via API REST
POST /api/sessao/iniciar
{
  id_maquina: 135,
  id_operador: 1,
  id_turno: 3
}

// Backend processa e envia update via SSE
// Dados atualizados aparecem automaticamente
```

#### **▶️ Iniciar Produção**
```javascript
POST /api/producao/iniciar
{
  id_maquina: 135,
  id_mapa: 1,
  tempo_ciclo: 15
}
```

#### **➕ Adicionar Rejeito**
```javascript
POST /api/rejeitos/adicionar
{
  id_maquina: 135,
  quantidade: 1,
  id_motivo_rejeito: 1
}
```

---

### **5️⃣ Verificar Logs do Console**

Abra o DevTools (F12) e vá para a aba **Console**:

#### **Logs esperados ao conectar:**
```
🔌 SSE: Conectando em http://10.200.0.184:8000/api/sse/updates/135...
✅ SSE: Conectado com sucesso à máquina 135
📡 API Request: GET http://10.200.0.184:8000/api/maquina/135/contexto
✅ API Response: {...}
```

#### **Logs ao enviar comando:**
```
📡 API Request: POST http://10.200.0.184:8000/api/producao/iniciar
✅ API Response: {success: true, ...}
📥 SSE: Mensagem recebida: {type: "update", data: {...}}
📊 SSE Manager: Processando mensagem: {...}
```

#### **Logs de heartbeat (a cada 30s):**
```
💓 SSE: Heartbeat recebido
```

---

### **6️⃣ Testar Reconexão**

1. Clique em **"Desconectar"**
   - Status muda para 🔴 Desconectado
   - Console: `🔌 SSE: Desconectando...`

2. Clique em **"Reconectar"**
   - Status volta para 🟢 Conectado
   - Console: `✅ SSE: Conectado com sucesso...`

3. **Teste de queda de rede:**
   - Desative o Wi-Fi ou cabo de rede
   - SSE tentará reconectar automaticamente
   - Console: `🔄 SSE: Reconectando em 5000ms...`

---

### **7️⃣ Interpretar os Dados**

Na seção **"📊 Dados da Máquina (SSE)"**, você verá um JSON com:

```json
{
  "id": 135,
  "nome": "Máquina X",
  "sessao_ativa": {
    "id": 123,
    "operador": {...}
  },
  "producao_ativa": {
    "id": 456,
    "mapa": {...}
  },
  "parada_ativa": null,
  "velocidade": 120,
  "rejeitos_hoje": 5
}
```

**Campos importantes:**
- `sessao_ativa`: Dados da sessão do operador
- `producao_ativa`: Produção em andamento
- `parada_ativa`: Máquina parada (null = rodando)
- `velocidade`: Velocidade atual da máquina

---

### **8️⃣ Troubleshooting**

#### **Problema: "Desconectado" permanente**

**Solução:**
```bash
# 1. Verificar se backend está rodando
curl http://10.200.0.184:8000/docs

# 2. Testar SSE manualmente
curl -N http://10.200.0.184:8000/api/sse/updates/135

# 3. Verificar firewall
# No Windows: Desabilitar temporariamente
# No Linux: sudo ufw allow 8000

# 4. Verificar se a porta está acessível
telnet 10.200.0.184 8000
```

#### **Problema: Comandos não funcionam**

**Solução:**
1. Abra a documentação interativa: `http://10.200.0.184:8000/docs`
2. Teste o endpoint manualmente
3. Verifique os logs do backend
4. Confirme que o payload está correto

#### **Problema: Dados não atualizam**

**Solução:**
1. Verifique se o SSE está enviando updates
2. Console deve mostrar `📥 SSE: Mensagem recebida`
3. Se não receber, problema está no backend
4. Verificar logs do servidor backend

---

### **9️⃣ Comparação WebSocket vs SSE**

| Aspecto | WebSocket | SSE |
|---------|-----------|-----|
| **Conexão** | ws://10.200.0.184:8765 | http://10.200.0.184:8000/api/sse/updates/{id} |
| **Firewall** | ❌ Bloqueado | ✅ Funciona |
| **Reconexão** | Manual | ✅ Automática |
| **Envio Cliente→Servidor** | WebSocket.send() | fetch() (API REST) |
| **Recebimento Servidor→Cliente** | onmessage | EventSource.onmessage |
| **Debugging** | Difícil | ✅ Fácil (curl) |

---

### **🎯 Checklist de Teste Completo**

- [ ] SSE conecta com sucesso
- [ ] Console mostra logs corretos
- [ ] Botão "Iniciar Sessão" funciona
- [ ] Botão "Iniciar Produção" funciona
- [ ] Botão "Adicionar Rejeito" funciona
- [ ] Dados são atualizados via SSE
- [ ] Reconexão manual funciona
- [ ] Reconexão automática funciona (após queda)
- [ ] Heartbeats aparecem no console
- [ ] JSON dos dados está correto

---

### **📚 Próximos Passos**

Após validar que SSE funciona:

1. ✅ Migrar `OperatorDashboard` para usar SSE
2. ✅ Substituir todos os comandos WebSocket por API REST
3. ✅ Remover código WebSocket antigo
4. ✅ Testar em produção
5. ✅ Deploy

---

## 🔗 **Links Úteis**

- **Documentação API:** http://10.200.0.184:8000/docs
- **Cheat Sheet API:** [API_REST_CHEATSHEET.md](./API_REST_CHEATSHEET.md)
- **Guia Migração:** [SSE_MIGRATION.md](./SSE_MIGRATION.md)

---

**💡 Dica:** Use `Ctrl + Shift + S` para abrir/fechar rapidamente a página de teste SSE!


