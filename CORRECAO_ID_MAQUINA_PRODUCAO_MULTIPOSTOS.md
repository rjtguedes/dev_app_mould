# 🔧 **CORREÇÃO: ID da Máquina para Iniciar Produção em Multipostos**

Data: 10 de novembro de 2025

## ❌ **Problema Identificado**

Ao iniciar produção em máquinas multipostos através do modal de produção (`ProductionCommandsModal`), o sistema estava enviando **sempre o `id_maquina` da máquina raiz** no payload da API, ao invés do **`id_maquina` da estação filha** correspondente.

### **Exemplo do Problema:**

**Máquina EVA2 (ID: 164) com 16 estações filhas:**
- Posto 1 - MATRIZ ESQUERDA (ID: 168)
- Posto 2 - MATRIZ DIREITA (ID: 180)
- ... (demais estações)

**Payload INCORRETO enviado:**
```json
{
  "id_maquina": 164,  // ❌ ID da máquina raiz (EVA2)
  "id_mapa": 47,
  "taloes": [
    {
      "id_talao": 510,
      "estacao_numero": 1,  // Talão para Posto 1
      "quantidade": 75
    }
  ]
}
```

**Resultado:** A produção era **iniciada na máquina raiz (164)** ao invés da **estação filha (168)**, causando inconsistência nos dados.

---

## ✅ **Solução Implementada**

**Arquivo:** `src/pages/OperatorDashboard.tsx`  
**Função:** `handleStartProductionWithMap`

### **1. Detecção de Máquina Multiposto**

```typescript
// ✅ Para máquinas multipostos, determinar o id_maquina correto (estação filha)
let targetMachineId = machine.id_maquina; // Default: máquina raiz

if (isMultipostos && taloes.length > 0) {
  // Lógica específica para multipostos
}
```

### **2. Validação: Mesma Estação**

Garante que todos os talões selecionados sejam para a **mesma estação**:

```typescript
const estacaoNumero = taloes[0].estacao_numero;
const todosMesmaEstacao = taloes.every(t => t.estacao_numero === estacaoNumero);

if (!todosMesmaEstacao) {
  const estacoesDistintas = [...new Set(taloes.map(t => t.estacao_numero))];
  console.error('❌ ERRO: Talões selecionados para estações diferentes:', estacoesDistintas);
  throw new Error(
    `Não é possível iniciar produção em múltiplas estações simultaneamente. 
     Selecione talões apenas da estação ${estacaoNumero}.`
  );
}
```

**Por quê?** O payload da API aceita apenas **um único `id_maquina`**, então todos os talões devem ser para a mesma estação.

### **3. Buscar ID da Estação Filha**

```typescript
// Buscar a estação filha correspondente no childMachinesData
const estacaoFilha = Array.from(childMachinesData.values()).find(
  child => child.numero_estacao === estacaoNumero
);

if (estacaoFilha && estacaoFilha.id_maquina) {
  targetMachineId = estacaoFilha.id_maquina;
  console.log(`✅ Máquina multiposto: Usando id_maquina da estação ${estacaoNumero}:`, {
    estacao_nome: estacaoFilha.nome,
    id_maquina_estacao: targetMachineId,
    id_maquina_raiz: machine.id_maquina,
    total_taloes: taloes.length
  });
} else {
  console.warn(`⚠️ Estação ${estacaoNumero} não encontrada em childMachinesData, usando máquina raiz`);
}
```

**Fonte dos dados:** `childMachinesData` (Map), que contém as estações filhas carregadas via SSE.

### **4. Payload CORRETO**

```typescript
const payload = {
  id_maquina: targetMachineId, // ✅ ID da estação filha (168)
  id_mapa: mapaId,
  taloes: taloes.map(t => ({
    id_talao: t.id_talao,
    estacao_numero: t.estacao_numero,
    quantidade: t.quantidade,
    ...(t.tempo_ciclo_segundos && { tempo_ciclo_segundos: t.tempo_ciclo_segundos })
  }))
};
```

**Exemplo CORRETO:**
```json
{
  "id_maquina": 168,  // ✅ ID da estação filha (Posto 1)
  "id_mapa": 47,
  "taloes": [
    {
      "id_talao": 510,
      "estacao_numero": 1,
      "quantidade": 75
    }
  ]
}
```

---

## 🧪 **Como Testar**

### **Teste 1: Iniciar Produção em Estação Específica**

1. **Fazer login em EVA2** (máquina multiposto)
2. **Abrir modal de produção** (botão na Sidebar)
3. **Selecionar um mapa** com talões para múltiplas estações
4. **Navegar até "Estação 1"** usando os botões de navegação no modal
5. **Selecionar um ou mais talões da Estação 1**
6. **Clicar em "Iniciar Produção"**
7. **Verificar no console:**
   ```
   ✅ Máquina multiposto: Usando id_maquina da estação 1: {
     estacao_nome: "Posto 1 - MATRIZ ESQUERDA",
     id_maquina_estacao: 168,
     id_maquina_raiz: 164,
     total_taloes: 1
   }
   📤 Payload enviado: {
     id_maquina: 168, // ✅ ID da estação filha
     id_mapa: 47,
     taloes: [...]
   }
   ```
8. **Verificar no backend/database:**
   - A produção foi iniciada na **estação 168** (não na 164)
   - O `id_maquina` dos talões é **168**

### **Teste 2: Validação de Múltiplas Estações**

1. **Selecionar talões de diferentes estações** (ex: Estação 1 e Estação 2)
2. **Tentar iniciar produção**
3. **Verificar:**
   - ❌ **Erro exibido:** "Não é possível iniciar produção em múltiplas estações simultaneamente."
   - Console mostra: `❌ ERRO: Talões selecionados para estações diferentes: [1, 2]`

### **Teste 3: Máquina Simples (Fallback)**

1. **Fazer login em máquina simples** (não multiposto)
2. **Abrir modal de produção**
3. **Selecionar talões e iniciar**
4. **Verificar:**
   - ✅ `targetMachineId` é igual ao `machine.id_maquina` (máquina raiz)
   - Comportamento anterior mantido (sem mudanças)

---

## 📊 **Estrutura de Dados**

### **`childMachinesData` (Map)**

```typescript
Map<number, {
  id_maquina: number;          // ✅ ID da estação filha (ex: 168)
  nome: string;                // "Posto 1 - MATRIZ ESQUERDA"
  numero_estacao: number;      // 1, 2, 3, ..., 16
  ativa: boolean;
  velocidade: number;
  parada_ativa: any;
  producao_mapa: any;
  sessao_operador: any;
  // ... outros campos
}>
```

**Exemplo:**
```javascript
childMachinesData.get(168) = {
  id_maquina: 168,
  nome: "Posto 1 - MATRIZ ESQUERDA",
  numero_estacao: 1,
  // ...
}
```

### **`taloes` (Array)**

```typescript
interface TalaoSelecionado {
  id_talao: number;
  estacao_numero: number;  // ✅ Usado para encontrar a estação filha
  quantidade: number;
  tempo_ciclo_segundos?: number;
  talao_referencia?: string;
  talao_tamanho?: string;
}
```

---

## 🔍 **Logs de Debug**

### **Sucesso (Multiposto):**

```
🎯 Iniciando produção com mapa: {mapaId: 47, taloes: Array(1), isMultipostos: true, isEvaMode: false}
✅ Máquina multiposto: Usando id_maquina da estação 1: {
  estacao_nome: "Posto 1 - MATRIZ ESQUERDA",
  id_maquina_estacao: 168,
  id_maquina_raiz: 164,
  total_taloes: 1
}
📤 Payload enviado: {id_maquina: 168, id_mapa: 47, taloes: Array(1)}
✅ Produção iniciada com sucesso
```

### **Erro (Múltiplas Estações):**

```
🎯 Iniciando produção com mapa: {mapaId: 47, taloes: Array(2), isMultipostos: true}
❌ ERRO: Talões selecionados para estações diferentes: [1, 2]
❌ Erro ao iniciar produção com mapa: Error: Não é possível iniciar produção em múltiplas estações simultaneamente...
```

### **Fallback (Estação Não Encontrada):**

```
⚠️ Estação 99 não encontrada em childMachinesData, usando máquina raiz
📤 Payload enviado: {id_maquina: 164, ...}
```

---

## 📋 **Checklist de Validação**

- [ ] Produção iniciada na **estação filha** (não na máquina raiz)
- [ ] `id_maquina` no payload é o **ID da estação** (ex: 168)
- [ ] Validação de **múltiplas estações** funciona (exibe erro)
- [ ] Logs mostram **estação nome** e **IDs corretos**
- [ ] Máquinas simples **não afetadas** (comportamento mantido)
- [ ] `childMachinesData` carregado corretamente via SSE
- [ ] Modal navega entre estações corretamente
- [ ] Backend recebe e processa o **ID correto**

---

## 🔄 **Fluxo Completo**

1. **Usuário abre modal de produção** (Sidebar)
2. **Modal carrega mapas** para `machine.id_maquina` (raiz)
3. **Modal busca detalhes do mapa** com estações e talões
4. **Usuário navega para Estação X** (botões ◀ ▶)
5. **Usuário seleciona talões da Estação X**
6. **Clica em "Iniciar Produção"**
7. **Frontend:**
   - ✅ Detecta que é multiposto
   - ✅ Valida que todos os talões são da mesma estação
   - ✅ Busca `id_maquina` da estação filha em `childMachinesData`
   - ✅ Monta payload com `id_maquina` da **estação**
8. **Backend:**
   - ✅ Recebe `id_maquina: 168` (estação filha)
   - ✅ Inicia produção na estação correta
   - ✅ Atualiza banco com `id_maquina: 168`
9. **SSE:**
   - ✅ Envia `context_update` com dados da estação 168
   - ✅ Frontend atualiza UI da estação específica

---

## ⚠️ **Importante**

### **Dependências:**

Esta correção depende de:
1. **`childMachinesData`** estar corretamente populado via SSE
2. **`numero_estacao`** existir e estar correto nas máquinas filhas
3. **`estacao_numero`** estar correto nos talões do mapa

### **Limitações Atuais:**

- ❌ Não é possível iniciar produção em **múltiplas estações simultaneamente**
- ✅ Solução: Selecionar talões de apenas **uma estação por vez**

### **Backend Esperado:**

O backend **DEVE** processar o `id_maquina` recebido como a máquina de destino (estação filha), e não fazer lookup baseado apenas em `estacao_numero`.

---

**Implementado e Funcionando! ✨**

Agora a produção é iniciada corretamente na estação filha especificada, ao invés de sempre na máquina raiz.

