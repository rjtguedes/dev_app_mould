# 🛡️ **PROTEÇÕES: DADOS DE MÁQUINAS FILHAS**

Data: 10 de novembro de 2025

## ❌ **Problema Identificado**

Mensagens SSE estavam **sobrescrevendo dados de máquinas filhas** com valores vazios/undefined, causando:

```
[Estação undefined] Dados disponíveis: 
```

Isso acontecia porque:
- Eventos SSE sem payload válido processavam de qualquer forma
- IDs inválidos (undefined, null) eram adicionados ao `childMachinesData`
- Maps vazios sobrescreviam dados existentes
- Faltava validação de estrutura dos dados recebidos

---

## ✅ **Proteções Implementadas**

### 1. **Validação de Payload em `machine_data/update`**

**Arquivo**: `src/hooks/useSSEManager.ts` (linhas ~523-552)

```javascript
if (data.type === 'machine_data' || data.type === 'update' || data.type === 'machine_update') {
  const rawPayload = unwrapped.dados_maquina || unwrapped.machine_data || unwrapped.data || unwrapped;
  
  // ⚠️ PROTEÇÃO CRÍTICA: Não processar eventos sem dados válidos
  if (!rawPayload || (typeof rawPayload === 'object' && Object.keys(rawPayload).length === 0)) {
    console.warn('⚠️ SSE Manager: Evento sem payload válido, ignorando para preservar dados existentes');
    return; // NÃO atualizar nada
  }
  
  // ⚠️ PROTEÇÃO ADICIONAL: Verificar ID válido
  const machineIdInPayload = machineDataPayload?.contexto?.id_maquina || machineDataPayload?.id_maquina;
  if (!machineIdInPayload) {
    console.warn('⚠️ SSE Manager: Evento sem ID de máquina válido, ignorando');
    return; // NÃO atualizar
  }
}
```

**O que faz:**
- ✅ Bloqueia eventos com payload vazio
- ✅ Bloqueia eventos sem ID de máquina
- ✅ Preserva dados existentes em `childMachinesData`

---

### 2. **Validação de ID em `rejeitos_adicionados`**

**Arquivo**: `src/hooks/useSSEManager.ts` (linhas ~663-667)

```javascript
else if (data.type === 'rejeitos_adicionados') {
  const targetMachineId = unwrapped.target_machine_id || unwrapped.id_maquina;
  
  // ⚠️ PROTEÇÃO: Validar ID da máquina alvo
  if (!targetMachineId || typeof targetMachineId !== 'number') {
    console.warn('⚠️ SSE Manager: Evento rejeitos sem ID válido, ignorando:', unwrapped);
    return; // NÃO processar
  }
  
  // Logs aprimorados para debug
  if (isChildMachine) {
    console.log(`🔄 Atualizando rejeitos para estação ${targetMachineId} (${childData.nome})`);
  } else {
    console.warn(`⚠️ Máquina filha ${targetMachineId} não encontrada (size: ${prev.size})`);
    console.warn(`⚠️ IDs disponíveis:`, Array.from(prev.keys()));
  }
}
```

**O que faz:**
- ✅ Valida que ID é número válido
- ✅ Mostra IDs disponíveis em caso de erro
- ✅ Evita adicionar estações com ID undefined

---

### 3. **Validação de ID em `context_update` (Máquinas Filhas)**

**Arquivo**: `src/hooks/useSSEManager.ts` (linhas ~972-997)

```javascript
if (contextUpdate.multipostos && contextUpdate.maquinas_filhas && Array.isArray(contextUpdate.maquinas_filhas)) {
  contextUpdate.maquinas_filhas.forEach((childMachine: any, index: number) => {
    // ⚠️ PROTEÇÃO CRÍTICA: Validar ID antes de processar
    const childId = childMachine.id || childMachine.id_maquina;
    if (!childId || typeof childId !== 'number') {
      console.error(`❌ SSE Manager: Máquina filha na posição ${index} tem ID inválido:`, childMachine);
      return; // PULAR esta máquina filha
    }
    
    // Normalizar dados da máquina filha
    const childMachineData = {
      id_maquina: childId, // ✅ Usar ID validado
      nome: childMachine.nome || `Estação ${childId}`, // ✅ Fallback para nome
      // ... resto dos dados
    };
    
    newChildMachinesData.set(childId, childMachineData); // ✅ Usar ID validado
  });
}
```

**O que faz:**
- ✅ Valida ID antes de processar cada máquina filha
- ✅ Pula máquinas com ID inválido (não adiciona ao Map)
- ✅ Fornece fallback para nome (`Estação ${childId}`)
- ✅ Log detalhado de erros

---

### 4. **Proteção Contra Map Vazio**

**Arquivo**: `src/hooks/useSSEManager.ts` (linhas ~1039-1049)

```javascript
console.log(`📊 SSE Manager: ${newChildMachinesData.size} máquinas filhas processadas`);
console.log(`📊 SSE Manager: IDs processados:`, Array.from(newChildMachinesData.keys()));

// ⚠️ PROTEÇÃO CRÍTICA: Não sobrescrever com Map vazio
if (newChildMachinesData.size === 0) {
  console.warn('⚠️ SSE Manager: context_update não trouxe máquinas filhas válidas. Preservando dados existentes.');
  // NÃO atualizar childMachinesData
} else {
  // Atualizar com merge inteligente
  setChildMachinesData(prev => {
    if (prev.size === 0) {
      console.log(`✅ SSE Manager: Primeira carga - ${newChildMachinesData.size} estações`);
      return newChildMachinesData;
    }
    
    console.log(`🔄 SSE Manager: Merge - Anterior: ${prev.size}, Novo: ${newChildMachinesData.size}`);
    // ... merge inteligente
  });
}
```

**O que faz:**
- ✅ Bloqueia atualização se nenhuma máquina filha for válida
- ✅ Logs detalhados de IDs processados
- ✅ Preserva dados existentes se Map vier vazio
- ✅ Merge inteligente mantém contadores recentes

---

## 📊 **Logs de Debug**

### ✅ Logs Esperados (Funcionando Corretamente):

```bash
📊 SSE Manager: context_update MULTIPOSTOS - 16 máquinas filhas encontradas
✅ SSE Manager: Processando máquina filha 165: { nome: "Posto 1 - Matriz ESQUERDA", ... }
✅ SSE Manager: Processando máquina filha 166: { nome: "Posto 1 - MATRIZ DIREITA", ... }
# ... (mais 14 máquinas)
💾 SSE Manager: Dados processados para máquina filha 165: { id_maquina: 165, nome: "...", ... }
📊 SSE Manager: 16 máquinas filhas processadas via context_update
📊 SSE Manager: IDs das máquinas filhas processadas: [165, 166, 167, ..., 180]
✅ SSE Manager: Primeira carga de máquinas filhas - 16 estações
```

### ❌ Logs de Erro (Protegidos):

```bash
⚠️ SSE Manager: Evento machine_data/update sem payload válido, ignorando para preservar dados existentes

❌ SSE Manager: Máquina filha na posição 3 tem ID inválido: { id: undefined, nome: null }

⚠️ SSE Manager: context_update não trouxe máquinas filhas válidas. Preservando dados existentes.

⚠️ SSE Manager: Evento rejeitos sem ID válido, ignorando: { target_machine_id: null }

⚠️ Máquina filha 999 não encontrada no childMachinesData (size: 16)
⚠️ IDs disponíveis: [165, 166, 167, 168, 169, 170, 171, 172, 173, 174, 175, 176, 177, 178, 179, 180]
```

---

## 🎯 **Checklist de Validações**

| Validação | Local | Status |
|-----------|-------|--------|
| Payload não vazio | `machine_data/update` | ✅ |
| ID de máquina válido | `machine_data/update` | ✅ |
| ID de alvo válido | `rejeitos_adicionados` | ✅ |
| ID de máquina filha válido | `context_update` | ✅ |
| Nome com fallback | `context_update` | ✅ |
| Map não vazio antes de atualizar | `context_update` | ✅ |
| Logs detalhados de erros | Todos os handlers | ✅ |
| Preservar dados existentes | Todos os handlers | ✅ |

---

## 🧪 **Como Testar**

### Teste 1: Validar que Dados Não São Sobrescritos

1. **Fazer login em máquina multipostos** (ex: EVA2)
2. **Aguardar carregar todas as estações** (devem aparecer cards com nomes válidos)
3. **Abrir console** e verificar:
   ```
   📊 SSE Manager: 16 máquinas filhas processadas
   📊 SSE Manager: IDs: [165, 166, 167, ..., 180]
   ```
4. **Aguardar 2-3 minutos** (eventos SSE continuam chegando)
5. **Verificar que estações NÃO desaparecem**
6. **Não deve aparecer**: `[Estação undefined]`

### Teste 2: Logs de Proteção

1. **No console, executar**:
   ```javascript
   // Ver tamanho do childMachinesData (via React DevTools ou logs)
   // Deve mostrar: "Anterior: 16, Novo: 16" nos logs de merge
   ```
2. **Procurar por logs de proteção**:
   - ✅ Se aparecer `⚠️ ... ignorando para preservar dados existentes` → Proteção funcionou!
   - ✅ Se aparecer `❌ ... tem ID inválido` → Máquina inválida foi bloqueada!

### Teste 3: Validar IDs das Estações

1. **Com máquina multipostos logada**, executar no console:
   ```javascript
   // Pegar contexto do React (via DevTools)
   // ou verificar logs:
   // "IDs das máquinas filhas processadas: [165, 166, ...]"
   ```
2. **Todos os IDs devem ser números válidos** (não undefined, não null)
3. **Todos os nomes devem existir** (não "Estação undefined")

---

## 🔧 **Estrutura de Dados Protegida**

### childMachinesData (Map):

```javascript
Map {
  165 => {
    id_maquina: 165,                    // ✅ Validado: número válido
    nome: "Posto 1 - Matriz ESQUERDA",  // ✅ Validado: existe ou fallback
    ativa: true,
    status: false,
    velocidade: 0,
    numero_estacao: 1,
    sessao_operador: { ... },
    producao_turno: { ... },
    producao_mapa: { ... },
    parada_ativa: null,
    last_updated: 1762798015            // ✅ Timestamp válido
  },
  166 => { ... },
  // ... mais 14 estações
}
```

**Garantias:**
- ✅ Nenhuma chave do Map será `undefined` ou `null`
- ✅ Todos os objetos terão `id_maquina` válido
- ✅ Todos os objetos terão `nome` (mínimo "Estação X")
- ✅ Map nunca será sobrescrito com tamanho 0

---

## ✅ **Resumo das Proteções**

| Proteção | Descrição | Impacto |
|----------|-----------|---------|
| **Validação de Payload** | Bloqueia eventos sem dados válidos | Evita sobrescrever com vazios |
| **Validação de ID** | Só processa IDs numéricos válidos | Evita `undefined` nas chaves |
| **Fallback de Nome** | Garante nome mesmo se vier vazio | Evita "Estação undefined" |
| **Bloqueio de Map Vazio** | Não atualiza se nenhuma máquina for válida | Preserva dados existentes |
| **Logs Detalhados** | Mostra IDs disponíveis e processados | Facilita debug |
| **Merge Inteligente** | Preserva contadores recentes | Evita perder dados válidos |

---

**Status**: ✅ **Implementado e Funcionando**

O sistema agora está protegido contra sobrescrever dados de máquinas filhas com valores inválidos. Todos os eventos SSE são validados antes de processar.

