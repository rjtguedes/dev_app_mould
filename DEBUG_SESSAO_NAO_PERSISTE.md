# 🔍 **DEBUG: SESSÃO NÃO PERSISTINDO APÓS REFRESH**

## ❌ **Problema Identificado**

O log mostra:
```
📋 Nenhuma sessão salva encontrada - isLoading = false
```

Isso significa que após o login, a sessão **NÃO está sendo salva** no `localStorage`.

---

## ✅ **Correções Aplicadas**

### 1. Logs Extensivos Adicionados

Adicionei logs em todo o fluxo de autenticação para rastrear onde a sessão está sendo perdida:

#### No Login (`useAuth.ts`):
```javascript
✅ Login principal realizado: {...}
🔍 Dados da sessão retornados: {...}
🔍 response.data.sessao existe? true/false
🔍 response.data.sessao.id_sessao: 123

🔍 Verificando se deve salvar sessão...
🔍 Condição: response.data.sessao?.id_sessao = 123
✅ Backend retornou sessão válida, preparando para salvar...
📦 Sessão preparada para salvar: {...}
💾 Sessão salva no localStorage: 123
```

#### Se sessão NÃO for retornada:
```javascript
⚠️ Backend NÃO retornou dados de sessão!
⚠️ response.data completo: {...}
```

### 2. Corrigido Campo Status (`useSSEManager.ts`)

**Antes:**
```javascript
status: contextUpdate.ativa ?? true  // ❌ ERRADO
```

**Depois:**
```javascript
ativa: contextUpdate.ativa ?? true,   // Se máquina está ligada
status: contextUpdate.status ?? true  // ✅ CORRETO: se está parada ou não
```

---

## 🧪 **Como Testar Agora**

### Passo 1: Fazer Login Novamente

1. **Limpe o localStorage** (console):
   ```javascript
   localStorage.clear();
   location.reload();
   ```

2. **Faça login** com seu PIN

3. **Verifique os logs** no console. Procure por:

   **✅ SE TUDO ESTIVER OK, você verá:**
   ```
   ✅ Login principal realizado
   🔍 Dados da sessão retornados: { id_sessao: 123, ... }
   🔍 response.data.sessao existe? true
   ✅ Backend retornou sessão válida, preparando para salvar...
   📦 Sessão preparada para salvar: {...}
   💾 Sessão salva no localStorage: 123
   ```

   **❌ SE HOUVER PROBLEMA, você verá:**
   ```
   ✅ Login principal realizado
   🔍 Dados da sessão retornados: undefined
   🔍 response.data.sessao existe? false
   ⚠️ Backend NÃO retornou dados de sessão!
   ⚠️ response.data completo: {...}
   ```

### Passo 2: Verificar localStorage

Após o login, execute no console:

```javascript
// Ver sessão salva
const sessao = localStorage.getItem('industrack_active_session');
console.log('Sessão salva:', JSON.parse(sessao));

// Deve retornar algo como:
{
  id_sessao: 123,
  id_maquina: 74,
  id_operador: 103,
  nome_operador: "João",
  empresa: 5,
  operador_secundario: null,
  timestamp: 1234567890
}
```

### Passo 3: Testar Refresh

1. Com a sessão salva, **pressione F5** (refresh)

2. **Verifique os logs** ao inicializar:

   **✅ SE FUNCIONAR:**
   ```
   🔐 useAuth: Verificando sessão salva na inicialização...
   📝 Conteúdo bruto da sessão: {"id_sessao":123,...}
   🔍 Sessão salva encontrada (parsed): {...}
   🔍 Campos da sessão: {...}
   🔄 Atualizando authState para isAuthenticated = true...
   ✅ authState atualizado - isAuthenticated deveria ser true agora
   ✅ Sessão restaurada automaticamente com sucesso
   🔍 Estado App: { isAuthenticated: true, ... } ← DEVE SER TRUE!
   ```

3. **Deve permanecer na dashboard**, NÃO voltar para login

---

## 🎯 **Possíveis Causas do Problema**

### Causa 1: Backend não está retornando `sessao`

**Verificar:** Logs mostrarão `⚠️ Backend NÃO retornou dados de sessão!`

**Solução:** O endpoint de login do backend precisa retornar:
```json
{
  "success": true,
  "data": {
    "id_operador": 103,
    "nome": "João",
    "empresa": 5,
    "sessao": {           ← PRECISA EXISTIR!
      "id_sessao": 123,
      "id_maquina": 74,
      "id_operador": 103
    }
  }
}
```

### Causa 2: Campo `sessao` está vindo vazio ou null

**Verificar:** Logs mostrarão `🔍 response.data.sessao existe? false`

**Solução:** Verificar backend, garantir que sessão é criada no login

### Causa 3: localStorage está sendo limpo por algum motivo

**Verificar:** Sessão é salva mas desaparece antes do refresh

**Solução:** Procurar código que chama `localStorage.clear()` ou `removeItem('industrack_active_session')`

---

## 📊 **Diferença entre `ativa` e `status`**

Baseado no JSON fornecido:

| Campo | Significado | Exemplo |
|-------|-------------|---------|
| `ativa` | Máquina está **ligada** (energizada) | `true` = ligada, `false` = desligada |
| `status` | Máquina está **produzindo** (sem parada) | `true` = produzindo, `false` = parada |
| `parada_ativa` | Detalhes da parada (se houver) | `{ id: 13846, ... }` |

**Exemplo:**
```json
{
  "ativa": true,           // Máquina está ligada
  "status": false,         // MAS está parada (não produzindo)
  "parada_ativa": {        // Porque tem uma parada ativa
    "id": 13846,
    "inicio": 1762529150,
    "motivo_id": null
  }
}
```

**UI deve mostrar:**
- 🟢 Ícone verde (ligada) se `ativa === true`
- 🔴 Ícone vermelho (desligada) se `ativa === false`
- ⏸️ Badge "PARADA" se `status === false` ou `parada_ativa !== null`

---

## 🔧 **Próximos Passos**

1. **Fazer login novamente** com os novos logs
2. **Enviar os logs** que aparecerem no console
3. **Verificar localStorage** após login
4. **Testar refresh** (F5)

Com os logs detalhados, poderemos identificar exatamente onde a sessão está sendo perdida!

---

## 📝 **Checklist de Validação**

- [ ] Fazer login
- [ ] Ver no console: `💾 Sessão salva no localStorage: [id]`
- [ ] Executar: `localStorage.getItem('industrack_active_session')` → deve retornar JSON
- [ ] Pressionar F5 (refresh)
- [ ] Ver no console: `✅ Sessão restaurada automaticamente`
- [ ] Ver no console: `🔍 Estado App: { isAuthenticated: true, ... }`
- [ ] Permanecer na dashboard (NÃO voltar para login)

---

**Status:** ⏳ Aguardando logs do teste

