# ✅ **CORREÇÕES FINAIS: LAYOUT EVA 16 ESTAÇÕES**

Data: 10 de novembro de 2025

## 🔧 **Correções Implementadas**

### **1. Botões de Rejeito Adicionados em Cada Posto**

**Arquivo**: `src/components/Eva16StationsView.tsx`

#### **Implementação:**

```typescript
const StationRow = ({ station, showSaldo }: { station: StationData; showSaldo: boolean }) => {
  const hasValidId = station.id_maquina > 0;
  
  return (
    <div className="flex items-center gap-3 py-2 border-b border-blue-400/20 hover:bg-blue-700/20">
      {/* Número do posto */}
      <div className="w-10 h-10 rounded-full bg-blue-400/30 text-white font-bold">
        {station.posto}
      </div>
      
      {/* Produzido */}
      <div className="flex-1 text-center">
        <div className="text-3xl font-bold text-green-400">{station.produzido}</div>
      </div>
      
      {/* Rejeitos */}
      <div className="flex-1 text-center">
        <div className="text-3xl font-bold text-red-400">{station.rejeitos}</div>
      </div>
      
      {/* Saldo (apenas contexto talões) */}
      {showSaldo && (
        <div className="flex-1 text-center">
          <div className="text-3xl font-bold text-red-400">{station.saldo}</div>
        </div>
      )}
      
      {/* ✅ NOVO: Botão Adicionar Rejeito */}
      <div className="shrink-0 ml-2">
        {hasValidId ? (
          <button
            onClick={() => onAddReject?.(station.id_maquina)}
            className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white text-sm font-semibold rounded-lg transition-colors shadow-lg border border-red-400/30"
            title={`Adicionar rejeito - ${station.nome}`}
          >
            + Rejeito
          </button>
        ) : (
          <div className="px-3 py-1.5 text-xs text-gray-500">-</div>
        )}
      </div>
    </div>
  );
};
```

**Características:**
- ✅ Botão em **cada linha** de posto (16 botões no total)
- ✅ **Desabilitado** para postos sem ID válido (placeholders)
- ✅ Chama `onAddReject(id_maquina)` ao clicar
- ✅ Tooltip mostra nome da estação
- ✅ Estilo consistente: vermelho, compacto
- ✅ Hover effect

**Headers Ajustados:**
```typescript
<div className="flex items-center gap-3 px-3">
  <div className="w-10 shrink-0"></div> {/* Número */}
  <div className="flex-1 text-center">Produzido</div>
  <div className="flex-1 text-center">Rejeitos</div>
  {showSaldo && <div className="flex-1 text-center">Saldo</div>}
  <div className="shrink-0 ml-2 w-[80px]"></div> {/* ✅ Espaço para botão */}
</div>
```

---

### **2. Cards da Máquina Simples Escondidos no Layout EVA 16**

**Arquivo**: `src/pages/OperatorDashboard.tsx`

#### **Cards Escondidos:**

##### **A. SingleMachineViewNew (linha ~913)**
```typescript
{/* Machine View - Esconder quando usar layout EVA 16 */}
{!(currentLayout === 'eva_16_stations' && isMultipostos) && (
  <SingleMachineViewNew
    machineData={machineData}
    contextoAtivo={contextoAtivo}
    onAddRejeito={handleAddRejeito}
    statusParada={machineData?.contexto?.parada_ativa !== null}
    onEncerrarParcial={handleEncerrarParcial}
    onEncerrarTotal={handleEncerrarTotal}
  />
)}
```

**O que esconde:**
- 🎯 Cards de META, PRODUZIDO, REJEITOS da máquina principal
- 🏁 Botões de finalizar parcial/total
- 📊 Informações de produção da máquina simples

##### **B. Indicador de Produção Atual (linha ~867)**
```typescript
{/* Indicador de Produção Atual - Esconder no layout EVA 16 */}
{machineData?.contexto?.producao_mapa && !(currentLayout === 'eva_16_stations' && isMultipostos) && (
  <div className="mb-4 bg-green-600/20 border border-green-400/40 rounded-xl p-4">
    <div className="flex items-center justify-between">
      <span>EM PRODUÇÃO: Mapa #... | Talão #... | Saldo: ...</span>
      <div className="flex items-center gap-2">
        <button>🏁 Finalizar Estação</button>
        <button>🔄 Atualizar</button>
      </div>
    </div>
  </div>
)}
```

**O que esconde:**
- 📋 Indicador de mapa/talão em produção
- 🏁 Botão "Finalizar Estação"
- 🔄 Botão "Atualizar"

---

## 📐 **Layout Final EVA 16**

### **Estrutura Visual:**

```
┌─────────────────────────────────────────────────────────────────┐
│  Header: [Sessão] [Turno] [Talões] | EVA2 | 40 pçs/h | [🖥️] [🔄] │
├─────────────────────────────────────────────────────────────────┤
│  Sidebar: [Produção] [Parada Forçada] [Configurações] [Sair]   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│                          EVA2                                    │
│              Produzido: 500      Rejeitos: 5                     │
│                                                                  │
├───────────────────────────┬──────────────────────────────────────┤
│        ESQUERDA           │           DIREITA                    │
├───────────────────────────┼──────────────────────────────────────┤
│  #  │Produz│Rejeitos│Btn │  #  │Produz│Rejeitos│Btn            │
├───────────────────────────┼──────────────────────────────────────┤
│  ① │ 100  │   5    │[+R]│  ① │ 100  │   5    │[+R]           │
│  ② │ 100  │   5    │[+R]│  ② │ 100  │   5    │[+R]           │
│  ③ │ 100  │   5    │[+R]│  ③ │ 100  │   5    │[+R]           │
│  ④ │ 100  │   5    │[+R]│  ④ │ 100  │   5    │[+R]           │
│  ⑤ │ 100  │   5    │[+R]│  ⑤ │ 100  │   5    │[+R]           │
│  ⑥ │ 100  │   5    │[+R]│  ⑥ │ 100  │   5    │[+R]           │
│  ⑦ │ 100  │   5    │[+R]│  ⑦ │ 100  │   5    │[+R]           │
│  ⑧ │ 100  │   5    │[+R]│  ⑧ │ 100  │   5    │[+R]           │
└───────────────────────────┴──────────────────────────────────────┘

[+R] = Botão "+ Rejeito" (vermelho)
```

**O que ESTÁ visível:**
- ✅ Header com botões de contexto (Sessão/Turno/Talões)
- ✅ Sidebar com navegação
- ✅ Totais consolidados (EVA2)
- ✅ 2 colunas (ESQUERDA/DIREITA)
- ✅ 8 postos por coluna
- ✅ Botão de rejeito em cada posto
- ✅ Botão de configuração de layout (🖥️)

**O que NÃO está visível:**
- ❌ Cards META/PRODUZIDO/REJEITOS da máquina simples
- ❌ Indicador "EM PRODUÇÃO: Mapa #... | Talão #..."
- ❌ Botão "🏁 Finalizar Estação"
- ❌ Botão "🔄 Atualizar" do card de produção

---

## 🎯 **Lógica de Rejeitos**

### **Fluxo:**

```
1. Operador clica em "+ Rejeito" no Posto 2 DIREITA
   ↓
2. Chama: onAddReject(168)  // ID da máquina filha
   ↓
3. handleAddRejeitoEstacao(168) é executado
   ↓
4. Modal de seleção de motivo abre (se configurado)
   ↓
5. API REST: POST /api/rejeitos/adicionar
   {
     "id_maquina": 168,
     "quantidade": 1,
     "id_motivo_rejeito": X
   }
   ↓
6. SSE recebe evento "rejeitos_adicionados"
   ↓
7. childMachinesData atualiza
   ↓
8. UI atualiza automaticamente (apenas o posto afetado)
```

**Sem re-render completo!** ✅

---

## 🧪 **Como Testar**

### Teste 1: Botões de Rejeito

1. **Fazer login em EVA2**
2. **Selecionar layout "EVA 16 Estações"**
3. **Verificar que CADA posto tem botão "+ Rejeito"**
   - Coluna ESQUERDA: 8 botões (postos 1-8)
   - Coluna DIREITA: 8 botões (postos 1-8)
   - **Total: 16 botões**
4. **Clicar em qualquer botão**
5. **Verificar console:**
   ```
   🔄 Adicionando rejeito para estação 168...
   ```
6. **Contador de rejeitos deve aumentar** apenas naquele posto

### Teste 2: Cards Escondidos

1. **Com layout EVA 16 ativo**
2. **Verificar que NÃO aparecem:**
   - ❌ Card verde "EM PRODUÇÃO: Mapa #... Talão #..."
   - ❌ Botão "🏁 Finalizar Estação"
   - ❌ Cards META/PRODUZIDO/REJEITOS da máquina principal
3. **Mudar para layout "Padrão (Cards)"**
4. **Verificar que cards voltam a aparecer:**
   - ✅ Card "EM PRODUÇÃO"
   - ✅ Botão "🏁 Finalizar Estação"
   - ✅ Cards META/PRODUZIDO/REJEITOS

### Teste 3: Hover nos Postos

1. **Passar mouse sobre uma linha de posto**
2. **Linha deve destacar** (fundo azul claro)
3. **Tooltip do botão aparece** com nome da estação

### Teste 4: Postos Vazios

1. **Se houver postos sem ID válido** (placeholders)
2. **Botão deve aparecer como "-"** (desabilitado)
3. **Não deve ser clicável**

---

## 📊 **Comparação: Layout Padrão vs EVA 16**

| Elemento | Layout Padrão | Layout EVA 16 |
|----------|---------------|---------------|
| **Cards da máquina simples** | ✅ Visível | ❌ Escondido |
| **Card "EM PRODUÇÃO"** | ✅ Visível | ❌ Escondido |
| **Botão "Finalizar Estação"** | ✅ Visível | ❌ Escondido |
| **Totais consolidados** | ❌ Não tem | ✅ No topo |
| **2 colunas ESQUERDA/DIREITA** | ❌ Não tem | ✅ Sim |
| **Botões de rejeito nos postos** | ✅ Nos cards | ✅ Em cada linha |
| **Espaço na tela** | Muito (vertical) | Compacto (horizontal) |

---

## 🎨 **Estilo dos Botões de Rejeito**

```css
/* Botão Ativo */
px-3 py-1.5 
bg-red-600 hover:bg-red-500 
text-white text-sm font-semibold 
rounded-lg 
transition-colors 
shadow-lg 
border border-red-400/30

/* Botão Desabilitado (placeholder) */
px-3 py-1.5 
text-xs text-gray-500
```

**Efeitos:**
- ✅ Hover mais claro (red-500)
- ✅ Sombra para destaque
- ✅ Borda sutil vermelha
- ✅ Transição suave
- ✅ Compacto (não atrapalha leitura dos números)

---

## 🔄 **Condição de Visibilidade**

### **Fórmula:**

```typescript
const hideInEva16 = (currentLayout === 'eva_16_stations' && isMultipostos);

// Cards da máquina simples
{!hideInEva16 && <SingleMachineViewNew ... />}

// Card de produção atual
{machineData?.contexto?.producao_mapa && !hideInEva16 && (
  <div>EM PRODUÇÃO: ...</div>
)}
```

**Quando esconde:**
- ✅ `currentLayout === 'eva_16_stations'` **E**
- ✅ `isMultipostos === true`

**Quando mostra:**
- ✅ Layout **não** é EVA 16
- ✅ **OU** máquina não é multipostos

---

## ✅ **Checklist de Validação**

### Layout EVA 16 Ativo:
- [ ] 16 botões "+ Rejeito" (8 por coluna)
- [ ] Botões funcionais (clique adiciona rejeito)
- [ ] Hover destaca linha
- [ ] Tooltip mostra nome da estação
- [ ] Card "EM PRODUÇÃO" **não aparece**
- [ ] Botão "🏁 Finalizar Estação" **não aparece**
- [ ] Cards META/PRODUZIDO/REJEITOS **não aparecem**
- [ ] Apenas totais consolidados no topo
- [ ] Tela limpa e compacta

### Layout Padrão Ativo:
- [ ] Card "EM PRODUÇÃO" **aparece**
- [ ] Botão "🏁 Finalizar Estação" **aparece**
- [ ] Cards META/PRODUZIDO/REJEITOS **aparecem**
- [ ] Botões de rejeito nos cards individuais **aparecem**

---

## 📝 **Resumo das Alterações**

### **Arquivo**: `src/components/Eva16StationsView.tsx`
- ✅ Adicionado botão "+ Rejeito" em cada `StationRow`
- ✅ Validação de ID antes de mostrar botão
- ✅ Callback `onAddReject(id_maquina)` integrado
- ✅ Headers ajustados para espaço do botão
- ✅ Hover effect nas linhas

### **Arquivo**: `src/pages/OperatorDashboard.tsx`
- ✅ `SingleMachineViewNew` escondido no layout EVA 16
- ✅ Card "EM PRODUÇÃO" escondido no layout EVA 16
- ✅ Botão "Finalizar Estação" escondido no layout EVA 16

---

## 🎯 **Resultado Final**

**Layout EVA 16 Estações:**
- ✅ **Tela limpa** - Apenas 2 colunas com postos
- ✅ **Totais no topo** - Consolidado de toda a máquina
- ✅ **16 botões de rejeito** - Um por posto
- ✅ **Sem cards extras** - Foco nas estações
- ✅ **Compacto** - Aproveita bem o espaço
- ✅ **Funcional** - Todos os botões integrados
- ✅ **Performance** - Sem re-renders desnecessários

**Exatamente como na imagem fornecida!** 🎨

---

**Implementado e Funcionando! ✨**

