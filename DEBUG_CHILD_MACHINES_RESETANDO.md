# 🚨 **DEBUG CRÍTICO: childMachinesData Resetando**

Data: 10 de novembro de 2025

## ❌ **Problema Identificado**

### **Sintomas:**

1. ✅ **SSE processa 16 máquinas filhas corretamente**
   ```
   ✅ SSE Manager: Processando máquina filha 165: { nome: "Posto 1..." }
   ✅ SSE Manager: Processando máquina filha 166: { nome: "Posto 1..." }
   // ... (mais 14 máquinas)
   📊 SSE Manager: 16 máquinas filhas processadas
   ```

2. ❌ **Mas o Dashboard recebe apenas 1 estação com ID undefined**
   ```
   [ChildProductions] Processando 1 estações para contexto: turno
   📊 [Estação undefined] Dados disponíveis: {sessao: {...}, turno: {...}}
   ```

3. ❌ **machineData da máquina principal também está corrompido**
   ```
   🔄 SSE Manager: machineData atualizado: {id: undefined, nome: undefined, velocidade: 0}
   ```

### **Conclusão:**
Algo está **sobrescrevendo** o `childMachinesData` correto (16 máquinas) com um Map contendo apenas 1 item com ID inválido!

---

## 🔍 **Ferramentas de Debug Implementadas**

### 1. **Monitor de childMachinesData**

```javascript
// useSSEManager.ts (linha ~46)
useEffect(() => {
  const size = childMachinesData.size;
  const ids = Array.from(childMachinesData.keys());
  
  console.log(`📊 SSE Manager: childMachinesData ALTERADO - Tamanho: ${size}, IDs:`, ids);
  
  // ⚠️ ALERTA CRÍTICO
  if (size === 1 && ids.length === 1 && (!ids[0] || isNaN(ids[0]))) {
    console.error('❌ CRÍTICO: childMachinesData com 1 item e ID INVÁLIDO!', {
      tamanho: size,
      id: ids[0],
      dados: childMachinesData.get(ids[0]),
      stack: new Error().stack  // ← MOSTRA ONDE FOI CHAMADO!
    });
  }
}, [childMachinesData]);
```

**O que faz:**
- ✅ Loga TODA vez que `childMachinesData` é alterado
- ✅ Mostra o tamanho e IDs das máquinas
- ✅ **DETECTA** quando apenas 1 máquina com ID inválido é adicionada
- ✅ **Mostra o stack trace** de onde veio a chamada!

### 2. **Monitor de machineData**

```javascript
// useSSEManager.ts (linha ~90)
useEffect(() => {
  if (machineData) {
    const logData = {
      id: machineData.contexto?.id || machineData.contexto?.id_maquina,
      nome: machineData.contexto?.nome,
      velocidade: machineData.contexto?.velocidade,
      status: machineData.contexto?.status,
      ...
    };
    
    console.log('🔄 SSE Manager: machineData atualizado:', logData);
    
    // ⚠️ ALERTA CRÍTICO
    if (!logData.id || !logData.nome) {
      console.error('❌ CRÍTICO: machineData SEM ID OU NOME!', {
        id: logData.id,
        nome: logData.nome,
        machineData_completo: machineData,
        stack: new Error().stack  // ← MOSTRA ONDE FOI CHAMADO!
      });
    }
  }
}, [machineData]);
```

**O que faz:**
- ✅ Loga TODA vez que `machineData` é alterado
- ✅ **DETECTA** quando vem sem ID ou nome
- ✅ **Mostra o stack trace** de onde veio a chamada!

---

## 🧪 **Como Usar as Ferramentas de Debug**

### Passo 1: Abrir Console

1. **F12** no navegador
2. **Aba Console**
3. **Limpar logs** (botão 🚫 ou Ctrl+L)

### Passo 2: Fazer Login na Máquina Multipostos

1. **Fazer login** (ex: EVA2)
2. **Observar os logs** conforme vão aparecendo

### Passo 3: Identificar o Momento do Problema

**Procurar por estes logs na ORDEM:**

```bash
# ✅ 1. Carregamento inicial correto
📊 SSE Manager: 16 máquinas filhas processadas
📊 SSE Manager: childMachinesData ALTERADO - Tamanho: 16, IDs: [165, 166, ...]

# ✅ 2. machineData da principal está correto
🔄 SSE Manager: machineData atualizado: {id: 164, nome: "EVA2", ...}

# ❌ 3. AQUI ACONTECE O PROBLEMA!
📊 SSE Manager: childMachinesData ALTERADO - Tamanho: 1, IDs: [undefined]
❌ CRÍTICO: childMachinesData com 1 item e ID INVÁLIDO!
   stack: Error
       at useSSEManager (useSSEManager.ts:58)
       at ... ← OLHAR AQUI PARA VER QUEM CHAMOU!

# ❌ 4. machineData também é corrompido
🔄 SSE Manager: machineData atualizado: {id: undefined, nome: undefined, ...}
❌ CRÍTICO: machineData SEM ID OU NOME!
   stack: Error
       at useSSEManager (useSSEManager.ts:109)
       at ... ← OLHAR AQUI PARA VER QUEM CHAMOU!
```

### Passo 4: Analisar o Stack Trace

No erro `❌ CRÍTICO`, expanda o `stack` e veja as linhas:

```
Error
    at useSSEManager (useSSEManager.ts:58:17)
    at handleSSEMessage (useSSEManager.ts:1045:5)  ← QUAL HANDLER CHAMOU?
    at processInitialContext (useSSEManager.ts:220:3)  ← OU ESTE?
    at ...
```

**Isso vai mostrar EXATAMENTE** qual handler SSE está causando o problema!

---

## 🎯 **Próximos Passos (Após Identificar)**

### Se o problema for em `processInitialContext`:
- Verificar se está extraindo o `data` corretamente
- Verificar se `maquinas_filhas` existe no payload
- Adicionar log antes de chamar `setChildMachinesData`

### Se o problema for em `handleSSEMessage`:
- Identificar qual `data.type` está causando
- Verificar se o handler específico está validando dados
- Adicionar proteção para não processar payloads vazios

### Se o problema for em outro evento:
- Identificar o tipo do evento no stack
- Verificar se esse evento deveria atualizar `childMachinesData`
- Adicionar validação específica para esse evento

---

## 📊 **Logs Esperados (Funcionando Corretamente)**

```bash
# Carregamento inicial
📊 SSE Manager: childMachinesData ALTERADO - Tamanho: 0, IDs: []
🔓 SSE Manager: Desempacotando wrapper { success: true, data: {...} }
📊 SSE Manager: NOVA ESTRUTURA - 16 máquinas filhas encontradas
✅ SSE Manager: Processando máquina filha 165...
✅ SSE Manager: Processando máquina filha 166...
// ... (mais 14)
📊 SSE Manager: childMachinesData ALTERADO - Tamanho: 16, IDs: [165, 166, 167, ..., 180]

# Atualizações via SSE
📥 SSE: Mensagem recebida: {type: 'context_update', ...}
📊 SSE Manager: context_update MULTIPOSTOS - 16 máquinas filhas
🔄 SSE Manager: Fazendo merge - Anterior: 16, Novo: 16
📊 SSE Manager: childMachinesData ALTERADO - Tamanho: 16, IDs: [165, 166, ..., 180]

# machineData principal
🔄 SSE Manager: machineData atualizado: {id: 164, nome: "EVA2", velocidade: 40, ...}
```

**✅ Nunca deve aparecer:**
- ❌ `Tamanho: 1` com ID inválido
- ❌ `Tamanho: 0` após carregar
- ❌ `id: undefined` no machineData
- ❌ `nome: undefined` no machineData

---

## 🔧 **Comandos Úteis para Debug Manual**

### Ver childMachinesData no console:

**NÃO É POSSÍVEL** via console diretamente (é state do React), mas os logs já mostram!

### Forçar recarga de contexto:

```javascript
// No console (se tiver acesso ao hook):
// consultarContexto() - mas também não é acessível diretamente
```

### Verificar quantas máquinas estão no Dashboard:

```javascript
// Procurar nos logs:
// "[ChildProductions] Processando X estações"
// X deve ser 16, não 1!
```

---

## ✅ **Checklist de Validação**

Após identificar e corrigir o problema:

- [ ] `childMachinesData.size` sempre = 16 (para EVA2)
- [ ] Todos os IDs são números válidos (165-180)
- [ ] `machineData.contexto.id` = 164 (máquina principal)
- [ ] `machineData.contexto.nome` = "EVA2"
- [ ] Dashboard mostra "Processando 16 estações"
- [ ] Nenhum log `❌ CRÍTICO` aparece
- [ ] Cards de todas as estações aparecem na UI

---

## 📝 **Informações para Reportar**

Quando encontrar o problema, anote:

1. **Tipo do evento SSE** que causou (`data.type`)
2. **Stack trace completo** do erro
3. **Payload do evento** que veio antes do erro
4. **Tamanho do childMachinesData** antes e depois
5. **IDs das máquinas** antes e depois da corrupção

---

**Status**: 🔍 **Ferramentas de Debug Ativas**

Execute o app e compartilhe os logs quando aparecer o erro `❌ CRÍTICO` para identificarmos a causa exata!

