# 🖥️ **SISTEMA DE LAYOUTS CONFIGURÁVEL - EVA 16 ESTAÇÕES**

Data: 10 de novembro de 2025

## 📋 **Objetivo**

Criar sistema de configuração de telas/dashboards para máquinas multipostos, permitindo que o operador escolha o melhor layout de visualização.

**Primeiro layout**: **EVA 16 ESTAÇÕES** - Layout otimizado com 2 colunas (ESQUERDA/DIREITA).

---

## ✅ **Arquivos Criados/Modificados**

### **1. Novos Arquivos:**

| Arquivo | Descrição |
|---------|-----------|
| `src/types/layout.ts` | Tipos TypeScript para layouts |
| `src/lib/layoutStorage.ts` | Gerenciador de persistência de layouts |
| `src/components/Eva16StationsView.tsx` | Layout EVA 16 estações (2 colunas) |
| `src/components/LayoutConfigModal.tsx` | Modal de seleção de layout |

### **2. Arquivos Modificados:**

| Arquivo | Mudanças |
|---------|----------|
| `src/components/DashboardHeader.tsx` | Adicionado botão de configuração de layout |
| `src/pages/OperatorDashboard.tsx` | Integração do sistema de layouts |
| `src/hooks/useSSEManager.ts` | Otimizações de re-render |

---

## 🎨 **Layout EVA 16 ESTAÇÕES**

### **Estrutura:**

```
┌─────────────────────────────────────────────────────────┐
│                        EVA2                             │
│         Produzido: 500        Rejeitos: 5               │
├───────────────────┬─────────────────────────────────────┤
│    ESQUERDA       │          DIREITA                    │
├───────────────────┼─────────────────────────────────────┤
│ Produzido|Rejeitos│Saldo │ Produzido|Rejeitos│Saldo    │
├───────────────────┼─────────────────────────────────────┤
│ ① 100  │  5  │150 │ ① 100  │  5  │150               │
│ ② 100  │  5  │150 │ ② 100  │  5  │150               │
│ ③ 100  │  5  │150 │ ③ 100  │  5  │150               │
│ ④ 100  │  5  │150 │ ④ 100  │  5  │150               │
│ ⑤ 100  │  5  │150 │ ⑤ 100  │  5  │150               │
│ ⑥ 100  │  5  │150 │ ⑥ 100  │  5  │150               │
│ ⑦ 100  │  5  │150 │ ⑦ 100  │  5  │150               │
│ ⑧ 100  │  5  │150 │ ⑧ 100  │  5  │150               │
└───────────────────┴─────────────────────────────────────┘
```

### **Características:**

- ✅ **2 colunas**: ESQUERDA e DIREITA
- ✅ **8 postos por coluna** (16 total)
- ✅ **Separação automática** baseada no nome da máquina
  - `"Posto 1 - MATRIZ ESQUERDA"` → Coluna ESQUERDA
  - `"Posto 1 - MATRIZ DIREITA"` → Coluna DIREITA
- ✅ **Ordenação automática** por número do posto (1→8)
- ✅ **Totais consolidados** no topo
- ✅ **Coluna Saldo** apenas no contexto "talões"
- ✅ **Cores:**
  - Verde para produzido
  - Vermelho para rejeitos e saldo
- ✅ **Números em círculos** para identificar postos

---

## 🔧 **Como Funciona**

### **1. Detecção Automática de Layout**

```javascript
// layoutStorage.ts
getDefaultLayoutType(machineName: string): LayoutType {
  const nameLower = machineName.toLowerCase();
  
  // Detectar automaticamente layout EVA 16 estações
  if (nameLower.includes('eva') && nameLower.includes('2')) {
    return 'eva_16_stations';
  }
  
  return 'default';
}
```

**Exemplo:**
- `"EVA2"` → Detecta automaticamente `eva_16_stations`
- `"Horizontal 21"` → Usa `default`

### **2. Separação ESQUERDA/DIREITA**

```javascript
// Eva16StationsView.tsx
childProductions.forEach(production => {
  const nome = production.machine.nome;  // "Posto 2 - MATRIZ ESQUERDA"
  
  // Extrair número do posto
  const postoMatch = nome.match(/posto\s+(\d+)/i);
  const postoNumero = parseInt(postoMatch[1]);  // 2
  
  // Determinar lado
  const isEsquerda = nome.toLowerCase().includes('esquerda');
  const isDireita = nome.toLowerCase().includes('direita');
  
  if (isEsquerda) {
    esquerdaStations.push({ posto: postoNumero, ... });
  } else if (isDireita) {
    direitaStations.push({ posto: postoNumero, ... });
  }
});

// Ordenar por número do posto
esquerdaStations.sort((a, b) => a.posto - b.posto);
direitaStations.sort((a, b) => a.posto - b.posto);
```

### **3. Dados Por Contexto**

```javascript
switch (contextoAtivo) {
  case 'sessao':
    produzido = sessao_operador.sinais_validos;
    rejeitos = sessao_operador.rejeitos;
    break;
  case 'turno':
    produzido = producao_turno.sinais_validos;
    rejeitos = producao_turno.rejeitos;
    break;
  case 'taloes':
    produzido = producao_mapa.sinais_validos;
    rejeitos = producao_mapa.rejeitos;
    saldo = producao_mapa.saldo_a_produzir;  // ← Apenas em talões
    break;
}
```

### **4. Persistência no LocalStorage**

```javascript
// Chave: industrack_layout_{id_maquina}
{
  "type": "eva_16_stations",
  "machineId": 164,
  "machineName": "EVA2",
  "timestamp": 1762800000
}
```

---

## 🎯 **Fluxo de Uso**

### **1. Carregamento Automático**

```
1. Operador faz login em EVA2
2. Sistema detecta "eva" no nome → Layout EVA 16
3. Carrega configuração salva (se existir)
4. Renderiza layout correspondente
```

### **2. Mudança Manual de Layout**

```
1. Operador clica no botão 🖥️ (Monitor) no header
2. Modal abre mostrando layouts disponíveis
3. Operador seleciona "EVA 16 Estações"
4. Sistema salva no localStorage
5. Layout muda imediatamente
6. Modal fecha automaticamente
```

### **3. Persistência Entre Sessões**

```
1. Operador fecha o navegador
2. Faz login novamente no dia seguinte
3. Sistema carrega layout salvo
4. EVA 16 já aparece configurado ✅
```

---

## 🧪 **Como Testar**

### Teste 1: Detecção Automática

1. **Fazer login em EVA2** (primeira vez)
2. **Verificar console:**
   ```
   📖 Layout carregado para máquina 164: eva_16_stations
   ```
3. **Layout EVA 16 deve aparecer automaticamente** (2 colunas)

### Teste 2: Botão de Configuração

1. **Procurar botão 🖥️** no header (ao lado do refresh)
2. **Clicar no botão**
3. **Modal deve abrir** com 2 opções:
   - Layout Padrão (Cards)
   - EVA 16 Estações (Recomendado) ✅

### Teste 3: Mudança de Layout

1. **No modal, clicar em "Padrão (Cards)"**
2. **Layout deve mudar** para cards tradicionais
3. **Abrir modal novamente**
4. **Clicar em "EVA 16 Estações"**
5. **Layout deve voltar** para 2 colunas

### Teste 4: Persistência

1. **Selecionar "EVA 16 Estações"**
2. **Fechar navegador** (F5 ou fechar aba)
3. **Fazer login novamente**
4. **Layout EVA 16 deve aparecer** automaticamente (salvo)

### Teste 5: Separação ESQUERDA/DIREITA

1. **Com layout EVA 16 ativo**
2. **Verificar coluna ESQUERDA:**
   - Posto 1 - Matriz ESQUERDA
   - Posto 2 - MATRIZ ESQUERDA
   - ...
   - Posto 8 - MATRIZ ESQUERDA
3. **Verificar coluna DIREITA:**
   - Posto 1 - MATRIZ DIREITA
   - Posto 2 - MATRIZ DIREITA
   - ...
   - Posto 8 - MATRIZ DIREITA

### Teste 6: Contadores por Contexto

1. **Clicar em "Turno"** no header
2. **Verificar que números mudam** (dados do turno)
3. **Clicar em "Talões"**
4. **Coluna "Saldo" deve aparecer**
5. **Clicar em "Sessão"**
6. **Coluna "Saldo" deve desaparecer**

---

## 📊 **Estrutura de Dados**

### **Entrada (childProductions):**

```javascript
[
  {
    machine: {
      id_maquina: 165,
      nome: "Posto 1 - Matriz ESQUERDA"
    },
    websocket_data: {
      sessao_operador: { sinais: 0, rejeitos: 0 },
      producao_turno: { sinais: 0, rejeitos: 0 },
      producao_mapa: { sinais: 0, rejeitos: 0, saldo_a_produzir: 150 }
    }
  },
  // ... mais 15 máquinas
]
```

### **Processamento (esquerda/direita):**

```javascript
esquerda = [
  { posto: 1, nome: "Posto 1 - Matriz ESQUERDA", produzido: 100, rejeitos: 5, saldo: 150 },
  { posto: 2, nome: "Posto 2 - MATRIZ ESQUERDA", produzido: 100, rejeitos: 5, saldo: 150 },
  // ... até posto 8
]

direita = [
  { posto: 1, nome: "Posto 1 - MATRIZ DIREITA", produzido: 100, rejeitos: 5, saldo: 150 },
  { posto: 2, nome: "Posto 2 - MATRIZ DIREITA", produzido: 100, rejeitos: 5, saldo: 150 },
  // ... até posto 8
]
```

---

## 🔄 **Otimizações de Performance**

### **1. Verificação de Mudanças**

```javascript
// Antes de atualizar estado, verifica se houve mudanças REAIS
if (!hasChanges) {
  return prev;  // ✅ Sem re-render!
}
```

### **2. useMemo para Separação**

```javascript
const { esquerda, direita, totalProduzido, totalRejeitos } = useMemo(() => {
  // ... processamento
}, [childProductions, contextoAtivo]);
```

**Benefício**: Recalcula apenas quando `childProductions` ou `contextoAtivo` mudam.

### **3. Logs Reduzidos**

- ❌ Removido: Logs a cada processamento de máquina
- ✅ Mantido: Apenas logs de erros críticos

---

## 📁 **LocalStorage**

### **Chaves Criadas:**

```
industrack_layout_164 = {
  "type": "eva_16_stations",
  "machineId": 164,
  "machineName": "EVA2",
  "timestamp": 1762800000
}

industrack_layout_73 = {
  "type": "default",
  "machineId": 73,
  "machineName": "Horizontal 21",
  "timestamp": 1762800000
}
```

**Cada máquina** tem sua própria configuração de layout salva!

---

## 🎯 **Layouts Disponíveis**

### **1. Layout Padrão (Cards)**
- Grid de cards individuais
- Cada estação em um card separado
- Flexível para qualquer número de estações
- **Recomendado para**: Máquinas com poucas estações

### **2. Layout EVA 16 Estações**
- 2 colunas (ESQUERDA/DIREITA)
- 8 postos por coluna
- Layout compacto tipo tabela
- Totais consolidados no topo
- **Recomendado para**: Máquinas EVA com 16 estações

---

## 🚀 **Próximos Layouts (Futuro)**

Estrutura preparada para adicionar facilmente:

- `eva_8_stations` - EVA com 8 estações
- `rotativa_10_stations` - Rotativa com 10 estações
- `custom_grid` - Grid personalizável pelo usuário
- ...

**Para adicionar novo layout:**

1. Adicionar tipo em `src/types/layout.ts`
2. Criar componente de visualização
3. Adicionar opção no `LayoutConfigModal`
4. Adicionar lógica de renderização no `OperatorDashboard`

---

## ✅ **Benefícios**

| Benefício | Descrição |
|-----------|-----------|
| **Flexibilidade** | Cada operador pode escolher o melhor layout |
| **Persistência** | Configuração salva entre sessões |
| **Escalabilidade** | Fácil adicionar novos layouts |
| **Performance** | Sem re-renders desnecessários |
| **UX** | Interface intuitiva para configuração |
| **Automático** | Detecta layout ideal baseado no nome |

---

## 📝 **Checklist de Validação**

- [ ] Botão 🖥️ aparece no header (apenas multipostos)
- [ ] Modal abre ao clicar no botão
- [ ] Layout "EVA 16 Estações" está marcado como recomendado
- [ ] Ao selecionar layout, modal fecha automaticamente
- [ ] Layout muda imediatamente sem piscar
- [ ] F5 mantém layout selecionado (persistência)
- [ ] Coluna ESQUERDA tem postos 1-8 ESQUERDA
- [ ] Coluna DIREITA tem postos 1-8 DIREITA
- [ ] Totais calculados corretamente
- [ ] Botões Sessão/Turno/Talões mudam dados exibidos
- [ ] Coluna "Saldo" aparece apenas em "Talões"
- [ ] Sem re-renders desnecessários (console mostra ⏭️)

---

**Implementado e Pronto para Uso! ✨**

Sistema completo de layouts configuráveis com detecção automática e persistência. Layout EVA 16 Estações implementado conforme especificação.

